import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { QueryContentDto } from './dto/query-content.dto';
import { PaginatedResponse } from '../common/dto/pagination.dto';

@Injectable()
export class ContentService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: QueryContentDto, userHasSubscription: boolean) {
    const where: Prisma.ContentWhereInput = {
      status: 'PUBLISHED',
    };

    if (query.type) {
      where.type = query.type as any;
    }

    if (query.isPremium !== undefined) {
      where.isPremium = query.isPremium;
    }

    if (query.tagSlug) {
      where.tags = {
        some: { tag: { slug: query.tagSlug } },
      };
    }

    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { excerpt: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const select: Prisma.ContentSelect = {
      id: true,
      title: true,
      slug: true,
      type: true,
      excerpt: true,
      thumbnailUrl: true,
      isPremium: true,
      publishedAt: true,
      viewCount: true,
      readTimeMinutes: true,
      author: {
        select: { id: true, firstName: true, lastName: true },
      },
      tags: {
        include: { tag: { select: { id: true, name: true, slug: true } } },
      },
    };

    const [items, total] = await Promise.all([
      this.prisma.content.findMany({
        where,
        select,
        orderBy: { publishedAt: 'desc' },
        skip: query.skip,
        take: query.limit,
      }),
      this.prisma.content.count({ where }),
    ]);

    return new PaginatedResponse(items, total, query.page, query.limit);
  }

  async findBySlug(slug: string, userHasSubscription: boolean) {
    const content = await this.prisma.content.findUnique({
      where: { slug },
      include: {
        author: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true },
        },
        tags: {
          include: { tag: { select: { id: true, name: true, slug: true } } },
        },
      },
    });

    if (!content || content.status !== 'PUBLISHED') {
      throw new NotFoundException('Content not found');
    }

    // Increment view count asynchronously
    this.prisma.content
      .update({
        where: { id: content.id },
        data: { viewCount: { increment: 1 } },
      })
      .catch(() => {});

    // Gate premium content
    if (content.isPremium && !userHasSubscription) {
      return {
        ...content,
        body: null,
        videoUrl: null,
        _gated: true,
        _message: 'Subscribe to access premium content',
      };
    }

    return { ...content, _gated: false };
  }

  async findById(id: string, userHasSubscription: boolean) {
    const content = await this.prisma.content.findUnique({
      where: { id },
      include: {
        author: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true },
        },
        tags: {
          include: { tag: { select: { id: true, name: true, slug: true } } },
        },
      },
    });

    if (!content || content.status !== 'PUBLISHED') {
      throw new NotFoundException('Content not found');
    }

    this.prisma.content
      .update({
        where: { id: content.id },
        data: { viewCount: { increment: 1 } },
      })
      .catch(() => {});

    if (content.isPremium && !userHasSubscription) {
      return {
        ...content,
        body: null,
        videoUrl: null,
        _gated: true,
        _message: 'Subscribe to access premium content',
      };
    }

    return { ...content, _gated: false };
  }
}
