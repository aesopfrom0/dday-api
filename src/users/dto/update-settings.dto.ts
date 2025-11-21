import { IsEnum, IsOptional } from 'class-validator';

export class UpdateSettingsDto {
  @IsOptional()
  @IsEnum(['1', '2', '3', 'all'])
  defaultMilestoneDisplayCount?: '1' | '2' | '3' | 'all';

  @IsOptional()
  @IsEnum(['ko', 'en', 'ja'])
  language?: 'ko' | 'en' | 'ja';

  @IsOptional()
  @IsEnum(['light', 'dark', 'system'])
  theme?: 'light' | 'dark' | 'system';
}
