import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { UpdateSettingsDto } from './dto/update-settings.dto';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

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
    // TODO: Luxon으로 타임존 유효성 검증
    const user = await this.userModel.findByIdAndUpdate(userId, { timezone }, { new: true });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // TODO: 기존 pending 알림 재스케줄링
    // NotificationQueueService 주입 후
    // await this.notificationQueueService.rescheduleForUser(userId, timezone);

    return user;
  }
}
