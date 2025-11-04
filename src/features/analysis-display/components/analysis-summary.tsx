import React from 'react'
import { cn } from '@/shared/lib'

export interface AnalysisSummaryData {
  totalRisks: number
  riskBreakdown: {
    critical: number
    high: number
    medium: number
    low: number
  }
  topCategories: Array<{
    category: string
    count: number
    averageRisk: number
  }>
  analysisLimitations: string[]
  recommendedActions: string[]
}

export interface AnalysisSummaryProps {
  summary: AnalysisSummaryData
  className?: string
}

/**
 * Displays overall analysis summary with risk breakdown and recommendations
 * Shows total risks, risk level distribution, top categories, and actionable insights
 */
export const AnalysisSummary: React.FC<AnalysisSummaryProps> = ({
  summary,
  className
}) => {
  const formatCategoryName = (category: string): string => {
    return category
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  const getRiskLevelColor = (level: string): string => {
    const colors: Record<string, string> = {
      critical: 'text-red-700 bg-red-100',
      high: 'text-red-600 bg-red-50',
      medium: 'text-orange-600 bg-orange-50',
      low: 'text-yellow-600 bg-yellow-50'
    }
    return colors[level] || 'text-gray-600 bg-gray-50'
  }

  const getTotalRiskColor = (): string => {
    if (summary.riskBreakdown.critical > 0) return 'text-red-700'
    if (summary.riskBreakdown.high > 0) return 'text-red-600'
    if (summary.riskBreakdown.medium > 0) return 'text-orange-600'
    return 'text-yellow-600'
  }

  return (
    <div
      data-testid="analysis-summary"
      className={cn('bg-white rounded-lg border p-6 space-y-6', className)}
    >
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Analysis Summary
        </h2>
        <p className={cn('text-3xl font-bold', getTotalRiskColor())}>
          {summary.totalRisks} Risk{summary.totalRisks !== 1 ? 's' : ''} Found
        </p>
      </div>

      {/* Risk Breakdown */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-3">
          Risk Breakdown
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Object.entries(summary.riskBreakdown).map(([level, count]) => (
            <div
              key={level}
              className={cn(
                'p-3 rounded-lg border text-center',
                getRiskLevelColor(level)
              )}
            >
              <div className="text-2xl font-bold">
                {count}
              </div>
              <div className="text-sm font-medium capitalize">
                {level} Risk{count !== 1 ? 's' : ''}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Top Categories */}
      {summary.topCategories.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            Most Common Issues
          </h3>
          <div className="space-y-2">
            {summary.topCategories.slice(0, 5).map((category, index) => (
              <div
                key={category.category}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 bg-blue-600 text-white text-xs font-bold rounded-full flex items-center justify-center">
                    {index + 1}
                  </span>
                  <span className="font-medium text-gray-900">
                    {formatCategoryName(category.category)}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-gray-600">
                    {category.count} issue{category.count !== 1 ? 's' : ''}
                  </span>
                  <span className="font-medium text-red-600">
                    {Math.round(category.averageRisk)}% avg risk
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommended Actions */}
      {summary.recommendedActions.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            Recommended Actions
          </h3>
          <ul className="space-y-2">
            {summary.recommendedActions.map((action, index) => (
              <li key={index} className="flex items-start gap-3">
                <span className="w-5 h-5 bg-green-600 text-white text-xs font-bold rounded-full flex items-center justify-center mt-0.5">
                  ✓
                </span>
                <span className="text-gray-700 leading-relaxed">
                  {action}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Analysis Limitations */}
      {summary.analysisLimitations.length > 0 && (
        <div className="border-t pt-4">
          <h4 className="text-md font-medium text-gray-700 mb-2">
            Analysis Limitations
          </h4>
          <ul className="text-sm text-gray-600 space-y-1">
            {summary.analysisLimitations.map((limitation, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="text-gray-400 mt-1">•</span>
                <span>{limitation}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}