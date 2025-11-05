/**
 * Auth Widget State Management (Task T094)
 * 
 * Zustand store for authentication widget state management
 * Handles user session state, authentication loading states, and preferences
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * User interface for authentication state
 */
interface AuthUser {
  id: string
  email: string
  name: string
  provider: 'google' | 'naver'
  avatarUrl?: string
  createdAt: string
  lastLoginAt: string
}

/**
 * Authentication state interface
 */
interface AuthState {
  // User session data
  user: AuthUser | null
  isAuthenticated: boolean
  
  // Loading states
  isLoading: boolean
  isSigningIn: boolean
  isSigningOut: boolean
  
  // Error handling
  error: string | null
  
  // Widget preferences
  preferences: {
    showQuota: boolean
    defaultVariant: 'compact' | 'full'
    autoSignIn: boolean
  }
  
  // Session metadata
  sessionExpiry: string | null
  lastActivity: string | null
}

/**
 * Authentication actions interface
 */
interface AuthActions {
  // User session management
  setUser: (user: AuthUser | null) => void
  setAuthenticated: (authenticated: boolean) => void
  updateLastActivity: () => void
  
  // Loading state management
  setLoading: (loading: boolean) => void
  setSigningIn: (signingIn: boolean) => void
  setSigningOut: (signingOut: boolean) => void
  
  // Error handling
  setError: (error: string | null) => void
  clearError: () => void
  
  // Session management
  setSessionExpiry: (expiry: string | null) => void
  checkSessionValidity: () => boolean
  clearSession: () => void
  
  // Preferences management
  updatePreferences: (preferences: Partial<AuthState['preferences']>) => void
  resetPreferences: () => void
  
  // Utility actions
  initialize: () => void
  reset: () => void
}

/**
 * Combined auth store type
 */
type AuthStore = AuthState & AuthActions

/**
 * Default preferences for auth widget
 */
const defaultPreferences: AuthState['preferences'] = {
  showQuota: true,
  defaultVariant: 'compact',
  autoSignIn: false
}

/**
 * Initial auth state
 */
const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  isSigningIn: false,
  isSigningOut: false,
  error: null,
  preferences: defaultPreferences,
  sessionExpiry: null,
  lastActivity: null
}

/**
 * Auth widget Zustand store with persistence
 */
export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      // User session management
      setUser: (user) => {
        set({ 
          user, 
          isAuthenticated: !!user,
          lastActivity: new Date().toISOString()
        })
      },

      setAuthenticated: (authenticated) => {
        set({ 
          isAuthenticated: authenticated,
          lastActivity: new Date().toISOString()
        })
      },

      updateLastActivity: () => {
        set({ lastActivity: new Date().toISOString() })
      },

      // Loading state management
      setLoading: (loading) => set({ isLoading: loading }),
      setSigningIn: (signingIn) => set({ isSigningIn: signingIn }),
      setSigningOut: (signingOut) => set({ isSigningOut: signingOut }),

      // Error handling
      setError: (error) => set({ error }),
      clearError: () => set({ error: null }),

      // Session management
      setSessionExpiry: (expiry) => set({ sessionExpiry: expiry }),
      
      checkSessionValidity: () => {
        const { sessionExpiry } = get()
        if (!sessionExpiry) return false
        
        const now = new Date()
        const expiryDate = new Date(sessionExpiry)
        return expiryDate > now
      },

      clearSession: () => {
        set({
          user: null,
          isAuthenticated: false,
          sessionExpiry: null,
          lastActivity: null,
          error: null
        })
      },

      // Preferences management
      updatePreferences: (newPreferences) => {
        set((state) => ({
          preferences: { ...state.preferences, ...newPreferences }
        }))
      },

      resetPreferences: () => {
        set({ preferences: defaultPreferences })
      },

      // Utility actions
      initialize: () => {
        const { checkSessionValidity, clearSession } = get()
        
        // Check if stored session is still valid
        if (!checkSessionValidity()) {
          clearSession()
        }
        
        set({ isLoading: false })
      },

      reset: () => {
        set(initialState)
      }
    }),
    {
      name: 'auth-widget-storage',
      partialize: (state) => ({
        // Only persist user data and preferences, not loading states
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        preferences: state.preferences,
        sessionExpiry: state.sessionExpiry,
        lastActivity: state.lastActivity
      })
    }
  )
)

/**
 * Hook for accessing auth loading states
 */
export const useAuthLoadingStates = () => {
  return useAuthStore((state) => ({
    isLoading: state.isLoading,
    isSigningIn: state.isSigningIn,
    isSigningOut: state.isSigningOut
  }))
}

/**
 * Hook for accessing user session data
 */
export const useAuthSession = () => {
  return useAuthStore((state) => ({
    user: state.user,
    isAuthenticated: state.isAuthenticated,
    sessionExpiry: state.sessionExpiry,
    lastActivity: state.lastActivity
  }))
}

/**
 * Hook for accessing auth preferences
 */
export const useAuthPreferences = () => {
  return useAuthStore((state) => ({
    preferences: state.preferences,
    updatePreferences: state.updatePreferences,
    resetPreferences: state.resetPreferences
  }))
}

/**
 * Hook for auth error handling
 */
export const useAuthError = () => {
  return useAuthStore((state) => ({
    error: state.error,
    setError: state.setError,
    clearError: state.clearError
  }))
}

/**
 * Hook for session management actions
 */
export const useAuthActions = () => {
  return useAuthStore((state) => ({
    setUser: state.setUser,
    setAuthenticated: state.setAuthenticated,
    updateLastActivity: state.updateLastActivity,
    setLoading: state.setLoading,
    setSigningIn: state.setSigningIn,
    setSigningOut: state.setSigningOut,
    setSessionExpiry: state.setSessionExpiry,
    checkSessionValidity: state.checkSessionValidity,
    clearSession: state.clearSession,
    initialize: state.initialize,
    reset: state.reset
  }))
}

/**
 * Selector for getting complete auth state
 */
export const selectAuthState = (state: AuthStore): AuthState => ({
  user: state.user,
  isAuthenticated: state.isAuthenticated,
  isLoading: state.isLoading,
  isSigningIn: state.isSigningIn,
  isSigningOut: state.isSigningOut,
  error: state.error,
  preferences: state.preferences,
  sessionExpiry: state.sessionExpiry,
  lastActivity: state.lastActivity
})

/**
 * Utility function to sync NextAuth session with Zustand store
 */
export const syncAuthSession = (
  nextAuthSession: any,
  store: typeof useAuthStore
) => {
  const { setUser, setAuthenticated, setSessionExpiry } = store.getState()
  
  if (nextAuthSession?.user) {
    setUser({
      id: nextAuthSession.user.id,
      email: nextAuthSession.user.email || '',
      name: nextAuthSession.user.name || '',
      provider: nextAuthSession.provider || 'google',
      avatarUrl: nextAuthSession.user.image || undefined,
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString()
    })
    
    if (nextAuthSession.expires) {
      setSessionExpiry(nextAuthSession.expires)
    }
  } else {
    setUser(null)
    setAuthenticated(false)
  }
}

export default useAuthStore