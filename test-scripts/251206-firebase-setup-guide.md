# Firebase Console 설정 확인 가이드

TestFlight dev 환경에서 푸시 알림이 오지 않는 가장 흔한 원인은 **Firebase에 APNs Production 인증서가 등록되지 않았기 때문**입니다.

## 🔍 왜 이런 일이 발생하나요?

- **TestFlight는 Production 환경**입니다 (Xcode 시뮬레이터나 직접 빌드는 Development)
- Development APNs 인증서만 등록되어 있으면 TestFlight에서는 알림을 받을 수 없습니다
- 앱스토어에 배포된 앱도 Production 인증서가 필요합니다

## ✅ 1단계: Firebase Console 접속

1. [Firebase Console](https://console.firebase.google.com/) 접속
2. **graba-dday** 프로젝트 선택
3. 좌측 메뉴에서 **프로젝트 설정** (톱니바퀴 아이콘) 클릭

## ✅ 2단계: iOS 앱 등록 확인

### 2.1 앱이 등록되어 있는지 확인
1. **프로젝트 설정** → **일반** 탭
2. **내 앱** 섹션에서 iOS 앱 찾기
3. Bundle ID 확인: 환경변수의 `APPLE_CLIENT_ID`와 일치해야 함

### 2.2 Bundle ID 확인
```bash
# .env.dev 파일에서 확인
grep APPLE_CLIENT_ID .env.dev
```

예상 결과:
```
APPLE_CLIENT_ID=com.graba.dday
```

### 2.3 iOS 앱이 없는 경우
1. **앱 추가** 클릭
2. **iOS** 선택
3. Bundle ID 입력: `com.graba.dday` (또는 `.env.dev`의 값)
4. 앱 닉네임: `dday-dev` 또는 원하는 이름
5. **앱 등록** 클릭

## ✅ 3단계: APNs 인증서 설정 확인 (가장 중요!)

### 3.1 Cloud Messaging 설정 이동
1. **프로젝트 설정** → **Cloud Messaging** 탭
2. **Apple 앱 구성** 섹션으로 스크롤

### 3.2 APNs 인증 키 또는 인증서 확인

#### 옵션 1: APNs 인증 키 (권장 ⭐)
- **장점**: 한 번만 생성하면 Development와 Production 모두 사용 가능
- **파일 형식**: `.p8` (APNs Auth Key)

**확인 사항**:
- [ ] **APNs 인증 키**가 업로드되어 있는지
- [ ] **키 ID** 표시 여부
- [ ] **팀 ID** 표시 여부

**없는 경우 생성 방법**:
1. [Apple Developer](https://developer.apple.com/account/resources/authkeys/list) 접속
2. **Keys** → **+** 버튼 클릭
3. **Apple Push Notifications service (APNs)** 체크
4. Continue → Register → Download
5. 다운로드한 `.p8` 파일을 Firebase Console에 업로드
6. **키 ID**와 **팀 ID** 입력

#### 옵션 2: APNs 인증서 (레거시)
- **파일 형식**: `.p12` (Certificate)
- **종류**: Development / Production 별도 필요

**확인 사항**:
- [ ] **APNs Development 인증서**가 업로드되어 있는지
- [ ] **APNs Production 인증서**가 업로드되어 있는지 (TestFlight 필수!)

**Production 인증서가 없는 경우**:
1. [Apple Developer](https://developer.apple.com/account/resources/certificates/list) 접속
2. **Certificates** → **+** 버튼 클릭
3. **Apple Push Notification service SSL (Sandbox & Production)** 선택
4. App ID 선택: `com.graba.dday`
5. CSR 파일 업로드 (키체인 접근에서 생성)
6. 다운로드 후 `.cer` 파일을 더블클릭하여 키체인에 설치
7. 키체인에서 인증서 우클릭 → **내보내기** → `.p12` 형식으로 저장
8. Firebase Console에 `.p12` 파일 업로드

### 3.3 상태 확인

#### ✅ 정상 (APNs 인증 키 사용)
```
APNs 인증 키: AuthKey_XXXXXXXXXX.p8
키 ID: XXXXXXXXXX
팀 ID: YYYYYYYYYY
```

#### ✅ 정상 (APNs 인증서 사용)
```
APNs Development 인증서: aps_development.cer (만료일: 2026-12-01)
APNs Production 인증서: aps_production.cer (만료일: 2026-12-01)
```

#### ❌ 문제 (TestFlight에서 알림 안됨)
```
APNs Development 인증서: aps_development.cer (만료일: 2026-12-01)
APNs Production 인증서: (없음)  <-- 이 때문에 TestFlight에서 알림이 안옵니다!
```

## ✅ 4단계: 환경변수 확인

### 4.1 Firebase Admin SDK 인증 정보 확인
```bash
# .env.dev 파일 확인
cat .env.dev | grep FIREBASE
```

예상 결과:
```bash
FIREBASE_PROJECT_ID=graba-dday
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@graba-dday.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

### 4.2 서비스 계정 키 확인 (필요시)
1. **프로젝트 설정** → **서비스 계정** 탭
2. **Firebase Admin SDK** 섹션
3. **새 비공개 키 생성** 클릭 (필요한 경우)
4. 다운로드한 JSON 파일에서:
   - `project_id` → `FIREBASE_PROJECT_ID`
   - `client_email` → `FIREBASE_CLIENT_EMAIL`
   - `private_key` → `FIREBASE_PRIVATE_KEY` (개행문자를 `\n`으로 변환)

### 4.3 Lambda에 배포 확인
```bash
# Dev 환경에 배포
yarn deploy:dev

# 배포 후 로그 확인
yarn logs:dev:tail
```

**확인할 로그**:
```
✅ Firebase Admin initialized
```

❌ 이 로그가 보이면 안됨:
```
⚠️  Firebase credentials not found - push notifications will not work
```

## ✅ 5단계: 테스트

### 5.1 테스트 알림 발송
```bash
# JWT 토큰과 기념일 ID를 환경변수로 설정
export API_URL="https://qwul1zxd01.execute-api.ap-northeast-2.amazonaws.com"
export JWT_TOKEN="eyJhbGc..."
export OCCASION_ID="674d..."

# 테스트 스크립트 실행
node test-scripts/251206-test-push-notification.js
```

### 5.2 예상 결과

#### ✅ 성공
```
✅ 테스트 알림 발송 성공!

📋 결과:
   - 성공: 1개 디바이스
   - 실패: 0개 디바이스

🔍 진단:
   ✅ FCM 토큰이 유효하고 Firebase 연결이 정상입니다.
   ✅ 푸시 알림이 디바이스로 전송되었습니다.
```

#### ❌ 실패 (APNs 인증서 문제)
```
✅ 테스트 알림 발송 성공!

📋 결과:
   - 성공: 0개 디바이스
   - 실패: 1개 디바이스

📱 디바이스별 상세 결과:
   [1] ❌ 실패
       에러: messaging/invalid-registration-token

🔍 진단:
   ❌ 알림 발송에 실패했습니다.

   💡 가능한 원인:
      1. Firebase에 APNs Production 인증서가 등록되지 않음  <-- 가장 가능성 높음!
      2. FCM 토큰이 만료되었거나 유효하지 않음
      3. 앱이 삭제되었거나 재설치됨
```

## 🔧 문제 해결 체크리스트

### TestFlight에서 알림이 안 오는 경우

- [ ] **Firebase Console → Cloud Messaging → APNs Production 인증서 등록 확인**
  - APNs 인증 키 (`.p8`) 또는 APNs Production 인증서 (`.p12`) 필수
  - Development 인증서만으로는 TestFlight에서 알림 수신 불가

- [ ] **환경변수 확인**
  - `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` 설정
  - Lambda 배포 후 "✅ Firebase Admin initialized" 로그 확인

- [ ] **Bundle ID 일치 확인**
  - Firebase iOS 앱 Bundle ID = `.env.dev`의 `APPLE_CLIENT_ID`
  - Xcode 프로젝트의 Bundle Identifier와 일치

- [ ] **앱 Push Notification Capability 활성화**
  - Xcode → Target → Signing & Capabilities → **Push Notifications** 추가
  - Background Modes → **Remote notifications** 체크

- [ ] **디바이스 상태 확인**
  - iOS 설정 → [앱] → 알림 → 허용
  - 앱이 백그라운드 상태 (포그라운드에서는 silent notification 표시 안됨)

## 📚 참고 자료

- [Firebase Cloud Messaging - iOS 설정](https://firebase.google.com/docs/cloud-messaging/ios/client)
- [APNs 인증 키 생성](https://developer.apple.com/documentation/usernotifications/setting_up_a_remote_notification_server/establishing_a_token-based_connection_to_apns)
- [APNs 인증서 생성](https://developer.apple.com/documentation/usernotifications/setting_up_a_remote_notification_server/establishing_a_certificate-based_connection_to_apns)

## 🚨 주의사항

### Development vs Production 환경

| 환경 | APNs 인증서 | 용도 |
|------|------------|------|
| **Development** | Development Certificate | Xcode 직접 빌드, 시뮬레이터 |
| **Production** | Production Certificate | **TestFlight**, App Store |

**중요**: TestFlight는 Production 환경이므로 **반드시 Production 인증서 필요**!

### APNs 인증 키 vs 인증서

| 방식 | 장점 | 단점 |
|------|------|------|
| **APNs 인증 키** (`.p8`) | • Dev/Prod 구분 없이 사용<br>• 만료 없음<br>• 관리 간편 | • Apple Developer 유료 계정 필요 |
| **APNs 인증서** (`.p12`) | • 무료 계정도 사용 가능 | • Dev/Prod 별도 생성<br>• 1년마다 갱신 필요<br>• 관리 복잡 |

**권장**: 가능하면 **APNs 인증 키** 사용

## 💡 추가 팁

### 1. Firebase 프로젝트 분리 (권장)
현재 dev/prod 환경이 같은 Firebase 프로젝트를 사용하고 있습니다. 별도 프로젝트 사용을 권장합니다:

- `graba-dday-dev` (개발용)
- `graba-dday-prod` (프로덕션용)

### 2. 로그 모니터링
```bash
# 크론 로그 (알림 발송 로그)
yarn cron:logs:dev:tail

# API 로그 (테스트 알림 로그)
yarn logs:dev:tail
```

### 3. 크론 수동 실행 (테스트용)
```bash
# 크론을 기다리지 않고 즉시 실행
yarn cron:invoke:dev
```
