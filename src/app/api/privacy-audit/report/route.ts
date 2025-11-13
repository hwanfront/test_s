/**
 * Privacy Audit Report API Route
 * 
 * Generate and export detailed privacy audit reports
 * 
 * @route POST /api/privacy-audit/report
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/shared/config/auth'
import { 
  defaultPrivacyAuditor,
  PrivacyAuditUtilities,
  type PrivacyAuditResult
} from '@/shared/lib/privacy/audit-utils'
import { z } from 'zod'

/**
 * Report request schema
 */
const ReportRequestSchema = z.object({
  period: z.object({
    start: z.string().datetime().optional(),
    end: z.string().datetime().optional()
  }).optional(),
  format: z.enum(['json', 'summary', 'detailed']).default('json'),
  includeHistory: z.boolean().default(false),
  maxHistoryItems: z.number().min(1).max(100).default(10)
})

/**
 * POST /api/privacy-audit/report
 * Generate comprehensive privacy audit report
 */
export async function POST(request: NextRequest) {
  try {
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
      const validationResult = ReportRequestSchema.safeParse(body)
      
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
      requestData = ReportRequestSchema.parse({})
    }

    const { period, format, includeHistory, maxHistoryItems } = requestData

    // Validate date range if provided
    if (period?.start && period?.end) {
      const startDate = new Date(period.start)
      const endDate = new Date(period.end)
      const daysDiff = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
      
      if (daysDiff > 90) {
        return NextResponse.json({
          error: 'Report period cannot exceed 90 days'
        }, { status: 400 })
      }
    }

    // Get audit data
    const latestAudit = defaultPrivacyAuditor.getLatestAuditResult()
    
    if (!latestAudit) {
      return NextResponse.json({
        error: 'No audit data available. Please run an audit first.'
      }, { status: 400 })
    }

    // Generate report based on format
    let reportData: any

    if (format === 'summary') {
      reportData = {
        reportId: `report-${Date.now()}`,
        reportType: 'summary',
        generatedAt: new Date().toISOString(),
        generatedBy: session.user.email,
        period: period || { 
          start: latestAudit.auditedAt, 
          end: new Date().toISOString() 
        },
        summary: {
          overallStatus: latestAudit.overallStatus,
          complianceScore: latestAudit.complianceScore,
          totalChecks: latestAudit.summary.totalChecks,
          keyFindings: [
            `${latestAudit.summary.violationChecks} privacy violations detected`,
            `${latestAudit.summary.warningChecks} warnings identified`,
            `${latestAudit.summary.passedChecks} checks passed successfully`,
            `Overall compliance: ${latestAudit.overallStatus.toUpperCase()}`,
            `Compliance score: ${latestAudit.complianceScore}%`
          ],
          recommendations: latestAudit.recommendations.slice(0, 5), // Top 5 recommendations
          nextAuditDate: latestAudit.nextAuditDate
        }
      }
    } else if (format === 'detailed') {
      reportData = {
        reportId: `report-${Date.now()}`,
        reportType: 'detailed',
        generatedAt: new Date().toISOString(),
        generatedBy: session.user.email,
        period: period || { 
          start: latestAudit.auditedAt, 
          end: new Date().toISOString() 
        },
        audit: latestAudit,
        auditAnalysis: {
          criticalIssues: latestAudit.checks.filter(check => 
            check.status === 'violation' && check.severity === 'critical'
          ),
          highPriorityWarnings: latestAudit.checks.filter(check => 
            check.status === 'warning' && check.severity === 'high'
          ),
          regulatoryCompliance: {
            GDPR: latestAudit.checks.filter(check => check.regulation === 'GDPR'),
            CCPA: latestAudit.checks.filter(check => check.regulation === 'CCPA'),
            Constitutional: latestAudit.checks.filter(check => check.regulation === 'Constitutional'),
            Internal: latestAudit.checks.filter(check => check.regulation === 'Internal')
          }
        },
        ...(includeHistory && {
          auditHistory: defaultPrivacyAuditor.getAuditHistory(maxHistoryItems)
        })
      }
    } else {
      // JSON format - return the audit result as-is
      reportData = {
        reportId: `report-${Date.now()}`,
        reportType: 'json',
        generatedAt: new Date().toISOString(),
        generatedBy: session.user.email,
        period: period || { 
          start: latestAudit.auditedAt, 
          end: new Date().toISOString() 
        },
        audit: latestAudit,
        ...(includeHistory && {
          auditHistory: defaultPrivacyAuditor.getAuditHistory(maxHistoryItems)
        })
      }
    }

    return NextResponse.json({
      success: true,
      data: reportData,
      message: `Privacy audit report generated successfully (${format} format)`
    })

  } catch (error) {
    console.error('Report generation failed:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to generate audit report',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

/**
 * GET /api/privacy-audit/report
 * Get available report formats and options
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

    const latestAudit = defaultPrivacyAuditor.getLatestAuditResult()
    const auditHistory = defaultPrivacyAuditor.getAuditHistory()

    return NextResponse.json({
      success: true,
      data: {
        availableFormats: ['json', 'summary', 'detailed'],
        latestAuditAvailable: !!latestAudit,
        latestAuditDate: latestAudit?.auditedAt,
        auditHistoryCount: auditHistory.length,
        maxReportPeriodDays: 90,
        supportedOptions: {
          includeHistory: 'Include historical audit data in report',
          maxHistoryItems: 'Maximum number of historical audits to include (1-100)',
          period: 'Optional date range for report scope'
        }
      },
      message: 'Report options retrieved successfully'
    })

  } catch (error) {
    console.error('Failed to retrieve report options:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to retrieve report options'
    }, { status: 500 })
  }
}