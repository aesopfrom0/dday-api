import { Controller, Post, Get, Delete, Body, UseGuards, Request, Res } from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { AppleLoginDto } from './dto/apple-login.dto';
import { DevLoginDto } from './dto/dev-login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('google')
  @UseGuards(GoogleAuthGuard)
  async googleAuth() {
    // Guard redirects to Google
  }

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  async googleAuthCallback(@Request() req, @Res() res: Response) {
    const user = await this.authService.validateGoogleUser(req.user);
    const tokens = await this.authService.generateTokens(user);

    // 프론트엔드로 리다이렉트하면서 토큰 전달 (deep link 등)
    // 실제 구현시에는 프론트엔드 URL로 리다이렉트
    return res.json(tokens);
  }

  @Post('apple')
  async appleAuth(@Body() appleLoginDto: AppleLoginDto) {
    const user = await this.authService.validateAppleUser(appleLoginDto);
    return this.authService.generateTokens(user);
  }

  @Post('dev-login')
  async devLogin(@Body() devLoginDto: DevLoginDto) {
    const user = await this.authService.devLogin(devLoginDto);
    return this.authService.generateTokens(user);
  }

  @Post('refresh')
  async refresh(@Body('refreshToken') refreshToken: string) {
    return this.authService.refreshAccessToken(refreshToken);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Request() req) {
    return req.user;
  }

  @Delete('logout')
  @UseGuards(JwtAuthGuard)
  async logout() {
    // JWT는 stateless이므로 서버에서 할 일이 없음
    // 클라이언트에서 토큰 삭제
    return { message: 'Logged out successfully' };
  }
}
