/**
 * API Route Caching Middleware
 * Provides caching strategies for API routes
 */

export const CacheStrategies = {
  // No caching - always fresh (default for dynamic routes)
  NO_CACHE: {
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
  },
  
  // Short cache - 30 seconds (for frequently changing data)
  SHORT: {
    'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
  },
  
  // Medium cache - 5 minutes (for moderately changing data)
  MEDIUM: {
    'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
  },
  
  // Long cache - 1 hour (for rarely changing data)
  LONG: {
    'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
  },
  
  // Static cache - 1 day (for static data)
  STATIC: {
    'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=172800',
  },
};

/**
 * Apply caching headers to response
 */
export function applyCacheHeaders(response, strategy = CacheStrategies.NO_CACHE) {
  Object.entries(strategy).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}

/**
 * Get cache strategy based on route type
 */
export function getCacheStrategy(routeType) {
  switch (routeType) {
    case 'health':
    case 'status':
    case 'monitor':
      return CacheStrategies.SHORT; // 30 seconds
    case 'dashboard':
    case 'overview':
      return CacheStrategies.MEDIUM; // 5 minutes
    case 'sectors':
    case 'subsectors':
    case 'disciplines':
    case 'vulnerabilities':
      return CacheStrategies.LONG; // 1 hour
    case 'static-data':
      return CacheStrategies.STATIC; // 1 day
    default:
      return CacheStrategies.NO_CACHE;
  }
}

