#!/usr/bin/env node
/**
 * Migration: Add isPinned and nextMilestoneDate cache fields
 * Date: 2025-11-21
 *
 * 목적:
 * - isPinned 필드 추가 (기본값: false)
 * - nextMilestoneDate 캐시 필드 추가 및 기존 데이터 계산
 * - 정렬 성능 향상을 위한 캐시 필드
 *
 * 작업:
 * 1. 모든 occasions에 isPinned: false 추가
 * 2. 마일스톤이 있는 occasions의 nextMilestoneDate 계산
 *    - 오늘 이후 가장 가까운 마일스톤 날짜
 *
 * Usage:
 *   node migrations/20251121-add-ispinned-and-nextmilestone-cache.js up
 *   node migrations/20251121-add-ispinned-and-nextmilestone-cache.js down
 */

const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dday';

/**
 * 오늘 날짜를 "YYYY-MM-DD" 형식으로 반환
 * @returns {string} "YYYY-MM-DD" 형식 문자열
 */
function getTodayString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 마일스톤 배열에서 가장 가까운 upcoming 마일스톤 날짜 찾기
 * @param {Array} milestones - 마일스톤 배열
 * @param {string} today - 오늘 날짜 ("YYYY-MM-DD")
 * @returns {string|null} 가장 가까운 upcoming 마일스톤 날짜 또는 null
 */
function getNextMilestoneDate(milestones, today) {
  if (!milestones || milestones.length === 0) {
    return null;
  }

  const upcomingMilestones = milestones
    .filter(m => m.targetDate >= today)
    .sort((a, b) => a.targetDate.localeCompare(b.targetDate));

  return upcomingMilestones[0]?.targetDate || null;
}

async function up(db) {
  console.log('🔄 Starting migration: Add isPinned and nextMilestoneDate cache');

  const today = getTodayString();
  console.log(`📅 Today: ${today}`);

  const occasions = await db.collection('occasions').find({}).toArray();
  console.log(`📊 Found ${occasions.length} occasions`);

  let updatedCount = 0;
  let cacheAddedCount = 0;

  for (const occasion of occasions) {
    const update = {};

    // isPinned 필드가 없으면 false로 추가
    if (occasion.isPinned === undefined) {
      update.isPinned = false;
    }

    // nextMilestoneDate 계산
    const nextMilestone = getNextMilestoneDate(occasion.milestones, today);
    if (nextMilestone) {
      update.nextMilestoneDate = nextMilestone;
      cacheAddedCount++;
      console.log(`  📌 ${occasion.name}: nextMilestoneDate = ${nextMilestone}`);
    } else if (occasion.nextMilestoneDate !== undefined) {
      // 마일스톤이 없는데 캐시가 있으면 제거
      update.nextMilestoneDate = null;
    }

    if (Object.keys(update).length > 0) {
      await db.collection('occasions').updateOne(
        { _id: occasion._id },
        { $set: update }
      );
      updatedCount++;
    }
  }

  console.log(`✅ Updated ${updatedCount} occasions`);
  console.log(`✅ Added nextMilestoneDate cache to ${cacheAddedCount} occasions`);
  console.log('✅ Migration completed successfully');
}

async function down(db) {
  console.log('🔄 Starting rollback: Remove isPinned and nextMilestoneDate fields');

  const result = await db.collection('occasions').updateMany(
    {},
    {
      $unset: {
        isPinned: "",
        nextMilestoneDate: ""
      }
    }
  );

  console.log(`✅ Removed fields from ${result.modifiedCount} occasions`);
  console.log('✅ Rollback completed successfully');
}

async function main() {
  const command = process.argv[2];

  if (!['up', 'down'].includes(command)) {
    console.error('Usage: node migrations/20251121-add-ispinned-and-nextmilestone-cache.js [up|down]');
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
