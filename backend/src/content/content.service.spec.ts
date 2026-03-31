import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ContentService } from './content.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ContentService', () => {
  let service: ContentService;

  const mockContent = {
    id: 'content-1',
    title: 'Test Article',
    slug: 'test-article',
    type: 'ARTICLE',
    body: '<p>Full body content</p>',
    excerpt: 'Test excerpt',
    isPremium: false,
    status: 'PUBLISHED',
    publishedAt: new Date(),
    viewCount: 10,
    author: { id: 'author-1', firstName: 'John', lastName: 'Doe', avatarUrl: null },
    tags: [],
  };

  const mockPremiumContent = {
    ...mockContent,
    id: 'content-2',
    slug: 'premium-article',
    isPremium: true,
    body: '<p>Premium body content</p>',
    videoUrl: 'https://example.com/video.mp4',
  };

  const mockPrisma = {
    content: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      update: jest.fn().mockResolvedValue({}),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContentService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ContentService>(ContentService);
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return paginated content', async () => {
      mockPrisma.content.findMany.mockResolvedValue([mockContent]);
      mockPrisma.content.count.mockResolvedValue(1);

      const result = await service.findAll(
        { page: 1, limit: 20, skip: 0 } as any,
        false,
      );

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
    });
  });

  describe('findBySlug', () => {
    it('should return full content for free articles', async () => {
      mockPrisma.content.findUnique.mockResolvedValue(mockContent);

      const result = await service.findBySlug('test-article', false);

      expect(result._gated).toBe(false);
      expect(result.body).toBeDefined();
    });

    it('should gate premium content for non-subscribers', async () => {
      mockPrisma.content.findUnique.mockResolvedValue(mockPremiumContent);

      const result = await service.findBySlug('premium-article', false);

      expect(result._gated).toBe(true);
      expect(result.body).toBeNull();
      expect(result.videoUrl).toBeNull();
    });

    it('should return full premium content for subscribers', async () => {
      mockPrisma.content.findUnique.mockResolvedValue(mockPremiumContent);

      const result = await service.findBySlug('premium-article', true);

      expect(result._gated).toBe(false);
      expect(result.body).toBeDefined();
    });

    it('should throw NotFoundException for missing content', async () => {
      mockPrisma.content.findUnique.mockResolvedValue(null);

      await expect(
        service.findBySlug('nonexistent', false),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
