import {
  Injectable,
  NotFoundException,
  Inject,
  forwardRef,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { createHash } from 'crypto';
import { DateTime } from 'luxon';
import { User, UserDocument } from './schemas/user.schema';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { OccasionsService } from '../occasions/occasions.service';
import { DeletionLog, DeletionLogDocument } from './schemas/deletion-log.schema';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(DeletionLog.name) private deletionLogModel: Model<DeletionLogDocument>,
    @Inject(forwardRef(() => OccasionsService))
    private occasionsService: OccasionsService,
  ) {}

  async findById(id: string): Promise<UserDocument> {
    const user = await this.userModel.findById(id).exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email }).exec();
  }

  async findByGoogleId(googleId: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ googleId }).exec();
  }

  async findByAppleId(appleId: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ appleId }).exec();
  }

  async create(userData: Partial<User>): Promise<UserDocument> {
    const newUser = new this.userModel(userData);
    return newUser.save();
  }

  async updateSettings(
    userId: string,
    updateSettingsDto: UpdateSettingsDto,
  ): Promise<UserDocument> {
    const user = await this.userModel
      .findByIdAndUpdate(
        userId,
        {
          $set: {
            'settings.defaultMilestoneDisplayCount': updateSettingsDto.defaultMilestoneDisplayCount,
            'settings.language': updateSettingsDto.language,
            'settings.theme': updateSettingsDto.theme,
          },
        },
        { new: true },
      )
      .exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async getSettings(userId: string) {
    const user = await this.findById(userId);
    return user.settings;
  }

  /**
   * FCM 토큰 등록 (멀티 디바이스 지원)
   */
  async registerFcmToken(userId: string, token: string): Promise<UserDocument> {
    const user = await this.userModel.findByIdAndUpdate(
      userId,
      { $addToSet: { fcmTokens: token } }, // 중복 방지
      { new: true },
    );

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  /**
   * FCM 토큰 제거
   */
  async removeFcmToken(userId: string, token: string): Promise<UserDocument> {
    const user = await this.userModel.findByIdAndUpdate(
      userId,
      { $pull: { fcmTokens: token } },
      { new: true },
    );

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  /**
   * 타임존 업데이트
   */
  async updateTimezone(userId: string, timezone: string): Promise<UserDocument> {
    // Luxon으로 타임존 유효성 검증
    if (!DateTime.local().setZone(timezone).isValid) {
      throw new BadRequestException(`Invalid timezone: ${timezone}`);
    }

    const user = await this.userModel.findByIdAndUpdate(userId, { timezone }, { new: true });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // TODO: 기존 pending 알림 재스케줄링
    // NotificationQueueService 주입 후
    // await this.notificationQueueService.rescheduleForUser(userId, timezone);

    return user;
  }

  /**
   * 계정 삭제 (사용자와 관련된 모든 데이터 삭제)
   *
   * 프로세스:
   * 1. 탈퇴 로그 생성 (이메일 해시, 재가입 방지용)
   * 2. 사용자의 모든 occasions 삭제
   * 3. 사용자 완전 삭제
   */
  async deleteAccount(userId: string): Promise<void> {
    const user = await this.findById(userId);

    // 1. 탈퇴 로그 생성 (이메일 SHA-256 해시)
    const emailHash = createHash('sha256').update(user.email).digest('hex');
    await this.deletionLogModel.create({
      userId: userId,
      emailHash: emailHash,
      deletedAt: new Date(),
    });

    // 2. 사용자의 모든 occasions 삭제
    await this.occasionsService.deleteAllByUserId(userId);

    // 3. 사용자 완전 삭제
    await this.userModel.findByIdAndDelete(userId);
  }
}
