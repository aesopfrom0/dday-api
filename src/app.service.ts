import { Injectable } from '@nestjs/common';
import { BaseService } from 'src/base.service';

@Injectable()
export class AppService extends BaseService {
  constructor() {
    super();
  }

  getHello(): string {
    this.logger.debug('logging example');
    return 'Hello World!';
  }
}
