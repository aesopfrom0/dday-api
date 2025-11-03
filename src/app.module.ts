import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import configuration from 'src/config/configuration';
import { validateSchema } from 'src/config/validate-schema';
import { DatabaseModule } from './provider/database/database.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: `.env.${process.env.NODE_ENV || '.env.local'}`, // 환경별 파일
      load: [configuration],
      validationSchema: validateSchema(),
      validationOptions: {
        abortEarly: true,
      },
    }),
    DatabaseModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
