#!/usr/bin/env node
/**
 * Migration: Fix stale nextMilestoneDate cache
 * Date: 2025-12-06
 *
 * 목적:
 * - 과거 마일스톤으로 인해 오래된 nextMilestoneDate 캐시 갱신
 * - 매일 실행되는 Lambda 함수와 동일한 로직 (일회성)
 *
 * 작업:
 * 1. 모든 occasions 조회
 * 2. 오늘 이후 가장 가까운 마일스톤 날짜 계산
 * 3. nextMilestoneDate 캐시 업데이트
 *
 * Usage:
 *   node migrations/251206-fix-stale-nextmilestone-cache.js
 *
 * 환경별 순차 실행:
 *   - local → dev → prod 순서로 사용자 확인 후 진행
 *   - 각 단계에서 결과를 확인하고 다음 단계로 진행 여부 결정
 */

const { MongoClient } = require('mongodb');
const readline = require('readline');
const { execSync } = require('child_process');

// 환경별 설정
const ENVIRONMENTS = {
  local: { envFile: '.env.local', name: 'Local' },
  dev: { envFile: '.env.dev', name: 'Development' },
  prod: { envFile: '.env.prod', name: 'Production' }
};

/**
 * 오늘 날짜를 "YYYY-MM-DD" 형식으로 반환 (UTC 기준)
 * @returns {string} "YYYY-MM-DD" 형식 문자열
 */
function getTodayString() {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const day = String(now.getUTCDate()).padStart(2, '0');
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

/**
 * 사용자 입력을 받는 함수
 */
function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise(resolve => rl.question(query, ans => {
    rl.close();
    resolve(ans);
  }));
}

/**
 * .env 파일에서 MONGODB_URI 로드
 */
function loadMongoUri(envFile) {
  try {
    const envContent = execSync(`cat ${envFile}`, { encoding: 'utf-8' });
    const match = envContent.match(/MONGODB_URI=(.+)/);
    if (!match) {
      throw new Error(`MONGODB_URI not found in ${envFile}`);
    }
    return match[1].trim().replace(/['"]/g, '');
  } catch (error) {
    throw new Error(`Failed to load ${envFile}: ${error.message}`);
  }
}

async function updateCache(db, envName) {
  console.log(`\n🔄 Starting nextMilestoneDate cache update [${envName}]`);

  const today = getTodayString();
  console.log(`📅 Today (UTC): ${today}`);

  const occasions = await db.collection('occasions').find({}).toArray();
  console.log(`📊 Found ${occasions.length} occasions`);

  const updates = [];
  let updatedCount = 0;
  let unchangedCount = 0;

  for (const occasion of occasions) {
    const nextMilestone = getNextMilestoneDate(occasion.milestones, today);

    // 캐시가 변경되었는지 확인
    if (occasion.nextMilestoneDate !== nextMilestone) {
      updates.push({
        updateOne: {
          filter: { _id: occasion._id },
          update: { $set: { nextMilestoneDate: nextMilestone } }
        }
      });

      console.log(`  📌 ${occasion.name}: ${occasion.nextMilestoneDate} → ${nextMilestone}`);
      updatedCount++;
    } else {
      unchangedCount++;
    }
  }

  // bulkWrite로 일괄 업데이트
  if (updates.length > 0) {
    await db.collection('occasions').bulkWrite(updates);
  }

  console.log(`✅ Updated: ${updatedCount} occasions`);
  console.log(`✅ Unchanged: ${unchangedCount} occasions`);
  console.log(`✅ Migration completed for ${envName}`);

  return { updatedCount, unchangedCount, total: occasions.length };
}

async function runMigrationForEnv(env) {
  const config = ENVIRONMENTS[env];
  const mongoUri = loadMongoUri(config.envFile);

  const client = new MongoClient(mongoUri);

  try {
    await client.connect();
    console.log(`📦 Connected to MongoDB [${config.name}]`);

    const db = client.db();
    const result = await updateCache(db, config.name);

    return result;
  } finally {
    await client.close();
    console.log(`👋 Disconnected from MongoDB [${config.name}]`);
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('🚀 Next Milestone Cache Migration');
  console.log('='.repeat(60));
  console.log('\n이 스크립트는 local → dev → prod 순서로 진행됩니다.');
  console.log('각 단계에서 결과를 확인하고 다음 단계 진행 여부를 결정할 수 있습니다.\n');

  const results = {};

  try {
    // 1. Local 환경
    console.log('\n📍 Step 1/3: Local 환경');
    console.log('-'.repeat(60));
    const proceedLocal = await askQuestion('Local 환경에서 마이그레이션을 실행하시겠습니까? (y/n): ');

    if (proceedLocal.toLowerCase() === 'y') {
      results.local = await runMigrationForEnv('local');
    } else {
      console.log('⏭️  Local 환경 건너뜀');
    }

    // 2. Dev 환경
    console.log('\n📍 Step 2/3: Development 환경');
    console.log('-'.repeat(60));
    const proceedDev = await askQuestion('Dev 환경에서 마이그레이션을 실행하시겠습니까? (y/n): ');

    if (proceedDev.toLowerCase() === 'y') {
      results.dev = await runMigrationForEnv('dev');
    } else {
      console.log('⏭️  Dev 환경 건너뜀');
    }

    // 3. Production 환경
    console.log('\n📍 Step 3/3: Production 환경');
    console.log('-'.repeat(60));
    console.log('⚠️  주의: Production 환경입니다!');
    const proceedProd = await askQuestion('Production 환경에서 마이그레이션을 실행하시겠습니까? (y/n): ');

    if (proceedProd.toLowerCase() === 'y') {
      results.prod = await runMigrationForEnv('prod');
    } else {
      console.log('⏭️  Production 환경 건너뜀');
    }

    // 최종 결과 요약
    console.log('\n' + '='.repeat(60));
    console.log('📊 Migration Summary');
    console.log('='.repeat(60));

    for (const [env, result] of Object.entries(results)) {
      if (result) {
        console.log(`\n${ENVIRONMENTS[env].name}:`);
        console.log(`  - Total: ${result.total} occasions`);
        console.log(`  - Updated: ${result.updatedCount}`);
        console.log(`  - Unchanged: ${result.unchangedCount}`);
      }
    }

    console.log('\n✅ All migrations completed successfully!');
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  }
}

main();
