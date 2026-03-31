import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { RedisCacheService } from '../cache/redis-cache.service';
import { StrapiClientService } from './strapi-client.service';

interface StrapiWebhookPayload {
  event: string;
  model: string;
  entry: {
    id: number;
    title?: string;
    slug?: string;
    body?: string;
    excerpt?: string;
    type?: string;
    isPremium?: boolean;
    publishedAt?: string;
    thumbnailUrl?: string;
    videoUrl?: string;
    readTimeMinutes?: number;
  };
}

@Injectable()
export class CmsSyncService {
  private readonly logger = new Logger(CmsSyncService.name);

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private cache: RedisCacheService,
    private strapiClient: StrapiClientService,
  ) {}

  async handleWebhook(payload: StrapiWebhookPayload) {
    this.logger.log(
      `Received CMS webhook: ${payload.event} for ${payload.model}`,
    );

    if (payload.model !== 'article' && payload.model !== 'content') {
      return { status: 'ignored', reason: 'unsupported model' };
    }

    const { event, entry } = payload;

    switch (event) {
      case 'entry.create':
      case 'entry.update':
        return this.upsertContent(entry);
      case 'entry.delete':
        return this.deleteContent(String(entry.id));
      case 'entry.publish':
        return this.publishContent(String(entry.id));
      case 'entry.unpublish':
        return this.unpublishContent(String(entry.id));
      default:
        return { status: 'ignored', reason: `unhandled event: ${event}` };
    }
  }

  private async upsertContent(entry: StrapiWebhookPayload['entry']) {
    const strapiId = String(entry.id);

    const data = {
      title: entry.title || 'Untitled',
      slug:
        entry.slug ||
        `content-${strapiId}-${Date.now()}`,
      body: entry.body || null,
      excerpt: entry.excerpt || null,
      type: (entry.type?.toUpperCase() as 'ARTICLE' | 'VIDEO') || 'ARTICLE',
      isPremium: entry.isPremium || false,
      thumbnailUrl: entry.thumbnailUrl || null,
      videoUrl: entry.videoUrl || null,
      readTimeMinutes: entry.readTimeMinutes || null,
      status: entry.publishedAt ? 'PUBLISHED' as const : 'DRAFT' as const,
      publishedAt: entry.publishedAt ? new Date(entry.publishedAt) : null,
    };

    const existing = await this.prisma.content.findUnique({
      where: { strapiId },
    });

    let result;
    if (existing) {
      result = await this.prisma.content.update({
        where: { strapiId },
        data,
      });
    } else {
      const admin = await this.prisma.user.findFirst({
        where: { roles: { some: { role: { name: 'ADMIN' } } } },
      });

      result = await this.prisma.content.create({
        data: {
          ...data,
          strapiId,
          authorId: admin?.id || '',
        },
      });
    }

    await this.cache.del('content:list:*');
    this.logger.log(`Content upserted: ${result.id} (strapi: ${strapiId})`);
    return { status: 'synced', contentId: result.id };
  }

  private async deleteContent(strapiId: string) {
    await this.prisma.content
      .delete({ where: { strapiId } })
      .catch(() => null);

    await this.cache.del('content:list:*');
    return { status: 'deleted', strapiId };
  }

  private async publishContent(strapiId: string) {
    await this.prisma.content
      .update({
        where: { strapiId },
        data: { status: 'PUBLISHED', publishedAt: new Date() },
      })
      .catch(() => null);

    await this.cache.del('content:list:*');
    return { status: 'published', strapiId };
  }

  private async unpublishContent(strapiId: string) {
    await this.prisma.content
      .update({
        where: { strapiId },
        data: { status: 'DRAFT', publishedAt: null },
      })
      .catch(() => null);

    await this.cache.del('content:list:*');
    return { status: 'unpublished', strapiId };
  }

  async fullSync(): Promise<{ synced: number; errors: number; total: number }> {
    this.logger.log('Starting full content sync from Strapi...');

    const items = await this.strapiClient.fetchAllArticles();
    let synced = 0;
    let errors = 0;

    for (const item of items) {
      try {
        const mapped = this.strapiClient.mapArticle(item);
        await this.upsertContent({
          id: mapped.id,
          title: mapped.title,
          slug: mapped.slug,
          body: mapped.body ?? undefined,
          excerpt: mapped.excerpt ?? undefined,
          type: mapped.type,
          isPremium: mapped.isPremium,
          thumbnailUrl: mapped.thumbnailUrl ?? undefined,
          videoUrl: mapped.videoUrl ?? undefined,
          readTimeMinutes: mapped.readTimeMinutes ?? undefined,
          publishedAt: mapped.publishedAt ?? undefined,
        });
        synced++;
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        this.logger.error(`Failed to sync Strapi item ${item.id}: ${message}`);
        errors++;
      }
    }

    await this.cache.del('content:list:*');
    this.logger.log(
      `Full sync complete: ${synced} synced, ${errors} errors out of ${items.length} total`,
    );

    return { synced, errors, total: items.length };
  }
}
