import { BadRequestException, Body, ConflictException, Controller, Get, HttpCode, Module, Patch, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import * as bcrypt from 'bcrypt';
import { IsBoolean, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser, CurrentUser, JwtAuthGuard } from '../common/roles';
import { randomToken } from '../common/utils';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';

class UpdateMeDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(60) name?: string;
  @IsOptional() @Matches(/^01[3-9]\d{8}$/, { message: 'সঠিক মোবাইল নম্বর দিন (01XXXXXXXXX)' }) phone?: string;
  @IsOptional() @IsString() @MaxLength(60) targetCategory?: string; // category slug (hsc/bcs/admission)
  @IsOptional() @IsInt() @Min(1) @Max(200) dailyGoal?: number;
  @IsOptional() @IsBoolean() skipOnboarding?: boolean;
}

class DeleteAccountDto {
  @IsString() @MinLength(1) password: string;
}

type UserRow = {
  id: string; name: string; email: string | null; phone: string | null; role: string;
  targetCategory: string | null; dailyGoal: number; onboardedAt: Date | null;
};

@UseGuards(JwtAuthGuard)
@Controller('users')
class UsersController {
  constructor(private prisma: PrismaService, private subs: SubscriptionsService) {}

  private view(u: UserRow) {
    return {
      id: u.id, name: u.name, email: u.email, phone: u.phone, role: u.role,
      targetCategory: u.targetCategory, dailyGoal: u.dailyGoal, onboarded: !!u.onboardedAt,
    };
  }

  @Get('me')
  async me(@CurrentUser() u: AuthUser) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: u.id } });
    return { ...this.view(user), isPremium: await this.subs.isPremium(user.id, user.role) };
  }

  @Patch('me')
  async update(@CurrentUser() u: AuthUser, @Body() dto: UpdateMeDto) {
    const { skipOnboarding, targetCategory, ...rest } = dto;
    if (targetCategory) {
      const ok = await this.prisma.category.findFirst({ where: { slug: targetCategory, isActive: true }, select: { id: true } });
      if (!ok) throw new BadRequestException('পরীক্ষার ধরন পাওয়া যায়নি');
    }
    if (rest.phone) {
      const clash = await this.prisma.user.findFirst({ where: { phone: rest.phone, id: { not: u.id } }, select: { id: true } });
      if (clash) throw new ConflictException('এই মোবাইল নম্বর অন্য একটি অ্যাকাউন্টে ব্যবহার হচ্ছে');
    }
    const touchesOnboarding = !!targetCategory || rest.dailyGoal !== undefined || !!skipOnboarding;
    const user = await this.prisma.user.update({
      where: { id: u.id },
      data: {
        ...rest,
        ...(targetCategory ? { targetCategory } : {}),
        ...(touchesOnboarding ? { onboardedAt: new Date() } : {}),
      },
    });
    return this.view(user);
  }

  /**
   * Account delete = anonymize. Payment/ImportJob-er shathe relation ache ar hisab rakha dorkar,
   * tai row muchi na; personal info ar learning data muche dei.
   */
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(200)
  @Post('me/delete')
  async remove(@CurrentUser() u: AuthUser, @Body() dto: DeleteAccountDto) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: u.id } });
    if (user.role === 'ADMIN') throw new BadRequestException('অ্যাডমিন অ্যাকাউন্ট এখান থেকে মোছা যাবে না');
    if (!(await bcrypt.compare(dto.password, user.passwordHash))) throw new BadRequestException('পাসওয়ার্ড সঠিক নয়');
    const id = u.id;
    const scrambled = await bcrypt.hash(randomToken(), 11);
    await this.prisma.$transaction([
      this.prisma.refreshToken.deleteMany({ where: { userId: id } }),
      this.prisma.passwordResetToken.deleteMany({ where: { userId: id } }),
      this.prisma.bookmark.deleteMany({ where: { userId: id } }),
      this.prisma.userTopicStat.deleteMany({ where: { userId: id } }),
      this.prisma.userQuestionStat.deleteMany({ where: { userId: id } }),
            this.prisma.xpLog.deleteMany({ where: { userId: id } }),
      this.prisma.userBadge.deleteMany({ where: { userId: id } }),
      this.prisma.challengeRun.deleteMany({ where: { userId: id } }),
      this.prisma.dailyActivity.deleteMany({ where: { userId: id } }),
      this.prisma.testAttempt.deleteMany({ where: { userId: id } }),
      this.prisma.subscription.updateMany({ where: { userId: id, status: 'ACTIVE' }, data: { status: 'CANCELLED' } }),
      this.prisma.user.update({
        where: { id },
        data: {
          name: 'মুছে ফেলা ব্যবহারকারী', email: null, phone: null, avatarUrl: null,
          targetCategory: null, onboardedAt: null, isActive: false, passwordHash: scrambled,
        },
      }),
    ]);
    return { ok: true };

  }
}

@Module({ imports: [SubscriptionsModule], controllers: [UsersController] })
export class UsersModule {}