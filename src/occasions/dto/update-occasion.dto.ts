import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateOccasionDto } from './create-occasion.dto';

// 업데이트 시 변경 불가능한 필드 제외
// - category: 기념일 카테고리는 생성 후 변경 불가
export class UpdateOccasionDto extends PartialType(
  OmitType(CreateOccasionDto, ['category'] as const),
) {}
