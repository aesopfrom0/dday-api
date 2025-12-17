import { Environment } from 'src/common/constant/environment';

export default () => ({
  app: {
    environment: process.env.NODE_ENV || Environment.LOCAL,
    port: +process.env.PORT,
    allowedCorsOrigins: process.env.ALLOWED_CORS_ORIGIN?.split(',') || [],
  },
  database: {
    uri: process.env.MONGODB_URI,
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    iosClientId: process.env.GOOGLE_IOS_CLIENT_ID,
    androidClientId: process.env.GOOGLE_ANDROID_CLIENT_ID,
    callbackUrl: process.env.GOOGLE_CALLBACK_URL,
  },
  apple: {
    clientId: process.env.APPLE_CLIENT_ID,
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    accessTokenExpiration: process.env.JWT_ACCESS_TOKEN_EXPIRATION || '3h',
    refreshTokenExpiration: process.env.JWT_REFRESH_TOKEN_EXPIRATION || '60d',
  },
  limits: {
    free: {
      maxPinnedOccasions: +(process.env.FREE_MAX_PINNED_OCCASIONS || 5),
      maxMilestonesPerOccasion: +(process.env.FREE_MAX_MILESTONES_PER_OCCASION || 5),
    },
    premium: {
      maxPinnedOccasions: -1, // unlimited
      maxMilestonesPerOccasion: -1, // unlimited
    },
  },
});
