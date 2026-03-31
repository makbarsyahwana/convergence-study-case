import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        createdAt: true,
        roles: { include: { role: true } },
        subscriptions: {
          where: { status: 'ACTIVE' },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        preferences: { include: { topic: true } },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async updatePreferences(
    userId: string,
    preferences: { topicIds: string[]; emailDigest: boolean; language: string },
  ) {
    await this.prisma.userPreference.deleteMany({
      where: { userId },
    });

    if (preferences.topicIds.length > 0) {
      await this.prisma.userPreference.createMany({
        data: preferences.topicIds.map((topicId) => ({
          userId,
          topicId,
          emailDigest: preferences.emailDigest,
          language: preferences.language,
        })),
      });
    }

    return this.getProfile(userId);
  }
}
