/**
 * CSRF Protection Utilities
 * 
 * Provides Cross-Site Request Forgery protection for API routes
 * Implements token-based validation with secure token generation
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies, headers } from 'next/headers';
import crypto from 'crypto';

// CSRF token configuration
const CSRF_TOKEN_LENGTH = 32;
const CSRF_COOKIE_NAME = 'csrf-token';
const CSRF_HEADER_NAME = 'x-csrf-token';
const CSRF_TOKEN_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

export interface CSRFOptions {
  cookieName?: string;
  headerName?: string;
  tokenLength?: number;
  expiryMs?: number;
  sameSite?: 'strict' | 'lax' | 'none';
  secure?: boolean;
}

/**
 * Generates a cryptographically secure CSRF token
 */
export function generateCSRFToken(length: number = CSRF_TOKEN_LENGTH): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Creates a CSRF token with timestamp for expiry validation
 */
export function createTimestampedToken(): string {
  const token = generateCSRFToken();
  const timestamp = Date.now();
  const payload = JSON.stringify({ token, timestamp });
  return Buffer.from(payload).toString('base64');
}

/**
 * Validates a timestamped CSRF token
 */
export function validateTimestampedToken(
  timestampedToken: string,
  maxAge: number = CSRF_TOKEN_EXPIRY
): { valid: boolean; token: string | null } {
  try {
    const payload = JSON.parse(Buffer.from(timestampedToken, 'base64').toString());
    const { token, timestamp } = payload;

    if (!token || !timestamp) {
      return { valid: false, token: null };
    }

    const age = Date.now() - timestamp;
    if (age > maxAge) {
      return { valid: false, token: null };
    }

    return { valid: true, token };
  } catch {
    return { valid: false, token: null };
  }
}

/**
 * Sets CSRF token in cookies
 */
export async function setCSRFToken(
  response: NextResponse,
  options: CSRFOptions = {}
): Promise<string> {
  const {
    cookieName = CSRF_COOKIE_NAME,
    tokenLength = CSRF_TOKEN_LENGTH,
    expiryMs = CSRF_TOKEN_EXPIRY,
    sameSite = 'strict',
    secure = process.env.NODE_ENV === 'production'
  } = options;

  const timestampedToken = createTimestampedToken();

  response.cookies.set(cookieName, timestampedToken, {
    httpOnly: true,
    secure,
    sameSite,
    maxAge: Math.floor(expiryMs / 1000),
    path: '/',
  });

  return timestampedToken;
}

/**
 * Gets CSRF token from cookies
 */
export async function getCSRFToken(
  cookieName: string = CSRF_COOKIE_NAME
): Promise<string | null> {
  const cookieStore = await cookies();
  const tokenCookie = cookieStore.get(cookieName);
  return tokenCookie?.value || null;
}

/**
 * Gets CSRF token from request headers
 */
export function getCSRFTokenFromHeaders(
  request: NextRequest,
  headerName: string = CSRF_HEADER_NAME
): string | null {
  return request.headers.get(headerName) || null;
}

/**
 * Validates CSRF token from request
 */
export async function validateCSRFToken(
  request: NextRequest,
  options: CSRFOptions = {}
): Promise<{ valid: boolean; error?: string }> {
  const {
    cookieName = CSRF_COOKIE_NAME,
    headerName = CSRF_HEADER_NAME,
    expiryMs = CSRF_TOKEN_EXPIRY
  } = options;

  // Get token from cookie
  const cookieToken = await getCSRFToken(cookieName);
  if (!cookieToken) {
    return { valid: false, error: 'CSRF token not found in cookies' };
  }

  // Get token from header
  const headerToken = getCSRFTokenFromHeaders(request, headerName);
  if (!headerToken) {
    return { valid: false, error: 'CSRF token not found in headers' };
  }

  // Validate cookie token format and expiry
  const { valid: cookieValid, token: cookieTokenValue } = validateTimestampedToken(
    cookieToken,
    expiryMs
  );

  if (!cookieValid || !cookieTokenValue) {
    return { valid: false, error: 'Invalid or expired CSRF token in cookies' };
  }

  // Validate header token format and expiry
  const { valid: headerValid, token: headerTokenValue } = validateTimestampedToken(
    headerToken,
    expiryMs
  );

  if (!headerValid || !headerTokenValue) {
    return { valid: false, error: 'Invalid or expired CSRF token in headers' };
  }

  // Compare tokens
  if (cookieTokenValue !== headerTokenValue) {
    return { valid: false, error: 'CSRF token mismatch' };
  }

  return { valid: true };
}

/**
 * CSRF protection middleware for API routes
 */
export function withCSRFProtection(
  handler: (request: NextRequest) => Promise<NextResponse>,
  options: CSRFOptions = {}
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    // Skip CSRF protection for GET, HEAD, OPTIONS requests
    if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
      const response = await handler(request);
      
      // Set CSRF token for subsequent requests
      if (request.method === 'GET') {
        await setCSRFToken(response, options);
      }
      
      return response;
    }

    // Validate CSRF token for state-changing requests
    const validation = await validateCSRFToken(request, options);
    
    if (!validation.valid) {
      return NextResponse.json(
        { 
          error: 'CSRF validation failed',
          message: validation.error || 'Invalid CSRF token'
        },
        { status: 403 }
      );
    }

    // Process request with valid CSRF token
    const response = await handler(request);
    
    // Refresh CSRF token
    await setCSRFToken(response, options);
    
    return response;
  };
}

/**
 * Client-side utility to get CSRF token for requests
 */
export function getClientCSRFToken(): string | null {
  if (typeof document === 'undefined') return null;
  
  const cookies = document.cookie.split(';');
  const csrfCookie = cookies.find(cookie => 
    cookie.trim().startsWith(`${CSRF_COOKIE_NAME}=`)
  );
  
  return csrfCookie ? csrfCookie.split('=')[1] : null;
}

/**
 * Client-side utility to add CSRF token to fetch requests
 */
export function addCSRFToken(
  init: RequestInit = {},
  headerName: string = CSRF_HEADER_NAME
): RequestInit {
  const token = getClientCSRFToken();
  
  if (!token) {
    console.warn('CSRF token not found, request may fail');
    return init;
  }

  return {
    ...init,
    headers: {
      ...init.headers,
      [headerName]: token,
    },
  };
}

/**
 * React hook for CSRF-protected fetch
 */
export function useCSRFProtectedFetch() {
  const protectedFetch = async (
    url: string,
    init: RequestInit = {}
  ): Promise<Response> => {
    const protectedInit = addCSRFToken(init);
    return fetch(url, protectedInit);
  };

  return { protectedFetch };
}

// Export constants
export {
  CSRF_TOKEN_LENGTH,
  CSRF_COOKIE_NAME,
  CSRF_HEADER_NAME,
  CSRF_TOKEN_EXPIRY
};