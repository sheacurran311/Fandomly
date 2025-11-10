/**
 * Redis client for caching and temporary storage
 * 
 * Used for:
 * - Task nonce codes (TTL: 2 hours)
 * - Webhook event deduplication (TTL: 7 days)
 * - Rate limiting
 * - Task start tracking
 */

import { Redis } from 'ioredis';

let redis: Redis | null = null;

/**
 * Initialize Redis connection
 * Falls back to in-memory Map if Redis is not available
 */
export function getRedis(): Redis {
  if (redis) return redis;

  const redisUrl = process.env.REDIS_URL;
  
  if (redisUrl) {
    console.log('[Redis] Connecting to Redis server...');
    redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: false,
    });

    redis.on('connect', () => {
      console.log('[Redis] ✅ Connected successfully');
    });

    redis.on('error', (err) => {
      console.error('[Redis] ❌ Connection error:', err);
    });

    return redis;
  }

  console.warn('[Redis] ⚠️ REDIS_URL not configured, using in-memory fallback');
  console.warn('[Redis] Note: This is NOT suitable for production!');
  
  // Create a mock Redis client using in-memory storage
  redis = createInMemoryRedis();
  return redis;
}

/**
 * In-memory Redis fallback for development
 * Not suitable for production or multi-instance deployments
 */
function createInMemoryRedis(): Redis {
  const store = new Map<string, { value: string; expiry?: number }>();

  // Clean up expired keys every minute
  setInterval(() => {
    const now = Date.now();
    for (const [key, data] of store.entries()) {
      if (data.expiry && data.expiry < now) {
        store.delete(key);
      }
    }
  }, 60000);

  // Create a mock Redis client
  const mockRedis = {
    get: async (key: string): Promise<string | null> => {
      const data = store.get(key);
      if (!data) return null;
      if (data.expiry && data.expiry < Date.now()) {
        store.delete(key);
        return null;
      }
      return data.value;
    },

    set: async (key: string, value: string): Promise<'OK'> => {
      store.set(key, { value });
      return 'OK';
    },

    setex: async (key: string, seconds: number, value: string): Promise<'OK'> => {
      store.set(key, {
        value,
        expiry: Date.now() + seconds * 1000
      });
      return 'OK';
    },

    del: async (...keys: string[]): Promise<number> => {
      let deleted = 0;
      for (const key of keys) {
        if (store.delete(key)) deleted++;
      }
      return deleted;
    },

    exists: async (...keys: string[]): Promise<number> => {
      let count = 0;
      for (const key of keys) {
        const data = store.get(key);
        if (data && (!data.expiry || data.expiry >= Date.now())) {
          count++;
        }
      }
      return count;
    },

    incr: async (key: string): Promise<number> => {
      const data = store.get(key);
      const current = data ? parseInt(data.value, 10) || 0 : 0;
      const newValue = current + 1;
      store.set(key, { value: String(newValue), expiry: data?.expiry });
      return newValue;
    },

    expire: async (key: string, seconds: number): Promise<number> => {
      const data = store.get(key);
      if (!data) return 0;
      store.set(key, {
        value: data.value,
        expiry: Date.now() + seconds * 1000
      });
      return 1;
    },

    keys: async (pattern: string): Promise<string[]> => {
      // Simple pattern matching for development
      const regex = new RegExp('^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$');
      return Array.from(store.keys()).filter(key => regex.test(key));
    },

    quit: async (): Promise<'OK'> => {
      store.clear();
      return 'OK';
    },

    on: () => mockRedis,
    
    // Add any other Redis methods you need
  } as unknown as Redis;

  return mockRedis;
}

/**
 * Close Redis connection
 */
export async function closeRedis(): Promise<void> {
  if (redis) {
    await redis.quit();
    redis = null;
    console.log('[Redis] Connection closed');
  }
}

// Task nonce helpers
export async function saveTaskNonce(taskId: string, userId: string, nonce: string): Promise<void> {
  const redis = getRedis();
  const key = `task_nonce:${taskId}:${userId}`;
  await redis.setex(key, 2 * 60 * 60, nonce); // 2 hours
  console.log('[Redis] Saved task nonce:', { taskId, userId, nonce });
}

export async function getTaskNonce(taskId: string, userId: string): Promise<string | null> {
  const redis = getRedis();
  const key = `task_nonce:${taskId}:${userId}`;
  return await redis.get(key);
}

export async function findUserIdByNonce(taskId: string, nonce: string): Promise<string | null> {
  const redis = getRedis();
  const pattern = `task_nonce:${taskId}:*`;
  const keys = await redis.keys(pattern);
  
  for (const key of keys) {
    const storedNonce = await redis.get(key);
    if (storedNonce === nonce) {
      // Extract userId from key: task_nonce:taskId:userId
      const userId = key.split(':')[2];
      return userId;
    }
  }
  
  return null;
}

export async function deleteTaskNonce(taskId: string, userId: string): Promise<void> {
  const redis = getRedis();
  const key = `task_nonce:${taskId}:${userId}`;
  await redis.del(key);
  console.log('[Redis] Deleted task nonce:', { taskId, userId });
}

// Task start tracking
export async function markTaskStarted(taskId: string, userId: string): Promise<void> {
  const redis = getRedis();
  const key = `task_started:${taskId}:${userId}`;
  await redis.setex(key, 24 * 60 * 60, Date.now().toString()); // 24 hours
}

export async function hasTaskStarted(taskId: string, userId: string): Promise<boolean> {
  const redis = getRedis();
  const key = `task_started:${taskId}:${userId}`;
  const exists = await redis.exists(key);
  return exists > 0;
}

// Webhook event deduplication
export async function isDuplicateWebhookEvent(eventId: string): Promise<boolean> {
  const redis = getRedis();
  const key = `webhook_event:${eventId}`;
  const exists = await redis.exists(key);
  return exists > 0;
}

export async function markWebhookEventProcessed(eventId: string): Promise<void> {
  const redis = getRedis();
  const key = `webhook_event:${eventId}`;
  await redis.setex(key, 7 * 24 * 60 * 60, 'processed'); // 7 days
}

// Rate limiting
export async function incrementRateLimit(userId: string, action: string, ttlSeconds: number): Promise<number> {
  const redis = getRedis();
  const key = `rate_limit:${action}:${userId}`;
  const count = await redis.incr(key);
  
  if (count === 1) {
    await redis.expire(key, ttlSeconds);
  }
  
  return count;
}

export async function getRateLimitCount(userId: string, action: string): Promise<number> {
  const redis = getRedis();
  const key = `rate_limit:${action}:${userId}`;
  const value = await redis.get(key);
  return value ? parseInt(value, 10) : 0;
}

