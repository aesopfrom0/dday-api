import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NotificationQueueService } from './notifications/notification-queue.service';
import { Handler } from 'aws-lambda';

/**
 * Lambda 함수: 알림 Queue 적재 크론
 *
 * 실행 스케줄: 매일 UTC 02:23 (cron(23 2 * * ? *))
 *
 * 작업:
 * 1. 향후 3일 이내 마일스톤 조회
 * 2. NotificationQueue에 알림 적재
 */

export const handler: Handler = async (event, _context) => {
  console.log('[EnqueueNotificationsCron] Starting notification enqueue', event);

  try {
    // NestJS 앱 부트스트랩 (HTTP 없이)
    const app = await NestFactory.createApplicationContext(AppModule);

    // NotificationQueueService 가져오기
    const notificationQueueService = app.get(NotificationQueueService);

    // 알림 적재 실행
    const result = await notificationQueueService.enqueueUpcomingMilestones();

    console.log(
      `[EnqueueNotificationsCron] Completed - enqueued: ${result.enqueuedCount}, occasions: ${result.occasionCount}`,
    );

    await app.close();

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Notification enqueue completed',
        ...result,
      }),
    };
  } catch (error) {
    console.error('[EnqueueNotificationsCron] Error:', error);
    throw error;
  }
};
