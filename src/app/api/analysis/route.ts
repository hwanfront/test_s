import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { z } from 'zod'
import { AnalysisService } from '@/features/ai-analysis'
import { preprocessText } from '@/features/text-preprocessing'
import { hashContent } from '@/features/text-preprocessing'
import { supabase } from '@/shared/config/database/supabase'
import { ApiError, withErrorHandler } from '@/shared/lib/api-utils'
import { validateInput } from '@/shared/lib/validation'

// Request validation schema
const AnalysisRequestSchema = z.object({
  content: z.string()
    .min(100, 'Content must be at least 100 characters')
    .max(50000, 'Content must be less than 50,000 characters'),
  contentType: z.enum(['terms-and-conditions', 'privacy-policy', 'user-agreement', 'eula']).optional(),
  skipCache: z.boolean().optional().default(false)
})

/**
 * POST /api/analysis
 * Create a new analysis session for the provided content
 */
export const POST = withErrorHandler(async (request: NextRequest) => {
  // Verify authentication
  const token = await getToken({ req: request })
  if (!token || !token.userId) {
    throw new ApiError(401, 'Unauthorized')
  }

  // Parse and validate request body
  const body = await request.json()
  const validatedData = validateInput(AnalysisRequestSchema, body)

  try {
    // Preprocess the content
    const preprocessed = await preprocessText(validatedData.content)
    
    // Check for existing analysis (cache)
    let existingSession = null
    if (!validatedData.skipCache) {
      const { data: existing } = await supabase
        .from('analysis_sessions')
        .select('*')
        .eq('content_hash', preprocessed.contentHash)
        .eq('user_id', token.userId)
        .eq('status', 'completed')
        .gte('expires_at', new Date().toISOString())
        .single()
      
      existingSession = existing
    }

    if (existingSession) {
      // Return existing session
      return NextResponse.json({
        sessionId: existingSession.id,
        status: existingSession.status,
        contentLength: existingSession.content_length,
        createdAt: existingSession.created_at,
        expiresAt: existingSession.expires_at,
        cached: true
      }, { status: 200 })
    }

    // Create new analysis session
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
    const estimatedTimeMs = Math.min(preprocessed.contentLength * 0.1 + 5000, 30000) // Estimate based on content length

    // Insert session into database
    const { error: insertError } = await supabase
      .from('analysis_sessions')
      .insert({
        id: sessionId,
        user_id: token.userId,
        content_hash: preprocessed.contentHash,
        content_length: preprocessed.contentLength,
        content_type: validatedData.contentType || 'terms-and-conditions',
        status: 'processing',
        created_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString()
      })

    if (insertError) {
      throw new ApiError(500, 'Failed to create analysis session')
    }

    // Start async analysis process
    startAnalysisProcess(sessionId, preprocessed, token.userId as string, validatedData.contentType)
      .catch(error => {
        console.error(`Analysis failed for session ${sessionId}:`, error)
        // Update session status to failed
        supabase
          .from('analysis_sessions')
          .update({ 
            status: 'failed',
            error_message: error.message,
            completed_at: new Date().toISOString()
          })
          .eq('id', sessionId)
          .then()
      })

    // Return session details
    return NextResponse.json({
      sessionId,
      status: 'processing',
      estimatedTimeMs,
      contentLength: preprocessed.contentLength,
      createdAt: new Date().toISOString(),
      expiresAt: expiresAt.toISOString()
    }, { status: 201 })

  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    throw new ApiError(500, 'Internal server error during analysis creation')
  }
})

/**
 * Start the async analysis process
 */
async function startAnalysisProcess(
  sessionId: string, 
  preprocessed: any, 
  userId: string,
  contentType?: string
): Promise<void> {
  try {
    // Initialize analysis service
    const analysisService = new AnalysisService()

    // Perform the analysis
    const analysisInput = {
      contentHash: preprocessed.contentHash,
      content: preprocessed.text,
      contentLength: preprocessed.contentLength,
      contentType: contentType || 'terms-and-conditions'
    }

    const analysisResult = await analysisService.analyzeTerms(analysisInput)

    // Calculate session-level metrics
    const sessionRiskScore = analysisResult.overallRiskScore
    const sessionRiskLevel = analysisResult.riskLevel
    const sessionConfidenceScore = analysisResult.confidenceScore

    // Update session status
    const { error: updateError } = await supabase
      .from('analysis_sessions')
      .update({
        status: 'completed',
        risk_score: sessionRiskScore,
        risk_level: sessionRiskLevel,
        confidence_score: sessionConfidenceScore,
        processing_time_ms: analysisResult.processingTimeMs,
        completed_at: new Date().toISOString()
      })
      .eq('id', sessionId)

    if (updateError) {
      throw new Error(`Failed to update session: ${updateError.message}`)
    }

    // Insert risk assessments
    if (analysisResult.riskAssessments.length > 0) {
      const riskAssessments = analysisResult.riskAssessments.map(assessment => ({
        session_id: sessionId,
        clause_category: assessment.category,
        risk_level: assessment.riskLevel,
        risk_score: assessment.riskScore,
        confidence_score: assessment.confidenceScore,
        summary: assessment.summary,
        rationale: assessment.rationale,
        suggested_action: assessment.suggestedAction,
        start_position: assessment.startPosition,
        end_position: assessment.endPosition,
        created_at: new Date().toISOString()
      }))

      const { error: assessmentsError } = await supabase
        .from('risk_assessments')
        .insert(riskAssessments)

      if (assessmentsError) {
        throw new Error(`Failed to insert risk assessments: ${assessmentsError.message}`)
      }
    }

    console.log(`Analysis completed for session ${sessionId}`)

  } catch (error) {
    console.error(`Analysis process failed for session ${sessionId}:`, error)
    
    // Update session to failed status
    await supabase
      .from('analysis_sessions')
      .update({
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error',
        completed_at: new Date().toISOString()
      })
      .eq('id', sessionId)

    throw error
  }
}