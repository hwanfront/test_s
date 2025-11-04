import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { supabase } from '@/shared/config/database/supabase'
import { ApiError, withErrorHandler } from '@/shared/lib/api-utils'

/**
 * GET /api/analysis/[sessionId]
 * Retrieve analysis results for a specific session
 */
export const GET = withErrorHandler(async (
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) => {
  // Verify authentication
  const token = await getToken({ req: request })
  if (!token || !token.userId) {
    throw new ApiError(401, 'Unauthorized')
  }

  const { sessionId } = params

  if (!sessionId) {
    throw new ApiError(400, 'Session ID is required')
  }

  try {
    // Fetch session details
    const { data: session, error: sessionError } = await supabase
      .from('analysis_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', token.userId) // Ensure user owns this session
      .single()

    if (sessionError || !session) {
      throw new ApiError(404, 'Analysis session not found')
    }

    // Check if session has expired
    if (new Date(session.expires_at) < new Date()) {
      throw new ApiError(410, 'Analysis session has expired')
    }

    // If session is still processing, return processing status
    if (session.status === 'processing') {
      return NextResponse.json({
        session: {
          id: session.id,
          contentLength: session.content_length,
          status: session.status,
          createdAt: session.created_at,
          expiresAt: session.expires_at
        },
        riskAssessments: []
      })
    }

    // If session failed, return error
    if (session.status === 'failed') {
      return NextResponse.json({
        session: {
          id: session.id,
          contentLength: session.content_length,
          status: session.status,
          error: session.error_message,
          createdAt: session.created_at,
          completedAt: session.completed_at,
          expiresAt: session.expires_at
        },
        riskAssessments: []
      })
    }

    // Fetch risk assessments for completed sessions
    const { data: riskAssessments, error: assessmentsError } = await supabase
      .from('risk_assessments')
      .select('*')
      .eq('session_id', sessionId)
      .order('risk_score', { ascending: false })

    if (assessmentsError) {
      throw new ApiError(500, 'Failed to fetch risk assessments')
    }

    // Transform risk assessments to match API format
    const transformedAssessments = (riskAssessments || []).map(assessment => ({
      id: assessment.id,
      clauseCategory: assessment.clause_category,
      riskLevel: assessment.risk_level,
      riskScore: assessment.risk_score,
      confidenceScore: assessment.confidence_score,
      summary: assessment.summary,
      rationale: assessment.rationale,
      suggestedAction: assessment.suggested_action,
      startPosition: assessment.start_position,
      endPosition: assessment.end_position,
      createdAt: assessment.created_at
    }))

    // Calculate summary statistics
    const summary = calculateSummary(transformedAssessments)

    // Return complete analysis result
    return NextResponse.json({
      session: {
        id: session.id,
        contentLength: session.content_length,
        status: session.status,
        riskScore: session.risk_score,
        riskLevel: session.risk_level,
        confidenceScore: session.confidence_score,
        processingTimeMs: session.processing_time_ms,
        createdAt: session.created_at,
        completedAt: session.completed_at,
        expiresAt: session.expires_at
      },
      riskAssessments: transformedAssessments,
      summary
    })

  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    throw new ApiError(500, 'Internal server error during analysis retrieval')
  }
})

/**
 * Calculate summary statistics from risk assessments
 */
function calculateSummary(assessments: any[]) {
  const totalRisks = assessments.length

  const riskBreakdown = {
    critical: assessments.filter(a => a.riskLevel === 'critical').length,
    high: assessments.filter(a => a.riskLevel === 'high').length,
    medium: assessments.filter(a => a.riskLevel === 'medium').length,
    low: assessments.filter(a => a.riskLevel === 'low').length
  }

  // Group by category
  const categoryMap = new Map<string, { count: number; totalRisk: number }>()
  assessments.forEach(assessment => {
    const existing = categoryMap.get(assessment.clauseCategory) || { count: 0, totalRisk: 0 }
    categoryMap.set(assessment.clauseCategory, {
      count: existing.count + 1,
      totalRisk: existing.totalRisk + assessment.riskScore
    })
  })

  const topCategories = Array.from(categoryMap.entries())
    .map(([category, data]) => ({
      category,
      count: data.count,
      averageRisk: Math.round(data.totalRisk / data.count)
    }))
    .sort((a, b) => b.averageRisk - a.averageRisk)
    .slice(0, 5)

  const analysisLimitations = [
    'Analysis based on AI interpretation and may not reflect all legal nuances',
    'Risk assessment focuses on common mobile gaming industry patterns',
    'Legal interpretation may vary by jurisdiction and specific circumstances'
  ]

  const recommendedActions = generateRecommendedActions(riskBreakdown)

  return {
    totalRisks,
    riskBreakdown,
    topCategories,
    analysisLimitations,
    recommendedActions
  }
}

/**
 * Generate recommended actions based on risk breakdown
 */
function generateRecommendedActions(riskBreakdown: any): string[] {
  const actions: string[] = []

  if (riskBreakdown.critical > 0) {
    actions.push('Consider alternative services with fairer terms')
    actions.push('Consult with legal counsel before accepting these terms')
  }

  if (riskBreakdown.high > 0) {
    actions.push('Review high-risk clauses carefully before agreeing')
    actions.push('Look for services with more transparent policies')
  }

  if (riskBreakdown.medium > 0) {
    actions.push('Be aware of medium-risk terms and their implications')
  }

  if (riskBreakdown.critical === 0 && riskBreakdown.high === 0) {
    actions.push('Terms appear relatively fair and reasonable')
  }

  return actions
}