import { Body, Controller, Get, HttpCode, Module, NotFoundException, Param, Post, Query, UnauthorizedException, UseGuards } from '@nestjs/common';
import { IsString } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import { AnalyticsModule, AnalyticsService } from '../analytics/analytics.module';
import { AuthUser, CurrentUser, JwtAuthGuard, OptionalJwtGuard } from '../common/roles';
import { publicOptionSelect } from '../questions/questions.module';

class AnswerDto {
  @IsString() questionId: string;
  @IsString() optionId: string;
}

type Reason = 'review' | 'weak' | 'new' | 'again' | null;

const nextSelect = {
  id: true, slug: true, text: true, difficulty: true,
  topic: { select: { name: true } },
  options: { select: { id: true, label: true, text: true }, orderBy: { label: 'asc' as const } },
};

const rand = (n: number) => Math.floor(Math.random() * n);

/** Guest-ao practice korte pare (friction kom). Login thakle stat/streak/notebook update hoy. */
@UseGuards(OptionalJwtGuard)
@Controller('practice')
class PracticeController {
  constructor(private prisma: PrismaService, private analytics: AnalyticsService) {}

  private scope(chapterId?: string, topicId?: string) {
    return {
      status: 'PUBLISHED' as const,
      ...(chapterId && { chapterId }),
      ...(topicId && { topicId }),
    };
  }

  private load(id: string) {
    return this.prisma.question.findUnique({ where: { id }, select: nextSelect });
  }

  /** Smart: (1) shomoy hoyeche emon bhul prosno ~40% (2) dubol topic-er notun prosno (3) kono-dino-na-dekha prosno (4) shobchhe purono dekha */
  private async pickSmart(userId: string, where: ReturnType<PracticeController['scope']>, ids: string[]): Promise<{ id: string; reason: Reason } | null> {
    const now = new Date();
    const [due, topicStats] = await Promise.all([
      this.prisma.userQuestionStat.findMany({
        where: { userId, inNotebook: true, nextReviewAt: { lte: now }, questionId: { notIn: ids }, question: where },
        select: { questionId: true }, orderBy: { nextReviewAt: 'asc' }, take: 20,
      }),
      this.prisma.userTopicStat.findMany({ where: { userId, attempted: { gte: 3 } }, select: { topicId: true, attempted: true, correct: true } }),
    ]);
    const weakTopicIds = topicStats.filter((s) => s.correct / s.attempted < 0.7).map((s) => s.topicId);
    const unseen = { ...where, id: { notIn: ids }, userStats: { none: { userId } } };
    const unseenCount = await this.prisma.question.count({ where: unseen });

    if (due.length && (Math.random() < 0.4 || unseenCount === 0)) return { id: due[0].questionId, reason: 'review' };

    if (weakTopicIds.length && Math.random() < 0.5) {
      const w = { ...unseen, topicId: { in: weakTopicIds } };
      const wc = await this.prisma.question.count({ where: w });
      if (wc) {
        const q = await this.prisma.question.findFirst({ where: w, skip: rand(wc), orderBy: { id: 'asc' }, select: { id: true } });
        if (q) return { id: q.id, reason: 'weak' };
      }
    }
    if (unseenCount) {
      const q = await this.prisma.question.findFirst({ where: unseen, skip: rand(unseenCount), orderBy: { id: 'asc' }, select: { id: true } });
      if (q) return { id: q.id, reason: 'new' };
    }
    const old = await this.prisma.userQuestionStat.findFirst({
      where: { userId, questionId: { notIn: ids }, question: where },
      orderBy: { lastAnsweredAt: 'asc' }, select: { questionId: true },
    });
    return old ? { id: old.questionId, reason: 'again' } : null;
  }

  private async nextFromNotebook(userId: string, where: ReturnType<PracticeController['scope']>, ids: string[]) {
    const now = new Date();
    const base = { userId, inNotebook: true, questionId: { notIn: ids }, question: where };
    const [total, remaining] = await Promise.all([
      this.prisma.userQuestionStat.count({ where: { userId, inNotebook: true, question: where } }),
      this.prisma.userQuestionStat.count({ where: base }),
    ]);
    if (!remaining) return { question: null, total, remaining: 0, reason: null as Reason };
    const row =
      (await this.prisma.userQuestionStat.findFirst({ where: { ...base, nextReviewAt: { lte: now } }, orderBy: { nextReviewAt: 'asc' }, select: { questionId: true } })) ??
      (await this.prisma.userQuestionStat.findFirst({ where: base, orderBy: { lastAnsweredAt: 'asc' }, select: { questionId: true } }));
    const question = row ? await this.load(row.questionId) : null;
    return { question, total, remaining: remaining - 1, reason: 'review' as Reason };
  }

  @Get('next')
  async next(
    @CurrentUser() user: AuthUser | null,
    @Query('chapterId') chapterId?: string,
    @Query('topicId') topicId?: string,
    @Query('exclude') exclude?: string,
    @Query('mode') mode?: string,
  ) {
    const ids = (exclude ?? '').split(',').filter(Boolean).slice(-300);
    const where = this.scope(chapterId, topicId);

    if (mode === 'notebook') {
      if (!user) throw new UnauthorizedException();
      return this.nextFromNotebook(user.id, where, ids);
    }

    const [total, remaining] = await Promise.all([
      this.prisma.question.count({ where }),
      this.prisma.question.count({ where: { ...where, id: { notIn: ids } } }),
    ]);
    if (!remaining) return { question: null, total, remaining: 0, reason: null as Reason };

    if (mode === 'smart' && user) {
      const pick = await this.pickSmart(user.id, where, ids);
      if (pick) return { question: await this.load(pick.id), total, remaining: remaining - 1, reason: pick.reason };
    }

    const q = await this.prisma.question.findFirst({
      where: { ...where, id: { notIn: ids } },
      skip: rand(remaining),
      orderBy: { id: 'asc' },
      select: nextSelect,
    });
    return { question: q, total, remaining: remaining - 1, reason: null as Reason };
  }

  @Post('answer')
  async answer(@Body() dto: AnswerDto, @CurrentUser() user: AuthUser | null) {
    const q = await this.prisma.question.findFirst({
      where: { id: dto.questionId, status: 'PUBLISHED' },
      select: { id: true, slug: true, topicId: true, explanation: true, options: { select: { id: true, isCorrect: true } } },
    });
    if (!q) throw new NotFoundException();
    const chosen = q.options.find((o) => o.id === dto.optionId);
    if (!chosen) throw new NotFoundException('Option paoa jay nai');
    const correct = q.options.find((o) => o.isCorrect);
    let notebook: { event: 'added' | 'progress' | 'mastered' | null; inNotebook: boolean; nextReviewAt: Date | null } | null = null;
    let game: { xp: number; badges: { code: string; name: string; icon: string }[] } | null = null;
    if (user) {
      const res = await this.analytics.record(user.id, [{ topicId: q.topicId, correct: chosen.isCorrect, questionId: q.id }]);
      notebook = res.questions.get(q.id) ?? null;
      game = { xp: res.xp, badges: res.badges };
    }
    return { isCorrect: chosen.isCorrect, correctOptionId: correct?.id ?? null, explanation: q.explanation, slug: q.slug, notebook, game };
  }
}

/** Bhul-er notebook: shudhu login user */
@UseGuards(JwtAuthGuard)
@Controller('practice/notebook')
class NotebookController {
  constructor(private prisma: PrismaService) {}

  @Get('summary')
  async summary(@CurrentUser() u: AuthUser) {
    const now = new Date();
    const [rows, mastered] = await Promise.all([
      this.prisma.userQuestionStat.findMany({
        where: { userId: u.id, inNotebook: true, question: { status: 'PUBLISHED' } },
        select: { nextReviewAt: true, question: { select: { chapter: { select: { id: true, name: true } } } } },
        take: 2000,
      }),
      this.prisma.userQuestionStat.count({ where: { userId: u.id, inNotebook: false, wrongCount: { gt: 0 } } }),
    ]);
    let due = 0;
    const byChapter = new Map<string, { chapterId: string; chapter: string; count: number; due: number }>();
    for (const r of rows) {
      const isDue = !!r.nextReviewAt && r.nextReviewAt <= now;
      if (isDue) due++;
      const c = r.question.chapter;
      const e = byChapter.get(c.id) ?? { chapterId: c.id, chapter: c.name, count: 0, due: 0 };
      e.count++;
      if (isDue) e.due++;
      byChapter.set(c.id, e);
    }
    return {
      total: rows.length,
      due,
      mastered,
      chapters: [...byChapter.values()].sort((a, b) => b.due - a.due || b.count - a.count).slice(0, 8),
    };
  }

  @Get()
  async list(@CurrentUser() u: AuthUser, @Query('page') page?: string, @Query('chapterId') chapterId?: string) {
    const p = Math.max(1, Number(page) || 1);
    const take = 20;
    const where = { userId: u.id, inNotebook: true, question: { status: 'PUBLISHED' as const, ...(chapterId && { chapterId }) } };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.userQuestionStat.findMany({
        where, orderBy: [{ nextReviewAt: 'asc' }, { lastAnsweredAt: 'desc' }], skip: (p - 1) * take, take,
        select: {
          wrongCount: true, attempts: true, nextReviewAt: true,
          question: {
            select: {
              id: true, slug: true, text: true, explanation: true, difficulty: true,
              topic: { select: { id: true, name: true } },
              chapter: { select: { name: true } },
              options: publicOptionSelect,
            },
          },
        },
      }),
      this.prisma.userQuestionStat.count({ where }),
    ]);
    const now = new Date();
    return {
      items: rows.map((r) => ({
        ...r.question, wrongCount: r.wrongCount, attempts: r.attempts, nextReviewAt: r.nextReviewAt,
        due: !!r.nextReviewAt && r.nextReviewAt <= now,
      })),
      total, page: p, totalPages: Math.ceil(total / take),
    };
  }

  /** "Ami shikhe phelechhi" - notebook theke shoriye dei */
  @HttpCode(200)
  @Post(':questionId/master')
  async master(@CurrentUser() u: AuthUser, @Param('questionId') questionId: string) {
    await this.prisma.userQuestionStat.updateMany({
      where: { userId: u.id, questionId },
      data: { inNotebook: false, nextReviewAt: null, box: 0 },
    });
    return { ok: true };
  }
}

@Module({ imports: [AnalyticsModule], controllers: [PracticeController, NotebookController] })
export class PracticeModule {}