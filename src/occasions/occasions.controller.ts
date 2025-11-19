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
