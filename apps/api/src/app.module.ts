import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { Controller, Get } from '@nestjs/common';
import { CommonModule } from './common/common.module';
import { PrismaService } from './prisma/prisma.service';
import { RolesGuard } from './common/roles';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CatalogModule } from './catalog/catalog.module';
import { QuestionsModule } from './questions/questions.module';
import { ExamsModule } from './exams/exams.module';
import { TestsModule } from './tests/tests.module';
import { PracticeModule } from './practice/practice.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { BookmarksModule } from './bookmarks/bookmarks.module';
import { ReportsModule } from './reports/reports.module';
import { SearchModule } from './search/search.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { AdminModule } from './admin/admin.module';
import { SitemapModule } from './sitemap/sitemap.module';
import { GamificationModule } from './gamification/gamification.module';
import { InterviewModule } from './interview/interview.module';
@Controller('health')
class HealthController {
  constructor(private prisma: PrismaService) {}
  @Get() ok() { return { status: 'ok', time: new Date().toISOString() }; }
  /** ডেটাবেসসহ ping: Neon/ব্যাকএন্ড ঘুমিয়ে পড়া ঠেকাতে */
  @Get('db') async db() { await this.prisma.$queryRaw`SELECT 1`; return { status: 'ok', db: true }; }
}

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 240 }]),
    CommonModule, AuthModule, UsersModule, CatalogModule, QuestionsModule, ExamsModule, TestsModule, PracticeModule,
    AnalyticsModule,GamificationModule,InterviewModule, BookmarksModule, ReportsModule, SearchModule, SubscriptionsModule, AdminModule, SitemapModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }, RolesGuard],
})
export class AppModule {}
