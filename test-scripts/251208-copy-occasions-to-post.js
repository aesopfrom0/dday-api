#!/usr/bin/env node
/**
 * [251208-copy-occasions-to-post]
 *
 * 작성 목적: ash@island.com 계정의 한글 데이터를 영어로 번역해서 post@malone.com 계정에 추가
 * 사용법: node test-scripts/251208-copy-occasions-to-post.js
 * 주의: 이 스크립트는 테스트 데이터를 생성합니다.
 */

const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

const ASH_EMAIL = 'ash@island.com';
const POST_EMAIL = 'post@malone.com';

// 한글 -> 영어 번역 매핑
const translations = {
  '우리 만난 날': 'The Day We Met',
  '엄마 생신': "Mom's Birthday",
  '제주도 여행': 'Jeju Island Trip',
  '금연 시작': 'Quit Smoking',
  '결혼 기념일': 'Wedding Anniversary',
  'BTS 입덕': 'Became a BTS Fan',
  '할아버지 제사': "Grandfather's Memorial",
  '꼬물이 생일': "Baby Bean's Birthday",
};

async function main() {
  const client = new MongoClient(process.env.MONGODB_URI);

  try {
    await client.connect();
    console.log('✅ MongoDB connected');

    const db = client.db();

    // ash 계정 찾기
    const ashUser = await db.collection('users').findOne({ email: ASH_EMAIL });
    if (!ashUser) {
      console.error(`❌ ash 계정을 찾을 수 없습니다: ${ASH_EMAIL}`);
      process.exit(1);
    }
    console.log(`✅ ash 계정 찾음: ${ashUser.email} (ID: ${ashUser._id})`);

    // post 계정 찾기
    const postUser = await db.collection('users').findOne({ email: POST_EMAIL });
    if (!postUser) {
      console.error(`❌ post 계정을 찾을 수 없습니다: ${POST_EMAIL}`);
      process.exit(1);
    }
    console.log(`✅ post 계정 찾음: ${postUser.email} (ID: ${postUser._id})`);

    // ash 계정의 기념일 가져오기
    const ashOccasions = await db.collection('occasions')
      .find({ userId: ashUser._id })
      .toArray();

    console.log(`\n📅 ash 계정의 기념일 ${ashOccasions.length}개 발견`);

    if (ashOccasions.length === 0) {
      console.log('복사할 데이터가 없습니다.');
      return;
    }

    // post 계정 기존 데이터 확인
    const existingCount = await db.collection('occasions').countDocuments({ userId: postUser._id });
    if (existingCount > 0) {
      console.log(`\n⚠️  post 계정에 기존 데이터 ${existingCount}개 발견`);
      console.log('기존 데이터를 유지하고 새 데이터를 추가합니다.\n');
    }

    // 영어로 번역해서 추가
    console.log('영어 데이터 생성 중...\n');
    const createdOccasions = [];

    for (const ashOccasion of ashOccasions) {
      // 영어 이름으로 번역
      const englishName = translations[ashOccasion.name] || ashOccasion.name;

      const occasion = {
        name: englishName,
        baseDate: ashOccasion.baseDate,
        solarBaseDate: ashOccasion.solarBaseDate,
        calendarType: ashOccasion.calendarType,
        category: ashOccasion.category,
        isPinned: ashOccasion.isPinned,
        isNotificationEnabled: ashOccasion.isNotificationEnabled,
        displayUnits: ashOccasion.displayUnits,
        displayOptions: ashOccasion.displayOptions,
        suggestionRules: ashOccasion.suggestionRules,
        milestones: ashOccasion.milestones || [],
        excludedMilestones: ashOccasion.excludedMilestones || [],
        isArchived: ashOccasion.isArchived || false,
        userId: postUser._id,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // pinnedAt 설정
      if (occasion.isPinned) {
        occasion.pinnedAt = new Date();
      }

      const result = await db.collection('occasions').insertOne(occasion);
      createdOccasions.push({ ...occasion, _id: result.insertedId });

      console.log(`✅ ${occasion.name} (${occasion.category}) - ${occasion.baseDate}${occasion.calendarType === 'lunar' ? ' (lunar)' : ''}`);
    }

    console.log(`\n✅ 총 ${createdOccasions.length}개의 기념일이 생성되었습니다.`);
    console.log('\n생성된 데이터 요약:');
    createdOccasions.forEach((o, idx) => {
      console.log(`${idx + 1}. ${o.name} - ${o.category} - ${o.isPinned ? '📌 ' : ''}${o.calendarType}`);
    });

  } catch (error) {
    console.error('❌ 에러 발생:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('\n✅ MongoDB 연결 종료');
  }
}

main();
