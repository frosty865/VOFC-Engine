/**
 * Rate Limiting Middleware for API Routes
 * Simple in-memory rate limiter (for production, use Redis or external service)
 */

const rateLimitStore = new Map();

/**
 * Simple rate limiter
 * @param {string} identifier - IP address or user ID
 * @param {number} maxRequests - Maximum requests allowed
 * @param {number} windowMs - Time window in milliseconds
 * @returns {boolean} - true if allowed, false if rate limited
 */
export function rateLimit(identifier, maxRequests = 100, windowMs = 60000) {
  const now = Date.now();
  const key = identifier;
  
  if (!rateLimitStore.has(key)) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  
  const record = rateLimitStore.get(key);
  
  // Reset if window expired
  if (now > record.resetAt) {
    record.count = 1;
    record.resetAt = now + windowMs;
    return true;
  }
  
  // Check limit
  if (record.count >= maxRequests) {
    return false;
  }
  
  record.count++;
  return true;
}

/**
 * Get rate limit headers
 */
export function getRateLimitHeaders(identifier, maxRequests, windowMs) {
  const now = Date.now();
  const key = identifier;
  const record = rateLimitStore.get(key);
  
  if (!record) {
    return {
      'X-RateLimit-Limit': maxRequests,
      'X-RateLimit-Remaining': maxRequests - 1,
      'X-RateLimit-Reset': new Date(now + windowMs).toISOString(),
    };
  }
  
  const remaining = Math.max(0, maxRequests - record.count);
  const resetAt = new Date(record.resetAt).toISOString();
  
  return {
    'X-RateLimit-Limit': maxRequests,
    'X-RateLimit-Remaining': remaining,
    'X-RateLimit-Reset': resetAt,
  };
}

/**
 * Cleanup old rate limit records (run periodically)
 */
export function cleanupRateLimitStore() {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetAt) {
      rateLimitStore.delete(key);
    }
  }
}

// Cleanup every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupRateLimitStore, 5 * 60 * 1000);
}

