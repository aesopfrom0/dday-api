#!/usr/bin/env node
/**
 * [251208-reset-notifications]
 *
 * 작성 목적: 알림을 원래 시간으로 되돌리기
 * 사용법: node test-scripts/251208-reset-notifications.js
 * 주의: DB를 수정합니다
 */

const { MongoClient, ObjectId } = require('mongodb');
const { DateTime } = require('luxon');
require('dotenv').config({ path: '.env.dev' });

async function main() {
  const client = new MongoClient(process.env.MONGODB_URI);

  try {
    await client.connect();
    console.log('✅ MongoDB connected');

    const db = client.db();

    // 1. 기존 알림 확인
    const existingNotifications = await db.collection('notification_queues')
      .find({})
      .toArray();

    console.log(`\n📬 기존 알림 ${existingNotifications.length}개:`);
    existingNotifications.forEach(n => {
      console.log(`  - ${n.type}, status: ${n.status}, scheduledFor: ${n.scheduledFor}`);
    });

    // 2. 모두 삭제
    await db.collection('notification_queues').deleteMany({});
    console.log(`\n🗑️  모든 알림 삭제 완료`);

    // 3. 금연 이벤트의 마일스톤 조회
    const occasion = await db.collection('occasions').findOne({ name: /금연/ });

    if (!occasion || !occasion.milestones || occasion.milestones.length === 0) {
      console.log('❌ 금연 이벤트 또는 마일스톤을 찾을 수 없습니다.');
      return;
    }

    const user = await db.collection('users').findOne({ _id: occasion.userId });
    const userTimezone = user?.timezone || 'UTC';

    console.log(`\n📅 금연 이벤트 마일스톤:`);
    occasion.milestones.forEach(m => {
      console.log(`  - ${m.name}: ${m.targetDate}`);
    });

    // 4. 마일스톤별 알림 재생성 (원래 시간)
    const queues = [];

    for (const milestone of occasion.milestones) {
      const milestoneDate = DateTime.fromISO(milestone.targetDate, { zone: 'utc' });

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
          console.log(`\n  ⏭️  ${milestone.name} - ${config.type}: 과거 시간 (${utcDateTime.toISO()})`);
          continue;
        }

        const kst = utcDateTime.setZone('Asia/Seoul').toFormat('yyyy-MM-dd HH:mm:ss');
        console.log(`\n  ✅ ${milestone.name} - ${config.type}`);
        console.log(`     KST: ${kst}`);
        console.log(`     UTC: ${utcDateTime.toISO()}`);

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

    // 5. 일괄 적재
    if (queues.length > 0) {
      await db.collection('notification_queues').insertMany(queues);
      console.log(`\n✅ ${queues.length}개 알림 재생성 완료`);
    } else {
      console.log(`\n⚠️  생성할 알림이 없습니다 (모두 과거 시간)`);
    }

    // 6. 최종 확인
    const finalNotifications = await db.collection('notification_queues')
      .find({ status: 'pending' })
      .sort({ scheduledFor: 1 })
      .toArray();

    console.log(`\n📬 최종 알림 목록 (${finalNotifications.length}개):`);
    finalNotifications.forEach(n => {
      const kst = new Date(n.scheduledFor).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
      console.log(`  - ${n.type}: ${kst}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
  }
}

main();
