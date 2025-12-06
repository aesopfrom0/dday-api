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
    if (!occasion) {
      throw new Error('Occasion is null or undefined');
    }

    // aggregate() 결과는 plain object, find() 결과는 Mongoose document
    const plainOccasion = typeof occasion.toJSON === 'function' ? occasion.toJSON() : occasion;

    // _id와 userId가 ObjectId 타입일 수도 있고 이미 string일 수도 있음
    const id = plainOccasion._id
      ? typeof plainOccasion._id === 'string'
        ? plainOccasion._id
        : plainOccasion._id.toString()
      : plainOccasion.id;

    const userId = plainOccasion.userId
      ? typeof plainOccasion.userId === 'string'
        ? plainOccasion.userId
        : plainOccasion.userId.toString()
      : undefined;

    return plainToInstance(
      OccasionResponseDto,
      {
        ...plainOccasion,
        id,
        userId,
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
    const occasion = await this.occasionsService.addMilestone(user.userId, id, milestone);
    return this.toResponseDto(occasion);
  }

  @Delete(':id/milestones/:milestoneId')
  async removeMilestone(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
    @Param('milestoneId') milestoneId: string,
  ) {
    const occasion = await this.occasionsService.removeMilestone(user.userId, id, milestoneId);
    return this.toResponseDto(occasion);
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

  @Post(':id/archive')
  async archive(@CurrentUser() user: CurrentUserData, @Param('id') id: string) {
    const occasion = await this.occasionsService.archive(user.userId, id);
    return this.toResponseDto(occasion);
  }

  @Post(':id/unarchive')
  async unarchive(@CurrentUser() user: CurrentUserData, @Param('id') id: string) {
    const occasion = await this.occasionsService.unarchive(user.userId, id);
    return this.toResponseDto(occasion);
  }

  @Get('archived/list')
  async findArchived(@CurrentUser() user: CurrentUserData) {
    const occasions = await this.occasionsService.findArchived(user.userId);
    return occasions.map((o) => this.toResponseDto(o));
  }

  @Delete(':id/hard-delete')
  async hardDelete(@CurrentUser() user: CurrentUserData, @Param('id') id: string) {
    await this.occasionsService.hardDelete(user.userId, id);
    return { message: 'Occasion permanently deleted' };
  }
}
