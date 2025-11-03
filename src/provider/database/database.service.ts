// src/provider/database/database.service.ts
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  async onModuleInit() {
    console.log('MongoDB connected successfully');
  }

  async onModuleDestroy() {
    await this.connection.close();
  }

  getConnection(): Connection {
    return this.connection;
  }
}
