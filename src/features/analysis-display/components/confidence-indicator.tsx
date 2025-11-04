import React from 'react'
import { cn } from '@/shared/lib'

export interface ConfidenceIndicatorProps {
  score: number
  className?: string
  showLabel?: boolean
  size?: 'sm' | 'md' | 'lg'
}

/**
 * Visual indicator for AI confidence scores
 * Shows confidence level with color-coded progress bar and descriptive text
 */
export const ConfidenceIndicator: React.FC<ConfidenceIndicatorProps> = ({
  score,
  className,
  showLabel = true,
  size = 'md'
}) => {
  // Normalize score to 0-100 range
  const normalizedScore = Math.max(0, Math.min(100, score))

  const getConfidenceLevel = (score: number): {
    level: string
    color: string
    bgColor: string
    description: string
  } => {
    if (score >= 90) {
      return {
        level: 'Very High',
        color: 'text-green-700',
        bgColor: 'bg-green-600',
        description: 'Highly confident in assessment'
      }
    } else if (score >= 75) {
      return {
        level: 'High',
        color: 'text-green-600',
        bgColor: 'bg-green-500',
        description: 'Confident in assessment'
      }
    } else if (score >= 60) {
      return {
        level: 'Medium',
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-500',
        description: 'Moderately confident'
      }
    } else if (score >= 40) {
      return {
        level: 'Low',
        color: 'text-orange-600',
        bgColor: 'bg-orange-500',
        description: 'Low confidence'
      }
    } else {
      return {
        level: 'Very Low',
        color: 'text-red-600',
        bgColor: 'bg-red-500',
        description: 'Very low confidence'
      }
    }
  }

  const confidence = getConfidenceLevel(normalizedScore)

  const sizeStyles = {
    sm: {
      bar: 'h-2',
      text: 'text-xs',
      container: 'gap-1'
    },
    md: {
      bar: 'h-3',
      text: 'text-sm',
      container: 'gap-2'
    },
    lg: {
      bar: 'h-4',
      text: 'text-base',
      container: 'gap-3'
    }
  }

  const styles = sizeStyles[size]

  return (
    <div
      data-testid="confidence-indicator"
      className={cn('flex items-center', styles.container, className)}
      aria-label={`Confidence: ${normalizedScore}% - ${confidence.description}`}
    >
      {showLabel && (
        <div className={cn('flex items-center gap-1', styles.text)}>
          <span className="text-gray-600 font-medium">Confidence:</span>
          <span className={cn('font-bold', confidence.color)}>
            {normalizedScore}%
          </span>
        </div>
      )}
      
      <div className={cn('flex-1 bg-gray-200 rounded-full overflow-hidden', styles.bar)}>
        <div
          className={cn(
            'h-full transition-all duration-300 ease-out',
            confidence.bgColor
          )}
          style={{ width: `${normalizedScore}%` }}
          role="progressbar"
          aria-valuenow={normalizedScore}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>

      {showLabel && (
        <span className={cn('font-medium', confidence.color, styles.text)}>
          {confidence.level}
        </span>
      )}
    </div>
  )
}