import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { NotificationQueue, NotificationQueueDocument } from './schemas/notification-queue.schema';
import * as admin from 'firebase-admin';

@Injectable()
export class NotificationScheduler {
  private readonly logger = new Logger(NotificationScheduler.name);

  constructor(
    @InjectModel(NotificationQueue.name)
    private notificationQueueModel: Model<NotificationQueueDocument>,
  ) {}

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
      .populate('userId', 'fcmTokens timezone')
      .limit(10000); // 안전장치

    this.logger.log(`[Cron] Found ${notifications.length} notifications to send`);

    // 배치 발송 (100개씩)
    for (let i = 0; i < notifications.length; i += 100) {
      const batch = notifications.slice(i, i + 100);
      await this.sendBatch(batch);
    }
  }

  private async sendBatch(notifications: NotificationQueueDocument[]) {
    const promises = notifications.map((n) => this.sendNotification(n));
    await Promise.allSettled(promises); // 하나 실패해도 계속 진행
  }

  async sendNotification(notification: NotificationQueueDocument) {
    try {
      const user = notification.userId as any;

      if (!user.fcmTokens || user.fcmTokens.length === 0) {
        await notification.updateOne({
          status: 'failed',
          failedReason: 'No FCM tokens',
        });
        return;
      }

      const message = this.buildMessage(notification);

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

  private buildMessage(notification: NotificationQueueDocument) {
    const typeLabels = {
      '3_days': '3일 전',
      '1_day': '1일 전',
      d_day: '오늘',
    };

    return {
      notification: {
        title: notification.occasionName,
        body: `${typeLabels[notification.type]} 알림입니다!`,
      },
      data: {
        occasionId: notification.occasionId.toString(),
        occasionDate: notification.occasionDate,
        type: notification.type,
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
