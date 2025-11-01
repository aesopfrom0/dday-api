import { Injectable, BadRequestException } from '@nestjs/common';
import { MoodType } from '@prisma/client';
import { BaseService } from 'src/base.service';
import { HelloQuery } from 'src/common/dto/query/hello';
import { CreateHello } from 'src/common/dto/command/hello';
import { HelloResult, ByeResult } from 'src/common/dto/result/hello';
import { PaginationResult } from 'src/common/dto/result/pagination';
import { EmotionalStatsResult, MoodChangeResult } from 'src/common/dto/result/emotional-stats';
import { HelloRepository } from 'src/provider/database/repository/hello.repository';
import { SortOrder } from 'src/common/constant/sort-order';

/**
 * HelloService - Rich Service Pattern
 *
 * 역할:
 * - 모든 비즈니스 로직 처리
 * - 비즈니스 규칙 검증
 * - 데이터 가공 및 분석
 * - 복잡한 워크플로우 조율
 *
 * Repository와의 차이:
 * - Service: 비즈니스 로직 중심 (무엇을 할지)
 * - Repository: 데이터 접근만 (어떻게 저장/조회할지)
 *
 * 예시:
 * - ✅ Service: 같은 감정 3번 연속 등록 방지
 * - ✅ Service: 감정 통계 분석 및 제안
 * - ✅ Service: 자동 응답 메시지 생성
 * - ❌ Repository: 단순 CRUD만 수행
 */
@Injectable()
export class HelloService extends BaseService {
  private readonly POSITIVE_MOODS: MoodType[] = [MoodType.HAPPY, MoodType.EXCITED];
  private readonly NEGATIVE_MOODS: MoodType[] = [MoodType.SLEEPY, MoodType.HUNGRY];
  private readonly MAX_CONSECUTIVE_SAME_MOOD = 3;

  constructor(private helloRepository: HelloRepository) {
    super();
  }

  /**
   * Hello 생성 with 비즈니스 규칙 검증
   */
  async addHello(dto: CreateHello): Promise<HelloResult> {
    // 비즈니스 규칙 1: 같은 감정 연속 3번 이상 방지
    await this.validateConsecutiveSameMood(dto.mood);

    // 비즈니스 규칙 2: 부정적 감정일 경우 메시지 자동 개선
    const enhancedDto = this.enhanceMessageForNegativeMood(dto);

    return await this.helloRepository.create(enhancedDto);
  }

  /**
   * 페이지네이션된 Hello 목록 조회
   */
  async getHellos(queryDto: HelloQuery = {}): Promise<PaginationResult<HelloResult>> {
    return await this.helloRepository.findAll(queryDto);
  }

  /**
   * ID로 Hello 조회
   */
  async findHelloById(id: number): Promise<HelloResult> {
    return await this.helloRepository.findById(id);
  }

  /**
   * 행복한 Hello들만 조회
   */
  async findHappyHellos(): Promise<PaginationResult<HelloResult>> {
    const queryDto: HelloQuery = {
      moodTypes: [MoodType.HAPPY],
    };
    return await this.helloRepository.findAll(queryDto);
  }

  /**
   * 긍정적인 Hello들 조회 (HAPPY 또는 EXCITED)
   */
  async findPositiveHellos(): Promise<PaginationResult<HelloResult>> {
    const queryDto: HelloQuery = {
      moodTypes: this.POSITIVE_MOODS,
    };
    return await this.helloRepository.findAll(queryDto);
  }

  /**
   * 감정 통계 분석 (Rich Service 로직)
   */
  async getEmotionalStats(): Promise<EmotionalStatsResult> {
    const allHellos = await this.helloRepository.findAll({ take: 10000 });

    // 감정별 분포 계산
    const moodDistribution = this.calculateMoodDistribution(allHellos.items);

    // 가장 빈번한 감정 찾기
    const mostFrequentMood = this.findMostFrequentMood(moodDistribution);

    // 평균 Bye 응답률 계산
    const averageByeResponseRate = this.calculateAverageByeResponseRate(allHellos.items);

    // 긍정/부정 감정 비율 계산
    const { positiveMoodPercentage, negativeMoodPercentage } = this.calculateMoodPercentages(
      allHellos.items,
    );

    return {
      totalHellos: allHellos.pagination.totalCount,
      moodDistribution,
      mostFrequentMood,
      averageByeResponseRate,
      positiveMoodPercentage,
      negativeMoodPercentage,
    };
  }

  /**
   * 감정 변화 분석 (Rich Service 로직)
   */
  async analyzeMoodChange(newMood: MoodType): Promise<MoodChangeResult> {
    // 최근 Hello 조회
    const recentHellos = await this.helloRepository.findAll({
      take: 5,
      orderBy: { timestamp: SortOrder.DESC },
    });

    const previousMood = recentHellos.items[0]?.mood || null;

    // 감정 개선/악화 여부 판단
    const isImproving = this.isMoodImproving(previousMood, newMood);
    const isWorsening = this.isMoodWorsening(previousMood, newMood);

    // 연속 같은 감정 카운트
    const consecutiveSameMoodCount = this.countConsecutiveSameMood(recentHellos.items, newMood);

    // 제안 메시지 생성
    const suggestion = this.generateMoodSuggestion(
      newMood,
      isImproving,
      isWorsening,
      consecutiveSameMoodCount,
    );

    return {
      previousMood,
      currentMood: newMood,
      isImproving,
      isWorsening,
      consecutiveSameMoodCount,
      suggestion,
    };
  }

  /**
   * 비슷한 감정의 Hello 매칭 추천 (Rich Service 로직)
   */
  async findMatchingHellos(helloId: number): Promise<HelloResult[]> {
    const targetHello = await this.helloRepository.findById(helloId);

    // 같은 감정의 다른 Hello들 찾기
    const matches = await this.helloRepository.findAll({
      moodTypes: [targetHello.mood],
      take: 5,
    });

    // 자기 자신 제외
    return matches.items.filter((h) => h.id !== helloId);
  }

  /**
   * Hello의 감정에 따라 자동 Bye 생성 (Rich Service 로직)
   */
  async createAutoByeResponse(helloId: number): Promise<ByeResult> {
    const hello = await this.helloRepository.findById(helloId);

    // 감정에 따라 다른 waveCount 설정
    const waveCount = this.calculateOptimalWaveCount(hello.mood);

    // 감정에 맞는 메시지 생성
    const message = this.generateByeMessage(hello.mood);

    const byeData = {
      message,
      mood: hello.mood,
      waveCount,
    };

    return await this.helloRepository.createBye(helloId, byeData);
  }

  // ==================== Private Helper Methods ====================

  /**
   * 같은 감정 연속 검증
   */
  private async validateConsecutiveSameMood(mood: MoodType): Promise<void> {
    const recentHellos = await this.helloRepository.findAll({
      take: this.MAX_CONSECUTIVE_SAME_MOOD,
      orderBy: { timestamp: SortOrder.DESC },
    });

    const consecutiveCount = this.countConsecutiveSameMood(recentHellos.items, mood);

    if (consecutiveCount >= this.MAX_CONSECUTIVE_SAME_MOOD) {
      throw new BadRequestException(
        `같은 감정(${mood})을 ${this.MAX_CONSECUTIVE_SAME_MOOD}번 이상 연속으로 등록할 수 없습니다.`,
      );
    }
  }

  /**
   * 부정적 감정일 경우 메시지 개선
   */
  private enhanceMessageForNegativeMood(dto: CreateHello): CreateHello {
    if (this.NEGATIVE_MOODS.includes(dto.mood)) {
      return {
        ...dto,
        message: `${dto.message} (힘내세요! 곧 나아질 거예요 💪)`,
      };
    }
    return dto;
  }

  /**
   * 감정별 분포 계산
   */
  private calculateMoodDistribution(hellos: HelloResult[]): Record<MoodType, number> {
    const distribution = {
      [MoodType.HAPPY]: 0,
      [MoodType.EXCITED]: 0,
      [MoodType.SLEEPY]: 0,
      [MoodType.HUNGRY]: 0,
    };

    hellos.forEach((hello) => {
      distribution[hello.mood]++;
    });

    return distribution;
  }

  /**
   * 가장 빈번한 감정 찾기
   */
  private findMostFrequentMood(distribution: Record<MoodType, number>): MoodType {
    return Object.entries(distribution).reduce((a, b) => (a[1] > b[1] ? a : b))[0] as MoodType;
  }

  /**
   * 평균 Bye 응답률 계산
   */
  private calculateAverageByeResponseRate(hellos: HelloResult[]): number {
    if (hellos.length === 0) return 0;

    const totalByes = hellos.reduce((sum, hello) => sum + hello.byes.length, 0);
    return totalByes / hellos.length;
  }

  /**
   * 긍정/부정 감정 비율 계산
   */
  private calculateMoodPercentages(hellos: HelloResult[]): {
    positiveMoodPercentage: number;
    negativeMoodPercentage: number;
  } {
    if (hellos.length === 0) {
      return { positiveMoodPercentage: 0, negativeMoodPercentage: 0 };
    }

    const positiveCount = hellos.filter((h) => this.POSITIVE_MOODS.includes(h.mood)).length;
    const negativeCount = hellos.filter((h) => this.NEGATIVE_MOODS.includes(h.mood)).length;

    return {
      positiveMoodPercentage: (positiveCount / hellos.length) * 100,
      negativeMoodPercentage: (negativeCount / hellos.length) * 100,
    };
  }

  /**
   * 감정 개선 여부 판단
   */
  private isMoodImproving(previousMood: MoodType | null, currentMood: MoodType): boolean {
    if (!previousMood) return false;

    return this.NEGATIVE_MOODS.includes(previousMood) && this.POSITIVE_MOODS.includes(currentMood);
  }

  /**
   * 감정 악화 여부 판단
   */
  private isMoodWorsening(previousMood: MoodType | null, currentMood: MoodType): boolean {
    if (!previousMood) return false;

    return this.POSITIVE_MOODS.includes(previousMood) && this.NEGATIVE_MOODS.includes(currentMood);
  }

  /**
   * 연속 같은 감정 카운트
   */
  private countConsecutiveSameMood(hellos: HelloResult[], targetMood: MoodType): number {
    let count = 0;
    for (const hello of hellos) {
      if (hello.mood === targetMood) {
        count++;
      } else {
        break;
      }
    }
    return count;
  }

  /**
   * 감정 기반 제안 메시지 생성
   */
  private generateMoodSuggestion(
    mood: MoodType,
    isImproving: boolean,
    isWorsening: boolean,
    consecutiveCount: number,
  ): string {
    if (isImproving) {
      return '기분이 좋아지고 있네요! 계속 긍정적인 에너지를 유지하세요.';
    }

    if (isWorsening) {
      return '기분이 조금 안 좋아진 것 같아요. 잠시 휴식을 취해보는 건 어떨까요?';
    }

    if (consecutiveCount >= 2) {
      return `${mood} 감정이 계속되고 있어요. 기분 전환이 필요할 수 있습니다.`;
    }

    return this.POSITIVE_MOODS.includes(mood)
      ? '좋은 기분을 유지하고 계시네요!'
      : '기분이 좋지 않으시군요. 힘내세요!';
  }

  /**
   * 감정에 따른 최적의 waveCount 계산
   */
  private calculateOptimalWaveCount(mood: MoodType): number {
    switch (mood) {
      case MoodType.HAPPY:
        return 3;
      case MoodType.EXCITED:
        return 5;
      case MoodType.SLEEPY:
        return 1;
      case MoodType.HUNGRY:
        return 2;
      default:
        return 1;
    }
  }

  /**
   * 감정에 맞는 Bye 메시지 생성
   */
  private generateByeMessage(mood: MoodType): string {
    switch (mood) {
      case MoodType.HAPPY:
        return '즐거운 하루 보내세요! 😊';
      case MoodType.EXCITED:
        return '신나는 하루 되세요! 🎉';
      case MoodType.SLEEPY:
        return '푹 쉬세요~ 😴';
      case MoodType.HUNGRY:
        return '맛있는 식사 하세요! 🍽️';
      default:
        return '안녕히 가세요!';
    }
  }
}
