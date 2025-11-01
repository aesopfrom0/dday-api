import { MoodType } from '@prisma/client';

export class HelloResult {
  id: number;
  message: string;
  mood: MoodType;
  timestamp: Date;
  byes: ByeResult[];

  // 계산된 필드
  byesCount: number;
  totalWaveCount: number;
  isPositiveMood: boolean;
}

export class ByeResult {
  id: number;
  message: string;
  mood: MoodType;
  waveCount: number;

  // 계산된 필드
  isEnthusiastic: boolean;
}
