import { IsOptional, IsString, IsEnum, IsNumber } from 'class-validator';
import { MoodType } from '@prisma/client';

export class CreateBye {
  @IsOptional()
  @IsString()
  message?: string;

  @IsOptional()
  @IsEnum(MoodType)
  mood?: MoodType;

  @IsOptional()
  @IsNumber()
  waveCount?: number;
}
