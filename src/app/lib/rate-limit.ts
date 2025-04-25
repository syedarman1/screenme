// Simple in-memory rate limiter implementation
// You may want to replace this with a Redis-based solution for production

interface RateLimitResult {
    success: boolean;
    limit: number;
    remaining: number;
  }
  
  const store = new Map<string, { count: number; timestamp: number }>();
  const WINDOW_SIZE = 60 * 1000; // 1 minute in milliseconds
  const MAX_REQUESTS = 10; // Maximum number of requests per minute
  
  export async function rateLimit(key: string): Promise<RateLimitResult> {
    const now = Date.now();
    const record = store.get(key);
  
    // Clean up old records
    if (record && now - record.timestamp > WINDOW_SIZE) {
      store.delete(key);
    }
  
    // Create or update record
    const current = store.get(key) || { count: 0, timestamp: now };
    const newCount = current.count + 1;
    store.set(key, { count: newCount, timestamp: current.timestamp });
  
    // Check if rate limit is exceeded
    const remaining = Math.max(0, MAX_REQUESTS - newCount);
    const success = newCount <= MAX_REQUESTS;
  
    return {
      success,
      limit: MAX_REQUESTS,
      remaining,
    };
  }