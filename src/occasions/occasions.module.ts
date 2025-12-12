import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OccasionsController } from './occasions.controller';
import { OccasionsService } from './occasions.service';
import { Occasion, OccasionSchema } from './schemas/occasion.schema';
import { UsersModule } from '../users/users.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Occasion.name, schema: OccasionSchema }]),
    forwardRef(() => UsersModule),
    NotificationsModule,
  ],
  controllers: [OccasionsController],
  providers: [OccasionsService],
  exports: [OccasionsService],
})
export class OccasionsModule {}
