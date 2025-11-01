import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/provider/database/prisma.service';
import { Prisma } from '@prisma/client';
import { HelloQuery } from 'src/common/dto/query/hello';
import { CreateBye } from 'src/common/dto/command/bye';
import { HelloResult } from 'src/common/dto/result/hello';
import { PaginationResult } from 'src/common/dto/result/pagination';
import { CreateHello, UpdateHello } from 'src/common/dto/command/hello';
import { HelloMapper } from 'src/domain/hello/mapper/hello.mapper';

/**
 * HelloRepository - Thin Repository Pattern
 *
 * 역할:
 * - 데이터베이스 CRUD 작업만 수행
 * - Prisma ORM과의 인터페이스 역할
 * - 비즈니스 로직은 포함하지 않음 (Service Layer에서 처리)
 *
 * 원칙:
 * - 단순한 쿼리 실행
 * - 데이터 변환 최소화
 * - 비즈니스 규칙 검증 없음
 */
@Injectable()
export class HelloRepository {
  constructor(private prisma: PrismaService) {}

  async create(data: CreateHello): Promise<HelloResult> {
    const hello = await this.prisma.hello.create({
      data,
      include: {
        byes: true,
      },
    });

    return HelloMapper.toResult(hello);
  }

  async findAll(queryDto: HelloQuery = {}): Promise<PaginationResult<HelloResult>> {
    // 기본 조건
    const where: Prisma.HelloWhereInput = {};
    const { ids, message, moodTypes, skip, take, orderBy } = queryDto;

    // 쿼리 파라미터가 있으면 where 조건에 추가
    if (ids?.length) {
      where.id = { in: ids };
    }
    if (message) {
      where.message = { contains: message };
    }
    if (moodTypes?.length) {
      where.mood = { in: moodTypes };
    }

    // 정렬 옵션 구성
    const orderByOption: Prisma.HelloOrderByWithRelationInput = {};
    if (orderBy) {
      // 동적으로 orderBy 옵션 구성
      for (const [key, value] of Object.entries(orderBy)) {
        orderByOption[key] = value;
      }
    }

    // 결과 및 총 개수 동시에 조회
    const [hellos, totalCount] = await Promise.all([
      this.prisma.hello.findMany({
        where,
        skip: skip !== undefined ? skip : undefined,
        take: take !== undefined ? take : undefined,
        orderBy: orderByOption,
        include: {
          byes: true,
        },
      }),
      this.prisma.hello.count({ where }),
    ]);

    // Mapper를 사용하여 변환
    const items = HelloMapper.toResultArray(hellos);

    const currentPage = skip / take + 1;
    const totalPages = Math.ceil(totalCount / take);

    // 페이지네이션 정보와 함께 응답
    return {
      items,
      pagination: {
        totalCount,
        skip: skip || 0,
        take: take || items.length,
        currentPage,
        totalPages,
        hasPreviousPage: currentPage > 1,
        hasNextPage: currentPage < totalPages,
      },
    };
  }

  async findById(id: number): Promise<HelloResult> {
    const hello = await this.prisma.hello.findUnique({
      where: { id },
      include: {
        byes: true,
      },
    });

    return hello ? HelloMapper.toResult(hello) : null;
  }

  async findOne(queryDto: HelloQuery = {}): Promise<HelloResult> {
    // 기본 조건
    const where: Prisma.HelloWhereInput = {};

    const { message, moodTypes } = queryDto;

    // 쿼리 파라미터 적용 (ids는 무시)
    if (message) where.message = { contains: message };
    if (moodTypes?.length) where.mood = { in: moodTypes };

    const hello = await this.prisma.hello.findFirst({
      where,
      include: {
        byes: true,
      },
    });

    return hello ? HelloMapper.toResult(hello) : null;
  }

  async update(id: number, data: UpdateHello): Promise<HelloResult> {
    const hello = await this.prisma.hello.update({
      where: { id },
      data,
      include: {
        byes: true,
      },
    });

    return HelloMapper.toResult(hello);
  }

  async delete(id: number) {
    return this.prisma.hello.delete({
      where: { id },
    });
  }

  async createBye(helloId: number, data: CreateBye) {
    const bye = await this.prisma.bye.create({
      data: {
        ...data,
        hello: {
          connect: { id: helloId },
        },
      },
    });

    return HelloMapper.byeToResult(bye);
  }
}
