/**
 * Rate Limiting Utilities
 * 
 * Implements request rate limiting with configurable strategies
 * Supports per-IP, per-user, and per-endpoint rate limiting
 */

import { NextRequest, NextResponse } from 'next/server';
import { getClientIP } from '@/shared/lib/utils';

export type RateLimitStrategy = 'fixed-window' | 'sliding-window' | 'token-bucket';

export interface RateLimitConfig {
  /** Maximum number of requests allowed */
  maxRequests: number;
  /** Time window in milliseconds */
  windowMs: number;
  /** Rate limit strategy */
  strategy?: RateLimitStrategy;
  /** Identifier strategy */
  keyGenerator?: (request: NextRequest) => string | Promise<string>;
  /** Skip rate limiting for certain requests */
  skip?: (request: NextRequest) => boolean | Promise<boolean>;
  /** Custom error response */
  onLimitReached?: (request: NextRequest) => NextResponse | Promise<NextResponse>;
  /** Custom headers to include */
  headers?: boolean;
  /** Enable burst allowance for token bucket */
  burstCapacity?: number;
  /** Token refill rate for token bucket (tokens per second) */
  refillRate?: number;
}

export interface RateLimitState {
  count: number;
  resetTime: number;
  tokens?: number; // For token bucket strategy
  lastRefill?: number; // For token bucket strategy
  requests?: Array<{ timestamp: number }>; // For sliding window strategy
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

// In-memory store for rate limiting (production should use Redis/database)
const rateLimitStore = new Map<string, RateLimitState>();

/**
 * Default key generator using IP address
 */
export async function defaultKeyGenerator(request: NextRequest): Promise<string> {
  const ip = getClientIP(request);
  const pathname = new URL(request.url).pathname;
  return `${ip}:${pathname}`;
}

/**
 * User-based key generator
 */
export async function userKeyGenerator(request: NextRequest): Promise<string> {
  // Extract user ID from session or JWT token
  const authHeader = request.headers.get('authorization');
  if (authHeader) {
    try {
      // For demo purposes - in production, decode JWT properly
      const token = authHeader.replace('Bearer ', '');
      const userId = token.split('.')[1]; // Simplified - use proper JWT decoding
      const pathname = new URL(request.url).pathname;
      return `user:${userId}:${pathname}`;
    } catch {
      // Fallback to IP-based limiting
      return await defaultKeyGenerator(request);
    }
  }
  
  return await defaultKeyGenerator(request);
}

/**
 * Fixed window rate limiting strategy
 */
function applyFixedWindow(
  state: RateLimitState,
  config: RateLimitConfig,
  now: number
): RateLimitResult {
  const { maxRequests, windowMs } = config;
  
  // Reset window if expired
  if (now >= state.resetTime) {
    state.count = 0;
    state.resetTime = now + windowMs;
  }
  
  // Check if limit exceeded
  if (state.count >= maxRequests) {
    return {
      success: false,
      limit: maxRequests,
      remaining: 0,
      resetTime: state.resetTime,
      retryAfter: Math.ceil((state.resetTime - now) / 1000)
    };
  }
  
  // Increment counter
  state.count++;
  
  return {
    success: true,
    limit: maxRequests,
    remaining: Math.max(0, maxRequests - state.count),
    resetTime: state.resetTime
  };
}

/**
 * Sliding window rate limiting strategy
 */
function applySlidingWindow(
  state: RateLimitState,
  config: RateLimitConfig,
  now: number
): RateLimitResult {
  const { maxRequests, windowMs } = config;
  
  // Initialize requests array if not exists
  if (!state.requests) {
    state.requests = [];
  }
  
  // Remove old requests outside the window
  const windowStart = now - windowMs;
  state.requests = state.requests.filter(req => req.timestamp > windowStart);
  
  // Check if limit exceeded
  if (state.requests.length >= maxRequests) {
    const oldestRequest = state.requests[0];
    const retryAfter = Math.ceil((oldestRequest.timestamp + windowMs - now) / 1000);
    
    return {
      success: false,
      limit: maxRequests,
      remaining: 0,
      resetTime: oldestRequest.timestamp + windowMs,
      retryAfter
    };
  }
  
  // Add current request
  state.requests.push({ timestamp: now });
  
  return {
    success: true,
    limit: maxRequests,
    remaining: Math.max(0, maxRequests - state.requests.length),
    resetTime: now + windowMs
  };
}

/**
 * Token bucket rate limiting strategy
 */
function applyTokenBucket(
  state: RateLimitState,
  config: RateLimitConfig,
  now: number
): RateLimitResult {
  const { 
    maxRequests, 
    windowMs, 
    burstCapacity = maxRequests, 
    refillRate = maxRequests / (windowMs / 1000) 
  } = config;
  
  // Initialize token bucket if not exists
  if (state.tokens === undefined) {
    state.tokens = burstCapacity;
    state.lastRefill = now;
    state.resetTime = now + windowMs;
  }
  
  // Refill tokens based on elapsed time
  if (state.lastRefill) {
    const elapsedMs = now - state.lastRefill;
    const tokensToAdd = (elapsedMs / 1000) * refillRate;
    state.tokens = Math.min(burstCapacity, state.tokens + tokensToAdd);
    state.lastRefill = now;
  }
  
  // Check if tokens available
  if (state.tokens < 1) {
    const timeToNextToken = (1 / refillRate) * 1000; // ms until next token
    return {
      success: false,
      limit: burstCapacity,
      remaining: 0,
      resetTime: now + timeToNextToken,
      retryAfter: Math.ceil(timeToNextToken / 1000)
    };
  }
  
  // Consume token
  state.tokens--;
  
  return {
    success: true,
    limit: burstCapacity,
    remaining: Math.floor(state.tokens),
    resetTime: state.resetTime
  };
}

/**
 * Apply rate limiting based on strategy
 */
export async function applyRateLimit(
  key: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const now = Date.now();
  const strategy = config.strategy || 'fixed-window';
  
  // Get or create state
  let state = rateLimitStore.get(key);
  if (!state) {
    state = {
      count: 0,
      resetTime: now + config.windowMs
    };
    rateLimitStore.set(key, state);
  }
  
  // Apply rate limiting strategy
  let result: RateLimitResult;
  
  switch (strategy) {
    case 'sliding-window':
      result = applySlidingWindow(state, config, now);
      break;
    case 'token-bucket':
      result = applyTokenBucket(state, config, now);
      break;
    case 'fixed-window':
    default:
      result = applyFixedWindow(state, config, now);
      break;
  }
  
  return result;
}

/**
 * Rate limiting middleware for API routes
 */
export function withRateLimit(
  handler: (request: NextRequest) => Promise<NextResponse>,
  config: RateLimitConfig
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      // Check if request should be skipped
      if (config.skip && await config.skip(request)) {
        return handler(request);
      }
      
      // Generate rate limit key
      const keyGenerator = config.keyGenerator || defaultKeyGenerator;
      const key = await keyGenerator(request);
      
      // Apply rate limiting
      const result = await applyRateLimit(key, config);
      
      if (!result.success) {
        // Rate limit exceeded
        const response = config.onLimitReached 
          ? await config.onLimitReached(request)
          : NextResponse.json(
              { 
                error: 'Too Many Requests',
                message: 'Rate limit exceeded. Please try again later.',
                retryAfter: result.retryAfter
              },
              { status: 429 }
            );
        
        // Add rate limit headers
        if (config.headers !== false) {
          response.headers.set('X-RateLimit-Limit', result.limit.toString());
          response.headers.set('X-RateLimit-Remaining', result.remaining.toString());
          response.headers.set('X-RateLimit-Reset', result.resetTime.toString());
          if (result.retryAfter) {
            response.headers.set('Retry-After', result.retryAfter.toString());
          }
        }
        
        return response;
      }
      
      // Process request
      const response = await handler(request);
      
      // Add rate limit headers to successful responses
      if (config.headers !== false) {
        response.headers.set('X-RateLimit-Limit', result.limit.toString());
        response.headers.set('X-RateLimit-Remaining', result.remaining.toString());
        response.headers.set('X-RateLimit-Reset', result.resetTime.toString());
      }
      
      return response;
    } catch (error) {
      console.error('Rate limiting error:', error);
      // Continue processing request if rate limiting fails
      return handler(request);
    }
  };
}

/**
 * Predefined rate limit configurations
 */
export const rateLimitConfigs = {
  // General API endpoints
  api: {
    maxRequests: 100,
    windowMs: 15 * 60 * 1000, // 15 minutes
    strategy: 'sliding-window' as const
  },
  
  // Analysis endpoints (more restrictive)
  analysis: {
    maxRequests: 10,
    windowMs: 60 * 1000, // 1 minute
    strategy: 'token-bucket' as const,
    burstCapacity: 5,
    keyGenerator: userKeyGenerator
  },
  
  // Authentication endpoints
  auth: {
    maxRequests: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
    strategy: 'fixed-window' as const
  },
  
  // Public endpoints (lenient)
  public: {
    maxRequests: 1000,
    windowMs: 60 * 1000, // 1 minute
    strategy: 'sliding-window' as const
  }
} as const;

/**
 * Cleanup expired rate limit entries
 */
export function cleanupRateLimitStore(): void {
  const now = Date.now();
  
  for (const [key, state] of rateLimitStore.entries()) {
    // Remove entries that are past their reset time and have no recent activity
    if (state.resetTime < now - 60000) { // 1 minute grace period
      rateLimitStore.delete(key);
    }
  }
}

/**
 * Get current rate limit stats for monitoring
 */
export function getRateLimitStats(): {
  totalKeys: number;
  activeKeys: number;
  memoryUsage: number;
} {
  const now = Date.now();
  let activeKeys = 0;
  
  for (const [_, state] of rateLimitStore.entries()) {
    if (state.resetTime > now) {
      activeKeys++;
    }
  }
  
  return {
    totalKeys: rateLimitStore.size,
    activeKeys,
    memoryUsage: process.memoryUsage().heapUsed
  };
}

// Start cleanup interval in production
if (process.env.NODE_ENV === 'production') {
  setInterval(cleanupRateLimitStore, 5 * 60 * 1000); // Cleanup every 5 minutes
}