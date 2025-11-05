/**
 * Results Dashboard Widget Component
 * T066 [US1] Create results dashboard widget
 * 
 * Comprehensive dashboard for displaying and managing analysis results
 */

import React, { useEffect } from 'react'
import { cn } from '@/shared/lib'
import { useResultsDashboardStore, formatRiskLevel, getRiskLevelColor, formatDuration, formatCategoryName, calculateRiskDistribution } from '../model/store'
import { AnalysisSummary } from '@/features/analysis-display/components/analysis-summary'
import { ResultsViewer } from '@/features/analysis-display/components/results-viewer'
import { ConfidenceIndicator } from '@/features/analysis-display/components/confidence-indicator'
import { RiskCard } from '@/features/analysis-display/components/risk-card'
import type { AnalysisResults } from '@/features/analysis-display/components/results-viewer'

export interface ResultsDashboardProps {
  analysisResult?: AnalysisResults | null
  className?: string
  onNewAnalysis?: () => void
  onDownloadReport?: () => void
  onShareResults?: () => void
}

/**
 * Main results dashboard widget with comprehensive result management
 */
export const ResultsDashboard: React.FC<ResultsDashboardProps> = ({
  analysisResult: externalResult,
  className,
  onNewAnalysis,
  onDownloadReport,
  onShareResults
}) => {
  const {
    analysisResult,
    loading,
    error,
    selectedRiskLevels,
    sortBy,
    sortOrder,
    showDetails,
    activeTab,
    viewMode,
    showConfidenceScores,
    expandedRisks,
    setAnalysisResult,
    setSelectedRiskLevels,
    setSortBy,
    setSortOrder,
    toggleDetails,
    toggleRiskExpansion,
    setActiveTab,
    setViewMode,
    toggleConfidenceScores,
    getSortedRisks,
    getRiskCounts
  } = useResultsDashboardStore()

  // Sync external result with store
  useEffect(() => {
    if (externalResult !== undefined) {
      setAnalysisResult(externalResult)
    }
  }, [externalResult, setAnalysisResult])

  const result = analysisResult || externalResult

  // Loading state
  if (loading) {
    return (
      <div className={cn('bg-white rounded-lg border p-8', className)}>
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Processing Analysis...
            </h3>
            <p className="text-gray-600">
              Please wait while we analyze your terms and conditions
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className={cn('bg-white rounded-lg border border-red-200 p-6', className)}>
        <div className="text-center space-y-3">
          <div className="text-red-600 text-4xl">⚠️</div>
          <div>
            <h3 className="text-lg font-medium text-red-900 mb-2">
              Analysis Error
            </h3>
            <p className="text-red-700 mb-4">
              {error}
            </p>
            {onNewAnalysis && (
              <button
                onClick={onNewAnalysis}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Try New Analysis
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // No results state
  if (!result) {
    return (
      <div className={cn('bg-white rounded-lg border p-8', className)}>
        <div className="text-center space-y-3">
          <div className="text-gray-400 text-4xl">📊</div>
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No Analysis Results
            </h3>
            <p className="text-gray-600 mb-4">
              Start by analyzing your terms and conditions to see results here.
            </p>
            {onNewAnalysis && (
              <button
                onClick={onNewAnalysis}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Start Analysis
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Get computed values after checking for valid result
  const sortedRisks = getSortedRisks()
  const riskCounts = getRiskCounts()
  const riskDistribution = calculateRiskDistribution(riskCounts)

  const renderAnalysisSummary = () => (
    <div data-testid="analysis-summary-section" className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border">
          <div className={cn('text-2xl font-bold', result?.session?.riskLevel ? getRiskLevelColor(result.session.riskLevel)?.split(' ')?.[0] || 'text-gray-600' : 'text-gray-600')}>
            {result?.session?.riskLevel ? formatRiskLevel(result.session.riskLevel) : 'Unknown'} Risk ({result?.session?.riskScore || 0}%)
          </div>
          <div className="text-sm text-gray-600">Overall Risk Level</div>
        </div>

        <div className="bg-white p-4 rounded-lg border">
          <div className="text-2xl font-bold text-blue-600">
            {result.summary.totalRisks} risks found
          </div>
          <div className="text-sm text-gray-600">Total Issues</div>
        </div>

        <div className="bg-white p-4 rounded-lg border">
          <div className="text-2xl font-bold text-green-600">
            {result.session.confidenceScore}% confidence
          </div>
          <div className="text-sm text-gray-600">Analysis Confidence</div>
        </div>

        <div className="bg-white p-4 rounded-lg border">
          <div className="text-2xl font-bold text-gray-800">
            {formatDuration(result.session.processingTimeMs)} processing time
          </div>
          <div className="text-sm text-gray-600">Time Taken</div>
        </div>
      </div>

      {/* Risk Breakdown */}
      <div className="bg-white p-6 rounded-lg border">
        <h3 className="text-lg font-semibold mb-4">Risk Breakdown</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {(['critical', 'high', 'medium', 'low'] as const).map(level => (
            <div
              key={level}
              className={cn('p-3 rounded-lg border text-center', getRiskLevelColor(level))}
            >
              <div className="text-2xl font-bold">{riskCounts[level]}</div>
              <div className="text-sm font-medium">{riskCounts[level]} {formatRiskLevel(level)}</div>
              <div className="text-xs mt-1">{riskDistribution[level]}% of total</div>
            </div>
          ))}
        </div>
      </div>

      {/* Confidence Indicator */}
      {showConfidenceScores && (
        <div className="bg-white p-6 rounded-lg border">
          <h3 className="text-lg font-semibold mb-4">Analysis Confidence</h3>
          <ConfidenceIndicator score={result.session.confidenceScore} size="lg" />
        </div>
      )}

      {/* Analysis Summary Component */}
      <AnalysisSummary summary={result.summary} />
    </div>
  )

  const renderRiskFilter = () => (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      <span className="text-sm font-medium text-gray-700">Filter by risk level:</span>
      {(['critical', 'high', 'medium', 'low'] as const).map(level => (
        <button
          key={level}
          onClick={() => {
            const newLevels = selectedRiskLevels.includes(level)
              ? selectedRiskLevels.filter(l => l !== level)
              : [...selectedRiskLevels, level]
            setSelectedRiskLevels(newLevels)
          }}
          className={cn(
            'px-3 py-1 text-xs rounded-full border transition-colors',
            selectedRiskLevels.includes(level)
              ? getRiskLevelColor(level)
              : 'bg-gray-100 text-gray-600 border-gray-300 hover:bg-gray-200'
          )}
        >
          {formatRiskLevel(level)} ({riskCounts[level]})
        </button>
      ))}
    </div>
  )

  const renderSortControls = () => (
    <div className="flex items-center gap-4 mb-4">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-gray-700">Sort by:</span>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          className="text-sm border rounded px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="riskScore">Risk Score</option>
          <option value="confidenceScore">Confidence</option>
          <option value="category">Category</option>
          <option value="position">Position</option>
          <option value="createdAt">Date</option>
        </select>
      </div>

      <button
        onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
        className="px-3 py-1 text-sm bg-gray-100 rounded hover:bg-gray-200 transition-colors"
      >
        {sortOrder === 'asc' ? '↑ Ascending' : '↓ Descending'}
      </button>

      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-gray-700">View:</span>
        <button
          onClick={() => setViewMode(viewMode === 'cards' ? 'table' : 'cards')}
          className="px-3 py-1 text-sm bg-gray-100 rounded hover:bg-gray-200 transition-colors"
        >
          {viewMode === 'cards' ? '📋 Table' : '🎴 Cards'}
        </button>
      </div>
    </div>
  )

  const renderRiskAssessments = () => (
    <div data-testid="risk-assessments-section" className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Individual Risk Assessments</h3>
        <button
          onClick={toggleConfidenceScores}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          {showConfidenceScores ? 'Hide' : 'Show'} Confidence Scores
        </button>
      </div>

      {renderRiskFilter()}
      {renderSortControls()}

      {sortedRisks.length > 0 ? (
        <div className="space-y-3">
          {sortedRisks.map(risk => (
            <div key={risk.id} className="relative">
              <RiskCard
                assessment={risk}
                className={cn(
                  expandedRisks.has(risk.id) ? 'ring-2 ring-blue-500' : ''
                )}
              />
              <button
                onClick={() => toggleRiskExpansion(risk.id)}
                className="absolute top-2 right-2 p-1 rounded hover:bg-gray-100"
                aria-label={expandedRisks.has(risk.id) ? 'Collapse' : 'Expand'}
              >
                {expandedRisks.has(risk.id) ? '−' : '+'}
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          No risks match the current filter criteria.
        </div>
      )}
    </div>
  )

  const renderMetadata = () => (
    <div data-testid="analysis-metadata-section" className="bg-white p-6 rounded-lg border">
      <h3 className="text-lg font-semibold mb-4">Analysis Information</h3>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">Session ID:</span>
          <span className="font-mono text-xs">{result.session.id}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Content Length:</span>
          <span>{result.session.contentLength.toLocaleString()} characters</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Analysis Started:</span>
          <span>{new Date(result.session.createdAt).toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Analysis Completed:</span>
          <span>{new Date(result.session.completedAt || result.session.createdAt).toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Results Expire:</span>
          <span>{new Date(result.session.expiresAt).toLocaleString()}</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 mt-6">
        {onNewAnalysis && (
          <button
            onClick={onNewAnalysis}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            New Analysis
          </button>
        )}
        {onDownloadReport && (
          <button
            onClick={onDownloadReport}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
          >
            Download Report
          </button>
        )}
        {onShareResults && (
          <button
            onClick={onShareResults}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
          >
            Share Results
          </button>
        )}
      </div>
    </div>
  )

  return (
    <main
      role="main"
      aria-label="Results Dashboard"
      className={cn('space-y-6', className)}
    >
      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {[
            { id: 'summary', label: 'Summary', icon: '📊' },
            { id: 'risks', label: 'Risk Details', icon: '⚠️' },
            { id: 'timeline', label: 'Timeline', icon: '📅' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                'py-4 px-1 border-b-2 font-medium text-sm transition-colors',
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              )}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'summary' && renderAnalysisSummary()}
      {activeTab === 'risks' && renderRiskAssessments()}
      {activeTab === 'timeline' && renderMetadata()}

      {/* Quick Actions */}
      <div className="flex items-center justify-between pt-6 border-t border-gray-200">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span>Last updated:</span>
          <span>{new Date(result.session.completedAt || result.session.createdAt).toLocaleString()}</span>
        </div>

        <button
          onClick={toggleDetails}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          {showDetails ? 'Hide' : 'Show'} Advanced Details
        </button>
      </div>
    </main>
  )
}