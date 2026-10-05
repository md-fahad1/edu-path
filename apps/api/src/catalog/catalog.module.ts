import { Controller, Get, Module, NotFoundException, Param } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const pubCount = { select: { questions: { where: { status: 'PUBLISHED' as const } } } };

@Controller()
class CatalogController {
  constructor(private prisma: PrismaService) {}

  @Get('categories')
  categories() {
    return this.prisma.category.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
      include: { _count: { select: { subjects: true, exams: true } } },
    });
  }

  /** Puro tree (category > subject > chapter > topic) - practice picker, admin select ar home page-e lage */
  @Get('catalog/tree')
  tree() {
    return this.prisma.category.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
      select: {
        id: true, name: true, slug: true,
        subjects: {
          where: { isActive: true }, orderBy: { order: 'asc' },
          select: {
            id: true, name: true, slug: true,
            chapters: {
              where: { isActive: true }, orderBy: { order: 'asc' },
              select: {
                id: true, name: true, slug: true, isPremium: true,
                _count: pubCount,
                topics: { orderBy: { order: 'asc' }, select: { id: true, name: true, slug: true } },
              },
            },
          },
        },
      },
    });
  }

  @Get('catalog/:category')
  async category(@Param('category') slug: string) {
    const category = await this.prisma.category.findFirst({ where: { slug, isActive: true } });
    if (!category) throw new NotFoundException();
    const [subjects, exams] = await Promise.all([
      this.prisma.subject.findMany({
        where: { categoryId: category.id, isActive: true }, orderBy: { order: 'asc' },
        include: { chapters: { where: { isActive: true }, select: { id: true, _count: pubCount } } },
      }),
      this.prisma.exam.findMany({
        where: { categoryId: category.id }, orderBy: [{ year: 'desc' }, { name: 'asc' }],
        include: { _count: { select: { questions: { where: { status: 'PUBLISHED' } } } } },
      }),
    ]);
    return {
      category,
      subjects: subjects.map((s) => ({
        id: s.id, name: s.name, slug: s.slug,
        chapterCount: s.chapters.length,
        questionCount: s.chapters.reduce((n, c) => n + c._count.questions, 0),
      })),
      exams,
    };
  }

  @Get('catalog/:category/:subject')
  async subject(@Param('category') cs: string, @Param('subject') ss: string) {
    const category = await this.prisma.category.findFirst({ where: { slug: cs, isActive: true } });
    if (!category) throw new NotFoundException();
    const subject = await this.prisma.subject.findFirst({
      where: { categoryId: category.id, slug: ss, isActive: true },
      include: {
        chapters: { where: { isActive: true }, orderBy: { order: 'asc' }, include: { _count: pubCount, topics: { select: { id: true } } } },
      },
    });
    if (!subject) throw new NotFoundException();
    const { chapters, ...rest } = subject;
    return {
      category: { id: category.id, name: category.name, slug: category.slug },
      subject: rest,
      chapters: chapters.map((c) => ({
        id: c.id, name: c.name, slug: c.slug, isPremium: c.isPremium,
        summary: c.summary?.slice(0, 160) ?? null, questionCount: c._count.questions, topicCount: c.topics.length,
      })),
    };
  }

  @Get('catalog/:category/:subject/:chapter')
  async chapter(@Param('category') cs: string, @Param('subject') ss: string, @Param('chapter') chs: string) {
    const chapter = await this.prisma.chapter.findFirst({
      where: { slug: chs, isActive: true, subject: { slug: ss, isActive: true, category: { slug: cs, isActive: true } } },
      include: {
        subject: { include: { category: true } },
        topics: { orderBy: { order: 'asc' }, include: { _count: { select: { questions: { where: { status: 'PUBLISHED' } } } } } },
        tests: { where: { isPublished: true }, select: { id: true, title: true, slug: true, durationMin: true, isPremium: true, _count: { select: { questions: true } } } },
        _count: pubCount,
      },
    });
    if (!chapter) throw new NotFoundException();
    const { subject, topics, tests, _count, ...c } = chapter;
    return {
      category: { id: subject.category.id, name: subject.category.name, slug: subject.category.slug },
      subject: { id: subject.id, name: subject.name, slug: subject.slug },
      chapter: { ...c, questionCount: _count.questions },
      topics: topics.map((t) => ({ id: t.id, name: t.name, slug: t.slug, questionCount: t._count.questions })),
      tests,
    };
  }

  // id-based endpoints (doc-er API list onujayi, mobile app-er jonno)
  @Get('categories/:slug/subjects')
  subjectsOf(@Param('slug') slug: string) {
    return this.prisma.subject.findMany({ where: { category: { slug }, isActive: true }, orderBy: { order: 'asc' } });
  }
  @Get('subjects/:id/chapters')
  chaptersOf(@Param('id') id: string) {
    return this.prisma.chapter.findMany({ where: { subjectId: id, isActive: true }, orderBy: { order: 'asc' } });
  }
  @Get('chapters/:id')
  async chapterById(@Param('id') id: string) {
    const c = await this.prisma.chapter.findUnique({ where: { id } });
    if (!c) throw new NotFoundException();
    return c;
  }
  @Get('chapters/:id/topics')
  topicsOf(@Param('id') id: string) {
    return this.prisma.topic.findMany({ where: { chapterId: id }, orderBy: { order: 'asc' } });
  }
}

@Module({ controllers: [CatalogController] })
export class CatalogModule {}
