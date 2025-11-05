/**
 * Privacy Audit API Route (Task T114)
 * 
 * Privacy compliance auditing and monitoring API ensuring constitutional compliance
 * with automated compliance verification and reporting.
 * 
 * Constitutional Principle II: Legal Risk Minimization
 * - Automated privacy compliance monitoring
 * - Constitutional compliance verification
 * - Privacy violation detection and reporting
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createHash } from 'crypto'
import { 
  PrivacyAuditUtilities,
  type PrivacyComplianceLevel,
  type ComplianceCheckResult,
  type PrivacyAuditReport
} from '@/features/text-preprocessing/lib/privacy-audit-utilities'
import { PreprocessingAuditLogger } from '@/features/text-preprocessing/lib/audit-logger'

/**
 * Audit request schemas
 */
const auditRequestSchema = z.object({
  auditScope: z.enum(['session', 'user', 'system', 'comprehensive']),
  filters: z.object({
    sessionId: z.string().uuid().optional(),
    userId: z.string().optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    eventTypes: z.array(z.string()).optional(),
    securityLevel: z.enum(['low', 'medium', 'high', 'critical']).optional()
  }).optional(),
  options: z.object({
    includeRecommendations: z.boolean().default(true),
    includeMetrics: z.boolean().default(true),
    includeConstitutionalCompliance: z.boolean().default(true),
    generateReport: z.boolean().default(false),
    enableRealTimeMonitoring: z.boolean().default(false)
  }).optional()
})

const reportRequestSchema = z.object({
  period: z.object({
    start: z.string().datetime(),
    end: z.string().datetime()
  }),
  format: z.enum(['json', 'summary']).default('json'),
  includeDetails: z.boolean().default(true),
  complianceLevel: z.enum(['constitutional', 'regulatory', 'standard', 'basic']).default('constitutional')
})

/**
 * API Response interfaces
 */
interface AuditResponse {
  success: boolean
  data?: {
    auditId: string
    complianceResult: ComplianceCheckResult
    recommendations?: string[]
    nextAuditScheduled?: string
  }
  error?: {
    code: string
    message: string
    details?: any
  }
}

interface ReportResponse {
  success: boolean
  data?: {
    reportId: string
    report: PrivacyAuditReport | {
      summary: string
      complianceLevel: PrivacyComplianceLevel
      score: number
      keyFindings: string[]
    }
    generatedAt: string
  }
  error?: {
    code: string
    message: string
    details?: any
  }
}

interface StatusResponse {
  success: boolean
  data?: {
    privacyStatus: {
      complianceLevel: PrivacyComplianceLevel
      overallScore: number
      activeViolations: number
      activeWarnings: number
      lastAuditTime?: string
      constitutionalCompliant: boolean
    }
    systemHealth: {
      auditingEnabled: boolean
      lastSystemCheck: string
      errorRate: number
      processingLatency: number
    }
  }
  error?: {
    code: string
    message: string
  }
}

/**
 * Error codes
 */
const AuditErrorCodes = {
  INVALID_REQUEST: 'INVALID_REQUEST',
  UNAUTHORIZED: 'UNAUTHORIZED',
  AUDIT_FAILED: 'AUDIT_FAILED',
  REPORT_GENERATION_FAILED: 'REPORT_GENERATION_FAILED',
  INSUFFICIENT_DATA: 'INSUFFICIENT_DATA',
  PRIVACY_VIOLATION_DETECTED: 'PRIVACY_VIOLATION_DETECTED'
} as const

/**
 * Initialize services
 */
const privacyAuditor = new PrivacyAuditUtilities({
  complianceLevel: 'constitutional',
  enableConstitutionalCompliance: true,
  enableRealTimeMonitoring: true,
  reportingThreshold: 1,
  auditFrequency: 'continuous'
})

const auditLogger = new PreprocessingAuditLogger({
  enableDetailedLogging: true,
  enablePrivacyValidation: true,
  securityLevel: 'strict'
})

/**
 * Audit cache for performance
 */
const auditCache = new Map<string, { result: ComplianceCheckResult; expires: number }>()

/**
 * POST /api/privacy-audit
 * Perform privacy compliance audit
 */
export async function POST(request: NextRequest): Promise<NextResponse<AuditResponse>> {
  const startTime = Date.now()
  
  try {
    // Parse and validate request
    const body = await request.json()
    const validationResult = auditRequestSchema.safeParse(body)
    
    if (!validationResult.success) {
      return NextResponse.json({
        success: false,
        error: {
          code: AuditErrorCodes.INVALID_REQUEST,
          message: 'Invalid audit request format',
          details: validationResult.error.issues
        }
      }, { status: 400 })
    }

    const { auditScope, filters = {}, options = {} } = validationResult.data

    // Check authorization
    const authResult = await checkAuditAuthorization(request, auditScope)
    if (!authResult.authorized) {
      return NextResponse.json({
        success: false,
        error: {
          code: AuditErrorCodes.UNAUTHORIZED,
          message: authResult.message || 'Unauthorized access'
        }
      }, { status: 403 })
    }

    // Generate audit cache key
    const auditCacheKey = generateAuditCacheKey(auditScope, filters)
    
    // Check cache for recent audit results
    const cachedResult = auditCache.get(auditCacheKey)
    if (cachedResult && cachedResult.expires > Date.now()) {
      return NextResponse.json({
        success: true,
        data: {
          auditId: cachedResult.result.id,
          complianceResult: cachedResult.result,
          recommendations: options?.includeRecommendations ? cachedResult.result.recommendations : undefined
        }
      })
    }

    // Collect audit data based on scope
    const auditData = await collectAuditData(auditScope, filters)
    
    if (auditData.totalRecords === 0) {
      return NextResponse.json({
        success: false,
        error: {
          code: AuditErrorCodes.INSUFFICIENT_DATA,
          message: 'No data available for audit scope',
          details: { scope: auditScope, filters }
        }
      }, { status: 400 })
    }

    // Perform comprehensive compliance audit
    const complianceResult = await privacyAuditor.performComplianceAudit({
      auditEntries: auditData.auditEntries,
      systemData: auditData.systemData,
      userSessions: auditData.userSessions
    })

    // Check for critical privacy violations
    const criticalViolations = complianceResult.violations.filter(v => v.severity === 'critical')
    if (criticalViolations.length > 0) {
      // Log critical violations for immediate attention
      await logCriticalViolations(criticalViolations)
      
      // In production, this might trigger immediate alerts
      console.error(`Critical privacy violations detected: ${criticalViolations.length}`)
    }

    // Cache result for performance (5-minute cache)
    auditCache.set(auditCacheKey, {
      result: complianceResult,
      expires: Date.now() + 5 * 60 * 1000
    })

    // Prepare response
    const response: AuditResponse = {
      success: true,
      data: {
        auditId: complianceResult.id,
        complianceResult,
        recommendations: options?.includeRecommendations ? complianceResult.recommendations : undefined,
        nextAuditScheduled: calculateNextAuditTime(auditScope)
      }
    }

    // Log audit completion
    console.log(`Privacy audit completed: ${complianceResult.id} (${Date.now() - startTime}ms)`)

    return NextResponse.json(response, { status: 200 })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    console.error('Privacy audit failed:', errorMessage, error)

    return NextResponse.json({
      success: false,
      error: {
        code: AuditErrorCodes.AUDIT_FAILED,
        message: 'Privacy audit failed'
      }
    }, { status: 500 })
  }
}

/**
 * POST /api/privacy-audit/report
 * Generate comprehensive privacy audit report
 */
export async function PUT(request: NextRequest): Promise<NextResponse<ReportResponse>> {
  try {
    const body = await request.json()
    const validationResult = reportRequestSchema.safeParse(body)
    
    if (!validationResult.success) {
      return NextResponse.json({
        success: false,
        error: {
          code: AuditErrorCodes.INVALID_REQUEST,
          message: 'Invalid report request format',
          details: validationResult.error.issues
        }
      }, { status: 400 })
    }

    const { period, format, includeDetails, complianceLevel } = validationResult.data

    // Check authorization for report generation
    const authResult = await checkReportAuthorization(request)
    if (!authResult.authorized) {
      return NextResponse.json({
        success: false,
        error: {
          code: AuditErrorCodes.UNAUTHORIZED,
          message: authResult.message || 'Unauthorized access'
        }
      }, { status: 403 })
    }

    // Validate date range
    const startDate = new Date(period.start)
    const endDate = new Date(period.end)
    const daysDiff = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    
    if (daysDiff > 90) {
      return NextResponse.json({
        success: false,
        error: {
          code: AuditErrorCodes.INVALID_REQUEST,
          message: 'Report period cannot exceed 90 days'
        }
      }, { status: 400 })
    }

    // Generate comprehensive audit report
    const report = await privacyAuditor.generateAuditReport(period)
    
    // Format response based on requested format
    let responseData: any
    
    if (format === 'summary') {
      responseData = {
        reportId: report.id,
        report: {
          summary: report.executiveSummary,
          complianceLevel: report.complianceLevel,
          score: report.overallScore,
          keyFindings: [
            `${report.violations.length} privacy violations detected`,
            `${report.warnings.length} warnings identified`,
            `Constitutional compliance: ${report.constitutionalCompliance.every(c => c.isCompliant) ? 'COMPLIANT' : 'NON-COMPLIANT'}`,
            `Privacy compliance rate: ${(report.metrics.complianceRate * 100).toFixed(1)}%`
          ]
        },
        generatedAt: report.generatedAt
      }
    } else {
      responseData = {
        reportId: report.id,
        report: includeDetails ? report : {
          ...report,
          violations: report.violations.map(v => ({
            id: v.id,
            severity: v.severity,
            category: v.category,
            description: v.description
          })),
          warnings: report.warnings.map(w => ({
            id: w.id,
            category: w.category,
            description: w.description
          }))
        },
        generatedAt: report.generatedAt
      }
    }

    return NextResponse.json({
      success: true,
      data: responseData
    }, { status: 200 })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    console.error('Report generation failed:', errorMessage, error)

    return NextResponse.json({
      success: false,
      error: {
        code: AuditErrorCodes.REPORT_GENERATION_FAILED,
        message: 'Failed to generate audit report'
      }
    }, { status: 500 })
  }
}

/**
 * GET /api/privacy-audit/status
 * Get privacy compliance status
 */
export async function GET(request: NextRequest): Promise<NextResponse<StatusResponse>> {
  try {
    // Get current privacy status
    const privacyStatus = privacyAuditor.getPrivacyStatus()
    
    // Get system health metrics
    const auditStats = auditLogger.getAuditStats()
    const processingStats = auditLogger.getProcessingStats()
    
    const systemHealth = {
      auditingEnabled: true,
      lastSystemCheck: new Date().toISOString(),
      errorRate: processingStats.errorRate,
      processingLatency: processingStats.averageProcessingTime
    }

    return NextResponse.json({
      success: true,
      data: {
        privacyStatus,
        systemHealth
      }
    }, { status: 200 })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    return NextResponse.json({
      success: false,
      error: {
        code: 'STATUS_ERROR',
        message: 'Failed to retrieve privacy status'
      }
    }, { status: 500 })
  }
}

/**
 * Utility functions
 */

/**
 * Check audit authorization
 */
async function checkAuditAuthorization(
  request: NextRequest, 
  auditScope: string
): Promise<{ authorized: boolean; message?: string }> {
  // In production, implement proper authentication and authorization
  // For now, allow all audit requests
  
  const authHeader = request.headers.get('authorization')
  
  // Basic authorization check
  if (!authHeader && auditScope === 'system') {
    return {
      authorized: false,
      message: 'System-wide audits require authentication'
    }
  }

  return { authorized: true }
}

/**
 * Check report authorization
 */
async function checkReportAuthorization(
  request: NextRequest
): Promise<{ authorized: boolean; message?: string }> {
  // In production, implement proper role-based access control
  const authHeader = request.headers.get('authorization')
  
  if (!authHeader) {
    return {
      authorized: false,
      message: 'Report generation requires authentication'
    }
  }

  return { authorized: true }
}

/**
 * Collect audit data based on scope
 */
async function collectAuditData(
  auditScope: string,
  filters: any
): Promise<{
  auditEntries: any[]
  systemData: any[]
  userSessions: any[]
  totalRecords: number
}> {
  const auditEntries: any[] = []
  const systemData: any[] = []
  const userSessions: any[] = []

  switch (auditScope) {
    case 'session':
      if (filters.sessionId) {
        const sessionLogs = auditLogger.getSessionLogs(filters.sessionId)
        auditEntries.push(...sessionLogs)
      }
      break

    case 'user':
      if (filters.userId) {
        const userLogs = auditLogger.getUserLogs(filters.userId, 1000)
        auditEntries.push(...userLogs)
      }
      break

    case 'system':
    case 'comprehensive':
      // Get recent audit entries for system-wide audit
      const stats = auditLogger.getProcessingStats(
        filters.startDate && filters.endDate ? {
          start: filters.startDate,
          end: filters.endDate
        } : undefined
      )
      
      // For demo purposes, create sample data
      // In production, this would query actual database/storage
      auditEntries.push({
        id: 'sample-entry',
        eventType: 'content_hashed',
        timestamp: new Date().toISOString(),
        privacyCompliance: {
          containsOriginalContent: false,
          containsPII: false,
          hashOnly: true,
          validated: true
        }
      })
      break
  }

  return {
    auditEntries,
    systemData,
    userSessions,
    totalRecords: auditEntries.length + systemData.length + userSessions.length
  }
}

/**
 * Generate audit cache key
 */
function generateAuditCacheKey(auditScope: string, filters: any): string {
  return createHash('sha256')
    .update(auditScope)
    .update(JSON.stringify(filters))
    .digest('hex')
}

/**
 * Calculate next audit time
 */
function calculateNextAuditTime(auditScope: string): string {
  const intervals = {
    session: 1, // 1 hour
    user: 6,    // 6 hours
    system: 24, // 24 hours
    comprehensive: 168 // 1 week
  }

  const hours = intervals[auditScope as keyof typeof intervals] || 24
  const nextAudit = new Date(Date.now() + hours * 60 * 60 * 1000)
  
  return nextAudit.toISOString()
}

/**
 * Log critical violations
 */
async function logCriticalViolations(violations: any[]): Promise<void> {
  for (const violation of violations) {
    console.error('CRITICAL PRIVACY VIOLATION:', {
      id: violation.id,
      category: violation.category,
      description: violation.description,
      timestamp: violation.timestamp
    })
  }

  // In production, this would:
  // 1. Send immediate alerts to security team
  // 2. Create incident tickets
  // 3. Trigger automated remediation if configured
}

/**
 * Cleanup audit cache periodically
 */
export function cleanupAuditCache(): void {
  const now = Date.now()
  for (const [key, value] of auditCache.entries()) {
    if (value.expires <= now) {
      auditCache.delete(key)
    }
  }
}

// Run cache cleanup every 10 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupAuditCache, 10 * 60 * 1000)
}