import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Handler } from 'aws-lambda';
import { Model } from 'mongoose';
import { OccasionDocument } from './occasions/schemas/occasion.schema';

/**
 * Lambda 함수: nextMilestoneDate 캐시 갱신 크론
 *
 * 실행 스케줄: 매일 UTC 02:23 (cron(23 2 * * ? *))
 *
 * 작업:
 * 1. 모든 occasions 조회
 * 2. 각 occasion의 milestones에서 오늘 이후 가장 가까운 날짜 계산
 * 3. nextMilestoneDate 필드 업데이트
 */

export const handler: Handler = async (event, _context) => {
  console.log('[MilestoneCacheCron] Starting nextMilestoneDate cache update', event);

  try {
    // NestJS 앱 부트스트랩 (HTTP 없이)
    const app = await NestFactory.createApplicationContext(AppModule);

    // Mongoose 모델 직접 가져오기
    const occasionModel = app.get<Model<OccasionDocument>>('OccasionModel');

    const today = getTodayString();
    console.log(`[MilestoneCacheCron] Today (UTC): ${today}`);

    // 모든 occasions 조회
    const occasions = await occasionModel.find({}).exec();
    console.log(`[MilestoneCacheCron] Found ${occasions.length} occasions`);

    const updates = [];
    let updatedCount = 0;
    let unchangedCount = 0;

    for (const occasion of occasions) {
      const nextMilestone = getNextMilestoneDate(occasion.milestones, today);

      // 캐시가 변경되었는지 확인
      if (occasion.nextMilestoneDate !== nextMilestone) {
        updates.push({
          updateOne: {
            filter: { _id: occasion._id },
            update: { $set: { nextMilestoneDate: nextMilestone } },
          },
        });

        console.log(
          `[MilestoneCacheCron] ${occasion.name}: ${occasion.nextMilestoneDate} → ${nextMilestone}`,
        );
        updatedCount++;
      } else {
        unchangedCount++;
      }
    }

    // bulkWrite로 일괄 업데이트
    if (updates.length > 0) {
      await occasionModel.bulkWrite(updates);
    }

    console.log(`[MilestoneCacheCron] Updated: ${updatedCount} occasions`);
    console.log(`[MilestoneCacheCron] Unchanged: ${unchangedCount} occasions`);

    await app.close();

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Milestone cache update completed',
        updated: updatedCount,
        unchanged: unchangedCount,
        total: occasions.length,
      }),
    };
  } catch (error) {
    console.error('[MilestoneCacheCron] Error:', error);
    throw error;
  }
};

/**
 * 오늘 날짜를 "YYYY-MM-DD" 형식으로 반환 (UTC 기준)
 */
function getTodayString(): string {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const day = String(now.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 마일스톤 배열에서 가장 가까운 upcoming 마일스톤 날짜 찾기
 */
function getNextMilestoneDate(milestones: any[], today: string): string | null {
  if (!milestones || milestones.length === 0) {
    return null;
  }

  const upcomingMilestones = milestones
    .filter((m) => m.targetDate >= today)
    .sort((a, b) => a.targetDate.localeCompare(b.targetDate));

  return upcomingMilestones[0]?.targetDate || null;
}
