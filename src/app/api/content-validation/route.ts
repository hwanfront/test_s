/**
 * Content Validation API Route (Task T116)
 * 
 * Privacy-compliant content validation API ensuring constitutional compliance
 * with advanced validation rules and privacy-safe processing.
 * 
 * Constitutional Principle II: Legal Risk Minimization
 * - Privacy-safe content validation
 * - Constitutional compliance verification
 * - Secure validation without content exposure
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createHash } from 'crypto'
import { 
  EnhancedContentValidationService,
  type ValidationRule,
  type ContentValidationResult,
  type ValidationViolation,
  type ContentMetrics
} from '@/features/text-preprocessing/lib/enhanced-content-validation'

/**
 * Request schemas
 */
const validateContentSchema = z.object({
  content: z.string().min(1).max(1000000), // Max 1MB
  options: z.object({
    ruleCategories: z.array(z.enum(['security', 'privacy', 'content', 'constitutional', 'format'])).optional(),
    skipPrivacyUnsafeRules: z.boolean().default(true),
    collectMetrics: z.boolean().default(false),
    enableHashOnlyMode: z.boolean().default(false)
  }).optional(),
  metadata: z.object({
    sessionId: z.string().uuid().optional(),
    userId: z.string().optional(),
    source: z.string().optional()
  }).optional()
})

const validateHashOnlySchema = z.object({
  contentHash: z.string().min(64).max(64), // SHA-256 hash
  contentLength: z.number().min(1).max(1000000),
  contentMetrics: z.object({
    wordCount: z.number().optional(),
    paragraphCount: z.number().optional(),
    sentenceCount: z.number().optional(),
    averageWordLength: z.number().optional(),
    averageSentenceLength: z.number().optional(),
    complexityScore: z.number().optional(),
    languageDetection: z.string().optional()
  }).optional(),
  metadata: z.object({
    sessionId: z.string().uuid().optional(),
    userId: z.string().optional(),
    source: z.string().optional()
  }).optional()
})

const customRuleSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  category: z.enum(['security', 'privacy', 'content', 'constitutional', 'format']),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  description: z.string().min(1),
  enabled: z.boolean(),
  pattern: z.string().optional(),
  privacySafe: z.boolean()
})

/**
 * Response interfaces
 */
interface ValidationResponse {
  success: boolean
  data?: {
    validationId: string
    result: ContentValidationResult | {
      summary: {
        isValid: boolean
        score: number
        violationCount: number
        warningCount: number
        privacyCompliant: boolean
      }
      violations?: Array<{
        category: string
        severity: string
        description: string
        recommendation: string
      }>
    }
    processedAt: string
  }
  error?: {
    code: string
    message: string
    details?: any
  }
}

interface RulesResponse {
  success: boolean
  data?: {
    rules: ValidationRule[]
    categories: string[]
    totalRules: number
  }
  error?: {
    code: string
    message: string
  }
}

interface StatsResponse {
  success: boolean
  data?: {
    statistics: {
      totalValidations: number
      validationsByCategory: Record<string, number>
      averageScore: number
      violationRate: number
      privacyComplianceRate: number
      mostCommonViolations: Array<{ ruleId: string; count: number }>
    }
    generatedAt: string
  }
  error?: {
    code: string
    message: string
  }
}

/**
 * Error codes
 */
const ValidationErrorCodes = {
  INVALID_REQUEST: 'INVALID_REQUEST',
  CONTENT_TOO_LARGE: 'CONTENT_TOO_LARGE',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  HASH_INVALID: 'HASH_INVALID',
  PRIVACY_VIOLATION: 'PRIVACY_VIOLATION',
  RULE_NOT_FOUND: 'RULE_NOT_FOUND',
  UNAUTHORIZED: 'UNAUTHORIZED'
} as const

/**
 * Initialize validation services
 */
const contentValidator = new EnhancedContentValidationService({
  privacySafeOnly: true,
  enableConstitutionalRules: true,
  enableSecurityRules: true,
  enablePrivacyRules: true,
  maxContentLength: 1000000
})

const strictValidator = new EnhancedContentValidationService({
  privacySafeOnly: true,
  enableConstitutionalRules: true,
  enableSecurityRules: true,
  enablePrivacyRules: true,
  maxContentLength: 500000
})

/**
 * Validation cache for performance
 */
const validationCache = new Map<string, { result: ContentValidationResult; expires: number }>()

/**
 * POST /api/content-validation
 * Validate content with privacy-compliant processing
 */
export async function POST(request: NextRequest): Promise<NextResponse<ValidationResponse>> {
  const startTime = Date.now()
  
  try {
    const url = new URL(request.url)
    const endpoint = url.pathname.split('/').pop()

    if (endpoint === 'hash-only') {
      return await handleHashOnlyValidation(request)
    } else if (endpoint === 'content-validation' || endpoint === 'validate') {
      return await handleContentValidation(request)
    } else if (endpoint === 'rules') {
      const result = await handleCustomRuleManagement(request)
      return result as NextResponse<ValidationResponse>
    }

    return NextResponse.json({
      success: false,
      error: {
        code: ValidationErrorCodes.INVALID_REQUEST,
        message: 'Invalid validation endpoint'
      }
    }, { status: 404 })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    console.error('Content validation API error:', errorMessage, error)

    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error'
      }
    }, { status: 500 })
  }
}

/**
 * GET /api/content-validation/*
 * Get validation rules and statistics
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const url = new URL(request.url)
    const endpoint = url.pathname.split('/').pop()

    switch (endpoint) {
      case 'rules':
        return await handleGetRules(request)
      case 'stats':
        return await handleGetStats(request)
      case 'categories':
        return await handleGetCategories(request)
      default:
        return NextResponse.json({
          success: false,
          error: {
            code: ValidationErrorCodes.INVALID_REQUEST,
            message: 'Invalid GET endpoint'
          }
        }, { status: 404 })
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    console.error('Content validation GET error:', errorMessage, error)

    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error'
      }
    }, { status: 500 })
  }
}

/**
 * Handler functions
 */

/**
 * Handle content validation with privacy protection
 */
async function handleContentValidation(request: NextRequest): Promise<NextResponse<ValidationResponse>> {
  const body = await request.json()
  const validationResult = validateContentSchema.safeParse(body)
  
  if (!validationResult.success) {
    return NextResponse.json({
      success: false,
      error: {
        code: ValidationErrorCodes.INVALID_REQUEST,
        message: 'Invalid validation request format',
        details: validationResult.error.issues
      }
    }, { status: 400 })
  }

  const { content, options, metadata = {} } = validationResult.data

  // Check content size
  if (content.length > 1000000) {
    return NextResponse.json({
      success: false,
      error: {
        code: ValidationErrorCodes.CONTENT_TOO_LARGE,
        message: 'Content exceeds maximum size limit'
      }
    }, { status: 413 })
  }

  // Generate content hash for caching
  const contentHash = createHash('sha256').update(content).digest('hex')
  const cacheKey = generateValidationCacheKey(contentHash, options)

  // Check cache for recent validation
  const cachedResult = validationCache.get(cacheKey)
  if (cachedResult && cachedResult.expires > Date.now()) {
    return NextResponse.json({
      success: true,
      data: {
        validationId: cachedResult.result.id,
        result: formatValidationResult(cachedResult.result, options),
        processedAt: cachedResult.result.timestamp
      }
    })
  }

  try {
    // Perform validation with privacy-safe rules
    const useStrictValidator = options?.ruleCategories?.includes('security') ?? false
    const validator = useStrictValidator ? strictValidator : contentValidator
    
    const result = await validator.validateContent(content, {
      ruleCategories: options?.ruleCategories,
      skipPrivacyUnsafeRules: options?.skipPrivacyUnsafeRules !== false,
      collectMetrics: options?.collectMetrics
    })

    // Verify privacy compliance
    if (!result.metadata.privacyCompliant) {
      return NextResponse.json({
        success: false,
        error: {
          code: ValidationErrorCodes.PRIVACY_VIOLATION,
          message: 'Privacy violation detected during validation'
        }
      }, { status: 400 })
    }

    // Cache result for 10 minutes
    validationCache.set(cacheKey, {
      result,
      expires: Date.now() + 10 * 60 * 1000
    })

    // Log validation for audit purposes
    await logValidationEvent(result, metadata)

    return NextResponse.json({
      success: true,
      data: {
        validationId: result.id,
        result: formatValidationResult(result, options),
        processedAt: result.timestamp
      }
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    return NextResponse.json({
      success: false,
      error: {
        code: ValidationErrorCodes.VALIDATION_FAILED,
        message: errorMessage
      }
    }, { status: 500 })
  }
}

/**
 * Handle hash-only validation (maximum privacy)
 */
async function handleHashOnlyValidation(request: NextRequest): Promise<NextResponse<ValidationResponse>> {
  const body = await request.json()
  const validationResult = validateHashOnlySchema.safeParse(body)
  
  if (!validationResult.success) {
    return NextResponse.json({
      success: false,
      error: {
        code: ValidationErrorCodes.INVALID_REQUEST,
        message: 'Invalid hash-only validation request format',
        details: validationResult.error.issues
      }
    }, { status: 400 })
  }

  const { contentHash, contentLength, contentMetrics, metadata = {} } = validationResult.data

  // Validate hash format
  if (!/^[a-f0-9]{64}$/.test(contentHash)) {
    return NextResponse.json({
      success: false,
      error: {
        code: ValidationErrorCodes.HASH_INVALID,
        message: 'Invalid SHA-256 hash format'
      }
    }, { status: 400 })
  }

  try {
    // Perform hash-only validation
    const result = await contentValidator.validateContentHashOnly(
      contentHash,
      contentLength,
      contentMetrics
    )

    // Log validation for audit purposes
    await logValidationEvent(result, metadata)

    return NextResponse.json({
      success: true,
      data: {
        validationId: result.id,
        result: {
          summary: {
            isValid: result.isValid,
            score: result.overallScore,
            violationCount: result.violations.length,
            warningCount: result.warnings.length,
            privacyCompliant: result.metadata.privacyCompliant
          },
          violations: result.violations.map(v => ({
            category: v.category,
            severity: v.severity,
            description: v.description,
            recommendation: v.recommendation
          }))
        },
        processedAt: result.timestamp
      }
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    return NextResponse.json({
      success: false,
      error: {
        code: ValidationErrorCodes.VALIDATION_FAILED,
        message: errorMessage
      }
    }, { status: 500 })
  }
}

/**
 * Handle custom rule management
 */
async function handleCustomRuleManagement(request: NextRequest): Promise<NextResponse> {
  const body = await request.json()
  const validationResult = customRuleSchema.safeParse(body)
  
  if (!validationResult.success) {
    return NextResponse.json({
      success: false,
      error: {
        code: ValidationErrorCodes.INVALID_REQUEST,
        message: 'Invalid custom rule format',
        details: validationResult.error.issues
      }
    }, { status: 400 })
  }

  // Check authorization
  const authResult = await checkValidationAuthorization(request, 'rule_management')
  if (!authResult.authorized) {
    return NextResponse.json({
      success: false,
      error: {
        code: ValidationErrorCodes.UNAUTHORIZED,
        message: authResult.message || 'Unauthorized access'
      }
    }, { status: 403 })
  }

  const rule = validationResult.data

  // Note: In a real implementation, you would add the rule to the validator
  // For this demo, we'll just acknowledge the rule creation

  return NextResponse.json({
    success: true,
    data: {
      ruleId: rule.id,
      rule,
      message: 'Custom validation rule created successfully'
    }
  })
}

/**
 * Handle get validation rules
 */
async function handleGetRules(request: NextRequest): Promise<NextResponse<RulesResponse>> {
  const url = new URL(request.url)
  const category = url.searchParams.get('category')
  const enabled = url.searchParams.get('enabled')

  // Get validation rules (in real implementation, would query from validator)
  const sampleRules: ValidationRule[] = [
    {
      id: 'sql-injection-check',
      name: 'SQL Injection Detection',
      category: 'security',
      severity: 'critical',
      description: 'Detects potential SQL injection attempts',
      enabled: true,
      privacySafe: true
    },
    {
      id: 'content-storage-check',
      name: 'Content Storage Prevention',
      category: 'constitutional',
      severity: 'critical',
      description: 'Ensures no original content is stored',
      enabled: true,
      privacySafe: true
    }
  ]

  let filteredRules = sampleRules

  if (category) {
    filteredRules = filteredRules.filter(rule => rule.category === category)
  }

  if (enabled !== null) {
    const enabledFilter = enabled === 'true'
    filteredRules = filteredRules.filter(rule => rule.enabled === enabledFilter)
  }

  const categories = [...new Set(sampleRules.map(rule => rule.category))]

  return NextResponse.json({
    success: true,
    data: {
      rules: filteredRules,
      categories,
      totalRules: filteredRules.length
    }
  })
}

/**
 * Handle get validation statistics
 */
async function handleGetStats(request: NextRequest): Promise<NextResponse<StatsResponse>> {
  const stats = contentValidator.getValidationStats()

  return NextResponse.json({
    success: true,
    data: {
      statistics: stats,
      generatedAt: new Date().toISOString()
    }
  })
}

/**
 * Handle get validation categories
 */
async function handleGetCategories(request: NextRequest): Promise<NextResponse> {
  const categories = ['security', 'privacy', 'content', 'constitutional', 'format']
  
  return NextResponse.json({
    success: true,
    data: {
      categories,
      descriptions: {
        security: 'Rules for detecting security threats and vulnerabilities',
        privacy: 'Rules for protecting personally identifiable information',
        content: 'Rules for content quality and structure validation',
        constitutional: 'Rules for constitutional compliance verification',
        format: 'Rules for format and encoding validation'
      }
    }
  })
}

/**
 * Utility functions
 */

/**
 * Format validation result based on options
 */
function formatValidationResult(
  result: ContentValidationResult, 
  options: any
): ContentValidationResult | any {
  // Return summary if detailed view not requested
  if (options.summary) {
    return {
      summary: {
        isValid: result.isValid,
        score: result.overallScore,
        violationCount: result.violations.length,
        warningCount: result.warnings.length,
        privacyCompliant: result.metadata.privacyCompliant
      }
    }
  }

  return result
}

/**
 * Generate validation cache key
 */
function generateValidationCacheKey(contentHash: string, options: any): string {
  return createHash('sha256')
    .update(contentHash)
    .update(JSON.stringify(options))
    .digest('hex')
}

/**
 * Log validation event for audit purposes
 */
async function logValidationEvent(result: ContentValidationResult, metadata: any): Promise<void> {
  const logEntry = {
    validationId: result.id,
    timestamp: result.timestamp,
    isValid: result.isValid,
    score: result.overallScore,
    violationCount: result.violations.length,
    privacyCompliant: result.metadata.privacyCompliant,
    sessionId: metadata.sessionId,
    userId: metadata.userId,
    source: metadata.source
  }

  // In production, this would integrate with audit logging system
  console.log('Validation completed:', logEntry)
}

/**
 * Check validation authorization
 */
async function checkValidationAuthorization(
  request: NextRequest,
  operation: string
): Promise<{ authorized: boolean; message?: string }> {
  // In production, implement proper role-based access control
  const authHeader = request.headers.get('authorization')
  
  const restrictedOperations = ['rule_management']
  
  if (restrictedOperations.includes(operation) && !authHeader) {
    return {
      authorized: false,
      message: `${operation} requires authentication`
    }
  }

  return { authorized: true }
}

/**
 * Cleanup validation cache periodically
 */
export function cleanupValidationCache(): void {
  const now = Date.now()
  for (const [key, value] of validationCache.entries()) {
    if (value.expires <= now) {
      validationCache.delete(key)
    }
  }
}

// Run cache cleanup every 15 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupValidationCache, 15 * 60 * 1000)
}