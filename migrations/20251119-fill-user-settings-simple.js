#!/usr/bin/env node
/**
 * [20251119] 기존 사용자 settings 채우기 (간단 버전)
 *
 * 작성 목적: settings가 비어있는 사용자에게 기본값 설정
 * 사용법:
 *   1. MongoDB 직접 연결: node migrations/20251119-fill-user-settings-simple.js
 *   2. 또는 mongosh에서 직접 실행
 *
 * 주의: 이 스크립트는 기존 데이터를 수정합니다.
 */

const { MongoClient } = require('mongodb');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:25017/dday';

const DEFAULT_SETTINGS = {
  defaultMilestoneDisplayCount: '2',
  language: 'ko',
  theme: 'system',
};

async function main() {
  console.log('🚀 Connecting to MongoDB...');
  console.log(`   URI: ${MONGO_URI}\n`);

  const client = new MongoClient(MONGO_URI);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const db = client.db();
    const usersCollection = db.collection('users');

    // settings가 불완전한 사용자 찾기
    const usersToUpdate = await usersCollection
      .find({
        $or: [
          { settings: { $exists: false } },
          { settings: null },
          { settings: {} },
          { 'settings.defaultMilestoneDisplayCount': { $exists: false } },
          { 'settings.language': { $exists: false } },
          { 'settings.theme': { $exists: false } },
        ],
      })
      .toArray();

    console.log(`📊 Found ${usersToUpdate.length} users to update\n`);

    if (usersToUpdate.length === 0) {
      console.log('✅ All users already have complete settings!');
      return;
    }

    // 미리보기
    console.log('👀 Preview (first 5 users):');
    usersToUpdate.slice(0, 5).forEach((user, index) => {
      console.log(`  ${index + 1}. ${user.email}`);
      console.log(`     Current settings:`, user.settings || 'null');
      console.log(`     Will be set to:`, DEFAULT_SETTINGS);
      console.log('');
    });

    // 사용자 확인 (프로덕션에서는 주석 해제)
    // const readline = require('readline').createInterface({
    //   input: process.stdin,
    //   output: process.stdout,
    // });
    // const answer = await new Promise((resolve) => {
    //   readline.question('Continue? (yes/no): ', resolve);
    // });
    // readline.close();
    // if (answer.toLowerCase() !== 'yes') {
    //   console.log('❌ Aborted by user');
    //   return;
    // }

    console.log('🔄 Updating users...\n');

    // 모든 사용자 일괄 업데이트
    const result = await usersCollection.updateMany(
      {
        $or: [
          { settings: { $exists: false } },
          { settings: null },
          { settings: {} },
          { 'settings.defaultMilestoneDisplayCount': { $exists: false } },
          { 'settings.language': { $exists: false } },
          { 'settings.theme': { $exists: false } },
        ],
      },
      {
        $set: {
          'settings.defaultMilestoneDisplayCount':
            DEFAULT_SETTINGS.defaultMilestoneDisplayCount,
          'settings.language': DEFAULT_SETTINGS.language,
          'settings.theme': DEFAULT_SETTINGS.theme,
        },
      },
    );

    console.log('📈 Update Results:');
    console.log(`  • Matched: ${result.matchedCount}`);
    console.log(`  • Modified: ${result.modifiedCount}`);

    // 검증
    const remainingUsers = await usersCollection
      .find({
        $or: [
          { 'settings.defaultMilestoneDisplayCount': { $exists: false } },
          { 'settings.language': { $exists: false } },
          { 'settings.theme': { $exists: false } },
        ],
      })
      .toArray();

    if (remainingUsers.length > 0) {
      console.log(
        `\n⚠️  Warning: ${remainingUsers.length} users still incomplete`,
      );
    } else {
      console.log('\n✅ All users now have complete settings!');
    }
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

// 실행
main()
  .then(() => {
    console.log('\n🎉 Migration completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });
