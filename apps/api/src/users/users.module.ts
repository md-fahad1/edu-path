import { Body, Controller, Get, Module, Patch, UseGuards } from '@nestjs/common';
import { IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser, CurrentUser, JwtAuthGuard } from '../common/roles';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';

class UpdateMeDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(60) name?: string;
  @IsOptional() @Matches(/^01[3-9]\d{8}$/) phone?: string;
}

@UseGuards(JwtAuthGuard)
@Controller('users')
class UsersController {
  constructor(private prisma: PrismaService, private subs: SubscriptionsService) {}

  @Get('me')
  async me(@CurrentUser() u: AuthUser) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: u.id } });
    return { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role, isPremium: await this.subs.isPremium(user.id, user.role) };
  }

  @Patch('me')
  async update(@CurrentUser() u: AuthUser, @Body() dto: UpdateMeDto) {
    const user = await this.prisma.user.update({ where: { id: u.id }, data: dto });
    return { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role };
  }
}

@Module({ imports: [SubscriptionsModule], controllers: [UsersController] })
export class UsersModule {}
