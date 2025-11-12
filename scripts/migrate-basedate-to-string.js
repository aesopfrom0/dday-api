/**
 * Occasion baseDate 마이그레이션 스크립트
 *
 * Date 타입 -> String 타입 ("YYYY-MM-DD" 형식)
 *
 * 실행 방법:
 * node scripts/migrate-basedate-to-string.js
 */

const { MongoClient } = require('mongodb');

// MongoDB 연결 URI (환경에 맞게 수정)
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dday';

async function migrate() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('✅ MongoDB 연결 성공');

    const db = client.db();
    const occasions = db.collection('occasions');

    // 기존 데이터 조회
    const count = await occasions.countDocuments();
    console.log(`📊 총 ${count}개의 occasions 문서 발견`);

    if (count === 0) {
      console.log('ℹ️  마이그레이션할 데이터가 없습니다');
      return;
    }

    // Date 타입인 baseDate를 가진 문서 조회
    const cursor = occasions.find({ baseDate: { $type: 'date' } });
    let migratedCount = 0;
    let errorCount = 0;

    console.log('\n🔄 마이그레이션 시작...\n');

    for await (const doc of cursor) {
      try {
        const baseDate = doc.baseDate;

        // UTC 시간을 로컬 시간으로 변환 후 날짜만 추출
        const year = baseDate.getUTCFullYear();
        const month = String(baseDate.getUTCMonth() + 1).padStart(2, '0');
        const day = String(baseDate.getUTCDate()).padStart(2, '0');
        const baseDateString = `${year}-${month}-${day}`;

        // 업데이트
        await occasions.updateOne({ _id: doc._id }, { $set: { baseDate: baseDateString } });

        migratedCount++;
        console.log(`✓ ${doc._id}: ${baseDate.toISOString()} → ${baseDateString}`);
      } catch (error) {
        errorCount++;
        console.error(`✗ ${doc._id}: 마이그레이션 실패 -`, error.message);
      }
    }

    console.log('\n📈 마이그레이션 완료');
    console.log(`  - 성공: ${migratedCount}개`);
    console.log(`  - 실패: ${errorCount}개`);
    console.log(`  - 전체: ${count}개`);

    // 검증
    const stringCount = await occasions.countDocuments({ baseDate: { $type: 'string' } });
    const dateCount = await occasions.countDocuments({ baseDate: { $type: 'date' } });

    console.log('\n🔍 검증 결과:');
    console.log(`  - String 타입: ${stringCount}개`);
    console.log(`  - Date 타입: ${dateCount}개`);

    if (dateCount > 0) {
      console.warn(`\n⚠️  ${dateCount}개의 Date 타입 문서가 남아있습니다`);
    } else {
      console.log('\n✅ 모든 문서가 String 타입으로 변환되었습니다');
    }
  } catch (error) {
    console.error('❌ 마이그레이션 실패:', error);
    throw error;
  } finally {
    await client.close();
    console.log('\n🔌 MongoDB 연결 종료');
  }
}

// 스크립트 실행
if (require.main === module) {
  migrate()
    .then(() => {
      console.log('\n✨ 마이그레이션 스크립트 완료');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 마이그레이션 스크립트 실패:', error);
      process.exit(1);
    });
}

module.exports = { migrate };
