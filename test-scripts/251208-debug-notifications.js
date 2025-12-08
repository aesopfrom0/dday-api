#!/usr/bin/env node
/**
 * [251208-debug-notifications]
 *
 * 작성 목적: NotificationQueue에 등록된 알림 디버깅
 * 사용법: node test-scripts/251208-debug-notifications.js
 * 주의: 읽기 전용 스크립트
 */

const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.dev' });

async function main() {
  const client = new MongoClient(process.env.MONGODB_URI);

  try {
    await client.connect();
    console.log('✅ MongoDB connected');

    const db = client.db();

    // 1. 금연 이벤트 찾기
    const occasions = await db.collection('occasions')
      .find({ name: /금연/ })
      .toArray();

    console.log('\n📅 금연 이벤트:');
    occasions.forEach(occ => {
      console.log(`  - ID: ${occ._id}`);
      console.log(`    이름: ${occ.name}`);
      console.log(`    baseDate: ${occ.baseDate}`);
      console.log(`    반복: ${occ.repeat}`);
    });

    if (occasions.length === 0) {
      console.log('❌ 금연 이벤트를 찾을 수 없습니다.');
      return;
    }

    // 2. 해당 이벤트의 알림 큐 확인
    const occasionId = occasions[0]._id;
    const queues = await db.collection('notification_queues')
      .find({ occasionId })
      .toArray();

    console.log(`\n🔔 알림 큐 (총 ${queues.length}개):`);
    queues.forEach(q => {
      const scheduledKST = new Date(q.scheduledFor).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
      const scheduledUTC = q.scheduledFor.toISOString();
      console.log(`  - Type: ${q.type}, Status: ${q.status}`);
      console.log(`    Scheduled (KST): ${scheduledKST}`);
      console.log(`    Scheduled (UTC): ${scheduledUTC}`);
      console.log(`    occasionDate: ${q.occasionDate}`);
      console.log(`    retryCount: ${q.retryCount}`);
    });

    // 3. 현재 시각과 비교
    const now = new Date();
    const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);

    console.log('\n⏰ 현재 시각:');
    console.log(`  - KST: ${now.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}`);
    console.log(`  - UTC: ${now.toISOString()}`);
    console.log(`  - 1시간 후 UTC: ${oneHourLater.toISOString()}`);

    // 4. 크론 조건에 맞는 알림 확인
    const matchingQueues = await db.collection('notification_queues')
      .find({
        occasionId,
        scheduledFor: {
          $gte: now,
          $lt: oneHourLater,
        },
        status: 'pending',
        retryCount: { $lt: 3 },
      })
      .toArray();

    console.log(`\n✅ 크론 조건에 맞는 알림: ${matchingQueues.length}개`);

    // 5. 사용자 정보 확인
    if (occasions.length > 0) {
      const userId = occasions[0].userId;
      const user = await db.collection('users').findOne({ _id: userId });

      console.log('\n👤 사용자 정보:');
      console.log(`  - ID: ${userId}`);
      console.log(`  - 타임존: ${user?.timezone || '설정 안됨'}`);
      console.log(`  - FCM 토큰: ${user?.fcmTokens?.length || 0}개`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
  }
}

main();
