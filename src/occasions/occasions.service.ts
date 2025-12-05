import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Occasion, OccasionDocument } from './schemas/occasion.schema';
import { CreateOccasionDto } from './dto/create-occasion.dto';
import { UpdateOccasionDto } from './dto/update-occasion.dto';
import { UsersService } from '../users/users.service';
import { NotificationQueueService } from '../notifications/notification-queue.service';

@Injectable()
export class OccasionsService {
  private readonly logger = new Logger(OccasionsService.name);

  constructor(
    @InjectModel(Occasion.name) private occasionModel: Model<OccasionDocument>,
    private usersService: UsersService,
    private configService: ConfigService,
    private notificationQueueService: NotificationQueueService,
  ) {}

  async create(userId: string, createOccasionDto: CreateOccasionDto): Promise<OccasionDocument> {
    this.logger.log(
      `[${this.create.name}] 기념일 생성 시작 - userId: ${userId}, category: ${createOccasionDto.category}, name: ${createOccasionDto.name}`,
    );

    // 카테고리별 기본 설정 적용
    const defaultSettings = this.getDefaultSettingsByCategory(createOccasionDto.category);

    const occasion = new this.occasionModel({
      ...createOccasionDto,
      userId: new Types.ObjectId(userId),
      displayUnits: {
        ...defaultSettings.displayUnits,
        ...createOccasionDto.displayUnits,
      },
      displayOptions: {
        ...defaultSettings.displayOptions,
        ...createOccasionDto.displayOptions,
      },
      suggestionRules: {
        ...defaultSettings.suggestionRules,
        ...createOccasionDto.suggestionRules,
      },
    });

    // 마일스톤이 있으면 캐시 업데이트
    if (occasion.milestones && occasion.milestones.length > 0) {
      this.updateNextMilestoneCache(occasion);
    }

    const saved = await occasion.save();
    this.logger.log(`[${this.create.name}] 기념일 생성 완료 - occasionId: ${saved.id}`);

    // 알림 활성화 시 알림 큐 생성
    if (saved.isNotificationEnabled) {
      const user = await this.usersService.findById(userId);
      await this.notificationQueueService.scheduleNotifications(saved, user);
    }

    return saved;
  }

  async findAll(userId: string, category?: string): Promise<OccasionDocument[]> {
    this.logger.debug(
      `[${this.findAll.name}] 기념일 목록 조회 - userId: ${userId}, category: ${category || 'all'}`,
    );

    const query: any = { userId: new Types.ObjectId(userId) };

    if (category) {
      query.category = category;
    }

    // 정렬 순서:
    // 1) isPinned (true 먼저)
    // 2) pinnedAt (Pin된 것끼리는 오래된 순)
    // 3) nextMilestoneDate (일반 항목은 D-Day 가까운 순)
    // 4) baseDate (폴백: 최근 먼저)
    const occasions = await this.occasionModel
      .find(query)
      .sort({
        isPinned: -1, // true가 먼저
        pinnedAt: 1, // 오름차순 (먼저 Pin한 게 위로, null은 뒤로)
        nextMilestoneDate: 1, // 오름차순 (가까운 날짜가 먼저, null은 뒤로)
        baseDate: -1, // 내림차순 (최근 먼저)
      })
      .exec();
    this.logger.debug(`[${this.findAll.name}] 조회 완료 - 총 ${occasions.length}개`);

    return occasions;
  }

  async findOne(userId: string, occasionId: string): Promise<OccasionDocument> {
    this.logger.debug(
      `[${this.findOne.name}] 기념일 단건 조회 - userId: ${userId}, occasionId: ${occasionId}`,
    );

    const occasion = await this.occasionModel.findById(occasionId).exec();

    if (!occasion) {
      this.logger.debug(`[${this.findOne.name}] 기념일을 찾을 수 없음 - occasionId: ${occasionId}`);
      throw new NotFoundException('Occasion not found');
    }

    if (occasion.userId.toString() !== userId) {
      this.logger.warn(
        `[${this.findOne.name}] 권한 없음 - userId: ${userId}, occasionId: ${occasionId}, ownerId: ${occasion.userId}`,
      );
      throw new ForbiddenException('You do not have permission to access this occasion');
    }

    this.logger.debug(`[${this.findOne.name}] 조회 완료 - occasionId: ${occasionId}`);
    return occasion;
  }

  async update(
    userId: string,
    occasionId: string,
    updateOccasionDto: UpdateOccasionDto,
  ): Promise<OccasionDocument> {
    this.logger.log(
      `[${this.update.name}] 기념일 수정 시작 - userId: ${userId}, occasionId: ${occasionId}`,
    );

    const occasion = await this.occasionModel.findById(occasionId).exec();

    if (!occasion) {
      throw new NotFoundException('Occasion not found');
    }

    if (occasion.userId.toString() !== userId) {
      throw new ForbiddenException('You do not have permission to access this occasion');
    }

    // 기존 알림 삭제 (pending만)
    await this.notificationQueueService.deleteByOccasionId(occasionId);

    // Mongoose set 메서드로 중첩 객체 안전하게 병합
    occasion.set(updateOccasionDto);

    // milestones나 excludedMilestones가 변경되면 캐시 업데이트
    if (
      updateOccasionDto.milestones !== undefined ||
      updateOccasionDto.excludedMilestones !== undefined
    ) {
      this.updateNextMilestoneCache(occasion);
    }

    const updated = await occasion.save();

    // 알림 활성화 시 재생성
    if (updated.isNotificationEnabled) {
      const user = await this.usersService.findById(userId);
      await this.notificationQueueService.scheduleNotifications(updated, user);
    }

    this.logger.log(`[${this.update.name}] 기념일 수정 완료 - occasionId: ${occasionId}`);
    return updated;
  }

  async remove(userId: string, occasionId: string): Promise<void> {
    this.logger.log(
      `[${this.remove.name}] 기념일 삭제 시작 - userId: ${userId}, occasionId: ${occasionId}`,
    );

    const occasion = await this.occasionModel.findById(occasionId).exec();

    if (!occasion) {
      throw new NotFoundException('Occasion not found');
    }

    if (occasion.userId.toString() !== userId) {
      throw new ForbiddenException('You do not have permission to access this occasion');
    }

    // 알림 먼저 삭제
    await this.notificationQueueService.deleteByOccasionId(occasionId);

    await occasion.deleteOne();

    this.logger.log(`[${this.remove.name}] 기념일 삭제 완료 - occasionId: ${occasionId}`);
  }

  async togglePin(userId: string, occasionId: string): Promise<OccasionDocument> {
    this.logger.log(
      `[${this.togglePin.name}] Pin 토글 시작 - userId: ${userId}, occasionId: ${occasionId}`,
    );

    const occasion = await this.occasionModel.findById(occasionId).exec();

    if (!occasion) {
      throw new NotFoundException('Occasion not found');
    }

    if (occasion.userId.toString() !== userId) {
      throw new ForbiddenException('You do not have permission to access this occasion');
    }

    // Pin 해제는 제한 없음
    if (!occasion.isPinned) {
      const user = await this.usersService.findById(userId);
      const pinnedCount = await this.occasionModel.countDocuments({
        userId: new Types.ObjectId(userId),
        isPinned: true,
      });

      const maxPins = this.configService.get<number>('limits.free.maxPinnedOccasions');

      if (!user.subscription.isPremium && pinnedCount >= maxPins) {
        this.logger.warn(
          `[${this.togglePin.name}] 무료 사용자 Pin 제한 초과 - userId: ${userId}, current: ${pinnedCount}, max: ${maxPins}`,
        );
        throw new HttpException(
          `Free users can only pin up to ${maxPins} occasions. Upgrade to premium for unlimited.`,
          HttpStatus.PAYMENT_REQUIRED,
        );
      }
    }

    occasion.isPinned = !occasion.isPinned;
    occasion.pinnedAt = occasion.isPinned ? new Date() : null;
    const saved = await occasion.save();

    this.logger.log(
      `[${this.togglePin.name}] Pin 토글 완료 - occasionId: ${occasionId}, isPinned: ${saved.isPinned}, pinnedAt: ${saved.pinnedAt}`,
    );
    return saved;
  }

  private updateNextMilestoneCache(occasion: OccasionDocument): void {
    const today = new Date().toISOString().split('T')[0];
    const upcomingMilestones = occasion.milestones
      .filter((m) => m.targetDate >= today)
      .sort((a, b) => a.targetDate.localeCompare(b.targetDate));

    occasion.nextMilestoneDate = upcomingMilestones[0]?.targetDate;
  }

  async addMilestone(
    userId: string,
    occasionId: string,
    milestone: {
      id: string;
      name: string;
      targetDate: string;
      description?: string;
      isFromSuggestion?: boolean;
      suggestionType?: string;
      suggestionValue?: number;
    },
  ): Promise<OccasionDocument> {
    this.logger.log(
      `[${this.addMilestone.name}] 마일스톤 추가 시작 - userId: ${userId}, occasionId: ${occasionId}, milestoneName: ${milestone.name}`,
    );

    const occasion = await this.occasionModel.findById(occasionId).exec();

    if (!occasion) {
      throw new NotFoundException('Occasion not found');
    }

    if (occasion.userId.toString() !== userId) {
      throw new ForbiddenException('You do not have permission to access this occasion');
    }

    const user = await this.usersService.findById(userId);
    const maxMilestones = this.configService.get<number>('limits.free.maxMilestonesPerOccasion');

    // 프리미엄이 아니면 설정값까지만
    if (!user.subscription.isPremium && occasion.milestones.length >= maxMilestones) {
      this.logger.warn(
        `[${this.addMilestone.name}] 무료 사용자 마일스톤 제한 초과 - userId: ${userId}, current: ${occasion.milestones.length}, max: ${maxMilestones}`,
      );
      throw new HttpException(
        `Free users can only add up to ${maxMilestones} milestones per occasion. Upgrade to premium for unlimited.`,
        HttpStatus.PAYMENT_REQUIRED,
      );
    }

    occasion.milestones.push(milestone);
    this.updateNextMilestoneCache(occasion);
    const saved = await occasion.save();

    this.logger.log(
      `[${this.addMilestone.name}] 마일스톤 추가 완료 - occasionId: ${occasionId}, 총 ${saved.milestones.length}개`,
    );
    return saved;
  }

  async removeMilestone(
    userId: string,
    occasionId: string,
    milestoneId: string,
  ): Promise<OccasionDocument> {
    this.logger.log(
      `[${this.removeMilestone.name}] 마일스톤 삭제 시작 - userId: ${userId}, occasionId: ${occasionId}, milestoneId: ${milestoneId}`,
    );

    const occasion = await this.occasionModel.findById(occasionId).exec();

    if (!occasion) {
      throw new NotFoundException('Occasion not found');
    }

    if (occasion.userId.toString() !== userId) {
      throw new ForbiddenException('You do not have permission to access this occasion');
    }

    const milestoneIndex = occasion.milestones.findIndex((m) => m.id === milestoneId);

    if (milestoneIndex === -1) {
      this.logger.warn(
        `[${this.removeMilestone.name}] 마일스톤을 찾을 수 없음 - milestoneId: ${milestoneId}`,
      );
      throw new NotFoundException('Milestone not found');
    }

    const removedMilestone = occasion.milestones[milestoneIndex];
    occasion.milestones.splice(milestoneIndex, 1);
    this.updateNextMilestoneCache(occasion);
    const saved = await occasion.save();

    this.logger.log(
      `[${this.removeMilestone.name}] 마일스톤 삭제 완료 - occasionId: ${occasionId}, 삭제된 마일스톤: ${removedMilestone.name}, 남은 개수: ${saved.milestones.length}`,
    );
    return saved;
  }

  async updateMilestone(
    userId: string,
    occasionId: string,
    milestoneId: string,
    updateData: {
      name?: string;
      targetDate?: string;
      description?: string;
    },
  ): Promise<OccasionDocument> {
    this.logger.log(
      `[${this.updateMilestone.name}] 마일스톤 수정 시작 - userId: ${userId}, occasionId: ${occasionId}, milestoneId: ${milestoneId}`,
    );

    const occasion = await this.occasionModel.findById(occasionId).exec();

    if (!occasion) {
      throw new NotFoundException('Occasion not found');
    }

    if (occasion.userId.toString() !== userId) {
      throw new ForbiddenException('You do not have permission to access this occasion');
    }

    const milestoneIndex = occasion.milestones.findIndex((m) => m.id === milestoneId);

    if (milestoneIndex === -1) {
      this.logger.warn(
        `[${this.updateMilestone.name}] 마일스톤을 찾을 수 없음 - milestoneId: ${milestoneId}`,
      );
      throw new NotFoundException('Milestone not found');
    }

    // 마일스톤 업데이트
    const milestone = occasion.milestones[milestoneIndex];
    if (updateData.name !== undefined) {
      milestone.name = updateData.name;
    }
    if (updateData.targetDate !== undefined) {
      milestone.targetDate = updateData.targetDate;
    }
    if (updateData.description !== undefined) {
      milestone.description = updateData.description;
    }

    // targetDate가 변경되면 캐시 업데이트
    if (updateData.targetDate !== undefined) {
      this.updateNextMilestoneCache(occasion);
    }

    const saved = await occasion.save();

    this.logger.log(
      `[${this.updateMilestone.name}] 마일스톤 수정 완료 - occasionId: ${occasionId}, milestoneId: ${milestoneId}, 새 이름: ${milestone.name}`,
    );
    return saved;
  }

  private getDefaultSettingsByCategory(category: string) {
    const defaults = {
      couple: {
        displayUnits: {
          year: false,
          month: false,
          week: false,
          day: true,
          hour: false,
          minute: false,
          second: false,
        },
        displayOptions: {
          showProgress: true,
          showCumulativeDuration: true,
        },
        suggestionRules: {
          yearly: true,
          monthly: true,
          weekly: false,
          every100days: true,
          every1000days: false,
        },
      },
      marriage: {
        displayUnits: {
          year: false,
          month: false,
          week: false,
          day: true,
          hour: false,
          minute: false,
          second: false,
        },
        displayOptions: {
          showProgress: true,
          showCumulativeDuration: true,
        },
        suggestionRules: {
          yearly: true,
          monthly: true,
          weekly: false,
          every100days: true,
          every1000days: false,
        },
      },
      baby: {
        displayUnits: {
          year: false,
          month: false,
          week: false,
          day: true,
          hour: false,
          minute: false,
          second: false,
        },
        displayOptions: {
          showProgress: true,
          showCumulativeDuration: true,
        },
        suggestionRules: {
          yearly: true,
          monthly: true,
          weekly: false,
          every100days: true,
          every1000days: false,
        },
      },
      birthday: {
        displayUnits: {
          year: false,
          month: false,
          week: false,
          day: true,
          hour: false,
          minute: false,
          second: false,
        },
        displayOptions: {
          showProgress: true,
          showCumulativeDuration: true,
        },
        suggestionRules: {
          yearly: true,
          monthly: false,
          weekly: false,
          every100days: false,
          every1000days: false,
        },
      },
      military: {
        displayUnits: {
          year: false,
          month: false,
          week: false,
          day: true,
          hour: false,
          minute: false,
          second: false,
        },
        displayOptions: {
          showProgress: true,
          showCumulativeDuration: false,
        },
        suggestionRules: {
          yearly: false,
          monthly: false,
          weekly: false,
          every100days: false,
          every1000days: false,
        },
      },
      quit_smoking: {
        displayUnits: {
          year: false,
          month: false,
          week: false,
          day: true,
          hour: false,
          minute: false,
          second: false,
        },
        displayOptions: {
          showProgress: true,
          showCumulativeDuration: true,
        },
        suggestionRules: {
          yearly: false,
          monthly: false,
          weekly: false,
          every100days: true,
          every1000days: false,
        },
      },
      memorial: {
        displayUnits: {
          year: false,
          month: false,
          week: false,
          day: true,
          hour: false,
          minute: false,
          second: false,
        },
        displayOptions: {
          showProgress: false,
          showCumulativeDuration: true,
        },
        suggestionRules: {
          yearly: true,
          monthly: false,
          weekly: false,
          every100days: false,
          every1000days: false,
        },
      },
      payday: {
        displayUnits: {
          year: false,
          month: false,
          week: false,
          day: true,
          hour: false,
          minute: false,
          second: false,
        },
        displayOptions: {
          showProgress: true,
          showCumulativeDuration: false,
        },
        suggestionRules: {
          yearly: false,
          monthly: true,
          weekly: false,
          every100days: false,
          every1000days: false,
        },
      },
    };

    return (
      defaults[category] || {
        displayUnits: {
          year: false,
          month: false,
          week: false,
          day: true,
          hour: false,
          minute: false,
          second: false,
        },
        displayOptions: {
          showProgress: true,
          showCumulativeDuration: true,
        },
        suggestionRules: {
          yearly: false,
          monthly: false,
          weekly: false,
          every100days: false,
          every1000days: false,
        },
      }
    );
  }

  /**
   * 테스트 알림 발송 (개발/테스트용)
   */
  async sendTestNotification(userId: string, occasionId: string) {
    this.logger.debug(
      `[${this.sendTestNotification.name}] 테스트 알림 발송 시작 - userId: ${userId}, occasionId: ${occasionId}`,
    );

    const occasion = await this.occasionModel.findById(occasionId).exec();

    if (!occasion) {
      this.logger.debug(`[${this.sendTestNotification.name}] 기념일을 찾을 수 없음 - occasionId: ${occasionId}`);
      throw new NotFoundException('Occasion not found');
    }

    if (occasion.userId.toString() !== userId) {
      this.logger.warn(
        `[${this.sendTestNotification.name}] 권한 없음 - userId: ${userId}, occasionId: ${occasionId}`,
      );
      throw new ForbiddenException('You do not have permission to access this occasion');
    }

    this.logger.debug(
      `[${this.sendTestNotification.name}] 기념일 조회 완료 - name: ${occasion.name}, baseDate: ${occasion.baseDate}`,
    );

    const user = await this.usersService.findById(userId);
    this.logger.debug(
      `[${this.sendTestNotification.name}] 사용자 조회 완료 - FCM 토큰 개수: ${user.fcmTokens?.length || 0}`,
    );

    if (!user.fcmTokens || user.fcmTokens.length === 0) {
      this.logger.warn(`[${this.sendTestNotification.name}] FCM 토큰 없음 - userId: ${userId}`);
      throw new HttpException('No FCM tokens registered', HttpStatus.BAD_REQUEST);
    }

    // Firebase Admin으로 즉시 알림 발송
    this.logger.debug(`[${this.sendTestNotification.name}] Firebase Admin 모듈 로드 중...`);
    const admin = await import('firebase-admin');

    const notificationPayload = {
      tokens: user.fcmTokens,
      notification: {
        title: `🔔 ${occasion.name}`,
        body: '테스트 알림입니다! 푸시 알림이 정상적으로 작동하고 있습니다.',
      },
      data: {
        occasionId: occasion.id,
        occasionDate: occasion.baseDate,
        type: 'test',
      },
    };

    this.logger.debug(
      `[${this.sendTestNotification.name}] 알림 페이로드 준비 완료:\n${JSON.stringify(notificationPayload, null, 2)}`,
    );

    try {
      this.logger.debug(`[${this.sendTestNotification.name}] Firebase 알림 발송 중...`);
      const response = await admin.default.messaging().sendEachForMulticast(notificationPayload);

      this.logger.log(
        `[${this.sendTestNotification.name}] 테스트 알림 발송 완료 - success: ${response.successCount}, fail: ${response.failureCount}`,
      );

      if (response.failureCount > 0) {
        this.logger.warn(
          `[${this.sendTestNotification.name}] 일부 알림 발송 실패:\n${JSON.stringify(response.responses.filter((r) => !r.success).map((r) => r.error), null, 2)}`,
        );
      }

      return {
        success: true,
        message: 'Test notification sent',
        tokensCount: user.fcmTokens.length,
        successCount: response.successCount,
        failureCount: response.failureCount,
      };
    } catch (error) {
      this.logger.error(
        `[${this.sendTestNotification.name}] 알림 발송 실패 - error: ${error.message}\nstack: ${error.stack}`,
      );
      throw new HttpException(
        `Failed to send notification: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
