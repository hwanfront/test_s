/**
 * User Profile Service (Task T087)
 * 
 * Business logic service for user profile management
 * following Feature-Sliced Design principles
 */

import {
  type UserProfile,
  type UserEntity,
  type CreateUserInput,
  type UpdateUserInput,
  type UpdateUserPreferencesInput,
  type UserQueryFilters,
  type UserStats,
  type OAuthAccount,
  type UserSession,
  UserModelValidator,
  UserModelUtils,
  UserValidationError,
  USER_ROLES,
  USER_STATUS,
  type UserRole,
  type UserStatus
} from '../model'

/**
 * User service configuration
 */
export interface UserServiceConfig {
  maxSessionsPerUser?: number
  sessionExpiryDays?: number
  enableEmailVerification?: boolean
  defaultQuotaLimit?: number
  passwordlessAuth?: boolean
}

const DEFAULT_CONFIG: Required<UserServiceConfig> = {
  maxSessionsPerUser: 5,
  sessionExpiryDays: 30,
  enableEmailVerification: true,
  defaultQuotaLimit: 10,
  passwordlessAuth: true
}

/**
 * User operation results
 */
export interface UserOperationResult<T = UserProfile> {
  success: boolean
  data?: T
  error?: string
  code?: string
}

export interface UserListResult {
  users: UserProfile[]
  total: number
  page: number
  limit: number
  hasMore: boolean
}

export interface UserStatsResult {
  userId: string
  stats: UserStats
  trends: {
    dailyUsage: number[]
    weeklyUsage: number[]
    monthlyUsage: number[]
  }
  insights: {
    mostActiveDay: string
    averageSessionTime: number
    preferredFeatures: string[]
  }
}

/**
 * User session management result
 */
export interface SessionManagementResult {
  activeSessions: UserSession[]
  expiredSessions: UserSession[]
  totalSessions: number
  cleanedSessions: number
}

/**
 * User service errors
 */
export class UserServiceError extends Error {
  constructor(
    message: string,
    public code: string = 'USER_SERVICE_ERROR',
    public statusCode: number = 500
  ) {
    super(message)
    this.name = 'UserServiceError'
  }
}

/**
 * Main user profile service
 */
export class UserProfileService {
  private config: Required<UserServiceConfig>

  constructor(config: UserServiceConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * Creates a new user profile
   */
  async createUser(userData: CreateUserInput): Promise<UserOperationResult<UserEntity>> {
    try {
      // Validate input
      const validatedData = UserModelValidator.validateCreateInput(userData)
      
      // Create user profile
      const now = new Date()
      const userProfile: UserProfile = {
        id: crypto.randomUUID(),
        email: validatedData.email,
        name: validatedData.name,
        avatar: validatedData.avatar,
        role: validatedData.role,
        status: USER_STATUS.PENDING,
        emailVerified: validatedData.emailVerified,
        createdAt: now,
        updatedAt: now
      }

      // Create complete user entity
      const userEntity = UserModelUtils.createUserEntity(userProfile)

      return {
        success: true,
        data: userEntity
      }
    } catch (error) {
      if (error instanceof UserValidationError) {
        return {
          success: false,
          error: error.message,
          code: error.code
        }
      }
      
      return {
        success: false,
        error: 'Failed to create user',
        code: 'USER_CREATION_FAILED'
      }
    }
  }

  /**
   * Updates user profile information
   */
  async updateUser(
    userId: string,
    updates: UpdateUserInput
  ): Promise<UserOperationResult<UserProfile>> {
    try {
      // Validate updates
      const validatedUpdates = UserModelValidator.validateUpdateInput(updates)
      
      // Note: In real implementation, this would fetch from database
      // For now, we'll simulate the update operation
      const updatedProfile: UserProfile = {
        id: userId,
        email: 'user@example.com', // Would come from existing profile
        name: validatedUpdates.name || 'User Name',
        avatar: validatedUpdates.avatar,
        role: validatedUpdates.role || USER_ROLES.USER,
        status: validatedUpdates.status || USER_STATUS.ACTIVE,
        emailVerified: validatedUpdates.emailVerified ?? true,
        createdAt: new Date('2024-01-01'), // Would come from existing profile
        updatedAt: new Date()
      }

      return {
        success: true,
        data: updatedProfile
      }
    } catch (error) {
      if (error instanceof UserValidationError) {
        return {
          success: false,
          error: error.message,
          code: error.code
        }
      }
      
      return {
        success: false,
        error: 'Failed to update user',
        code: 'USER_UPDATE_FAILED'
      }
    }
  }

  /**
   * Updates user preferences
   */
  async updateUserPreferences(
    userId: string,
    preferences: UpdateUserPreferencesInput
  ): Promise<UserOperationResult<any>> {
    try {
      // Validate preferences
      const validatedPreferences = preferences // Simple validation for now
      
      // In real implementation, this would update in database
      return {
        success: true,
        data: validatedPreferences
      }
    } catch (error) {
      return {
        success: false,
        error: 'Failed to update preferences',
        code: 'PREFERENCES_UPDATE_FAILED'
      }
    }
  }

  /**
   * Gets user profile by ID
   */
  async getUserById(userId: string): Promise<UserOperationResult<UserEntity>> {
    try {
      // Validate userId format
      if (!userId || typeof userId !== 'string') {
        throw new UserServiceError('Invalid user ID', 'INVALID_USER_ID', 400)
      }

      // Note: In real implementation, this would fetch from database
      // For now, return a mock user entity
      const mockProfile: UserProfile = {
        id: userId,
        email: 'user@example.com',
        name: 'User Name',
        role: USER_ROLES.USER,
        status: USER_STATUS.ACTIVE,
        emailVerified: true,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date()
      }

      const userEntity = UserModelUtils.createUserEntity(mockProfile)

      return {
        success: true,
        data: userEntity
      }
    } catch (error) {
      if (error instanceof UserServiceError) {
        return {
          success: false,
          error: error.message,
          code: error.code
        }
      }
      
      return {
        success: false,
        error: 'Failed to get user',
        code: 'USER_FETCH_FAILED'
      }
    }
  }

  /**
   * Gets user profile by email
   */
  async getUserByEmail(email: string): Promise<UserOperationResult<UserEntity>> {
    try {
      // Validate email format
      if (!email || !email.includes('@')) {
        throw new UserServiceError('Invalid email format', 'INVALID_EMAIL', 400)
      }

      // Note: In real implementation, this would query database by email
      const mockProfile: UserProfile = {
        id: crypto.randomUUID(),
        email: email,
        name: 'User Name',
        role: USER_ROLES.USER,
        status: USER_STATUS.ACTIVE,
        emailVerified: true,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date()
      }

      const userEntity = UserModelUtils.createUserEntity(mockProfile)

      return {
        success: true,
        data: userEntity
      }
    } catch (error) {
      if (error instanceof UserServiceError) {
        return {
          success: false,
          error: error.message,
          code: error.code
        }
      }
      
      return {
        success: false,
        error: 'Failed to find user by email',
        code: 'USER_EMAIL_FETCH_FAILED'
      }
    }
  }

  /**
   * Lists users with filtering and pagination
   */
  async listUsers(
    filters: UserQueryFilters = {},
    page: number = 1,
    limit: number = 20
  ): Promise<UserOperationResult<UserListResult>> {
    try {
      // Validate filters
      const validatedFilters = UserModelValidator.validateQueryFilters(filters)
      
      // Validate pagination
      if (page < 1 || limit < 1 || limit > 100) {
        throw new UserServiceError('Invalid pagination parameters', 'INVALID_PAGINATION', 400)
      }

      // Note: In real implementation, this would query database with filters
      // For now, return mock data
      const mockUsers: UserProfile[] = [
        {
          id: crypto.randomUUID(),
          email: 'user1@example.com',
          name: 'User One',
          role: USER_ROLES.USER,
          status: USER_STATUS.ACTIVE,
          emailVerified: true,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date()
        },
        {
          id: crypto.randomUUID(),
          email: 'user2@example.com',
          name: 'User Two',
          role: USER_ROLES.USER,
          status: USER_STATUS.ACTIVE,
          emailVerified: true,
          createdAt: new Date('2024-01-02'),
          updatedAt: new Date()
        }
      ]

      return {
        success: true,
        data: {
          users: mockUsers,
          total: mockUsers.length,
          page,
          limit,
          hasMore: false
        }
      }
    } catch (error) {
      if (error instanceof UserServiceError) {
        return {
          success: false,
          error: error.message,
          code: error.code
        }
      }
      
      return {
        success: false,
        error: 'Failed to list users',
        code: 'USER_LIST_FAILED'
      }
    }
  }

  /**
   * Deactivates a user account
   */
  async deactivateUser(userId: string): Promise<UserOperationResult<any>> {
    try {
      if (!userId) {
        throw new UserServiceError('User ID is required', 'MISSING_USER_ID', 400)
      }

      // Note: In real implementation, this would update status in database
      return {
        success: true,
        data: `User ${userId} deactivated successfully`
      }
    } catch (error) {
      if (error instanceof UserServiceError) {
        return {
          success: false,
          error: error.message,
          code: error.code
        }
      }
      
      return {
        success: false,
        error: 'Failed to deactivate user',
        code: 'USER_DEACTIVATION_FAILED'
      }
    }
  }

  /**
   * Reactivates a user account
   */
  async reactivateUser(userId: string): Promise<UserOperationResult<any>> {
    try {
      if (!userId) {
        throw new UserServiceError('User ID is required', 'MISSING_USER_ID', 400)
      }

      // Note: In real implementation, this would update status in database
      return {
        success: true,
        data: `User ${userId} reactivated successfully`
      }
    } catch (error) {
      if (error instanceof UserServiceError) {
        return {
          success: false,
          error: error.message,
          code: error.code
        }
      }
      
      return {
        success: false,
        error: 'Failed to reactivate user',
        code: 'USER_REACTIVATION_FAILED'
      }
    }
  }

  /**
   * Deletes a user account permanently
   */
  async deleteUser(userId: string): Promise<UserOperationResult<any>> {
    try {
      if (!userId) {
        throw new UserServiceError('User ID is required', 'MISSING_USER_ID', 400)
      }

      // Note: In real implementation, this would:
      // 1. Clean up user sessions
      // 2. Remove OAuth accounts
      // 3. Archive user data
      // 4. Delete user record

      return {
        success: true,
        data: `User ${userId} deleted successfully`
      }
    } catch (error) {
      if (error instanceof UserServiceError) {
        return {
          success: false,
          error: error.message,
          code: error.code
        }
      }
      
      return {
        success: false,
        error: 'Failed to delete user',
        code: 'USER_DELETION_FAILED'
      }
    }
  }

  /**
   * Gets user statistics and analytics
   */
  async getUserStats(userId: string): Promise<UserOperationResult<UserStatsResult>> {
    try {
      if (!userId) {
        throw new UserServiceError('User ID is required', 'MISSING_USER_ID', 400)
      }

      // Note: In real implementation, this would calculate from database
      const mockStats: UserStatsResult = {
        userId,
        stats: {
          userId,
          totalAnalyses: 45,
          analysesThisMonth: 12,
          quotaUsageToday: 3,
          streakDays: 7,
          lastAnalysisAt: new Date(),
          averageAnalysisTime: 120, // 2 minutes
          favoriteAnalysisType: 'sentiment',
          totalQuotaUsed: 234,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date()
        },
        trends: {
          dailyUsage: [2, 3, 1, 4, 2, 3, 3],
          weeklyUsage: [15, 18, 12, 20],
          monthlyUsage: [45, 52, 38, 60, 42]
        },
        insights: {
          mostActiveDay: 'Wednesday',
          averageSessionTime: 1800, // 30 minutes
          preferredFeatures: ['sentiment analysis', 'text classification', 'entity extraction']
        }
      }

      return {
        success: true,
        data: mockStats
      }
    } catch (error) {
      if (error instanceof UserServiceError) {
        return {
          success: false,
          error: error.message,
          code: error.code
        }
      }
      
      return {
        success: false,
        error: 'Failed to get user stats',
        code: 'USER_STATS_FAILED'
      }
    }
  }

  /**
   * Manages user sessions (cleanup expired, limit active sessions)
   */
  async manageUserSessions(userId: string): Promise<UserOperationResult<SessionManagementResult>> {
    try {
      if (!userId) {
        throw new UserServiceError('User ID is required', 'MISSING_USER_ID', 400)
      }

      const now = new Date()
      
      // Note: In real implementation, this would work with actual session data
      const mockResult: SessionManagementResult = {
        activeSessions: [],
        expiredSessions: [],
        totalSessions: 0,
        cleanedSessions: 0
      }

      return {
        success: true,
        data: mockResult
      }
    } catch (error) {
      if (error instanceof UserServiceError) {
        return {
          success: false,
          error: error.message,
          code: error.code
        }
      }
      
      return {
        success: false,
        error: 'Failed to manage user sessions',
        code: 'SESSION_MANAGEMENT_FAILED'
      }
    }
  }

  /**
   * Validates user permissions for specific actions
   */
  validateUserPermissions(
    user: UserProfile,
    action: string,
    resource?: string
  ): { allowed: boolean; reason?: string } {
    try {
      // Check if user is active
      if (!UserModelValidator.isUserActive(user)) {
        return {
          allowed: false,
          reason: 'User account is not active or email not verified'
        }
      }

      // Basic permission checks based on action
      switch (action) {
        case 'create_analysis':
          return { allowed: true }
        
        case 'view_analytics':
          return { allowed: user.role !== USER_ROLES.GUEST }
        
        case 'admin_access':
          return { 
            allowed: UserModelValidator.hasPermission(user, USER_ROLES.ADMIN),
            reason: !UserModelValidator.hasPermission(user, USER_ROLES.ADMIN) 
              ? 'Admin privileges required' 
              : undefined
          }
        
        case 'manage_users':
          return { 
            allowed: UserModelValidator.hasPermission(user, USER_ROLES.ADMIN),
            reason: !UserModelValidator.hasPermission(user, USER_ROLES.ADMIN) 
              ? 'Admin privileges required' 
              : undefined
          }
        
        default:
          return { allowed: true }
      }
    } catch (error) {
      return {
        allowed: false,
        reason: 'Permission validation failed'
      }
    }
  }

  /**
   * Updates service configuration
   */
  updateConfig(newConfig: Partial<UserServiceConfig>): void {
    this.config = { ...this.config, ...newConfig }
  }

  /**
   * Gets current service configuration
   */
  getConfig(): Required<UserServiceConfig> {
    return { ...this.config }
  }
}

/**
 * User profile utilities for common operations
 */
export class UserProfileUtils {
  /**
   * Generates user avatar URL or initials fallback
   */
  static getAvatarDisplay(user: UserProfile): {
    type: 'url' | 'initials'
    value: string
  } {
    if (user.avatar) {
      return {
        type: 'url',
        value: user.avatar
      }
    }

    return {
      type: 'initials',
      value: UserModelValidator.getUserInitials(user)
    }
  }

  /**
   * Checks if user profile is complete
   */
  static isProfileComplete(user: UserProfile): {
    complete: boolean
    missing: string[]
  } {
    const missing: string[] = []

    if (!user.name || user.name.trim().length === 0) {
      missing.push('name')
    }

    if (!user.emailVerified) {
      missing.push('email verification')
    }

    return {
      complete: missing.length === 0,
      missing
    }
  }

  /**
   * Calculates user account age
   */
  static getAccountAge(user: UserProfile): {
    days: number
    months: number
    years: number
    formatted: string
  } {
    const now = new Date()
    const created = new Date(user.createdAt)
    const diffMs = now.getTime() - created.getTime()
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    const months = Math.floor(days / 30)
    const years = Math.floor(days / 365)

    let formatted = ''
    if (years > 0) {
      formatted = `${years} year${years !== 1 ? 's' : ''}`
    } else if (months > 0) {
      formatted = `${months} month${months !== 1 ? 's' : ''}`
    } else {
      formatted = `${days} day${days !== 1 ? 's' : ''}`
    }

    return { days, months, years, formatted }
  }

  /**
   * Formats user activity status
   */
  static getActivityStatus(user: UserProfile): {
    status: 'online' | 'recent' | 'away' | 'inactive'
    lastSeen?: string
  } {
    if (!user.lastLoginAt) {
      return { status: 'inactive' }
    }

    const now = new Date()
    const lastLogin = new Date(user.lastLoginAt)
    const diffHours = (now.getTime() - lastLogin.getTime()) / (1000 * 60 * 60)

    if (diffHours < 1) {
      return { status: 'online' }
    } else if (diffHours < 24) {
      return { status: 'recent', lastSeen: 'today' }
    } else if (diffHours < 168) { // 1 week
      return { status: 'away', lastSeen: 'this week' }
    } else {
      return { status: 'inactive', lastSeen: 'over a week ago' }
    }
  }
}

/**
 * Global user service instance
 */
let globalUserService: UserProfileService | null = null

/**
 * Gets or creates the global user service
 */
export function getUserProfileService(config?: UserServiceConfig): UserProfileService {
  if (!globalUserService) {
    globalUserService = new UserProfileService(config)
  }
  return globalUserService
}

/**
 * Convenience functions for common user operations
 */
export const userProfileApi = {
  /**
   * Quick user creation
   */
  async createUser(userData: CreateUserInput): Promise<UserOperationResult<UserEntity>> {
    const service = getUserProfileService()
    return service.createUser(userData)
  },

  /**
   * Quick user lookup by ID
   */
  async getUser(userId: string): Promise<UserOperationResult<UserEntity>> {
    const service = getUserProfileService()
    return service.getUserById(userId)
  },

  /**
   * Quick user lookup by email
   */
  async findByEmail(email: string): Promise<UserOperationResult<UserEntity>> {
    const service = getUserProfileService()
    return service.getUserByEmail(email)
  },

  /**
   * Quick permission check
   */
  checkPermission(user: UserProfile, action: string): boolean {
    const service = getUserProfileService()
    return service.validateUserPermissions(user, action).allowed
  },

  /**
   * Quick profile update
   */
  async updateProfile(userId: string, updates: UpdateUserInput): Promise<UserOperationResult<UserProfile>> {
    const service = getUserProfileService()
    return service.updateUser(userId, updates)
  }
}