import { Injectable, CanActivate, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Environment } from '../../common/constant/environment';

@Injectable()
export class DevOnlyGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(): boolean {
    const env = this.configService.get<string>('app.environment');

    if (env !== Environment.DEVELOPMENT && env !== Environment.LOCAL) {
      throw new UnauthorizedException('Dev login only available in development mode');
    }

    return true;
  }
}
