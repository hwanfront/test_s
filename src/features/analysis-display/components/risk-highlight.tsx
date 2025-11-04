import React, { useState } from 'react'
import { cn } from '@/shared/lib'

export interface RiskHighlightProps {
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  summary: string
  onHover?: () => void
  children: React.ReactNode
  className?: string
}

/**
 * Highlights risky text content with color-coded styling
 * Shows tooltip on hover with risk summary
 */
export const RiskHighlight: React.FC<RiskHighlightProps> = ({
  riskLevel,
  summary,
  onHover,
  children,
  className
}) => {
  const [showTooltip, setShowTooltip] = useState(false)

  const handleMouseEnter = () => {
    setShowTooltip(true)
    onHover?.()
  }

  const handleMouseLeave = () => {
    setShowTooltip(false)
  }

  const riskStyles = {
    low: 'bg-yellow-100 border-yellow-300 text-yellow-800 hover:bg-yellow-200',
    medium: 'bg-orange-100 border-orange-300 text-orange-800 hover:bg-orange-200',
    high: 'bg-red-100 border-red-300 text-red-800 hover:bg-red-200',
    critical: 'bg-red-200 border-red-500 text-red-900 hover:bg-red-300'
  }

  return (
    <span
      className={cn(
        'relative inline-block px-1 py-0.5 border rounded cursor-pointer transition-colors',
        `risk-${riskLevel}`,
        riskStyles[riskLevel],
        className
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-10">
          <div className="bg-gray-900 text-white text-sm rounded px-3 py-2 whitespace-nowrap shadow-lg">
            {summary}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
          </div>
        </div>
      )}
    </span>
  )
}