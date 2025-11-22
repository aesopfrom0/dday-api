import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { idTransformPlugin } from '../../common/plugins/id-transform.plugin';

export type OccasionDocument = Occasion &
  Document & {
    id: string; // virtual 필드
  };

@Schema({
  collection: 'occasions',
  timestamps: true,
})
export class Occasion {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, immutable: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  name: string;

  // 날짜만 저장 (시간대 문제 방지)
  // 형식: "YYYY-MM-DD" (예: "2025-08-15")
  // 절대적 날짜: 모든 시간대에서 같은 날짜로 표시
  @Prop({ required: true, type: String })
  baseDate: string;

  @Prop({ required: true, enum: ['solar', 'lunar'], default: 'solar' })
  calendarType: 'solar' | 'lunar';

  @Prop({
    required: true,
    enum: [
      'couple',
      'marriage',
      'birthday',
      'wedding',
      'baby',
      'military',
      'fandom',
      'debut',
      'payday',
      'quitSmoking',
      'memorial',
      'travel',
      'others',
    ],
  })
  category:
    | 'couple'
    | 'marriage'
    | 'birthday'
    | 'wedding'
    | 'baby'
    | 'military'
    | 'fandom'
    | 'debut'
    | 'payday'
    | 'quitSmoking'
    | 'memorial'
    | 'travel'
    | 'others';

  @Prop({ required: true, default: true })
  isNotificationEnabled: boolean;

  @Prop({
    type: {
      year: { type: Boolean, default: false },
      month: { type: Boolean, default: false },
      week: { type: Boolean, default: false },
      day: { type: Boolean, default: true },
      hour: { type: Boolean, default: false },
      minute: { type: Boolean, default: false },
      second: { type: Boolean, default: false },
    },
    default: {
      year: false,
      month: false,
      week: false,
      day: true,
      hour: false,
      minute: false,
      second: false,
    },
  })
  displayUnits: {
    year: boolean;
    month: boolean;
    week: boolean;
    day: boolean;
    hour: boolean;
    minute: boolean;
    second: boolean;
  };

  @Prop({
    type: {
      showProgress: { type: Boolean, default: true },
      showCumulativeDuration: { type: Boolean, default: true },
    },
    default: {
      showProgress: true,
      showCumulativeDuration: true,
    },
  })
  displayOptions: {
    showProgress: boolean;
    showCumulativeDuration: boolean;
  };

  @Prop({
    type: {
      yearly: { type: Boolean, default: false },
      monthly: { type: Boolean, default: false },
      weekly: { type: Boolean, default: false },
      every100days: { type: Boolean, default: false },
      every1000days: { type: Boolean, default: false },
    },
    default: {
      yearly: false,
      monthly: false,
      weekly: false,
      every100days: false,
      every1000days: false,
    },
  })
  suggestionRules: {
    yearly: boolean;
    monthly: boolean;
    weekly: boolean;
    every100days: boolean;
    every1000days: boolean;
  };

  @Prop({
    type: [
      {
        id: { type: String, required: true },
        name: { type: String, required: true },
        // 날짜만 저장 (시간대 문제 방지)
        // 형식: "YYYY-MM-DD" (예: "2026-04-23")
        targetDate: { type: String, required: true },
        description: { type: String },
        isFromSuggestion: { type: Boolean, default: false },
        suggestionType: { type: String },
        suggestionValue: { type: Number },
      },
    ],
    default: [],
  })
  milestones: Array<{
    id: string;
    name: string;
    targetDate: string;
    description?: string;
    isFromSuggestion?: boolean;
    suggestionType?: string;
    suggestionValue?: number;
  }>;

  @Prop({ type: [String], default: [] })
  excludedMilestones: string[];

  @Prop({ default: false })
  isPinned: boolean;

  @Prop({ type: String })
  nextMilestoneDate?: string; // 가장 가까운 upcoming 마일스톤 캐시 (YYYY-MM-DD)
}

export const OccasionSchema = SchemaFactory.createForClass(Occasion);

// Plugin 적용
OccasionSchema.plugin(idTransformPlugin);

// 인덱스 설정
OccasionSchema.index({ userId: 1, baseDate: -1 });
OccasionSchema.index({ userId: 1, category: 1 });
OccasionSchema.index({ userId: 1, isPinned: -1, nextMilestoneDate: 1, baseDate: -1 }); // 정렬용 복합 인덱스
