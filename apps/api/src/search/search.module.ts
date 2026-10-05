import { Controller, Get, Module, Query } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('search')
class SearchController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async search(@Query('q') raw?: string) {
    const q = (raw ?? '').trim().slice(0, 80);
    if (q.length < 2) return { questions: [], chapters: [], exams: [] };
    const contains = { contains: q, mode: 'insensitive' as const };
    const [questions, chapters, exams] = await Promise.all([
      this.prisma.question.findMany({
        where: { status: 'PUBLISHED', text: contains }, take: 12, orderBy: { viewCount: 'desc' },
        select: { slug: true, text: true, chapter: { select: { name: true } } },
      }),
      this.prisma.chapter.findMany({
        where: { isActive: true, name: contains }, take: 6,
        select: { name: true, slug: true, subject: { select: { name: true, slug: true, category: { select: { slug: true, name: true } } } } },
      }),
      this.prisma.exam.findMany({ where: { name: contains }, take: 5, select: { name: true, slug: true, year: true } }),
    ]);
    return { questions, chapters, exams };
  }
}

@Module({ controllers: [SearchController] })
export class SearchModule {}
