'use client'

import React, { useState } from 'react'
import { cn } from '@/shared/lib'

export interface RiskAssessment {
  id?: string
  clauseCategory: string
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  riskScore: number
  confidenceScore: number
  summary: string
  rationale: string
  suggestedAction?: string
  startPosition: number
  endPosition: number
  createdAt?: string
}

export interface RiskCardProps {
  assessment: RiskAssessment
  className?: string
}

/**
 * Displays a single risk assessment in card format
 * Shows summary, risk level, scores, and expandable details
 */
export const RiskCard: React.FC<RiskCardProps> = ({
  assessment,
  className
}) => {
  const [isExpanded, setIsExpanded] = useState(false)

  const riskLevelStyles = {
    low: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    medium: 'bg-orange-50 border-orange-200 text-orange-800', 
    high: 'bg-red-50 border-red-200 text-red-800',
    critical: 'bg-red-100 border-red-300 text-red-900'
  }

  const riskLevelColors = {
    low: 'text-yellow-600',
    medium: 'text-orange-600',
    high: 'text-red-600',
    critical: 'text-red-700'
  }

  const formatCategoryName = (category: string): string => {
    return category
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  const getRiskLevelDisplay = (level: string): string => {
    const levels: Record<string, string> = {
      low: 'Low Risk',
      medium: 'Medium Risk', 
      high: 'High Risk',
      critical: 'Critical Risk'
    }
    return levels[level] || 'Unknown Risk'
  }

  return (
    <div
      data-testid="risk-card"
      className={cn(
        'border rounded-lg p-4 transition-all duration-200 hover:shadow-md',
        `risk-${assessment.riskLevel}`,
        riskLevelStyles[assessment.riskLevel],
        className
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-semibold text-lg mb-1">
            {assessment.summary}
          </h3>
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium">
              {formatCategoryName(assessment.clauseCategory)}
            </span>
            <span className="text-gray-400">•</span>
            <span className={cn('font-medium', riskLevelColors[assessment.riskLevel])}>
              {getRiskLevelDisplay(assessment.riskLevel)}
            </span>
          </div>
        </div>
      </div>

      {/* Risk Scores */}
      <div className="flex items-center gap-4 mb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-600">Risk:</span>
          <span className={cn('text-sm font-bold', riskLevelColors[assessment.riskLevel])}>
            {assessment.riskScore}%
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-600">Confidence:</span>
          <span 
            className="text-sm font-bold text-gray-700"
            data-testid="confidence-indicator"
            aria-label={`Confidence: ${assessment.confidenceScore}%`}
          >
            {assessment.confidenceScore}%
          </span>
        </div>
      </div>

      {/* Expand/Collapse Button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
      >
        {isExpanded ? 'Hide Details' : 'Show Details'}
      </button>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-1">
              Why is this problematic?
            </h4>
            <p className="text-sm text-gray-600 leading-relaxed">
              {assessment.rationale}
            </p>
          </div>

          {assessment.suggestedAction && (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-1">
                Recommended Action
              </h4>
              <p className="text-sm text-gray-600 leading-relaxed">
                {assessment.suggestedAction}
              </p>
            </div>
          )}

          <div className="text-xs text-gray-500">
            Position: {assessment.startPosition}-{assessment.endPosition}
            {assessment.createdAt && (
              <span className="ml-2">
                • Analyzed {new Date(assessment.createdAt).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}