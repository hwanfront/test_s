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
import { createServerClient } from '@/shared/config/database/supabase'
import { ApiError, withErrorHandler } from '@/shared/lib/api-utils'
import { validateInput } from '@/shared/lib/validation'
import { QuotaEnforcer, QUOTA_CONFIG } from '@/entities/quota/lib/quota-calculator'

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
  
  // Create server-side Supabase client with service role (bypasses RLS)
  const supabase = createServerClient()
  
  try {
    // Verify authentication
    const token = await getToken({ 
      req: request,
      secret: process.env.NEXTAUTH_SECRET 
    })
    
    console.log('Token retrieved:', { 
      hasToken: !!token, 
      email: token?.email,
      userId: token?.userId,
      sub: token?.sub,
      tokenKeys: token ? Object.keys(token) : []
    })
    
    if (!token || !token.email) {
      throw new ApiError(401, 'Authentication required for analysis submission')
    }

    // Get user's database UUID from email
    const userEmail = token.email as string

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

    // Check quota limits before processing
    await checkQuotaLimits(supabase, databaseUserId)

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
        supabase,
        preprocessed.contentHash,
        databaseUserId,
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

    // Set session expiration time (7 days)
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

    // Calculate estimated processing time
    const estimatedTimeMs = calculateEstimatedTime(
      preprocessed.contentLength,
      validatedData.options?.enableAIAnalysis !== false,
      validatedData.context?.analysisDepth || 'comprehensive'
    )

    // Create session record with only schema-compliant fields (id auto-generated by database)
    const sessionData = {
      user_id: databaseUserId,
      content_hash: preprocessed.contentHash,
      content_length: preprocessed.contentLength,
      status: 'processing' as const,
      created_at: new Date().toISOString(),
      expires_at: expiresAt.toISOString()
    }

    // Insert session into database and get generated ID
    const { data: insertedSession, error: insertError } = await supabase
      .from('analysis_sessions')
      .insert(sessionData)
      .select('id')
      .single()

    if (insertError || !insertedSession) {
      console.error('Database insert error:', insertError)
      throw new ApiError(500, 'Failed to create analysis session')
    }

    const sessionId = insertedSession.id

    // Queue analysis process based on priority
    queueAnalysisProcess(supabase, sessionId, preprocessed, validatedData, databaseUserId)
      .catch(error => {
        console.error(`Analysis queueing failed for session ${sessionId}:`, error)
        updateSessionStatus(supabase, sessionId, 'failed', error.message)
      })

    // Return session details
    const response: AnalysisSessionResponse = {
      sessionId,
      status: 'processing',
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
 * Record quota usage after successful analysis
 */
async function recordQuotaUsage(supabase: any, userId: string, sessionId: string): Promise<void> {
  try {
    // Get current quota record
    const getCurrentRecord = async (userId: string, date: string) => {
      const { data, error } = await supabase
        .from('daily_quotas')
        .select('*')
        .eq('user_id', userId)
        .eq('date', date)
        .single()

      if (error && error.code !== 'PGRST116') { // Not found error is OK
        console.error('Get current record error:', error)
        return null
      }

      return data
    }

    // Update quota record
    const updateQuotaRecord = async (record: any) => {
      const { error } = await supabase
        .from('daily_quotas')
        .upsert(record, { onConflict: 'user_id,date' })

      if (error) {
        console.error('Update quota record error:', error)
        throw new Error(`Failed to update quota: ${error.message}`)
      }
    }

    // Use QuotaEnforcer to record usage
    const usageResult = await QuotaEnforcer.recordUsage(
      userId,
      updateQuotaRecord,
      getCurrentRecord
    )

    if (!usageResult.success) {
      console.error(`Failed to record quota usage for session ${sessionId}:`, usageResult.error)
      // Don't fail the analysis for quota recording issues
    } else {
      console.log(`Quota usage recorded for user ${userId}, session ${sessionId}`)
    }

  } catch (error) {
    console.error(`Quota recording error for user ${userId}, session ${sessionId}:`, error)
    // Don't fail the analysis for quota recording issues
  }
}

/**
 * Check quota limits using QuotaEnforcer
 */
async function checkQuotaLimits(supabase: any, userId: string): Promise<void> {
  // Get user's quota records
  const getQuotaRecords = async (userId: string) => {
    const { data, error } = await supabase
      .from('daily_quotas')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(30) // Last 30 days for analysis

    if (error) {
      console.error('Quota records fetch error:', error)
      return []
    }

    return data || []
  }

  // Use QuotaEnforcer to check limits
  const quotaCheck = await QuotaEnforcer.enforceQuota(
    userId,
    getQuotaRecords,
    QUOTA_CONFIG.DAILY_LIMIT
  )

  if (!quotaCheck.allowed) {
    throw new ApiError(
      429,
      `Daily quota limit exceeded. ${quotaCheck.quotaInfo.currentUsage}/${quotaCheck.quotaInfo.dailyLimit} analyses used. Resets at ${quotaCheck.quotaInfo.resetTime.toISOString()}`,
      'quota_exceeded'
    )
  }
}

/**
 * Find existing analysis with intelligent matching
 */
async function findExistingAnalysis(
  supabase: any,
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
  supabase: any,
  sessionId: string,
  preprocessed: any,
  requestData: any,
  userId: string
): Promise<void> {
  // Update session to processing status
  await updateSessionStatus(supabase, sessionId, 'processing')

  // Start analysis with slight delay to prevent overwhelming the system
  const delay = requestData.priority === 'high' ? 100 : requestData.priority === 'low' ? 1000 : 500
  
  setTimeout(() => {
    startAnalysisProcess(supabase, sessionId, preprocessed, requestData, userId)
      .catch(error => {
        console.error(`Analysis failed for session ${sessionId}:`, error)
        updateSessionStatus(supabase, sessionId, 'failed', error.message)
      })
  }, delay)
}

/**
 * Start the comprehensive analysis process
 */
async function startAnalysisProcess(
  supabase: any,
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

    // Debug log
    console.log('Analysis result:', {
      overallRiskScore: analysisResult.overallRiskScore,
      riskLevel: analysisResult.riskLevel,
      confidenceScore: analysisResult.confidenceScore,
      riskAssessmentsCount: analysisResult.riskAssessments.length
    })

    // Update session with results (only schema-compliant fields)
    const updateData = {
      status: 'completed' as const,
      risk_score: analysisResult.overallRiskScore,
      risk_level: analysisResult.riskLevel,
      confidence_score: analysisResult.confidenceScore,
      processing_time_ms: analysisResult.processingTimeMs,
      completed_at: new Date().toISOString()
    }
    
    console.log('Updating session with data:', updateData, 'for sessionId:', sessionId)
    
    const { data: updateResult, error: updateError } = await supabase
      .from('analysis_sessions')
      .update(updateData)
      .eq('id', sessionId)
      .select()

    console.log('Update result:', updateResult, 'Update error:', updateError)

    if (updateError) {
      throw new Error(`Failed to update session: ${updateError.message}`)
    }

    // Record quota usage after successful analysis completion
    await recordQuotaUsage(supabase, userId, sessionId)

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
  supabase: any,
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