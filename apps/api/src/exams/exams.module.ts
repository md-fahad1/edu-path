import { Controller, Get, Module, NotFoundException, Param, Query } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { publicOptionSelect } from '../questions/questions.module';

@Controller('exams')
class ExamsController {
  constructor(private prisma: PrismaService) {}

  @Get()
  list(@Query('categoryId') categoryId?: string, @Query('categorySlug') categorySlug?: string, @Query('year') year?: string) {
    return this.prisma.exam.findMany({
      where: {
        ...(categoryId && { categoryId }),
        ...(categorySlug && { category: { slug: categorySlug } }),
        ...(year && !Number.isNaN(Number(year)) && { year: Number(year) }),
      },
      orderBy: [{ year: 'desc' }, { name: 'asc' }],
      include: { category: { select: { name: true, slug: true } }, _count: { select: { questions: { where: { status: 'PUBLISHED' } } } } },
    });
  }

  @Get(':slug')
  async one(@Param('slug') slug: string) {
    const exam = await this.prisma.exam.findUnique({
      where: { slug },
      include: {
        category: { select: { name: true, slug: true } },
        tests: { where: { isPublished: true }, select: { id: true, title: true, slug: true, durationMin: true, isPremium: true } },
        questions: {
          where: { status: 'PUBLISHED' }, orderBy: { createdAt: 'asc' }, take: 300,
          select: { id: true, slug: true, text: true, explanation: true, difficulty: true, year: true, source: true, options: publicOptionSelect, chapter: { select: { name: true, subject: { select: { name: true } } } } },
        },
      },
    });
    if (!exam) throw new NotFoundException();
    return exam;
  }
}

@Module({ controllers: [ExamsController] })
export class ExamsModule {}
