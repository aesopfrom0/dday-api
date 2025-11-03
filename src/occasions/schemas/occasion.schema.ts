import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type OccasionDocument = Occasion & Document;

@Schema({ collection: 'occasions', timestamps: true })
export class Occasion {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true, type: Date })
  baseDate: Date;

  @Prop({ required: true, enum: ['solar', 'lunar'], default: 'solar' })
  calendarType: 'solar' | 'lunar';

  @Prop({
    required: true,
    enum: [
      'couple',
      'marriage',
      'business',
      'birthday',
      'wedding',
      'baby',
      'military',
      'fandom',
      'debut',
      'payday',
      'quit_smoking',
      'memorial',
      'travel',
    ],
  })
  category:
    | 'couple'
    | 'marriage'
    | 'business'
    | 'birthday'
    | 'wedding'
    | 'baby'
    | 'military'
    | 'fandom'
    | 'debut'
    | 'payday'
    | 'quit_smoking'
    | 'memorial'
    | 'travel';

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
      showElapsed: { type: Boolean, default: true },
      showUpcoming: { type: Boolean, default: true },
      showMilestones: { type: Boolean, default: true },
      milestoneCount: { type: String, enum: ['default', 1, 2, 3, 'all'], default: 'default' },
      showProgress: { type: Boolean, default: true },
    },
    default: {
      showElapsed: true,
      showUpcoming: true,
      showMilestones: true,
      milestoneCount: 'default',
      showProgress: true,
    },
  })
  displayOptions: {
    showElapsed: boolean;
    showUpcoming: boolean;
    showMilestones: boolean;
    milestoneCount: 'default' | 1 | 2 | 3 | 'all';
    showProgress: boolean;
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
  recurringRules: {
    yearly: boolean;
    monthly: boolean;
    weekly: boolean;
    every100days: boolean;
    every1000days: boolean;
  };

  @Prop({
    type: [
      {
        name: { type: String, required: true },
        targetDate: { type: Date, required: true },
      },
    ],
    default: [],
  })
  customMilestones: Array<{
    name: string;
    targetDate: Date;
  }>;
}

export const OccasionSchema = SchemaFactory.createForClass(Occasion);

// 인덱스 설정
OccasionSchema.index({ userId: 1, baseDate: -1 });
OccasionSchema.index({ userId: 1, category: 1 });
