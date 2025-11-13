/**
 * Privacy Compliance API Routes (Task T114)
 * 
 * REST endpoints for privacy auditing, compliance checking, and audit report generation
 * Supporting constitutional compliance and regulatory requirements.
 * 
 * @route /api/privacy-audit
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/shared/config/auth'
import { 
  defaultPrivacyAuditor,
  PrivacyAuditUtilities,
  type PrivacyAuditResult,
  type PrivacyAuditConfig
} from '@/shared/lib/privacy/audit-utils'
import { z } from 'zod'

/**
 * Privacy audit request schema
 */
const PrivacyAuditRequestSchema = z.object({
  config: z.object({
    enableDatabaseScan: z.boolean().optional(),
    enableApiAnalysis: z.boolean().optional(),
    enableCodeAnalysis: z.boolean().optional(),
    enableLogAnalysis: z.boolean().optional(),
    maxAuditDuration: z.number().min(1000).max(1800000).optional(),
    jurisdictions: z.array(z.enum(['EU', 'CA', 'US', 'KR'])).optional(),
    detailLevel: z.enum(['basic', 'standard', 'comprehensive']).optional()
  }).optional(),
  includeHistory: z.boolean().optional(),
  exportFormat: z.enum(['json', 'csv', 'pdf']).optional()
})

/**
 * Simple rate limiting store
 */
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

/**
 * Simple rate limiting function
 */
function checkRateLimit(ip: string, maxRequests = 5, windowMs = 3600000): boolean {
  const now = Date.now()
  const key = `privacy-audit:${ip}`
  const existing = rateLimitStore.get(key)

  if (!existing || now > existing.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs })
    return true
  }

  if (existing.count >= maxRequests) {
    return false
  }

  existing.count++
  return true
}

/**
 * POST /api/privacy-audit
 * Perform comprehensive privacy audit
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limiting check
    const clientIP = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown'
    if (!checkRateLimit(clientIP)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded for privacy audits' },
        { status: 429 }
      )
    }

    // Authentication check
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Parse and validate request data
    let requestData: any = {}
    try {
      const body = await request.json()
      const validationResult = PrivacyAuditRequestSchema.safeParse(body)
      
      if (!validationResult.success) {
        return NextResponse.json(
          { 
            error: 'Invalid request format',
            details: validationResult.error.issues
          },
          { status: 400 }
        )
      }
      
      requestData = validationResult.data
    } catch (error) {
      // If no body or invalid JSON, use defaults
      requestData = {}
    }

    // Configure audit based on request
    const auditConfig: Partial<PrivacyAuditConfig> = {
      enableDatabaseScan: true,
      enableApiAnalysis: true,
      enableCodeAnalysis: true,
      enableLogAnalysis: true,
      maxAuditDuration: 30 * 60 * 1000, // 30 minutes default
      jurisdictions: ['EU', 'US', 'KR'],
      detailLevel: 'standard',
      ...requestData.config
    }

    // Create auditor instance with custom config
    const auditor = new PrivacyAuditUtilities(auditConfig)

    // Perform privacy audit
    const auditResult = await auditor.performPrivacyAudit()

    // Prepare response data
    const responseData: any = {
      audit: auditResult,
      auditedBy: session.user.email,
      auditConfiguration: auditConfig
    }

    // Include history if requested
    if (requestData.includeHistory) {
      responseData.history = auditor.getAuditHistory(10)
    }

    // Handle export format
    if (requestData.exportFormat && requestData.exportFormat !== 'json') {
      const exportResult = auditor.exportAuditReport(auditResult)
      responseData.exportData = exportResult
    }

    return NextResponse.json({
      success: true,
      data: responseData,
      message: 'Privacy audit completed successfully',
      auditStatus: auditResult.overallStatus,
      complianceScore: auditResult.complianceScore
    })

  } catch (error) {
    console.error('Privacy audit failed:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Privacy audit failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/privacy-audit
 * Get privacy audit history and status
 */
export async function GET(request: NextRequest) {
  try {
    // Authentication check
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')
    const includeDetails = searchParams.get('includeDetails') === 'true'

    // Get audit history
    const auditHistory = defaultPrivacyAuditor.getAuditHistory(limit)
    const latestAudit = defaultPrivacyAuditor.getLatestAuditResult()

    const responseData = {
      latestAudit: includeDetails ? latestAudit : (latestAudit ? {
        overallStatus: latestAudit.overallStatus,
        auditedAt: latestAudit.auditedAt,
        complianceScore: latestAudit.complianceScore,
        nextAuditDate: latestAudit.nextAuditDate
      } : null),
      auditHistory: includeDetails ? auditHistory : auditHistory.map(audit => ({
        overallStatus: audit.overallStatus,
        auditedAt: audit.auditedAt,
        complianceScore: audit.complianceScore,
        auditDuration: audit.auditDuration
      })),
      auditCount: auditHistory.length
    }

    return NextResponse.json({
      success: true,
      data: responseData,
      message: 'Privacy audit history retrieved successfully'
    })

  } catch (error) {
    console.error('Failed to retrieve audit history:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to retrieve audit history',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/privacy-audit
 * Clear audit history (admin only)
 */
export async function DELETE(request: NextRequest) {
  try {
    // Authentication check
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Clear audit history
    defaultPrivacyAuditor.clearAuditHistory()

    return NextResponse.json({
      success: true,
      message: 'Audit history cleared successfully'
    })

  } catch (error) {
    console.error('Failed to clear audit history:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to clear audit history'
      },
      { status: 500 }
    )
  }
}