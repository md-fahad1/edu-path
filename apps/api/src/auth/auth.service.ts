import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { randomToken, sha256 } from '../common/utils';
import { LoginDto, RegisterDto } from './auth.dto';

const REFRESH_DAYS = () => Number(process.env.REFRESH_TTL_DAYS || 30);

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private jwt: JwtService) {}

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
    await this.prisma.refreshToken.update({ where: { id: row.id }, data: { revokedAt: new Date() } });
    return this.issue(row.user);
  }

  async logout(token?: string) {
    if (!token) return;
    await this.prisma.refreshToken.updateMany({ where: { tokenHash: sha256(token), revokedAt: null }, data: { revokedAt: new Date() } });
  }
}
