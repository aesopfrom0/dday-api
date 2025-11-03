# D-Day API

GRABA D-Day 앱의 백엔드 API 서버

## 기술 스택

- **Node.js** 24.x LTS
- **NestJS** 11.x
- **MongoDB** 7.x (Mongoose ODM)
- **인증**: JWT + Passport (Google OAuth, Apple OAuth)

## 프로젝트 구조

```
src/
├── auth/              # 인증 모듈 (JWT, Google/Apple OAuth, Dev Login)
├── users/             # 사용자 관리
├── occasions/         # 기념일/이벤트 관리 (CRUD)
├── common/            # 공통 유틸리티
├── config/            # 환경 설정
└── provider/          # DB 연결 등
```

## 시작하기

### 1. 환경변수 설정

`.env.example` 파일을 복사하여 `.env.local` 파일을 생성하고 값을 입력합니다:

```bash
cp .env.example .env.local
```

필수 환경변수:
- `MONGODB_URI`: MongoDB 연결 URI
- `JWT_SECRET`: JWT 토큰 시크릿 키
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`: Google OAuth 인증 정보
- `APPLE_CLIENT_ID`, `APPLE_CLIENT_SECRET`: Apple OAuth 인증 정보

### 2. 패키지 설치

```bash
yarn install
```

### 3. 서버 실행

```bash
# 개발 모드 (로컬)
yarn start:local

# 개발 서버
yarn start:dev

# 프로덕션
yarn build
yarn start:prod
```

## API 엔드포인트

### 인증 (Auth)

- `GET /auth/google` - Google OAuth 로그인 시작
- `GET /auth/google/callback` - Google OAuth 콜백
- `POST /auth/apple` - Apple OAuth 로그인
- `POST /auth/dev-login` - 개발 전용 로그인 (NODE_ENV=development만)
- `POST /auth/refresh` - 토큰 갱신
- `GET /auth/me` - 내 정보 조회
- `DELETE /auth/logout` - 로그아웃

### 기념일 (Occasions)

- `GET /occasions` - 기념일 목록 조회
- `GET /occasions/:id` - 기념일 상세 조회
- `POST /occasions` - 기념일 생성
- `PATCH /occasions/:id` - 기념일 수정
- `DELETE /occasions/:id` - 기념일 삭제
- `POST /occasions/:id/milestones` - 커스텀 마일스톤 추가
- `DELETE /occasions/:id/milestones/:index` - 커스텀 마일스톤 삭제

### 사용자 설정 (Users)

- `GET /users/settings` - 설정 조회
- `PATCH /users/settings` - 설정 수정

## 개발 팁

### Dev Login (개발용 뒷구멍)

`NODE_ENV=development`일 때만 사용 가능한 빠른 로그인 기능:

```bash
POST /auth/dev-login
{
  "email": "test@example.com",
  "name": "Test User"
}
```

### 카테고리별 기본 설정

Occasion 생성 시 카테고리에 따라 자동으로 적용되는 기본 설정:
- `couple`, `marriage`, `baby`: 풀옵션 (모든 기념일 표시)
- `birthday`: 간결 (매년 생일만)
- `military`: 디데이 전용
- `quit_smoking`: 100일 단위 기념일
- `memorial`: 추모 (진행률 바 없음)
- `payday`: 월급날 전용

## 라이센스

UNLICENSED (Private Project)
