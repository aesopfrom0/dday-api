# 🔔 푸시 알림 시스템 설정 가이드

## 📋 개요

D-Day API의 푸시 알림 시스템은 Firebase Cloud Messaging (FCM)을 사용하여 사용자에게 기념일 알림을 전송합니다.

**알림 정책:**
- 3일 전: 오후 8시 (사용자 로컬 타임존)
- 1일 전: 오후 8시 (사용자 로컬 타임존)
- 당일: 오전 9시 (사용자 로컬 타임존)

**크론 스케줄:**
- 매시간 37분에 실행 (UTC)
- 인프라 경쟁 최소화를 위한 비정형 시각 선택

---

## 🔧 Firebase 설정

### 1. Firebase 프로젝트 생성

1. [Firebase Console](https://console.firebase.google.com/) 접속
2. "프로젝트 추가" 클릭
3. 프로젝트 이름: `graba-dday` (또는 원하는 이름)
4. Google Analytics 설정 (선택 사항)

### 2. 서비스 계정 키 생성

1. Firebase Console → 프로젝트 설정 (⚙️)
2. "서비스 계정" 탭 선택
3. "새 비공개 키 생성" 클릭
4. JSON 파일 다운로드 (절대 Git에 커밋하지 말 것!)

### 3. 환경변수 설정

다운로드한 JSON 파일에서 다음 값을 추출:

```json
{
  "project_id": "graba-dday",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xxxxx@graba-dday.iam.gserviceaccount.com"
}
```

**.env.local, .env.dev, .env.prod에 추가:**

```bash
FIREBASE_PROJECT_ID=graba-dday
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@graba-dday.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgk...\n-----END PRIVATE KEY-----\n"
```

**⚠️ 주의사항:**
- Private Key는 반드시 큰따옴표로 감싸기
- `\n`은 실제 줄바꿈이 아닌 문자열 `\n`으로 유지
- 환경변수 파일은 `.gitignore`에 포함되어 있는지 확인

---

## 🗄️ 데이터베이스 마이그레이션

기존 사용자에게 `timezone`, `fcmTokens` 필드를 추가해야 합니다.

### 로컬 환경

```bash
env-cmd -f .env.local node migrations/251205-add-timezone-and-fcm.js
```

### Dev 환경

```bash
env-cmd -f .env.dev node migrations/251205-add-timezone-and-fcm.js
```

### Prod 환경

```bash
# ⚠️ 프로덕션은 신중하게!
env-cmd -f .env.prod node migrations/251205-add-timezone-and-fcm.js
```

**마이그레이션 내용:**
- `timezone`: 'Asia/Seoul' (기본값)
- `fcmTokens`: [] (빈 배열)

---

## 🚀 배포

### Dev 환경 배포

```bash
# 빌드 + 배포 (app + notificationCron 함수 모두 배포)
yarn deploy:dev
```

**배포 후 확인사항:**

1. Lambda 함수 확인
```bash
# AWS 콘솔에서 확인
# - dday-api-dev-app
# - dday-api-dev-notificationCron
```

2. EventBridge 규칙 확인
```bash
# AWS 콘솔 → EventBridge → 규칙
# cron(37 * * * ? *) 규칙이 생성되었는지 확인
```

### Prod 환경 배포

```bash
yarn deploy:prod
```

---

## 🧪 테스트

### 1. 로컬 테스트

**FCM 토큰 등록:**
```bash
curl -X POST http://localhost:25010/users/fcm-token \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"token": "test-fcm-token-from-flutter-app"}'
```

**타임존 업데이트:**
```bash
curl -X PATCH http://localhost:25010/users/timezone \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"timezone": "Asia/Seoul"}'
```

**기념일 생성 (알림 큐 자동 생성):**
```bash
curl -X POST http://localhost:25010/occasions \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "테스트 기념일",
    "baseDate": "2025-12-25",
    "calendarType": "solar",
    "category": "birthday",
    "isNotificationEnabled": true
  }'
```

**크론 함수 로컬 실행:**
```bash
# 빌드 필요
yarn build

# 크론 핸들러 직접 실행
yarn cron:test:local
```

### 2. Dev 환경 테스트

**크론 수동 트리거:**
```bash
yarn cron:invoke:dev
```

**크론 로그 확인 (실시간):**
```bash
yarn cron:logs:dev:tail
```

**HTTP API 로그 확인:**
```bash
yarn logs:dev:tail
```

### 3. MongoDB 확인

**알림 큐 조회:**
```javascript
db.notification_queues.find({
  status: 'pending'
}).sort({ scheduledFor: 1 })
```

**사용자 FCM 토큰 확인:**
```javascript
db.users.find({
  fcmTokens: { $ne: [] }
})
```

---

## 📊 알림 큐 구조

```javascript
{
  _id: ObjectId("..."),
  userId: ObjectId("..."),
  occasionId: ObjectId("..."),
  scheduledFor: ISODate("2025-12-22T11:00:00Z"), // UTC 시간
  type: "3_days", // "3_days" | "1_day" | "d_day"
  status: "pending", // "pending" | "sent" | "failed"
  occasionName: "생일",
  occasionDate: "2025-12-25",
  retryCount: 0,
  createdAt: ISODate("2025-12-05T10:00:00Z"),
  updatedAt: ISODate("2025-12-05T10:00:00Z")
}
```

---

## 🔍 트러블슈팅

### 알림이 발송되지 않음

1. **Firebase 설정 확인**
```bash
# 로그 확인
yarn logs:dev:tail

# "Firebase Admin initialized" 메시지가 보이는지 확인
```

2. **FCM 토큰 확인**
```javascript
// MongoDB에서 확인
db.users.findOne({ email: "test@example.com" })
// fcmTokens 배열에 토큰이 있는지 확인
```

3. **알림 큐 확인**
```javascript
// pending 상태의 알림이 있는지 확인
db.notification_queues.find({
  status: 'pending',
  scheduledFor: { $lt: new Date() }
})
```

4. **크론 실행 로그 확인**
```bash
yarn cron:logs:dev:tail
```

### 타임존 이슈

**문제:** 알림이 잘못된 시간에 발송됨

**해결:**
1. 사용자 타임존 확인
```javascript
db.users.findOne({ _id: ObjectId("...") }, { timezone: 1 })
```

2. 알림 큐의 scheduledFor 확인 (UTC여야 함)
```javascript
db.notification_queues.findOne({ _id: ObjectId("...") })
```

### Invalid Token 에러

**문제:** FCM 토큰이 유효하지 않음

**자동 처리:**
- NotificationScheduler가 자동으로 invalid 토큰을 감지하고 제거합니다.
- `messaging/invalid-registration-token` 또는 `messaging/registration-token-not-registered` 에러 발생 시 자동 정리

---

## 📚 API 엔드포인트

### FCM 토큰 관리

**등록:**
```
POST /users/fcm-token
Authorization: Bearer <JWT>
Content-Type: application/json

{
  "token": "fcm-token-from-client"
}
```

**제거:**
```
DELETE /users/fcm-token
Authorization: Bearer <JWT>
Content-Type: application/json

{
  "token": "fcm-token-to-remove"
}
```

**타임존 업데이트:**
```
PATCH /users/timezone
Authorization: Bearer <JWT>
Content-Type: application/json

{
  "timezone": "Asia/Seoul"
}
```

---

## 🛠️ 유용한 명령어

```bash
# 크론 수동 실행
yarn cron:invoke:dev        # dev
yarn cron:invoke:prod       # prod

# 크론 로그 확인
yarn cron:logs:dev          # dev 최근 로그
yarn cron:logs:dev:tail     # dev 실시간 로그
yarn cron:logs:prod:tail    # prod 실시간 로그

# 앱 로그 확인
yarn logs:dev:tail          # dev 앱 로그
yarn logs:prod:tail         # prod 앱 로그

# 로컬 개발
yarn start:local            # 로컬 서버 실행
yarn build                  # 빌드
yarn cron:test:local        # 로컬 크론 테스트
```

---

## 🔐 보안 주의사항

1. **절대 커밋하지 말 것:**
   - Firebase 서비스 계정 JSON 파일
   - .env 파일 (이미 .gitignore에 포함)
   - Private Key

2. **환경별 분리:**
   - Dev와 Prod는 별도의 Firebase 프로젝트 사용 권장
   - 서비스 계정도 별도로 생성

3. **권한 관리:**
   - Firebase 서비스 계정은 최소 권한 원칙 적용
   - Cloud Messaging 권한만 부여

---

## 📞 문의

문제가 발생하면 다음을 확인하세요:
1. CloudWatch Logs (Lambda 함수 로그)
2. MongoDB notification_queues 컬렉션
3. Firebase Console → Cloud Messaging → 사용 현황

더 자세한 내용은 프로젝트 담당자에게 문의하세요.
