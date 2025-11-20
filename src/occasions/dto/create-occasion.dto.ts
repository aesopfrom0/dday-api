import {
  IsString,
  IsDateString,
  IsEnum,
  IsObject,
  IsOptional,
  IsBoolean,
  IsArray,
  IsNumber,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class DisplayUnitsDto {
  @IsOptional()
  @IsBoolean()
  year?: boolean;

  @IsOptional()
  @IsBoolean()
  month?: boolean;

  @IsOptional()
  @IsBoolean()
  week?: boolean;

  @IsOptional()
  @IsBoolean()
  day?: boolean;

  @IsOptional()
  @IsBoolean()
  hour?: boolean;

  @IsOptional()
  @IsBoolean()
  minute?: boolean;

  @IsOptional()
  @IsBoolean()
  second?: boolean;
}

class DisplayOptionsDto {
  @IsOptional()
  @IsBoolean()
  showProgress?: boolean;

  @IsOptional()
  @IsBoolean()
  showCumulativeDuration?: boolean;
}

class SuggestionRulesDto {
  @IsOptional()
  @IsBoolean()
  yearly?: boolean;

  @IsOptional()
  @IsBoolean()
  monthly?: boolean;

  @IsOptional()
  @IsBoolean()
  weekly?: boolean;

  @IsOptional()
  @IsBoolean()
  every100days?: boolean;

  @IsOptional()
  @IsBoolean()
  every1000days?: boolean;
}

class MilestoneDto {
  @IsString()
  id: string;

  @IsString()
  name: string;

  // "YYYY-MM-DD" 형식 (ISO 8601 날짜 전용)
  // 예: "2026-04-23"
  @IsString()
  @IsDateString()
  targetDate: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isFromSuggestion?: boolean;

  @IsOptional()
  @IsString()
  suggestionType?: string;

  @IsOptional()
  @IsNumber()
  suggestionValue?: number;
}

export class CreateOccasionDto {
  @IsString()
  name: string;

  // "YYYY-MM-DD" 형식 (ISO 8601 날짜 전용)
  // 예: "2025-08-15"
  @IsString()
  @IsDateString()
  baseDate: string;

  @IsEnum(['solar', 'lunar'])
  calendarType: 'solar' | 'lunar';

  @IsEnum([
    'couple',
    'marriage',
    'birthday',
    'wedding',
    'baby',
    'military',
    'fandom',
    'debut',
    'payday',
    'quit_smoking',
    'memorial',
    'travel',
    'others',
  ])
  category: string;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => DisplayUnitsDto)
  displayUnits?: DisplayUnitsDto;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => DisplayOptionsDto)
  displayOptions?: DisplayOptionsDto;

  @IsOptional()
  @IsBoolean()
  isNotificationEnabled?: boolean;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => SuggestionRulesDto)
  suggestionRules?: SuggestionRulesDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MilestoneDto)
  milestones?: MilestoneDto[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  excludedMilestones?: string[];
}
