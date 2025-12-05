import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { NotificationQueue, NotificationQueueDocument } from './schemas/notification-queue.schema';
import { OccasionDocument } from '../occasions/schemas/occasion.schema';
import { UserDocument } from '../users/schemas/user.schema';
import { DateTime } from 'luxon';

@Injectable()
export class NotificationQueueService {
  private readonly logger = new Logger(NotificationQueueService.name);

  constructor(
    @InjectModel(NotificationQueue.name)
    private notificationQueueModel: Model<NotificationQueueDocument>,
  ) {}

  /**
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
