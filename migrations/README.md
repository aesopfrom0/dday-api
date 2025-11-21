# Database Migrations

이 디렉토리는 MongoDB 스키마 변경을 위한 마이그레이션 스크립트를 관리합니다.

## 디렉토리 구조

```
migrations/
├── README.md
├── 20251119-rename-occasion-fields.js
└── 20251119-convert-userid-to-objectid.js
```

## 마이그레이션 실행 방법

### 1. 마이그레이션 적용 (up)

```bash
# 환경 변수 설정 (선택사항, 기본값: mongodb://localhost:27017/dday)
export MONGODB_URI=mongodb://localhost:27017/dday

# 특정 마이그레이션 실행
node migrations/20251119-rename-occasion-fields.js up
node migrations/20251119-convert-userid-to-objectid.js up
```

### 2. 마이그레이션 롤백 (down)

```bash
# 특정 마이그레이션 롤백
node migrations/20251119-convert-userid-to-objectid.js down
node migrations/20251119-rename-occasion-fields.js down
```

## 마이그레이션 목록

### 20251119-rename-occasion-fields.js
- **목적**: Occasion 스키마 필드명 변경
- **변경사항**:
  - `milestoneRules` → `suggestionRules`
  - `customMilestones` → `milestones`
- **영향**: occasions 컬렉션

### 20251119-convert-userid-to-objectid.js
- **목적**: userId 필드 타입 변경
- **변경사항**:
  - `userId` 타입: String → ObjectId
- **영향**: occasions 컬렉션

### 20251119-fill-user-settings.ts / 20251119-fill-user-settings-simple.js
- **목적**: 기존 사용자들의 빈 settings를 기본값으로 채우기
- **변경사항**:
  - settings가 비어있는 사용자에게 기본값 설정
  - `defaultMilestoneDisplayCount`: '2'
  - `language`: 'ko'
  - `theme`: 'system'
- **영향**: users 컬렉션
- **실행**:
  ```bash
  # TypeScript 버전 (느림, NestJS 사용)
  npx ts-node migrations/20251119-fill-user-settings.ts

  # JavaScript 버전 (빠름, 추천)
  node migrations/20251119-fill-user-settings-simple.js
  ```

## 새 마이그레이션 작성 가이드

### 1. 파일명 규칙
```
YYMMDD-{설명}.js
```
예: `251119-add-new-field.js`

### 2. 기본 템플릿

```javascript
#!/usr/bin/env node
/**
 * Migration: [마이그레이션 설명]
 * Date: YYYY-MM-DD
 *
 * Changes:
 * - 변경사항 1
 * - 변경사항 2
 *
 * Usage:
 *   node migrations/YYMMDD-migration-name.js up
 *   node migrations/YYMMDD-migration-name.js down
 */

const { MongoClient, ObjectId } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dday';

async function up(db) {
  console.log('🔄 Starting migration: [설명]');

  // 마이그레이션 로직

  console.log('✅ Migration completed successfully');
}

async function down(db) {
  console.log('🔄 Starting rollback: [설명]');

  // 롤백 로직

  console.log('✅ Rollback completed successfully');
}

async function main() {
  const command = process.argv[2];

  if (!['up', 'down'].includes(command)) {
    console.error('Usage: node migrations/YYMMDD-migration-name.js [up|down]');
    process.exit(1);
  }

  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('📦 Connected to MongoDB');

    const db = client.db();

    if (command === 'up') {
      await up(db);
    } else {
      await down(db);
    }
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('👋 Disconnected from MongoDB');
  }
}

main();
```

### 3. 작성 시 주의사항

- ✅ **멱등성 보장**: 같은 마이그레이션을 여러 번 실행해도 안전해야 함
- ✅ **롤백 가능**: down 함수는 up의 정확한 반대 동작을 수행
- ✅ **로깅**: 진행 상황을 명확히 로깅
- ✅ **에러 처리**: 실패 시 명확한 에러 메시지 제공
- ⚠️ **프로덕션 테스트**: 스테이징 환경에서 먼저 테스트
- ⚠️ **백업**: 중요한 데이터 변경 전 백업 권장

## 프로덕션 배포 시

1. **스테이징 환경에서 먼저 테스트**
   ```bash
   MONGODB_URI=mongodb://staging-host/dday node migrations/YYMMDD-xxx.js up
   ```

2. **백업 생성** (선택사항)
   ```bash
   mongodump --uri="mongodb://localhost:27017/dday" --out=backup-$(date +%Y%m%d)
   ```

3. **프로덕션 실행**
   ```bash
   MONGODB_URI=mongodb://prod-host/dday node migrations/YYMMDD-xxx.js up
   ```

4. **검증**
   - 데이터 조회 테스트
   - 애플리케이션 동작 확인

## 문제 발생 시

### 마이그레이션 실패 시
1. 에러 로그 확인
2. 필요시 롤백 실행: `node migrations/YYMMDD-xxx.js down`
3. 문제 수정 후 재시도

### 부분 성공 시
- 대부분의 마이그레이션은 멱등성을 보장하므로 재실행 가능
- 필요시 수동으로 데이터 확인 및 정리

## 참고사항

- 마이그레이션 스크립트는 git에 커밋되어 버전 관리됨
- 실행 순서는 파일명의 날짜 prefix로 결정
- 3개월 이상 지난 스크립트는 정기적으로 검토 및 정리
