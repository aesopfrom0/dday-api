import { Transform } from 'class-transformer';
import { IsNumber, IsOptional, IsObject } from 'class-validator';
import { SortOrder } from 'src/common/constant/sort-order';

export class PaginationQuery {
  @IsOptional()
  @Transform(({ value }) => {
    if (value === null || value === undefined) return value;
    return Number(value);
  })
  @IsNumber()
  skip?: number; // 페이지네이션을 위해 건너뛸 레코드 수

  @IsOptional()
  @Transform(({ value }) => {
    if (value === null || value === undefined) return value;
    return Number(value);
  })
  @IsNumber()
  take?: number = 50; // 페이지네이션을 위해 가져올 레코드 수, 기본값 50

  @IsOptional()
  @IsObject()
  @Transform(({ value }) => (typeof value === 'string' ? JSON.parse(value) : value))
  orderBy?: Record<string, SortOrder>; // 정렬 옵션: { 필드명: 정렬방향 } 형태
}
