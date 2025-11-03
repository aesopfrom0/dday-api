import { Controller, Get, Patch, Body, UseGuards, Request } from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('settings')
  async getSettings(@Request() req) {
    return this.usersService.getSettings(req.user.userId);
  }

  @Patch('settings')
  async updateSettings(@Request() req, @Body() updateSettingsDto: UpdateSettingsDto) {
    return this.usersService.updateSettings(req.user.userId, updateSettingsDto);
  }
}
