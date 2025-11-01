import { MoodType, Hello, Bye } from '@prisma/client';
import { HelloResult, ByeResult } from 'src/common/dto/result/hello';

/**
 * HelloMapper - Data Transformation Layer
 *
 * 역할:
 * - Prisma 모델 → Result DTO 변환
 * - 계산된 필드 추가 (byesCount, totalWaveCount 등)
 * - 민감한 정보 제외 (필요시)
 * - 비즈니스 로직을 포함한 필드 생성
 *
 * 장점:
 * - DB 스키마와 API 응답 분리
 * - 계산 로직을 한 곳에 집중
 * - 타입 안정성 보장
 */

type HelloWithByes = Hello & { byes: Bye[] };

export class HelloMapper {
  private static readonly POSITIVE_MOODS: MoodType[] = [MoodType.HAPPY, MoodType.EXCITED];
  private static readonly ENTHUSIASTIC_WAVE_THRESHOLD = 3;

  /**
   * Prisma Hello 모델을 HelloResult DTO로 변환
   */
  static toResult(prismaHello: HelloWithByes): HelloResult {
    const byes = prismaHello.byes.map((bye) => this.byeToResult(bye));
    const totalWaveCount = this.calculateTotalWaveCount(prismaHello.byes);
    const isPositiveMood = this.isPositiveMood(prismaHello.mood);

    return {
      id: prismaHello.id,
      message: prismaHello.message,
      mood: prismaHello.mood,
      timestamp: prismaHello.timestamp,
      byes,
      // 계산된 필드
      byesCount: prismaHello.byes.length,
      totalWaveCount,
      isPositiveMood,
    };
  }

  /**
   * Prisma Bye 모델을 ByeResult DTO로 변환
   */
  static byeToResult(prismaBye: Bye): ByeResult {
    return {
      id: prismaBye.id,
      message: prismaBye.message,
      mood: prismaBye.mood,
      waveCount: prismaBye.waveCount,
      // 계산된 필드
      isEnthusiastic: prismaBye.waveCount > this.ENTHUSIASTIC_WAVE_THRESHOLD,
    };
  }

  /**
   * 여러 Hello 모델을 Result DTO 배열로 변환
   */
  static toResultArray(prismaHellos: HelloWithByes[]): HelloResult[] {
    return prismaHellos.map((hello) => this.toResult(hello));
  }

  // ==================== Private Helper Methods ====================

  /**
   * 긍정적인 감정인지 판단
   */
  private static isPositiveMood(mood: MoodType): boolean {
    return this.POSITIVE_MOODS.includes(mood);
  }

  /**
   * 총 손흔들기 횟수 계산
   */
  private static calculateTotalWaveCount(byes: Bye[]): number {
    return byes.reduce((sum, bye) => sum + bye.waveCount, 0);
  }
}
