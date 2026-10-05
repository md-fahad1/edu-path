import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AnalyticsService } from '../analytics/analytics.module';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { AuthUser } from '../common/roles';
import { seededShuffle } from '../common/utils';

const GRACE_MS = 5_000;
const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

@Injectable()
export class TestsService {
  constructor(private prisma: PrismaService, private analytics: AnalyticsService, private subs: SubscriptionsService) {}

  // ---------- public ----------
  list(q: { chapterId?: string; categorySlug?: string }) {
    return this.prisma.modelTest.findMany({
      where: {
        isPublished: true,
        ...(q.chapterId && { chapterId: q.chapterId }),
        ...(q.categorySlug && { OR: [{ chapter: { subject: { category: { slug: q.categorySlug } } } }, { exam: { category: { slug: q.categorySlug } } }] }),
      },
      orderBy: [{ isPremium: 'asc' }, { createdAt: 'desc' }],
      select: {
        id: true, title: true, slug: true, type: true, durationMin: true, negativeMark: true, isPremium: true,
        chapter: { select: { name: true, subject: { select: { name: true, category: { select: { name: true, slug: true } } } } } },
        _count: { select: { questions: true } },
      },
    });
  }

  async one(slug: string) {
    const t = await this.prisma.modelTest.findFirst({
      where: { slug, isPublished: true },
      include: {
        chapter: { select: { name: true, slug: true, subject: { select: { name: true, slug: true, category: { select: { name: true, slug: true } } } } } },
        exam: { select: { name: true, slug: true } },
        _count: { select: { questions: true, attempts: true } },
      },
    });
    if (!t) throw new NotFoundException();
    return t;
  }

  async leaderboard(testId: string) {
    const rows = await this.prisma.testAttempt.findMany({
      where: { testId, status: { not: 'IN_PROGRESS' } },
      orderBy: [{ score: 'desc' }, { submittedAt: 'asc' }],
      take: 300,
      select: { userId: true, score: true, correctCount: true, submittedAt: true, startedAt: true, user: { select: { name: true } } },
    });
    const seen = new Set<string>();
    const out: { rank: number; name: string; score: number; correct: number; seconds: number }[] = [];
    for (const r of rows) {
      if (seen.has(r.userId)) continue; // best attempt per user
      seen.add(r.userId);
      out.push({
        rank: out.length + 1, name: r.user.name.split(' ')[0], score: r.score, correct: r.correctCount,
        seconds: r.submittedAt ? Math.round((r.submittedAt.getTime() - r.startedAt.getTime()) / 1000) : 0,
      });
      if (out.length >= 20) break;
    }
    return out;
  }

  // ---------- attempt flow ----------
  private deadlineOf(startedAt: Date, durationMin: number) {
    return startedAt.getTime() + durationMin * 60_000;
  }

  private async loadTest(testId: string) {
    return this.prisma.modelTest.findUnique({
      where: { id: testId },
      include: {
        questions: {
          orderBy: { order: 'asc' },
          where: { question: { status: 'PUBLISHED' } },
          include: { question: { select: { id: true, text: true, topicId: true, options: { select: { id: true, label: true, text: true, isCorrect: true }, orderBy: { label: 'asc' } } } } },
        },
      },
    });
  }

  private payload(attempt: { id: string; startedAt: Date; status: string; answers: { questionId: string; selectedOptionId: string | null }[] }, test: NonNullable<Awaited<ReturnType<TestsService['loadTest']>>>) {
    const deadline = this.deadlineOf(attempt.startedAt, test.durationMin);
    const qs = seededShuffle(test.questions.map((tq) => tq.question), attempt.id).map((q) => ({
      id: q.id,
      text: q.text,
      options: seededShuffle(q.options, attempt.id + q.id).map((o) => ({ id: o.id, text: o.text })), // isCorrect/label kokhono pathai na
    }));
    return {
      attemptId: attempt.id,
      status: attempt.status,
      startedAt: attempt.startedAt,
      deadline: new Date(deadline).toISOString(),
      serverNow: new Date().toISOString(),
      durationSec: test.durationMin * 60,
      test: { id: test.id, title: test.title, slug: test.slug, negativeMark: test.negativeMark, markPerQ: test.markPerQ },
      questions: qs,
      answers: Object.fromEntries(attempt.answers.map((a) => [a.questionId, a.selectedOptionId])),
    };
  }

  async start(testId: string, user: AuthUser) {
    const test = await this.loadTest(testId);
    if (!test || !test.isPublished) throw new NotFoundException('Test paoa jay nai');
    if (!test.questions.length) throw new BadRequestException('Ei test-e ekhono question nei');
    if (test.isPremium && !(await this.subs.isPremium(user.id, user.role)))
      throw new ForbiddenException({ code: 'PREMIUM_REQUIRED', message: 'Ei test Premium member-der jonno' });
    const now = Date.now();
    if (test.startsAt && now < test.startsAt.getTime()) throw new BadRequestException('Test ekhono shuru hoy nai');
    if (test.endsAt && now > test.endsAt.getTime()) throw new BadRequestException('Test-er shomoy shesh');

    let attempt = await this.prisma.testAttempt.findFirst({ where: { userId: user.id, testId, status: 'IN_PROGRESS' }, include: { answers: true } });
    if (attempt && now > this.deadlineOf(attempt.startedAt, test.durationMin) + GRACE_MS) {
      await this.finalize(attempt.id, user.id); // purono expired attempt bondho kore notun shuru
      attempt = null;
    }
    if (!attempt) attempt = await this.prisma.testAttempt.create({ data: { userId: user.id, testId }, include: { answers: true } });
    return this.payload(attempt, test);
  }

  async state(attemptId: string, user: AuthUser) {
    const attempt = await this.prisma.testAttempt.findFirst({ where: { id: attemptId, userId: user.id }, include: { answers: true } });
    if (!attempt) throw new NotFoundException();
    const test = await this.loadTest(attempt.testId);
    return this.payload(attempt, test!);
  }

  async saveAnswer(attemptId: string, user: AuthUser, dto: { questionId: string; optionId: string | null; timeSpentSec?: number }) {
    const attempt = await this.prisma.testAttempt.findFirst({ where: { id: attemptId, userId: user.id }, include: { test: true } });
    if (!attempt) throw new NotFoundException();
    if (attempt.status !== 'IN_PROGRESS') throw new BadRequestException('Test already submit hoyeche');
    if (Date.now() > this.deadlineOf(attempt.startedAt, attempt.test.durationMin) + GRACE_MS) throw new BadRequestException('Shomoy shesh');
    const inTest = await this.prisma.modelTestQuestion.findUnique({ where: { testId_questionId: { testId: attempt.testId, questionId: dto.questionId } } });
    if (!inTest) throw new BadRequestException('Question ei test-er na');
    if (dto.optionId) {
      const opt = await this.prisma.option.findFirst({ where: { id: dto.optionId, questionId: dto.questionId } });
      if (!opt) throw new BadRequestException('Option thik na');
    }
    await this.prisma.attemptAnswer.upsert({
      where: { attemptId_questionId: { attemptId, questionId: dto.questionId } },
      create: { attemptId, questionId: dto.questionId, selectedOptionId: dto.optionId, timeSpentSec: dto.timeSpentSec ?? 0 },
      update: { selectedOptionId: dto.optionId, timeSpentSec: dto.timeSpentSec ?? 0, answeredAt: new Date() },
    });
    return { ok: true };
  }

  /** Score shobshomoy server-e calculate hoy */
  async finalize(attemptId: string, userId: string) {
    const attempt = await this.prisma.testAttempt.findFirst({
      where: { id: attemptId, userId },
      include: { test: true, answers: true },
    });
    if (!attempt) throw new NotFoundException();
    if (attempt.status !== 'IN_PROGRESS') return this.summary(attempt);

    const test = await this.loadTest(attempt.testId);
    const expired = Date.now() > this.deadlineOf(attempt.startedAt, attempt.test.durationMin) + GRACE_MS;
    const byQ = new Map(attempt.answers.map((a) => [a.questionId, a]));
    let correct = 0, wrong = 0, skipped = 0;
    const updates: ReturnType<PrismaService['attemptAnswer']['update']>[] = [];
    const recs: { topicId: string | null; correct: boolean }[] = [];

    for (const { question } of test!.questions) {
      const ans = byQ.get(question.id);
      if (!ans?.selectedOptionId) { skipped++; continue; }
      const right = question.options.find((o) => o.isCorrect)?.id;
      const ok = ans.selectedOptionId === right;
      ok ? correct++ : wrong++;
      recs.push({ topicId: question.topicId, correct: ok });
      updates.push(this.prisma.attemptAnswer.update({ where: { id: ans.id }, data: { isCorrect: ok } }));
    }
    const score = Math.round((correct * attempt.test.markPerQ - wrong * attempt.test.negativeMark) * 100) / 100;

    await this.prisma.$transaction([
      ...updates,
      this.prisma.testAttempt.update({
        where: { id: attemptId },
        data: { status: expired ? 'EXPIRED' : 'SUBMITTED', submittedAt: new Date(), score, correctCount: correct, wrongCount: wrong, skippedCount: skipped },
      }),
    ]);
    await this.analytics.record(userId, recs);
    return { attemptId, score, correct, wrong, skipped };
  }

  private summary(a: { id: string; score: number; correctCount: number; wrongCount: number; skippedCount: number }) {
    return { attemptId: a.id, score: a.score, correct: a.correctCount, wrong: a.wrongCount, skipped: a.skippedCount };
  }

  async result(attemptId: string, user: AuthUser) {
    const attempt = await this.prisma.testAttempt.findFirst({ where: { id: attemptId, userId: user.id }, include: { test: true, answers: true } });
    if (!attempt) throw new NotFoundException();
    if (attempt.status === 'IN_PROGRESS') throw new BadRequestException('Test ekhono shesh hoy nai');

    const full = await this.prisma.modelTest.findUniqueOrThrow({
      where: { id: attempt.testId },
      include: {
        questions: {
          where: { question: { status: 'PUBLISHED' } },
          include: { question: { select: { id: true, slug: true, text: true, explanation: true, topic: { select: { id: true, name: true } }, options: { select: { id: true, label: true, text: true, isCorrect: true }, orderBy: { label: 'asc' } } } } },
        },
      },
    });
    const byQ = new Map(attempt.answers.map((a) => [a.questionId, a]));
    // attempt-e jei order-e dekhano hoyechilo, review-eo sei order
    const shown = seededShuffle(full.questions.filter((tq) => tq.question.options.length).map((tq) => tq.question), attempt.id);
    const review = shown.map((q, i) => {
      const a = byQ.get(q.id);
      const opts = seededShuffle(q.options, attempt.id + q.id).map((o, idx) => ({ id: o.id, label: LETTERS[idx], text: o.text, isCorrect: o.isCorrect }));
      return {
        no: i + 1, id: q.id, slug: q.slug, text: q.text, explanation: q.explanation, topic: q.topic?.name ?? null,
        options: opts, selectedOptionId: a?.selectedOptionId ?? null, isCorrect: !!a?.selectedOptionId && a.isCorrect, skipped: !a?.selectedOptionId,
      };
    });

    const topicMap = new Map<string, { topic: string; attempted: number; correct: number }>();
    for (const r of review) {
      if (!r.topic || r.skipped) continue;
      const e = topicMap.get(r.topic) ?? { topic: r.topic, attempted: 0, correct: 0 };
      e.attempted++;
      if (r.isCorrect) e.correct++;
      topicMap.set(r.topic, e);
    }

    const [better, participants] = await Promise.all([
      this.prisma.testAttempt.groupBy({ by: ['userId'], where: { testId: attempt.testId, status: { not: 'IN_PROGRESS' } }, having: { score: { _max: { gt: attempt.score } } } }),
      this.prisma.testAttempt.groupBy({ by: ['userId'], where: { testId: attempt.testId, status: { not: 'IN_PROGRESS' } } }),
    ]);

    return {
      attemptId: attempt.id,
      status: attempt.status,
      test: { id: attempt.test.id, title: attempt.test.title, slug: attempt.test.slug, markPerQ: attempt.test.markPerQ, negativeMark: attempt.test.negativeMark },
      score: attempt.score,
      totalMarks: review.length * attempt.test.markPerQ,
      correct: attempt.correctCount,
      wrong: attempt.wrongCount,
      skipped: attempt.skippedCount,
      seconds: attempt.submittedAt ? Math.round((attempt.submittedAt.getTime() - attempt.startedAt.getTime()) / 1000) : 0,
      rank: better.length + 1,
      participants: participants.length,
      topics: [...topicMap.values()].map((t) => ({ ...t, accuracy: Math.round((t.correct / t.attempted) * 100) })),
      review,
    };
  }
}
