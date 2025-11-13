'use client'
/**
 * T127 [P] Add loading states and skeletons to all components
 * 
 * Skeleton loading components for better UX during data loading
 */

import React from 'react'
import { cn } from '@/shared/lib'

export interface SkeletonProps {
  className?: string
  width?: string | number
  height?: string | number
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded'
  animation?: 'pulse' | 'wave' | 'none'
}

/**
 * Base skeleton component
 */
export const Skeleton: React.FC<SkeletonProps> = ({
  className,
  width,
  height,
  variant = 'rectangular',
  animation = 'pulse'
}) => {
  const baseClasses = 'bg-gray-200 dark:bg-gray-700'
  
  const variantClasses = {
    text: 'h-4 rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-none',
    rounded: 'rounded-lg'
  }

  const animationClasses = {
    pulse: 'animate-pulse',
    wave: 'animate-pulse', // Can be enhanced with custom wave animation
    none: ''
  }

  const style = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height
  }

  return (
    <div
      className={cn(
        baseClasses,
        variantClasses[variant],
        animationClasses[animation],
        className
      )}
      style={style}
      aria-label="Loading..."
      role="status"
    />
  )
}

/**
 * Text skeleton for text content
 */
export const TextSkeleton: React.FC<{
  lines?: number
  className?: string
  lastLineWidth?: string
}> = ({ lines = 1, className, lastLineWidth = '60%' }) => (
  <div className={cn('space-y-2', className)}>
    {Array.from({ length: lines }).map((_, index) => (
      <Skeleton
        key={index}
        variant="text"
        width={index === lines - 1 ? lastLineWidth : '100%'}
        className="h-4"
      />
    ))}
  </div>
)

/**
 * Card skeleton for card-like content
 */
export const CardSkeleton: React.FC<{
  className?: string
  showAvatar?: boolean
  showActions?: boolean
}> = ({ className, showAvatar = false, showActions = false }) => (
  <div className={cn('p-4 border rounded-lg space-y-3', className)}>
    {showAvatar && (
      <div className="flex items-center space-x-3">
        <Skeleton variant="circular" width={40} height={40} />
        <div className="space-y-2 flex-1">
          <Skeleton variant="text" width="30%" />
          <Skeleton variant="text" width="50%" />
        </div>
      </div>
    )}
    
    <div className="space-y-2">
      <Skeleton variant="text" className="h-6" />
      <TextSkeleton lines={3} />
    </div>

    {showActions && (
      <div className="flex space-x-2 pt-2">
        <Skeleton variant="rounded" width={80} height={32} />
        <Skeleton variant="rounded" width={60} height={32} />
      </div>
    )}
  </div>
)

/**
 * Table skeleton for tabular data
 */
export const TableSkeleton: React.FC<{
  rows?: number
  columns?: number
  className?: string
}> = ({ rows = 5, columns = 4, className }) => (
  <div className={cn('w-full', className)}>
    {/* Header */}
    <div className="flex space-x-4 pb-2 border-b">
      {Array.from({ length: columns }).map((_, index) => (
        <Skeleton key={index} variant="text" className="h-5 flex-1" />
      ))}
    </div>
    
    {/* Rows */}
    <div className="space-y-3 pt-3">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex space-x-4">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton key={colIndex} variant="text" className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  </div>
)

/**
 * List skeleton for list items
 */
export const ListSkeleton: React.FC<{
  items?: number
  className?: string
  showIcon?: boolean
}> = ({ items = 5, className, showIcon = false }) => (
  <div className={cn('space-y-3', className)}>
    {Array.from({ length: items }).map((_, index) => (
      <div key={index} className="flex items-center space-x-3">
        {showIcon && <Skeleton variant="circular" width={24} height={24} />}
        <div className="flex-1 space-y-1">
          <Skeleton variant="text" width="70%" />
          <Skeleton variant="text" width="40%" className="h-3" />
        </div>
      </div>
    ))}
  </div>
)

/**
 * Analysis results skeleton
 */
export const AnalysisResultsSkeleton: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn('space-y-6', className)}>
    {/* Header Stats */}
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <CardSkeleton key={index} className="p-4 text-center" />
      ))}
    </div>

    {/* Risk Breakdown */}
    <div className="border rounded-lg p-6">
      <Skeleton variant="text" className="h-6 w-48 mb-4" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="p-3 border rounded-lg text-center space-y-2">
            <Skeleton variant="text" className="h-8 w-12 mx-auto" />
            <Skeleton variant="text" className="h-4" />
            <Skeleton variant="text" className="h-3 w-16 mx-auto" />
          </div>
        ))}
      </div>
    </div>

    {/* Risk List */}
    <div className="space-y-4">
      <Skeleton variant="text" className="h-6 w-64" />
      {Array.from({ length: 5 }).map((_, index) => (
        <CardSkeleton key={index} showActions className="p-4" />
      ))}
    </div>
  </div>
)

/**
 * Analysis form skeleton
 */
export const AnalysisFormSkeleton: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn('space-y-6', className)}>
    <div className="space-y-2">
      <Skeleton variant="text" className="h-6 w-32" />
      <Skeleton variant="rounded" className="h-32 w-full" />
    </div>
    
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <Skeleton variant="circular" width={16} height={16} />
        <Skeleton variant="text" className="h-4 w-48" />
      </div>
      <div className="flex items-center space-x-2">
        <Skeleton variant="circular" width={16} height={16} />
        <Skeleton variant="text" className="h-4 w-36" />
      </div>
    </div>

    <Skeleton variant="rounded" className="h-12 w-32" />
  </div>
)

/**
 * Navigation skeleton
 */
export const NavigationSkeleton: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn('flex items-center justify-between p-4', className)}>
    <Skeleton variant="text" className="h-8 w-32" />
    <div className="flex items-center space-x-4">
      <Skeleton variant="rounded" className="h-8 w-20" />
      <Skeleton variant="circular" width={32} height={32} />
    </div>
  </div>
)

/**
 * Dashboard skeleton
 */
export const DashboardSkeleton: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn('space-y-6', className)}>
    <NavigationSkeleton />
    
    {/* Quick stats */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {Array.from({ length: 3 }).map((_, index) => (
        <CardSkeleton key={index} className="p-6" />
      ))}
    </div>

    {/* Main content */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-4">
        <Skeleton variant="text" className="h-6 w-48" />
        <ListSkeleton items={6} showIcon />
      </div>
      
      <div className="space-y-4">
        <Skeleton variant="text" className="h-6 w-40" />
        <CardSkeleton className="h-64" />
      </div>
    </div>
  </div>
)

/**
 * Loading spinner component
 */
export const LoadingSpinner: React.FC<{
  size?: 'sm' | 'md' | 'lg'
  className?: string
}> = ({ size = 'md', className }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8', 
    lg: 'w-12 h-12'
  }

  return (
    <div
      className={cn(
        'animate-spin rounded-full border-2 border-gray-300 border-t-blue-600',
        sizeClasses[size],
        className
      )}
      aria-label="Loading..."
      role="status"
    />
  )
}

/**
 * Loading overlay component
 */
export const LoadingOverlay: React.FC<{
  loading: boolean
  children: React.ReactNode
  className?: string
  spinnerSize?: 'sm' | 'md' | 'lg'
  message?: string
}> = ({ loading, children, className, spinnerSize = 'md', message }) => {
  if (!loading) {
    return <>{children}</>
  }

  return (
    <div className={cn('relative', className)}>
      <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <LoadingSpinner size={spinnerSize} className="mx-auto" />
          {message && (
            <p className="text-gray-600 text-sm">{message}</p>
          )}
        </div>
      </div>
      <div className="opacity-50 pointer-events-none">
        {children}
      </div>
    </div>
  )
}

/**
 * Suspense fallback components
 */
export const SuspenseFallback: React.FC<{
  type?: 'page' | 'component' | 'modal'
  message?: string
}> = ({ type = 'component', message }) => {
  if (type === 'page') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <LoadingSpinner size="lg" />
          <p className="text-gray-600">{message || 'Loading page...'}</p>
        </div>
      </div>
    )
  }

  if (type === 'modal') {
    return (
      <div className="p-8 text-center space-y-4">
        <LoadingSpinner size="md" className="mx-auto" />
        <p className="text-gray-600">{message || 'Loading...'}</p>
      </div>
    )
  }

  return (
    <div className="p-4 text-center">
      <LoadingSpinner size="sm" className="mx-auto" />
      {message && <p className="text-gray-600 text-sm mt-2">{message}</p>}
    </div>
  )
}

/**
 * Loading state hook
 */
export function useLoadingState(initialLoading = false) {
  const [loading, setLoading] = React.useState(initialLoading)
  const [error, setError] = React.useState<Error | null>(null)

  const startLoading = React.useCallback(() => {
    setLoading(true)
    setError(null)
  }, [])

  const stopLoading = React.useCallback(() => {
    setLoading(false)
  }, [])

  const setLoadingError = React.useCallback((error: Error) => {
    setLoading(false)
    setError(error)
  }, [])

  const resetState = React.useCallback(() => {
    setLoading(false)
    setError(null)
  }, [])

  return {
    loading,
    error,
    startLoading,
    stopLoading,
    setLoadingError,
    resetState
  }
}

/**
 * Async operation wrapper with loading state
 */
export function withLoadingState<T extends (...args: any[]) => Promise<any>>(
  asyncFn: T,
  onLoading?: (loading: boolean) => void,
  onError?: (error: Error) => void
): T {
  return (async (...args: any[]) => {
    try {
      onLoading?.(true)
      const result = await asyncFn(...args)
      onLoading?.(false)
      return result
    } catch (error) {
      onLoading?.(false)
      onError?.(error as Error)
      throw error
    }
  }) as T
}

// Export all components for easy use