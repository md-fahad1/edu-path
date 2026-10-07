import { BadRequestException, ConflictException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../common/mail.service';
import { randomToken, sha256 } from '../common/utils';
import { LoginDto, RegisterDto } from './auth.dto';

const REFRESH_DAYS = () => Number(process.env.REFRESH_TTL_DAYS || 30);

@Injectable()
export class AuthService {
  private log = new Logger('Auth');
  constructor(private prisma: PrismaService, private jwt: JwtService, private mail: MailService) {}

  private publicUser(u: { id: string; name: string; email: string | null; phone: string | null; role: string }) {
    return { id: u.id, name: u.name, email: u.email, phone: u.phone, role: u.role };
  }

  private async issue(u: { id: string; name: string; email: string | null; phone: string | null; role: string }) {
    const accessToken = await this.jwt.signAsync({ sub: u.id, role: u.role });
    const refreshToken = randomToken();
    await this.prisma.refreshToken.create({
      data: {
        userId: u.id,
        tokenHash: sha256(refreshToken),
        expiresAt: new Date(Date.now() + REFRESH_DAYS() * 86_400_000),
      },
    });
    return { accessToken, refreshToken, user: this.publicUser(u) };
  }

  async register(dto: RegisterDto) {
    if (!dto.email && !dto.phone) throw new BadRequestException('Email ba phone dite hobe');
    const email = dto.email?.toLowerCase();
    const clash = await this.prisma.user.findFirst({
      where: { OR: [...(email ? [{ email }] : []), ...(dto.phone ? [{ phone: dto.phone }] : [])] },
    });
    if (clash) throw new ConflictException('Ei email/phone diye account already ache');
    const user = await this.prisma.user.create({
      data: { name: dto.name.trim(), email, phone: dto.phone, passwordHash: await bcrypt.hash(dto.password, 11) },
    });
    return this.issue(user);
  }

  async login(dto: LoginDto) {
    const id = dto.identifier.trim();
    const user = await this.prisma.user.findFirst({
      where: id.includes('@') ? { email: id.toLowerCase() } : { phone: id },
    });
    if (!user || !user.isActive || !(await bcrypt.compare(dto.password, user.passwordHash)))
      throw new UnauthorizedException('Email/phone ba password thik na');
    return this.issue(user);
  }

  async refresh(token?: string) {
    if (!token) throw new UnauthorizedException();
    const row = await this.prisma.refreshToken.findUnique({ where: { tokenHash: sha256(token) }, include: { user: true } });
    if (!row) throw new UnauthorizedException();
    if (row.revokedAt) {
      // reuse detection: revoked token abar use hole shob session bondho
      await this.prisma.refreshToken.updateMany({ where: { userId: row.userId, revokedAt: null }, data: { revokedAt: new Date() } });
      throw new UnauthorizedException();
    }
    if (row.expiresAt < new Date() || !row.user.isActive) throw new UnauthorizedException();
    // ৬ ঘণ্টার মধ্যে নতুন refresh token বানানো লাগে না: শুধু নতুন access token (DB তে মাত্র ১টি query)
    if (Date.now() - row.createdAt.getTime() < 6 * 3_600_000) {
      const accessToken = await this.jwt.signAsync({ sub: row.user.id, role: row.user.role });
      return { accessToken, refreshToken: token, user: this.publicUser(row.user) };
    }
    await this.prisma.refreshToken.update({ where: { id: row.id }, data: { revokedAt: new Date() } });
    return this.issue(row.user);
  }

  async logout(token?: string) {
    if (!token) return;
    await this.prisma.refreshToken.updateMany({ where: { tokenHash: sha256(token), revokedAt: null }, data: { revokedAt: new Date() } });
  }

  // ---------- forgot / reset password ----------
  /** Email thakuk ba na thakuk shob shomoy ok: keu jeno jante na pare kon email registered */
  async forgotPassword(emailRaw: string) {
    const user = await this.prisma.user.findUnique({ where: { email: emailRaw.trim().toLowerCase() } });
    if (user && user.isActive) {
      const token = randomToken(32);
      await this.prisma.$transaction([
        this.prisma.passwordResetToken.deleteMany({ where: { userId: user.id } }), // purono link batil
        this.prisma.passwordResetToken.create({
          data: { userId: user.id, tokenHash: sha256(token), expiresAt: new Date(Date.now() + 30 * 60_000) },
        }),
      ]);
      const base = (process.env.FRONTEND_URL || 'http://localhost:3000').split(',')[0].trim().replace(/\/$/, '');
      const link = `${base}/reset-password?token=${token}`;
      // await korchi na, jeno response time diye email ache kina bojha na jay
      void this.mail
        .send(
          user.email!,
          'পাসওয়ার্ড রিসেট করুন',
          `আপনার পাসওয়ার্ড রিসেট করতে এই লিংকে যান (৩০ মিনিট পর্যন্ত বৈধ):\n${link}\n\nআপনি অনুরোধ না করলে এই মেইল উপেক্ষা করুন।`,
          `<p>আপনার পাসওয়ার্ড রিসেট করতে নিচের বাটনে ক্লিক করুন (৩০ মিনিট পর্যন্ত বৈধ)।</p><p><a href="${link}" style="background:#1f55dc;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">পাসওয়ার্ড রিসেট করুন</a></p><p style="color:#666;font-size:13px">আপনি অনুরোধ না করলে এই মেইল উপেক্ষা করুন।</p>`,
        )
        .catch((e) => this.log.error(`reset mail failed: ${e.message}`));
    }
    return { ok: true };
  }

  /** Login thaka obosthay password bodlano. Onno shob device logout, ei device logged-in thake */
  async changePassword(userId: string, current: string, next: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.isActive || !(await bcrypt.compare(current, user.passwordHash)))
      throw new BadRequestException('বর্তমান পাসওয়ার্ড সঠিক নয়');
    if (current === next) throw new BadRequestException('নতুন পাসওয়ার্ড আগেরটির মতো হতে পারবে না');
    const passwordHash = await bcrypt.hash(next, 11);
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: userId }, data: { passwordHash } }),
      this.prisma.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } }),
    ]);
    return this.issue(user);
  }

  async resetPassword(token: string, password: string) {
    const invalid = () => new BadRequestException('লিংকটি সঠিক নয় বা মেয়াদ শেষ। আবার চেষ্টা করুন।');
    const row = await this.prisma.passwordResetToken.findUnique({ where: { tokenHash: sha256(token) }, include: { user: true } });
    if (!row || row.usedAt || row.expiresAt < new Date() || !row.user.isActive) throw invalid();

    const passwordHash = await bcrypt.hash(password, 11);
    await this.prisma.$transaction(async (tx) => {
      // atomic claim: dui tab-e ekshathe use korleo shudhu ekta jitbe
      const claimed = await tx.passwordResetToken.updateMany({ where: { id: row.id, usedAt: null }, data: { usedAt: new Date() } });
      if (claimed.count === 0) throw invalid();
      await tx.user.update({ where: { id: row.userId }, data: { passwordHash } });
      // shob device-e logout (kew password churi kore thakle session-o jabe)
      await tx.refreshToken.updateMany({ where: { userId: row.userId, revokedAt: null }, data: { revokedAt: new Date() } });
    });
    return { ok: true };
  }
}