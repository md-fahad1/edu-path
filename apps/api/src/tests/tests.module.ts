import { Body, Controller, Get, HttpCode, Module, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';
import { AnalyticsModule } from '../analytics/analytics.module';
import { AuthUser, CurrentUser, JwtAuthGuard } from '../common/roles';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { TestsService } from './tests.service';

class AnswerDto {
  @IsString() questionId: string;
  @IsOptional() @IsString() optionId: string | null;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) timeSpentSec?: number;
}

@Controller()
class TestsController {
  constructor(private tests: TestsService) {}

  @Get('tests') list(@Query('chapterId') chapterId?: string, @Query('categorySlug') categorySlug?: string) {
    return this.tests.list({ chapterId, categorySlug });
  }
  @Get('tests/:slug') one(@Param('slug') slug: string) { return this.tests.one(slug); }
  @Get('tests/:id/leaderboard') leaderboard(@Param('id') id: string) { return this.tests.leaderboard(id); }

  @UseGuards(JwtAuthGuard) @HttpCode(200) @Post('tests/:id/start')
  start(@Param('id') id: string, @CurrentUser() u: AuthUser) { return this.tests.start(id, u); }

  @UseGuards(JwtAuthGuard) @Get('attempts/:id')
  state(@Param('id') id: string, @CurrentUser() u: AuthUser) { return this.tests.state(id, u); }

  @UseGuards(JwtAuthGuard) @Patch('attempts/:id/answer')
  answer(@Param('id') id: string, @Body() dto: AnswerDto, @CurrentUser() u: AuthUser) {
    return this.tests.saveAnswer(id, u, { questionId: dto.questionId, optionId: dto.optionId ?? null, timeSpentSec: dto.timeSpentSec });
  }

  @UseGuards(JwtAuthGuard) @HttpCode(200) @Post('attempts/:id/submit')
  submit(@Param('id') id: string, @CurrentUser() u: AuthUser) { return this.tests.finalize(id, u.id); }

  @UseGuards(JwtAuthGuard) @Get('attempts/:id/result')
  result(@Param('id') id: string, @CurrentUser() u: AuthUser) { return this.tests.result(id, u); }
}

@Module({ imports: [AnalyticsModule, SubscriptionsModule], controllers: [TestsController], providers: [TestsService], exports: [TestsService] })
export class TestsModule {}
