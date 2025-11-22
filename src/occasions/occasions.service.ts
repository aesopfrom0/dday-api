import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Occasion, OccasionDocument } from './schemas/occasion.schema';
import { CreateOccasionDto } from './dto/create-occasion.dto';
import { UpdateOccasionDto } from './dto/update-occasion.dto';
import { UsersService } from '../users/users.service';

@Injectable()
export class OccasionsService {
  private readonly logger = new Logger(OccasionsService.name);

  constructor(
    @InjectModel(Occasion.name) private occasionModel: Model<OccasionDocument>,
    private usersService: UsersService,
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

    // 정렬 순서: 1) isPinned (true 먼저), 2) nextMilestoneDate (빠른 순), 3) baseDate (최근 먼저)
    const occasions = await this.occasionModel
      .find(query)
      .sort({
        isPinned: -1, // true가 먼저
        nextMilestoneDate: 1, // 오름차순 (null은 뒤로)
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

    // Mongoose set 메서드로 중첩 객체 안전하게 병합
    occasion.set(updateOccasionDto);
    const updated = await occasion.save();

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

      if (!user.subscription.isPremium && pinnedCount >= 1) {
        this.logger.warn(
          `[${this.togglePin.name}] 무료 사용자 Pin 제한 초과 - userId: ${userId}, current: ${pinnedCount}`,
        );
        throw new BadRequestException(
          'Free users can only pin 1 occasion. Upgrade to premium for unlimited.',
        );
      }
    }

    occasion.isPinned = !occasion.isPinned;
    const saved = await occasion.save();

    this.logger.log(
      `[${this.togglePin.name}] Pin 토글 완료 - occasionId: ${occasionId}, isPinned: ${saved.isPinned}`,
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

    // 프리미엄이 아니면 3개까지만
    if (!user.subscription.isPremium && occasion.milestones.length >= 3) {
      this.logger.warn(
        `[${this.addMilestone.name}] 무료 사용자 마일스톤 제한 초과 - userId: ${userId}, current: ${occasion.milestones.length}`,
      );
      throw new BadRequestException(
        'Free users can only add up to 3 milestones. Upgrade to premium for unlimited.',
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
}
