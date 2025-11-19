import { Expose, Type } from 'class-transformer';

class DisplayUnitsResponseDto {
  @Expose()
  year: boolean;

  @Expose()
  month: boolean;

  @Expose()
  week: boolean;

  @Expose()
  day: boolean;

  @Expose()
  hour: boolean;

  @Expose()
  minute: boolean;

  @Expose()
  second: boolean;
}

class DisplayOptionsResponseDto {
  @Expose()
  showProgress: boolean;

  @Expose()
  showCumulativeDuration: boolean;
}

class MilestoneRulesResponseDto {
  @Expose()
  yearly: boolean;

  @Expose()
  monthly: boolean;

  @Expose()
  weekly: boolean;

  @Expose()
  every100days: boolean;

  @Expose()
  every1000days: boolean;
}

class CustomMilestoneResponseDto {
  @Expose()
  name: string;

  @Expose()
  targetDate: Date;
}

export class OccasionResponseDto {
  @Expose()
  id: string;

  @Expose()
  userId: string;

  @Expose()
  name: string;

  @Expose()
  baseDate: string;

  @Expose()
  calendarType: 'solar' | 'lunar';

  @Expose()
  category: string;

  @Expose()
  isNotificationEnabled: boolean;

  @Expose()
  @Type(() => DisplayUnitsResponseDto)
  displayUnits: DisplayUnitsResponseDto;

  @Expose()
  @Type(() => DisplayOptionsResponseDto)
  displayOptions: DisplayOptionsResponseDto;

  @Expose()
  @Type(() => MilestoneRulesResponseDto)
  milestoneRules: MilestoneRulesResponseDto;

  @Expose()
  @Type(() => CustomMilestoneResponseDto)
  customMilestones: CustomMilestoneResponseDto[];

  @Expose()
  excludedMilestones: string[];

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  constructor(partial: Partial<OccasionResponseDto>) {
    Object.assign(this, partial);
  }
}
