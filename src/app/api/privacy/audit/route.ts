/**
 * Privacy Audit API Route (Task T116)
 * 
 * GET /api/privacy/audit - Privacy audit operations endpoint
 * Provides access to privacy compliance auditing and monitoring.
 * 
 * @route GET /api/privacy/audit
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/shared/config/auth'
import { 
  defaultPrivacyAuditor,
  type PrivacyAuditResult,
  type PrivacyAuditConfig
} from '@/shared/lib/privacy/audit-utils'
import { z } from 'zod'

/**
 * Query parameters schema for audit requests
 */
const AuditQuerySchema = z.object({
  /** Type of audit to perform or retrieve */
  type: z.enum(['status', 'history', 'run', 'latest']).optional(),
  /** Limit for history results */
  limit: z.string().transform(val => parseInt(val) || 10).optional(),
  /** Include detailed audit information */
  detailed: z.string().transform(val => val === 'true').optional(),
  /** Filter by compliance status */
  status: z.enum(['compliant', 'warning', 'violation', 'error']).optional(),
  /** Filter by regulation */
  regulation: z.enum(['GDPR', 'CCPA', 'PIPEDA', 'K-PIPA', 'Constitutional', 'Internal']).optional()
})

/**
 * GET /api/privacy/audit
 * Retrieve privacy audit information or perform audit operations
 */
export async function GET(request: NextRequest) {
  try {
    // Authentication check
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Authentication required' 
        },
        { status: 401 }
      )
    }

    // Parse and validate query parameters
    const { searchParams } = new URL(request.url)
    const queryResult = AuditQuerySchema.safeParse({
      type: searchParams.get('type'),
      limit: searchParams.get('limit'),
      detailed: searchParams.get('detailed'),
      status: searchParams.get('status'),
      regulation: searchParams.get('regulation')
    })

    if (!queryResult.success) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid query parameters',
          details: queryResult.error.issues
        },
        { status: 400 }
      )
    }

    const { type = 'status', limit = 10, detailed = false, status, regulation } = queryResult.data

    switch (type) {
      case 'status':
        return handleStatusRequest(detailed)

      case 'history':
        return handleHistoryRequest(limit, detailed, status, regulation)

      case 'latest':
        return handleLatestRequest(detailed)

      case 'run':
        return handleRunRequest(session.user.email || '')

      default:
        return NextResponse.json(
          { 
            success: false,
            error: 'Invalid audit type' 
          },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('Privacy audit API error:', error)
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * Handle status request
 */
async function handleStatusRequest(detailed: boolean) {
  try {
    const latestAudit = defaultPrivacyAuditor.getLatestAuditResult()
    const auditHistory = defaultPrivacyAuditor.getAuditHistory(5)

    if (!latestAudit) {
      return NextResponse.json({
        success: true,
        data: {
          status: 'no_audit_available',
          message: 'No privacy audit has been performed yet',
          auditHistoryCount: auditHistory.length,
          recommendations: ['Run your first privacy audit to assess compliance status']
        }
      })
    }

    const statusData = {
      currentStatus: {
        overallStatus: latestAudit.overallStatus,
        complianceScore: latestAudit.complianceScore,
        auditedAt: latestAudit.auditedAt,
        nextAuditDate: latestAudit.nextAuditDate,
        auditDuration: latestAudit.auditDuration
      },
      summary: {
        totalChecks: latestAudit.summary.totalChecks,
        passedChecks: latestAudit.summary.passedChecks,
        warningChecks: latestAudit.summary.warningChecks,
        violationChecks: latestAudit.summary.violationChecks,
        errorChecks: latestAudit.summary.errorChecks
      },
      auditHistory: {
        totalAudits: auditHistory.length,
        recentTrend: calculateComplianceTrend(auditHistory),
        lastFiveScores: auditHistory.slice(-5).map(audit => ({
          date: audit.auditedAt,
          score: audit.complianceScore,
          status: audit.overallStatus
        }))
      },
      recommendations: latestAudit.recommendations.slice(0, 3) // Top 3 recommendations
    }

    if (detailed) {
      (statusData as any).detailedChecks = {
        critical: latestAudit.checks.filter(check => 
          check.severity === 'critical' && check.status !== 'pass'
        ),
        high: latestAudit.checks.filter(check => 
          check.severity === 'high' && check.status !== 'pass'
        ),
        byRegulation: {
          GDPR: latestAudit.checks.filter(check => check.regulation === 'GDPR'),
          CCPA: latestAudit.checks.filter(check => check.regulation === 'CCPA'),
          Constitutional: latestAudit.checks.filter(check => check.regulation === 'Constitutional'),
          Internal: latestAudit.checks.filter(check => check.regulation === 'Internal')
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: statusData,
      message: 'Privacy audit status retrieved successfully'
    })

  } catch (error) {
    throw new Error(`Failed to retrieve audit status: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Handle history request
 */
async function handleHistoryRequest(
  limit: number, 
  detailed: boolean, 
  statusFilter?: string, 
  regulationFilter?: string
) {
  try {
    let auditHistory = defaultPrivacyAuditor.getAuditHistory(Math.min(limit, 100))

    // Apply filters
    if (statusFilter) {
      auditHistory = auditHistory.filter(audit => audit.overallStatus === statusFilter)
    }

    if (regulationFilter) {
      auditHistory = auditHistory.filter(audit => 
        audit.checks.some(check => check.regulation === regulationFilter)
      )
    }

    const historyData = auditHistory.map(audit => {
      const baseData = {
        auditId: audit.auditedAt, // Using timestamp as ID
        auditedAt: audit.auditedAt,
        overallStatus: audit.overallStatus,
        complianceScore: audit.complianceScore,
        auditDuration: audit.auditDuration,
        summary: audit.summary,
        topRecommendations: audit.recommendations.slice(0, 2)
      }

      if (detailed) {
        return {
          ...baseData,
          checks: audit.checks,
          recommendations: audit.recommendations
        }
      }

      return baseData
    })

    const analytics = {
      totalAudits: auditHistory.length,
      averageComplianceScore: auditHistory.length > 0 
        ? Math.round(auditHistory.reduce((sum, audit) => sum + audit.complianceScore, 0) / auditHistory.length)
        : 0,
      complianceDistribution: {
        compliant: auditHistory.filter(audit => audit.overallStatus === 'compliant').length,
        warning: auditHistory.filter(audit => audit.overallStatus === 'warning').length,
        violation: auditHistory.filter(audit => audit.overallStatus === 'violation').length,
        error: auditHistory.filter(audit => audit.overallStatus === 'error').length
      },
      trend: calculateComplianceTrend(auditHistory)
    }

    return NextResponse.json({
      success: true,
      data: {
        audits: historyData,
        analytics,
        filters: {
          appliedStatus: statusFilter,
          appliedRegulation: regulationFilter,
          totalResults: historyData.length,
          requestedLimit: limit
        }
      },
      message: `Retrieved ${historyData.length} audit records`
    })

  } catch (error) {
    throw new Error(`Failed to retrieve audit history: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Handle latest audit request
 */
async function handleLatestRequest(detailed: boolean) {
  try {
    const latestAudit = defaultPrivacyAuditor.getLatestAuditResult()

    if (!latestAudit) {
      return NextResponse.json({
        success: true,
        data: null,
        message: 'No audit results available'
      })
    }

    const responseData = detailed ? latestAudit : {
      auditedAt: latestAudit.auditedAt,
      overallStatus: latestAudit.overallStatus,
      complianceScore: latestAudit.complianceScore,
      summary: latestAudit.summary,
      nextAuditDate: latestAudit.nextAuditDate,
      topRecommendations: latestAudit.recommendations.slice(0, 3),
      criticalIssues: latestAudit.checks.filter(check => 
        check.severity === 'critical' && check.status !== 'pass'
      ).length
    }

    return NextResponse.json({
      success: true,
      data: responseData,
      message: 'Latest audit result retrieved successfully'
    })

  } catch (error) {
    throw new Error(`Failed to retrieve latest audit: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Handle run audit request
 */
async function handleRunRequest(userEmail: string) {
  try {
    // Check if an audit is currently running
    // In a real implementation, you might track running audits

    // Perform privacy audit
    const auditResult = await defaultPrivacyAuditor.performPrivacyAudit()

    // Log audit execution
    console.log(`Privacy audit executed by ${userEmail} at ${auditResult.auditedAt}`)

    return NextResponse.json({
      success: true,
      data: {
        auditResult,
        executedBy: userEmail,
        executionTime: auditResult.auditDuration
      },
      message: 'Privacy audit completed successfully'
    })

  } catch (error) {
    throw new Error(`Failed to run privacy audit: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Calculate compliance trend from audit history
 */
function calculateComplianceTrend(audits: PrivacyAuditResult[]): 'improving' | 'declining' | 'stable' | 'insufficient_data' {
  if (audits.length < 2) {
    return 'insufficient_data'
  }

  const recentAudits = audits.slice(-5) // Last 5 audits
  const scores = recentAudits.map(audit => audit.complianceScore)

  // Calculate simple trend
  let improvements = 0
  let declines = 0

  for (let i = 1; i < scores.length; i++) {
    if (scores[i] > scores[i - 1]) {
      improvements++
    } else if (scores[i] < scores[i - 1]) {
      declines++
    }
  }

  if (improvements > declines) {
    return 'improving'
  } else if (declines > improvements) {
    return 'declining'
  } else {
    return 'stable'
  }
}

/**
 * POST /api/privacy/audit
 * Trigger a new privacy audit
 */
export async function POST(request: NextRequest) {
  try {
    // Authentication check
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Authentication required' 
        },
        { status: 401 }
      )
    }

    // Parse optional configuration
    let auditConfig: Partial<PrivacyAuditConfig> = {}
    
    try {
      const body = await request.json()
      if (body.config) {
        auditConfig = body.config
      }
    } catch {
      // No body or invalid JSON - use defaults
    }

    // Perform privacy audit with custom config if provided
    const auditResult = await defaultPrivacyAuditor.performPrivacyAudit()

    // Log audit execution
    console.log(`Privacy audit triggered by ${session.user.email} at ${auditResult.auditedAt}`)

    return NextResponse.json({
      success: true,
      data: {
        auditResult,
        triggeredBy: session.user.email,
        configuration: auditConfig
      },
      message: 'Privacy audit executed successfully'
    })

  } catch (error) {
    console.error('Failed to trigger privacy audit:', error)
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to execute privacy audit',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}