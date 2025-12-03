# 기술 스택 선호도 및 설정

## 인증 및 보안

### JWT 토큰 관리

**현재 방식**: Stateless JWT (DB 저장 없음)
- Access Token과 Refresh Token 모두 JWT로 발급
- Rolling Refresh Token 방식 (갱신 시 새 토큰 발급)
- 서버에서 토큰 저장/관리 없음

**장점**:
- 서버 부하 최소화
- 확장성 우수 (Stateless)
- 구현 간단

**단점 및 보안 고려사항**:
- ⚠️ 토큰 무효화 불가능 (로그아웃, 비밀번호 변경 등 즉시 반영 안 됨)
- ⚠️ 탈취된 토큰은 만료 시까지 계속 사용 가능
- ⚠️ 계정 정지, 권한 변경 등의 실시간 반영 불가

**프로덕션 개선 권장사항**:

#### 옵션 1: Redis + TTL (추천)
```typescript
// Refresh Token을 Redis에 저장
await redis.setex(
  `refresh_token:${userId}`,
  refreshTokenTTL,
  refreshToken
);

// 로그아웃 시 즉시 삭제
await redis.del(`refresh_token:${userId}`);
```
- 장점: 성능 영향 최소, 토큰 무효화 가능
- 단점: Redis 인프라 필요

#### 옵션 2: DB + Refresh Token 저장
```typescript
// refreshTokens 컬렉션에 저장
await this.refreshTokenModel.create({
  userId,
  token: refreshToken,
  expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
});
```
- 장점: 완전한 토큰 관리, 감사 로그 가능
- 단점: DB 부하 증가

#### 옵션 3: Token Family (Refresh Token Rotation)
- 현재 Rolling 방식 + 블랙리스트
- 재사용 감지 시 모든 토큰 무효화
- 중간 수준의 보안

### JWT 환경변수 설정

**파일**: `.env.dev`, `.env.prod`

```env
# JWT 설정
JWT_SECRET=<랜덤 시크릿>
JWT_ACCESS_TOKEN_EXPIRATION=3h  # dev: 3h, prod: 1h
JWT_REFRESH_TOKEN_EXPIRATION=60d  # dev: 60d, prod: 30d
```

**환경별 정책**:
- **개발/로컬**: 긴 만료시간으로 개발 편의성 확보
- **프로덕션**: 짧은 만료시간으로 보안 강화

**원칙**:
- 절대 하드코딩 금지
- 환경별로 다른 보안 정책 적용
- 민감한 시크릿은 환경변수로만 관리

---

## MongoDB Schema 설계

### 필드 추가 시 고려사항

**1. 기본값 설정**
```typescript
@Prop({ default: false })
isPinned: boolean;

@Prop({ default: null })
pinnedAt?: Date;
```

**2. 인덱스 고려**
```typescript
// 자주 조회/정렬되는 필드는 인덱스 추가
OccasionSchema.index({ isPinned: -1, pinnedAt: 1 });
```

**3. 응답 DTO 동기화**
- Schema와 Response DTO 필드 일치 필수
- `@Expose()` 데코레이터로 명시적 노출

---

## 패키지 관리

### 우선순위

1. **yarn** - 기본 패키지 매니저
2. npm - yarn 사용 불가 시에만

**이유**: 프로젝트 일관성 유지
