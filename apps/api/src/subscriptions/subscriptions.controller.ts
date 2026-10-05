import { Body, Controller, Get, NotImplementedException, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { IsIn, IsString, Matches, MinLength } from 'class-validator';
import { AuthUser, CurrentUser, JwtAuthGuard } from '../common/roles';
import { SubscriptionsService } from './subscriptions.service';

class ManualPaymentDto {
  @IsString() planId: string;
  @IsIn(['BKASH', 'NAGAD']) provider: string;
  @IsString() @MinLength(6) trxId: string;
  @Matches(/^01[3-9]\d{8}$/) senderNumber: string;
}

@Controller()
export class SubscriptionsController {
  constructor(private subs: SubscriptionsService) {}

  @Get('plans') plans() { return this.subs.plans(); }

  @UseGuards(JwtAuthGuard) @Get('subscriptions/me')
  mine(@CurrentUser() u: AuthUser) { return this.subs.mine(u.id); }

  @UseGuards(JwtAuthGuard) @Get('payments/mine')
  payments(@CurrentUser() u: AuthUser) { return this.subs.paymentsOf(u.id); }

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @UseGuards(JwtAuthGuard) @Post('payments/manual')
  manual(@CurrentUser() u: AuthUser, @Body() dto: ManualPaymentDto) { return this.subs.submitManual(u.id, dto); }

  // bKash Tokenized Checkout: merchant credential + official docs lage, tai ekhon stub
  @UseGuards(JwtAuthGuard) @Post('payments/bkash/create')
  bkashCreate() { throw new NotImplementedException('bKash gateway ekhono configure kora nai. Manual payment bebohar korun.'); }

  @UseGuards(JwtAuthGuard) @Post('payments/bkash/execute')
  bkashExecute() { throw new NotImplementedException('bKash gateway ekhono configure kora nai.'); }
}
