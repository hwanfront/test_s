/**
 * User Session Management Service (Task T088)
 * 
 * Handles user session lifecycle, validation, and security
 * following Feature-Sliced Design principles
 */

import {
  type UserSession,
  type CreateUserSessionInput,
  UserModelValidator,
  UserValidationError
} from '../model'

/**
 * Session service configuration
 */
export interface SessionServiceConfig {
  maxSessionsPerUser?: number
  sessionExpiryDays?: number
  cleanupIntervalHours?: number
  enableConcurrentSessions?: boolean
  extendSessionOnActivity?: boolean
  sessionSecurityChecks?: boolean
}

const DEFAULT_CONFIG: Required<SessionServiceConfig> = {
  maxSessionsPerUser: 5,
  sessionExpiryDays: 30,
  cleanupIntervalHours: 24,
  enableConcurrentSessions: true,
  extendSessionOnActivity: true,
  sessionSecurityChecks: true
}

/**
 * Session operation results
 */
export interface SessionOperationResult<T = UserSession> {
  success: boolean
  data?: T
  error?: string
  code?: string
}

export interface SessionListResult {
  sessions: UserSession[]
  activeSessions: UserSession[]
  expiredSessions: UserSession[]
  totalCount: number
}

export interface SessionValidationResult {
  valid: boolean
  session?: UserSession
  reason?: string
  suggestedAction?: 'refresh' | 'login' | 'none'
}

export interface SessionCleanupResult {
  cleaned: number
  remaining: number
  errors: string[]
}

/**
 * Session security result
 */
export interface SessionSecurityCheck {
  secure: boolean
  warnings: string[]
  recommendations: string[]
  riskLevel: 'low' | 'medium' | 'high'
}

/**
 * Session activity tracking
 */
export interface SessionActivity {
  sessionId: string
  userId: string
  activity: 'login' | 'logout' | 'refresh' | 'activity' | 'expired'
  timestamp: Date
  userAgent?: string
  ipAddress?: string
  metadata?: Record<string, any>
}

/**
 * Session service errors
 */
export class SessionServiceError extends Error {
  constructor(
    message: string,
    public code: string = 'SESSION_ERROR',
    public statusCode: number = 500
  ) {
    super(message)
    this.name = 'SessionServiceError'
  }
}

/**
 * Main user session management service
 */
export class UserSessionService {
  private config: Required<SessionServiceConfig>
  private cleanupTimer?: NodeJS.Timeout

  constructor(config: SessionServiceConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.startCleanupTimer()
  }

  /**
   * Creates a new user session
   */
  async createSession(
    sessionData: CreateUserSessionInput
  ): Promise<SessionOperationResult<UserSession>> {
    try {
      // Validate session data
      const validatedData = this.validateSessionInput(sessionData)
      
      // Check user session limits
      const currentSessions = await this.getUserSessions(validatedData.userId)
      if (currentSessions.success && currentSessions.data) {
        const activeSessions = currentSessions.data.activeSessions
        
        if (!this.config.enableConcurrentSessions && activeSessions.length > 0) {
          return {
            success: false,
            error: 'Concurrent sessions not allowed',
            code: 'CONCURRENT_SESSION_DENIED'
          }
        }
        
        if (activeSessions.length >= this.config.maxSessionsPerUser) {
          // Expire oldest session
          await this.expireOldestSession(validatedData.userId)
        }
      }

      // Create new session
      const session: UserSession = {
        id: crypto.randomUUID(),
        userId: validatedData.userId,
        sessionToken: this.generateSessionToken(),
        expiresAt: new Date(Date.now() + this.config.sessionExpiryDays * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
        updatedAt: new Date(),
        userAgent: validatedData.userAgent,
        ipAddress: validatedData.ipAddress,
        isActive: true
      }

      // Log session activity
      await this.logSessionActivity({
        sessionId: session.id,
        userId: session.userId,
        activity: 'login',
        timestamp: new Date(),
        userAgent: session.userAgent,
        ipAddress: session.ipAddress
      })

      return {
        success: true,
        data: session
      }
    } catch (error) {
      if (error instanceof SessionServiceError || error instanceof UserValidationError) {
        return {
          success: false,
          error: error.message,
          code: error instanceof SessionServiceError ? error.code : 'VALIDATION_ERROR'
        }
      }
      
      return {
        success: false,
        error: 'Failed to create session',
        code: 'SESSION_CREATION_FAILED'
      }
    }
  }

  /**
   * Validates a session token
   */
  async validateSession(sessionToken: string): Promise<SessionValidationResult> {
    try {
      if (!sessionToken || typeof sessionToken !== 'string') {
        return {
          valid: false,
          reason: 'Invalid session token format',
          suggestedAction: 'login'
        }
      }

      // Note: In real implementation, this would query database
      // For now, simulate session lookup
      const session = await this.getSessionByToken(sessionToken)
      
      if (!session) {
        return {
          valid: false,
          reason: 'Session not found',
          suggestedAction: 'login'
        }
      }

      // Check if session is active
      if (!session.isActive) {
        return {
          valid: false,
          reason: 'Session is inactive',
          suggestedAction: 'login'
        }
      }

      // Check if session is expired
      if (session.expiresAt <= new Date()) {
        await this.expireSession(session.id)
        return {
          valid: false,
          reason: 'Session expired',
          suggestedAction: 'refresh'
        }
      }

      // Extend session if configured
      if (this.config.extendSessionOnActivity) {
        await this.extendSession(session.id)
      }

      // Log activity
      await this.logSessionActivity({
        sessionId: session.id,
        userId: session.userId,
        activity: 'activity',
        timestamp: new Date()
      })

      return {
        valid: true,
        session: session
      }
    } catch (error) {
      return {
        valid: false,
        reason: 'Session validation failed',
        suggestedAction: 'login'
      }
    }
  }

  /**
   * Refreshes a session (extends expiry)
   */
  async refreshSession(sessionToken: string): Promise<SessionOperationResult<UserSession>> {
    try {
      const validation = await this.validateSession(sessionToken)
      
      if (!validation.valid || !validation.session) {
        return {
          success: false,
          error: validation.reason || 'Session refresh failed',
          code: 'SESSION_REFRESH_FAILED'
        }
      }

      const session = validation.session
      const newExpiryDate = new Date(Date.now() + this.config.sessionExpiryDays * 24 * 60 * 60 * 1000)
      
      const refreshedSession: UserSession = {
        ...session,
        expiresAt: newExpiryDate,
        updatedAt: new Date()
      }

      // Log refresh activity
      await this.logSessionActivity({
        sessionId: session.id,
        userId: session.userId,
        activity: 'refresh',
        timestamp: new Date()
      })

      return {
        success: true,
        data: refreshedSession
      }
    } catch (error) {
      return {
        success: false,
        error: 'Failed to refresh session',
        code: 'SESSION_REFRESH_FAILED'
      }
    }
  }

  /**
   * Expires a session (logs out)
   */
  async expireSession(sessionId: string): Promise<SessionOperationResult<any>> {
    try {
      if (!sessionId) {
        throw new SessionServiceError('Session ID is required', 'MISSING_SESSION_ID', 400)
      }

      // Note: In real implementation, this would update database
      // Log logout activity
      await this.logSessionActivity({
        sessionId: sessionId,
        userId: 'unknown', // Would be fetched from session
        activity: 'logout',
        timestamp: new Date()
      })

      return {
        success: true,
        data: 'Session expired successfully'
      }
    } catch (error) {
      if (error instanceof SessionServiceError) {
        return {
          success: false,
          error: error.message,
          code: error.code
        }
      }
      
      return {
        success: false,
        error: 'Failed to expire session',
        code: 'SESSION_EXPIRY_FAILED'
      }
    }
  }

  /**
   * Expires all sessions for a user
   */
  async expireAllUserSessions(userId: string): Promise<SessionOperationResult<any>> {
    try {
      if (!userId) {
        throw new SessionServiceError('User ID is required', 'MISSING_USER_ID', 400)
      }

      // Note: In real implementation, this would update all user sessions in database
      const expiredCount = 0 // Would be actual count from database

      // Log logout activity for all sessions
      await this.logSessionActivity({
        sessionId: 'bulk-logout',
        userId: userId,
        activity: 'logout',
        timestamp: new Date(),
        metadata: { type: 'bulk', count: expiredCount }
      })

      return {
        success: true,
        data: `Expired ${expiredCount} sessions for user ${userId}`
      }
    } catch (error) {
      if (error instanceof SessionServiceError) {
        return {
          success: false,
          error: error.message,
          code: error.code
        }
      }
      
      return {
        success: false,
        error: 'Failed to expire user sessions',
        code: 'BULK_SESSION_EXPIRY_FAILED'
      }
    }
  }

  /**
   * Gets all sessions for a user
   */
  async getUserSessions(userId: string): Promise<SessionOperationResult<SessionListResult>> {
    try {
      if (!userId) {
        throw new SessionServiceError('User ID is required', 'MISSING_USER_ID', 400)
      }

      // Note: In real implementation, this would query database
      // For now, return mock data
      const mockSessions: UserSession[] = []
      const activeSessions = mockSessions.filter(s => s.isActive && s.expiresAt > new Date())
      const expiredSessions = mockSessions.filter(s => !s.isActive || s.expiresAt <= new Date())

      return {
        success: true,
        data: {
          sessions: mockSessions,
          activeSessions,
          expiredSessions,
          totalCount: mockSessions.length
        }
      }
    } catch (error) {
      if (error instanceof SessionServiceError) {
        return {
          success: false,
          error: error.message,
          code: error.code
        }
      }
      
      return {
        success: false,
        error: 'Failed to get user sessions',
        code: 'SESSION_FETCH_FAILED'
      }
    }
  }

  /**
   * Performs security check on session
   */
  async performSecurityCheck(
    session: UserSession,
    currentUserAgent?: string,
    currentIpAddress?: string
  ): Promise<SessionSecurityCheck> {
    try {
      const warnings: string[] = []
      const recommendations: string[] = []
      let riskLevel: 'low' | 'medium' | 'high' = 'low'

      if (!this.config.sessionSecurityChecks) {
        return {
          secure: true,
          warnings: [],
          recommendations: [],
          riskLevel: 'low'
        }
      }

      // Check user agent changes
      if (session.userAgent && currentUserAgent && session.userAgent !== currentUserAgent) {
        warnings.push('User agent has changed since session creation')
        recommendations.push('Verify the session on a trusted device')
        riskLevel = 'medium'
      }

      // Check IP address changes
      if (session.ipAddress && currentIpAddress && session.ipAddress !== currentIpAddress) {
        warnings.push('IP address has changed since session creation')
        recommendations.push('Re-authenticate to verify identity')
        riskLevel = 'high'
      }

      // Check session age
      const sessionAge = Date.now() - session.createdAt.getTime()
      const maxAge = this.config.sessionExpiryDays * 24 * 60 * 60 * 1000
      
      if (sessionAge > maxAge * 0.8) {
        warnings.push('Session is approaching expiry')
        recommendations.push('Refresh session to maintain access')
      }

      // Check for suspicious activity patterns
      // Note: In real implementation, this would analyze activity logs
      
      return {
        secure: warnings.length === 0,
        warnings,
        recommendations,
        riskLevel
      }
    } catch (error) {
      return {
        secure: false,
        warnings: ['Security check failed'],
        recommendations: ['Re-authenticate for security'],
        riskLevel: 'high'
      }
    }
  }

  /**
   * Cleans up expired sessions
   */
  async cleanupExpiredSessions(): Promise<SessionCleanupResult> {
    try {
      // Note: In real implementation, this would clean up database
      const cleaned = 0 // Would be actual count from database cleanup
      const remaining = 0 // Would be count of remaining sessions
      const errors: string[] = []

      return {
        cleaned,
        remaining,
        errors
      }
    } catch (error) {
      return {
        cleaned: 0,
        remaining: 0,
        errors: [error instanceof Error ? error.message : 'Cleanup failed']
      }
    }
  }

  /**
   * Private helper methods
   */

  private validateSessionInput(data: CreateUserSessionInput): CreateUserSessionInput {
    // Basic validation - in real implementation would use schema validation
    if (!data.userId || !data.sessionToken || !data.expiresAt) {
      throw new SessionServiceError('Missing required session data', 'INVALID_SESSION_DATA', 400)
    }
    return data
  }

  private generateSessionToken(): string {
    // Generate a secure random session token
    const array = new Uint8Array(32)
    crypto.getRandomValues(array)
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
  }

  private async getSessionByToken(token: string): Promise<UserSession | null> {
    // Note: In real implementation, this would query database
    // For now, return null (session not found)
    return null
  }

  private async extendSession(sessionId: string): Promise<void> {
    // Note: In real implementation, this would update session expiry in database
  }

  private async expireOldestSession(userId: string): Promise<void> {
    // Note: In real implementation, this would find and expire oldest session
  }

  private async logSessionActivity(activity: SessionActivity): Promise<void> {
    // Note: In real implementation, this would log to database or analytics service
    console.log('Session activity:', activity)
  }

  private startCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
    }

    const intervalMs = this.config.cleanupIntervalHours * 60 * 60 * 1000
    this.cleanupTimer = setInterval(async () => {
      try {
        await this.cleanupExpiredSessions()
      } catch (error) {
        console.error('Session cleanup failed:', error)
      }
    }, intervalMs)
  }

  /**
   * Updates service configuration
   */
  updateConfig(newConfig: Partial<SessionServiceConfig>): void {
    this.config = { ...this.config, ...newConfig }
    
    // Restart cleanup timer if interval changed
    if (newConfig.cleanupIntervalHours !== undefined) {
      this.startCleanupTimer()
    }
  }

  /**
   * Gets current service configuration
   */
  getConfig(): Required<SessionServiceConfig> {
    return { ...this.config }
  }

  /**
   * Stops the service and cleans up resources
   */
  stop(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = undefined
    }
  }
}

/**
 * Session utilities for common operations
 */
export class SessionUtils {
  /**
   * Checks if session token format is valid
   */
  static isValidTokenFormat(token: string): boolean {
    return typeof token === 'string' && 
           token.length >= 32 && 
           /^[a-f0-9]+$/i.test(token)
  }

  /**
   * Calculates session time remaining
   */
  static getTimeRemaining(session: UserSession): {
    milliseconds: number
    seconds: number
    minutes: number
    hours: number
    days: number
    formatted: string
  } {
    const now = new Date()
    const remaining = session.expiresAt.getTime() - now.getTime()
    
    if (remaining <= 0) {
      return {
        milliseconds: 0,
        seconds: 0,
        minutes: 0,
        hours: 0,
        days: 0,
        formatted: 'Expired'
      }
    }

    const days = Math.floor(remaining / (1000 * 60 * 60 * 24))
    const hours = Math.floor((remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((remaining % (1000 * 60)) / 1000)

    let formatted = ''
    if (days > 0) {
      formatted = `${days}d ${hours}h`
    } else if (hours > 0) {
      formatted = `${hours}h ${minutes}m`
    } else if (minutes > 0) {
      formatted = `${minutes}m`
    } else {
      formatted = `${seconds}s`
    }

    return {
      milliseconds: remaining,
      seconds,
      minutes,
      hours,
      days,
      formatted
    }
  }

  /**
   * Gets session risk level based on age and activity
   */
  static assessSessionRisk(session: UserSession): 'low' | 'medium' | 'high' {
    const now = new Date()
    const age = now.getTime() - session.createdAt.getTime()
    const timeToExpiry = session.expiresAt.getTime() - now.getTime()
    
    // Session expired
    if (timeToExpiry <= 0) {
      return 'high'
    }
    
    // Session very old
    if (age > 7 * 24 * 60 * 60 * 1000) { // 7 days
      return 'high'
    }
    
    // Session close to expiry
    if (timeToExpiry < 24 * 60 * 60 * 1000) { // 1 day
      return 'medium'
    }
    
    return 'low'
  }

  /**
   * Generates session summary for display
   */
  static getSessionSummary(session: UserSession): {
    isActive: boolean
    isExpired: boolean
    ageFormatted: string
    expiryFormatted: string
    riskLevel: 'low' | 'medium' | 'high'
    deviceInfo?: string
  } {
    const timeRemaining = this.getTimeRemaining(session)
    const age = new Date().getTime() - session.createdAt.getTime()
    const ageFormatted = this.formatDuration(age)
    
    return {
      isActive: session.isActive,
      isExpired: timeRemaining.milliseconds <= 0,
      ageFormatted,
      expiryFormatted: timeRemaining.formatted,
      riskLevel: this.assessSessionRisk(session),
      deviceInfo: session.userAgent
    }
  }

  private static formatDuration(ms: number): string {
    const days = Math.floor(ms / (1000 * 60 * 60 * 24))
    const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    
    if (days > 0) {
      return `${days}d ago`
    } else if (hours > 0) {
      return `${hours}h ago`
    } else {
      return 'Recently'
    }
  }
}

/**
 * Global session service instance
 */
let globalSessionService: UserSessionService | null = null

/**
 * Gets or creates the global session service
 */
export function getUserSessionService(config?: SessionServiceConfig): UserSessionService {
  if (!globalSessionService) {
    globalSessionService = new UserSessionService(config)
  }
  return globalSessionService
}

/**
 * Convenience functions for common session operations
 */
export const sessionApi = {
  /**
   * Quick session validation
   */
  async validateToken(token: string): Promise<SessionValidationResult> {
    const service = getUserSessionService()
    return service.validateSession(token)
  },

  /**
   * Quick session creation
   */
  async createUserSession(data: CreateUserSessionInput): Promise<SessionOperationResult<UserSession>> {
    const service = getUserSessionService()
    return service.createSession(data)
  },

  /**
   * Quick session refresh
   */
  async refreshUserSession(token: string): Promise<SessionOperationResult<UserSession>> {
    const service = getUserSessionService()
    return service.refreshSession(token)
  },

  /**
   * Quick session logout
   */
  async logoutSession(sessionId: string): Promise<SessionOperationResult<any>> {
    const service = getUserSessionService()
    return service.expireSession(sessionId)
  },

  /**
   * Quick security check
   */
  async checkSecurity(
    session: UserSession,
    userAgent?: string,
    ipAddress?: string
  ): Promise<SessionSecurityCheck> {
    const service = getUserSessionService()
    return service.performSecurityCheck(session, userAgent, ipAddress)
  }
}