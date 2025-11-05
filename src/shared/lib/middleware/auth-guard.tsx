/**
 * Authentication Guard HOC (Task T097)
 * 
 * Higher-order component for protecting routes that require authentication
 * Provides consistent authentication checking and redirect behavior
 */

'use client'

import React from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { AuthWidget } from '@/widgets/auth-widget'

interface AuthGuardProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  redirectTo?: string
  requireAuth?: boolean
}

interface WithAuthOptions {
  redirectTo?: string
  fallback?: React.ReactNode
  requireAuth?: boolean
}

/**
 * Authentication Guard Component
 */
export function AuthGuard({ 
  children, 
  fallback, 
  redirectTo = '/signin',
  requireAuth = true 
}: AuthGuardProps) {
  const { data: session, status } = useSession()
  const router = useRouter()

  // Show loading state while checking authentication
  if (status === 'loading') {
    return fallback || (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="text-muted-foreground">인증 확인 중...</p>
        </div>
      </div>
    )
  }

  // Handle unauthenticated state
  if (requireAuth && status === 'unauthenticated') {
    // For client-side redirect, use router
    if (typeof window !== 'undefined') {
      router.push(redirectTo)
      return null
    }
    
    // Fallback for SSR
    return fallback || (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="max-w-md w-full space-y-6 p-4">
          <div className="text-center space-y-4">
            <h1 className="text-2xl font-bold">로그인 필요</h1>
            <p className="text-muted-foreground">
              이 페이지에 접근하려면 로그인이 필요합니다.
            </p>
          </div>
          
          <AuthWidget />
          
          <div className="text-center">
            <button
              onClick={() => router.push('/')}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              홈으로 돌아가기
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Handle authenticated state or when auth is not required
  if (!requireAuth || (requireAuth && status === 'authenticated')) {
    return <>{children}</>
  }

  // Fallback
  return fallback || null
}

/**
 * Higher-order component for wrapping pages with authentication
 */
export function withAuth<T extends Record<string, any>>(
  Component: React.ComponentType<T>,
  options: WithAuthOptions = {}
) {
  const WrappedComponent = (props: T) => {
    return (
      <AuthGuard
        redirectTo={options.redirectTo}
        fallback={options.fallback}
        requireAuth={options.requireAuth}
      >
        <Component {...props} />
      </AuthGuard>
    )
  }

  WrappedComponent.displayName = `withAuth(${Component.displayName || Component.name})`
  
  return WrappedComponent
}

/**
 * Hook for checking authentication status
 */
export function useAuthGuard(requireAuth = true) {
  const { data: session, status } = useSession()
  const router = useRouter()
  
  const isAuthenticated = status === 'authenticated'
  const isLoading = status === 'loading'
  const isUnauthenticated = status === 'unauthenticated'
  
  const redirectToSignIn = (redirectTo = '/signin') => {
    router.push(redirectTo)
  }
  
  const redirectToHome = () => {
    router.push('/')
  }
  
  return {
    session,
    status,
    isAuthenticated,
    isLoading,
    isUnauthenticated,
    requiresAuth: requireAuth && !isAuthenticated && !isLoading,
    redirectToSignIn,
    redirectToHome,
  }
}