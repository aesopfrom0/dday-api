#!/usr/bin/env node
/**
 * Migration: Convert milestone targetDate from Date to String
 * Date: 2025-11-20
 *
 * 문제:
 * - 기존: targetDate가 Date 타입으로 저장 (UTC 기준)
 * - 한국 시간 "2026-04-23 00:00:00"이 UTC로 "2026-04-22 15:00:00"로 저장됨 (9시간 빠름)
 * - 새로운 스키마: targetDate를 "YYYY-MM-DD" 문자열로 저장 (시간대 무관)
 *
 * 해결:
 * - Date를 읽어서 9시간 더한 후 "YYYY-MM-DD" 문자열로 변환
 * - 예: "2026-04-22T15:00:00.000Z" -> "2026-04-23"
 *
 * Usage:
 *   node migrations/20251120-convert-milestone-targetdate-to-string.js up
 *   node migrations/20251120-convert-milestone-targetdate-to-string.js down
 */

const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dday';

/**
 * Date 객체를 한국 시간 기준 "YYYY-MM-DD" 문자열로 변환
 * @param {Date} date - UTC Date 객체
 * @returns {string} "YYYY-MM-DD" 형식 문자열
 */
function dateToKoreanDateString(date) {
  // UTC 시간에 9시간(한국 시간대) 더하기
  const kstDate = new Date(date.getTime() + 9 * 60 * 60 * 1000);

  const year = kstDate.getUTCFullYear();
  const month = String(kstDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(kstDate.getUTCDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

/**
 * "YYYY-MM-DD" 문자열을 UTC Date 객체로 변환 (한국 시간 기준에서 9시간 뺌)
 * @param {string} dateString - "YYYY-MM-DD" 형식 문자열
 * @returns {Date} UTC Date 객체
 */
function koreanDateStringToDate(dateString) {
  const [year, month, day] = dateString.split('-').map(Number);
  // 한국 시간 자정을 UTC로 변환 (9시간 빼기)
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0) - 9 * 60 * 60 * 1000);
}

async function up(db) {
  console.log('🔄 Starting migration: Convert milestone targetDate to string');

  const occasions = await db.collection('occasions').find({
    milestones: { $exists: true, $ne: [] }
  }).toArray();

  console.log(`📊 Found ${occasions.length} occasions with milestones`);

  let totalConverted = 0;

  for (const occasion of occasions) {
    if (!occasion.milestones || occasion.milestones.length === 0) {
      continue;
    }

    const updatedMilestones = occasion.milestones.map(milestone => {
      if (milestone.targetDate instanceof Date) {
        const dateString = dateToKoreanDateString(milestone.targetDate);
        console.log(`  📅 Converting: ${milestone.targetDate.toISOString()} -> ${dateString} (${milestone.name})`);
        totalConverted++;
        return {
          ...milestone,
          targetDate: dateString
        };
      }
      // 이미 문자열이면 그대로 유지
      return milestone;
    });

    await db.collection('occasions').updateOne(
      { _id: occasion._id },
      { $set: { milestones: updatedMilestones } }
    );
  }

  console.log(`✅ Converted ${totalConverted} milestone dates to string format`);
  console.log('✅ Migration completed successfully');
}

async function down(db) {
  console.log('🔄 Starting rollback: Convert milestone targetDate back to Date');

  const occasions = await db.collection('occasions').find({
    milestones: { $exists: true, $ne: [] }
  }).toArray();

  console.log(`📊 Found ${occasions.length} occasions with milestones`);

  let totalConverted = 0;

  for (const occasion of occasions) {
    if (!occasion.milestones || occasion.milestones.length === 0) {
      continue;
    }

    const updatedMilestones = occasion.milestones.map(milestone => {
      if (typeof milestone.targetDate === 'string') {
        const date = koreanDateStringToDate(milestone.targetDate);
        console.log(`  📅 Converting: ${milestone.targetDate} -> ${date.toISOString()} (${milestone.name})`);
        totalConverted++;
        return {
          ...milestone,
          targetDate: date
        };
      }
      // 이미 Date면 그대로 유지
      return milestone;
    });

    await db.collection('occasions').updateOne(
      { _id: occasion._id },
      { $set: { milestones: updatedMilestones } }
    );
  }

  console.log(`✅ Converted ${totalConverted} milestone dates back to Date format`);
  console.log('✅ Rollback completed successfully');
}

async function main() {
  const command = process.argv[2];

  if (!['up', 'down'].includes(command)) {
    console.error('Usage: node migrations/20251120-convert-milestone-targetdate-to-string.js [up|down]');
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
