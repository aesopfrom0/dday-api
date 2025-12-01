#!/usr/bin/env node
/**
 * Migration: Add solarBaseDate field for lunar occasions
 * Date: 2025-12-01
 *
 * 목적:
 * - 음력 Occasion에 대해 solarBaseDate 필드 추가
 * - 기존 음력 데이터의 baseDate를 양력으로 변환하여 저장
 * - 경과 일수 및 마일스톤 계산의 정확도 향상
 *
 * 작업:
 * 1. calendarType이 'lunar'인 모든 occasions 조회
 * 2. baseDate를 양력으로 변환
 * 3. solarBaseDate 필드에 변환된 값 저장
 *
 * 주의:
 * - korean-lunar-calendar 패키지 필요: yarn add korean-lunar-calendar
 * - 양력 occasions는 solarBaseDate를 null로 유지
 *
 * Usage:
 *   node migrations/20251201-add-solar-basedate-field.js up
 *   node migrations/20251201-add-solar-basedate-field.js down
 */

const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dday';

// korean-lunar-calendar 패키지 import
// yarn add korean-lunar-calendar
let LunarCalendar;
try {
  LunarCalendar = require('korean-lunar-calendar');
} catch (e) {
  console.error('❌ korean-lunar-calendar 패키지가 설치되지 않았습니다.');
  console.error('다음 명령어로 설치해주세요: yarn add korean-lunar-calendar');
  process.exit(1);
}

/**
 * 음력 날짜를 양력으로 변환
 * @param {string} lunarDateStr - 음력 날짜 문자열 "YYYY-MM-DD"
 * @returns {string|null} 양력 날짜 문자열 "YYYY-MM-DD" 또는 null (변환 실패 시)
 */
function convertLunarToSolar(lunarDateStr) {
  try {
    const [year, month, day] = lunarDateStr.split('-').map(Number);

    const lunar = new LunarCalendar();
    lunar.setLunarDate(year, month, day, false); // false = 평달 (윤달 아님)
    const solarDate = lunar.getSolarCalendar();

    const solarYear = solarDate.year;
    const solarMonth = String(solarDate.month).padStart(2, '0');
    const solarDay = String(solarDate.day).padStart(2, '0');

    return `${solarYear}-${solarMonth}-${solarDay}`;
  } catch (error) {
    console.error(`  ❌ Failed to convert ${lunarDateStr}:`, error.message);
    return null;
  }
}

async function up(db) {
  console.log('🔄 Starting migration: Add solarBaseDate field for lunar occasions');

  // 음력 occasions만 조회
  const lunarOccasions = await db.collection('occasions')
    .find({ calendarType: 'lunar' })
    .toArray();

  console.log(`📊 Found ${lunarOccasions.length} lunar occasions`);

  let updatedCount = 0;
  let failedCount = 0;

  for (const occasion of lunarOccasions) {
    // 이미 solarBaseDate가 있으면 스킵
    if (occasion.solarBaseDate) {
      console.log(`  ⏭️  Skipping ${occasion.name}: solarBaseDate already exists`);
      continue;
    }

    const solarBaseDate = convertLunarToSolar(occasion.baseDate);

    if (solarBaseDate) {
      await db.collection('occasions').updateOne(
        { _id: occasion._id },
        { $set: { solarBaseDate } }
      );
      console.log(`  ✅ ${occasion.name}: ${occasion.baseDate} (음력) → ${solarBaseDate} (양력)`);
      updatedCount++;
    } else {
      console.error(`  ❌ Failed to convert ${occasion.name} (${occasion.baseDate})`);
      failedCount++;
    }
  }

  console.log(`✅ Updated ${updatedCount} lunar occasions`);
  if (failedCount > 0) {
    console.log(`⚠️  Failed to convert ${failedCount} occasions`);
  }
  console.log('✅ Migration completed successfully');
}

async function down(db) {
  console.log('🔄 Starting rollback: Remove solarBaseDate field');

  const result = await db.collection('occasions').updateMany(
    {},
    { $unset: { solarBaseDate: "" } }
  );

  console.log(`✅ Removed solarBaseDate from ${result.modifiedCount} occasions`);
  console.log('✅ Rollback completed successfully');
}

async function main() {
  const command = process.argv[2];

  if (!['up', 'down'].includes(command)) {
    console.error('Usage: node migrations/20251201-add-solar-basedate-field.js [up|down]');
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
