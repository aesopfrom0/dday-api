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

class SuggestionRulesResponseDto {
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

class MilestoneResponseDto {
  @Expose()
  id: string;

  @Expose()
  name: string;

  @Expose()
  targetDate: Date;

  @Expose()
  description?: string;

  @Expose()
  isFromSuggestion: boolean;

  @Expose()
  suggestionType?: string;

  @Expose()
  suggestionValue?: number;
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
  solarBaseDate?: string;

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
  @Type(() => SuggestionRulesResponseDto)
  suggestionRules: SuggestionRulesResponseDto;

  @Expose()
  @Type(() => MilestoneResponseDto)
  milestones: MilestoneResponseDto[];

  @Expose()
  excludedMilestones: string[];

  @Expose()
  isPinned: boolean;

  @Expose()
  pinnedAt?: Date;

  @Expose()
  nextMilestoneDate?: string;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  constructor(partial: Partial<OccasionResponseDto>) {
    Object.assign(this, partial);
  }
}
