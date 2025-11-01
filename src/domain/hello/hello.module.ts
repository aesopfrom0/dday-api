import { Module } from '@nestjs/common';
import { HelloController } from './hello.controller';
import { HelloService } from './hello.service';
import { DatabaseModule } from 'src/provider/database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [HelloController],
  providers: [HelloService],
})
export class HelloModule {}
