import redis from './redis';

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  prefix?: string;
  serialize?: boolean;
}

export class CacheManager {
  private defaultTTL = 3600; // 1 hour
  private defaultPrefix = 'skillsync:';

  constructor(private redisClient = redis) { }

  /**
   * Get cached data
   */
  async get<T>(key: string, options: CacheOptions = {}): Promise<T | null> {
    try {
      const { prefix = this.defaultPrefix, serialize = true } = options;
      const fullKey = `${prefix}${key}`;

      const cached = await this.redisClient.get(fullKey);

      if (!cached) return null;

      return serialize ? JSON.parse(cached) : cached;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  /**
   * Set cached data
   */
  async set<T>(
    key: string,
    value: T,
    options: CacheOptions = {}
  ): Promise<boolean> {
    try {
      const {
        ttl = this.defaultTTL,
        prefix = this.defaultPrefix,
        serialize = true
      } = options;

      const fullKey = `${prefix}${key}`;
      const serializedValue = serialize ? JSON.stringify(value) : String(value);

      await this.redisClient.setex(fullKey, ttl, serializedValue);
      return true;
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  }

  /**
   * Delete cached data
   */
  async delete(key: string, options: CacheOptions = {}): Promise<boolean> {
    try {
      const { prefix = this.defaultPrefix } = options;
      const fullKey = `${prefix}${key}`;

      const result = await this.redisClient.del(fullKey);
      return result > 0;
    } catch (error) {
      console.error('Cache delete error:', error);
      return false;
    }
  }

  /**
   * Get or set cached data with a fallback function
   */
  async getOrSet<T>(
    key: string,
    fallbackFn: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    const cached = await this.get<T>(key, options);

    if (cached !== null) {
      return cached;
    }

    const fresh = await fallbackFn();
    await this.set(key, fresh, options);

    return fresh;
  }

  /**
   * Increment a numeric value in cache
   */
  async increment(
    key: string,
    amount = 1,
    options: CacheOptions = {}
  ): Promise<number> {
    try {
      const { prefix = this.defaultPrefix, ttl } = options;
      const fullKey = `${prefix}${key}`;

      const result = await this.redisClient.incrby(fullKey, amount);

      if (ttl && result === amount) {
        // Set TTL only if this is a new key
        await this.redisClient.expire(fullKey, ttl);
      }

      return result;
    } catch (error) {
      console.error('Cache increment error:', error);
      return 0;
    }
  }

  /**
   * Get multiple keys at once
   */
  async getMultiple<T>(
    keys: string[],
    options: CacheOptions = {}
  ): Promise<Record<string, T | null>> {
    try {
      const { prefix = this.defaultPrefix, serialize = true } = options;
      const fullKeys = keys.map(key => `${prefix}${key}`);

      const values = await this.redisClient.mget(...fullKeys);

      const result: Record<string, T | null> = {};

      keys.forEach((key, index) => {
        const value = values[index];
        result[key] = value ? (serialize ? JSON.parse(value) : value) : null;
      });

      return result;
    } catch (error) {
      console.error('Cache getMultiple error:', error);
      return keys.reduce((acc, key) => ({ ...acc, [key]: null }), {});
    }
  }

  /**
   * Set multiple keys at once
   */
  async setMultiple<T>(
    data: Record<string, T>,
    options: CacheOptions = {}
  ): Promise<boolean> {
    try {
      const {
        ttl = this.defaultTTL,
        prefix = this.defaultPrefix,
        serialize = true
      } = options;

      const pipeline = this.redisClient.pipeline();

      Object.entries(data).forEach(([key, value]) => {
        const fullKey = `${prefix}${key}`;
        const serializedValue = serialize ? JSON.stringify(value) : String(value);
        pipeline.setex(fullKey, ttl, serializedValue);
      });

      await pipeline.exec();
      return true;
    } catch (error) {
      console.error('Cache setMultiple error:', error);
      return false;
    }
  }

  /**
   * Clear all keys with a specific pattern
   */
  async clearPattern(pattern: string, options: CacheOptions = {}): Promise<number> {
    try {
      const { prefix = this.defaultPrefix } = options;
      const fullPattern = `${prefix}${pattern}`;

      const keys = await this.redisClient.keys(fullPattern);

      if (keys.length === 0) return 0;

      const result = await this.redisClient.del(...keys);
      return result;
    } catch (error) {
      console.error('Cache clearPattern error:', error);
      return 0;
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    memory: string;
    keys: number;
    hits: number;
    misses: number;
  }> {
    try {
      const info = await this.redisClient.info('memory');
      const keyspace = await this.redisClient.info('keyspace');
      const stats = await this.redisClient.info('stats');

      const memory = info.match(/used_memory_human:(.+)/)?.[1] || '0B';
      const keys = keyspace.match(/keys=(\d+)/)?.[1] || '0';
      const hits = stats.match(/keyspace_hits:(\d+)/)?.[1] || '0';
      const misses = stats.match(/keyspace_misses:(\d+)/)?.[1] || '0';

      return {
        memory: memory.trim(),
        keys: parseInt(keys),
        hits: parseInt(hits),
        misses: parseInt(misses),
      };
    } catch (error) {
      console.error('Cache getStats error:', error);
      return { memory: '0B', keys: 0, hits: 0, misses: 0 };
    }
  }
}

// Create singleton instance
export const cache = new CacheManager();

// Specific cache strategies for different data types
export const userCache = {
  get: (userId: string) => cache.get(`user:${userId}`, { ttl: 1800 }), // 30 minutes
  set: (userId: string, userData: any) => cache.set(`user:${userId}`, userData, { ttl: 1800 }),
  delete: (userId: string) => cache.delete(`user:${userId}`),
};

export const skillsCache = {
  get: () => cache.get('skills:all', { ttl: 86400 }), // 24 hours
  set: (skills: any[]) => cache.set('skills:all', skills, { ttl: 86400 }),
  invalidate: () => cache.delete('skills:all'),
};

export const leaderboardCache = {
  get: (category: string) => cache.get(`leaderboard:${category}`, { ttl: 300 }), // 5 minutes
  set: (category: string, data: any) => cache.set(`leaderboard:${category}`, data, { ttl: 300 }),
  invalidate: (category?: string) => {
    if (category) {
      return cache.delete(`leaderboard:${category}`);
    }
    return cache.clearPattern('leaderboard:*');
  },
};

export const sessionCache = {
  get: (sessionId: string) => cache.get(`session:${sessionId}`, { ttl: 7200 }), // 2 hours
  set: (sessionId: string, sessionData: any) => cache.set(`session:${sessionId}`, sessionData, { ttl: 7200 }),
  delete: (sessionId: string) => cache.delete(`session:${sessionId}`),
};

export default cache;