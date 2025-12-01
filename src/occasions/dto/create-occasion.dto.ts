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
  MaxLength,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { IsReasonableDateRange } from '../../common/validators/date-range.validator';

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
  @MinLength(1, { message: '마일스톤 이름을 입력해주세요' })
  @MaxLength(50, { message: '마일스톤 이름은 50자를 초과할 수 없습니다' })
  name: string;

  // "YYYY-MM-DD" 형식 (ISO 8601 날짜 전용)
  // 예: "2026-04-23"
  @IsString()
  @IsDateString()
  @IsReasonableDateRange()
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
  @MinLength(1, { message: '제목을 입력해주세요' })
  @MaxLength(100, { message: '제목은 100자를 초과할 수 없습니다' })
  name: string;

  // "YYYY-MM-DD" 형식 (ISO 8601 날짜 전용)
  // 예: "2025-08-15"
  @IsString()
  @IsDateString()
  @IsReasonableDateRange()
  baseDate: string;

  // 양력 기준 날짜 (음력인 경우에만 필요)
  // "YYYY-MM-DD" 형식 (ISO 8601 날짜 전용)
  // 예: "1997-01-06" (음력 1996-11-27의 양력 변환)
  @IsOptional()
  @IsString()
  @IsDateString()
  @IsReasonableDateRange()
  solarBaseDate?: string;

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
    'quitSmoking',
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
