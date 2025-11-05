/**
 * Sign-in Component (Task T081)
 * 
 * Implements sign-in UI component with OAuth provider selection
 * following Feature-Sliced Design principles
 */

'use client'

import React, { useState } from 'react'
import { useAuth, useAuthRedirect } from '../hooks/use-auth'
import { AuthErrorHandler } from '../hooks/use-auth'

/**
 * Sign-in component props
 */
export interface SignInProps {
  callbackUrl?: string
  error?: string
  providers?: ('google' | 'naver')[]
  showTitle?: boolean
  showDescription?: boolean
  className?: string
}

/**
 * Main sign-in component
 */
export function SignIn({
  callbackUrl,
  error: urlError,
  providers = ['google', 'naver'],
  showTitle = true,
  showDescription = true,
  className
}: SignInProps) {
  const { signIn, isLoading, error } = useAuth()
  const [signingInProvider, setSigningInProvider] = useState<string | null>(null)

  // Redirect authenticated users
  useAuthRedirect({
    redirectIfAuthenticated: callbackUrl || '/analysis'
  })

  const handleProviderSignIn = async (provider: 'google' | 'naver') => {
    setSigningInProvider(provider)
    try {
      await signIn({
        provider,
        callbackUrl: callbackUrl || '/analysis',
        redirect: true
      })
    } catch (err) {
      setSigningInProvider(null)
    }
  }

  const displayError = error?.message || (urlError && AuthErrorHandler.getErrorMessage(urlError))

  return (
    <div className={`flex min-h-screen items-center justify-center ${className || ''}`}>
      <div className="w-full max-w-md p-6 bg-white rounded-lg shadow-md border">
        <div className="space-y-4">
          {showTitle && (
            <h1 className="text-2xl font-bold text-center text-gray-900">
              Welcome back
            </h1>
          )}
          {showDescription && (
            <p className="text-center text-gray-600">
              Sign in to continue to AI Terms Analysis
            </p>
          )}
        </div>
        
        <div className="mt-6 space-y-4">
          {displayError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-800">{displayError}</p>
            </div>
          )}

          <div className="space-y-3">
            {providers.includes('google') && (
              <button
                className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => handleProviderSignIn('google')}
                disabled={isLoading || !!signingInProvider}
              >
                {signingInProvider === 'google' ? (
                  <LoadingSpinner className="mr-2 h-4 w-4" />
                ) : (
                  <GoogleIcon className="mr-2 h-4 w-4" />
                )}
                Continue with Google
              </button>
            )}

            {providers.includes('naver') && (
              <button
                className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => handleProviderSignIn('naver')}
                disabled={isLoading || !!signingInProvider}
              >
                {signingInProvider === 'naver' ? (
                  <LoadingSpinner className="mr-2 h-4 w-4" />
                ) : (
                  <NaverIcon className="mr-2 h-4 w-4" />
                )}
                Continue with Naver
              </button>
            )}
          </div>

          <div className="text-xs text-gray-500 text-center">
            By continuing, you agree to our Terms of Service and Privacy Policy
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Compact sign-in button component
 */
export interface SignInButtonProps {
  provider?: 'google' | 'naver'
  callbackUrl?: string
  variant?: 'primary' | 'secondary' | 'outline'
  size?: 'sm' | 'default' | 'lg'
  className?: string
  children?: React.ReactNode
}

export function SignInButton({
  provider = 'google',
  callbackUrl,
  variant = 'primary',
  size = 'default',
  className,
  children
}: SignInButtonProps) {
  const { signIn, isLoading } = useAuth()
  const [isSigningIn, setIsSigningIn] = useState(false)

  const handleSignIn = async () => {
    setIsSigningIn(true)
    try {
      await signIn({
        provider,
        callbackUrl: callbackUrl || '/analysis',
        redirect: true
      })
    } catch (err) {
      setIsSigningIn(false)
    }
  }

  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed'
  
  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
    secondary: 'bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500',
    outline: 'border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 focus:ring-blue-500'
  }
  
  const sizeClasses = {
    sm: 'px-3 py-2 text-sm',
    default: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base'
  }

  const defaultContent = (
    <>
      {isSigningIn ? (
        <LoadingSpinner className="mr-2 h-4 w-4" />
      ) : provider === 'google' ? (
        <GoogleIcon className="mr-2 h-4 w-4" />
      ) : (
        <NaverIcon className="mr-2 h-4 w-4" />
      )}
      Sign in with {provider === 'google' ? 'Google' : 'Naver'}
    </>
  )

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className || ''}`}
      onClick={handleSignIn}
      disabled={isLoading || isSigningIn}
    >
      {children || defaultContent}
    </button>
  )
}

/**
 * Sign-out component
 */
export interface SignOutProps {
  callbackUrl?: string
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'default' | 'lg'
  className?: string
  children?: React.ReactNode
  showConfirmation?: boolean
}

export function SignOut({
  callbackUrl = '/',
  variant = 'ghost',
  size = 'default',
  className,
  children,
  showConfirmation = false
}: SignOutProps) {
  const { signOut, isLoading } = useAuth()
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const handleSignOut = async () => {
    if (showConfirmation && !showConfirm) {
      setShowConfirm(true)
      return
    }

    setIsSigningOut(true)
    try {
      await signOut(callbackUrl)
    } catch (err) {
      setIsSigningOut(false)
      setShowConfirm(false)
    }
  }

  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed'
  
  const variantClasses = {
    primary: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
    secondary: 'bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500',
    ghost: 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:ring-gray-500'
  }
  
  const sizeClasses = {
    sm: 'px-3 py-2 text-sm',
    default: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base'
  }

  if (showConfirm) {
    return (
      <div className="space-y-2">
        <div className="text-sm text-gray-600">
          Are you sure you want to sign out?
        </div>
        <div className="flex space-x-2">
          <button
            className={`${baseClasses} ${variantClasses.primary} ${sizeClasses.sm}`}
            onClick={handleSignOut}
            disabled={isSigningOut}
          >
            {isSigningOut && <LoadingSpinner className="mr-2 h-4 w-4" />}
            Yes, sign out
          </button>
          <button
            className={`${baseClasses} ${variantClasses.ghost} ${sizeClasses.sm}`}
            onClick={() => setShowConfirm(false)}
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className || ''}`}
      onClick={handleSignOut}
      disabled={isLoading || isSigningOut}
    >
      {children || (
        <>
          {isSigningOut && <LoadingSpinner className="mr-2 h-4 w-4" />}
          Sign out
        </>
      )}
    </button>
  )
}

/**
 * User profile display component
 */
export interface UserProfileProps {
  showEmail?: boolean
  showAvatar?: boolean
  showSignOut?: boolean
  className?: string
  avatarSize?: 'sm' | 'default' | 'lg'
}

export function UserProfile({
  showEmail = true,
  showAvatar = true,
  showSignOut = true,
  className,
  avatarSize = 'default'
}: UserProfileProps) {
  const { user, isAuthenticated } = useAuth()

  if (!isAuthenticated || !user) {
    return null
  }

  const avatarSizes = {
    sm: 'h-6 w-6',
    default: 'h-8 w-8',
    lg: 'h-10 w-10'
  }

  return (
    <div className={`flex items-center space-x-3 ${className || ''}`}>
      {showAvatar && (
        <div className={`rounded-full overflow-hidden ${avatarSizes[avatarSize]}`}>
          {user.image ? (
            <img
              src={user.image}
              alt={user.name || 'User avatar'}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-full w-full bg-gray-200 flex items-center justify-center">
              <UserIcon className="h-4 w-4 text-gray-500" />
            </div>
          )}
        </div>
      )}

      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-gray-900 truncate">
          {user.name || 'User'}
        </div>
        {showEmail && user.email && (
          <div className="text-xs text-gray-500 truncate">
            {user.email}
          </div>
        )}
      </div>

      {showSignOut && (
        <SignOut variant="ghost" size="sm" />
      )}
    </div>
  )
}

/**
 * Authentication status indicator
 */
export interface AuthStatusProps {
  showWhenSignedOut?: boolean
  signedInContent?: React.ReactNode
  signedOutContent?: React.ReactNode
  loadingContent?: React.ReactNode
  className?: string
}

export function AuthStatus({
  showWhenSignedOut = true,
  signedInContent,
  signedOutContent,
  loadingContent,
  className
}: AuthStatusProps) {
  const { isAuthenticated, isLoading, user } = useAuth()

  if (isLoading) {
    return (
      <div className={className}>
        {loadingContent || (
          <div className="flex items-center space-x-2">
            <LoadingSpinner className="h-4 w-4" />
            <span className="text-sm text-gray-500">Loading...</span>
          </div>
        )}
      </div>
    )
  }

  if (isAuthenticated) {
    return (
      <div className={className}>
        {signedInContent || <UserProfile />}
      </div>
    )
  }

  if (showWhenSignedOut) {
    return (
      <div className={className}>
        {signedOutContent || <SignInButton />}
      </div>
    )
  }

  return null
}

/**
 * Loading spinner component
 */
function LoadingSpinner({ className }: { className?: string }) {
  return (
    <svg
      className={`animate-spin ${className || ''}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  )
}

/**
 * User icon component
 */
function UserIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
      />
    </svg>
  )
}

/**
 * Google icon component
 */
function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path
        fill="currentColor"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="currentColor"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="currentColor"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="currentColor"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  )
}

/**
 * Naver icon component
 */
function NaverIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M16.273 12.845 7.376 0H0v24h7.726V11.156L16.624 24H24V0h-7.727v12.845z" />
    </svg>
  )
}