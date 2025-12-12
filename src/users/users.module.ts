import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { User, UserSchema } from './schemas/user.schema';
import { DeletionLog, DeletionLogSchema } from './schemas/deletion-log.schema';
import { OccasionsModule } from '../occasions/occasions.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: DeletionLog.name, schema: DeletionLogSchema },
    ]),
    forwardRef(() => OccasionsModule),
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
