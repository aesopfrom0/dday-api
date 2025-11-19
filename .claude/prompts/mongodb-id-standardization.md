# MongoDB _id를 id로 표준화하는 백엔드 개선 작업

## 목표
백엔드 코드 내부에서도 `_id` 대신 `id`를 일관되게 사용할 수 있도록 개선

## 현재 문제점
1. API 응답에서는 `id`로 반환되지만, 백엔드 코드에서는 여전히 `_id` 사용 필요
2. TypeScript 타입과 실제 사용의 불일치
3. `occasion._id` vs `occasion.id` 혼동 가능성

## 해결 방안

### 1. Mongoose Virtual ID 활성화 (권장)

모든 스키마에 다음 설정 추가:

```typescript
@Schema({
  collection: 'occasions',
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: (_doc, ret) => {
      ret.id = ret._id.toString();
      delete ret._id;
      delete ret.__v;
      return ret;
    },
  },
  toObject: {
    virtuals: true,
    transform: (_doc, ret) => {
      ret.id = ret._id.toString();
      delete ret._id;
      delete ret.__v;
      return ret;
    },
  },
})
export class Occasion {
  // ...
}

// 스키마 생성 후
OccasionSchema.virtual('id').get(function() {
  return this._id.toHexString();
});
```

### 2. TypeScript 타입 정의 개선

```typescript
// src/occasions/schemas/occasion.schema.ts
export type OccasionDocument = Occasion & Document & {
  id: string; // virtual 필드 타입 추가
};
```

### 3. Base Schema 클래스 생성 (DRY 원칙)

```typescript
// src/common/schemas/base.schema.ts
import { Prop } from '@nestjs/mongoose';
import { Types } from 'mongoose';

export abstract class BaseSchema {
  @Prop({ type: Types.ObjectId, auto: true })
  _id: Types.ObjectId;

  // Virtual field
  id: string;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

// 사용
export class Occasion extends BaseSchema {
  @Prop({ required: true })
  name: string;
  // ...
}
```

### 4. 모든 스키마에 일관된 옵션 적용

공통 스키마 옵션 헬퍼 생성:

```typescript
// src/common/schemas/schema-options.ts
export const baseSchemaOptions = {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: (_doc: any, ret: any) => {
      ret.id = ret._id.toString();
      delete ret._id;
      delete ret.__v;
      return ret;
    },
  },
  toObject: {
    virtuals: true,
    transform: (_doc: any, ret: any) => {
      ret.id = ret._id.toString();
      delete ret._id;
      delete ret.__v;
      return ret;
    },
  },
};

// 사용
@Schema({
  collection: 'occasions',
  ...baseSchemaOptions,
})
export class Occasion {
  // ...
}
```

### 5. ID 변환 유틸리티 함수

```typescript
// src/common/utils/id.utils.ts
import { Types } from 'mongoose';

export class IdUtils {
  /**
   * MongoDB ObjectId를 string으로 변환
   */
  static toString(id: Types.ObjectId | string): string {
    return id instanceof Types.ObjectId ? id.toHexString() : id;
  }

  /**
   * string을 MongoDB ObjectId로 변환
   */
  static toObjectId(id: string): Types.ObjectId {
    return new Types.ObjectId(id);
  }

  /**
   * 유효한 ObjectId인지 검증
   */
  static isValidObjectId(id: string): boolean {
    return Types.ObjectId.isValid(id);
  }
}
```

## 작업 순서

1. ✅ `src/common/schemas/schema-options.ts` 생성
2. ✅ `src/common/schemas/base.schema.ts` 생성 (선택사항)
3. ✅ `src/common/utils/id.utils.ts` 생성
4. ✅ 모든 스키마 파일에 baseSchemaOptions 적용:
   - `src/occasions/schemas/occasion.schema.ts`
   - `src/users/schemas/user.schema.ts`
   - 기타 스키마들
5. ✅ 각 스키마의 타입 정의에 `id: string` 추가
6. ✅ 서비스 코드에서 `_id` 대신 `id` 사용으로 점진적 마이그레이션
7. ✅ 테스트 작성 및 검증

## 마이그레이션 예시

### Before:
```typescript
async findOne(userId: string, id: string) {
  return this.occasionModel.findOne({
    _id: new Types.ObjectId(id),
    userId: new Types.ObjectId(userId),
  });
}
```

### After:
```typescript
async findOne(userId: string, id: string) {
  return this.occasionModel.findOne({
    _id: IdUtils.toObjectId(id),
    userId: IdUtils.toObjectId(userId),
  });
}

// 또는 document에서 id 직접 사용
const occasion = await this.findOne(userId, id);
console.log(occasion.id); // ✅ 이제 가능!
```

## 검증 방법

1. **컴파일 체크**: `npm run build`
2. **런타임 테스트**:
   ```typescript
   const occasion = await occasionService.findOne(userId, id);
   console.log(occasion.id); // string이어야 함
   console.log(occasion._id); // 여전히 접근 가능 (하위 호환성)
   ```
3. **API 응답 확인**:
   ```bash
   curl http://localhost:25010/occasions | jq
   # id 필드가 있고 _id가 없어야 함
   ```

## 주의사항

- `_id`는 여전히 데이터베이스 쿼리에서 사용 가능 (하위 호환성)
- `id`는 virtual 필드이므로 쿼리 조건으로 사용 불가:
  ```typescript
  // ❌ 작동 안 함
  model.find({ id: 'xxx' });

  // ✅ 올바른 방법
  model.find({ _id: IdUtils.toObjectId('xxx') });
  ```
- Mongoose populate에서는 여전히 `_id` 사용 필요

## 추가 개선사항 (선택)

### GraphQL을 사용한다면:
```typescript
@ObjectType()
export class OccasionType {
  @Field(() => ID)
  id: string; // _id를 자동으로 id로 매핑

  @Field()
  name: string;
}
```

### Class Validator 통합:
```typescript
import { IsMongoId } from 'class-validator';

export class DeleteOccasionDto {
  @IsMongoId()
  id: string;
}
```

## 참고 자료

- [Mongoose Virtuals](https://mongoosejs.com/docs/tutorials/virtuals.html)
- [NestJS Custom Providers](https://docs.nestjs.com/fundamentals/custom-providers)
- [MongoDB ObjectId Best Practices](https://www.mongodb.com/docs/manual/reference/method/ObjectId/)
