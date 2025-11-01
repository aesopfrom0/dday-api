import { MoodType } from '@prisma/client';

export class EmotionalStatsResult {
  totalHellos: number;
  moodDistribution: Record<MoodType, number>;
  mostFrequentMood: MoodType;
  averageByeResponseRate: number;
  positiveMoodPercentage: number;
  negativeMoodPercentage: number;
}

export class MoodChangeResult {
  previousMood: MoodType | null;
  currentMood: MoodType;
  isImproving: boolean;
  isWorsening: boolean;
  consecutiveSameMoodCount: number;
  suggestion: string;
}
