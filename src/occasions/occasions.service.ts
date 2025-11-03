import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Occasion, OccasionDocument } from './schemas/occasion.schema';
import { CreateOccasionDto } from './dto/create-occasion.dto';
import { UpdateOccasionDto } from './dto/update-occasion.dto';
import { UsersService } from '../users/users.service';

@Injectable()
export class OccasionsService {
  constructor(
    @InjectModel(Occasion.name) private occasionModel: Model<OccasionDocument>,
    private usersService: UsersService,
  ) {}

  async create(userId: string, createOccasionDto: CreateOccasionDto): Promise<OccasionDocument> {
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
      recurringRules: {
        ...defaultSettings.recurringRules,
        ...createOccasionDto.recurringRules,
      },
    });

    return occasion.save();
  }

  async findAll(userId: string): Promise<OccasionDocument[]> {
    return this.occasionModel.find({ userId: new Types.ObjectId(userId) }).sort({ baseDate: -1 }).exec();
  }

  async findOne(userId: string, occasionId: string): Promise<OccasionDocument> {
    const occasion = await this.occasionModel.findById(occasionId).exec();

    if (!occasion) {
      throw new NotFoundException('Occasion not found');
    }

    if (occasion.userId.toString() !== userId) {
      throw new ForbiddenException('You do not have permission to access this occasion');
    }

    return occasion;
  }

  async update(userId: string, occasionId: string, updateOccasionDto: UpdateOccasionDto): Promise<OccasionDocument> {
    const occasion = await this.findOne(userId, occasionId);

    Object.assign(occasion, updateOccasionDto);
    return occasion.save();
  }

  async remove(userId: string, occasionId: string): Promise<void> {
    const occasion = await this.findOne(userId, occasionId);
    await occasion.deleteOne();
  }

  async addCustomMilestone(userId: string, occasionId: string, milestone: { name: string; targetDate: Date }) {
    const occasion = await this.findOne(userId, occasionId);
    const user = await this.usersService.findById(userId);

    // 프리미엄이 아니면 3개까지만
    if (!user.subscription.isPremium && occasion.customMilestones.length >= 3) {
      throw new BadRequestException('Free users can only add up to 3 custom milestones. Upgrade to premium for unlimited.');
    }

    occasion.customMilestones.push(milestone);
    return occasion.save();
  }

  async removeCustomMilestone(userId: string, occasionId: string, milestoneIndex: number) {
    const occasion = await this.findOne(userId, occasionId);

    if (milestoneIndex < 0 || milestoneIndex >= occasion.customMilestones.length) {
      throw new BadRequestException('Invalid milestone index');
    }

    occasion.customMilestones.splice(milestoneIndex, 1);
    return occasion.save();
  }

  private getDefaultSettingsByCategory(category: string) {
    const defaults = {
      couple: {
        displayUnits: { year: false, month: false, week: false, day: true, hour: false, minute: false, second: false },
        displayOptions: { showElapsed: true, showUpcoming: true, showMilestones: true, milestoneCount: 3 as const, showProgress: true },
        recurringRules: { yearly: true, monthly: true, weekly: false, every100days: true, every1000days: false },
      },
      marriage: {
        displayUnits: { year: false, month: false, week: false, day: true, hour: false, minute: false, second: false },
        displayOptions: { showElapsed: true, showUpcoming: true, showMilestones: true, milestoneCount: 3 as const, showProgress: true },
        recurringRules: { yearly: true, monthly: true, weekly: false, every100days: true, every1000days: false },
      },
      baby: {
        displayUnits: { year: false, month: false, week: false, day: true, hour: false, minute: false, second: false },
        displayOptions: { showElapsed: true, showUpcoming: true, showMilestones: true, milestoneCount: 3 as const, showProgress: true },
        recurringRules: { yearly: true, monthly: true, weekly: false, every100days: true, every1000days: false },
      },
      birthday: {
        displayUnits: { year: false, month: false, week: false, day: true, hour: false, minute: false, second: false },
        displayOptions: { showElapsed: true, showUpcoming: true, showMilestones: true, milestoneCount: 1 as const, showProgress: true },
        recurringRules: { yearly: true, monthly: false, weekly: false, every100days: false, every1000days: false },
      },
      military: {
        displayUnits: { year: false, month: false, week: false, day: true, hour: false, minute: false, second: false },
        displayOptions: { showElapsed: false, showUpcoming: true, showMilestones: false, milestoneCount: 1 as const, showProgress: true },
        recurringRules: { yearly: false, monthly: false, weekly: false, every100days: false, every1000days: false },
      },
      quit_smoking: {
        displayUnits: { year: false, month: false, week: false, day: true, hour: false, minute: false, second: false },
        displayOptions: { showElapsed: true, showUpcoming: true, showMilestones: true, milestoneCount: 3 as const, showProgress: true },
        recurringRules: { yearly: false, monthly: false, weekly: false, every100days: true, every1000days: false },
      },
      memorial: {
        displayUnits: { year: false, month: false, week: false, day: true, hour: false, minute: false, second: false },
        displayOptions: {
          showElapsed: true,
          showUpcoming: true,
          showMilestones: false,
          milestoneCount: 'default' as const,
          showProgress: false,
        },
        recurringRules: { yearly: true, monthly: false, weekly: false, every100days: false, every1000days: false },
      },
      payday: {
        displayUnits: { year: false, month: false, week: false, day: true, hour: false, minute: false, second: false },
        displayOptions: { showElapsed: false, showUpcoming: true, showMilestones: false, milestoneCount: 1 as const, showProgress: true },
        recurringRules: { yearly: false, monthly: true, weekly: false, every100days: false, every1000days: false },
      },
    };

    return (
      defaults[category] || {
        displayUnits: { year: false, month: false, week: false, day: true, hour: false, minute: false, second: false },
        displayOptions: { showElapsed: true, showUpcoming: true, showMilestones: true, milestoneCount: 'default' as const, showProgress: true },
        recurringRules: { yearly: false, monthly: false, weekly: false, every100days: false, every1000days: false },
      }
    );
  }
}
