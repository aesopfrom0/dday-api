# 코딩 패턴

## TypeScript 타입 추론 활용

### 제너릭 타입보다 타입 추론 우선

❌ **나쁜 예:**
```typescript
const accessTokenExpiration = this.configService.get<string>('jwt.accessTokenExpiration') || '3h';

// 타입이 string으로 고정되어 StringValue 템플릿 리터럴 타입과 호환 불가
```

✅ **좋은 예:**
```typescript
const accessTokenExpiration = this.configService.get('jwt.accessTokenExpiration') || '3h';

// TypeScript가 타입을 추론하여 '3h' 리터럴 타입으로 좁혀짐
// StringValue 템플릿 리터럴 타입과 호환됨
```

**이유**:
- 제너릭으로 `<string>`을 명시하면 일반 `string` 타입이 됨
- `ms` 패키지의 `StringValue`는 템플릿 리터럴 타입 (`${number}${UnitAnyCase}`)
- 일반 `string`과 템플릿 리터럴 타입은 호환되지 않음
- 타입 추론에 맡기면 리터럴 값(`'3h'`)으로 좁혀져 자동으로 호환됨

**적용 사례**:
- JWT 토큰 만료 시간 설정
- 환경변수에서 가져온 시간 관련 설정값

---

## NestJS DTO 응답 관리

### 스키마 변경 시 체크리스트

백엔드 스키마에 필드를 추가할 때는 반드시 다음 파일들을 함께 수정해야 합니다:

1. **Schema 파일** - MongoDB 스키마 정의
   ```typescript
   @Prop()
   isPinned: boolean;

   @Prop()
   pinnedAt?: Date;
   ```

2. **Response DTO** - 클라이언트 응답 타입
   ```typescript
   @Expose()
   isPinned: boolean;

   @Expose()
   pinnedAt?: Date;
   ```
   ⚠️ `@Expose()` 데코레이터 필수! 없으면 응답에 포함되지 않음

3. **Update/Create DTO** - 입력 검증 타입 (필요시)

4. **Controller** - `toResponseDto` 메서드 확인
   - `plainToInstance`가 올바르게 동작하는지 확인
   - `excludeExtraneousValues: true` 옵션 사용 시 `@Expose()` 필수

**체크 포인트**:
- [ ] Schema에 필드 추가
- [ ] Response DTO에 `@Expose()` 와 함께 필드 추가
- [ ] Update/Create DTO 확인
- [ ] Controller의 변환 로직 확인
- [ ] 기존 API 응답 테스트

---

## NestJS ConfigService 환경변수 관리

### Configuration 파일 구조

**1. 환경변수 정의** (`.env.dev`, `.env.prod`)
```env
JWT_SECRET=xxx
JWT_ACCESS_TOKEN_EXPIRATION=3h
JWT_REFRESH_TOKEN_EXPIRATION=60d
```

**2. Configuration 파일** (`src/config/configuration.ts`)
```typescript
export default () => ({
  jwt: {
    secret: process.env.JWT_SECRET,
    accessTokenExpiration: process.env.JWT_ACCESS_TOKEN_EXPIRATION || '3h',
    refreshTokenExpiration: process.env.JWT_REFRESH_TOKEN_EXPIRATION || '60d',
  },
});
```

**3. Validation Schema** (`src/config/validate-schema.ts`)
```typescript
export function validateSchema() {
  return Joi.object({
    JWT_SECRET: Joi.string().required(),
    JWT_ACCESS_TOKEN_EXPIRATION: Joi.string(),
    JWT_REFRESH_TOKEN_EXPIRATION: Joi.string(),
  });
}
```

**4. 사용** (Service)
```typescript
// 타입 추론을 위해 제너릭 타입 제거
const expiration = this.configService.get('jwt.accessTokenExpiration') || '3h';
```

### 환경별 설정 차이

| 환경 | Access Token | Refresh Token | 이유 |
|------|--------------|---------------|------|
| dev/local | 3h | 60d | 개발 편의성 |
| prod | 1h | 30d | 보안 강화 |

**원칙**:
- 하드코딩 금지, 모든 설정값은 환경변수로 관리
- 기본값은 `configuration.ts`에서 설정
- 보안에 민감한 값은 validation schema에서 `required()` 설정
