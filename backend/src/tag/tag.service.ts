import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TagService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.tag.findMany({
      include: {
        children: true,
        _count: { select: { contents: true } },
      },
      where: { parentId: null },
      orderBy: { name: 'asc' },
    });
  }

  async findBySlug(slug: string) {
    return this.prisma.tag.findUnique({
      where: { slug },
      include: {
        children: true,
        contents: {
          include: {
            content: {
              select: {
                id: true,
                title: true,
                slug: true,
                type: true,
                excerpt: true,
                thumbnailUrl: true,
                isPremium: true,
                publishedAt: true,
              },
            },
          },
          take: 20,
        },
      },
    });
  }
}
