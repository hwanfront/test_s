/**
 * API utilities for text preprocessing (Task T048)
 * 
 * Provides API integration utilities for preprocessing functionality
 * with error handling and response formatting
 */

import type { PreprocessingOptions, PreprocessedContent } from './preprocessor'
import { textPreprocessor } from './preprocessor'

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: any
  }
  timestamp: string
  requestId?: string
}

export interface PreprocessingApiRequest {
  content: string
  options?: PreprocessingOptions
  sessionId?: string
}

export interface PreprocessingApiResponse extends ApiResponse<PreprocessedContent> {
  data?: PreprocessedContent & {
    sessionId: string
    processingId: string
  }
}

/**
 * Error codes for preprocessing API
 */
export const PreprocessingErrorCodes = {
  INVALID_INPUT: 'INVALID_INPUT',
  CONTENT_TOO_SHORT: 'CONTENT_TOO_SHORT',
  CONTENT_TOO_LONG: 'CONTENT_TOO_LONG',
  PROCESSING_FAILED: 'PROCESSING_FAILED',
  RATE_LIMITED: 'RATE_LIMITED',
  UNAUTHORIZED: 'UNAUTHORIZED',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE'
} as const

export type PreprocessingErrorCode = typeof PreprocessingErrorCodes[keyof typeof PreprocessingErrorCodes]

/**
 * Create standardized API response
 */
export function createApiResponse<T>(
  success: boolean,
  data?: T,
  error?: {
    code: PreprocessingErrorCode
    message: string
    details?: any
  },
  requestId?: string
): ApiResponse<T> {
  return {
    success,
    data,
    error,
    timestamp: new Date().toISOString(),
    requestId
  }
}

/**
 * Process preprocessing request and return formatted response
 */
export async function processPreprocessingRequest(
  request: PreprocessingApiRequest,
  requestId?: string
): Promise<PreprocessingApiResponse> {
  try {
    // Validate request
    if (!request.content || typeof request.content !== 'string') {
      return createApiResponse(
        false,
        undefined,
        {
          code: PreprocessingErrorCodes.INVALID_INPUT,
          message: 'Content must be a non-empty string'
        },
        requestId
      )
    }

    // Check content length constraints
    if (request.content.length < 100) {
      return createApiResponse(
        false,
        undefined,
        {
          code: PreprocessingErrorCodes.CONTENT_TOO_SHORT,
          message: 'Content must be at least 100 characters long',
          details: { actualLength: request.content.length, minimumLength: 100 }
        },
        requestId
      )
    }

    if (request.content.length > 100000) {
      return createApiResponse(
        false,
        undefined,
        {
          code: PreprocessingErrorCodes.CONTENT_TOO_LONG,
          message: 'Content exceeds maximum length limit',
          details: { actualLength: request.content.length, maximumLength: 100000 }
        },
        requestId
      )
    }

    // Process the content
    const result = await textPreprocessor.preprocess(request.content, {
      ...request.options,
      enableTransparency: true
    })

    // Generate IDs for tracking
    const sessionId = request.sessionId || generateSessionId()
    const processingId = generateProcessingId()

    return createApiResponse(
      true,
      {
        ...result,
        sessionId,
        processingId
      },
      undefined,
      requestId
    )

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown processing error'
    
    return createApiResponse(
      false,
      undefined,
      {
        code: PreprocessingErrorCodes.PROCESSING_FAILED,
        message: errorMessage,
        details: error instanceof Error ? { stack: error.stack } : undefined
      },
      requestId
    )
  }
}

/**
 * Validate preprocessing request
 */
export function validatePreprocessingRequest(
  request: any
): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!request) {
    errors.push('Request body is required')
    return { valid: false, errors }
  }

  if (!request.content) {
    errors.push('Content field is required')
  } else if (typeof request.content !== 'string') {
    errors.push('Content must be a string')
  } else {
    if (request.content.length < 100) {
      errors.push('Content must be at least 100 characters long')
    }
    if (request.content.length > 100000) {
      errors.push('Content must not exceed 100,000 characters')
    }
  }

  if (request.options && typeof request.options !== 'object') {
    errors.push('Options must be an object')
  }

  if (request.sessionId && typeof request.sessionId !== 'string') {
    errors.push('SessionId must be a string')
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Parse and validate content from various input formats
 */
export function parseContentInput(input: any): string {
  if (typeof input === 'string') {
    return input
  }

  if (input && typeof input === 'object') {
    // Try to extract content from common field names
    const possibleFields = ['content', 'text', 'data', 'body', 'terms', 'policy']
    
    for (const field of possibleFields) {
      if (input[field] && typeof input[field] === 'string') {
        return input[field]
      }
    }
  }

  throw new Error('Unable to extract valid content from input')
}

/**
 * Create batch processing request
 */
export interface BatchPreprocessingRequest {
  items: Array<{
    id: string
    content: string
    options?: PreprocessingOptions
  }>
  batchOptions?: {
    failOnFirst?: boolean
    maxConcurrency?: number
  }
}

export interface BatchPreprocessingResponse extends ApiResponse<{
  results: Array<{
    id: string
    success: boolean
    data?: PreprocessedContent
    error?: string
  }>
  summary: {
    total: number
    successful: number
    failed: number
    processingTimeMs: number
  }
}> {}

/**
 * Process batch preprocessing request
 */
export async function processBatchPreprocessingRequest(
  request: BatchPreprocessingRequest,
  requestId?: string
): Promise<BatchPreprocessingResponse> {
  const startTime = Date.now()
  const results: Array<{
    id: string
    success: boolean
    data?: PreprocessedContent
    error?: string
  }> = []

  const {
    failOnFirst = false,
    maxConcurrency = 5
  } = request.batchOptions || {}

  try {
    // Process items with concurrency control
    const chunks = chunkArray(request.items, maxConcurrency)
    
    for (const chunk of chunks) {
      const chunkPromises = chunk.map(async (item) => {
        try {
          const response = await processPreprocessingRequest({
            content: item.content,
            options: item.options
          })

          if (response.success && response.data) {
            return {
              id: item.id,
              success: true,
              data: response.data
            }
          } else {
            return {
              id: item.id,
              success: false,
              error: response.error?.message || 'Processing failed'
            }
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          
          if (failOnFirst) {
            throw error
          }

          return {
            id: item.id,
            success: false,
            error: errorMessage
          }
        }
      })

      const chunkResults = await Promise.all(chunkPromises)
      results.push(...chunkResults)

      // Check if we should fail on first error
      if (failOnFirst && chunkResults.some(r => !r.success)) {
        break
      }
    }

    const processingTimeMs = Date.now() - startTime
    const successful = results.filter(r => r.success).length
    const failed = results.filter(r => !r.success).length

    return createApiResponse(
      true,
      {
        results,
        summary: {
          total: results.length,
          successful,
          failed,
          processingTimeMs
        }
      },
      undefined,
      requestId
    )

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Batch processing failed'
    
    return createApiResponse(
      false,
      {
        results,
        summary: {
          total: results.length,
          successful: 0,
          failed: results.length,
          processingTimeMs: Date.now() - startTime
        }
      },
      {
        code: PreprocessingErrorCodes.PROCESSING_FAILED,
        message: errorMessage
      },
      requestId
    ) as BatchPreprocessingResponse
  }
}

/**
 * Utility functions
 */

function generateSessionId(): string {
  return crypto.randomUUID()
}

function generateProcessingId(): string {
  return `proc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size))
  }
  return chunks
}

/**
 * Rate limiting utilities
 */
export interface RateLimit {
  windowMs: number
  maxRequests: number
  keyGenerator?: (req: any) => string
}

export class RateLimiter {
  private requests = new Map<string, { count: number; resetTime: number }>()

  constructor(private config: RateLimit) {}

  checkLimit(key: string): { allowed: boolean; remaining: number; resetTime: number } {
    const now = Date.now()
    const entry = this.requests.get(key)

    if (!entry || now > entry.resetTime) {
      // Reset or create new entry
      const resetTime = now + this.config.windowMs
      this.requests.set(key, { count: 1, resetTime })
      return { allowed: true, remaining: this.config.maxRequests - 1, resetTime }
    }

    if (entry.count >= this.config.maxRequests) {
      return { allowed: false, remaining: 0, resetTime: entry.resetTime }
    }

    entry.count++
    return { 
      allowed: true, 
      remaining: this.config.maxRequests - entry.count, 
      resetTime: entry.resetTime 
    }
  }

  cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.requests.entries()) {
      if (now > entry.resetTime) {
        this.requests.delete(key)
      }
    }
  }
}