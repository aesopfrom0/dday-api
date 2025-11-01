import { Module } from '@nestjs/common';
import { PrismaService } from 'src/provider/database/prisma.service';
import { HelloRepository } from 'src/provider/database/repository/hello.repository';

@Module({
  providers: [PrismaService, HelloRepository],
  exports: [PrismaService, HelloRepository],
})
export class DatabaseModule {}
