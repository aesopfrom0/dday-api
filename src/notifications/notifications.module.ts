import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NotificationQueue, NotificationQueueSchema } from './schemas/notification-queue.schema';
import { NotificationQueueService } from './notification-queue.service';
import { NotificationScheduler } from './notification-scheduler.service';
import { Occasion, OccasionSchema } from '../occasions/schemas/occasion.schema';
import { User, UserSchema } from '../users/schemas/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: NotificationQueue.name, schema: NotificationQueueSchema },
      { name: Occasion.name, schema: OccasionSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  providers: [NotificationQueueService, NotificationScheduler],
  exports: [NotificationQueueService],
})
export class NotificationsModule {}
