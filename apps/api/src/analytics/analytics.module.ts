import { Controller, Get, Injectable, Module, UseGuards } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser, CurrentUser, JwtAuthGuard } from '../common/roles';
import { todayDate } from '../common/utils';

const MIN_ATTEMPTS_FOR_WEAK = 3; // doc-e 5; chhoto content-e jeno shigghri dekha jay, tai 3

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  /** Practice ba test submit hole UserTopicStat + DailyActivity update */
  async record(userId: string, items: { topicId: string | null; correct: boolean }[]) {
    if (!items.length) return;
    const perTopic = new Map<string, { attempted: number; correct: number }>();
    for (const it of items) {
      if (!it.topicId) continue;
      const s = perTopic.get(it.topicId) ?? { attempted: 0, correct: 0 };
      s.attempted++;
      if (it.correct) s.correct++;
      perTopic.set(it.topicId, s);
    }
    for (const [topicId, s] of perTopic) {
      await this.prisma.userTopicStat.upsert({
        where: { userId_topicId: { userId, topicId } },
        create: { userId, topicId, attempted: s.attempted, correct: s.correct },
        update: { attempted: { increment: s.attempted }, correct: { increment: s.correct }, lastPracticedAt: new Date() },
      });
    }
    const date = todayDate();
    await this.prisma.dailyActivity.upsert({
      where: { userId_date: { userId, date } },
      create: { userId, date, questionsSolved: items.length },
      update: { questionsSolved: { increment: items.length } },
    });
  }

  async streak(userId: string) {
    const days = await this.prisma.dailyActivity.findMany({
      where: { userId, questionsSolved: { gt: 0 } }, orderBy: { date: 'desc' }, take: 400,
    });
    const set = new Set(days.map((d) => d.date.toISOString().slice(0, 10)));
    let streak = 0;
    const cur = todayDate();
    if (!set.has(cur.toISOString().slice(0, 10))) cur.setUTCDate(cur.getUTCDate() - 1);
    while (set.has(cur.toISOString().slice(0, 10))) {
      streak++;
      cur.setUTCDate(cur.getUTCDate() - 1);
    }
    return streak;
  }

  async overview(userId: string) {
    const [solved, stats, tests, streak] = await Promise.all([
      this.prisma.dailyActivity.aggregate({ where: { userId }, _sum: { questionsSolved: true } }),
      this.prisma.userTopicStat.findMany({
        where: { userId },
        include: { topic: { select: { chapter: { select: { subject: { select: { id: true, name: true } } } } } } },
      }),
      this.prisma.testAttempt.count({ where: { userId, status: { not: 'IN_PROGRESS' } } }),
      this.streak(userId),
    ]);
    const attempted = stats.reduce((n, s) => n + s.attempted, 0);
    const correct = stats.reduce((n, s) => n + s.correct, 0);
    const bySubject = new Map<string, { name: string; attempted: number; correct: number }>();
    for (const s of stats) {
      const sub = s.topic.chapter.subject;
      const e = bySubject.get(sub.id) ?? { name: sub.name, attempted: 0, correct: 0 };
      e.attempted += s.attempted;
      e.correct += s.correct;
      bySubject.set(sub.id, e);
    }
    return {
      totalSolved: solved._sum.questionsSolved ?? 0,
      accuracy: attempted ? Math.round((correct / attempted) * 100) : 0,
      streak,
      testsTaken: tests,
      subjectAccuracy: [...bySubject.values()].map((s) => ({ subject: s.name, attempted: s.attempted, accuracy: Math.round((s.correct / s.attempted) * 100) })),
    };
  }

  async weakTopics(userId: string, limit = 5) {
    const stats = await this.prisma.userTopicStat.findMany({
      where: { userId, attempted: { gte: MIN_ATTEMPTS_FOR_WEAK } },
      include: { topic: { select: { id: true, name: true, chapter: { select: { id: true, name: true } } } } },
    });
    return stats
      .map((s) => ({
        topicId: s.topicId, topic: s.topic.name, chapterId: s.topic.chapter.id, chapter: s.topic.chapter.name,
        accuracy: Math.round((s.correct / s.attempted) * 100), attempted: s.attempted,
      }))
      .filter((s) => s.accuracy < 80)
      .sort((a, b) => a.accuracy - b.accuracy)
      .slice(0, limit);
  }

  async history(userId: string) {
    const rows = await this.prisma.testAttempt.findMany({
      where: { userId, status: { not: 'IN_PROGRESS' } }, orderBy: { startedAt: 'desc' }, take: 30,
      include: { test: { select: { title: true, slug: true, markPerQ: true, _count: { select: { questions: true } } } } },
    });
    return rows.map((a) => ({
      id: a.id, title: a.test.title, slug: a.test.slug, score: a.score, total: a.test._count.questions * a.test.markPerQ,
      correct: a.correctCount, wrong: a.wrongCount, skipped: a.skippedCount, at: a.submittedAt ?? a.startedAt,
    }));
  }

  async activity(userId: string, days = 120) {
    const from = todayDate();
    from.setUTCDate(from.getUTCDate() - days);
    const rows = await this.prisma.dailyActivity.findMany({ where: { userId, date: { gte: from } }, orderBy: { date: 'asc' } });
    return rows.map((r) => ({ date: r.date.toISOString().slice(0, 10), count: r.questionsSolved }));
  }
}

@UseGuards(JwtAuthGuard)
@Controller('analytics')
class AnalyticsController {
  constructor(private a: AnalyticsService) {}
  @Get('overview') overview(@CurrentUser() u: AuthUser) { return this.a.overview(u.id); }
  @Get('weak-topics') weak(@CurrentUser() u: AuthUser) { return this.a.weakTopics(u.id); }
  @Get('history') history(@CurrentUser() u: AuthUser) { return this.a.history(u.id); }
  @Get('activity') activity(@CurrentUser() u: AuthUser) { return this.a.activity(u.id); }
}

@Module({ controllers: [AnalyticsController], providers: [AnalyticsService], exports: [AnalyticsService] })
export class AnalyticsModule {}
