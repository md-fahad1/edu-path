import { BadRequestException, Body, ConflictException, Controller, Delete, Get, Module, NotFoundException, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser, CurrentUser, JwtAuthGuard, Roles, RolesGuard } from '../common/roles';
import { slugify, slugifyName } from '../common/utils';
import { parseCsv } from '../admin/csv';

const DIFFS = ['EASY', 'MEDIUM', 'HARD'] as const;
type Diff = (typeof DIFFS)[number];

class CategoryDto {
  @IsString() @MinLength(2) @MaxLength(80) name: string;
  @IsOptional() @Matches(/^[a-z0-9-]{2,60}$/, { message: 'slug শুধু ইংরেজি ছোট হাতের অক্ষর, সংখ্যা ও - হতে পারবে' }) slug?: string;
  @IsOptional() @IsString() @MaxLength(300) description?: string;
  @IsOptional() @IsString() @MaxLength(8) icon?: string;
  @IsOptional() @IsInt() @Min(0) @Max(9999) sortOrder?: number;
}
class PublishDto {
  @IsBoolean() isPublished: boolean;
}
class CsvDto {
  @IsString() @MaxLength(2_000_000) csv: string;
  @IsOptional() @IsString() defaultCategoryId?: string;
}
class ProgressDto {
  @IsOptional() @IsIn(['KNOWN', 'REVIEW']) status?: 'KNOWN' | 'REVIEW' | null;
}

// ---------- public ----------
@Controller('interview')
class InterviewController {
  constructor(private prisma: PrismaService) {}

  @Get('categories')
  async categories() {
    const cats = await this.prisma.interviewCategory.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      include: { _count: { select: { questions: { where: { isPublished: true } } } } },
    });
    return cats
      .filter((c) => c._count.questions > 0)
      .map((c) => ({ id: c.id, slug: c.slug, name: c.name, description: c.description, icon: c.icon, count: c._count.questions }));
  }

  @Get('categories/:slug')
  async category(@Param('slug') slug: string) {
    const c = await this.prisma.interviewCategory.findFirst({ where: { slug, isActive: true } });
    if (!c) throw new NotFoundException();
    const questions = await this.prisma.interviewQuestion.findMany({
      where: { categoryId: c.id, isPublished: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      take: 300,
      select: { id: true, slug: true, question: true, answer: true, tips: true, difficulty: true, tags: true },
    });
    return { id: c.id, slug: c.slug, name: c.name, description: c.description, icon: c.icon, questions };
  }
}

// ---------- user progress ----------
@UseGuards(JwtAuthGuard)
@Controller('interview/progress')
class InterviewProgressController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async mine(@CurrentUser() u: AuthUser) {
    const rows = await this.prisma.interviewProgress.findMany({ where: { userId: u.id }, select: { questionId: true, status: true }, take: 3000 });
    return Object.fromEntries(rows.map((r) => [r.questionId, r.status]));
  }

  /** status: KNOWN | REVIEW | null (null = chinho tule dao) */
  @Put(':questionId')
  async mark(@CurrentUser() u: AuthUser, @Param('questionId') questionId: string, @Body() dto: ProgressDto) {
    if (!dto.status) {
      await this.prisma.interviewProgress.deleteMany({ where: { userId: u.id, questionId } });
      return { ok: true };
    }
    const q = await this.prisma.interviewQuestion.findFirst({ where: { id: questionId, isPublished: true }, select: { id: true } });
    if (!q) throw new NotFoundException();
    await this.prisma.interviewProgress.upsert({
      where: { userId_questionId: { userId: u.id, questionId } },
      create: { userId: u.id, questionId, status: dto.status },
      update: { status: dto.status },
    });
    return { ok: true };
  }
}

// ---------- admin ----------
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'TEACHER')
@Controller('admin/interview')
class InterviewAdminController {
  constructor(private prisma: PrismaService) {}

  @Get('categories')
  async categories() {
    const [cats, pub] = await Promise.all([
      this.prisma.interviewCategory.findMany({ orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }], include: { _count: { select: { questions: true } } } }),
      this.prisma.interviewQuestion.groupBy({ by: ['categoryId'], where: { isPublished: true }, _count: { _all: true } }),
    ]);
    const pubMap = new Map(pub.map((p) => [p.categoryId, p._count._all]));
    return cats.map((c) => ({ id: c.id, slug: c.slug, name: c.name, icon: c.icon, isActive: c.isActive, total: c._count.questions, published: pubMap.get(c.id) ?? 0 }));
  }

  @Post('categories')
  async createCategory(@Body() dto: CategoryDto) {
    const slug = dto.slug ?? slugifyName(dto.name);
    if (await this.prisma.interviewCategory.findUnique({ where: { slug }, select: { id: true } })) throw new ConflictException('এই slug আগে থেকেই আছে');
    return this.prisma.interviewCategory.create({
      data: { slug, name: dto.name, description: dto.description, icon: dto.icon, sortOrder: dto.sortOrder ?? 0 },
    });
  }

  /** Ek click-e ei category-r shob proshno publish */
  @Patch('categories/:id/publish-all')
  async publishAll(@Param('id') id: string) {
    const r = await this.prisma.interviewQuestion.updateMany({ where: { categoryId: id, isPublished: false }, data: { isPublished: true } });
    return { published: r.count };
  }

  @Get('questions')
  async questions(@Query('categoryId') categoryId?: string, @Query('page') page?: string) {
    const p = Math.max(1, Number(page) || 1);
    const take = 30;
    const where = categoryId ? { categoryId } : {};
    const [items, total] = await this.prisma.$transaction([
      this.prisma.interviewQuestion.findMany({
        where, orderBy: { createdAt: 'desc' }, skip: (p - 1) * take, take,
        select: { id: true, question: true, difficulty: true, isPublished: true, category: { select: { name: true } } },
      }),
      this.prisma.interviewQuestion.count({ where }),
    ]);
    return { items, total, page: p, totalPages: Math.ceil(total / take) };
  }

  @Patch('questions/:id')
  async setPublished(@Param('id') id: string, @Body() dto: PublishDto) {
    await this.prisma.interviewQuestion.update({ where: { id }, data: { isPublished: dto.isPublished } });
    return { ok: true };
  }

  @Delete('questions/:id')
  async remove(@Param('id') id: string) {
    await this.prisma.interviewQuestion.delete({ where: { id } });
    return { ok: true };
  }

  // ---------- CSV import: category_slug,question,answer,tips,difficulty,tags(a|b|c) ----------
  private async parse(csv: string, defaultCategoryId?: string) {
    const rows = parseCsv(csv);
    if (rows.length < 2) throw new BadRequestException('CSV-te header + kompokkhe 1 ti row lagbe');
    const header = rows[0].map((h) => h.trim().toLowerCase());
    const idx = (n: string) => header.indexOf(n);
    for (const need of ['question', 'answer']) if (idx(need) < 0) throw new BadRequestException(`CSV header-e "${need}" column nei`);

    const cats = await this.prisma.interviewCategory.findMany({ select: { id: true, slug: true } });
    const bySlug = new Map(cats.map((c) => [c.slug, c.id]));
    const seen = new Set<string>();
    const out = [];
    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      const get = (n: string) => (idx(n) >= 0 ? (row[idx(n)] ?? '').trim() : '');
      const errors: string[] = [];
      const slug = get('category_slug');
      const categoryId = slug ? bySlug.get(slug) : cats.find((c) => c.id === defaultCategoryId)?.id;
      if (!categoryId) errors.push(slug ? `category_slug "${slug}" paoa jay nai` : 'category_slug nei (default category select korun)');
      const question = get('question');
      const answer = get('answer');
      if (question.length < 5) errors.push('question khub chhoto');
      if (answer.length < 5) errors.push('answer khub chhoto');
      const difficulty = (get('difficulty') || 'MEDIUM').toUpperCase();
      if (!DIFFS.includes(difficulty as Diff)) errors.push('difficulty EASY/MEDIUM/HARD hobe');
      const key = `${categoryId}|${question.replace(/\s+/g, ' ').toLowerCase()}`;
      if (seen.has(key)) errors.push('file-e duplicate question');
      seen.add(key);
      if (!errors.length && (await this.prisma.interviewQuestion.findFirst({ where: { categoryId, question }, select: { id: true } }))) errors.push('ei category-te question age theke ache');
      out.push({
        line: r + 1, errors, categoryId: categoryId ?? null, question, answer,
        tips: get('tips') || null, difficulty: difficulty as Diff,
        tags: get('tags').split('|').map((t) => t.trim()).filter(Boolean).slice(0, 8),
      });
    }
    return out;
  }

  @Post('import')
  async importCsv(@Body() dto: CsvDto) {
    const rows = await this.parse(dto.csv, dto.defaultCategoryId);
    const good = rows.filter((r) => !r.errors.length);
    if (good.length) {
      await this.prisma.interviewQuestion.createMany({
        data: good.map((r) => ({
          slug: slugify(r.question, 'iv'), categoryId: r.categoryId!, question: r.question, answer: r.answer,
          tips: r.tips, difficulty: r.difficulty, tags: r.tags, isPublished: false, // kokhono sorasori publish na
        })),
      });
    }
    return {
      imported: good.length,
      failed: rows.length - good.length,
      errors: rows.filter((r) => r.errors.length).slice(0, 50).map((r) => ({ line: r.line, errors: r.errors })),
    };
  }
}

@Module({ controllers: [InterviewController, InterviewProgressController, InterviewAdminController] })
export class InterviewModule {}