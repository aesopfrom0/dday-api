import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

/**
 * 날짜 범위 검증 제약사항
 *
 * 날짜가 합리적인 범위 내에 있는지 검증합니다.
 * - 과거: 1900-01-01 이상
 * - 미래: 현재 + 150년 이하
 */
@ValidatorConstraint({ name: 'isReasonableDateRange', async: false })
export class IsReasonableDateRangeConstraint implements ValidatorConstraintInterface {
  validate(dateString: string) {
    if (!dateString || typeof dateString !== 'string') {
      return false;
    }

    try {
      const date = new Date(dateString);

      // 유효한 날짜인지 확인
      if (isNaN(date.getTime())) {
        return false;
      }

      // 최소 날짜: 1900-01-01
      const minDate = new Date('1900-01-01');

      // 최대 날짜: 현재 + 150년
      const maxDate = new Date();
      maxDate.setFullYear(maxDate.getFullYear() + 150);

      return date >= minDate && date <= maxDate;
    } catch {
      return false;
    }
  }

  defaultMessage() {
    const currentYear = new Date().getFullYear();
    const maxYear = currentYear + 150;
    return `Date must be between 1900-01-01 and ${maxYear}-12-31`;
  }
}

/**
 * 날짜 범위 검증 데코레이터
 *
 * @example
 * ```typescript
 * class CreateOccasionDto {
 *   @IsReasonableDateRange()
 *   @IsDateString()
 *   baseDate: string;
 * }
 * ```
 */
export function IsReasonableDateRange(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsReasonableDateRangeConstraint,
    });
  };
}
