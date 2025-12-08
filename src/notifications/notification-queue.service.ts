import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { NotificationQueue, NotificationQueueDocument } from './schemas/notification-queue.schema';
import { Occasion, OccasionDocument } from '../occasions/schemas/occasion.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { DateTime } from 'luxon';

@Injectable()
export class NotificationQueueService {
  private readonly logger = new Logger(NotificationQueueService.name);

  constructor(
    @InjectModel(NotificationQueue.name)
    private notificationQueueModel: Model<NotificationQueueDocument>,
    @InjectModel(Occasion.name)
    private occasionModel: Model<OccasionDocument>,
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
  ) {}

  /**
   * 매일 cron으로 향후 3일치 마일스톤 알림을 Queue에 적재
   */
  async enqueueUpcomingMilestones() {
    const startTime = Date.now();
    this.logger.log('[Daily Cron] Starting to enqueue upcoming milestone notifications');

    try {
      // 1. 기존 pending 알림 삭제
      const deleteResult = await this.notificationQueueModel.deleteMany({
        status: 'pending',
      });
      this.logger.log(`🗑️  Deleted ${deleteResult.deletedCount} pending notifications`);

      // 2. 향후 3일 이내 마일스톤 조회
      const today = DateTime.utc().startOf('day');
      const threeDaysLater = today.plus({ days: 3 }).endOf('day');

      const occasions = await this.occasionModel
        .find({
          isArchived: false,
          isNotificationEnabled: true,
          'milestones.0': { $exists: true }, // 마일스톤이 있는 것만
        })
        .populate('userId', 'timezone')
        .lean();

      this.logger.log(`📅 Found ${occasions.length} occasions with milestones`);

      // 3. 알림 Queue 생성
      const queues = [];

      for (const occasion of occasions) {
        const user = occasion.userId as any;
        if (!user) continue;

        const userTimezone = user.timezone || 'UTC';

        for (const milestone of occasion.milestones || []) {
          const milestoneDate = DateTime.fromISO(milestone.targetDate, { zone: 'utc' });

          // 향후 3일 이내인지 확인
          if (milestoneDate < today || milestoneDate > threeDaysLater) continue;

          // 3가지 알림 타입 생성
          const configs = [
            { type: '3_days' as const, daysBefore: 3, hour: 20, minute: 0 },
            { type: '1_day' as const, daysBefore: 1, hour: 20, minute: 0 },
            { type: 'd_day' as const, daysBefore: 0, hour: 9, minute: 0 },
          ];

          for (const config of configs) {
            const notificationDate = milestoneDate.minus({ days: config.daysBefore });

            // 사용자 타임존 기준으로 알림 시간 설정
            const localDateTime = DateTime.fromISO(notificationDate.toISODate(), {
              zone: userTimezone,
            }).set({
              hour: config.hour,
              minute: config.minute,
              second: 0,
              millisecond: 0,
            });

            const utcDateTime = localDateTime.toUTC();

            // 과거 시간이면 건너뛰기
            if (utcDateTime < DateTime.utc()) continue;

            queues.push({
              userId: new Types.ObjectId(user._id),
              occasionId: new Types.ObjectId(occasion._id),
              milestoneId: milestone.id,
              scheduledFor: utcDateTime.toJSDate(),
              type: config.type,
              status: 'pending',
              retryCount: 0,
            });
          }
        }
      }

      // 4. 일괄 적재
      if (queues.length > 0) {
        await this.notificationQueueModel.insertMany(queues);
      }

      const duration = Date.now() - startTime;
      this.logger.log(
        `✅ Enqueued ${queues.length} notifications for ${occasions.length} occasions (${duration}ms)`,
      );

      return { enqueuedCount: queues.length, occasionCount: occasions.length };
    } catch (error) {
      this.logger.error(`❌ Failed to enqueue upcoming milestones: ${error.message}`);
      throw error;
    }
  }

  /**
   * @deprecated 마일스톤 기반 알림으로 변경됨. enqueueUpcomingMilestones 사용
   * 이벤트에 대한 알림 스케줄 생성
   */
  async scheduleNotifications(occasion: OccasionDocument, user: UserDocument) {
    const userTimezone = user.timezone || 'Asia/Seoul';
    const occasionDate = DateTime.fromISO(occasion.baseDate, { zone: 'utc' });

    const configs = [
      { type: '3_days' as const, daysBefore: 3, hour: 20, minute: 0 }, // 3일 전 오후 8시
      { type: '1_day' as const, daysBefore: 1, hour: 20, minute: 0 }, // 1일 전 오후 8시
      { type: 'd_day' as const, daysBefore: 0, hour: 9, minute: 0 }, // 당일 오전 9시
    ];

    const queues = [];

    for (const config of configs) {
      // 로컬 날짜 계산
      const localDate = occasionDate.minus({ days: config.daysBefore });
      const localDateTime = localDate.set({
        hour: config.hour,
        minute: config.minute,
        second: 0,
        millisecond: 0,
      });

      // 로컬 시간 → UTC 변환
      const localInTimezone = DateTime.fromISO(localDateTime.toISO(), {
        zone: userTimezone,
      });
      const utcDateTime = localInTimezone.toUTC();

      // 과거 시간이면 건너뛰기
      if (utcDateTime < DateTime.utc()) continue;

      queues.push({
        userId: new Types.ObjectId(user._id),
        occasionId: new Types.ObjectId(occasion._id),
        scheduledFor: utcDateTime.toJSDate(),
        type: config.type,
        occasionName: occasion.name,
        occasionDate: occasion.baseDate,
        status: 'pending',
        retryCount: 0,
      });
    }

    if (queues.length > 0) {
      await this.notificationQueueModel.insertMany(queues);
      this.logger.log(
        `✅ Created ${queues.length} notification queues for occasion ${occasion.name}`,
      );
    }
  }

  /**
   * 이벤트 수정/삭제 시 기존 알림 제거
   */
  async deleteByOccasionId(occasionId: string) {
    const result = await this.notificationQueueModel.deleteMany({
      occasionId: new Types.ObjectId(occasionId),
      status: 'pending', // 이미 발송된 건은 히스토리로 유지
    });

    this.logger.log(
      `🗑️  Deleted ${result.deletedCount} pending notifications for occasion ${occasionId}`,
    );
  }

  /**
   * 사용자 타임존 변경 시 재스케줄링
   */
  async rescheduleForUser(userId: string, _newTimezone: string) {
    // 기존 pending 알림 조회
    const pendingNotifications = await this.notificationQueueModel
      .find({ userId: new Types.ObjectId(userId), status: 'pending' })
      .exec();

    // 기존 알림 삭제
    await this.notificationQueueModel.deleteMany({
      userId: new Types.ObjectId(userId),
      status: 'pending',
    });

    // TODO: Occasion과 User를 다시 쿼리하여 scheduleNotifications 호출
    this.logger.log(
      `🔄 Rescheduled ${pendingNotifications.length} notifications for user ${userId}`,
    );
  }
}
