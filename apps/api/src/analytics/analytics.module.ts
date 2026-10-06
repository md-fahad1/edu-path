import { Controller, Get, Injectable, Module, UseGuards } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser, CurrentUser, JwtAuthGuard } from '../common/roles';
import { todayDate } from '../common/utils';
import { BADGES, BadgeInfo, CHALLENGE_SIZE, Metrics, levelOf } from '../gamification/game';

const MIN_ATTEMPTS_FOR_WEAK = 3; // doc-e 5; chhoto content-e jeno shigghri dekha jay, tai 3

// ---------- ভুলের নোটবুক (spaced repetition) ----------
// Ulta uttor => notebook-e, 1 din por abar. Shomoy mele shothik dile 3 din, tarpor 7 din, tarpor "shikhe phelechhe" (notebook theke bida).
const REVIEW_DAYS = [1, 3, 7];
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86_400_000);

export type QuestionEvent = 'added' | 'progress' | 'mastered' | null;
export type QResult = { event: QuestionEvent; inNotebook: boolean; nextReviewAt: Date | null };
type QStat = { attempts: number; correctCount: number; wrongCount: number; inNotebook: boolean; box: number; nextReviewAt: Date | null; lastAnsweredAt: Date };

function applyAnswer(prev: QStat | undefined, correct: boolean, now: Date): { stat: QStat; event: QuestionEvent } {
  const base = {
    attempts: (prev?.attempts ?? 0) + 1,
    correctCount: (prev?.correctCount ?? 0) + (correct ? 1 : 0),
    wrongCount: (prev?.wrongCount ?? 0) + (correct ? 0 : 1),
    lastAnsweredAt: now,
  };
  if (!correct) {
    return { stat: { ...base, inNotebook: true, box: 0, nextReviewAt: addDays(now, REVIEW_DAYS[0]) }, event: 'added' };
  }
  if (prev?.inNotebook) {
    const due = !prev.nextReviewAt || prev.nextReviewAt <= now; // shomoy hoyni hole box egoy na (porporo bar bar chhap diye jeno "shikhe phela" na jay)
    if (due) {
      const box = prev.box + 1;
      if (box >= REVIEW_DAYS.length) return { stat: { ...base, inNotebook: false, box: 0, nextReviewAt: null }, event: 'mastered' };
      return { stat: { ...base, inNotebook: true, box, nextReviewAt: addDays(now, REVIEW_DAYS[box]) }, event: 'progress' };
    }
  }
  return {
    stat: { ...base, inNotebook: prev?.inNotebook ?? false, box: prev?.box ?? 0, nextReviewAt: prev?.nextReviewAt ?? null },
    event: null,
  };
}

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Practice / test / challenge-er por call hoy: UserTopicStat + DailyActivity + UserQuestionStat + XP + badge.
   * Return: { questions: per-question notebook event, xp: ei call-e koto XP, badges: notun paoa badge }
   */
  async record(userId: string, items: { topicId: string | null; correct: boolean; questionId?: string }[]) {
    const empty = { questions: new Map<string, QResult>(), xp: 0, badges: [] as BadgeInfo[] };
    if (!items.length) return empty;
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
    const { out, xp } = await this.recordQuestions(userId, items.flatMap((i) => (i.questionId ? [{ questionId: i.questionId, correct: i.correct }] : [])));
    await this.awardXp(userId, xp, 'answer');
    const badges = await this.checkBadges(userId);
    return { questions: out, xp, badges };
  }

  /** Proti prosno-r hisab: kon prosno bhul, kobe abar dekhabo + XP hisab */
  async recordQuestions(userId: string, items: { questionId: string; correct: boolean }[]) {
    const out = new Map<string, QResult>();
    if (!items.length) return { out, xp: 0 };
    const ids = [...new Set(items.map((i) => i.questionId))];
    const rows = await this.prisma.userQuestionStat.findMany({ where: { userId, questionId: { in: ids } } });
    const cur = new Map<string, QStat | undefined>(rows.map((r) => [r.questionId, r]));
    const now = new Date();
    let xp = 0;
    for (const it of items) {
      const prev = cur.get(it.questionId);
      // prothombar shothik = +5, ager shothik prosno abar = +1, bhul = +1
      xp += !it.correct ? 1 : (prev?.correctCount ?? 0) === 0 ? 5 : 1;
      const { stat, event } = applyAnswer(prev, it.correct, now);
      cur.set(it.questionId, stat);
      out.set(it.questionId, { event, inNotebook: stat.inNotebook, nextReviewAt: stat.nextReviewAt });
    }
    await this.prisma.$transaction(
      ids.map((questionId) => {
        const s = cur.get(questionId)!;
        return this.prisma.userQuestionStat.upsert({
          where: { userId_questionId: { userId, questionId } },
          create: { userId, questionId, ...s },
          update: s,
        });
      }),
    );
    return { out, xp };
  }

  // ---------- XP / badge ----------
  async awardXp(userId: string, amount: number, reason: string) {
    if (amount <= 0) return;
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: userId }, data: { xp: { increment: amount } } }),
      this.prisma.xpLog.create({ data: { userId, amount, reason } }),
    ]);
  }

  /** Notun badge-er shorto puron holei dei; notun paoa badge-gulo return kore */
  async checkBadges(userId: string): Promise<BadgeInfo[]> {
    const have = await this.prisma.userBadge.findMany({ where: { userId }, select: { code: true } });
    if (have.length >= BADGES.length) return [];
    const owned = new Set(have.map((h) => h.code));
    const [solved, streak, mastered, tests, challenges, perfect, user] = await Promise.all([
      this.prisma.dailyActivity.aggregate({ where: { userId }, _sum: { questionsSolved: true } }),
      this.streak(userId),
      this.prisma.userQuestionStat.count({ where: { userId, inNotebook: false, wrongCount: { gt: 0 } } }),
      this.prisma.testAttempt.count({ where: { userId, status: { not: 'IN_PROGRESS' } } }),
      this.prisma.challengeRun.count({ where: { userId, completedAt: { not: null } } }),
      this.prisma.challengeRun.count({ where: { userId, completedAt: { not: null }, correct: { gte: CHALLENGE_SIZE } } }),
      this.prisma.user.findUnique({ where: { id: userId }, select: { xp: true } }),
    ]);
    const m: Metrics = {
      solved: solved._sum.questionsSolved ?? 0, streak, mastered, tests, challenges, perfect,
      level: levelOf(user?.xp ?? 0).level,
    };
    const fresh = BADGES.filter((b) => !owned.has(b.code) && b.ok(m));
    if (!fresh.length) return [];
    await this.prisma.userBadge.createMany({ data: fresh.map((b) => ({ userId, code: b.code })), skipDuplicates: true });
    return fresh.map(({ code, name, icon }) => ({ code, name, icon }));
  }

  async game(userId: string) {
    const [user, have] = await Promise.all([
      this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { xp: true } }),
      this.prisma.userBadge.findMany({ where: { userId } }),
    ]);
    const got = new Map(have.map((h) => [h.code, h.earnedAt]));
    return {
      xp: user.xp,
      ...levelOf(user.xp),
      badges: BADGES.map((b) => ({ code: b.code, name: b.name, icon: b.icon, desc: b.desc, earnedAt: got.get(b.code)?.toISOString() ?? null })),
    };
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
    const [solved, stats, tests, streak, todayRow] = await Promise.all([
      this.prisma.dailyActivity.aggregate({ where: { userId }, _sum: { questionsSolved: true } }),
      this.prisma.userTopicStat.findMany({
        where: { userId },
        include: { topic: { select: { chapter: { select: { subject: { select: { id: true, name: true } } } } } } },
      }),
      this.prisma.testAttempt.count({ where: { userId, status: { not: 'IN_PROGRESS' } } }),
      this.streak(userId),
      this.prisma.dailyActivity.findUnique({ where: { userId_date: { userId, date: todayDate() } } }),
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
      todaySolved: todayRow?.questionsSolved ?? 0,
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
  @Get('game') game(@CurrentUser() u: AuthUser) { return this.a.game(u.id); }
}

@Module({ controllers: [AnalyticsController], providers: [AnalyticsService], exports: [AnalyticsService] })
export class AnalyticsModule {}