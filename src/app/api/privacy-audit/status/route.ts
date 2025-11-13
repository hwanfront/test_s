/**
 * Privacy Audit Status API Route
 * 
 * Get current privacy compliance status and system health metrics
 * 
 * @route GET /api/privacy-audit/status
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/shared/config/auth'
import { defaultPrivacyAuditor } from '@/shared/lib/privacy/audit-utils'

/**
 * GET /api/privacy-audit/status
 * Get privacy compliance status and system health
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

    // Get current privacy status
    const latestAudit = defaultPrivacyAuditor.getLatestAuditResult()
    
    const privacyStatus = {
      complianceLevel: latestAudit?.overallStatus || 'unknown',
      overallScore: latestAudit?.complianceScore || 0,
      activeViolations: latestAudit?.summary.violationChecks || 0,
      activeWarnings: latestAudit?.summary.warningChecks || 0,
      lastAuditTime: latestAudit?.auditedAt,
      constitutionalCompliant: latestAudit?.overallStatus === 'compliant',
      totalChecks: latestAudit?.summary.totalChecks || 0,
      passedChecks: latestAudit?.summary.passedChecks || 0
    }
    
    const systemHealth = {
      auditingEnabled: true,
      lastSystemCheck: new Date().toISOString(),
      auditHistoryCount: defaultPrivacyAuditor.getAuditHistory().length,
      nextScheduledAudit: latestAudit?.nextAuditDate
    }

    return NextResponse.json({
      success: true,
      data: {
        privacyStatus,
        systemHealth
      },
      message: 'Privacy status retrieved successfully'
    })

  } catch (error) {
    console.error('Failed to retrieve privacy status:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to retrieve privacy status',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}