#!/usr/bin/env node
/**
 * [251208-add-test-occasions-ash]
 *
 * 작성 목적: dev 환경 특정 유저에 한글 테스트 데이터 추가 (스크린샷용)
 * 사용법: node test-scripts/251208-add-test-occasions-ash.js
 * 주의: 이 스크립트는 테스트 데이터를 생성합니다. 기존 데이터는 수정하지 않습니다.
 */

const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

const TEST_USER_ID = 'REDACTED_USER_ID';

const occasionsData = [
  {
    name: '우리 만난 날',
    baseDate: '2024-09-15',
    calendarType: 'solar',
    category: 'couple',
    isPinned: true,
    isNotificationEnabled: true,
    displayUnits: {
      year: false,
      month: false,
      week: false,
      day: true,
      hour: false,
      minute: false,
      second: false,
    },
    displayOptions: {
      showProgress: true,
      showCumulativeDuration: true,
    },
    suggestionRules: {
      yearly: false,
      monthly: false,
      weekly: false,
      every100days: true,
      every1000days: false,
    },
    milestones: [],
    excludedMilestones: [],
    isArchived: false,
  },
  {
    name: '엄마 생신',
    baseDate: '2025-01-20',
    calendarType: 'solar',
    category: 'birthday',
    isPinned: false,
    isNotificationEnabled: true,
    displayUnits: {
      year: false,
      month: false,
      week: false,
      day: true,
      hour: false,
      minute: false,
      second: false,
    },
    displayOptions: {
      showProgress: true,
      showCumulativeDuration: true,
    },
    suggestionRules: {
      yearly: true,
      monthly: false,
      weekly: false,
      every100days: false,
      every1000days: false,
    },
    milestones: [],
    excludedMilestones: [],
    isArchived: false,
  },
  {
    name: '제주도 여행',
    baseDate: '2025-03-01',
    calendarType: 'solar',
    category: 'travel',
    isPinned: false,
    isNotificationEnabled: true,
    displayUnits: {
      year: false,
      month: false,
      week: false,
      day: true,
      hour: false,
      minute: false,
      second: false,
    },
    displayOptions: {
      showProgress: true,
      showCumulativeDuration: true,
    },
    suggestionRules: {
      yearly: false,
      monthly: false,
      weekly: false,
      every100days: false,
      every1000days: false,
    },
    milestones: [],
    excludedMilestones: [],
    isArchived: false,
  },
  {
    name: '금연 시작',
    baseDate: '2024-01-01',
    calendarType: 'solar',
    category: 'quitSmoking',
    isPinned: false,
    isNotificationEnabled: true,
    displayUnits: {
      year: false,
      month: false,
      week: false,
      day: true,
      hour: false,
      minute: false,
      second: false,
    },
    displayOptions: {
      showProgress: true,
      showCumulativeDuration: true,
    },
    suggestionRules: {
      yearly: false,
      monthly: false,
      weekly: false,
      every100days: true,
      every1000days: false,
    },
    milestones: [],
    excludedMilestones: [],
    isArchived: false,
  },
  {
    name: '결혼 기념일',
    baseDate: '2020-05-15',
    calendarType: 'solar',
    category: 'marriage',
    isPinned: false,
    isNotificationEnabled: true,
    displayUnits: {
      year: false,
      month: false,
      week: false,
      day: true,
      hour: false,
      minute: false,
      second: false,
    },
    displayOptions: {
      showProgress: true,
      showCumulativeDuration: true,
    },
    suggestionRules: {
      yearly: true,
      monthly: false,
      weekly: false,
      every100days: true,
      every1000days: true,
    },
    milestones: [],
    excludedMilestones: [],
    isArchived: false,
  },
  {
    name: 'BTS 입덕',
    baseDate: '2023-06-13',
    calendarType: 'solar',
    category: 'fandom',
    isPinned: false,
    isNotificationEnabled: true,
    displayUnits: {
      year: false,
      month: false,
      week: false,
      day: true,
      hour: false,
      minute: false,
      second: false,
    },
    displayOptions: {
      showProgress: true,
      showCumulativeDuration: true,
    },
    suggestionRules: {
      yearly: true,
      monthly: false,
      weekly: false,
      every100days: true,
      every1000days: false,
    },
    milestones: [],
    excludedMilestones: [],
    isArchived: false,
  },
  {
    name: '할아버지 제사',
    baseDate: '2001-10-09', // 음력 날짜
    solarBaseDate: '2001-11-23', // 양력 변환 날짜 (예시)
    calendarType: 'lunar',
    category: 'memorial',
    isPinned: false,
    isNotificationEnabled: true,
    displayUnits: {
      year: false,
      month: false,
      week: false,
      day: true,
      hour: false,
      minute: false,
      second: false,
    },
    displayOptions: {
      showProgress: true,
      showCumulativeDuration: true,
    },
    suggestionRules: {
      yearly: true,
      monthly: false,
      weekly: false,
      every100days: false,
      every1000days: false,
    },
    milestones: [],
    excludedMilestones: [],
    isArchived: false,
  },
];

async function main() {
  const client = new MongoClient(process.env.MONGODB_URI);

  try {
    await client.connect();
    console.log('✅ MongoDB connected');

    const db = client.db();

    // 사용자 찾기
    const user = await db.collection('users').findOne({ _id: new ObjectId(TEST_USER_ID) });
    if (!user) {
      console.error(`❌ 사용자를 찾을 수 없습니다: ${TEST_USER_ID}`);
      process.exit(1);
    }
    console.log(`✅ 사용자 찾음: ${user.email} (ID: ${user._id})`);

    // 기존 데이터 확인
    const existingCount = await db.collection('occasions').countDocuments({ userId: user._id });
    if (existingCount > 0) {
      console.log(`\n⚠️  기존 데이터 ${existingCount}개 발견`);
      console.log('기존 데이터를 유지하고 새 데이터를 추가합니다.\n');
    }

    // 새 데이터 생성
    console.log('테스트 데이터 생성 중...\n');
    const createdOccasions = [];

    for (const occasionData of occasionsData) {
      const occasion = {
        ...occasionData,
        userId: user._id,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // pinnedAt 설정
      if (occasion.isPinned) {
        occasion.pinnedAt = new Date();
      }

      const result = await db.collection('occasions').insertOne(occasion);
      createdOccasions.push({ ...occasion, _id: result.insertedId });

      console.log(`✅ ${occasion.name} (${occasion.category}) - ${occasion.baseDate}${occasion.calendarType === 'lunar' ? ' (음력)' : ''}`);
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
