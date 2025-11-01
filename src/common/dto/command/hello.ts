import { IsString, IsEnum, IsOptional } from 'class-validator';
import { MoodType } from '@prisma/client';

export class CreateHello {
  @IsString()
  message: string;

  @IsEnum(MoodType)
  mood: MoodType;
}

export class UpdateHello {
  @IsOptional()
  @IsString()
  message?: string;

  @IsOptional()
  @IsEnum(MoodType)
  mood?: MoodType;
}
