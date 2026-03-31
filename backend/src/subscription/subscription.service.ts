import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SubscriptionService {
  constructor(private prisma: PrismaService) {}

  async getMySubscription(userId: string) {
    const subscription = await this.prisma.subscription.findFirst({
      where: { userId, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
    });

    if (!subscription) {
      throw new NotFoundException('No active subscription found');
    }

    return subscription;
  }

  async upgradePlan(userId: string, plan: 'MONTHLY' | 'YEARLY') {
    const existing = await this.prisma.subscription.findFirst({
      where: { userId, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
    });

    if (existing && existing.plan !== 'FREE') {
      return this.prisma.subscription.update({
        where: { id: existing.id },
        data: {
          plan,
          startDate: new Date(),
          endDate:
            plan === 'MONTHLY'
              ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
              : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        },
      });
    }

    if (existing) {
      await this.prisma.subscription.update({
        where: { id: existing.id },
        data: { status: 'CANCELLED' },
      });
    }

    return this.prisma.subscription.create({
      data: {
        userId,
        plan,
        status: 'ACTIVE',
        startDate: new Date(),
        endDate:
          plan === 'MONTHLY'
            ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      },
    });
  }

  async cancelSubscription(userId: string) {
    const subscription = await this.prisma.subscription.findFirst({
      where: { userId, status: 'ACTIVE', plan: { not: 'FREE' } },
      orderBy: { createdAt: 'desc' },
    });

    if (!subscription) {
      throw new NotFoundException('No paid subscription to cancel');
    }

    return this.prisma.subscription.update({
      where: { id: subscription.id },
      data: { status: 'CANCELLED' },
    });
  }
}
