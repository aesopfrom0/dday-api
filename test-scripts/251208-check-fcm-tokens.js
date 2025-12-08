#!/usr/bin/env node
/**
 * [251208-check-fcm-tokens]
 *
 * 작성 목적: 사용자의 FCM 토큰 확인
 * 사용법: node test-scripts/251208-check-fcm-tokens.js
 * 주의: 읽기 전용
 */

const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.dev' });

async function main() {
  const client = new MongoClient(process.env.MONGODB_URI);

  try {
    await client.connect();
    console.log('✅ MongoDB connected');

    const db = client.db();

    // 금연 이벤트의 사용자 조회
    const occasion = await db.collection('occasions').findOne({ name: /금연/ });

    if (!occasion) {
      console.log('❌ 금연 이벤트를 찾을 수 없습니다.');
      return;
    }

    const user = await db.collection('users').findOne({ _id: occasion.userId });

    console.log(`\n👤 사용자 정보:`);
    console.log(`  - ID: ${user._id}`);
    console.log(`  - 타임존: ${user.timezone || '설정 안됨'}`);
    console.log(`  - 알림 활성화: ${occasion.isNotificationEnabled}`);
    console.log(`\n🔔 FCM 토큰 (${user.fcmTokens?.length || 0}개):`);

    if (user.fcmTokens && user.fcmTokens.length > 0) {
      user.fcmTokens.forEach((token, idx) => {
        console.log(`  ${idx + 1}. ${token.substring(0, 50)}...`);
      });
    } else {
      console.log('  ❌ FCM 토큰이 없습니다.');
    }

    // 실제 Firebase로 토큰 검증은 여기서 할 수 없으므로
    // 다음 cron 실행 시 로그에서 실패 이유를 확인해야 합니다.

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
  }
}

main();
