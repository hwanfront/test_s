/**
 * User Entity Model (Task T087)
 * 
 * Core user entity following Feature-Sliced Design principles
 * Implements user authentication state and profile management
 */

import { z } from 'zod'

/**
 * User role enumeration
 */
export const USER_ROLES = {
  ADMIN: 'admin',
  USER: 'user',
  GUEST: 'guest'
} as const

export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES]

/**
 * User account status enumeration
 */
export const USER_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  SUSPENDED: 'suspended',
  PENDING: 'pending'
} as const

export type UserStatus = typeof USER_STATUS[keyof typeof USER_STATUS]

/**
 * OAuth provider enumeration
 */
export const OAUTH_PROVIDERS = {
  GOOGLE: 'google',
  GITHUB: 'github',
  DISCORD: 'discord'
} as const

export type OAuthProvider = typeof OAUTH_PROVIDERS[keyof typeof OAUTH_PROVIDERS]

/**
 * Core user profile schema
 */
export const UserProfileSchema = z.object({
  id: z.string().uuid('Invalid user ID format'),
  email: z.string().email('Invalid email format'),
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  avatar: z.string().url('Invalid avatar URL').optional(),
  role: z.enum([USER_ROLES.ADMIN, USER_ROLES.USER, USER_ROLES.GUEST]),
  status: z.enum([USER_STATUS.ACTIVE, USER_STATUS.INACTIVE, USER_STATUS.SUSPENDED, USER_STATUS.PENDING]),
  emailVerified: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  lastLoginAt: z.coerce.date().optional()
})

export type UserProfile = z.infer<typeof UserProfileSchema>

/**
 * OAuth account information schema
 */
export const OAuthAccountSchema = z.object({
  id: z.string(),
  userId: z.string().uuid(),
  provider: z.enum([OAUTH_PROVIDERS.GOOGLE, OAUTH_PROVIDERS.GITHUB, OAUTH_PROVIDERS.DISCORD]),
  providerUserId: z.string(),
  email: z.string().email(),
  name: z.string().optional(),
  avatar: z.string().url().optional(),
  accessToken: z.string(),
  refreshToken: z.string().optional(),
  expiresAt: z.coerce.date().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date()
})

export type OAuthAccount = z.infer<typeof OAuthAccountSchema>

/**
 * User session information schema
 */
export const UserSessionSchema = z.object({
  id: z.string(),
  userId: z.string().uuid(),
  sessionToken: z.string(),
  expiresAt: z.coerce.date(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  userAgent: z.string().optional(),
  ipAddress: z.string().optional(),
  isActive: z.boolean().default(true)
})

export type UserSession = z.infer<typeof UserSessionSchema>

/**
 * User preferences schema
 */
export const UserPreferencesSchema = z.object({
  userId: z.string().uuid(),
  theme: z.enum(['light', 'dark', 'system']).default('system'),
  language: z.string().default('en'),
  timezone: z.string().default('UTC'),
  emailNotifications: z.boolean().default(true),
  analysisNotifications: z.boolean().default(true),
  quotaWarnings: z.boolean().default(true),
  marketingEmails: z.boolean().default(false),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date()
})

export type UserPreferences = z.infer<typeof UserPreferencesSchema>

/**
 * User statistics schema
 */
export const UserStatsSchema = z.object({
  userId: z.string().uuid(),
  totalAnalyses: z.number().int().min(0).default(0),
  analysesThisMonth: z.number().int().min(0).default(0),
  quotaUsageToday: z.number().int().min(0).default(0),
  streakDays: z.number().int().min(0).default(0),
  lastAnalysisAt: z.coerce.date().optional(),
  averageAnalysisTime: z.number().min(0).optional(), // in seconds
  favoriteAnalysisType: z.string().optional(),
  totalQuotaUsed: z.number().int().min(0).default(0),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date()
})

export type UserStats = z.infer<typeof UserStatsSchema>

/**
 * Complete user entity with all related data
 */
export const UserEntitySchema = z.object({
  profile: UserProfileSchema,
  oauthAccounts: z.array(OAuthAccountSchema).default([]),
  sessions: z.array(UserSessionSchema).default([]),
  preferences: UserPreferencesSchema.optional(),
  stats: UserStatsSchema.optional()
})

export type UserEntity = z.infer<typeof UserEntitySchema>

/**
 * User creation input schema
 */
export const CreateUserSchema = z.object({
  email: z.string().email('Invalid email format'),
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  avatar: z.string().url('Invalid avatar URL').optional(),
  role: z.enum([USER_ROLES.ADMIN, USER_ROLES.USER, USER_ROLES.GUEST]).default(USER_ROLES.USER),
  emailVerified: z.boolean().default(false)
})

export type CreateUserInput = z.infer<typeof CreateUserSchema>

/**
 * User update input schema
 */
export const UpdateUserSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long').optional(),
  avatar: z.string().url('Invalid avatar URL').optional(),
  role: z.enum([USER_ROLES.ADMIN, USER_ROLES.USER, USER_ROLES.GUEST]).optional(),
  status: z.enum([USER_STATUS.ACTIVE, USER_STATUS.INACTIVE, USER_STATUS.SUSPENDED, USER_STATUS.PENDING]).optional(),
  emailVerified: z.boolean().optional()
})

export type UpdateUserInput = z.infer<typeof UpdateUserSchema>

/**
 * OAuth account creation schema
 */
export const CreateOAuthAccountSchema = z.object({
  userId: z.string().uuid(),
  provider: z.enum([OAUTH_PROVIDERS.GOOGLE, OAUTH_PROVIDERS.GITHUB, OAUTH_PROVIDERS.DISCORD]),
  providerUserId: z.string(),
  email: z.string().email(),
  name: z.string().optional(),
  avatar: z.string().url().optional(),
  accessToken: z.string(),
  refreshToken: z.string().optional(),
  expiresAt: z.coerce.date().optional()
})

export type CreateOAuthAccountInput = z.infer<typeof CreateOAuthAccountSchema>

/**
 * User session creation schema
 */
export const CreateUserSessionSchema = z.object({
  userId: z.string().uuid(),
  sessionToken: z.string(),
  expiresAt: z.coerce.date(),
  userAgent: z.string().optional(),
  ipAddress: z.string().optional()
})

export type CreateUserSessionInput = z.infer<typeof CreateUserSessionSchema>

/**
 * User preferences update schema
 */
export const UpdateUserPreferencesSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']).optional(),
  language: z.string().optional(),
  timezone: z.string().optional(),
  emailNotifications: z.boolean().optional(),
  analysisNotifications: z.boolean().optional(),
  quotaWarnings: z.boolean().optional(),
  marketingEmails: z.boolean().optional()
})

export type UpdateUserPreferencesInput = z.infer<typeof UpdateUserPreferencesSchema>

/**
 * User query filters schema
 */
export const UserQueryFiltersSchema = z.object({
  role: z.enum([USER_ROLES.ADMIN, USER_ROLES.USER, USER_ROLES.GUEST]).optional(),
  status: z.enum([USER_STATUS.ACTIVE, USER_STATUS.INACTIVE, USER_STATUS.SUSPENDED, USER_STATUS.PENDING]).optional(),
  emailVerified: z.boolean().optional(),
  createdAfter: z.coerce.date().optional(),
  createdBefore: z.coerce.date().optional(),
  lastLoginAfter: z.coerce.date().optional(),
  lastLoginBefore: z.coerce.date().optional(),
  hasAnalyses: z.boolean().optional(),
  search: z.string().optional() // Search in name or email
})

export type UserQueryFilters = z.infer<typeof UserQueryFiltersSchema>

/**
 * User validation errors
 */
export class UserValidationError extends Error {
  constructor(
    message: string,
    public field: string,
    public code: string = 'VALIDATION_ERROR'
  ) {
    super(message)
    this.name = 'UserValidationError'
  }
}

/**
 * User model validation utilities
 */
export class UserModelValidator {
  /**
   * Validates user profile data
   */
  static validateProfile(data: unknown): UserProfile {
    try {
      return UserProfileSchema.parse(data)
    } catch (error) {
      if (error instanceof z.ZodError) {
        const firstError = error.issues[0]
        throw new UserValidationError(
          firstError.message,
          firstError.path.join('.'),
          firstError.code
        )
      }
      throw error
    }
  }

  /**
   * Validates user creation input
   */
  static validateCreateInput(data: unknown): CreateUserInput {
    try {
      return CreateUserSchema.parse(data)
    } catch (error) {
      if (error instanceof z.ZodError) {
        const firstError = error.issues[0]
        throw new UserValidationError(
          firstError.message,
          firstError.path.join('.'),
          firstError.code
        )
      }
      throw error
    }
  }

  /**
   * Validates user update input
   */
  static validateUpdateInput(data: unknown): UpdateUserInput {
    try {
      return UpdateUserSchema.parse(data)
    } catch (error) {
      if (error instanceof z.ZodError) {
        const firstError = error.issues[0]
        throw new UserValidationError(
          firstError.message,
          firstError.path.join('.'),
          firstError.code
        )
      }
      throw error
    }
  }

  /**
   * Validates OAuth account data
   */
  static validateOAuthAccount(data: unknown): OAuthAccount {
    try {
      return OAuthAccountSchema.parse(data)
    } catch (error) {
      if (error instanceof z.ZodError) {
        const firstError = error.issues[0]
        throw new UserValidationError(
          firstError.message,
          firstError.path.join('.'),
          firstError.code
        )
      }
      throw error
    }
  }

  /**
   * Validates user session data
   */
  static validateSession(data: unknown): UserSession {
    try {
      return UserSessionSchema.parse(data)
    } catch (error) {
      if (error instanceof z.ZodError) {
        const firstError = error.issues[0]
        throw new UserValidationError(
          firstError.message,
          firstError.path.join('.'),
          firstError.code
        )
      }
      throw error
    }
  }

  /**
   * Validates user preferences data
   */
  static validatePreferences(data: unknown): UserPreferences {
    try {
      return UserPreferencesSchema.parse(data)
    } catch (error) {
      if (error instanceof z.ZodError) {
        const firstError = error.issues[0]
        throw new UserValidationError(
          firstError.message,
          firstError.path.join('.'),
          firstError.code
        )
      }
      throw error
    }
  }

  /**
   * Validates query filters
   */
  static validateQueryFilters(data: unknown): UserQueryFilters {
    try {
      return UserQueryFiltersSchema.parse(data)
    } catch (error) {
      if (error instanceof z.ZodError) {
        const firstError = error.issues[0]
        throw new UserValidationError(
          firstError.message,
          firstError.path.join('.'),
          firstError.code
        )
      }
      throw error
    }
  }

  /**
   * Checks if user has required permissions
   */
  static hasPermission(user: UserProfile, requiredRole: UserRole): boolean {
    const roleHierarchy = {
      [USER_ROLES.GUEST]: 0,
      [USER_ROLES.USER]: 1,
      [USER_ROLES.ADMIN]: 2
    }

    return roleHierarchy[user.role] >= roleHierarchy[requiredRole]
  }

  /**
   * Checks if user is active and can perform actions
   */
  static isUserActive(user: UserProfile): boolean {
    return user.status === USER_STATUS.ACTIVE && user.emailVerified
  }

  /**
   * Gets user display name (fallback to email if no name)
   */
  static getDisplayName(user: UserProfile): string {
    return user.name || user.email.split('@')[0]
  }

  /**
   * Checks if session is valid and not expired
   */
  static isSessionValid(session: UserSession): boolean {
    return session.isActive && session.expiresAt > new Date()
  }

  /**
   * Gets user initials for avatar fallback
   */
  static getUserInitials(user: UserProfile): string {
    const name = user.name || user.email
    return name
      .split(' ')
      .map(part => part.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  /**
   * Formats user role for display
   */
  static formatRole(role: UserRole): string {
    return role.charAt(0).toUpperCase() + role.slice(1)
  }

  /**
   * Formats user status for display
   */
  static formatStatus(status: UserStatus): string {
    return status.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ')
  }
}

/**
 * User model utilities for common operations
 */
export class UserModelUtils {
  /**
   * Creates a new user entity with default values
   */
  static createUserEntity(profile: UserProfile): UserEntity {
    const now = new Date()
    
    return {
      profile,
      oauthAccounts: [],
      sessions: [],
      preferences: {
        userId: profile.id,
        theme: 'system',
        language: 'en',
        timezone: 'UTC',
        emailNotifications: true,
        analysisNotifications: true,
        quotaWarnings: true,
        marketingEmails: false,
        createdAt: now,
        updatedAt: now
      },
      stats: {
        userId: profile.id,
        totalAnalyses: 0,
        analysesThisMonth: 0,
        quotaUsageToday: 0,
        streakDays: 0,
        totalQuotaUsed: 0,
        createdAt: now,
        updatedAt: now
      }
    }
  }

  /**
   * Merges user profile updates
   */
  static updateUserProfile(
    current: UserProfile, 
    updates: UpdateUserInput
  ): UserProfile {
    return {
      ...current,
      ...updates,
      updatedAt: new Date()
    }
  }

  /**
   * Adds OAuth account to user entity
   */
  static addOAuthAccount(
    user: UserEntity,
    account: OAuthAccount
  ): UserEntity {
    return {
      ...user,
      oauthAccounts: [...user.oauthAccounts, account]
    }
  }

  /**
   * Removes OAuth account from user entity
   */
  static removeOAuthAccount(
    user: UserEntity,
    accountId: string
  ): UserEntity {
    return {
      ...user,
      oauthAccounts: user.oauthAccounts.filter(account => account.id !== accountId)
    }
  }

  /**
   * Updates user session list
   */
  static updateUserSessions(
    user: UserEntity,
    sessions: UserSession[]
  ): UserEntity {
    return {
      ...user,
      sessions
    }
  }

  /**
   * Updates user preferences
   */
  static updateUserPreferences(
    user: UserEntity,
    updates: UpdateUserPreferencesInput
  ): UserEntity {
    const currentPreferences = user.preferences || {
      userId: user.profile.id,
      theme: 'system',
      language: 'en',
      timezone: 'UTC',
      emailNotifications: true,
      analysisNotifications: true,
      quotaWarnings: true,
      marketingEmails: false,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    return {
      ...user,
      preferences: {
        ...currentPreferences,
        ...updates,
        updatedAt: new Date()
      }
    }
  }

  /**
   * Updates user statistics
   */
  static updateUserStats(
    user: UserEntity,
    statUpdates: Partial<UserStats>
  ): UserEntity {
    const currentStats = user.stats || {
      userId: user.profile.id,
      totalAnalyses: 0,
      analysesThisMonth: 0,
      quotaUsageToday: 0,
      streakDays: 0,
      totalQuotaUsed: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    return {
      ...user,
      stats: {
        ...currentStats,
        ...statUpdates,
        updatedAt: new Date()
      }
    }
  }
}

// Legacy interface compatibility (deprecated - use UserProfile instead)
export interface User {
  id: string
  email: string
  name: string | null
  avatar_url: string | null
  provider: 'google' | 'naver'
  provider_id: string
  created_at: string
  updated_at: string
}

export interface UserCreateData {
  id: string
  email: string
  name?: string
  avatar_url?: string
  provider: 'google' | 'naver'
  provider_id: string
}

export interface UserUpdateData {
  name?: string
  avatar_url?: string
  updated_at?: string
}