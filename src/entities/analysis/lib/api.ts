/**
 * Analysis Entity API Client (Task T071)
 * 
 * Constitutional Compliance: This client provides API access for analysis entities
 * with proper error handling and response validation
 */

import type { 
  AnalysisSession, 
  RiskAssessment,
  CreateAnalysisSessionData,
  UpdateAnalysisSessionData 
} from '../model'

export interface AnalysisApiClient {
  // Session operations
  createAnalysisSession(data: CreateAnalysisRequestData): Promise<AnalysisSessionResponse>
  getAnalysisSession(sessionId: string): Promise<AnalysisSessionDetailResponse>
  getAnalysisStatus(sessionId: string): Promise<AnalysisStatusResponse>
  
  // Data operations
  getUserSessions(limit?: number): Promise<AnalysisSession[]>
  downloadReport(sessionId: string, format?: 'json' | 'text' | 'pdf'): Promise<Blob>
}

export interface CreateAnalysisRequestData {
  content: string
  contentType?: string
  context?: {
    documentType?: string
    industry?: string
    jurisdiction?: string
    userRole?: string
    analysisDepth?: 'basic' | 'comprehensive' | 'detailed'
    focusAreas?: string[]
    customInstructions?: string
  }
  options?: {
    enablePatternMatching?: boolean
    enableAIAnalysis?: boolean
    strictValidation?: boolean
    includeRawResponse?: boolean
    maxRetries?: number
    templateId?: string
  }
  skipCache?: boolean
  priority?: 'low' | 'normal' | 'high'
}

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

export interface AnalysisSessionDetailResponse extends AnalysisSessionResponse {
  overallRiskScore?: number
  riskLevel?: 'low' | 'medium' | 'high' | 'critical'
  confidenceScore?: number
  totalRisks?: number
  processingTimeMs?: number
  riskAssessments?: RiskAssessment[]
  summary?: {
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
  metadata?: {
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
  completedAt?: string
  errorMessage?: string
}

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

export class AnalysisApiClientImpl implements AnalysisApiClient {
  private baseUrl: string

  constructor(baseUrl = '') {
    this.baseUrl = baseUrl
  }

  /**
   * Create a new analysis session
   */
  async createAnalysisSession(data: CreateAnalysisRequestData): Promise<AnalysisSessionResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/analysis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
        credentials: 'include' // Include cookies for authentication
      })

      if (!response.ok) {
        await this.handleApiError(response)
      }

      const result = await response.json()
      return this.validateAnalysisSessionResponse(result)
    } catch (error) {
      if (error instanceof AnalysisApiError) throw error
      throw new AnalysisApiError(500, 'Failed to create analysis session', error)
    }
  }

  /**
   * Get analysis session details
   */
  async getAnalysisSession(sessionId: string): Promise<AnalysisSessionDetailResponse> {
    try {
      if (!sessionId || sessionId.trim().length === 0) {
        throw new AnalysisApiError(400, 'Session ID is required')
      }

      const response = await fetch(`${this.baseUrl}/api/analysis/${sessionId}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        credentials: 'include'
      })

      if (!response.ok) {
        await this.handleApiError(response)
      }

      const result = await response.json()
      return this.validateAnalysisDetailResponse(result)
    } catch (error) {
      if (error instanceof AnalysisApiError) throw error
      throw new AnalysisApiError(500, 'Failed to retrieve analysis session', error)
    }
  }

  /**
   * Get analysis status
   */
  async getAnalysisStatus(sessionId: string): Promise<AnalysisStatusResponse> {
    try {
      if (!sessionId || sessionId.trim().length === 0) {
        throw new AnalysisApiError(400, 'Session ID is required')
      }

      const response = await fetch(`${this.baseUrl}/api/analysis/${sessionId}/status`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        credentials: 'include'
      })

      if (!response.ok) {
        await this.handleApiError(response)
      }

      const result = await response.json()
      return this.validateAnalysisStatusResponse(result)
    } catch (error) {
      if (error instanceof AnalysisApiError) throw error
      throw new AnalysisApiError(500, 'Failed to retrieve analysis status', error)
    }
  }

  /**
   * Get user's analysis sessions
   */
  async getUserSessions(limit = 20): Promise<AnalysisSession[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/user/sessions?limit=${limit}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        credentials: 'include'
      })

      if (!response.ok) {
        await this.handleApiError(response)
      }

      const result = await response.json()
      return Array.isArray(result.sessions) ? result.sessions : []
    } catch (error) {
      if (error instanceof AnalysisApiError) throw error
      throw new AnalysisApiError(500, 'Failed to retrieve user sessions', error)
    }
  }

  /**
   * Download analysis report
   */
  async downloadReport(sessionId: string, format: 'json' | 'text' | 'pdf' = 'json'): Promise<Blob> {
    try {
      if (!sessionId || sessionId.trim().length === 0) {
        throw new AnalysisApiError(400, 'Session ID is required')
      }

      const response = await fetch(`${this.baseUrl}/api/analysis/${sessionId}/report?format=${format}`, {
        method: 'GET',
        credentials: 'include'
      })

      if (!response.ok) {
        await this.handleApiError(response)
      }

      return await response.blob()
    } catch (error) {
      if (error instanceof AnalysisApiError) throw error
      throw new AnalysisApiError(500, 'Failed to download report', error)
    }
  }

  /**
   * Handle API errors
   */
  private async handleApiError(response: Response): Promise<never> {
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`
    let errorCode = 'API_ERROR'
    let details: any = undefined

    try {
      const errorData = await response.json()
      if (errorData.error) {
        errorMessage = errorData.error.message || errorMessage
        errorCode = errorData.error.code || errorCode
        details = errorData.error.details
      } else if (errorData.message) {
        errorMessage = errorData.message
      }
    } catch {
      // Ignore JSON parsing errors, use default message
    }

    throw new AnalysisApiError(response.status, errorMessage, details, errorCode)
  }

  /**
   * Validate analysis session response
   */
  private validateAnalysisSessionResponse(data: any): AnalysisSessionResponse {
    if (!data || typeof data !== 'object') {
      throw new AnalysisApiError(500, 'Invalid response format')
    }

    return {
      sessionId: this.validateString(data.sessionId, 'sessionId'),
      status: this.validateStatus(data.status),
      estimatedTimeMs: data.estimatedTimeMs,
      contentLength: this.validateNumber(data.contentLength, 'contentLength'),
      contentHash: this.validateString(data.contentHash, 'contentHash'),
      createdAt: this.validateString(data.createdAt, 'createdAt'),
      expiresAt: this.validateString(data.expiresAt, 'expiresAt'),
      cached: data.cached,
      priority: data.priority || 'normal',
      constitutionalCompliance: data.constitutionalCompliance || {
        originalTextStored: false,
        preprocessingApplied: true,
        aiLimitationsDisclosed: true,
        transparencyMaintained: true
      }
    }
  }

  /**
   * Validate analysis detail response
   */
  private validateAnalysisDetailResponse(data: any): AnalysisSessionDetailResponse {
    const baseResponse = this.validateAnalysisSessionResponse(data)
    
    return {
      ...baseResponse,
      overallRiskScore: data.overallRiskScore,
      riskLevel: data.riskLevel,
      confidenceScore: data.confidenceScore,
      totalRisks: data.totalRisks,
      processingTimeMs: data.processingTimeMs,
      riskAssessments: data.riskAssessments,
      summary: data.summary,
      metadata: data.metadata,
      completedAt: data.completedAt,
      errorMessage: data.errorMessage
    }
  }

  /**
   * Validate analysis status response
   */
  private validateAnalysisStatusResponse(data: any): AnalysisStatusResponse {
    if (!data || typeof data !== 'object') {
      throw new AnalysisApiError(500, 'Invalid status response format')
    }

    return {
      sessionId: this.validateString(data.sessionId, 'sessionId'),
      status: this.validateStatus(data.status),
      progress: {
        currentStep: this.validateString(data.progress?.currentStep, 'progress.currentStep'),
        completedSteps: Array.isArray(data.progress?.completedSteps) ? data.progress.completedSteps : [],
        totalSteps: this.validateNumber(data.progress?.totalSteps, 'progress.totalSteps'),
        progressPercentage: this.validateNumber(data.progress?.progressPercentage, 'progress.progressPercentage'),
        estimatedTimeRemaining: data.progress?.estimatedTimeRemaining
      },
      metadata: {
        contentLength: this.validateNumber(data.metadata?.contentLength, 'metadata.contentLength'),
        contentType: this.validateString(data.metadata?.contentType, 'metadata.contentType'),
        priority: data.metadata?.priority || 'normal',
        createdAt: this.validateString(data.metadata?.createdAt, 'metadata.createdAt'),
        updatedAt: this.validateString(data.metadata?.updatedAt, 'metadata.updatedAt'),
        processingStartedAt: data.metadata?.processingStartedAt,
        estimatedCompletionAt: data.metadata?.estimatedCompletionAt
      },
      performance: {
        elapsedTimeMs: this.validateNumber(data.performance?.elapsedTimeMs, 'performance.elapsedTimeMs'),
        estimatedTimeMs: this.validateNumber(data.performance?.estimatedTimeMs, 'performance.estimatedTimeMs'),
        processingTimeMs: data.performance?.processingTimeMs
      },
      constitutionalCompliance: data.constitutionalCompliance || {
        originalTextStored: false,
        preprocessingApplied: true,
        aiLimitationsDisclosed: true,
        transparencyMaintained: true
      },
      result: data.result,
      error: data.error
    }
  }

  /**
   * Validation helpers
   */
  private validateString(value: any, fieldName: string): string {
    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new AnalysisApiError(500, `Invalid or missing field: ${fieldName}`)
    }
    return value
  }

  private validateNumber(value: any, fieldName: string): number {
    if (typeof value !== 'number' || isNaN(value)) {
      throw new AnalysisApiError(500, `Invalid or missing numeric field: ${fieldName}`)
    }
    return value
  }

  private validateStatus(value: any): 'queued' | 'processing' | 'completed' | 'failed' {
    if (!['queued', 'processing', 'completed', 'failed'].includes(value)) {
      throw new AnalysisApiError(500, `Invalid status value: ${value}`)
    }
    return value
  }
}

/**
 * Custom error class for analysis API errors
 */
export class AnalysisApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: any,
    public code = 'API_ERROR'
  ) {
    super(message)
    this.name = 'AnalysisApiError'
  }

  /**
   * Check if error is retryable
   */
  get isRetryable(): boolean {
    return this.status >= 500 || this.status === 429 || this.code === 'TIMEOUT'
  }

  /**
   * Check if error is client-side
   */
  get isClientError(): boolean {
    return this.status >= 400 && this.status < 500
  }

  /**
   * Get user-friendly error message
   */
  get userMessage(): string {
    switch (this.status) {
      case 400:
        return 'Invalid request. Please check your input and try again.'
      case 401:
        return 'Authentication required. Please sign in and try again.'
      case 403:
        return 'Access denied. You do not have permission to perform this action.'
      case 404:
        return 'Analysis session not found or has expired.'
      case 410:
        return 'Analysis results have expired. Please start a new analysis.'
      case 429:
        return 'Too many requests. Please wait a moment before trying again.'
      case 500:
        return 'A server error occurred. Please try again later.'
      default:
        return this.message
    }
  }
}

// Export singleton instance
export const analysisApiClient = new AnalysisApiClientImpl()