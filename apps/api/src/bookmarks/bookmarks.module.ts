import { Controller, Get, Module, Param, Post, UseGuards } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser, CurrentUser, JwtAuthGuard } from '../common/roles';
import { publicOptionSelect } from '../questions/questions.module';

@UseGuards(JwtAuthGuard)
@Controller('bookmarks')
class BookmarksController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async list(@CurrentUser() u: AuthUser) {
    const rows = await this.prisma.bookmark.findMany({
      where: { userId: u.id, question: { status: 'PUBLISHED' } },
      orderBy: { createdAt: 'desc' },
      take: 200,
      select: { question: { select: { id: true, slug: true, text: true, explanation: true, options: publicOptionSelect, chapter: { select: { name: true } } } } },
    });
    return rows.map((r) => r.question);
  }

  @Get('ids')
  async ids(@CurrentUser() u: AuthUser) {
    const rows = await this.prisma.bookmark.findMany({ where: { userId: u.id }, select: { questionId: true } });
    return rows.map((r) => r.questionId);
  }

  @Post(':questionId')
  async toggle(@CurrentUser() u: AuthUser, @Param('questionId') questionId: string) {
    const key = { userId_questionId: { userId: u.id, questionId } };
    const exists = await this.prisma.bookmark.findUnique({ where: key });
    if (exists) {
      await this.prisma.bookmark.delete({ where: key });
      return { bookmarked: false };
    }
    await this.prisma.bookmark.create({ data: { userId: u.id, questionId } });
    return { bookmarked: true };
  }
}

@Module({ controllers: [BookmarksController] })
export class BookmarksModule {}
