import { NextRequest } from 'next/server'

// Extract JSON body from request
export const getRequestBody = async <T = any>(request: NextRequest): Promise<T> => {
  try {
    const body = await request.json()
    return body
  } catch (error) {
    throw new Error('Invalid JSON body')
  }
}

// Extract search params as object
export const getSearchParams = (request: NextRequest): Record<string, string> => {
  const searchParams = request.nextUrl.searchParams
  const params: Record<string, string> = {}
  
  searchParams.forEach((value, key) => {
    params[key] = value
  })
  
  return params
}

// Extract path parameters
export const getPathParam = (pathname: string, paramName: string): string | null => {
  const segments = pathname.split('/')
  const paramIndex = segments.findIndex(segment => segment.includes(paramName))
  
  if (paramIndex === -1) return null
  
  return segments[paramIndex + 1] || null
}

// Rate limiting helper (simple in-memory implementation)
class RateLimiter {
  private requests: Map<string, number[]> = new Map()
  
  constructor(
    private windowMs: number = 60000, // 1 minute
    private maxRequests: number = 10
  ) {}
  
  isAllowed(identifier: string): boolean {
    const now = Date.now()
    const requests = this.requests.get(identifier) || []
    
    // Remove old requests outside the window
    const validRequests = requests.filter(time => now - time < this.windowMs)
    
    // Check if under limit
    if (validRequests.length >= this.maxRequests) {
      return false
    }
    
    // Add current request
    validRequests.push(now)
    this.requests.set(identifier, validRequests)
    
    return true
  }
}

export const rateLimiter = new RateLimiter()

// CORS headers helper
export const setCorsHeaders = (response: Response): Response => {
  response.headers.set('Access-Control-Allow-Origin', '*')
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  
  return response
}

// Standard API response format
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export const createApiResponse = <T>(
  data?: T,
  message?: string,
  pagination?: ApiResponse['pagination']
): ApiResponse<T> => ({
  success: true,
  data,
  message,
  pagination,
})

export const createErrorResponse = (
  error: string,
  message?: string
): ApiResponse => ({
  success: false,
  error,
  message,
})