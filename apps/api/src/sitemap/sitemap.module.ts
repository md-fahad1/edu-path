import { Controller, Get, Module, Query } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/** Next.js sitemap.ts ei endpoint theke slug nibe */
@Controller('sitemap')
class SitemapController {
  constructor(private prisma: PrismaService) {}

  @Get('data')
  async data(@Query('page') page = '1') {
    const p = Math.max(1, Number(page) || 1);
    const size = 5000;
    const [categories, subjects, chapters, exams, tests, questions, questionTotal] = await Promise.all([
      this.prisma.category.findMany({ where: { isActive: true }, select: { slug: true } }),
      this.prisma.subject.findMany({ where: { isActive: true }, select: { slug: true, category: { select: { slug: true } } } }),
      this.prisma.chapter.findMany({ where: { isActive: true }, select: { slug: true, subject: { select: { slug: true, category: { select: { slug: true } } } } } }),
      this.prisma.exam.findMany({ select: { slug: true } }),
      this.prisma.modelTest.findMany({ where: { isPublished: true }, select: { slug: true } }),
      this.prisma.question.findMany({
        where: { status: 'PUBLISHED' }, select: { slug: true, updatedAt: true, explanation: true },
        orderBy: { createdAt: 'asc' }, skip: (p - 1) * size, take: size,
      }),
      this.prisma.question.count({ where: { status: 'PUBLISHED' } }),
    ]);
    return {
      categories: categories.map((c) => c.slug),
      subjects: subjects.map((s) => `${s.category.slug}/${s.slug}`),
      chapters: chapters.map((c) => `${c.subject.category.slug}/${c.subject.slug}/${c.slug}`),
      exams: exams.map((e) => e.slug),
      tests: tests.map((t) => t.slug),
      // thin content (explanation nai) sitemap-e dei na
      questions: questions.filter((q) => !!q.explanation).map((q) => ({ slug: q.slug, updatedAt: q.updatedAt })),
      questionPages: Math.ceil(questionTotal / size),
    };
  }
}

@Module({ controllers: [SitemapController] })
export class SitemapModule {}
