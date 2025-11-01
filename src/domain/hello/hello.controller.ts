import { Body, Controller, Get, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { HelloQuery } from 'src/common/dto/query/hello';
import { CreateHello } from 'src/common/dto/command/hello';
import { HelloResult } from 'src/common/dto/result/hello';
import { PaginationResult } from 'src/common/dto/result/pagination';
import { HelloService } from 'src/domain/hello/hello.service';

@Controller('hello')
export class HelloController {
  constructor(private helloService: HelloService) {}

  @Get()
  async findAll(@Query() queryDto: HelloQuery): Promise<PaginationResult<HelloResult>> {
    return this.helloService.getHellos(queryDto);
  }

  @Get(':id')
  async findById(@Param('id', ParseIntPipe) id: number): Promise<HelloResult> {
    return this.helloService.findHelloById(id);
  }

  @Post()
  async addHello(@Body() dto: CreateHello) {
    return this.helloService.addHello(dto);
  }
}
