import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { OccasionsService } from './occasions.service';
import { CreateOccasionDto } from './dto/create-occasion.dto';
import { UpdateOccasionDto } from './dto/update-occasion.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserData } from '../auth/decorators/current-user.decorator';

@Controller('occasions')
@UseGuards(JwtAuthGuard)
export class OccasionsController {
  constructor(private readonly occasionsService: OccasionsService) {}

  @Post()
  async create(@CurrentUser() user: CurrentUserData, @Body() createOccasionDto: CreateOccasionDto) {
    return this.occasionsService.create(user.userId, createOccasionDto);
  }

  @Get()
  async findAll(@CurrentUser() user: CurrentUserData, @Query('category') category?: string) {
    return this.occasionsService.findAll(user.userId, category);
  }

  @Get(':id')
  async findOne(@CurrentUser() user: CurrentUserData, @Param('id') id: string) {
    return this.occasionsService.findOne(user.userId, id);
  }

  @Put(':id')
  async update(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
    @Body() updateOccasionDto: UpdateOccasionDto,
  ) {
    return this.occasionsService.update(user.userId, id, updateOccasionDto);
  }

  @Patch(':id')
  async patch(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
    @Body() updateOccasionDto: UpdateOccasionDto,
  ) {
    return this.occasionsService.update(user.userId, id, updateOccasionDto);
  }

  @Delete(':id')
  async remove(@CurrentUser() user: CurrentUserData, @Param('id') id: string) {
    await this.occasionsService.remove(user.userId, id);
    return { message: 'Occasion deleted successfully' };
  }

  @Post(':id/milestones')
  async addCustomMilestone(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
    @Body() milestone: { name: string; targetDate: Date },
  ) {
    return this.occasionsService.addCustomMilestone(user.userId, id, milestone);
  }

  @Delete(':id/milestones/:index')
  async removeCustomMilestone(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
    @Param('index') index: string,
  ) {
    return this.occasionsService.removeCustomMilestone(user.userId, id, parseInt(index));
  }
}
