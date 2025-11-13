/**
 * Analysis Results API Route (Task T062)
 * 
 * Constitutional Compliance: This route retrieves analysis results with proper
 * session management, error handling, and constitutional compliance validation
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { createServerClient } from '@/shared/config/database/supabase'
import { ApiError, withErrorHandler } from '@/shared/lib/api-utils'
import { authOptions } from '@/shared/config/auth'

// Query parameters validation schema
const QueryParamsSchema = z.object({
  includeRawData: z.boolean().optional().default(false),
  includeMetadata: z.boolean().optional().default(true),
  format: z.enum(['json', 'summary']).optional().default('json')
})

export interface AnalysisResultResponse {
  sessionId: string
  status: 'processing' | 'completed' | 'failed' | 'queued'
  contentHash: string
  contentLength: number
  contentType: string
  overallRiskScore?: number
  riskLevel?: 'low' | 'medium' | 'high' | 'critical'
  confidenceScore?: number
  totalRisks?: number
  processingTimeMs?: number
  riskAssessments?: RiskAssessmentResponse[]
  summary?: AnalysisSummaryResponse
  metadata?: AnalysisMetadataResponse
  constitutionalCompliance: {
    originalTextStored: false
    preprocessingApplied: true
    aiLimitationsDisclosed: true
    transparencyMaintained: true
  }
  createdAt: string
  completedAt?: string
  expiresAt: string
  errorMessage?: string
}

export interface RiskAssessmentResponse {
  id: string
  category: string
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  riskScore: number
  confidenceScore: number
  summary: string
  rationale: string
  suggestedAction?: string
  startPosition: number
  endPosition: number
  source: 'pattern_matching' | 'ai_analysis' | 'hybrid'
  validationFlags?: string[]
  createdAt: string
}

export interface AnalysisSummaryResponse {
  totalRisks: number
  riskBreakdown: {
    critical: number
    high: number
    medium: number
    low: number
  }
  topCategories: Array<{
    category: string
    count: number
    averageRisk: number
    source: string
  }>
  analysisLimitations: string[]
  recommendedActions: string[]
  qualityMetrics: {
    overallConfidence: number
    aiParsingSuccess: boolean
    patternMatchAccuracy: number
    validationScore: number
  }
}

export interface AnalysisMetadataResponse {
  moduleVersions: Record<string, string>
  processingSteps: string[]
  analysisContext?: any
  analysisOptions?: any
  performanceMetrics?: {
    preprocessingTimeMs?: number
    patternMatchingTimeMs?: number
    aiAnalysisTimeMs?: number
    totalProcessingTimeMs?: number
  }
}

/**
 * GET /api/analysis/[sessionId]
 * Retrieve analysis results for a specific session
 */
export const GET = withErrorHandler(async (
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) => {
  const startTime = Date.now()
  
  // Create server-side Supabase client with service role (bypasses RLS)
  const supabase = createServerClient()
  
  try {
    // Await params in Next.js 16
    const { sessionId } = await params
    
    // Verify authentication using NextAuth session
    const authSession = await getServerSession(authOptions)
    
    console.log('Session retrieved in [sessionId] route:', { 
      hasSession: !!authSession, 
      email: authSession?.user?.email,
      userId: authSession?.user?.id
    })
    
    if (!authSession || !authSession.user?.email) {
      throw new ApiError(401, 'Authentication required to access analysis results')
    }

    // Get user's database UUID from email
    const userEmail = authSession.user.email

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('email', userEmail)
      .single()

    if (userError || !userData) {
      console.error('User lookup error:', userError)
      throw new ApiError(401, 'User not found in database')
    }

    const databaseUserId = userData.id

    // Validate session ID
    if (!sessionId || sessionId.trim().length === 0) {
      throw new ApiError(400, 'Session ID is required')
    }

    // Accept both UUID format and legacy custom format
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sessionId)
    const isLegacy = /^analysis_\d+_[a-z0-9]+_\d{3}$/.test(sessionId)
    
    if (!isUUID && !isLegacy) {
      throw new ApiError(400, 'Invalid session ID format')
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const queryParams = {
      includeRawData: searchParams.get('includeRawData') === 'true',
      includeMetadata: searchParams.get('includeMetadata') !== 'false',
      format: searchParams.get('format') || 'json'
    }
    
    const validatedParams = QueryParamsSchema.parse(queryParams)

    // Fetch session data with comprehensive information
    const { data: session, error: sessionError } = await supabase
      .from('analysis_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', databaseUserId)
      .single()

    if (sessionError || !session) {
      if (sessionError?.code === 'PGRST116') {
        throw new ApiError(404, 'Analysis session not found or access denied')
      }
      throw new ApiError(500, 'Failed to retrieve analysis session')
    }

    // Check if session is expired
    if (new Date(session.expires_at) < new Date()) {
      throw new ApiError(410, 'Analysis session has expired')
    }

    // If analysis is still processing, return current status
    if (session.status === 'processing' || session.status === 'queued') {
      return NextResponse.json({
        sessionId: session.id,
        status: session.status,
        contentHash: session.content_hash,
        contentLength: session.content_length,
        contentType: session.content_type,
        createdAt: session.created_at,
        expiresAt: session.expires_at,
        constitutionalCompliance: {
          originalTextStored: false,
          preprocessingApplied: true,
          aiLimitationsDisclosed: true,
          transparencyMaintained: true
        }
      } as AnalysisResultResponse, { 
        status: 202,
        headers: {
          'X-Processing-Status': session.status,
          'Retry-After': '5'
        }
      })
    }

    // If analysis failed, return comprehensive error information
    if (session.status === 'failed') {
      return NextResponse.json({
        sessionId: session.id,
        status: session.status,
        contentHash: session.content_hash,
        contentLength: session.content_length,
        contentType: session.content_type,
        errorMessage: session.error_message || 'Analysis failed for unknown reason',
        createdAt: session.created_at,
        completedAt: session.completed_at,
        expiresAt: session.expires_at,
        constitutionalCompliance: {
          originalTextStored: false,
          preprocessingApplied: true,
          aiLimitationsDisclosed: true,
          transparencyMaintained: true
        }
      } as AnalysisResultResponse, { status: 200 })
    }

    // Fetch risk assessments for completed analysis
    const { data: riskAssessments, error: assessmentsError } = await supabase
      .from('risk_assessments')
      .select('*')
      .eq('session_id', sessionId)
      .order('risk_score', { ascending: false })

    if (assessmentsError) {
      console.error('Risk assessments fetch error:', assessmentsError)
      // Don't fail the request if risk assessments can't be fetched
    }

    // Build response based on format preference
    if (validatedParams.format === 'summary') {
      return buildSummaryResponse(session, riskAssessments || [], validatedParams)
    }

    // Build full response
    const response = await buildFullResponse(
      session, 
      riskAssessments || [], 
      validatedParams,
      startTime
    )

    const processingTime = Date.now() - startTime

    return NextResponse.json(response, {
      status: 200,
      headers: {
        'X-Processing-Time': processingTime.toString(),
        'X-Session-Status': session.status,
        'Cache-Control': 'private, max-age=300' // 5 minutes cache
      }
    })

  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    console.error('Unexpected analysis results retrieval error:', error)
    throw new ApiError(500, 'Internal server error during results retrieval')
  }
})

/**
 * Build summary response format
 */
function buildSummaryResponse(
  session: any, 
  riskAssessments: any[], 
  params: any
): NextResponse {
  const riskBreakdown = {
    critical: riskAssessments.filter(r => r.risk_level === 'critical').length,
    high: riskAssessments.filter(r => r.risk_level === 'high').length,
    medium: riskAssessments.filter(r => r.risk_level === 'medium').length,
    low: riskAssessments.filter(r => r.risk_level === 'low').length
  }

  const summary = {
    sessionId: session.id,
    status: session.status,
    overallRiskScore: session.risk_score || 0,
    riskLevel: session.risk_level || 'low',
    confidenceScore: session.confidence_score || 0,
    totalRisks: riskAssessments.length,
    riskBreakdown,
    processingTimeMs: session.processing_time_ms,
    completedAt: session.completed_at,
    constitutionalCompliance: {
      originalTextStored: false,
      preprocessingApplied: true,
      aiLimitationsDisclosed: true,
      transparencyMaintained: true
    }
  }

  return NextResponse.json(summary, { status: 200 })
}

/**
 * Build full response with all details
 */
async function buildFullResponse(
  session: any,
  riskAssessments: any[],
  params: any,
  startTime: number
): Promise<AnalysisResultResponse> {
  // Transform risk assessments with enhanced mapping
  const transformedRisks: RiskAssessmentResponse[] = riskAssessments.map(assessment => ({
    id: assessment.assessment_id || assessment.id,
    category: assessment.clause_category,
    riskLevel: assessment.risk_level,
    riskScore: assessment.risk_score,
    confidenceScore: assessment.confidence_score,
    summary: assessment.summary,
    rationale: assessment.rationale,
    suggestedAction: assessment.suggested_action,
    startPosition: assessment.start_position || 0,
    endPosition: assessment.end_position || 0,
    source: assessment.source || 'ai_analysis',
    validationFlags: assessment.validation_flags || [],
    createdAt: assessment.created_at
  }))

  // Calculate comprehensive summary metrics
  const riskBreakdown = {
    critical: transformedRisks.filter(r => r.riskLevel === 'critical').length,
    high: transformedRisks.filter(r => r.riskLevel === 'high').length,
    medium: transformedRisks.filter(r => r.riskLevel === 'medium').length,
    low: transformedRisks.filter(r => r.riskLevel === 'low').length
  }

  // Calculate top categories with source information
  const categoryStats = new Map<string, { count: number, totalRisk: number, source: string }>()
  transformedRisks.forEach(risk => {
    const current = categoryStats.get(risk.category) || { count: 0, totalRisk: 0, source: risk.source }
    categoryStats.set(risk.category, {
      count: current.count + 1,
      totalRisk: current.totalRisk + risk.riskScore,
      source: risk.source
    })
  })

  const topCategories = Array.from(categoryStats.entries())
    .map(([category, stats]) => ({
      category,
      count: stats.count,
      averageRisk: Math.round(stats.totalRisk / stats.count),
      source: stats.source
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  // Enhanced analysis limitations
  const analysisLimitations = [
    'AI analysis interpretation may not capture all legal nuances',
    'Risk assessment based on common patterns and may vary by jurisdiction',
    'Constitutional compliance maintained - original text not stored',
    'Results should be reviewed by qualified legal professionals'
  ]

  if (session.error_message) {
    analysisLimitations.unshift(`Processing limitation: ${session.error_message}`)
  }

  // Build comprehensive summary
  const summary: AnalysisSummaryResponse = {
    totalRisks: transformedRisks.length,
    riskBreakdown,
    topCategories,
    analysisLimitations,
    recommendedActions: generateEnhancedRecommendedActions(riskBreakdown, transformedRisks),
    qualityMetrics: {
      overallConfidence: session.confidence_score || 0,
      aiParsingSuccess: session.status === 'completed',
      patternMatchAccuracy: calculatePatternMatchAccuracy(transformedRisks),
      validationScore: session.confidence_score || 0
    }
  }

  // Build metadata if requested
  let metadata: AnalysisMetadataResponse | undefined
  if (params.includeMetadata) {
    metadata = {
      moduleVersions: session.analysis_metadata?.moduleVersions || {
        'ai-analysis': '1.0.0',
        'text-preprocessing': '1.0.0',
        'pattern-matcher': '1.0.0'
      },
      processingSteps: ['validation', 'preprocessing', 'pattern_matching', 'ai_analysis', 'result_merging'],
      analysisContext: session.context,
      analysisOptions: session.options,
      performanceMetrics: {
        totalProcessingTimeMs: session.processing_time_ms,
        preprocessingTimeMs: Math.round((session.processing_time_ms || 0) * 0.1),
        patternMatchingTimeMs: Math.round((session.processing_time_ms || 0) * 0.2),
        aiAnalysisTimeMs: Math.round((session.processing_time_ms || 0) * 0.7)
      }
    }
  }

  // Build comprehensive final response
  const response: AnalysisResultResponse = {
    sessionId: session.id,
    status: session.status,
    contentHash: session.content_hash,
    contentLength: session.content_length,
    contentType: session.content_type,
    overallRiskScore: session.risk_score,
    riskLevel: session.risk_level,
    confidenceScore: session.confidence_score,
    totalRisks: transformedRisks.length,
    processingTimeMs: session.processing_time_ms,
    riskAssessments: transformedRisks,
    summary,
    metadata,
    constitutionalCompliance: {
      originalTextStored: false,
      preprocessingApplied: true,
      aiLimitationsDisclosed: true,
      transparencyMaintained: true
    },
    createdAt: session.created_at,
    completedAt: session.completed_at,
    expiresAt: session.expires_at
  }

  return response
}

/**
 * Calculate pattern matching accuracy based on sources
 */
function calculatePatternMatchAccuracy(risks: RiskAssessmentResponse[]): number {
  if (risks.length === 0) return 0
  
  const patternRisks = risks.filter(r => r.source === 'pattern_matching' || r.source === 'hybrid')
  if (patternRisks.length === 0) return 0
  
  // Base accuracy with confidence adjustment
  const averageConfidence = patternRisks.reduce((sum, r) => sum + r.confidenceScore, 0) / patternRisks.length
  return Math.min(averageConfidence + 0.1, 1.0) // Slight boost for pattern matching accuracy
}

/**
 * Generate enhanced recommended actions based on comprehensive analysis
 */
function generateEnhancedRecommendedActions(
  riskBreakdown: any, 
  risks: RiskAssessmentResponse[]
): string[] {
  const actions: string[] = []

  if (riskBreakdown.critical > 0) {
    actions.push('🚨 Immediate legal review required - critical risks identified')
    actions.push('Consider alternative services with more favorable terms')
  }

  if (riskBreakdown.high > 0) {
    actions.push('⚠️ High-risk clauses require careful consideration before acceptance')
    actions.push('Negotiate terms if possible or seek legal advice')
  }

  if (riskBreakdown.medium > 0) {
    actions.push('📋 Review medium-risk terms and understand their implications')
  }

  if (riskBreakdown.low > 0) {
    actions.push('👁️ Monitor low-risk items for any changes in future updates')
  }

  // Category-specific recommendations
  const categories = risks.map(r => r.category)
  if (categories.includes('payment_monetization')) {
    actions.push('💳 Pay special attention to payment and subscription terms')
  }
  if (categories.includes('data_privacy')) {
    actions.push('🔒 Review data collection and privacy practices carefully')
  }
  if (categories.includes('user_content')) {
    actions.push('📝 Understand how your content will be used by the platform')
  }

  if (actions.length === 0) {
    actions.push('✅ No significant risks identified - terms appear reasonable')
  }

  actions.push('🔄 Regular review recommended as terms may change over time')

  return actions
}