import { BadRequestException, Body, Controller, Get, Module, Patch, UseGuards } from '@nestjs/common';
import { IsBoolean, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser, CurrentUser, JwtAuthGuard } from '../common/roles';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';

class UpdateMeDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(60) name?: string;
  @IsOptional() @Matches(/^01[3-9]\d{8}$/) phone?: string;
  @IsOptional() @IsString() @MaxLength(60) targetCategory?: string; // category slug (hsc/bcs/admission)
  @IsOptional() @IsInt() @Min(1) @Max(200) dailyGoal?: number;
  @IsOptional() @IsBoolean() skipOnboarding?: boolean;
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
}

@Module({ imports: [SubscriptionsModule], controllers: [UsersController] })
export class UsersModule {}