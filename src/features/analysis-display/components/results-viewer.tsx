'use client'

import React, { useState } from 'react'
import { cn } from '@/shared/lib'
import { RiskCard, RiskAssessment } from './risk-card'
import { AnalysisSummary, AnalysisSummaryData } from './analysis-summary'
import { ConfidenceIndicator } from './confidence-indicator'

export interface AnalysisSession {
  id: string
  contentLength: number
  status: 'processing' | 'completed' | 'failed' | 'expired'
  riskScore: number
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  confidenceScore: number
  processingTimeMs: number
  createdAt: string
  completedAt?: string
  expiresAt: string
  errorMessage?: string
}

export interface AnalysisResults {
  session: AnalysisSession
  riskAssessments: RiskAssessment[]
  summary: AnalysisSummaryData
}

export interface ResultsViewerProps {
  results?: AnalysisResults
  result?: AnalysisResults // Alternative prop name for backward compatibility
  loading?: boolean
  error?: string
  originalText?: string
  className?: string
}

/**
 * Main component for displaying complete analysis results
 * Orchestrates all display components and provides navigation between views
 */
export const ResultsViewer: React.FC<ResultsViewerProps> = ({
  results,
  result,
  loading = false,
  error,
  originalText,
  className
}) => {
  // Use either results or result prop for flexibility
  const analysisResults = results || result
  
  const [activeTab, setActiveTab] = useState<'summary' | 'risks' | 'text'>('risks')
  const [sortBy, setSortBy] = useState<'position' | 'risk' | 'category'>('position')
  const [filterBy, setFilterBy] = useState<'all' | 'critical' | 'high' | 'medium' | 'low'>('all')

  // Loading state
  if (loading) {
    return (
      <div
        data-testid="results-viewer-loading"
        className={cn('bg-white rounded-lg border p-8', className)}
      >
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" role="progressbar"></div>
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Analyzing terms...
            </h3>
            <p className="text-gray-600">
              Our AI is carefully reviewing the document for potential risks...
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div
        data-testid="results-viewer-error"
        className={cn('bg-white rounded-lg border border-red-200 p-6', className)}
      >
        <div className="text-center space-y-3">
          <div className="text-red-600 text-4xl">⚠️</div>
          <div>
            <h3 className="text-lg font-medium text-red-900 mb-2">
              Analysis Failed
            </h3>
            <p className="text-red-700">
              {error}
            </p>
            <button className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
              Try Again
            </button>
          </div>
        </div>
      </div>
    )
  }

    // No results state
  if (!analysisResults) {
    return (
      <div
        data-testid="results-viewer-empty"
        className={cn('bg-gray-50 rounded-lg border p-8', className)}
      >
        <div className="text-center space-y-3">
          <div className="text-gray-400 text-4xl">�</div>
          <div>
            <h3 className="text-lg font-medium text-gray-600 mb-2">
              No Results Available
            </h3>
            <p className="text-gray-600">
              Submit terms and conditions text to get started with the analysis.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Expired session state
  if (analysisResults.session?.status === 'expired') {
    return (
      <div
        data-testid="results-viewer-expired"
        className={cn('bg-white rounded-lg border border-yellow-200 p-8', className)}
      >
        <div className="text-center space-y-3">
          <div className="text-yellow-600 text-4xl">⏰</div>
          <div>
            <h3 className="text-lg font-medium text-yellow-900 mb-2">
              Results Expired
            </h3>
            <p className="text-yellow-700">
              These analysis results have expired and are no longer available.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Sort and filter risk assessments
  const filteredRisks = analysisResults.riskAssessments?.filter(risk => {
    if (filterBy === 'all') return true
    return risk.riskLevel === filterBy
  }) || []
  
  const sortedRisks = [...filteredRisks].sort((a, b) => {
    switch (sortBy) {
      case 'risk':
        return b.riskScore - a.riskScore
      case 'category':
        return a.clauseCategory.localeCompare(b.clauseCategory)
      case 'position':
      default:
        return a.startPosition - b.startPosition
    }
  })

  const getRiskLevelColor = (level: string): string => {
    const colors: Record<string, string> = {
      critical: 'text-red-700',
      high: 'text-red-600',
      medium: 'text-orange-600',
      low: 'text-yellow-600'
    }
    return colors[level] || 'text-gray-600'
  }

  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
    return `${(ms / 60000).toFixed(1)}m`
  }

  return (
    <div
      data-testid="results-viewer"
      className={cn('bg-white rounded-lg border', className)}
    >
      {/* Header */}
      <div className="border-b p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Analysis Results
            </h2>
            <p className="text-gray-600 mt-1">
              Processed {analysisResults.session?.contentLength?.toLocaleString() || 0} characters
            </p>
          </div>
          <div className="text-right">
            <div className={cn('text-2xl font-bold', getRiskLevelColor(analysisResults.session?.riskLevel || 'low'))}>
              {(analysisResults.session?.riskLevel || 'unknown').charAt(0).toUpperCase() + (analysisResults.session?.riskLevel || 'unknown').slice(1)} Risk ({analysisResults.session?.riskScore || 0}%)
            </div>
            <div className="text-sm text-gray-600">
              Processed in {formatDuration(analysisResults.session?.processingTimeMs || 0)}
            </div>
          </div>
        </div>

        {/* Overall Confidence */}
        <ConfidenceIndicator
          score={analysisResults.session?.confidenceScore || 0}
          size="lg"
          className="mb-4"
        />

        {/* Metadata */}
        <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-4">
          <span>Processing Time: {formatDuration(analysisResults.session?.processingTimeMs || 0)}</span>
          <span>Confidence: {analysisResults.session?.confidenceScore || 0}%</span>
          <span>Expires: {analysisResults.session?.expiresAt ? new Date(analysisResults.session.expiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Unknown'}</span>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
          {[
            { id: 'summary', label: 'Summary', count: null },
            { id: 'risks', label: 'Risk Details', count: analysisResults.riskAssessments.length },
            ...(originalText ? [{ id: 'text', label: 'Highlighted Text', count: null }] : [])
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                'flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors',
                activeTab === tab.id
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              )}
            >
              {tab.label}
              {tab.count !== null && (
                <span className="ml-2 px-2 py-1 bg-gray-200 text-xs rounded-full">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {activeTab === 'summary' && (
          <AnalysisSummary summary={analysisResults.summary} />
        )}

        {activeTab === 'risks' && (
          <div className="space-y-4">
            {/* Filter and Sort Controls */}
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                Individual Risk Assessments
              </h3>
              <div className="flex items-center gap-4">
                {/* Filter Controls */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Filter:</span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setFilterBy('all')}
                      className={cn(
                        'px-3 py-1 text-xs rounded transition-colors',
                        filterBy === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      )}
                    >
                      All
                    </button>
                    <button
                      onClick={() => setFilterBy('critical')}
                      className={cn(
                        'px-3 py-1 text-xs rounded transition-colors',
                        filterBy === 'critical' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      )}
                    >
                      Critical Only
                    </button>
                    <button
                      onClick={() => setFilterBy('high')}
                      className={cn(
                        'px-3 py-1 text-xs rounded transition-colors',
                        filterBy === 'high' ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      )}
                    >
                      High Only
                    </button>
                  </div>
                </div>
                
                {/* Sort Controls */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Sort by:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="text-sm border rounded px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="position">Position</option>
                    <option value="risk">Risk Score</option>
                    <option value="category">Category</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Risk Cards */}
            {sortedRisks.length > 0 ? (
              <div className="space-y-3">
                {sortedRisks.map(assessment => (
                  <RiskCard
                    key={assessment.id}
                    assessment={assessment}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No specific risks identified in this analysis.
              </div>
            )}
          </div>
        )}

        {activeTab === 'text' && originalText && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Highlighted Original Text
            </h3>
            <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
              <div className="whitespace-pre-wrap text-sm text-gray-700 leading-relaxed">
                {/* This would need to be enhanced with actual highlighting logic */}
                {originalText}
              </div>
            </div>
            <p className="text-sm text-gray-600">
              Risk highlighting requires additional implementation for text positioning.
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t p-4 bg-gray-50 rounded-b-lg">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div>
            Analysis completed on {analysisResults.session?.completedAt || analysisResults.session?.createdAt ? new Date(analysisResults.session.completedAt || analysisResults.session.createdAt).toLocaleDateString() : 'Unknown'}
          </div>
          <div>
            Results expire on {analysisResults.session?.expiresAt ? new Date(analysisResults.session.expiresAt).toLocaleDateString() : 'Unknown'}
          </div>
        </div>
      </div>
    </div>
  )
}