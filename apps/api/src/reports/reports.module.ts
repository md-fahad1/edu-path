import { Body, Controller, Module, Param, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import { RevalidateService } from '../common/common.module';
import { AuthUser, CurrentUser, OptionalJwtGuard } from '../common/roles';

class ReportDto {
  @IsIn(['WRONG_ANSWER', 'TYPO', 'OUTDATED', 'OTHER']) reason: string;
  @IsOptional() @IsString() @MaxLength(500) note?: string;
}

@Controller('questions')
class ReportsController {
  constructor(private prisma: PrismaService, private reval: RevalidateService) {}

  @Throttle({ default: { limit: 6, ttl: 60_000 } })
  @UseGuards(OptionalJwtGuard)
  @Post(':id/report')
  async report(@Param('id') id: string, @Body() dto: ReportDto, @CurrentUser() user: AuthUser | null) {
    const q = await this.prisma.question.findUniqueOrThrow({ where: { id }, select: { id: true, slug: true, status: true } });
    await this.prisma.questionReport.create({ data: { questionId: id, userId: user?.id, reason: dto.reason, note: dto.note } });
    // 3 ta open report hole question auto REVIEWED-e feroto (admin dekhe abar publish korbe)
    const open = await this.prisma.questionReport.count({ where: { questionId: id, status: 'OPEN' } });
    if (open >= 3 && q.status === 'PUBLISHED') {
      await this.prisma.question.update({ where: { id }, data: { status: 'REVIEWED' } });
      this.reval.paths([`/mcq/${q.slug}`]);
    }
    return { ok: true };
  }
}

@Module({ controllers: [ReportsController] })
export class ReportsModule {}
