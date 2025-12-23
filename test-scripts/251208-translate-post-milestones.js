#!/usr/bin/env node
/**
 * [251208-translate-post-milestones]
 *
 * 작성 목적: post@malone.com 계정의 마일스톤 제목을 영어로 변경
 * 사용법: node test-scripts/251208-translate-post-milestones.js
 * 주의: 이 스크립트는 데이터를 수정합니다.
 */

const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

const POST_EMAIL = 'post@malone.com';

// 한글 마일스톤 제목을 영어로 번역하는 함수
function translateMilestoneName(koreanName) {
  // 패턴 매칭으로 번역

  // ~주년 패턴
  const yearMatch = koreanName.match(/^(\d+)주년$/);
  if (yearMatch) {
    const year = yearMatch[1];
    return `${year} Year${year > 1 ? 's' : ''} Anniversary`;
  }

  // ~개월 패턴
  const monthMatch = koreanName.match(/^(\d+)개월$/);
  if (monthMatch) {
    const month = monthMatch[1];
    return `${month} Month${month > 1 ? 's' : ''}`;
  }

  // ~일 패턴
  const dayMatch = koreanName.match(/^(\d+)일$/);
  if (dayMatch) {
    const day = dayMatch[1];
    return `${day} Day${day > 1 ? 's' : ''}`;
  }

  // ~년 패턴
  const yearOnlyMatch = koreanName.match(/^(\d+)년$/);
  if (yearOnlyMatch) {
    const year = yearOnlyMatch[1];
    return `${year} Year${year > 1 ? 's' : ''}`;
  }

  // 기타 패턴 (그대로 반환)
  return koreanName;
}

async function main() {
  const client = new MongoClient(process.env.MONGODB_URI);

  try {
    await client.connect();
    console.log('✅ MongoDB connected');

    const db = client.db();

    // post 계정 찾기
    const postUser = await db.collection('users').findOne({ email: POST_EMAIL });
    if (!postUser) {
      console.error(`❌ post 계정을 찾을 수 없습니다: ${POST_EMAIL}`);
      process.exit(1);
    }
    console.log(`✅ post 계정 찾음: ${postUser.email} (ID: ${postUser._id})`);

    // post 계정의 모든 기념일 가져오기
    const occasions = await db.collection('occasions')
      .find({ userId: postUser._id })
      .toArray();

    console.log(`\n📅 총 ${occasions.length}개의 기념일 발견\n`);

    let totalUpdated = 0;

    for (const occasion of occasions) {
      if (!occasion.milestones || occasion.milestones.length === 0) {
        console.log(`⏭️  ${occasion.name}: 마일스톤 없음`);
        continue;
      }

      const updatedMilestones = occasion.milestones.map(milestone => {
        const originalName = milestone.name;
        const translatedName = translateMilestoneName(originalName);

        if (originalName !== translatedName) {
          console.log(`  "${originalName}" → "${translatedName}"`);
        }

        return {
          ...milestone,
          name: translatedName,
        };
      });

      // 업데이트
      await db.collection('occasions').updateOne(
        { _id: occasion._id },
        {
          $set: {
            milestones: updatedMilestones,
            updatedAt: new Date(),
          }
        }
      );

      console.log(`✅ ${occasion.name}: ${updatedMilestones.length}개 마일스톤 업데이트\n`);
      totalUpdated++;
    }

    console.log(`\n✅ 총 ${totalUpdated}개의 기념일이 업데이트되었습니다.`);

  } catch (error) {
    console.error('❌ 에러 발생:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('✅ MongoDB 연결 종료');
  }
}

main();
