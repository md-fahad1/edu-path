import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SubscriptionsService {
  constructor(private prisma: PrismaService) {}

  async isPremium(userId: string, role?: string): Promise<boolean> {
    if (role === 'ADMIN') return true;
    const sub = await this.prisma.subscription.findFirst({ where: { userId, status: 'ACTIVE', endsAt: { gt: new Date() } } });
    return !!sub;
  }

  plans() {
    return this.prisma.plan.findMany({ where: { isActive: true }, orderBy: { priceBdt: 'asc' } });
  }

  async mine(userId: string) {
    const sub = await this.prisma.subscription.findFirst({
      where: { userId, status: 'ACTIVE', endsAt: { gt: new Date() } },
      include: { plan: true },
      orderBy: { endsAt: 'desc' },
    });
    const pending = await this.prisma.payment.count({ where: { userId, status: 'PENDING' } });
    return { active: !!sub, subscription: sub, pendingPayments: pending };
  }

  paymentsOf(userId: string) {
    return this.prisma.payment.findMany({ where: { userId }, include: { plan: true }, orderBy: { createdAt: 'desc' }, take: 20 });
  }

  /** Manual bKash/Nagad fallback: user trxId submit kore, admin approve kore */
  async submitManual(userId: string, dto: { planId: string; provider: string; trxId: string; senderNumber: string }) {
    const plan = await this.prisma.plan.findFirst({ where: { id: dto.planId, isActive: true } });
    if (!plan) throw new NotFoundException('Plan paoa jay nai');
    const trxId = dto.trxId.trim().toUpperCase();
    if (await this.prisma.payment.findUnique({ where: { trxId } })) throw new ConflictException('Ei TrxID age submit kora hoyeche');
    return this.prisma.payment.create({
      data: { userId, planId: plan.id, provider: dto.provider, trxId, senderNumber: dto.senderNumber, amountBdt: plan.priceBdt },
    });
  }

  /** Idempotent: ekoi payment duibar subscription toiri korbe na */
  async activate(paymentId: string) {
    return this.prisma.$transaction(async (tx) => {
      const p = await tx.payment.findUniqueOrThrow({ where: { id: paymentId } });
      if (p.status === 'SUCCESS') return p;
      if (!p.planId) throw new BadRequestException('Payment-e plan nei');
      const plan = await tx.plan.findUniqueOrThrow({ where: { id: p.planId } });
      // already active thakle meyad er sheshe jog hobe
      const current = await tx.subscription.findFirst({
        where: { userId: p.userId, status: 'ACTIVE', endsAt: { gt: new Date() } },
        orderBy: { endsAt: 'desc' },
      });
      const start = current ? current.endsAt : new Date();
      const sub = await tx.subscription.create({
        data: { userId: p.userId, planId: plan.id, startsAt: new Date(), endsAt: new Date(start.getTime() + plan.durationDays * 86_400_000) },
      });
      return tx.payment.update({ where: { id: p.id }, data: { status: 'SUCCESS', subscriptionId: sub.id } });
    });
  }
}
