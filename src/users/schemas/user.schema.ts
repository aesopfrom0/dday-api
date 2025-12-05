import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { idTransformPlugin } from '../../common/plugins/id-transform.plugin';

export type UserDocument = User &
  Document & {
    id: string; // virtual 필드
  };

@Schema({
  collection: 'users',
  timestamps: true,
})
export class User {
  @Prop({ required: true, unique: true, immutable: true })
  email: string;

  @Prop({ required: true })
  name: string;

  @Prop()
  profileImage?: string;

  @Prop({ required: true, enum: ['google', 'apple', 'dev'], immutable: true })
  authProvider: 'google' | 'apple' | 'dev';

  @Prop({ immutable: true })
  googleId?: string;

  @Prop({ immutable: true })
  appleId?: string;

  @Prop({
    type: {
      defaultMilestoneDisplayCount: {
        type: String,
        enum: ['1', '2', '3', 'all'],
        default: '1',
      },
      language: { type: String, enum: ['ko', 'en', 'ja'], default: 'ko' },
      theme: { type: String, enum: ['light', 'dark', 'system'], default: 'system' },
    },
    default: () => ({
      defaultMilestoneDisplayCount: '1',
      language: 'ko',
      theme: 'system',
    }),
  })
  settings: {
    defaultMilestoneDisplayCount: '1' | '2' | '3' | 'all';
    language: 'ko' | 'en' | 'ja';
    theme: 'light' | 'dark' | 'system';
  };

  @Prop({
    type: {
      isPremium: { type: Boolean, default: false },
      expiresAt: { type: Date, required: false },
    },
    default: { isPremium: false },
  })
  subscription: {
    isPremium: boolean;
    expiresAt?: Date;
  };

  @Prop({ type: String, required: true, default: 'Asia/Seoul' })
  timezone: string; // IANA timezone (예: 'Asia/Seoul', 'America/New_York')

  @Prop({ type: [String], default: [] })
  fcmTokens: string[]; // FCM 토큰 배열 (멀티 디바이스 지원)
}

export const UserSchema = SchemaFactory.createForClass(User);

// Plugin 적용
UserSchema.plugin(idTransformPlugin);

// 인덱스 설정 (email은 unique: true로 자동 인덱스 생성)
UserSchema.index({ googleId: 1 });
UserSchema.index({ appleId: 1 });
