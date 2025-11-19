import { Expose, Type } from 'class-transformer';

class SettingsResponseDto {
  @Expose()
  defaultMilestoneDisplayCount: 1 | 2 | 3 | 'all';

  @Expose()
  language: 'ko' | 'en' | 'ja';

  @Expose()
  theme: 'light' | 'dark' | 'system';
}

class SubscriptionResponseDto {
  @Expose()
  isPremium: boolean;

  @Expose()
  expiresAt?: Date;
}

export class UserResponseDto {
  @Expose()
  id: string;

  @Expose()
  email: string;

  @Expose()
  name: string;

  @Expose()
  profileImage?: string;

  @Expose()
  authProvider: 'google' | 'apple' | 'dev';

  @Expose()
  @Type(() => SettingsResponseDto)
  settings: SettingsResponseDto;

  @Expose()
  @Type(() => SubscriptionResponseDto)
  subscription: SubscriptionResponseDto;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  constructor(partial: Partial<UserResponseDto>) {
    Object.assign(this, partial);
  }
}
