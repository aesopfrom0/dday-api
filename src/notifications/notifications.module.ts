import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NotificationQueue, NotificationQueueSchema } from './schemas/notification-queue.schema';
import { NotificationQueueService } from './notification-queue.service';
import { NotificationScheduler } from './notification-scheduler.service';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: NotificationQueue.name, schema: NotificationQueueSchema }]),
    UsersModule, // User 모델 접근용
  ],
  providers: [NotificationQueueService, NotificationScheduler],
  exports: [NotificationQueueService],
})
export class NotificationsModule {}
