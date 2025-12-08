import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { NotificationQueue, NotificationQueueDocument } from './schemas/notification-queue.schema';
import { Occasion, OccasionDocument } from '../occasions/schemas/occasion.schema';
import { NotificationQueueService } from './notification-queue.service';
import * as admin from 'firebase-admin';

@Injectable()
export class NotificationScheduler {
  private readonly logger = new Logger(NotificationScheduler.name);

  constructor(
    @InjectModel(NotificationQueue.name)
    private notificationQueueModel: Model<NotificationQueueDocument>,
    @InjectModel(Occasion.name)
    private occasionModel: Model<OccasionDocument>,
    private notificationQueueService: NotificationQueueService,
  ) {}

  @Cron('23 2 * * *') // 매일 새벽 2시 23분에 실행
  async enqueueUpcomingMilestones() {
    this.logger.log('[Daily Cron] Starting daily milestone notification enqueue');
    try {
      await this.notificationQueueService.enqueueUpcomingMilestones();
    } catch (error) {
      this.logger.error(`[Daily Cron] Failed: ${error.message}`);
    }
  }

  @Cron('37 * * * *') // 매시간 37분에 실행 (인프라 경쟁 최소화)
  async sendHourlyNotifications() {
    const now = new Date();
    const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);

    this.logger.log(
      `[Cron] Checking notifications between ${now.toISOString()} and ${oneHourLater.toISOString()}`,
    );

    const notifications = await this.notificationQueueModel
      .find({
        scheduledFor: {
          $gte: now,
          $lt: oneHourLater,
        },
        status: 'pending',
        retryCount: { $lt: 3 }, // 최대 3번 재시도
      })
      .populate('userId', 'fcmTokens language')
      .limit(10000); // 안전장치

    this.logger.log(`[Cron] Found ${notifications.length} notifications to send`);

    if (notifications.length === 0) return;

    // Occasion 배치 조회 (최적화)
    const occasionIds = [...new Set(notifications.map((n) => n.occasionId.toString()))];
    const occasions = await this.occasionModel.find({ _id: { $in: occasionIds } }).lean();

    const occasionMap = new Map(occasions.map((o) => [o._id.toString(), o]));

    // 배치 발송 (100개씩)
    for (let i = 0; i < notifications.length; i += 100) {
      const batch = notifications.slice(i, i + 100);
      await this.sendBatch(batch, occasionMap);
    }
  }

  private async sendBatch(
    notifications: NotificationQueueDocument[],
    occasionMap: Map<string, any>,
  ) {
    const promises = notifications.map((n) => this.sendNotification(n, occasionMap));
    await Promise.allSettled(promises); // 하나 실패해도 계속 진행
  }

  async sendNotification(notification: NotificationQueueDocument, occasionMap: Map<string, any>) {
    try {
      const user = notification.userId as any;

      if (!user.fcmTokens || user.fcmTokens.length === 0) {
        await notification.updateOne({
          status: 'failed',
          failedReason: 'No FCM tokens',
        });
        return;
      }

      // Occasion 조회 및 검증
      const occasion = occasionMap.get(notification.occasionId.toString());

      if (!occasion) {
        await notification.updateOne({
          status: 'failed',
          failedReason: 'Occasion not found',
        });
        this.logger.warn(`⚠️  Occasion not found: ${notification.occasionId}`);
        return;
      }

      if (occasion.isArchived || !occasion.isNotificationEnabled) {
        await notification.updateOne({
          status: 'failed',
          failedReason: 'Occasion archived or notification disabled',
        });
        this.logger.debug(`⏭️  Skipped: archived or disabled`);
        return;
      }

      // 마일스톤 존재 확인
      const milestone = occasion.milestones?.find((m) => m.id === notification.milestoneId);

      if (!milestone) {
        await notification.updateOne({
          status: 'failed',
          failedReason: 'Milestone not found',
        });
        this.logger.warn(`⚠️  Milestone not found: ${notification.milestoneId}`);
        return;
      }

      // 메시지 빌드 (최신 데이터 사용)
      const message = this.buildMessage(occasion, milestone, notification.type);

      // FCM 발송
      const response = await admin.messaging().sendEachForMulticast({
        tokens: user.fcmTokens,
        notification: message.notification,
        data: message.data,
      });

      this.logger.log(
        `✅ Sent notification to ${user.fcmTokens.length} devices (${response.successCount} success)`,
      );

      // 성공 처리
      await notification.updateOne({
        status: 'sent',
        sentAt: new Date(),
      });

      // 실패한 토큰 정리
      if (response.failureCount > 0) {
        await this.cleanupInvalidTokens(user, response);
      }
    } catch (error) {
      this.logger.error(`❌ Failed to send notification: ${error.message}`);

      await notification.updateOne({
        $inc: { retryCount: 1 },
        failedReason: error.message,
      });
    }
  }

  private buildMessage(occasion: any, milestone: any, type: string) {
    // 사용자 언어 (기본값: 'ko')
    const language = (occasion.userId as any)?.language || 'ko';

    // 날짜 포맷: YYYY-MM-DD -> M/D
    const formatDate = (dateStr: string) => {
      const [, month, day] = dateStr.split('-');
      return `${parseInt(month)}/${parseInt(day)}`;
    };

    const date = formatDate(milestone.targetDate);

    // 다국어 메시지
    const messages = {
      ko: {
        '3_days': `3일 후(${date}) D-day입니다`,
        '1_day': `내일(${date}) D-day입니다`,
        d_day: `오늘(${date}) D-day입니다`,
      },
      en: {
        '3_days': `In 3 days (${date})`,
        '1_day': `Tomorrow (${date})`,
        d_day: `Today (${date})`,
      },
      ja: {
        '3_days': `3日後(${date})がD-dayです`,
        '1_day': `明日(${date})がD-dayです`,
        d_day: `今日(${date})がD-dayです`,
      },
    };

    const body = messages[language]?.[type] || messages.ko[type];

    return {
      notification: {
        title: `${occasion.name} - ${milestone.name}`,
        body,
      },
      data: {
        occasionId: occasion._id.toString(),
        milestoneId: milestone.id,
        milestoneName: milestone.name,
        targetDate: milestone.targetDate,
        type,
      },
    };
  }

  private async cleanupInvalidTokens(user: any, response: any) {
    const invalidTokens = [];

    response.responses.forEach((resp, idx) => {
      if (!resp.success) {
        const errorCode = resp.error?.code;
        // 유효하지 않은 토큰이면 제거 대상
        if (
          errorCode === 'messaging/invalid-registration-token' ||
          errorCode === 'messaging/registration-token-not-registered'
        ) {
          invalidTokens.push(user.fcmTokens[idx]);
        }
      }
    });

    if (invalidTokens.length > 0) {
      this.logger.log(`🗑️  Removing ${invalidTokens.length} invalid FCM tokens`);
      // TODO: UsersService 주입 후 토큰 제거
      // await this.usersService.removeFcmTokens(user._id, invalidTokens);
    }
  }
}
