import { Controller, Get, Patch, Body, UseGuards, Post, Delete } from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { RegisterFcmTokenDto } from './dto/register-fcm-token.dto';
import { UpdateTimezoneDto } from './dto/update-timezone.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserData } from '../auth/decorators/current-user.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('settings')
  async getSettings(@CurrentUser() user: CurrentUserData) {
    return this.usersService.getSettings(user.userId);
  }

  @Patch('settings')
  async updateSettings(
    @CurrentUser() user: CurrentUserData,
    @Body() updateSettingsDto: UpdateSettingsDto,
  ) {
    return this.usersService.updateSettings(user.userId, updateSettingsDto);
  }

  @Post('fcm-token')
  async registerFcmToken(@CurrentUser() user: CurrentUserData, @Body() dto: RegisterFcmTokenDto) {
    return this.usersService.registerFcmToken(user.userId, dto.token);
  }

  @Delete('fcm-token')
  async removeFcmToken(@CurrentUser() user: CurrentUserData, @Body() dto: RegisterFcmTokenDto) {
    return this.usersService.removeFcmToken(user.userId, dto.token);
  }

  @Patch('timezone')
  async updateTimezone(@CurrentUser() user: CurrentUserData, @Body() dto: UpdateTimezoneDto) {
    return this.usersService.updateTimezone(user.userId, dto.timezone);
  }
}
