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
  UseInterceptors,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import { OccasionsService } from './occasions.service';
import { CreateOccasionDto } from './dto/create-occasion.dto';
import { UpdateOccasionDto } from './dto/update-occasion.dto';
import { OccasionResponseDto } from './dto/occasion-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserData } from '../auth/decorators/current-user.decorator';
import { plainToInstance } from 'class-transformer';

@Controller('occasions')
@UseGuards(JwtAuthGuard)
@UseInterceptors(ClassSerializerInterceptor)
export class OccasionsController {
  constructor(private readonly occasionsService: OccasionsService) {}

  private toResponseDto(occasion: any): OccasionResponseDto {
    return plainToInstance(
      OccasionResponseDto,
      {
        ...occasion.toJSON(),
        id: occasion._id.toString(),
        userId: occasion.userId.toString(),
      },
      { excludeExtraneousValues: true },
    );
  }

  @Post()
  async create(@CurrentUser() user: CurrentUserData, @Body() createOccasionDto: CreateOccasionDto) {
    const occasion = await this.occasionsService.create(user.userId, createOccasionDto);
    return this.toResponseDto(occasion);
  }

  @Get()
  async findAll(@CurrentUser() user: CurrentUserData, @Query('category') category?: string) {
    const occasions = await this.occasionsService.findAll(user.userId, category);
    return occasions.map((o) => this.toResponseDto(o));
  }

  @Get(':id')
  async findOne(@CurrentUser() user: CurrentUserData, @Param('id') id: string) {
    const occasion = await this.occasionsService.findOne(user.userId, id);
    return this.toResponseDto(occasion);
  }

  @Put(':id')
  async update(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
    @Body() updateOccasionDto: UpdateOccasionDto,
  ) {
    const occasion = await this.occasionsService.update(user.userId, id, updateOccasionDto);
    return this.toResponseDto(occasion);
  }

  @Patch(':id')
  async patch(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
    @Body() updateOccasionDto: UpdateOccasionDto,
  ) {
    const occasion = await this.occasionsService.update(user.userId, id, updateOccasionDto);
    return this.toResponseDto(occasion);
  }

  @Delete(':id')
  async remove(@CurrentUser() user: CurrentUserData, @Param('id') id: string) {
    await this.occasionsService.remove(user.userId, id);
    return { message: 'Occasion deleted successfully' };
  }

  @Post(':id/milestones')
  async addMilestone(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
    @Body()
    milestone: {
      id: string;
      name: string;
      targetDate: string; // "YYYY-MM-DD" 형식
      description?: string;
      isFromSuggestion?: boolean;
      suggestionType?: string;
      suggestionValue?: number;
    },
  ) {
    return this.occasionsService.addMilestone(user.userId, id, milestone);
  }

  @Delete(':id/milestones/:milestoneId')
  async removeMilestone(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
    @Param('milestoneId') milestoneId: string,
  ) {
    return this.occasionsService.removeMilestone(user.userId, id, milestoneId);
  }

  @Put(':id/milestones/:milestoneId')
  async updateMilestone(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
    @Param('milestoneId') milestoneId: string,
    @Body()
    updateData: {
      name?: string;
      targetDate?: string;
      description?: string;
    },
  ) {
    const occasion = await this.occasionsService.updateMilestone(
      user.userId,
      id,
      milestoneId,
      updateData,
    );
    return this.toResponseDto(occasion);
  }

  @Patch(':id/pin')
  async togglePin(@CurrentUser() user: CurrentUserData, @Param('id') id: string) {
    const occasion = await this.occasionsService.togglePin(user.userId, id);
    return this.toResponseDto(occasion);
  }

  @Post(':id/test-notification')
  async testNotification(@CurrentUser() user: CurrentUserData, @Param('id') id: string) {
    return this.occasionsService.sendTestNotification(user.userId, id);
  }
}
