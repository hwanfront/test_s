/**
 * Analysis Status API Route (Task T063)
 * 
 * Constitutional Compliance: This route provides analysis progress and status
 * with real-time updates while maintaining constitutional compliance
 */

import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { z } from 'zod'
import { supabase } from '@/shared/config/database/supabase'
import { ApiError, withErrorHandler } from '@/shared/lib/api-utils'

// Query parameters validation schema
const StatusQuerySchema = z.object({
  includeDetails: z.boolean().optional().default(false),
  includeMetrics: z.boolean().optional().default(true)
})

export interface AnalysisStatusResponse {
  sessionId: string
  status: 'queued' | 'processing' | 'completed' | 'failed'
  progress: {
    currentStep: string
    completedSteps: string[]
    totalSteps: number
    progressPercentage: number
    estimatedTimeRemaining?: number
  }
  metadata: {
    contentLength: number
    contentType: string
    priority: string
    createdAt: string
    updatedAt: string
    processingStartedAt?: string
    estimatedCompletionAt?: string
  }
  performance: {
    elapsedTimeMs: number
    estimatedTimeMs: number
    processingTimeMs?: number
  }
  constitutionalCompliance: {
    originalTextStored: false
    preprocessingApplied: true
    aiLimitationsDisclosed: true
    transparencyMaintained: true
  }
  result?: {
    overallRiskScore?: number
    riskLevel?: 'low' | 'medium' | 'high' | 'critical'
    totalRisks?: number
    confidenceScore?: number
  }
  error?: {
    message: string
    timestamp: string
    retryable: boolean
  }
}

export interface ProcessingStep {
  name: string
  status: 'pending' | 'active' | 'completed' | 'failed'
  startTime?: string
  endTime?: string
  duration?: number
  description: string
}

/**
 * GET /api/analysis/[sessionId]/status
 * Get real-time analysis status and progress information
 */
export const GET = withErrorHandler(async (
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) => {
  const startTime = Date.now()
  
  try {
    // Await params in Next.js 16
    const { sessionId } = await params
    
    // Verify authentication
    const token = await getToken({ req: request })
    if (!token || !token.userId) {
      throw new ApiError(401, 'Authentication required to check analysis status')
    }

    // Validate session ID
    if (!sessionId || sessionId.trim().length === 0) {
      throw new ApiError(400, 'Session ID is required')
    }

    if (!sessionId.match(/^analysis_\d+_[a-z0-9]+_\d{3}$/)) {
      throw new ApiError(400, 'Invalid session ID format')
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const queryParams = {
      includeDetails: searchParams.get('includeDetails') === 'true',
      includeMetrics: searchParams.get('includeMetrics') !== 'false'
    }
    
    const validatedParams = StatusQuerySchema.parse(queryParams)

    // Fetch session status
    const { data: session, error: sessionError } = await supabase
      .from('analysis_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', token.userId)
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

    // Calculate progress and timing
    const progress = calculateProgress(session)
    const performance = calculatePerformance(session)
    const processingSteps = getProcessingSteps(session, validatedParams.includeDetails)

    // Build status response
    const statusResponse: AnalysisStatusResponse = {
      sessionId: session.id,
      status: session.status,
      progress: {
        currentStep: progress.currentStep,
        completedSteps: progress.completedSteps,
        totalSteps: progress.totalSteps,
        progressPercentage: progress.progressPercentage,
        estimatedTimeRemaining: progress.estimatedTimeRemaining
      },
      metadata: {
        contentLength: session.content_length,
        contentType: session.content_type,
        priority: session.priority || 'normal',
        createdAt: session.created_at,
        updatedAt: session.updated_at || session.created_at,
        processingStartedAt: session.processing_started_at,
        estimatedCompletionAt: session.estimated_completion_at
      },
      performance,
      constitutionalCompliance: {
        originalTextStored: false,
        preprocessingApplied: true,
        aiLimitationsDisclosed: true,
        transparencyMaintained: true
      }
    }

    // Add result information if completed
    if (session.status === 'completed') {
      statusResponse.result = {
        overallRiskScore: session.risk_score,
        riskLevel: session.risk_level,
        totalRisks: session.total_risks || 0,
        confidenceScore: session.confidence_score
      }
    }

    // Add error information if failed
    if (session.status === 'failed') {
      statusResponse.error = {
        message: session.error_message || 'Analysis failed for unknown reason',
        timestamp: session.completed_at || session.updated_at || new Date().toISOString(),
        retryable: isRetryableError(session.error_message)
      }
    }

    // Add detailed processing steps if requested
    if (validatedParams.includeDetails) {
      (statusResponse as any).processingSteps = processingSteps
    }

    // Set appropriate HTTP status and headers
    let httpStatus = 200
    const headers: Record<string, string> = {
      'X-Processing-Time': (Date.now() - startTime).toString(),
      'X-Session-Status': session.status
    }

    if (session.status === 'processing' || session.status === 'queued') {
      httpStatus = 202 // Accepted, processing
      headers['Retry-After'] = '3' // Suggest checking again in 3 seconds
    }

    if (session.status === 'completed') {
      headers['Cache-Control'] = 'private, max-age=3600' // Cache completed results for 1 hour
    } else {
      headers['Cache-Control'] = 'no-cache' // Don't cache processing/failed states
    }

    return NextResponse.json(statusResponse, {
      status: httpStatus,
      headers
    })

  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    console.error('Unexpected analysis status retrieval error:', error)
    throw new ApiError(500, 'Internal server error during status retrieval')
  }
})

/**
 * Calculate analysis progress based on session state
 */
function calculateProgress(session: any): {
  currentStep: string
  completedSteps: string[]
  totalSteps: number
  progressPercentage: number
  estimatedTimeRemaining?: number
} {
  const allSteps = [
    'queued',
    'validation',
    'preprocessing',
    'pattern_matching',
    'ai_analysis',
    'result_merging',
    'finalization'
  ]

  let currentStepIndex = 0
  let completedSteps: string[] = []

  switch (session.status) {
    case 'queued':
      currentStepIndex = 0
      break
    case 'processing':
      // Estimate progress based on elapsed time
      const elapsedMs = Date.now() - new Date(session.created_at).getTime()
      const estimatedMs = session.estimated_time_ms || 30000
      const progressRatio = Math.min(elapsedMs / estimatedMs, 0.9) // Cap at 90% until completion
      
      currentStepIndex = Math.floor(progressRatio * (allSteps.length - 1)) + 1
      completedSteps = allSteps.slice(0, currentStepIndex)
      break
    case 'completed':
      currentStepIndex = allSteps.length
      completedSteps = [...allSteps]
      break
    case 'failed':
      // Determine how far we got before failure
      currentStepIndex = Math.max(1, Math.floor(allSteps.length * 0.5))
      completedSteps = allSteps.slice(0, currentStepIndex)
      break
  }

  const progressPercentage = Math.round((completedSteps.length / allSteps.length) * 100)
  
  let estimatedTimeRemaining: number | undefined
  if (session.status === 'processing' || session.status === 'queued') {
    const elapsedMs = Date.now() - new Date(session.created_at).getTime()
    const estimatedTotalMs = session.estimated_time_ms || 30000
    estimatedTimeRemaining = Math.max(0, estimatedTotalMs - elapsedMs)
  }

  return {
    currentStep: allSteps[Math.min(currentStepIndex, allSteps.length - 1)],
    completedSteps,
    totalSteps: allSteps.length,
    progressPercentage,
    estimatedTimeRemaining
  }
}

/**
 * Calculate performance metrics
 */
function calculatePerformance(session: any): {
  elapsedTimeMs: number
  estimatedTimeMs: number
  processingTimeMs?: number
} {
  const createdAt = new Date(session.created_at).getTime()
  const now = Date.now()
  const elapsedTimeMs = now - createdAt

  return {
    elapsedTimeMs,
    estimatedTimeMs: session.estimated_time_ms || 30000,
    processingTimeMs: session.processing_time_ms
  }
}

/**
 * Get detailed processing steps information
 */
function getProcessingSteps(session: any, includeDetails: boolean): ProcessingStep[] {
  if (!includeDetails) return []

  const steps: ProcessingStep[] = [
    {
      name: 'queued',
      status: 'completed',
      description: 'Analysis request queued for processing',
      startTime: session.created_at,
      endTime: session.created_at,
      duration: 0
    },
    {
      name: 'validation',
      status: session.status === 'failed' ? 'failed' : 'completed',
      description: 'Input validation and authentication',
      startTime: session.created_at
    },
    {
      name: 'preprocessing',
      status: session.status === 'failed' ? 'failed' : 'completed',
      description: 'Text preprocessing and constitutional compliance validation'
    },
    {
      name: 'pattern_matching',
      status: session.status === 'processing' ? 'active' : session.status === 'failed' ? 'failed' : 'completed',
      description: 'Pattern matching analysis using mobile gaming patterns'
    },
    {
      name: 'ai_analysis',
      status: session.status === 'queued' ? 'pending' : session.status === 'processing' ? 'active' : session.status === 'failed' ? 'failed' : 'completed',
      description: 'AI-powered legal clause analysis using Google Gemini'
    },
    {
      name: 'result_merging',
      status: session.status === 'completed' ? 'completed' : session.status === 'failed' ? 'failed' : 'pending',
      description: 'Merging pattern matching and AI analysis results'
    },
    {
      name: 'finalization',
      status: session.status === 'completed' ? 'completed' : 'pending',
      description: 'Final result compilation and storage',
      endTime: session.completed_at
    }
  ]

  return steps
}

/**
 * Determine if an error is retryable
 */
function isRetryableError(errorMessage?: string): boolean {
  if (!errorMessage) return false
  
  const retryablePatterns = [
    'timeout',
    'rate limit',
    'temporary',
    'network',
    'service unavailable',
    'internal server error'
  ]

  const message = errorMessage.toLowerCase()
  return retryablePatterns.some(pattern => message.includes(pattern))
}