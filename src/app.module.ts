import { Module, OnModuleInit } from '@nestjs/common';
import { APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import configuration from 'src/config/configuration';
import { validateSchema } from 'src/config/validate-schema';
import { DatabaseModule } from './provider/database/database.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { OccasionsModule } from './occasions/occasions.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ScheduleModule } from '@nestjs/schedule';
import { PerformanceLoggingInterceptor } from './common/interceptors/performance-logging.interceptor';
import { GlobalExceptionFilter } from './common/filter/global-exception.filter';
import * as admin from 'firebase-admin';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: `.env.${process.env.NODE_ENV || '.env.local'}`, // 환경별 파일
      load: [configuration],
      validationSchema: validateSchema(),
      validationOptions: {
        abortEarly: true,
      },
      isGlobal: true, // ConfigModule을 전역으로 사용
    }),
    ScheduleModule.forRoot(),
    DatabaseModule,
    AuthModule,
    UsersModule,
    OccasionsModule,
    NotificationsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // 전역 인터셉터: API 성능 측정
    {
      provide: APP_INTERCEPTOR,
      useClass: PerformanceLoggingInterceptor,
    },
    // 전역 예외 필터: 에러 코드 자동 생성
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
  ],
})
export class AppModule implements OnModuleInit {
  onModuleInit() {
    // Firebase Admin 초기화
    if (!admin.apps.length) {
      const projectId = process.env.FIREBASE_PROJECT_ID;
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

      if (projectId && clientEmail && privateKey) {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId,
            clientEmail,
            privateKey,
          }),
        });
        console.log('✅ Firebase Admin initialized');
      } else {
        console.warn('⚠️  Firebase credentials not found - push notifications will not work');
      }
    }
  }
}
