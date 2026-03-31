import { Injectable, Logger } from '@nestjs/common';

interface CacheEntry {
  value: any;
  expiresAt: number;
}

@Injectable()
export class RedisCacheService {
  private readonly logger = new Logger(RedisCacheService.name);
  private store = new Map<string, CacheEntry>();
  private defaultTtl = 300; // 5 minutes in seconds

  async get<T>(key: string): Promise<T | undefined> {
    const entry = this.store.get(key);
    if (!entry) return undefined;

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }

    return entry.value as T;
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    const expiresAt = Date.now() + (ttl || this.defaultTtl) * 1000;
    this.store.set(key, { value, expiresAt });
  }

  async del(key: string): Promise<void> {
    // Support wildcard suffix
    if (key.endsWith('*')) {
      const prefix = key.slice(0, -1);
      for (const k of this.store.keys()) {
        if (k.startsWith(prefix)) this.store.delete(k);
      }
    } else {
      this.store.delete(key);
    }
  }

  async reset(): Promise<void> {
    this.store.clear();
  }

  buildKey(...parts: string[]): string {
    return parts.join(':');
  }
}
