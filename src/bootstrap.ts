import { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';
import { ValidationPipe } from '@nestjs/common';
import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';
import { MongoIdTransformInterceptor } from './common/interceptors/mongo-id-transform.interceptor';

export interface AppOptions {
  expressApp?: express.Express;
}

export async function createApp(options: AppOptions = {}): Promise<INestApplication> {
  // Express 인스턴스가 제공되면 사용하고, 아니면 새로 생성
  const app = options.expressApp
    ? await NestFactory.create(AppModule, new ExpressAdapter(options.expressApp))
    : await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);

  // ValidationPipe 설정
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
    }),
  );

  // MongoDB _id -> id 변환 인터셉터
  app.useGlobalInterceptors(new MongoIdTransformInterceptor());

  // CORS 설정
  app.enableCors();

  app.enableShutdownHooks();
  app.use(cookieParser());

  // 개발 환경과 프로덕션 환경 구분
  const environment = configService.get('app.environment');
  console.log('environment ===> ', environment);

  return app;
}
