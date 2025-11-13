/**
 * Quota API Client (Task T086)
 * 
 * Implements API client for quota management operations
 * following Feature-Sliced Design principles and REST API contracts
 */

import { QuotaCalculator, type DailyQuotaRecord, type QuotaCalculation } from './quota-calculator'
import { QuotaValidator, type QuotaValidationResult } from './quota-validator'

/**
 * Quota API endpoints
 */
const QUOTA_ENDPOINTS = {
  QUOTA_STATUS: '/api/quota',
  QUOTA_USAGE: '/api/quota/usage',
  QUOTA_RESET: '/api/quota/reset',
  QUOTA_HISTORY: '/api/quota/history'
} as const

/**
 * Quota API request/response types
 */
export interface QuotaStatusResponse {
  userId: string
  dailyLimit: number
  currentUsage: number
  remainingAnalyses: number
  quotaStatus: 'active' | 'exceeded' | 'reset_pending'
  resetTime: string // ISO date string
  usagePercentage: number
  canPerformAnalysis: boolean
  lastUpdated: string // ISO date string
}

export interface QuotaUsageRequest {
  increment?: number
}

export interface QuotaUsageResponse {
  success: boolean
  newUsage: number
  remainingAnalyses: number
  quotaExceeded: boolean
  message?: string
}

export interface QuotaHistoryResponse {
  userId: string
  history: Array<{
    date: string
    usage: number
    limit: number
    utilizationRate: number
  }>
  totalPeriod: {
    days: number
    totalUsage: number
    averageDaily: number
    peakUsage: number
  }
}

export interface QuotaResetResponse {
  success: boolean
  resetDate: string
  previousUsage: number
  message: string
}

/**
 * API error response
 */
export interface QuotaApiError {
  error: string
  message: string
  code?: string
  details?: Record<string, any>
}

/**
 * API client configuration
 */
export interface QuotaApiConfig {
  baseUrl?: string
  timeout?: number
  retryAttempts?: number
  retryDelay?: number
  headers?: Record<string, string>
}

/**
 * Default API configuration
 */
const DEFAULT_CONFIG: Required<QuotaApiConfig> = {
  baseUrl: '',
  timeout: 10000, // 10 seconds
  retryAttempts: 3,
  retryDelay: 1000, // 1 second
  headers: {
    'Content-Type': 'application/json'
  }
}

/**
 * Main quota API client
 */
export class QuotaApiClient {
  private config: Required<QuotaApiConfig>

  constructor(config: QuotaApiConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * Gets current quota status for the authenticated user
   */
  async getQuotaStatus(): Promise<QuotaStatusResponse> {
    try {
      const response = await this.makeRequest<QuotaStatusResponse>(
        'GET',
        QUOTA_ENDPOINTS.QUOTA_STATUS
      )
      return response
    } catch (error) {
      throw this.handleApiError(error, 'Failed to get quota status')
    }
  }

  /**
   * Records quota usage (increments usage count)
   */
  async recordUsage(request: QuotaUsageRequest = {}): Promise<QuotaUsageResponse> {
    try {
      const response = await this.makeRequest<QuotaUsageResponse>(
        'POST',
        QUOTA_ENDPOINTS.QUOTA_USAGE,
        request
      )
      return response
    } catch (error) {
      throw this.handleApiError(error, 'Failed to record quota usage')
    }
  }

  /**
   * Gets quota usage history for a date range
   */
  async getQuotaHistory(
    startDate?: string,
    endDate?: string,
    limit?: number
  ): Promise<QuotaHistoryResponse> {
    try {
      const params = new URLSearchParams()
      if (startDate) params.append('startDate', startDate)
      if (endDate) params.append('endDate', endDate)
      if (limit) params.append('limit', limit.toString())
      
      const url = `${QUOTA_ENDPOINTS.QUOTA_HISTORY}${params.toString() ? `?${params}` : ''}`
      
      const response = await this.makeRequest<QuotaHistoryResponse>(
        'GET',
        url
      )
      return response
    } catch (error) {
      throw this.handleApiError(error, 'Failed to get quota history')
    }
  }

  /**
   * Requests a quota reset (admin function)
   */
  async requestQuotaReset(): Promise<QuotaResetResponse> {
    try {
      const response = await this.makeRequest<QuotaResetResponse>(
        'POST',
        QUOTA_ENDPOINTS.QUOTA_RESET
      )
      return response
    } catch (error) {
      throw this.handleApiError(error, 'Failed to reset quota')
    }
  }

  /**
   * Checks if user can perform an analysis (client-side check)
   */
  async canPerformAnalysis(): Promise<boolean> {
    try {
      const status = await this.getQuotaStatus()
      return status.canPerformAnalysis
    } catch (error) {
      console.error('Failed to check analysis permission:', error)
      return false
    }
  }

  /**
   * Validates and records usage in a single operation
   */
  async validateAndRecordUsage(increment: number = 1): Promise<{
    allowed: boolean
    response?: QuotaUsageResponse
    error?: string
  }> {
    try {
      // First check if operation is allowed
      const status = await this.getQuotaStatus()
      
      if (!status.canPerformAnalysis || status.remainingAnalyses < increment) {
        return {
          allowed: false,
          error: 'Quota limit would be exceeded'
        }
      }

      // Record the usage
      const response = await this.recordUsage({ increment })
      
      return {
        allowed: true,
        response
      }
    } catch (error) {
      return {
        allowed: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Makes HTTP request to API with retry logic
   */
  private async makeRequest<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    data?: any
  ): Promise<T> {
    const url = `${this.config.baseUrl}${endpoint}`
    
    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout)

        const response = await fetch(url, {
          method,
          headers: this.config.headers,
          body: data ? JSON.stringify(data) : undefined,
          signal: controller.signal
        })

        clearTimeout(timeoutId)

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new QuotaApiClientError(
            `HTTP ${response.status}: ${response.statusText}`,
            response.status,
            errorData
          )
        }

        return await response.json()
      } catch (error) {
        if (attempt === this.config.retryAttempts) {
          throw error
        }

        // Wait before retrying
        await this.delay(this.config.retryDelay * attempt)
      }
    }

    throw new Error('Request failed after all retry attempts')
  }

  /**
   * Handles API errors and converts them to user-friendly messages
   */
  private handleApiError(error: any, defaultMessage: string): Error {
    if (error instanceof QuotaApiClientError) {
      return error
    }

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return new QuotaApiClientError('Request timeout', 408)
      }
      
      if (error.message.includes('fetch')) {
        return new QuotaApiClientError('Network error', 0)
      }
    }

    return new QuotaApiClientError(defaultMessage, 500, { originalError: error })
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Updates client configuration
   */
  updateConfig(newConfig: Partial<QuotaApiConfig>): void {
    this.config = { ...this.config, ...newConfig }
  }

  /**
   * Gets current client configuration
   */
  getConfig(): Required<QuotaApiConfig> {
    return { ...this.config }
  }
}

/**
 * Custom error class for quota API operations
 */
export class QuotaApiClientError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public details?: any
  ) {
    super(message)
    this.name = 'QuotaApiClientError'
  }

  /**
   * Checks if error is due to quota exceeded
   */
  isQuotaExceeded(): boolean {
    return this.statusCode === 429 || 
           this.message.toLowerCase().includes('quota') ||
           this.message.toLowerCase().includes('limit')
  }

  /**
   * Checks if error is due to authentication
   */
  isAuthError(): boolean {
    return this.statusCode === 401 || this.statusCode === 403
  }

  /**
   * Checks if error is retryable
   */
  isRetryable(): boolean {
    return this.statusCode >= 500 || this.statusCode === 0 || this.statusCode === 408
  }
}

/**
 * Client-side quota validation utilities
 */
export class ClientQuotaValidator {
  /**
   * Validates quota status response
   */
  static validateQuotaStatus(status: any): status is QuotaStatusResponse {
    return (
      typeof status === 'object' &&
      typeof status.userId === 'string' &&
      typeof status.dailyLimit === 'number' &&
      typeof status.currentUsage === 'number' &&
      typeof status.remainingAnalyses === 'number' &&
      ['active', 'exceeded', 'reset_pending'].includes(status.quotaStatus) &&
      typeof status.resetTime === 'string' &&
      typeof status.canPerformAnalysis === 'boolean'
    )
  }

  /**
   * Calculates client-side quota projections
   */
  static projectUsage(
    currentStatus: QuotaStatusResponse,
    plannedUsage: number
  ): {
    wouldExceed: boolean
    remainingAfter: number
    utilizationAfter: number
  } {
    const usageAfter = currentStatus.currentUsage + plannedUsage
    const remainingAfter = Math.max(0, currentStatus.dailyLimit - usageAfter)
    const utilizationAfter = Math.min(100, (usageAfter / currentStatus.dailyLimit) * 100)

    return {
      wouldExceed: usageAfter > currentStatus.dailyLimit,
      remainingAfter,
      utilizationAfter
    }
  }

  /**
   * Gets time until quota reset
   */
  static getTimeUntilReset(resetTime: string): number {
    const resetDate = new Date(resetTime)
    const now = new Date()
    return Math.max(0, resetDate.getTime() - now.getTime())
  }

  /**
   * Formats time until reset in human-readable format
   */
  static formatTimeUntilReset(resetTime: string): string {
    const timeUntilReset = this.getTimeUntilReset(resetTime)
    
    const hours = Math.floor(timeUntilReset / (1000 * 60 * 60))
    const minutes = Math.floor((timeUntilReset % (1000 * 60 * 60)) / (1000 * 60))
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`
    } else if (minutes > 0) {
      return `${minutes}m`
    } else {
      return 'Less than 1 minute'
    }
  }
}

/**
 * Global quota API client instance
 */
let globalQuotaClient: QuotaApiClient | null = null

/**
 * Gets or creates the global quota API client
 */
export function getQuotaApiClient(config?: QuotaApiConfig): QuotaApiClient {
  if (!globalQuotaClient) {
    globalQuotaClient = new QuotaApiClient(config)
  }
  return globalQuotaClient
}

/**
 * Convenience functions for common quota operations
 */
export const quotaApi = {
  /**
   * Quick quota status check
   */
  async getStatus(): Promise<QuotaStatusResponse> {
    const client = getQuotaApiClient()
    return client.getQuotaStatus()
  },

  /**
   * Quick usage recording
   */
  async recordUsage(increment: number = 1): Promise<QuotaUsageResponse> {
    const client = getQuotaApiClient()
    return client.recordUsage({ increment })
  },

  /**
   * Quick analysis permission check
   */
  async canAnalyze(): Promise<boolean> {
    const client = getQuotaApiClient()
    return client.canPerformAnalysis()
  },

  /**
   * Safe usage recording with validation
   */
  async safeRecordUsage(increment: number = 1): Promise<{
    success: boolean
    response?: QuotaUsageResponse
    error?: string
  }> {
    try {
      const client = getQuotaApiClient()
      const result = await client.validateAndRecordUsage(increment)
      
      if (result.allowed && result.response) {
        return {
          success: true,
          response: result.response
        }
      } else {
        return {
          success: false,
          error: result.error
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  },

  /**
   * Get recent quota history
   */
  async getRecentHistory(days: number = 7): Promise<QuotaHistoryResponse> {
    const client = getQuotaApiClient()
    const endDate = new Date().toISOString().split('T')[0]
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    
    return client.getQuotaHistory(startDate, endDate)
  }
}