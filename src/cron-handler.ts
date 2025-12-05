import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NotificationScheduler } from './notifications/notification-scheduler.service';
import { Handler } from 'aws-lambda';

export const handler: Handler = async (event, _context) => {
  console.log('[Cron] Starting notification cron job', event);

  try {
    // NestJS 앱 부트스트랩 (HTTP 없이)
    const app = await NestFactory.createApplicationContext(AppModule);

    // NotificationScheduler 가져오기
    const scheduler = app.get(NotificationScheduler);

    // 알림 발송 실행
    await scheduler.sendHourlyNotifications();

    await app.close();

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Notification cron completed' }),
    };
  } catch (error) {
    console.error('[Cron] Error:', error);
    throw error;
  }
};
