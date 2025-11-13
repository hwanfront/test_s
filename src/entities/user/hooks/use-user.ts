/**
 * User Profile Hooks (Task T089)
 * 
 * React hooks for user profile management and state
 * following Feature-Sliced Design principles
 */

'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { 
  getUserApiClient, 
  userApi,
  type UserProfileResponse,
  type UserUpdateResponse,
  type UserPreferencesResponse,
  type UserStatsResponse,
  type UserSessionsResponse,
  UserApiClientError
} from '../lib/api'
import {
  type UserProfile,
  type UpdateUserInput,
  type UpdateUserPreferencesInput,
  UserModelValidator
} from '../model'

/**
 * User hook configuration
 */
export interface UseUserConfig {
  autoFetch?: boolean
  refreshInterval?: number
  retryAttempts?: number
  enablePolling?: boolean
}

const DEFAULT_CONFIG: Required<UseUserConfig> = {
  autoFetch: true,
  refreshInterval: 30000, // 30 seconds
  retryAttempts: 3,
  enablePolling: false
}

/**
 * User data state
 */
export interface UserState {
  user: UserProfile | null
  loading: boolean
  error: string | null
  lastUpdated: Date | null
}

/**
 * User operations state
 */
export interface UserOperationsState {
  updating: boolean
  updateError: string | null
  lastUpdate: Date | null
}

/**
 * User preferences state
 */
export interface UserPreferencesState {
  preferences: UserPreferencesResponse['preferences'] | null
  loading: boolean
  error: string | null
  updating: boolean
}

/**
 * User statistics state
 */
export interface UserStatsState {
  stats: UserStatsResponse['stats'] | null
  trends: UserStatsResponse['trends'] | null
  insights: UserStatsResponse['insights'] | null
  loading: boolean
  error: string | null
  lastUpdated: Date | null
}

/**
 * User sessions state
 */
export interface UserSessionsState {
  sessions: UserSessionsResponse['sessions']
  totalSessions: number
  activeSessions: number
  loading: boolean
  error: string | null
  lastUpdated: Date | null
}

/**
 * Main user profile hook
 */
export function useUser(config: UseUserConfig = {}) {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config }
  
  // User state
  const [state, setState] = useState<UserState>({
    user: null,
    loading: false,
    error: null,
    lastUpdated: null
  })

  // Operations state
  const [operationsState, setOperationsState] = useState<UserOperationsState>({
    updating: false,
    updateError: null,
    lastUpdate: null
  })

  // Fetch user profile
  const fetchUser = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }))
    
    try {
      const response = await userApi.getCurrentUser()
      setState(prev => ({
        ...prev,
        user: response.user,
        loading: false,
        lastUpdated: new Date()
      }))
    } catch (error) {
      const errorMessage = error instanceof UserApiClientError 
        ? error.message 
        : 'Failed to fetch user profile'
      
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage
      }))
    }
  }, [])

  // Update user profile
  const updateUser = useCallback(async (updates: UpdateUserInput) => {
    setOperationsState(prev => ({ ...prev, updating: true, updateError: null }))
    
    try {
      // Validate updates client-side
      UserModelValidator.validateUpdateInput(updates)
      
      const response = await userApi.updateProfile(updates)
      
      // Update local state
      setState(prev => ({
        ...prev,
        user: response.user,
        lastUpdated: new Date()
      }))
      
      setOperationsState(prev => ({
        ...prev,
        updating: false,
        lastUpdate: new Date()
      }))
      
      return { success: true, data: response }
    } catch (error) {
      const errorMessage = error instanceof UserApiClientError 
        ? error.message 
        : 'Failed to update user profile'
      
      setOperationsState(prev => ({
        ...prev,
        updating: false,
        updateError: errorMessage
      }))
      
      return { success: false, error: errorMessage }
    }
  }, [])

  // Refresh user data
  const refresh = useCallback(() => {
    fetchUser()
  }, [fetchUser])

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }))
    setOperationsState(prev => ({ ...prev, updateError: null }))
  }, [])

  // Auto-fetch on mount
  useEffect(() => {
    if (mergedConfig.autoFetch) {
      fetchUser()
    }
  }, [fetchUser, mergedConfig.autoFetch])

  // Polling effect
  useEffect(() => {
    if (!mergedConfig.enablePolling || mergedConfig.refreshInterval <= 0) {
      return
    }

    const interval = setInterval(fetchUser, mergedConfig.refreshInterval)
    return () => clearInterval(interval)
  }, [fetchUser, mergedConfig.enablePolling, mergedConfig.refreshInterval])

  // Computed values
  const isAuthenticated = useMemo(() => !!state.user, [state.user])
  const isProfileComplete = useMemo(() => {
    if (!state.user) return false
    return UserModelValidator.isUserActive(state.user)
  }, [state.user])

  const userDisplay = useMemo(() => {
    if (!state.user) return null
    
    return {
      name: UserModelValidator.getDisplayName(state.user),
      initials: UserModelValidator.getUserInitials(state.user),
      avatar: state.user.avatar
    }
  }, [state.user])

  return {
    // State
    ...state,
    ...operationsState,
    
    // Computed
    isAuthenticated,
    isProfileComplete,
    userDisplay,
    
    // Actions
    updateUser,
    refresh,
    clearError,
    
    // Utils
    fetchUser
  }
}

/**
 * User preferences hook
 */
export function useUserPreferences(config: UseUserConfig = {}) {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config }
  
  const [state, setState] = useState<UserPreferencesState>({
    preferences: null,
    loading: false,
    error: null,
    updating: false
  })

  // Fetch preferences
  const fetchPreferences = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }))
    
    try {
      const response = await userApi.getPreferences()
      setState(prev => ({
        ...prev,
        preferences: response.preferences,
        loading: false
      }))
    } catch (error) {
      const errorMessage = error instanceof UserApiClientError 
        ? error.message 
        : 'Failed to fetch preferences'
      
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage
      }))
    }
  }, [])

  // Update preferences
  const updatePreferences = useCallback(async (updates: UpdateUserPreferencesInput) => {
    setState(prev => ({ ...prev, updating: true, error: null }))
    
    try {
      const response = await userApi.updatePreferences(updates)
      
      setState(prev => ({
        ...prev,
        preferences: response.preferences,
        updating: false
      }))
      
      return { success: true, data: response }
    } catch (error) {
      const errorMessage = error instanceof UserApiClientError 
        ? error.message 
        : 'Failed to update preferences'
      
      setState(prev => ({
        ...prev,
        updating: false,
        error: errorMessage
      }))
      
      return { success: false, error: errorMessage }
    }
  }, [])

  // Auto-fetch on mount
  useEffect(() => {
    if (mergedConfig.autoFetch) {
      fetchPreferences()
    }
  }, [fetchPreferences, mergedConfig.autoFetch])

  return {
    ...state,
    updatePreferences,
    refresh: fetchPreferences,
    clearError: () => setState(prev => ({ ...prev, error: null }))
  }
}

/**
 * User statistics hook
 */
export function useUserStats(config: UseUserConfig = {}) {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config }
  
  const [state, setState] = useState<UserStatsState>({
    stats: null,
    trends: null,
    insights: null,
    loading: false,
    error: null,
    lastUpdated: null
  })

  // Fetch stats
  const fetchStats = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }))
    
    try {
      const response = await userApi.getStats()
      setState(prev => ({
        ...prev,
        stats: response.stats,
        trends: response.trends,
        insights: response.insights,
        loading: false,
        lastUpdated: new Date()
      }))
    } catch (error) {
      const errorMessage = error instanceof UserApiClientError 
        ? error.message 
        : 'Failed to fetch user statistics'
      
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage
      }))
    }
  }, [])

  // Auto-fetch on mount
  useEffect(() => {
    if (mergedConfig.autoFetch) {
      fetchStats()
    }
  }, [fetchStats, mergedConfig.autoFetch])

  // Polling for stats
  useEffect(() => {
    if (!mergedConfig.enablePolling || mergedConfig.refreshInterval <= 0) {
      return
    }

    const interval = setInterval(fetchStats, mergedConfig.refreshInterval)
    return () => clearInterval(interval)
  }, [fetchStats, mergedConfig.enablePolling, mergedConfig.refreshInterval])

  return {
    ...state,
    refresh: fetchStats,
    clearError: () => setState(prev => ({ ...prev, error: null }))
  }
}

/**
 * User sessions hook
 */
export function useUserSessions(config: UseUserConfig = {}) {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config }
  
  const [state, setState] = useState<UserSessionsState>({
    sessions: [],
    totalSessions: 0,
    activeSessions: 0,
    loading: false,
    error: null,
    lastUpdated: null
  })

  // Fetch sessions
  const fetchSessions = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }))
    
    try {
      const response = await userApi.getSessions()
      setState(prev => ({
        ...prev,
        sessions: response.sessions,
        totalSessions: response.totalSessions,
        activeSessions: response.activeSessions,
        loading: false,
        lastUpdated: new Date()
      }))
    } catch (error) {
      const errorMessage = error instanceof UserApiClientError 
        ? error.message 
        : 'Failed to fetch user sessions'
      
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage
      }))
    }
  }, [])

  // Revoke session
  const revokeSession = useCallback(async (sessionId: string) => {
    try {
      const result = await userApi.safeRevokeSession(sessionId)
      
      if (result.success) {
        // Refresh sessions list
        await fetchSessions()
      }
      
      return result
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to revoke session'
      }
    }
  }, [fetchSessions])

  // Auto-fetch on mount
  useEffect(() => {
    if (mergedConfig.autoFetch) {
      fetchSessions()
    }
  }, [fetchSessions, mergedConfig.autoFetch])

  return {
    ...state,
    revokeSession,
    refresh: fetchSessions,
    clearError: () => setState(prev => ({ ...prev, error: null }))
  }
}

/**
 * Combined user data hook (all user-related data)
 */
export function useUserData(config: UseUserConfig = {}) {
  const user = useUser(config)
  const preferences = useUserPreferences({ ...config, autoFetch: user.isAuthenticated })
  const stats = useUserStats({ ...config, autoFetch: user.isAuthenticated })
  const sessions = useUserSessions({ ...config, autoFetch: user.isAuthenticated })

  // Refresh all data
  const refreshAll = useCallback(() => {
    user.refresh()
    if (user.isAuthenticated) {
      preferences.refresh()
      stats.refresh()
      sessions.refresh()
    }
  }, [user, preferences, stats, sessions])

  // Clear all errors
  const clearAllErrors = useCallback(() => {
    user.clearError()
    preferences.clearError()
    stats.clearError()
    sessions.clearError()
  }, [user, preferences, stats, sessions])

  // Overall loading state
  const isLoading = useMemo(() => {
    return user.loading || preferences.loading || stats.loading || sessions.loading
  }, [user.loading, preferences.loading, stats.loading, sessions.loading])

  // Overall error state
  const hasErrors = useMemo(() => {
    return !!(user.error || preferences.error || stats.error || sessions.error)
  }, [user.error, preferences.error, stats.error, sessions.error])

  return {
    user,
    preferences,
    stats,
    sessions,
    
    // Combined state
    isLoading,
    hasErrors,
    
    // Combined actions
    refreshAll,
    clearAllErrors
  }
}

/**
 * User permission check hook
 */
export function useUserPermissions() {
  const { user } = useUser()

  const checkPermission = useCallback((action: string, resource?: string) => {
    if (!user) return false
    
    // Use the permission validation from the model
    return UserModelValidator.hasPermission(user, 'user' as any) // Basic permission check
  }, [user])

  const permissions = useMemo(() => {
    if (!user) {
      return {
        canCreateAnalysis: false,
        canViewAnalytics: false,
        canManageAccount: false,
        canAdminAccess: false
      }
    }

    return {
      canCreateAnalysis: UserModelValidator.isUserActive(user),
      canViewAnalytics: UserModelValidator.isUserActive(user),
      canManageAccount: UserModelValidator.isUserActive(user),
      canAdminAccess: UserModelValidator.hasPermission(user, 'admin' as any)
    }
  }, [user])

  return {
    checkPermission,
    permissions,
    user
  }
}

/**
 * User profile completion hook
 */
export function useProfileCompletion() {
  const { user } = useUser()

  const completionStatus = useMemo(() => {
    if (!user) {
      return {
        isComplete: false,
        percentage: 0,
        missing: [],
        suggestions: []
      }
    }

    const missing: string[] = []
    const suggestions: string[] = []
    let completedFields = 0
    const totalFields = 5 // email, name, avatar, emailVerified, preferences

    // Check email
    if (user.email) completedFields++

    // Check name
    if (user.name && user.name.trim().length > 0) {
      completedFields++
    } else {
      missing.push('Display name')
      suggestions.push('Add your display name for better personalization')
    }

    // Check avatar
    if (user.avatar) {
      completedFields++
    } else {
      missing.push('Profile picture')
      suggestions.push('Upload a profile picture')
    }

    // Check email verification
    if (user.emailVerified) {
      completedFields++
    } else {
      missing.push('Email verification')
      suggestions.push('Verify your email address')
    }

    // Check if user has used the platform
    completedFields++ // Always count as they have an account

    const percentage = Math.round((completedFields / totalFields) * 100)
    const isComplete = missing.length === 0

    return {
      isComplete,
      percentage,
      missing,
      suggestions
    }
  }, [user])

  return completionStatus
}

/**
 * User activity status hook
 */
export function useUserActivity() {
  const { user } = useUser()
  const { stats } = useUserStats()

  const activityStatus = useMemo(() => {
    if (!user || !stats) {
      return {
        status: 'unknown' as const,
        lastActive: null,
        streak: 0,
        recentActivity: false
      }
    }

    const now = new Date()
    let status: 'active' | 'recent' | 'away' | 'inactive' = 'inactive'
    
    if (user.lastLoginAt) {
      const hoursSinceLogin = (now.getTime() - user.lastLoginAt.getTime()) / (1000 * 60 * 60)
      
      if (hoursSinceLogin < 1) {
        status = 'active'
      } else if (hoursSinceLogin < 24) {
        status = 'recent'
      } else if (hoursSinceLogin < 168) { // 1 week
        status = 'away'
      }
    }

    return {
      status,
      lastActive: user.lastLoginAt,
      streak: stats.streakDays,
      recentActivity: stats.quotaUsageToday > 0
    }
  }, [user, stats])

  return activityStatus
}

/**
 * Export all hooks
 */
export {
  getUserApiClient,
  userApi
}