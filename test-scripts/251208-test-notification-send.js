#!/usr/bin/env node
/**
 * [251208-test-notification-send]
 *
 * 작성 목적: 알림 발송 테스트를 위해 scheduledFor를 현재 시각으로 조정
 * 사용법: node test-scripts/251208-test-notification-send.js
 * 주의: 테스트용 - DB를 수정합니다
 */

const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.dev' });

async function main() {
  const client = new MongoClient(process.env.MONGODB_URI);

  try {
    await client.connect();
    console.log('✅ MongoDB connected');

    const db = client.db();

    // 현재 시각 + 5분 (다음 cron 실행 전)
    const now = new Date();
    const inFiveMinutes = new Date(now.getTime() + 5 * 60 * 1000);

    console.log(`\n⏰ 현재 시각: ${now.toISOString()}`);
    console.log(`🎯 변경할 시각: ${inFiveMinutes.toISOString()}`);

    // pending 알림 중 하나를 5분 후로 변경
    const result = await db.collection('notification_queues').updateMany(
      { status: 'pending' },
      { $set: { scheduledFor: inFiveMinutes } }
    );

    console.log(`\n✅ ${result.modifiedCount}개 알림의 시간을 ${inFiveMinutes.toISOString()}로 변경`);

    // 변경된 알림 확인
    const notifications = await db.collection('notification_queues')
      .find({ status: 'pending' })
      .toArray();

    console.log(`\n📬 변경된 알림 목록:`);
    for (const noti of notifications) {
      const kst = new Date(noti.scheduledFor).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
      console.log(`  - ${noti.type}: ${kst} (${noti.scheduledFor.toISOString()})`);
    }

    console.log(`\n💡 이제 cron을 실행하면 알림이 발송됩니다:`);
    console.log(`   yarn cron:invoke:dev`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
  }
}

main();
