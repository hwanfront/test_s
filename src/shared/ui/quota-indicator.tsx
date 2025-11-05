/**
 * Quota Indicator Component (Task T099)
 * 
 * Shared UI component for displaying quota status across the application
 * Shows usage progress, remaining analyses, and quota status
 */

'use client'

import React from 'react'
import { cn } from '@/shared/lib'
import { Badge } from './badge'
import { AlertTriangle, CheckCircle, Clock } from 'lucide-react'

export interface QuotaIndicatorProps {
  /**
   * Current usage count
   */
  currentUsage: number
  
  /**
   * Daily limit for analyses
   */
  dailyLimit: number
  
  /**
   * Remaining analyses count
   */
  remainingAnalyses: number
  
  /**
   * Quota status from API
   */
  quotaStatus: 'active' | 'exceeded' | 'reset_pending'
  
  /**
   * Usage percentage (0-100)
   */
  usagePercentage: number
  
  /**
   * Time until quota reset
   */
  resetTime?: string
  
  /**
   * Display variant
   */
  variant?: 'compact' | 'detailed' | 'badge-only'
  
  /**
   * Color scheme
   */
  colorScheme?: 'default' | 'success' | 'warning' | 'danger'
  
  /**
   * Additional CSS classes
   */
  className?: string
  
  /**
   * Show reset time
   */
  showResetTime?: boolean
  
  /**
   * Callback when quota is exceeded
   */
  onQuotaExceeded?: () => void
}

/**
 * Get status configuration based on quota state
 */
function getStatusConfig(
  quotaStatus: QuotaIndicatorProps['quotaStatus'],
  remainingAnalyses: number,
  usagePercentage: number
) {
  if (quotaStatus === 'exceeded') {
    return {
      color: 'danger',
      icon: AlertTriangle,
      text: 'Quota Exceeded',
      badgeVariant: 'destructive' as const
    }
  }
  
  if (usagePercentage >= 80 || remainingAnalyses <= 1) {
    return {
      color: 'warning',
      icon: AlertTriangle,
      text: 'Low Quota',
      badgeVariant: 'secondary' as const
    }
  }
  
  return {
    color: 'success',
    icon: CheckCircle,
    text: 'Available',
    badgeVariant: 'secondary' as const
  }
}

/**
 * Format time until reset in human-readable format
 */
function formatTimeUntilReset(resetTime: string): string {
  const resetDate = new Date(resetTime)
  const now = new Date()
  const timeUntilReset = Math.max(0, resetDate.getTime() - now.getTime())
  
  const hours = Math.floor(timeUntilReset / (1000 * 60 * 60))
  const minutes = Math.floor((timeUntilReset % (1000 * 60 * 60)) / (1000 * 60))
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`
  } else if (minutes > 0) {
    return `${minutes}m`
  } else {
    return 'Soon'
  }
}

/**
 * Main quota indicator component
 */
export const QuotaIndicator: React.FC<QuotaIndicatorProps> = ({
  currentUsage,
  dailyLimit,
  remainingAnalyses,
  quotaStatus,
  usagePercentage,
  resetTime,
  variant = 'compact',
  colorScheme,
  className,
  showResetTime = true,
  onQuotaExceeded
}) => {
  const statusConfig = getStatusConfig(quotaStatus, remainingAnalyses, usagePercentage)
  const StatusIcon = statusConfig.icon
  
  // Use provided color scheme or derive from status
  const effectiveColorScheme = colorScheme || statusConfig.color
  
  // Format reset time if available
  const formattedResetTime = resetTime ? formatTimeUntilReset(resetTime) : null
  
  // Trigger callback if quota is exceeded
  React.useEffect(() => {
    if (quotaStatus === 'exceeded' && onQuotaExceeded) {
      onQuotaExceeded()
    }
  }, [quotaStatus, onQuotaExceeded])
  
  // Badge-only variant
  if (variant === 'badge-only') {
    return (
      <Badge 
        variant={statusConfig.badgeVariant}
        className={cn('flex items-center gap-1', className)}
      >
        <StatusIcon className="h-3 w-3" />
        {remainingAnalyses} left
      </Badge>
    )
  }
  
  // Compact variant
  if (variant === 'compact') {
    return (
      <div className={cn('flex items-center gap-2 text-sm', className)}>
        <StatusIcon className={cn(
          'h-4 w-4',
          effectiveColorScheme === 'danger' && 'text-destructive',
          effectiveColorScheme === 'warning' && 'text-orange-500',
          effectiveColorScheme === 'success' && 'text-green-600'
        )} />
        <span className="font-medium">
          {remainingAnalyses}/{dailyLimit}
        </span>
        <span className="text-muted-foreground">
          analyses left
        </span>
        {showResetTime && formattedResetTime && (
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formattedResetTime}
          </span>
        )}
      </div>
    )
  }
  
  // Detailed variant
  return (
    <div className={cn('space-y-3', className)}>
      {/* Header with status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <StatusIcon className={cn(
            'h-4 w-4',
            effectiveColorScheme === 'danger' && 'text-destructive',
            effectiveColorScheme === 'warning' && 'text-orange-500',
            effectiveColorScheme === 'success' && 'text-green-600'
          )} />
          <span className="text-sm font-medium">{statusConfig.text}</span>
        </div>
        <Badge variant={statusConfig.badgeVariant}>
          {remainingAnalyses} remaining
        </Badge>
      </div>
      
      {/* Usage stats */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Daily Usage</span>
          <span className="font-medium">
            {currentUsage} / {dailyLimit} analyses
          </span>
        </div>
        
        {/* Progress bar */}
        <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
          <div
            className={cn(
              'h-2 rounded-full transition-all duration-300',
              effectiveColorScheme === 'danger' && 'bg-destructive',
              effectiveColorScheme === 'warning' && 'bg-orange-500',
              effectiveColorScheme === 'success' && 'bg-green-600'
            )}
            style={{ width: `${Math.min(100, usagePercentage)}%` }}
          />
        </div>
        
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{usagePercentage.toFixed(1)}% used</span>
          {showResetTime && formattedResetTime && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Resets in {formattedResetTime}
            </span>
          )}
        </div>
      </div>
      
      {/* Quota exceeded warning */}
      {quotaStatus === 'exceeded' && (
        <div className="text-xs text-destructive">
          Daily quota exceeded. Analysis will be available after quota resets.
        </div>
      )}
      
      {/* Low quota warning */}
      {quotaStatus === 'active' && remainingAnalyses <= 1 && (
        <div className="text-xs text-orange-600">
          Only {remainingAnalyses} analysis remaining for today.
        </div>
      )}
    </div>
  )
}

/**
 * Preset quota indicator variants for common use cases
 */
export const QuotaIndicatorPresets = {
  /**
   * Header variant for navigation bars
   */
  Header: (props: Omit<QuotaIndicatorProps, 'variant'>) => (
    <QuotaIndicator {...props} variant="compact" />
  ),
  
  /**
   * Sidebar variant for dashboard layouts
   */
  Sidebar: (props: Omit<QuotaIndicatorProps, 'variant'>) => (
    <QuotaIndicator {...props} variant="detailed" />
  ),
  
  /**
   * Inline badge for forms and buttons
   */
  InlineBadge: (props: Omit<QuotaIndicatorProps, 'variant'>) => (
    <QuotaIndicator {...props} variant="badge-only" />
  )
}

export default QuotaIndicator