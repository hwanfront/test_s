/**
 * Authentication Flow Hooks and Utilities (Task T080)
 * 
 * Implements React hooks and utilities for authentication flow management
 * following Feature-Sliced Design principles
 */

import { useSession, signIn, signOut, getSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import { useState, useEffect, useCallback } from 'react'
import type { Session } from 'next-auth'

/**
 * Authentication state interface
 */
export interface AuthState {
  isAuthenticated: boolean
  isLoading: boolean
  user: Session['user'] | null
  session: Session | null
  error: AuthError | null
}

/**
 * Authentication error types
 */
export interface AuthError {
  type: 'signin' | 'signout' | 'session' | 'callback'
  message: string
  code?: string
}

/**
 * Sign in options interface
 */
export interface SignInOptions {
  provider?: 'google' | 'naver'
  callbackUrl?: string
  redirect?: boolean
}

/**
 * Main authentication hook
 * Provides comprehensive authentication state management
 */
export function useAuth(): AuthState & {
  signIn: (options?: SignInOptions) => Promise<void>
  signOut: (callbackUrl?: string) => Promise<void>
  refreshSession: () => Promise<void>
} {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [error, setError] = useState<AuthError | null>(null)

  const isLoading = status === 'loading'
  const isAuthenticated = status === 'authenticated' && !!session

  // Clear error on successful authentication
  useEffect(() => {
    if (isAuthenticated) {
      setError(null)
    }
  }, [isAuthenticated])

  const handleSignIn = useCallback(async (options?: SignInOptions) => {
    try {
      setError(null)
      
      const result = await signIn(options?.provider, {
        callbackUrl: options?.callbackUrl || window.location.href,
        redirect: options?.redirect ?? true
      })

      if (result?.error) {
        setError({
          type: 'signin',
          message: 'Sign in failed',
          code: result.error
        })
      }
    } catch (err) {
      setError({
        type: 'signin',
        message: err instanceof Error ? err.message : 'Sign in failed'
      })
    }
  }, [])

  const handleSignOut = useCallback(async (callbackUrl?: string) => {
    try {
      setError(null)
      
      await signOut({
        callbackUrl: callbackUrl || '/'
      })
    } catch (err) {
      setError({
        type: 'signout',
        message: err instanceof Error ? err.message : 'Sign out failed'
      })
    }
  }, [])

  const refreshSession = useCallback(async () => {
    try {
      setError(null)
      await getSession()
    } catch (err) {
      setError({
        type: 'session',
        message: err instanceof Error ? err.message : 'Session refresh failed'
      })
    }
  }, [])

  return {
    isAuthenticated,
    isLoading,
    user: session?.user || null,
    session,
    error,
    signIn: handleSignIn,
    signOut: handleSignOut,
    refreshSession
  }
}

/**
 * Authentication redirect hook
 * Handles automatic redirects based on authentication state
 */
export function useAuthRedirect(options: {
  redirectTo?: string
  redirectIfAuthenticated?: string
  requireAuth?: boolean
}) {
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (isLoading) return

    if (options.requireAuth && !isAuthenticated && options.redirectTo) {
      router.push(options.redirectTo)
    } else if (isAuthenticated && options.redirectIfAuthenticated) {
      router.push(options.redirectIfAuthenticated)
    }
  }, [isAuthenticated, isLoading, router, options])

  return { isAuthenticated, isLoading }
}

/**
 * Authentication guard hook
 * Provides authentication protection for components
 */
export function useAuthGuard(requireAuth: boolean = true) {
  const { isAuthenticated, isLoading, user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && requireAuth && !isAuthenticated) {
      router.push(`/signin?callbackUrl=${encodeURIComponent(router.asPath)}`)
    }
  }, [isAuthenticated, isLoading, requireAuth, router])

  return {
    isAuthenticated,
    isLoading,
    user,
    canAccess: !requireAuth || isAuthenticated
  }
}

/**
 * Provider-specific authentication hooks
 */
export function useGoogleAuth() {
  const { signIn, signOut, isAuthenticated, isLoading, user, error } = useAuth()

  const signInWithGoogle = useCallback(async (callbackUrl?: string) => {
    await signIn({
      provider: 'google',
      callbackUrl,
      redirect: true
    })
  }, [signIn])

  return {
    signInWithGoogle,
    signOut,
    isAuthenticated,
    isLoading,
    user,
    error
  }
}

export function useNaverAuth() {
  const { signIn, signOut, isAuthenticated, isLoading, user, error } = useAuth()

  const signInWithNaver = useCallback(async (callbackUrl?: string) => {
    await signIn({
      provider: 'naver',
      callbackUrl,
      redirect: true
    })
  }, [signIn])

  return {
    signInWithNaver,
    signOut,
    isAuthenticated,
    isLoading,
    user,
    error
  }
}

/**
 * Session utilities
 */
export const SessionUtils = {
  /**
   * Validates session data
   */
  validateSession(session: Session | null): boolean {
    return !!(
      session?.user?.email &&
      session?.user?.id &&
      session?.expires &&
      new Date(session.expires) > new Date()
    )
  },

  /**
   * Checks if session is expired
   */
  isSessionExpired(session: Session | null): boolean {
    if (!session?.expires) return true
    return new Date(session.expires) <= new Date()
  },

  /**
   * Gets session expiry time in milliseconds
   */
  getSessionExpiryTime(session: Session | null): number | null {
    if (!session?.expires) return null
    return new Date(session.expires).getTime() - Date.now()
  },

  /**
   * Formats user display name
   */
  getUserDisplayName(user: Session['user'] | null): string {
    if (!user) return 'Unknown User'
    return user.name || user.email || 'User'
  },

  /**
   * Gets user avatar URL with fallback
   */
  getUserAvatar(user: Session['user'] | null): string {
    return user?.image || '/default-avatar.png'
  },

  /**
   * Extracts provider from session
   */
  getAuthProvider(session: Session | null): string | null {
    // This would need to be stored in the session during authentication
    // For now, we'll return null as NextAuth doesn't include this by default
    return null
  }
}

/**
 * Authentication state persistence
 */
export const AuthPersistence = {
  /**
   * Stores authentication callback URL
   */
  storeCallbackUrl(url: string): void {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('auth_callback_url', url)
    }
  },

  /**
   * Retrieves and clears stored callback URL
   */
  getAndClearCallbackUrl(): string | null {
    if (typeof window === 'undefined') return null
    
    const url = sessionStorage.getItem('auth_callback_url')
    if (url) {
      sessionStorage.removeItem('auth_callback_url')
    }
    return url
  },

  /**
   * Stores sign-in provider preference
   */
  storeProviderPreference(provider: 'google' | 'naver'): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_provider_preference', provider)
    }
  },

  /**
   * Gets stored provider preference
   */
  getProviderPreference(): 'google' | 'naver' | null {
    if (typeof window === 'undefined') return null
    
    const preference = localStorage.getItem('auth_provider_preference')
    return preference as 'google' | 'naver' | null
  }
}

/**
 * Authentication error handling utilities
 */
export const AuthErrorHandler = {
  /**
   * Maps NextAuth error codes to user-friendly messages
   */
  getErrorMessage(error: string | AuthError): string {
    const errorCode = typeof error === 'string' ? error : error.code || error.message

    const errorMessages: Record<string, string> = {
      'Signin': 'Failed to sign in. Please try again.',
      'OAuthSignin': 'OAuth sign in failed. Please try again.',
      'OAuthCallback': 'OAuth callback error. Please try again.',
      'OAuthCreateAccount': 'Could not create OAuth account. Please try again.',
      'EmailCreateAccount': 'Could not create email account. Please try again.',
      'Callback': 'Callback error. Please try again.',
      'OAuthAccountNotLinked': 'Account is already linked to another provider.',
      'EmailSignin': 'Email sign in failed. Please try again.',
      'CredentialsSignin': 'Invalid credentials. Please check your login details.',
      'SessionRequired': 'You must be signed in to access this page.',
      'AccessDenied': 'Access denied. You do not have permission to sign in.',
      'Verification': 'Verification failed. Please try again.'
    }

    return errorMessages[errorCode] || 'An authentication error occurred. Please try again.'
  },

  /**
   * Determines if error is retryable
   */
  isRetryableError(error: string | AuthError): boolean {
    const errorCode = typeof error === 'string' ? error : error.code || error.message

    const retryableErrors = [
      'Signin',
      'OAuthSignin',
      'OAuthCallback',
      'Callback',
      'EmailSignin'
    ]

    return retryableErrors.includes(errorCode)
  },

  /**
   * Gets error severity level
   */
  getErrorSeverity(error: string | AuthError): 'low' | 'medium' | 'high' {
    const errorCode = typeof error === 'string' ? error : error.code || error.message

    const highSeverityErrors = ['OAuthAccountNotLinked', 'AccessDenied']
    const mediumSeverityErrors = ['CredentialsSignin', 'Verification']

    if (highSeverityErrors.includes(errorCode)) return 'high'
    if (mediumSeverityErrors.includes(errorCode)) return 'medium'
    return 'low'
  }
}

/**
 * Authentication utilities for server-side operations
 */
export const ServerAuthUtils = {
  /**
   * Validates server-side session
   */
  async validateServerSession(req: any): Promise<Session | null> {
    try {
      const session = await getSession({ req })
      return SessionUtils.validateSession(session) ? session : null
    } catch {
      return null
    }
  },

  /**
   * Requires authentication for API routes
   */
  async requireAuthentication(req: any): Promise<Session> {
    const session = await this.validateServerSession(req)
    if (!session) {
      throw new Error('Authentication required')
    }
    return session
  },

  /**
   * Gets user ID from request
   */
  async getUserId(req: any): Promise<string | null> {
    const session = await this.validateServerSession(req)
    return session?.user?.id || null
  }
}