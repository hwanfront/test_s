/**
 * Analysis API Route (Task T061)
 * 
 * Constitutional Compliance: This route handles analysis submissions with proper validation,
 * error handling, and constitutional compliance while maintaining strict module isolation
 */

import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { z } from 'zod'
import { AnalysisService, type AnalysisInput, type AnalysisContext, type AnalysisOptions } from '@/features/ai-analysis'
import { TextPreprocessor } from '@/features/text-preprocessing'
import { supabase } from '@/shared/config/database/supabase'
import { ApiError, withErrorHandler } from '@/shared/lib/api-utils'
import { validateInput } from '@/shared/lib/validation'

// Enhanced request validation schema with constitutional compliance
const AnalysisRequestSchema = z.object({
  content: z.string()
    .min(100, 'Content must be at least 100 characters for meaningful analysis')
    .max(1000000, 'Content exceeds maximum length limit (1MB)')
    .refine(text => text.trim().length > 0, 'Content cannot be empty or only whitespace'),
  
  contentType: z.enum([
    'terms-and-conditions', 
    'privacy-policy', 
    'user-agreement', 
    'eula',
    'mobile-app-terms',
    'gaming-terms',
    'subscription-terms'
  ]).optional().default('terms-and-conditions'),
  
  context: z.object({
    documentType: z.string().optional(),
    industry: z.enum(['gaming', 'mobile-apps', 'saas', 'e-commerce', 'fintech', 'healthcare', 'other']).optional(),
    jurisdiction: z.enum(['us', 'eu', 'uk', 'canada', 'australia', 'global']).optional(),
    userRole: z.enum(['consumer', 'business', 'developer', 'legal-professional']).optional(),
    analysisDepth: z.enum(['basic', 'comprehensive', 'detailed']).optional().default('comprehensive'),
    focusAreas: z.array(z.string()).optional(),
    customInstructions: z.string().max(1000, 'Custom instructions must be under 1000 characters').optional()
  }).optional(),
  
  options: z.object({
    enablePatternMatching: z.boolean().optional().default(true),
    enableAIAnalysis: z.boolean().optional().default(true),
    strictValidation: z.boolean().optional().default(false),
    includeRawResponse: z.boolean().optional().default(false),
    maxRetries: z.number().min(1).max(5).optional().default(3),
    templateId: z.string().optional()
  }).optional(),
  
  skipCache: z.boolean().optional().default(false),
  priority: z.enum(['low', 'normal', 'high']).optional().default('normal')
})

export interface AnalysisSessionResponse {
  sessionId: string
  status: 'processing' | 'completed' | 'failed' | 'queued'
  estimatedTimeMs?: number
  contentLength: number
  contentHash: string
  createdAt: string
  expiresAt: string
  cached?: boolean
  priority: string
  constitutionalCompliance: {
    originalTextStored: false
    preprocessingApplied: true
    aiLimitationsDisclosed: true
    transparencyMaintained: true
  }
}

/**
 * POST /api/analysis
 * Create a new analysis session for the provided content
 */
export const POST = withErrorHandler(async (request: NextRequest) => {
  const startTime = Date.now()
  
  try {
    // Verify authentication
    const token = await getToken({ req: request })
    if (!token || !token.userId) {
      throw new ApiError(401, 'Authentication required for analysis submission')
    }

    // Check rate limiting
    await checkRateLimit(token.userId as string)

    // Parse and validate request body
    const body = await request.json()
    const validatedData = validateInput(AnalysisRequestSchema, body)

    // Initialize text preprocessor for constitutional compliance
    const preprocessor = new TextPreprocessor()
    const preprocessed = await preprocessor.preprocess(validatedData.content)

    // Validate preprocessed content
    if (!preprocessed.content || preprocessed.content.trim().length < 50) {
      throw new ApiError(400, 'Content too short after preprocessing for meaningful analysis')
    }

    // Check for existing analysis (intelligent caching)
    let existingSession = null
    if (!validatedData.skipCache) {
      existingSession = await findExistingAnalysis(
        preprocessed.contentHash,
        token.userId as string,
        validatedData.context,
        validatedData.options
      )
    }

    if (existingSession) {
      return NextResponse.json({
        sessionId: existingSession.id,
        status: existingSession.status,
        contentLength: existingSession.content_length,
        contentHash: existingSession.content_hash,
        createdAt: existingSession.created_at,
        expiresAt: existingSession.expires_at,
        cached: true,
        priority: existingSession.priority || 'normal',
        constitutionalCompliance: {
          originalTextStored: false,
          preprocessingApplied: true,
          aiLimitationsDisclosed: true,
          transparencyMaintained: true
        }
      } as AnalysisSessionResponse, { status: 200 })
    }

    // Generate unique session ID
    const sessionId = generateSessionId()
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

    // Calculate estimated processing time
    const estimatedTimeMs = calculateEstimatedTime(
      preprocessed.contentLength,
      validatedData.options?.enableAIAnalysis !== false,
      validatedData.context?.analysisDepth || 'comprehensive'
    )

    // Create session record with constitutional compliance metadata
    const sessionData = {
      id: sessionId,
      user_id: token.userId as string,
      content_hash: preprocessed.contentHash,
      content_length: preprocessed.contentLength,
      content_type: validatedData.contentType,
      status: 'queued' as const,
      priority: validatedData.priority || 'normal',
      context: validatedData.context || {},
      options: validatedData.options || {},
      estimated_time_ms: estimatedTimeMs,
      created_at: new Date().toISOString(),
      expires_at: expiresAt.toISOString(),
      constitutional_compliance: {
        original_text_stored: false,
        preprocessing_applied: true,
        ai_limitations_disclosed: true,
        transparency_maintained: true
      }
    }

    // Insert session into database
    const { error: insertError } = await supabase
      .from('analysis_sessions')
      .insert(sessionData)

    if (insertError) {
      console.error('Database insert error:', insertError)
      throw new ApiError(500, 'Failed to create analysis session')
    }

    // Queue analysis process based on priority
    queueAnalysisProcess(sessionId, preprocessed, validatedData, token.userId as string)
      .catch(error => {
        console.error(`Analysis queueing failed for session ${sessionId}:`, error)
        updateSessionStatus(sessionId, 'failed', error.message)
      })

    // Return session details
    const response: AnalysisSessionResponse = {
      sessionId,
      status: 'queued',
      estimatedTimeMs,
      contentLength: preprocessed.contentLength,
      contentHash: preprocessed.contentHash,
      createdAt: new Date().toISOString(),
      expiresAt: expiresAt.toISOString(),
      priority: validatedData.priority || 'normal',
      constitutionalCompliance: {
        originalTextStored: false,
        preprocessingApplied: true,
        aiLimitationsDisclosed: true,
        transparencyMaintained: true
      }
    }

    const processingTime = Date.now() - startTime
    
    return NextResponse.json(response, { 
      status: 201,
      headers: {
        'X-Processing-Time': processingTime.toString(),
        'X-Content-Hash': preprocessed.contentHash
      }
    })

  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    console.error('Unexpected analysis creation error:', error)
    throw new ApiError(500, 'Internal server error during analysis creation')
  }
})

/**
 * Check rate limiting for the user
 */
async function checkRateLimit(userId: string): Promise<void> {
  const oneHour = new Date(Date.now() - 60 * 60 * 1000)
  
  const { count, error } = await supabase
    .from('analysis_sessions')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .gte('created_at', oneHour.toISOString())

  if (error) {
    console.error('Rate limit check error:', error)
    // Don't block on rate limit check errors
    return
  }

  if (count && count >= 20) { // 20 analyses per hour
    throw new ApiError(429, 'Rate limit exceeded. Please wait before submitting another analysis.')
  }
}

/**
 * Find existing analysis with intelligent matching
 */
async function findExistingAnalysis(
  contentHash: string, 
  userId: string, 
  context?: any, 
  options?: any
): Promise<any> {
  const { data: existing } = await supabase
    .from('analysis_sessions')
    .select('*')
    .eq('content_hash', contentHash)
    .eq('user_id', userId)
    .in('status', ['completed', 'processing'])
    .gte('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  return existing
}

/**
 * Generate unique session ID
 */
function generateSessionId(): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 9)
  const suffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
  return `analysis_${timestamp}_${random}_${suffix}`
}

/**
 * Calculate estimated processing time
 */
function calculateEstimatedTime(
  contentLength: number,
  enableAI: boolean,
  analysisDepth: string
): number {
  const baseTime = 2000 // 2 seconds base
  const contentTime = Math.min(contentLength * 0.05, 15000) // Max 15 seconds for content
  const aiTime = enableAI ? 8000 : 2000 // 8 seconds for AI, 2 for pattern only
  const depthMultiplier = {
    'basic': 0.7,
    'comprehensive': 1.0,
    'detailed': 1.5
  }[analysisDepth] || 1.0

  return Math.round((baseTime + contentTime + aiTime) * depthMultiplier)
}

/**
 * Queue analysis process with priority handling
 */
async function queueAnalysisProcess(
  sessionId: string,
  preprocessed: any,
  requestData: any,
  userId: string
): Promise<void> {
  // Update session to processing status
  await updateSessionStatus(sessionId, 'processing')

  // Start analysis with slight delay to prevent overwhelming the system
  const delay = requestData.priority === 'high' ? 100 : requestData.priority === 'low' ? 1000 : 500
  
  setTimeout(() => {
    startAnalysisProcess(sessionId, preprocessed, requestData, userId)
      .catch(error => {
        console.error(`Analysis failed for session ${sessionId}:`, error)
        updateSessionStatus(sessionId, 'failed', error.message)
      })
  }, delay)
}

/**
 * Start the comprehensive analysis process
 */
async function startAnalysisProcess(
  sessionId: string,
  preprocessed: any,
  requestData: any,
  userId: string
): Promise<void> {
  const startTime = Date.now()

  try {
    // Initialize analysis service
    const analysisService = new AnalysisService()

    // Prepare analysis input with constitutional compliance
    const analysisInput: AnalysisInput = {
      contentHash: preprocessed.contentHash,
      content: preprocessed.content, // Use processed text (constitutional compliance)
      contentLength: preprocessed.contentLength,
      contentType: requestData.contentType,
      context: {
        ...requestData.context,
        sessionId
      } as AnalysisContext,
      options: requestData.options as AnalysisOptions
    }

    // Perform the analysis
    const analysisResult = await analysisService.analyzeTerms(analysisInput)

    // Update session with results
    const { error: updateError } = await supabase
      .from('analysis_sessions')
      .update({
        status: 'completed',
        risk_score: analysisResult.overallRiskScore,
        risk_level: analysisResult.riskLevel,
        confidence_score: analysisResult.confidenceScore,
        processing_time_ms: analysisResult.processingTimeMs,
        total_risks: analysisResult.summary.totalRisks,
        analysis_metadata: analysisResult.metadata,
        completed_at: new Date().toISOString()
      })
      .eq('id', sessionId)

    if (updateError) {
      throw new Error(`Failed to update session: ${updateError.message}`)
    }

    // Insert risk assessments
    if (analysisResult.riskAssessments.length > 0) {
      const riskAssessments = analysisResult.riskAssessments.map((assessment: any) => ({
        session_id: sessionId,
        assessment_id: assessment.id || `risk_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        clause_category: assessment.category,
        risk_level: assessment.riskLevel,
        risk_score: assessment.riskScore,
        confidence_score: assessment.confidenceScore,
        summary: assessment.summary,
        rationale: assessment.rationale,
        suggested_action: assessment.suggestedAction || null,
        start_position: assessment.startPosition,
        end_position: assessment.endPosition,
        source: assessment.source,
        validation_flags: assessment.validationFlags || [],
        created_at: new Date().toISOString()
      }))

      const { error: assessmentsError } = await supabase
        .from('risk_assessments')
        .insert(riskAssessments)

      if (assessmentsError) {
        console.error('Risk assessments insert error:', assessmentsError)
        // Don't fail the whole process for assessment insertion errors
      }
    }

    const totalProcessingTime = Date.now() - startTime
    console.log(`Analysis completed for session ${sessionId} in ${totalProcessingTime}ms`)

  } catch (error) {
    console.error(`Analysis process failed for session ${sessionId}:`, error)
    throw error
  }
}

/**
 * Update session status
 */
async function updateSessionStatus(
  sessionId: string, 
  status: 'processing' | 'completed' | 'failed', 
  errorMessage?: string
): Promise<void> {
  const updateData: any = {
    status,
    updated_at: new Date().toISOString()
  }

  if (status === 'failed' && errorMessage) {
    updateData.error_message = errorMessage
    updateData.completed_at = new Date().toISOString()
  }

  await supabase
    .from('analysis_sessions')
    .update(updateData)
    .eq('id', sessionId)
}