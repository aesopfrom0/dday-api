# MongoDB 데이터 진단 가이드

TestFlight dev 환경에서 푸시 알림이 오지 않는 문제를 진단하기 위한 MongoDB 쿼리 모음

## 1. 사용자 FCM 토큰 확인

### 1.1 특정 사용자 조회 (이메일로)
```javascript
db.users.findOne(
  { email: "테스트계정@email.com" },
  {
    email: 1,
    fcmTokens: 1,
    timezone: 1,
    createdAt: 1
  }
)
```

**확인 사항**:
- ✅ `fcmTokens` 배열에 1개 이상의 토큰이 있어야 함
- ✅ `timezone`이 올바른 IANA 형식 (예: "Asia/Seoul")
- ❌ `fcmTokens`가 빈 배열 `[]`이면 앱에서 토큰 등록 안됨

### 1.2 특정 사용자 조회 (ID로)
```javascript
db.users.findOne(
  { _id: ObjectId("USER_ID_HERE") },
  {
    email: 1,
    fcmTokens: 1,
    timezone: 1
  }
)
```

### 1.3 FCM 토큰이 등록된 모든 사용자 조회
```javascript
db.users.find(
  { fcmTokens: { $ne: [] } },
  {
    email: 1,
    fcmTokens: 1
  }
).limit(10)
```

### 1.4 FCM 토큰이 없는 사용자 조회
```javascript
db.users.find(
  {
    $or: [
      { fcmTokens: { $exists: false } },
      { fcmTokens: [] }
    ]
  },
  {
    email: 1,
    createdAt: 1
  }
).limit(10)
```

## 2. 알림 큐(Notification Queue) 확인

### 2.1 특정 사용자의 알림 큐 조회
```javascript
db.notification_queues.find({
  userId: ObjectId("USER_ID_HERE")
}).sort({ scheduledFor: 1 })
```

**확인 사항**:
- ✅ `status: 'pending'` - 아직 발송되지 않음
- ✅ `scheduledFor` - UTC 시간으로 저장됨 (한국 시간 - 9시간)
- ✅ `type` - "3_days", "1_day", "d_day" 중 하나
- ❌ 결과가 없으면 알림 큐가 생성되지 않음

### 2.2 Pending 상태의 알림 큐 (발송 예정)
```javascript
db.notification_queues.find({
  status: 'pending'
}).sort({ scheduledFor: 1 }).limit(20)
```

### 2.3 발송 실패한 알림 큐
```javascript
db.notification_queues.find({
  status: 'failed'
}).sort({ scheduledFor: -1 }).limit(10)
```

**확인 사항**:
- `failedReason` 필드에서 실패 원인 확인
- "No FCM tokens" → 사용자의 FCM 토큰이 없음

### 2.4 발송 완료된 알림 큐
```javascript
db.notification_queues.find({
  status: 'sent',
  sentAt: { $exists: true }
}).sort({ sentAt: -1 }).limit(10)
```

### 2.5 특정 기간 내 발송 예정 알림 조회
```javascript
// 현재 시각 기준 다음 2시간 이내
const now = new Date();
const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000);

db.notification_queues.find({
  scheduledFor: {
    $gte: now,
    $lt: twoHoursLater
  },
  status: 'pending'
}).sort({ scheduledFor: 1 })
```

### 2.6 재시도 횟수가 많은 알림 (발송 실패 반복)
```javascript
db.notification_queues.find({
  retryCount: { $gte: 1 }
}).sort({ retryCount: -1, scheduledFor: -1 }).limit(10)
```

## 3. 기념일(Occasion) 확인

### 3.1 특정 사용자의 기념일 조회
```javascript
db.occasions.find({
  userId: ObjectId("USER_ID_HERE")
}).sort({ date: 1 })
```

**확인 사항**:
- ✅ `isNotificationEnabled: true` - 알림이 활성화되어야 함
- ❌ `isNotificationEnabled: false` - 알림 큐가 생성되지 않음

### 3.2 알림이 활성화된 기념일
```javascript
db.occasions.find({
  userId: ObjectId("USER_ID_HERE"),
  isNotificationEnabled: true
})
```

### 3.3 알림이 비활성화된 기념일
```javascript
db.occasions.find({
  userId: ObjectId("USER_ID_HERE"),
  isNotificationEnabled: false
})
```

### 3.4 특정 기념일 상세 조회
```javascript
db.occasions.findOne(
  { _id: ObjectId("OCCASION_ID_HERE") },
  {
    name: 1,
    date: 1,
    isNotificationEnabled: 1,
    userId: 1,
    createdAt: 1
  }
)
```

## 4. 종합 진단 쿼리

### 4.1 사용자의 알림 시스템 전체 상태 확인
```javascript
// 1단계: 사용자 정보
const user = db.users.findOne(
  { email: "테스트계정@email.com" }
);

print("=== 사용자 정보 ===");
print("Email:", user.email);
print("FCM Tokens:", user.fcmTokens?.length || 0);
print("Timezone:", user.timezone);
print();

// 2단계: 기념일 개수
const occasionCount = db.occasions.count({ userId: user._id });
const notificationEnabledCount = db.occasions.count({
  userId: user._id,
  isNotificationEnabled: true
});

print("=== 기념일 정보 ===");
print("총 기념일:", occasionCount);
print("알림 활성화:", notificationEnabledCount);
print();

// 3단계: 알림 큐 상태
const pendingCount = db.notification_queues.count({
  userId: user._id,
  status: 'pending'
});
const sentCount = db.notification_queues.count({
  userId: user._id,
  status: 'sent'
});
const failedCount = db.notification_queues.count({
  userId: user._id,
  status: 'failed'
});

print("=== 알림 큐 상태 ===");
print("대기 중:", pendingCount);
print("발송 완료:", sentCount);
print("발송 실패:", failedCount);
print();

// 4단계: 다음 발송 예정 알림
const nextNotifications = db.notification_queues.find({
  userId: user._id,
  status: 'pending'
}).sort({ scheduledFor: 1 }).limit(5).toArray();

print("=== 다음 발송 예정 ===");
nextNotifications.forEach((n, idx) => {
  print(`[${idx + 1}] ${n.type} - ${n.scheduledFor} (UTC)`);
});
```

### 4.2 시간대 변환 확인 (UTC ↔ 로컬)
```javascript
// UTC → 한국 시간 (KST = UTC+9)
const utcTime = new Date("2025-12-06T12:00:00Z");
const kstTime = new Date(utcTime.getTime() + 9 * 60 * 60 * 1000);
print("UTC:", utcTime.toISOString());
print("KST:", kstTime.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }));

// 한국 시간 → UTC
const kstString = "2025-12-06 21:00:00"; // 한국 시간 오후 9시
const utcFromKst = new Date(kstString + " GMT+0900");
print("KST Input:", kstString);
print("UTC Output:", utcFromKst.toISOString());
```

## 5. 문제별 진단 체크리스트

### ✅ 정상 상태
```
[ ] FCM 토큰 1개 이상
[ ] 알림 활성화된 기념일 1개 이상
[ ] Pending 상태 알림 큐 1개 이상
[ ] scheduledFor가 미래 시간 (UTC)
[ ] timezone이 올바른 IANA 형식
```

### ❌ FCM 토큰 없음
```javascript
// 사용자 확인
db.users.findOne({ email: "..." }, { fcmTokens: 1 })
// 결과: { fcmTokens: [] } 또는 { fcmTokens: null }

// 원인: 앱에서 POST /users/fcm-token 호출 안됨
// 해결: Flutter 앱 코드 확인 필요
```

### ❌ 알림 큐 없음
```javascript
// 기념일 확인
db.occasions.find({
  userId: ObjectId("..."),
  isNotificationEnabled: true
})
// 결과: 빈 배열

// 원인 1: isNotificationEnabled가 false
// 원인 2: 기념일 자체가 없음
// 해결: 기념일 생성 또는 알림 활성화
```

### ❌ 알림 큐가 있지만 발송 안됨
```javascript
// 알림 큐 확인
db.notification_queues.find({
  userId: ObjectId("..."),
  status: 'pending'
})
// scheduledFor가 과거 시간인데 status가 여전히 pending

// 원인: 크론이 실행되지 않았거나 Firebase 발송 실패
// 해결: CloudWatch Logs 확인, 크론 수동 실행
```

## 6. 유용한 집계 쿼리

### 6.1 사용자별 알림 큐 통계
```javascript
db.notification_queues.aggregate([
  {
    $group: {
      _id: "$userId",
      pending: {
        $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] }
      },
      sent: {
        $sum: { $cond: [{ $eq: ["$status", "sent"] }, 1, 0] }
      },
      failed: {
        $sum: { $cond: [{ $eq: ["$status", "failed"] }, 1, 0] }
      }
    }
  },
  { $sort: { pending: -1 } },
  { $limit: 10 }
])
```

### 6.2 알림 타입별 통계
```javascript
db.notification_queues.aggregate([
  {
    $group: {
      _id: "$type",
      count: { $sum: 1 },
      pending: {
        $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] }
      },
      sent: {
        $sum: { $cond: [{ $eq: ["$status", "sent"] }, 1, 0] }
      }
    }
  }
])
```

## 7. 데이터 정리 (주의!)

### ⚠️ 실패한 알림 큐 삭제 (테스트용만)
```javascript
// 주의: 프로덕션에서는 실행하지 말 것!
db.notification_queues.deleteMany({
  status: 'failed',
  userId: ObjectId("YOUR_TEST_USER_ID")
})
```

### ⚠️ 과거 알림 큐 삭제 (테스트용만)
```javascript
// 주의: 프로덕션에서는 실행하지 말 것!
const yesterday = new Date();
yesterday.setDate(yesterday.getDate() - 1);

db.notification_queues.deleteMany({
  scheduledFor: { $lt: yesterday },
  status: 'pending',
  userId: ObjectId("YOUR_TEST_USER_ID")
})
```
