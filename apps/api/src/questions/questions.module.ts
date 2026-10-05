import { Controller, Get, Module, NotFoundException, Param, Query } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';

class ListDto {
  @IsOptional() @IsString() chapterId?: string;
  @IsOptional() @IsString() topicId?: string;
  @IsOptional() @IsString() examId?: string;
  @IsOptional() @IsIn(['EASY', 'MEDIUM', 'HARD']) difficulty?: 'EASY' | 'MEDIUM' | 'HARD';
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(50) limit?: number;
}

export const publicOptionSelect = { select: { id: true, label: true, text: true, isCorrect: true }, orderBy: { label: 'asc' as const } };

@Controller('questions')
class QuestionsController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async list(@Query() q: ListDto) {
    const page = q.page ?? 1;
    const limit = Math.min(q.limit ?? 20, 50);
    const where = {
      status: 'PUBLISHED' as const,
      ...(q.chapterId && { chapterId: q.chapterId }),
      ...(q.topicId && { topicId: q.topicId }),
      ...(q.examId && { examId: q.examId }),
      ...(q.difficulty && { difficulty: q.difficulty }),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.question.findMany({
        where,
        select: {
          id: true, slug: true, text: true, explanation: true, difficulty: true, year: true, source: true, updatedAt: true,
          topic: { select: { id: true, name: true } },
          options: publicOptionSelect,
        },
        orderBy: { createdAt: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.question.count({ where }),
    ]);
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  @Get(':slug')
  async one(@Param('slug') slug: string) {
    const q = await this.prisma.question.findFirst({
      where: { slug, status: 'PUBLISHED' },
      include: {
        options: publicOptionSelect,
        topic: { select: { id: true, name: true, slug: true } },
        exam: { select: { name: true, slug: true, year: true } },
        reviewer: { select: { name: true } },
        chapter: { select: { id: true, name: true, slug: true, subject: { select: { name: true, slug: true, category: { select: { name: true, slug: true } } } } } },
      },
    });
    if (!q) throw new NotFoundException();
    this.prisma.question.update({ where: { id: q.id }, data: { viewCount: { increment: 1 } } }).catch(() => undefined);
    const { reviewer, ...rest } = q;
    return { ...rest, reviewedBy: reviewer?.name ?? null };
  }

  @Get(':slug/related')
  async related(@Param('slug') slug: string) {
    const q = await this.prisma.question.findUnique({ where: { slug }, select: { id: true, chapterId: true, topicId: true } });
    if (!q) throw new NotFoundException();
    const select = { id: true, slug: true, text: true };
    const base = { status: 'PUBLISHED' as const, id: { not: q.id } };
    let items = q.topicId ? await this.prisma.question.findMany({ where: { ...base, topicId: q.topicId }, select, take: 5, orderBy: { createdAt: 'asc' } }) : [];
    if (items.length < 5) {
      const more = await this.prisma.question.findMany({
        where: { ...base, chapterId: q.chapterId, id: { notIn: [q.id, ...items.map((i) => i.id)] } }, select, take: 5 - items.length, orderBy: { createdAt: 'asc' },
      });
      items = [...items, ...more];
    }
    return items;
  }
}

@Module({ controllers: [QuestionsController] })
export class QuestionsModule {}
