import { Injectable, UnauthorizedException, BadRequestException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { UserDocument } from '../users/schemas/user.schema';
import { JwtPayload } from './strategies/jwt.strategy';
import appleSignin from 'apple-signin-auth';
import { AppleLoginDto } from './dto/apple-login.dto';
import { DevLoginDto } from './dto/dev-login.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async generateTokens(user: UserDocument) {
    const payload: JwtPayload = {
      sub: user._id.toString(),
      email: user.email,
      authProvider: user.authProvider,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: '3h', // 개발 편의성과 보안 균형 (3시간)
    });

    const refreshToken = this.jwtService.sign(
      { sub: user._id.toString() },
      {
        expiresIn: '60d', // Rolling Refresh Token: 사용할 때마다 갱신
      },
    );

    return {
      accessToken,
      refreshToken,
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        profileImage: user.profileImage,
        authProvider: user.authProvider,
        settings: user.settings,
        subscription: user.subscription,
      },
    };
  }

  async validateGoogleUser(profile: any): Promise<UserDocument> {
    const { googleId, email, name, profileImage } = profile;

    let user = await this.usersService.findByGoogleId(googleId);

    if (!user) {
      user = await this.usersService.findByEmail(email);
      if (user) {
        throw new BadRequestException('Email already registered with different provider');
      }
      user = await this.usersService.create({
        email,
        name,
        profileImage,
        googleId,
        authProvider: 'google',
      });
    }

    return user;
  }

  async validateAppleUser(appleLoginDto: AppleLoginDto): Promise<UserDocument> {
    const { identityToken, email, name } = appleLoginDto;

    try {
      const appleIdTokenClaims = await appleSignin.verifyIdToken(identityToken, {
        audience: this.configService.get<string>('APPLE_CLIENT_ID'),
        ignoreExpiration: false,
      });

      const appleId = appleIdTokenClaims.sub;

      let user = await this.usersService.findByAppleId(appleId);

      if (!user) {
        if (!email) {
          throw new BadRequestException('Email is required for first-time Apple sign in');
        }

        const existingUser = await this.usersService.findByEmail(email);
        if (existingUser) {
          throw new BadRequestException('Email already registered with different provider');
        }

        user = await this.usersService.create({
          email,
          name: name || 'Apple User',
          appleId,
          authProvider: 'apple',
        });
      }

      return user;
    } catch (error) {
      this.logger.error(
        `[${this.validateAppleUser.name}] Apple 로그인 실패 - error: ${error.message}`,
        error.stack,
      );
      throw new UnauthorizedException('Invalid Apple token');
    }
  }

  async devLogin(devLoginDto: DevLoginDto): Promise<UserDocument> {
    const nodeEnv = this.configService.get<string>('NODE_ENV');

    if (nodeEnv !== 'development' && nodeEnv !== 'local') {
      throw new UnauthorizedException('Dev login only available in development mode');
    }

    const { email, name } = devLoginDto;

    let user = await this.usersService.findByEmail(email);

    if (!user) {
      user = await this.usersService.create({
        email,
        name: name || 'Dev User',
        authProvider: 'dev',
      });
    }

    return user;
  }

  async refreshAccessToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken);
      const user = await this.usersService.findById(payload.sub);

      const newAccessToken = this.jwtService.sign(
        {
          sub: user._id.toString(),
          email: user.email,
          authProvider: user.authProvider,
        } as JwtPayload,
        {
          expiresIn: '3h', // 개발 편의성과 보안 균형 (3시간)
        },
      );

      // Rolling Refresh Token: 새로운 Refresh Token도 함께 발급
      const newRefreshToken = this.jwtService.sign(
        { sub: user._id.toString() },
        {
          expiresIn: '60d', // 사용할 때마다 60일로 리셋
        },
      );

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken, // 새로운 Refresh Token 반환
      };
    } catch (error) {
      this.logger.error(
        `[${this.refreshAccessToken.name}] 토큰 갱신 실패 - error: ${error.message}`,
        error.stack,
      );
      throw new UnauthorizedException('Invalid refresh token');
    }
  }
}
