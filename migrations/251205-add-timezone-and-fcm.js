#!/usr/bin/env node
/**
 * [251205-add-timezone-and-fcm]
 *
 * 작성 목적: User 스키마에 timezone, fcmTokens 필드 추가
 * 사용법: node migrations/251205-add-timezone-and-fcm.js
 * 주의: 이 스크립트는 기존 데이터를 수정합니다. 실행 전 백업 권장.
 */

const mongoose = require('mongoose');

async function migrate() {
  try {
    const mongoUri = process.env.MONGODB_URI;

    if (!mongoUri) {
      console.error('❌ MONGODB_URI 환경변수가 설정되지 않았습니다.');
      process.exit(1);
    }

    console.log('📡 MongoDB 연결 중...');
    await mongoose.connect(mongoUri);
    console.log('✅ MongoDB 연결 완료');

    const User = mongoose.connection.collection('users');

    // timezone이 없는 사용자 수 확인
    const count = await User.countDocuments({
      $or: [
        { timezone: { $exists: false } },
        { fcmTokens: { $exists: false } },
      ],
    });

    console.log(`📊 마이그레이션 대상 사용자: ${count}명`);

    if (count === 0) {
      console.log('✅ 모든 사용자가 이미 마이그레이션되었습니다.');
      await mongoose.disconnect();
      return;
    }

    // timezone이 없는 사용자에게 기본값 설정
    const result = await User.updateMany(
      {
        $or: [
          { timezone: { $exists: false } },
          { fcmTokens: { $exists: false } },
        ],
      },
      {
        $set: {
          timezone: 'Asia/Seoul', // 한국 앱이므로 기본값
          fcmTokens: [],
        },
      },
    );

    console.log(`✅ ${result.modifiedCount}명의 사용자 마이그레이션 완료`);
    console.log(`  - timezone: 'Asia/Seoul'`);
    console.log(`  - fcmTokens: []`);

    await mongoose.disconnect();
    console.log('👋 MongoDB 연결 종료');
  } catch (error) {
    console.error('❌ 마이그레이션 실패:', error);
    process.exit(1);
  }
}

migrate();
