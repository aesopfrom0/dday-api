import { Injectable, UnauthorizedException, BadRequestException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import { UsersService } from '../users/users.service';
import { UserDocument } from '../users/schemas/user.schema';
import { JwtPayload } from './strategies/jwt.strategy';
import appleSignin from 'apple-signin-auth';
import { AppleLoginDto } from './dto/apple-login.dto';
import { DevLoginDto } from './dto/dev-login.dto';
import { GoogleLoginDto } from './dto/google-login.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private googleClient: OAuth2Client;

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {
    // Google OAuth2 클라이언트 초기화
    this.googleClient = new OAuth2Client(this.configService.get<string>('google.clientId'));
  }

  async generateTokens(user: UserDocument) {
    const payload: JwtPayload = {
      sub: user._id.toString(),
      email: user.email,
      authProvider: user.authProvider,
    };

    const accessTokenExpiration = this.configService.get('jwt.accessTokenExpiration') || '3h';
    const refreshTokenExpiration = this.configService.get('jwt.refreshTokenExpiration') || '60d';

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: accessTokenExpiration,
    });

    const refreshToken = this.jwtService.sign(
      { sub: user._id.toString() },
      {
        expiresIn: refreshTokenExpiration,
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

  /**
   * 모바일 앱용 Google 로그인
   * ID Token을 검증하고 사용자를 생성/조회
   */
  async googleLogin(googleLoginDto: GoogleLoginDto): Promise<UserDocument> {
    const { idToken } = googleLoginDto;

    try {
      // Google ID Token 검증
      // audience: Web Client ID + iOS Client ID + Android Client ID 모두 허용
      const audiences = [this.configService.get<string>('google.clientId')];
      const iosClientId = this.configService.get<string>('google.iosClientId');
      const androidClientId = this.configService.get<string>('google.androidClientId');
      if (iosClientId) {
        audiences.push(iosClientId);
      }
      if (androidClientId) {
        audiences.push(androidClientId);
      }

      const ticket = await this.googleClient.verifyIdToken({
        idToken,
        audience: audiences,
      });

      const payload = ticket.getPayload();
      if (!payload) {
        throw new UnauthorizedException('Invalid Google token payload');
      }

      const { sub: googleId, email, name, picture: profileImage } = payload;

      if (!email) {
        throw new BadRequestException('Email is required from Google');
      }

      // 기존 사용자 조회 또는 신규 생성
      let user = await this.usersService.findByGoogleId(googleId);

      if (!user) {
        // 이메일로 기존 사용자 확인
        const existingUser = await this.usersService.findByEmail(email);
        if (existingUser) {
          // 이미 다른 방식으로 가입한 경우 Google ID 연결
          if (existingUser.authProvider !== 'google') {
            throw new BadRequestException('Email already registered with different provider');
          }
          user = existingUser;
        } else {
          // 신규 사용자 생성
          user = await this.usersService.create({
            email,
            name: name || 'Google User',
            profileImage,
            googleId,
            authProvider: 'google',
          });
        }
      }

      return user;
    } catch (error) {
      this.logger.error(
        `[${this.googleLogin.name}] Google 로그인 실패 - error: ${error.message}`,
        error.stack,
      );

      if (error instanceof BadRequestException || error instanceof UnauthorizedException) {
        throw error;
      }

      throw new UnauthorizedException('Invalid Google token');
    }
  }

  async validateAppleUser(appleLoginDto: AppleLoginDto): Promise<UserDocument> {
    const { identityToken, email, name } = appleLoginDto;

    try {
      const appleIdTokenClaims = await appleSignin.verifyIdToken(identityToken, {
        audience: this.configService.get<string>('apple.clientId'),
        ignoreExpiration: false,
      });

      const appleId = appleIdTokenClaims.sub;
      const tokenEmail = appleIdTokenClaims.email; // 토큰에도 이메일이 포함될 수 있음

      this.logger.log(
        `[${this.validateAppleUser.name}] Apple 로그인 시도 - appleId: ${appleId}, tokenEmail: ${tokenEmail}, dtoEmail: ${email}`,
      );

      let user = await this.usersService.findByAppleId(appleId);

      if (!user) {
        // 클라이언트에서 전달한 email 또는 토큰에 포함된 email 사용
        const userEmail = email || tokenEmail;

        if (!userEmail) {
          throw new BadRequestException('Email is required for first-time Apple sign in');
        }

        const existingUser = await this.usersService.findByEmail(userEmail);
        if (existingUser) {
          throw new BadRequestException('Email already registered with different provider');
        }

        user = await this.usersService.create({
          email: userEmail,
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

      if (error instanceof BadRequestException || error instanceof UnauthorizedException) {
        throw error;
      }

      throw new UnauthorizedException('Invalid Apple token');
    }
  }

  async devLogin(devLoginDto: DevLoginDto): Promise<UserDocument> {
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

      const accessTokenExpiration = this.configService.get('jwt.accessTokenExpiration') || '3h';
      const refreshTokenExpiration = this.configService.get('jwt.refreshTokenExpiration') || '60d';

      const newAccessToken = this.jwtService.sign(
        {
          sub: user._id.toString(),
          email: user.email,
          authProvider: user.authProvider,
        } as JwtPayload,
        {
          expiresIn: accessTokenExpiration,
        },
      );

      // Rolling Refresh Token: 새로운 Refresh Token도 함께 발급
      const newRefreshToken = this.jwtService.sign(
        { sub: user._id.toString() },
        {
          expiresIn: refreshTokenExpiration,
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
