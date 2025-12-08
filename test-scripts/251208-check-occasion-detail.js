#!/usr/bin/env node
/**
 * [251208-check-occasion-detail]
 *
 * 작성 목적: 금연 이벤트 상세 정보 확인
 * 사용법: node test-scripts/251208-check-occasion-detail.js
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

    // 금연 이벤트 전체 정보
    const occasion = await db.collection('occasions')
      .findOne({ name: /금연/ });

    if (!occasion) {
      console.log('❌ 금연 이벤트를 찾을 수 없습니다.');
      return;
    }

    console.log('\n📅 금연 이벤트 전체 정보:');
    console.log(JSON.stringify(occasion, null, 2));

    // 마일스톤 정보
    if (occasion.milestones && occasion.milestones.length > 0) {
      console.log('\n🎯 마일스톤:');
      occasion.milestones.forEach((m, idx) => {
        console.log(`  ${idx + 1}. ${m.label}: ${m.value}${m.unit}`);
      });
    }

    // 다음 마일스톤 정보
    if (occasion.nextMilestone) {
      console.log('\n⏭️ 다음 마일스톤:');
      console.log(JSON.stringify(occasion.nextMilestone, null, 2));
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
  }
}

main();
