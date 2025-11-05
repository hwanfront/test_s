/**
 * Quota Display Component (Task T098)
 * 
 * Shows current quota status, usage, and remaining analyses
 * Integrated with analysis form widget for quota awareness
 */

'use client'

import React, { useEffect, useState } from 'react'
import { cn } from '@/shared/lib'
import { quotaApi, type QuotaStatusResponse, ClientQuotaValidator } from '@/entities/quota/lib/api'
import { useSession } from 'next-auth/react'
import { Alert, AlertDescription } from '@/shared/ui/alert'
import { Badge } from '@/shared/ui/badge'
import { AlertTriangle, CheckCircle, Clock, RefreshCw } from 'lucide-react'

export interface QuotaDisplayProps {
  className?: string
  variant?: 'compact' | 'detailed' | 'inline'
  showHistory?: boolean
  refreshInterval?: number
  onQuotaExceeded?: () => void
  onQuotaWarning?: (remaining: number) => void
}

/**
 * Main quota display component
 */
export const QuotaDisplay: React.FC<QuotaDisplayProps> = ({
  className,
  variant = 'detailed',
  showHistory = false,
  refreshInterval = 60000, // 60 seconds
  onQuotaExceeded,
  onQuotaWarning
}) => {
  const { data: session, status: authStatus } = useSession()
  const [quotaStatus, setQuotaStatus] = useState<QuotaStatusResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)

  // Fetch quota status
  const fetchQuotaStatus = async () => {
    if (authStatus !== 'authenticated') return

    try {
      setError(null)
      const status = await quotaApi.getStatus()
      setQuotaStatus(status)
      setLastRefresh(new Date())

      // Trigger callbacks
      if (status.quotaStatus === 'exceeded' && onQuotaExceeded) {
        onQuotaExceeded()
      } else if (status.remainingAnalyses <= 5 && status.remainingAnalyses > 0 && onQuotaWarning) {
        onQuotaWarning(status.remainingAnalyses)
      }
    } catch (error) {
      console.error('Failed to fetch quota status:', error)
      setError(error instanceof Error ? error.message : 'Failed to load quota status')
    } finally {
      setLoading(false)
    }
  }

  // Initial load and periodic refresh
  useEffect(() => {
    fetchQuotaStatus()

    const interval = setInterval(fetchQuotaStatus, refreshInterval)
    return () => clearInterval(interval)
  }, [authStatus, refreshInterval])

  // Manual refresh handler
  const handleRefresh = () => {
    setLoading(true)
    fetchQuotaStatus()
  }

  // Don't render if not authenticated
  if (authStatus !== 'authenticated') {
    return null
  }

  // Loading state
  if (loading && !quotaStatus) {
    return (
      <div className={cn('animate-pulse', className)}>
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <Alert className={cn('border-orange-200 bg-orange-50', className)}>
        <AlertTriangle className="h-4 w-4 text-orange-600" />
        <AlertDescription className="text-orange-800">
          Unable to load quota status: {error}
        </AlertDescription>
      </Alert>
    )
  }

  // No data
  if (!quotaStatus) {
    return null
  }

  const {
    dailyLimit,
    currentUsage,
    remainingAnalyses,
    quotaStatus: quotaState,
    usagePercentage,
    canPerformAnalysis,
    resetTime
  } = quotaStatus

  // Get status color and icon
  const getStatusInfo = () => {
    if (quotaState === 'exceeded') {
      return {
        color: 'destructive',
        icon: AlertTriangle,
        text: 'Quota Exceeded'
      }
    } else if (remainingAnalyses <= 5) {
      return {
        color: 'warning',
        icon: AlertTriangle,
        text: 'Low Quota'
      }
    } else {
      return {
        color: 'success',
        icon: CheckCircle,
        text: 'Available'
      }
    }
  }

  const statusInfo = getStatusInfo()
  const StatusIcon = statusInfo.icon
  const timeUntilReset = ClientQuotaValidator.formatTimeUntilReset(resetTime)

  // Render variants
  if (variant === 'compact') {
    return (
      <div className={cn('flex items-center gap-2 text-sm', className)}>
        <StatusIcon className={cn(
          'h-4 w-4',
          statusInfo.color === 'destructive' && 'text-destructive',
          statusInfo.color === 'warning' && 'text-orange-500',
          statusInfo.color === 'success' && 'text-green-600'
        )} />
        <span className="text-muted-foreground">
          {remainingAnalyses}/{dailyLimit} analyses left
        </span>
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="text-muted-foreground hover:text-foreground"
          title="Refresh quota status"
        >
          <RefreshCw className={cn('h-3 w-3', loading && 'animate-spin')} />
        </button>
      </div>
    )
  }

  if (variant === 'inline') {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <Badge variant={statusInfo.color === 'destructive' ? 'destructive' : 'secondary'}>
          {remainingAnalyses} left
        </Badge>
        {!canPerformAnalysis && (
          <span className="text-xs text-muted-foreground">
            Resets in {timeUntilReset}
          </span>
        )}
      </div>
    )
  }

  // Detailed variant (default)
  return (
    <div className={cn('space-y-3', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <StatusIcon className={cn(
            'h-4 w-4',
            statusInfo.color === 'destructive' && 'text-destructive',
            statusInfo.color === 'warning' && 'text-orange-500',
            statusInfo.color === 'success' && 'text-green-600'
          )} />
          <span className="text-sm font-medium">{statusInfo.text}</span>
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="text-muted-foreground hover:text-foreground transition-colors"
          title="Refresh quota status"
        >
          <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
        </button>
      </div>

      {/* Usage Stats */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Daily Usage</span>
          <span className="font-medium">
            {currentUsage} / {dailyLimit} analyses
          </span>
        </div>
        
        {/* Progress bar */}
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={cn(
              'h-2 rounded-full transition-all duration-300',
              usagePercentage >= 100 && 'bg-destructive',
              usagePercentage >= 80 && usagePercentage < 100 && 'bg-orange-500',
              usagePercentage < 80 && 'bg-green-600'
            )}
            style={{ width: `${Math.min(100, usagePercentage)}%` }}
          />
        </div>
        
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{usagePercentage.toFixed(1)}% used</span>
          <span>{remainingAnalyses} remaining</span>
        </div>
      </div>

      {/* Reset time */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Clock className="h-3 w-3" />
        <span>Resets in {timeUntilReset}</span>
        {lastRefresh && (
          <span className="text-gray-400">
            • Updated {lastRefresh.toLocaleTimeString()}
          </span>
        )}
      </div>

      {/* Warning message */}
      {!canPerformAnalysis && (
        <Alert className="border-destructive/20 bg-destructive/5">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <AlertDescription className="text-destructive">
            Daily quota exceeded. Analysis will be available after quota resets.
          </AlertDescription>
        </Alert>
      )}

      {/* Low quota warning */}
      {canPerformAnalysis && remainingAnalyses <= 5 && (
        <Alert className="border-orange-200 bg-orange-50">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            Only {remainingAnalyses} analyses remaining for today.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}

/**
 * Hook for quota status
 */
export function useQuotaStatus(refreshInterval = 60000) {
  const { status: authStatus } = useSession()
  const [quotaStatus, setQuotaStatus] = useState<QuotaStatusResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStatus = async () => {
    if (authStatus !== 'authenticated') return

    try {
      setError(null)
      const status = await quotaApi.getStatus()
      setQuotaStatus(status)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load quota')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStatus()
    const interval = setInterval(fetchStatus, refreshInterval)
    return () => clearInterval(interval)
  }, [authStatus, refreshInterval])

  return {
    quotaStatus,
    loading,
    error,
    refresh: fetchStatus,
    canAnalyze: quotaStatus?.canPerformAnalysis ?? false
  }
}

/**
 * Quota-aware analysis button component
 */
export interface QuotaAwareButtonProps {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  className?: string
  quotaCheck?: boolean
}

export const QuotaAwareButton: React.FC<QuotaAwareButtonProps> = ({
  children,
  onClick,
  disabled = false,
  className,
  quotaCheck = true
}) => {
  const { canAnalyze, loading } = useQuotaStatus()

  const isDisabled = disabled || (quotaCheck && !canAnalyze) || loading

  return (
    <button
      onClick={onClick}
      disabled={isDisabled}
      className={cn(
        'px-6 py-2 rounded-lg font-medium transition-all duration-200',
        'focus:outline-none focus:ring-2 focus:ring-offset-2',
        isDisabled
          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
          : 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
        className
      )}
      title={
        quotaCheck && !canAnalyze && !loading
          ? 'Daily quota exceeded'
          : undefined
      }
    >
      {children}
    </button>
  )
}