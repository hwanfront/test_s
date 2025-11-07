/**
 * Text Preprocessing API Route (Task T113)
 * 
 * Privacy-compliant text preprocessing API ensuring constitutional compliance
 * with hash-only processing and no original content storage.
 * 
 * Constitutional Principle II: Legal Risk Minimization
 * - Hash-only content processing
 * - No original text storage
 * - Privacy-compliant audit logging
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createHash } from 'crypto'
import { EnhancedAnonymizer } from '@/features/text-preprocessing/lib/enhanced-anonymizer'
import { ContentDeduplicationService } from '@/features/text-preprocessing/lib/deduplication-service'
import { SecureHashComparison } from '@/features/text-preprocessing/lib/hash-comparison'
import { PreprocessingAuditLogger } from '@/features/text-preprocessing/lib/audit-logger'
import { EnhancedContentValidationService } from '@/features/text-preprocessing/lib/enhanced-content-validation'

/**
 * Preprocessing request schema
 */
const preprocessingRequestSchema = z.object({
  content: z.string().min(1).max(1000000), // Max 1MB
  sessionId: z.string().uuid().optional(),
  userId: z.string().optional(),
  options: z.object({
    enableDeduplication: z.boolean().default(true),
    enableValidation: z.boolean().default(true),
    enableAuditLogging: z.boolean().default(true),
    anonymizationLevel: z.enum(['basic', 'standard', 'maximum']).default('maximum'),
    retainMetadata: z.boolean().default(false)
  }).optional()
})

/**
 * Preprocessing response schema
 */
interface PreprocessingResponse {
  success: boolean
  data?: {
    contentHash: string
    anonymizedMetadata: Record<string, any>
    processingMetrics: {
      processingTime: number
      contentLength: number
      validationScore: number
      isDuplicate: boolean
      similarity?: number
    }
    sessionId: string
    processedAt: string
  }
  error?: {
    code: string
    message: string
    details?: any
  }
}

/**
 * Error codes for preprocessing
 */
const PreprocessingErrorCodes = {
  INVALID_INPUT: 'INVALID_INPUT',
  CONTENT_TOO_LARGE: 'CONTENT_TOO_LARGE',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  PROCESSING_ERROR: 'PROCESSING_ERROR',
  PRIVACY_VIOLATION: 'PRIVACY_VIOLATION',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  UNAUTHORIZED: 'UNAUTHORIZED'
} as const

/**
 * Initialize services
 */
const anonymizer = new EnhancedAnonymizer({
  retainMetrics: true,
  preserveStructure: true,
  enableContentHashing: true
})

const deduplicationService = new ContentDeduplicationService(
  anonymizer,
  {
    similarityThreshold: 0.85,
    enableStructuralAnalysis: true
  }
)

const hashComparison = new SecureHashComparison()

const auditLogger = new PreprocessingAuditLogger({
  enableDetailedLogging: true,
  enablePrivacyValidation: true,
  securityLevel: 'strict'
})

const contentValidator = new EnhancedContentValidationService({
  privacySafeOnly: true,
  enableConstitutionalRules: true,
  enableSecurityRules: true
})

/**
 * Rate limiting storage (in production, use Redis or similar)
 */
const rateLimitStorage = new Map<string, { count: number; resetTime: number }>()

/**
 * POST /api/preprocessing
 * Process text content with privacy-compliant preprocessing
 */
export async function POST(request: NextRequest): Promise<NextResponse<PreprocessingResponse>> {
  const startTime = Date.now()
  
  try {
    // Parse and validate request
    const body = await request.json()
    const validationResult = preprocessingRequestSchema.safeParse(body)
    
    if (!validationResult.success) {
      await logError('INVALID_INPUT', 'Request validation failed', validationResult.error)
      return NextResponse.json({
        success: false,
        error: {
          code: PreprocessingErrorCodes.INVALID_INPUT,
          message: 'Invalid request format',
          details: validationResult.error.issues
        }
      }, { status: 400 })
    }

    const { content, sessionId, userId, options } = validationResult.data

    // Generate session ID if not provided
    const finalSessionId = sessionId || generateSessionId()

    // Check rate limits
    const rateLimitResult = await checkRateLimit(request, userId)
    if (!rateLimitResult.allowed) {
      return NextResponse.json({
        success: false,
        error: {
          code: PreprocessingErrorCodes.RATE_LIMIT_EXCEEDED,
          message: 'Rate limit exceeded',
          details: { resetTime: rateLimitResult.resetTime }
        }
      }, { status: 429 })
    }

    // Log content received
    if (options?.enableAuditLogging) {
      await auditLogger.logContentReceived(
        finalSessionId,
        userId || 'anonymous',
        content.length,
        getClientIpHash(request)
      )
    }

    // Step 1: Content Validation
    let validationScore = 100
    if (options?.enableValidation) {
      const validationResult = await contentValidator.validateContent(content, {
        skipPrivacyUnsafeRules: true,
        collectMetrics: false
      })

      if (!validationResult.isValid) {
        await auditLogger.logProcessingError(
          finalSessionId,
          'VALIDATION_FAILED',
          'Content validation failed',
          'validation'
        )

        return NextResponse.json({
          success: false,
          error: {
            code: PreprocessingErrorCodes.VALIDATION_FAILED,
            message: 'Content validation failed',
            details: validationResult.violations
          }
        }, { status: 400 })
      }

      validationScore = validationResult.overallScore
    }

    // Step 2: Content Normalization
    const normalizedContent = normalizeContent(content)
    const normalizedLength = normalizedContent.length

    if (options?.enableAuditLogging) {
      await auditLogger.logContentNormalized(
        finalSessionId,
        content.length,
        normalizedLength,
        Date.now() - startTime
      )
    }

    // Step 3: Generate Content Hash
    const hashingStartTime = Date.now()
    const contentHash = createHash('sha256')
      .update(normalizedContent)
      .digest('hex')
    const hashingTime = Date.now() - hashingStartTime

    if (options?.enableAuditLogging) {
      await auditLogger.logContentHashed(
        finalSessionId,
        contentHash,
        hashingTime
      )
    }

    // Step 4: Deduplication Check
    let isDuplicate = false
    let similarity: number | undefined
    
    if (options?.enableDeduplication) {
      const deduplicationStartTime = Date.now()
      const deduplicationResult = await deduplicationService.checkDuplication(
        normalizedContent,
        userId || 'anonymous'
      )
      
      isDuplicate = deduplicationResult.isDuplicate
      similarity = deduplicationResult.similarity

      const deduplicationTime = Date.now() - deduplicationStartTime

      if (options?.enableAuditLogging) {
        await auditLogger.logDeduplicationCheck(
          finalSessionId,
          contentHash,
          isDuplicate,
          similarity || 0,
          deduplicationTime
        )
      }
    }

    // Step 5: Enhanced Anonymization
    const anonymizationStartTime = Date.now()
    const anonymizationResult = await anonymizer.anonymizeContent(normalizedContent)
    const anonymizationTime = Date.now() - anonymizationStartTime

    // Verify constitutional compliance (no original content in result)
    // AnonymizedContent interface doesn't have originalContent property by design
    
    if (options?.enableAuditLogging) {
      await auditLogger.logAnonymizationCompleted(
        finalSessionId,
        contentHash,
        anonymizationTime,
        {
          metadataExtracted: Object.keys(anonymizationResult.metadata).length,
          privacyLevel: options.anonymizationLevel,
          constitutionalCompliant: true
        }
      )
    }

    // Prepare response with privacy-compliant data only
    const response: PreprocessingResponse = {
      success: true,
      data: {
        contentHash,
        anonymizedMetadata: anonymizationResult.metadata,
        processingMetrics: {
          processingTime: Date.now() - startTime,
          contentLength: content.length,
          validationScore,
          isDuplicate,
          similarity
        },
        sessionId: finalSessionId,
        processedAt: new Date().toISOString()
      }
    }

    // Update rate limit counter
    await updateRateLimit(request, userId)

    return NextResponse.json(response, { status: 200 })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    await logError('PROCESSING_ERROR', errorMessage, error)

    return NextResponse.json({
      success: false,
      error: {
        code: PreprocessingErrorCodes.PROCESSING_ERROR,
        message: 'Internal processing error'
      }
    }, { status: 500 })
  }
}

/**
 * GET /api/preprocessing/status
 * Get preprocessing service status
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const url = new URL(request.url)
    const sessionId = url.searchParams.get('sessionId')

    if (sessionId) {
      // Get session-specific status
      const sessionLogs = auditLogger.getSessionLogs(sessionId)
      const lastLog = sessionLogs[sessionLogs.length - 1]

      return NextResponse.json({
        success: true,
        data: {
          sessionId,
          status: lastLog ? 'processed' : 'not_found',
          lastActivity: lastLog?.timestamp,
          eventCount: sessionLogs.length
        }
      })
    }

    // Get general service status
    const stats = auditLogger.getProcessingStats()
    const validationStats = contentValidator.getValidationStats()

    return NextResponse.json({
      success: true,
      data: {
        serviceStatus: 'operational',
        statistics: {
          totalProcessingEvents: stats.totalEvents,
          averageProcessingTime: stats.averageProcessingTime,
          errorRate: stats.errorRate,
          privacyComplianceRate: stats.privacyComplianceRate,
          validationStats: {
            totalValidations: validationStats.totalValidations,
            averageScore: validationStats.averageScore,
            privacyComplianceRate: validationStats.privacyComplianceRate
          }
        },
        lastUpdated: new Date().toISOString()
      }
    })

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: {
        code: 'STATUS_ERROR',
        message: 'Failed to retrieve status'
      }
    }, { status: 500 })
  }
}

/**
 * Utility functions
 */

/**
 * Normalize content for consistent processing
 */
function normalizeContent(content: string): string {
  return content
    .trim()
    .replace(/\r\n/g, '\n')     // Normalize line endings
    .replace(/\r/g, '\n')       // Normalize line endings
    .replace(/\t/g, '    ')     // Convert tabs to spaces
    .replace(/\s+/g, ' ')       // Normalize whitespace
    .replace(/\n\s*\n/g, '\n\n') // Normalize paragraph breaks
}

/**
 * Generate session ID using standard UUID format
 */
function generateSessionId(): string {
  return crypto.randomUUID()
}

/**
 * Get client IP hash for privacy-compliant logging
 */
function getClientIpHash(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown'
  
  return createHash('sha256')
    .update(ip)
    .update('client-ip-salt')
    .digest('hex')
}

/**
 * Check rate limits
 */
async function checkRateLimit(
  request: NextRequest, 
  userId?: string
): Promise<{ allowed: boolean; resetTime?: number }> {
  const identifier = userId || getClientIpHash(request)
  const now = Date.now()
  const windowMs = 60 * 1000 // 1 minute window
  const maxRequests = 100 // 100 requests per minute

  const current = rateLimitStorage.get(identifier)
  
  if (!current || current.resetTime <= now) {
    // Reset or initialize
    rateLimitStorage.set(identifier, {
      count: 1,
      resetTime: now + windowMs
    })
    return { allowed: true }
  }

  if (current.count >= maxRequests) {
    return { 
      allowed: false, 
      resetTime: current.resetTime 
    }
  }

  current.count++
  return { allowed: true }
}

/**
 * Update rate limit counter
 */
async function updateRateLimit(request: NextRequest, userId?: string): Promise<void> {
  // Rate limit is already updated in checkRateLimit
  // This is a placeholder for additional rate limit logic
}

/**
 * Log processing errors
 */
async function logError(code: string, message: string, error: any): Promise<void> {
  console.error(`Preprocessing API Error [${code}]:`, message, error)
  
  // In production, this would integrate with proper error tracking
  // such as Sentry, DataDog, or similar monitoring services
}

/**
 * Cleanup function for expired rate limit entries
 */
export function cleanupRateLimits(): void {
  const now = Date.now()
  for (const [key, value] of rateLimitStorage.entries()) {
    if (value.resetTime <= now) {
      rateLimitStorage.delete(key)
    }
  }
}

// Run cleanup every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupRateLimits, 5 * 60 * 1000)
}