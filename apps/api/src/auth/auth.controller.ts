import { Body, Controller, HttpCode, Post, Req, Res, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { ChangePasswordDto, ForgotPasswordDto, LoginDto, RegisterDto, ResetPasswordDto } from './auth.dto';
import { AuthUser, CurrentUser, JwtAuthGuard } from '../common/roles';

const COOKIE = 'rt';
function cookieOpts() {
  const sameSite = (process.env.COOKIE_SAMESITE || 'lax') as 'lax' | 'none' | 'strict';
  return {
    httpOnly: true,
    sameSite,
    secure: sameSite === 'none' || process.env.NODE_ENV === 'production',
    path: '/api/v1/auth',
    maxAge: Number(process.env.REFRESH_TTL_DAYS || 30) * 86_400_000,
  };
}

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  private send(res: Response, r: { accessToken: string; refreshToken: string; user: unknown }) {
    res.cookie(COOKIE, r.refreshToken, cookieOpts());
    return { accessToken: r.accessToken, user: r.user };
  }

  @Throttle({ default: { limit: 8, ttl: 60_000 } })
  @Post('register')
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    return this.send(res, await this.auth.register(dto));
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(200)
  @Post('login')
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    return this.send(res, await this.auth.login(dto));
  }

  @HttpCode(200)
  @Post('refresh')
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.send(res, await this.auth.refresh(req.cookies?.[COOKIE]));
  }

  @HttpCode(200)
  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.auth.logout(req.cookies?.[COOKIE]);
    const { maxAge, ...clear } = cookieOpts();
    res.clearCookie(COOKIE, clear);
    return { ok: true };
  }

  // ---------- নতুন: forgot / reset password ----------
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(200)
  @Post('forgot-password')
  forgot(@Body() dto: ForgotPasswordDto) {
    return this.auth.forgotPassword(dto.email);
  }

  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(200)
  @Post('change-password')
  async changePassword(@CurrentUser() u: AuthUser, @Body() dto: ChangePasswordDto, @Res({ passthrough: true }) res: Response) {
    return this.send(res, await this.auth.changePassword(u.id, dto.currentPassword, dto.newPassword));
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(200)
  @Post('reset-password')
  reset(@Body() dto: ResetPasswordDto) {
    return this.auth.resetPassword(dto.token, dto.password);
  }
}