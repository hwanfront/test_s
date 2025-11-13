/**
 * Sign-out Component (Task T082)
 * 
 * Implements dedicated sign-out UI component with confirmation options
 * following Feature-Sliced Design principles
 */

'use client'

import React, { useState } from 'react'
import { useAuth } from '../hooks/use-auth'

/**
 * Sign-out component props
 */
export interface SignOutProps {
  callbackUrl?: string
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'default' | 'lg'
  className?: string
  children?: React.ReactNode
  showConfirmation?: boolean
  confirmationMessage?: string
  onSignOutStart?: () => void
  onSignOutComplete?: () => void
  onSignOutError?: (error: Error) => void
}

/**
 * Main sign-out component
 */
export function SignOut({
  callbackUrl = '/',
  variant = 'ghost',
  size = 'default',
  className,
  children,
  showConfirmation = false,
  confirmationMessage = 'Are you sure you want to sign out?',
  onSignOutStart,
  onSignOutComplete,
  onSignOutError
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
    onSignOutStart?.()

    try {
      await signOut(callbackUrl)
      onSignOutComplete?.()
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Sign out failed')
      onSignOutError?.(error)
      setIsSigningOut(false)
      setShowConfirm(false)
    }
  }

  const handleCancel = () => {
    setShowConfirm(false)
  }

  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
  
  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
    secondary: 'bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500',
    ghost: 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:ring-gray-500',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500'
  }
  
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    default: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base'
  }

  if (showConfirm) {
    return (
      <div className="space-y-3">
        <div className="text-sm text-gray-700">
          {confirmationMessage}
        </div>
        <div className="flex space-x-2">
          <button
            className={`${baseClasses} ${variantClasses.danger} ${sizeClasses.sm}`}
            onClick={handleSignOut}
            disabled={isSigningOut}
          >
            {isSigningOut && <LoadingSpinner className="mr-2 h-4 w-4" />}
            Yes, sign out
          </button>
          <button
            className={`${baseClasses} ${variantClasses.ghost} ${sizeClasses.sm}`}
            onClick={handleCancel}
            disabled={isSigningOut}
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
 * Compact sign-out button for navigation bars
 */
export interface SignOutButtonProps {
  callbackUrl?: string
  variant?: 'text' | 'button'
  className?: string
  iconOnly?: boolean
  showConfirmation?: boolean
}

export function SignOutButton({
  callbackUrl = '/',
  variant = 'text',
  className,
  iconOnly = false,
  showConfirmation = false
}: SignOutButtonProps) {
  const { signOut, isLoading } = useAuth()
  const [isSigningOut, setIsSigningOut] = useState(false)

  const handleSignOut = async () => {
    if (showConfirmation && !confirm('Are you sure you want to sign out?')) {
      return
    }

    setIsSigningOut(true)
    try {
      await signOut(callbackUrl)
    } catch (err) {
      setIsSigningOut(false)
    }
  }

  if (variant === 'text') {
    return (
      <button
        className={`text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50 ${className || ''}`}
        onClick={handleSignOut}
        disabled={isLoading || isSigningOut}
      >
        {isSigningOut ? (
          <LoadingSpinner className="h-4 w-4" />
        ) : iconOnly ? (
          <SignOutIcon className="h-4 w-4" />
        ) : (
          'Sign out'
        )}
      </button>
    )
  }

  return (
    <button
      className={`inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed ${className || ''}`}
      onClick={handleSignOut}
      disabled={isLoading || isSigningOut}
    >
      {isSigningOut ? (
        <LoadingSpinner className="h-4 w-4" />
      ) : iconOnly ? (
        <SignOutIcon className="h-4 w-4" />
      ) : (
        <>
          <SignOutIcon className="mr-2 h-4 w-4" />
          Sign out
        </>
      )}
    </button>
  )
}

/**
 * Sign-out menu item for dropdown menus
 */
export interface SignOutMenuItemProps {
  callbackUrl?: string
  className?: string
  showConfirmation?: boolean
  onSignOut?: () => void
}

export function SignOutMenuItem({
  callbackUrl = '/',
  className,
  showConfirmation = true,
  onSignOut
}: SignOutMenuItemProps) {
  const { signOut, isLoading } = useAuth()
  const [isSigningOut, setIsSigningOut] = useState(false)

  const handleSignOut = async () => {
    if (showConfirmation && !confirm('Are you sure you want to sign out?')) {
      return
    }

    setIsSigningOut(true)
    try {
      await signOut(callbackUrl)
      onSignOut?.()
    } catch (err) {
      setIsSigningOut(false)
    }
  }

  return (
    <button
      className={`w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center ${className || ''}`}
      onClick={handleSignOut}
      disabled={isLoading || isSigningOut}
      role="menuitem"
    >
      {isSigningOut ? (
        <LoadingSpinner className="mr-3 h-4 w-4" />
      ) : (
        <SignOutIcon className="mr-3 h-4 w-4" />
      )}
      Sign out
    </button>
  )
}

/**
 * Sign-out confirmation dialog
 */
export interface SignOutDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title?: string
  message?: string
  confirmText?: string
  cancelText?: string
  isLoading?: boolean
}

export function SignOutDialog({
  isOpen,
  onClose,
  onConfirm,
  title = 'Sign out',
  message = 'Are you sure you want to sign out of your account?',
  confirmText = 'Sign out',
  cancelText = 'Cancel',
  isLoading = false
}: SignOutDialogProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center px-4 text-center">
        <div className="fixed inset-0 bg-black bg-opacity-25 transition-opacity" onClick={onClose} />
        
        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
          <div className="mb-4">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {title}
            </h3>
            <p className="text-sm text-gray-600">
              {message}
            </p>
          </div>
          
          <div className="flex space-x-3 justify-end">
            <button
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              onClick={onClose}
              disabled={isLoading}
            >
              {cancelText}
            </button>
            <button
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={onConfirm}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <LoadingSpinner className="mr-2 h-4 w-4" />
                  Signing out...
                </>
              ) : (
                confirmText
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Hook for managing sign-out state
 */
export function useSignOut(options?: {
  callbackUrl?: string
  onStart?: () => void
  onComplete?: () => void
  onError?: (error: Error) => void
}) {
  const { signOut } = useAuth()
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const handleSignOut = async () => {
    setIsSigningOut(true)
    setError(null)
    options?.onStart?.()

    try {
      await signOut(options?.callbackUrl || '/')
      options?.onComplete?.()
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Sign out failed')
      setError(error)
      options?.onError?.(error)
      setIsSigningOut(false)
    }
  }

  return {
    signOut: handleSignOut,
    isSigningOut,
    error
  }
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
 * Sign-out icon component
 */
function SignOutIcon({ className }: { className?: string }) {
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
        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
      />
    </svg>
  )
}