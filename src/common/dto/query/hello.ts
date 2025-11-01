import { IsOptional, IsString, IsEnum, IsArray } from 'class-validator';
import { Transform } from 'class-transformer';
import { MoodType } from '@prisma/client';
import { PaginationQuery } from './pagination';

export class HelloQuery extends PaginationQuery {
  @IsOptional()
  @Transform(({ value }) => {
    if (value === null || value === undefined) return value;
    // 문자열을 쉼표로 split하거나, 배열이면 그대로 반환
    if (typeof value === 'string') {
      return value.split(',').map(Number);
    }
    return Array.isArray(value) ? value.map(Number) : [Number(value)];
  })
  @IsArray()
  @IsEnum(Number, { each: true })
  ids?: number[];

  @IsOptional()
  @IsString()
  message?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === null || value === undefined) return value;
    // 문자열을 쉼표로 split하거나, 배열이면 그대로 반환
    if (typeof value === 'string') {
      return value.split(',');
    }
    return Array.isArray(value) ? value : [value];
  })
  @IsArray()
  @IsEnum(MoodType, { each: true })
  moodTypes?: MoodType[];
}
