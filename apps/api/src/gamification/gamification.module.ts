import { BadRequestException, Body, ConflictException, Controller, Get, Module, Post, UseGuards } from '@nestjs/common';
import { IsString } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import { AnalyticsModule, AnalyticsService } from '../analytics/analytics.module';
import { AuthUser, CurrentUser, JwtAuthGuard, OptionalJwtGuard } from '../common/roles';
import { todayDate } from '../common/utils';
import { BadgeInfo, CHALLENGE_SIZE } from './game';

class ChallengeAnswerDto {
  @IsString() questionId: string;
  @IsString() optionId: string;
}

type Answers = Record<string, { optionId: string; correct: boolean }>;

/** date-string theke deterministic random (shob server-e ek-i set) */
function seeded(seed: string) {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

/** Shoniбar (Dhaka) theke shuru shoptaho. todayDate() = Dhaka tarikh, UTC midnight hishebe */
function weekStart() {
  const d = todayDate();
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 1) % 7));
  return new Date(d.getTime() - 6 * 3_600_000);
}

@UseGuards(JwtAuthGuard)
@Controller('challenge')
class ChallengeController {
  constructor(private prisma: PrismaService, private analytics: AnalyticsService) {}

  /** Ajker prosno-id (published-gulo), tairi na thakle banay. Ek bar bana hole din-bhor fixed. */
  private async todays(date: Date): Promise<string[]> {
    let ids = (await this.prisma.dailyChallenge.findUnique({ where: { date } }))?.questionIds;
    if (!ids) {
      const all = await this.prisma.question.findMany({ where: { status: 'PUBLISHED' }, select: { id: true }, orderBy: { id: 'asc' }, take: 5000 });
      const rnd = seeded(date.toISOString().slice(0, 10));
      for (let i = all.length - 1; i > 0; i--) {
        const j = Math.floor(rnd() * (i + 1));
        [all[i], all[j]] = [all[j], all[i]];
      }
      ids = all.slice(0, CHALLENGE_SIZE).map((x) => x.id);
      if (!ids.length) return [];
      try {
        await this.prisma.dailyChallenge.create({ data: { date, questionIds: ids } });
      } catch {
        ids = (await this.prisma.dailyChallenge.findUnique({ where: { date } }))?.questionIds ?? ids;
      }
    }
    const live = await this.prisma.question.findMany({ where: { id: { in: ids }, status: 'PUBLISHED' }, select: { id: true } });
    const ok = new Set(live.map((l) => l.id));
    return ids.filter((id) => ok.has(id));
  }

  private runKey(userId: string, date: Date) {
    return { userId_date: { userId, date } };
  }

  @Get('status')
  async status(@CurrentUser() u: AuthUser) {
    const date = todayDate();
    const [ids, run] = await Promise.all([this.todays(date), this.prisma.challengeRun.findUnique({ where: this.runKey(u.id, date) })]);
    return { total: ids.length, answered: run?.answered ?? 0, correct: run?.correct ?? 0, done: !!run?.completedAt };
  }

  @Get('today')
  async today(@CurrentUser() u: AuthUser) {
    const date = todayDate();
    const ids = await this.todays(date);
    const key = date.toISOString().slice(0, 10);
    if (!ids.length) return { date: key, total: 0, answered: 0, correct: 0, done: false, questions: [], results: {} };

    const [rows, run] = await Promise.all([
      this.prisma.question.findMany({
        where: { id: { in: ids } },
        select: {
          id: true, text: true, difficulty: true, explanation: true,
          topic: { select: { name: true } },
          options: { select: { id: true, label: true, text: true, isCorrect: true }, orderBy: { label: 'asc' } },
        },
      }),
      this.prisma.challengeRun.findUnique({ where: this.runKey(u.id, date) }),
    ]);
    const byId = new Map(rows.map((r) => [r.id, r]));
    const ordered = ids.map((id) => byId.get(id)).filter((q): q is NonNullable<typeof q> => !!q);
    const answers = (run?.answers ?? {}) as Answers;

    // uttor na dile shothik option/explanation pathai na
    const results: Record<string, { optionId: string; isCorrect: boolean; correctOptionId: string | null; explanation: string | null }> = {};
    for (const q of ordered) {
      const a = answers[q.id];
      if (a) results[q.id] = { optionId: a.optionId, isCorrect: a.correct, correctOptionId: q.options.find((o) => o.isCorrect)?.id ?? null, explanation: q.explanation };
    }
    const vals = ordered.map((q) => answers[q.id]).filter(Boolean);
    return {
      date: key,
      total: ordered.length,
      answered: vals.length,
      correct: vals.filter((a) => a.correct).length,
      done: !!run?.completedAt,
      questions: ordered.map((q) => ({
        id: q.id, text: q.text, difficulty: q.difficulty, topic: q.topic,
        options: q.options.map(({ id, label, text }) => ({ id, label, text })),
      })),
      results,
    };
  }

  @Post('answer')
  async answer(@CurrentUser() u: AuthUser, @Body() dto: ChallengeAnswerDto) {
    const date = todayDate();
    const ids = await this.todays(date);
    if (!ids.includes(dto.questionId)) throw new BadRequestException('এই প্রশ্ন আজকের চ্যালেঞ্জে নেই');

    const run = await this.prisma.challengeRun.findUnique({ where: this.runKey(u.id, date) });
    const answers: Answers = { ...((run?.answers ?? {}) as Answers) };
    if (answers[dto.questionId]) throw new ConflictException('এই প্রশ্নের উত্তর আগেই দেওয়া হয়েছে');

    const q = await this.prisma.question.findUniqueOrThrow({
      where: { id: dto.questionId },
      select: { id: true, topicId: true, explanation: true, options: { select: { id: true, isCorrect: true } } },
    });
    const chosen = q.options.find((o) => o.id === dto.optionId);
    if (!chosen) throw new BadRequestException('অপশন পাওয়া যায়নি');

    answers[q.id] = { optionId: chosen.id, correct: chosen.isCorrect };
    const vals = ids.map((id) => answers[id]).filter(Boolean);
    const answered = vals.length;
    const correct = vals.filter((a) => a.correct).length;
    const done = answered >= ids.length;
    const completedAt = done ? new Date() : null;

    await this.prisma.challengeRun.upsert({
      where: this.runKey(u.id, date),
      create: { userId: u.id, date, answers, correct, answered, completedAt },
      update: { answers, correct, answered, completedAt },
    });

    // practice-er moto: topic stat + notebook + XP + badge
    const rec = await this.analytics.record(u.id, [{ topicId: q.topicId, correct: chosen.isCorrect, questionId: q.id }]);
    let xp = rec.xp;
    const badges: BadgeInfo[] = [...rec.badges];
    let bonus: { xp: number; streak: number; perfect: boolean } | null = null;

    if (done) {
      const streak = await this.analytics.streak(u.id);
      const perfect = correct === ids.length;
      const b = 20 + (perfect ? 10 : 0) + Math.min(streak, 7) * 5;
      await this.analytics.awardXp(u.id, b, 'challenge');
      xp += b;
      bonus = { xp: b, streak, perfect };
      badges.push(...(await this.analytics.checkBadges(u.id)));
    }

    return {
      isCorrect: chosen.isCorrect,
      correctOptionId: q.options.find((o) => o.isCorrect)?.id ?? null,
      explanation: q.explanation,
      notebook: rec.questions.get(q.id) ?? null,
      answered, total: ids.length, correct, done, bonus,
      game: { xp, badges },
    };
  }
}

@UseGuards(OptionalJwtGuard)
@Controller('leaderboard')
class LeaderboardController {
  constructor(private prisma: PrismaService) {}

  /** Ei shoptaher top 20 (XP onujayi) + login thakle nijer rank */
  @Get('weekly')
  async weekly(@CurrentUser() u: AuthUser | null) {
    const since = weekStart();
    const where = { createdAt: { gte: since }, user: { isActive: true } };
    const top = await this.prisma.xpLog.groupBy({
      by: ['userId'], where, _sum: { amount: true }, orderBy: { _sum: { amount: 'desc' } }, take: 20,
    });
    const users = await this.prisma.user.findMany({
      where: { id: { in: top.map((t) => t.userId) } }, select: { id: true, name: true, xp: true },
    });
    const byId = new Map(users.map((x) => [x.id, x]));
    const rows = top.map((t, i) => ({
      rank: i + 1,
      name: (byId.get(t.userId)?.name ?? 'অজানা').slice(0, 28),
      xp: t._sum.amount ?? 0,
      isMe: t.userId === u?.id,
    }));

    let me: { xp: number; rank: number | null } | null = null;
    if (u) {
      const mine = (await this.prisma.xpLog.aggregate({ where: { userId: u.id, createdAt: { gte: since } }, _sum: { amount: true } }))._sum.amount ?? 0;
      const ahead = mine > 0
        ? (await this.prisma.xpLog.groupBy({ by: ['userId'], where, having: { amount: { _sum: { gt: mine } } } })).length
        : null;
      me = { xp: mine, rank: ahead === null ? null : ahead + 1 };
    }
    return { since: since.toISOString(), rows, me };
  }
}

@Module({ imports: [AnalyticsModule], controllers: [ChallengeController, LeaderboardController] })
export class GamificationModule {}