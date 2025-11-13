/**
 * User API Client (Task T088)
 * 
 * API client for user management operations
 * following Feature-Sliced Design principles and REST API contracts
 */

import {
  type UserProfile,
  type UserEntity,
  type CreateUserInput,
  type UpdateUserInput,
  type UpdateUserPreferencesInput,
  type UserQueryFilters,
  type UserStats,
  UserModelValidator
} from '../model'

/**
 * User API endpoints
 */
const USER_ENDPOINTS = {
  USER_PROFILE: '/api/user',
  USER_PREFERENCES: '/api/user/preferences',
  USER_STATS: '/api/user/stats',
  USER_SESSIONS: '/api/user/sessions',
  USER_LIST: '/api/users',
  USER_SEARCH: '/api/users/search'
} as const

/**
 * User API request/response types
 */
export interface UserProfileResponse {
  success: boolean
  user: UserProfile
  metadata?: {
    isComplete: boolean
    accountAge: string
    lastLogin?: string
  }
}

export interface UserListResponse {
  success: boolean
  users: UserProfile[]
  pagination: {
    page: number
    limit: number
    total: number
    hasMore: boolean
  }
  filters: UserQueryFilters
}

export interface UserStatsResponse {
  success: boolean
  stats: UserStats
  trends: {
    dailyAnalyses: number[]
    weeklyAnalyses: number[]
    monthlyAnalyses: number[]
  }
  insights: {
    mostActiveDay: string
    averageSessionTime: number
    topFeatures: string[]
  }
}

export interface UserSessionsResponse {
  success: boolean
  sessions: Array<{
    id: string
    device: string
    lastActive: string
    location?: string
    isCurrent: boolean
  }>
  totalSessions: number
  activeSessions: number
}

export interface UserUpdateResponse {
  success: boolean
  user: UserProfile
  changes: string[]
  message: string
}

export interface UserPreferencesResponse {
  success: boolean
  preferences: {
    theme: 'light' | 'dark' | 'system'
    language: string
    timezone: string
    notifications: {
      email: boolean
      analysis: boolean
      quota: boolean
      marketing: boolean
    }
  }
  message?: string
}

/**
 * User API error response
 */
export interface UserApiError {
  success: false
  error: string
  message: string
  code?: string
  field?: string
  details?: Record<string, any>
}

/**
 * API client configuration
 */
export interface UserApiConfig {
  baseUrl?: string
  timeout?: number
  retryAttempts?: number
  retryDelay?: number
  headers?: Record<string, string>
}

/**
 * Default API configuration
 */
const DEFAULT_CONFIG: Required<UserApiConfig> = {
  baseUrl: '',
  timeout: 10000, // 10 seconds
  retryAttempts: 3,
  retryDelay: 1000, // 1 second
  headers: {
    'Content-Type': 'application/json'
  }
}

/**
 * Main user API client
 */
export class UserApiClient {
  private config: Required<UserApiConfig>

  constructor(config: UserApiConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * Gets current user profile
   */
  async getCurrentUser(): Promise<UserProfileResponse> {
    try {
      const response = await this.makeRequest<UserProfileResponse>(
        'GET',
        USER_ENDPOINTS.USER_PROFILE
      )
      return response
    } catch (error) {
      throw this.handleApiError(error, 'Failed to get user profile')
    }
  }

  /**
   * Gets user profile by ID
   */
  async getUserById(userId: string): Promise<UserProfileResponse> {
    try {
      if (!userId) {
        throw new UserApiClientError('User ID is required', 400)
      }

      const response = await this.makeRequest<UserProfileResponse>(
        'GET',
        `${USER_ENDPOINTS.USER_PROFILE}/${userId}`
      )
      return response
    } catch (error) {
      throw this.handleApiError(error, 'Failed to get user by ID')
    }
  }

  /**
   * Updates user profile
   */
  async updateProfile(updates: UpdateUserInput): Promise<UserUpdateResponse> {
    try {
      // Validate updates on client side
      UserModelValidator.validateUpdateInput(updates)

      const response = await this.makeRequest<UserUpdateResponse>(
        'PUT',
        USER_ENDPOINTS.USER_PROFILE,
        updates
      )
      return response
    } catch (error) {
      throw this.handleApiError(error, 'Failed to update user profile')
    }
  }

  /**
   * Gets user preferences
   */
  async getUserPreferences(): Promise<UserPreferencesResponse> {
    try {
      const response = await this.makeRequest<UserPreferencesResponse>(
        'GET',
        USER_ENDPOINTS.USER_PREFERENCES
      )
      return response
    } catch (error) {
      throw this.handleApiError(error, 'Failed to get user preferences')
    }
  }

  /**
   * Updates user preferences
   */
  async updatePreferences(preferences: UpdateUserPreferencesInput): Promise<UserPreferencesResponse> {
    try {
      const response = await this.makeRequest<UserPreferencesResponse>(
        'PUT',
        USER_ENDPOINTS.USER_PREFERENCES,
        preferences
      )
      return response
    } catch (error) {
      throw this.handleApiError(error, 'Failed to update user preferences')
    }
  }

  /**
   * Gets user statistics and analytics
   */
  async getUserStats(): Promise<UserStatsResponse> {
    try {
      const response = await this.makeRequest<UserStatsResponse>(
        'GET',
        USER_ENDPOINTS.USER_STATS
      )
      return response
    } catch (error) {
      throw this.handleApiError(error, 'Failed to get user statistics')
    }
  }

  /**
   * Gets user session information
   */
  async getUserSessions(): Promise<UserSessionsResponse> {
    try {
      const response = await this.makeRequest<UserSessionsResponse>(
        'GET',
        USER_ENDPOINTS.USER_SESSIONS
      )
      return response
    } catch (error) {
      throw this.handleApiError(error, 'Failed to get user sessions')
    }
  }

  /**
   * Revokes a specific user session
   */
  async revokeSession(sessionId: string): Promise<{ success: boolean; message: string }> {
    try {
      if (!sessionId) {
        throw new UserApiClientError('Session ID is required', 400)
      }

      const response = await this.makeRequest<{ success: boolean; message: string }>(
        'DELETE',
        `${USER_ENDPOINTS.USER_SESSIONS}/${sessionId}`
      )
      return response
    } catch (error) {
      throw this.handleApiError(error, 'Failed to revoke session')
    }
  }

  /**
   * Revokes all user sessions (except current)
   */
  async revokeAllSessions(): Promise<{ success: boolean; message: string; revokedCount: number }> {
    try {
      const response = await this.makeRequest<{ success: boolean; message: string; revokedCount: number }>(
        'DELETE',
        USER_ENDPOINTS.USER_SESSIONS
      )
      return response
    } catch (error) {
      throw this.handleApiError(error, 'Failed to revoke all sessions')
    }
  }

  /**
   * Lists users (admin function)
   */
  async listUsers(
    filters: UserQueryFilters = {},
    page: number = 1,
    limit: number = 20
  ): Promise<UserListResponse> {
    try {
      const params = new URLSearchParams()
      
      // Add filters to query params
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value))
        }
      })
      
      // Add pagination
      params.append('page', page.toString())
      params.append('limit', limit.toString())
      
      const url = `${USER_ENDPOINTS.USER_LIST}?${params}`
      
      const response = await this.makeRequest<UserListResponse>(
        'GET',
        url
      )
      return response
    } catch (error) {
      throw this.handleApiError(error, 'Failed to list users')
    }
  }

  /**
   * Searches users by email or name
   */
  async searchUsers(query: string, limit: number = 10): Promise<UserListResponse> {
    try {
      if (!query || query.trim().length < 2) {
        throw new UserApiClientError('Search query must be at least 2 characters', 400)
      }

      const params = new URLSearchParams()
      params.append('q', query.trim())
      params.append('limit', limit.toString())
      
      const url = `${USER_ENDPOINTS.USER_SEARCH}?${params}`
      
      const response = await this.makeRequest<UserListResponse>(
        'GET',
        url
      )
      return response
    } catch (error) {
      throw this.handleApiError(error, 'Failed to search users')
    }
  }

  /**
   * Creates a new user account (admin function)
   */
  async createUser(userData: CreateUserInput): Promise<UserProfileResponse> {
    try {
      // Validate user data on client side
      UserModelValidator.validateCreateInput(userData)

      const response = await this.makeRequest<UserProfileResponse>(
        'POST',
        USER_ENDPOINTS.USER_LIST,
        userData
      )
      return response
    } catch (error) {
      throw this.handleApiError(error, 'Failed to create user')
    }
  }

  /**
   * Deactivates a user account (admin function)
   */
  async deactivateUser(userId: string): Promise<{ success: boolean; message: string }> {
    try {
      if (!userId) {
        throw new UserApiClientError('User ID is required', 400)
      }

      const response = await this.makeRequest<{ success: boolean; message: string }>(
        'POST',
        `${USER_ENDPOINTS.USER_PROFILE}/${userId}/deactivate`
      )
      return response
    } catch (error) {
      throw this.handleApiError(error, 'Failed to deactivate user')
    }
  }

  /**
   * Reactivates a user account (admin function)
   */
  async reactivateUser(userId: string): Promise<{ success: boolean; message: string }> {
    try {
      if (!userId) {
        throw new UserApiClientError('User ID is required', 400)
      }

      const response = await this.makeRequest<{ success: boolean; message: string }>(
        'POST',
        `${USER_ENDPOINTS.USER_PROFILE}/${userId}/reactivate`
      )
      return response
    } catch (error) {
      throw this.handleApiError(error, 'Failed to reactivate user')
    }
  }

  /**
   * Deletes a user account permanently (admin function)
   */
  async deleteUser(userId: string): Promise<{ success: boolean; message: string }> {
    try {
      if (!userId) {
        throw new UserApiClientError('User ID is required', 400)
      }

      const response = await this.makeRequest<{ success: boolean; message: string }>(
        'DELETE',
        `${USER_ENDPOINTS.USER_PROFILE}/${userId}`
      )
      return response
    } catch (error) {
      throw this.handleApiError(error, 'Failed to delete user')
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
          throw new UserApiClientError(
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
    if (error instanceof UserApiClientError) {
      return error
    }

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return new UserApiClientError('Request timeout', 408)
      }
      
      if (error.message.includes('fetch')) {
        return new UserApiClientError('Network error', 0)
      }
    }

    return new UserApiClientError(defaultMessage, 500, { originalError: error })
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
  updateConfig(newConfig: Partial<UserApiConfig>): void {
    this.config = { ...this.config, ...newConfig }
  }

  /**
   * Gets current client configuration
   */
  getConfig(): Required<UserApiConfig> {
    return { ...this.config }
  }
}

/**
 * Custom error class for user API operations
 */
export class UserApiClientError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public details?: any
  ) {
    super(message)
    this.name = 'UserApiClientError'
  }

  /**
   * Checks if error is due to authentication
   */
  isAuthError(): boolean {
    return this.statusCode === 401 || this.statusCode === 403
  }

  /**
   * Checks if error is due to validation
   */
  isValidationError(): boolean {
    return this.statusCode === 400
  }

  /**
   * Checks if error is retryable
   */
  isRetryable(): boolean {
    return this.statusCode >= 500 || this.statusCode === 0 || this.statusCode === 408
  }

  /**
   * Checks if error is due to user not found
   */
  isNotFoundError(): boolean {
    return this.statusCode === 404
  }
}

/**
 * Client-side user validation utilities
 */
export class ClientUserValidator {
  /**
   * Validates user profile response
   */
  static validateUserProfile(data: any): data is UserProfileResponse {
    return (
      typeof data === 'object' &&
      typeof data.success === 'boolean' &&
      data.success &&
      typeof data.user === 'object' &&
      typeof data.user.id === 'string' &&
      typeof data.user.email === 'string'
    )
  }

  /**
   * Validates user list response
   */
  static validateUserList(data: any): data is UserListResponse {
    return (
      typeof data === 'object' &&
      typeof data.success === 'boolean' &&
      data.success &&
      Array.isArray(data.users) &&
      typeof data.pagination === 'object'
    )
  }

  /**
   * Checks if profile data is complete
   */
  static isProfileComplete(user: UserProfile): { complete: boolean; missing: string[] } {
    const missing: string[] = []

    if (!user.name || user.name.trim().length === 0) {
      missing.push('Display name')
    }

    if (!user.emailVerified) {
      missing.push('Email verification')
    }

    return {
      complete: missing.length === 0,
      missing
    }
  }

  /**
   * Gets user display information
   */
  static getUserDisplay(user: UserProfile): {
    name: string
    initials: string
    avatar?: string
    isComplete: boolean
  } {
    const name = user.name || user.email.split('@')[0]
    const initials = name
      .split(' ')
      .map(part => part.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2)

    const { complete } = this.isProfileComplete(user)

    return {
      name,
      initials,
      avatar: user.avatar,
      isComplete: complete
    }
  }
}

/**
 * Global user API client instance
 */
let globalUserClient: UserApiClient | null = null

/**
 * Gets or creates the global user API client
 */
export function getUserApiClient(config?: UserApiConfig): UserApiClient {
  if (!globalUserClient) {
    globalUserClient = new UserApiClient(config)
  }
  return globalUserClient
}

/**
 * Convenience functions for common user operations
 */
export const userApi = {
  /**
   * Quick current user fetch
   */
  async getCurrentUser(): Promise<UserProfileResponse> {
    const client = getUserApiClient()
    return client.getCurrentUser()
  },

  /**
   * Quick profile update
   */
  async updateProfile(updates: UpdateUserInput): Promise<UserUpdateResponse> {
    const client = getUserApiClient()
    return client.updateProfile(updates)
  },

  /**
   * Quick preferences fetch
   */
  async getPreferences(): Promise<UserPreferencesResponse> {
    const client = getUserApiClient()
    return client.getUserPreferences()
  },

  /**
   * Quick preferences update
   */
  async updatePreferences(preferences: UpdateUserPreferencesInput): Promise<UserPreferencesResponse> {
    const client = getUserApiClient()
    return client.updatePreferences(preferences)
  },

  /**
   * Quick stats fetch
   */
  async getStats(): Promise<UserStatsResponse> {
    const client = getUserApiClient()
    return client.getUserStats()
  },

  /**
   * Quick sessions fetch
   */
  async getSessions(): Promise<UserSessionsResponse> {
    const client = getUserApiClient()
    return client.getUserSessions()
  },

  /**
   * Safe profile update with validation
   */
  async safeUpdateProfile(updates: UpdateUserInput): Promise<{
    success: boolean
    data?: UserUpdateResponse
    error?: string
  }> {
    try {
      const client = getUserApiClient()
      const result = await client.updateProfile(updates)
      return {
        success: true,
        data: result
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  },

  /**
   * Safe session revocation
   */
  async safeRevokeSession(sessionId: string): Promise<{
    success: boolean
    message?: string
    error?: string
  }> {
    try {
      const client = getUserApiClient()
      const result = await client.revokeSession(sessionId)
      return {
        success: true,
        message: result.message
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
}