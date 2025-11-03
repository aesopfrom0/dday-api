import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import configuration from 'src/config/configuration';
import { validateSchema } from 'src/config/validate-schema';
import { DatabaseModule } from './provider/database/database.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { OccasionsModule } from './occasions/occasions.module';

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
    DatabaseModule,
    AuthModule,
    UsersModule,
    OccasionsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
