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
  Request,
} from '@nestjs/common';
import { OccasionsService } from './occasions.service';
import { CreateOccasionDto } from './dto/create-occasion.dto';
import { UpdateOccasionDto } from './dto/update-occasion.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('occasions')
@UseGuards(JwtAuthGuard)
export class OccasionsController {
  constructor(private readonly occasionsService: OccasionsService) {}

  @Post()
  async create(@Request() req, @Body() createOccasionDto: CreateOccasionDto) {
    return this.occasionsService.create(req.user.userId, createOccasionDto);
  }

  @Get()
  async findAll(@Request() req, @Query('category') category?: string) {
    return this.occasionsService.findAll(req.user.userId, category);
  }

  @Get(':id')
  async findOne(@Request() req, @Param('id') id: string) {
    return this.occasionsService.findOne(req.user.userId, id);
  }

  @Put(':id')
  async update(
    @Request() req,
    @Param('id') id: string,
    @Body() updateOccasionDto: UpdateOccasionDto,
  ) {
    return this.occasionsService.update(req.user.userId, id, updateOccasionDto);
  }

  @Patch(':id')
  async patch(
    @Request() req,
    @Param('id') id: string,
    @Body() updateOccasionDto: UpdateOccasionDto,
  ) {
    return this.occasionsService.update(req.user.userId, id, updateOccasionDto);
  }

  @Delete(':id')
  async remove(@Request() req, @Param('id') id: string) {
    await this.occasionsService.remove(req.user.userId, id);
    return { message: 'Occasion deleted successfully' };
  }

  @Post(':id/milestones')
  async addCustomMilestone(
    @Request() req,
    @Param('id') id: string,
    @Body() milestone: { name: string; targetDate: Date },
  ) {
    return this.occasionsService.addCustomMilestone(req.user.userId, id, milestone);
  }

  @Delete(':id/milestones/:index')
  async removeCustomMilestone(
    @Request() req,
    @Param('id') id: string,
    @Param('index') index: string,
  ) {
    return this.occasionsService.removeCustomMilestone(req.user.userId, id, parseInt(index));
  }
}
