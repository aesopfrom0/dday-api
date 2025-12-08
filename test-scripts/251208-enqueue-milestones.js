#!/usr/bin/env node
/**
 * [251208-enqueue-milestones]
 *
 * 작성 목적: 마일스톤 기반 알림 Queue 적재 테스트
 * 사용법: node test-scripts/251208-enqueue-milestones.js
 * 주의: 읽기 전용 스크립트
 */

const { MongoClient } = require('mongodb');
const { DateTime } = require('luxon');
require('dotenv').config({ path: '.env.dev' });

async function main() {
  const client = new MongoClient(process.env.MONGODB_URI);

  try {
    await client.connect();
    console.log('✅ MongoDB connected');

    const db = client.db();

    // 1. 기존 pending 알림 삭제
    const deleteResult = await db.collection('notification_queues').deleteMany({
      status: 'pending',
    });
    console.log(`🗑️  Deleted ${deleteResult.deletedCount} pending notifications`);

    // 2. 향후 3일 이내 마일스톤 조회
    const today = DateTime.utc().startOf('day');
    const threeDaysLater = today.plus({ days: 3 }).endOf('day');

    console.log(`\n📅 검색 범위: ${today.toISODate()} ~ ${threeDaysLater.toISODate()}`);

    const occasions = await db.collection('occasions')
      .find({
        isArchived: false,
        isNotificationEnabled: true,
        'milestones.0': { $exists: true },
      })
      .toArray();

    console.log(`\n📝 마일스톤이 있는 이벤트: ${occasions.length}개`);

    // 3. 알림 Queue 생성
    const queues = [];
    let milestoneCount = 0;

    for (const occasion of occasions) {
      const user = await db.collection('users').findOne({ _id: occasion.userId });
      if (!user) continue;

      const userTimezone = user.timezone || 'UTC';

      for (const milestone of occasion.milestones || []) {
        const milestoneDate = DateTime.fromISO(milestone.targetDate, { zone: 'utc' });

        // 향후 3일 이내인지 확인
        if (milestoneDate < today || milestoneDate > threeDaysLater) continue;

        milestoneCount++;
        console.log(`\n  🎯 ${occasion.name} - ${milestone.name}`);
        console.log(`     targetDate: ${milestone.targetDate}`);

        // 3가지 알림 타입 생성
        const configs = [
          { type: '3_days', daysBefore: 3, hour: 20, minute: 0 },
          { type: '1_day', daysBefore: 1, hour: 20, minute: 0 },
          { type: 'd_day', daysBefore: 0, hour: 9, minute: 0 },
        ];

        for (const config of configs) {
          const notificationDate = milestoneDate.minus({ days: config.daysBefore });

          // 사용자 타임존 기준으로 알림 시간 설정
          const localDateTime = DateTime.fromISO(notificationDate.toISODate(), {
            zone: userTimezone,
          }).set({
            hour: config.hour,
            minute: config.minute,
            second: 0,
            millisecond: 0,
          });

          const utcDateTime = localDateTime.toUTC();

          // 과거 시간이면 건너뛰기
          if (utcDateTime < DateTime.utc()) {
            console.log(`     ⏭️  ${config.type}: 과거 시간 건너뜀 (${utcDateTime.toISO()})`);
            continue;
          }

          console.log(`     ✅ ${config.type}: ${utcDateTime.toISO()} (${userTimezone})`);

          queues.push({
            userId: occasion.userId,
            occasionId: occasion._id,
            milestoneId: milestone.id,
            scheduledFor: utcDateTime.toJSDate(),
            type: config.type,
            status: 'pending',
            retryCount: 0,
          });
        }
      }
    }

    // 4. 일괄 적재
    if (queues.length > 0) {
      await db.collection('notification_queues').insertMany(queues);
    }

    console.log(`\n✅ 완료: ${occasions.length}개 이벤트, ${milestoneCount}개 마일스톤, ${queues.length}개 알림 적재`);

    // 5. 적재된 알림 확인
    const enqueuedNotifications = await db.collection('notification_queues')
      .find({ status: 'pending' })
      .sort({ scheduledFor: 1 })
      .toArray();

    console.log(`\n📬 적재된 알림 목록:`);
    for (const noti of enqueuedNotifications) {
      const kst = new Date(noti.scheduledFor).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
      console.log(`  - ${noti.type}: ${kst} (${noti.scheduledFor.toISOString()})`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
  }
}

main();
