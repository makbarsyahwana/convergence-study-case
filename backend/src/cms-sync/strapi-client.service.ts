import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface StrapiArticle {
  id: number;
  title: string;
  slug: string;
  body: string | null;
  excerpt: string | null;
  type: string;
  isPremium: boolean;
  thumbnailUrl: string | null;
  videoUrl: string | null;
  readTimeMinutes: number | null;
  publishedAt: string | null;
}

@Injectable()
export class StrapiClientService {
  private readonly logger = new Logger(StrapiClientService.name);
  private readonly baseUrl: string;
  private readonly token: string;

  constructor(private config: ConfigService) {
    this.baseUrl = this.config.get<string>('STRAPI_URL', 'http://localhost:1337');
    this.token = this.config.get<string>('STRAPI_API_TOKEN', '');
  }

  private get headers(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
    };
  }

  async fetchAllArticles(page = 1, pageSize = 25): Promise<any[]> {
    const url = `${this.baseUrl}/api/articles?pagination[page]=${page}&pagination[pageSize]=${pageSize}&populate=*&publicationState=live`;

    this.logger.log(`Fetching Strapi articles: page=${page}, pageSize=${pageSize}`);

    const res = await fetch(url, { headers: this.headers });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Strapi fetch failed (${res.status}): ${text}`);
    }

    const json = await res.json();
    const items: any[] = json.data ?? [];
    const total: number = json.meta?.pagination?.total ?? 0;
    const fetched = (page - 1) * pageSize + items.length;

    this.logger.log(`Fetched ${items.length} articles (${fetched}/${total})`);

    if (fetched < total) {
      const next = await this.fetchAllArticles(page + 1, pageSize);
      return [...items, ...next];
    }

    return items;
  }

  async fetchArticleById(strapiId: number): Promise<any | null> {
    const url = `${this.baseUrl}/api/articles/${strapiId}?populate=*`;

    const res = await fetch(url, { headers: this.headers });
    if (!res.ok) {
      if (res.status === 404) return null;
      throw new Error(`Strapi fetch failed (${res.status})`);
    }

    const json = await res.json();
    return json.data ?? null;
  }

  /**
   * Maps a Strapi v4 response item to a flat article object.
   * Strapi v4 format: { id, attributes: { title, slug, ... } }
   */
  mapArticle(item: any): StrapiArticle {
    const attrs = item.attributes ?? item;
    return {
      id: item.id ?? attrs.id,
      title: attrs.title ?? 'Untitled',
      slug: attrs.slug ?? `content-${item.id}-${Date.now()}`,
      body: this.blocksToHtml(attrs.body),
      excerpt: attrs.excerpt ?? null,
      type: (attrs.type ?? 'ARTICLE').toUpperCase(),
      isPremium: attrs.isPremium ?? false,
      thumbnailUrl: this.extractMediaUrl(attrs.thumbnail) ?? attrs.thumbnailUrl ?? null,
      videoUrl: this.extractMediaUrl(attrs.video) ?? attrs.videoUrl ?? null,
      readTimeMinutes: attrs.readTimeMinutes ?? null,
      publishedAt: attrs.publishedAt ?? null,
    };
  }

  /**
   * Converts Strapi v5 rich-text blocks to an HTML string.
   * Falls back to returning the value as-is if it's already a string.
   */
  private blocksToHtml(body: any): string | null {
    if (!body) return null;
    if (typeof body === 'string') return body;
    if (!Array.isArray(body)) return JSON.stringify(body);

    return body
      .map((block: any) => {
        if (block.type === 'paragraph') {
          const text = (block.children ?? [])
            .map((child: any) => {
              let t = child.text ?? '';
              if (child.bold) t = `<strong>${t}</strong>`;
              if (child.italic) t = `<em>${t}</em>`;
              if (child.underline) t = `<u>${t}</u>`;
              if (child.code) t = `<code>${t}</code>`;
              if (child.type === 'link') t = `<a href="${child.url}">${t}</a>`;
              return t;
            })
            .join('');
          return `<p>${text}</p>`;
        }
        if (block.type === 'heading') {
          const level = block.level ?? 2;
          const text = (block.children ?? []).map((c: any) => c.text ?? '').join('');
          return `<h${level}>${text}</h${level}>`;
        }
        if (block.type === 'list') {
          const tag = block.format === 'ordered' ? 'ol' : 'ul';
          const items = (block.children ?? [])
            .map((li: any) => {
              const text = (li.children ?? []).map((c: any) => c.text ?? '').join('');
              return `<li>${text}</li>`;
            })
            .join('');
          return `<${tag}>${items}</${tag}>`;
        }
        if (block.type === 'image') {
          return `<img src="${block.image?.url ?? ''}" alt="${block.image?.alternativeText ?? ''}" />`;
        }
        if (block.type === 'quote') {
          const text = (block.children ?? []).map((c: any) => c.text ?? '').join('');
          return `<blockquote>${text}</blockquote>`;
        }
        if (block.type === 'code') {
          const text = (block.children ?? []).map((c: any) => c.text ?? '').join('');
          return `<pre><code>${text}</code></pre>`;
        }
        return '';
      })
      .filter(Boolean)
      .join('\n');
  }

  /**
   * Extracts URL from Strapi v4/v5 media field (populated format).
   * Strapi media: { data: { attributes: { url } } }
   */
  private extractMediaUrl(media: any): string | null {
    if (!media) return null;
    if (typeof media === 'string') return media;
    const url = media?.data?.attributes?.url;
    if (!url) return null;
    // If relative URL, prepend Strapi base URL
    return url.startsWith('http') ? url : `${this.baseUrl}${url}`;
  }
}
