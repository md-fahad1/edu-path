import { Body, Controller, Get, Module, NotFoundException, Post, Query, UseGuards } from '@nestjs/common';
import { IsOptional, IsString } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import { AnalyticsModule, AnalyticsService } from '../analytics/analytics.module';
import { AuthUser, CurrentUser, OptionalJwtGuard } from '../common/roles';

class AnswerDto {
  @IsString() questionId: string;
  @IsString() optionId: string;
}

/** Guest-ao practice korte pare (friction kom). Login thakle stat/streak update hoy. */
@UseGuards(OptionalJwtGuard)
@Controller('practice')
class PracticeController {
  constructor(private prisma: PrismaService, private analytics: AnalyticsService) {}

  @Get('next')
  async next(@Query('chapterId') chapterId?: string, @Query('topicId') topicId?: string, @Query('exclude') exclude?: string) {
    const ids = (exclude ?? '').split(',').filter(Boolean).slice(-300);
    const where = {
      status: 'PUBLISHED' as const,
      ...(chapterId && { chapterId }),
      ...(topicId && { topicId }),
    };
    const [total, remaining] = await Promise.all([
      this.prisma.question.count({ where }),
      this.prisma.question.count({ where: { ...where, id: { notIn: ids } } }),
    ]);
    if (!remaining) return { question: null, total, remaining: 0 };
    const q = await this.prisma.question.findFirst({
      where: { ...where, id: { notIn: ids } },
      skip: Math.floor(Math.random() * remaining),
      orderBy: { id: 'asc' },
      select: {
        id: true, slug: true, text: true, difficulty: true,
        topic: { select: { name: true } },
        options: { select: { id: true, label: true, text: true }, orderBy: { label: 'asc' } },
      },
    });
    return { question: q, total, remaining: remaining - 1 };
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
    if (user) await this.analytics.record(user.id, [{ topicId: q.topicId, correct: chosen.isCorrect }]);
    return { isCorrect: chosen.isCorrect, correctOptionId: correct?.id ?? null, explanation: q.explanation, slug: q.slug };
  }
}

@Module({ imports: [AnalyticsModule], controllers: [PracticeController] })
export class PracticeModule {}
