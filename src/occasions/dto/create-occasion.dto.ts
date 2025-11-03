import {
  IsString,
  IsDateString,
  IsEnum,
  IsObject,
  IsOptional,
  IsBoolean,
  IsArray,
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
  showElapsed?: boolean;

  @IsOptional()
  @IsBoolean()
  showUpcoming?: boolean;

  @IsOptional()
  @IsBoolean()
  showMilestones?: boolean;

  @IsOptional()
  @IsEnum(['default', 1, 2, 3, 'all'])
  milestoneCount?: 'default' | 1 | 2 | 3 | 'all';

  @IsOptional()
  @IsBoolean()
  showProgress?: boolean;
}

class RecurringRulesDto {
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

class CustomMilestoneDto {
  @IsString()
  name: string;

  @IsDateString()
  targetDate: string;
}

export class CreateOccasionDto {
  @IsString()
  name: string;

  @IsDateString()
  baseDate: string;

  @IsEnum(['solar', 'lunar'])
  calendarType: 'solar' | 'lunar';

  @IsEnum([
    'couple',
    'marriage',
    'business',
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
  @IsObject()
  @ValidateNested()
  @Type(() => RecurringRulesDto)
  recurringRules?: RecurringRulesDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CustomMilestoneDto)
  customMilestones?: CustomMilestoneDto[];
}
