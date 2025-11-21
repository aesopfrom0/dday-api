# API Validation Guidelines

## Date Range Validation

### Overview
To prevent abuse and ensure data integrity, all date inputs are validated to be within a reasonable range.

### Validation Rules

**Backend (NestJS)**
- Minimum Date: `1900-01-01`
- Maximum Date: `Current Year + 150 years`
- Location: `/src/common/validators/date-range.validator.ts`

**Frontend (Flutter)**
- Minimum Date: `1900-01-01`
- Maximum Date: `Current Year + 150 years`
- Location: `/lib/utils/date_validator.dart`

### Rationale

**Why 1900-01-01?**
- Allows for historical commemorations (e.g., historical anniversaries)
- Covers realistic user scenarios
- Prevents issues with date calculations before this date

**Why Current Year + 150 years?**
- More flexible than a fixed year (e.g., 2099)
- Accommodates legitimate future dates
- Prevents unrealistic dates (e.g., year 9999)
- Auto-adjusts as time progresses

### Implementation

#### Backend Example
```typescript
import { IsReasonableDateRange } from '../../common/validators/date-range.validator';

export class CreateOccasionDto {
  @IsString()
  @IsDateString()
  @IsReasonableDateRange()
  baseDate: string;
}
```

#### Frontend Example
```dart
final picked = await showDatePicker(
  context: context,
  firstDate: DateValidator.minDate,
  lastDate: DateValidator.maxDate,
);

if (picked != null && !DateValidator.isReasonableDateRange(picked)) {
  // Show error message
  return;
}
```

### Error Messages

**English:**
`Date must be between Jan 1, 1900 and Dec 31, [CURRENT_YEAR+150]`

**Korean:**
`날짜는 1900년 1월 1일부터 [현재년도+150]년 12월 31일 사이여야 합니다`

**Japanese:**
`日付は1900年1月1日から[現在年+150]年12月31日の間である必要があります`

## Best Practices

### Defense in Depth
1. **Frontend Validation**: First line of defense, better UX
2. **Backend Validation**: Security layer, prevents API abuse
3. **Database Constraints**: Final safety net (optional)

### Why Both Frontend and Backend?
- **Frontend**: Immediate feedback to users
- **Backend**: Security against malicious requests
- **Consistency**: Same rules everywhere

### Testing
Test edge cases:
- Minimum date boundary (1899-12-31 should fail)
- Maximum date boundary (current year + 151 should fail)
- Valid dates (1900-01-01 to current year + 150)
- Invalid date formats
- Null/undefined values

## Related Files

**Backend:**
- `/src/common/validators/date-range.validator.ts`
- `/src/occasions/dto/create-occasion.dto.ts`
- `/src/occasions/dto/update-occasion.dto.ts`

**Frontend:**
- `/lib/utils/date_validator.dart`
- `/lib/screens/add_dday_screen.dart`
- `/lib/screens/add_milestone_screen.dart`
