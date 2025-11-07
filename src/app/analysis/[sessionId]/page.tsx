/**
 * Analysis Results Page
 * T069 [US1] Create analysis results page with T097 authentication guard
 * 
 * Page for displaying analysis results for a specific session
 * Protected by authentication guard
 */

'use client'

import React, { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { AuthGuard } from '@/shared/lib/middleware/auth-guard'
import { AuthWidget } from '@/widgets/auth-widget'
import { ResultsDashboard } from '@/widgets/results-dashboard'
import type { AnalysisResults } from '@/features/analysis-display/components/results-viewer'

function AnalysisResultsPageContent() {
  const router = useRouter()
  const params = useParams()
  const sessionId = params?.sessionId as string
  const { data: session } = useSession()
  const [analysisResult, setAnalysisResult] = useState<AnalysisResults | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pollingActive, setPollingActive] = useState(false)

  // Fetch analysis results
  const fetchResults = async () => {
    try {
      const response = await fetch(`/api/analysis/${sessionId}`)
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Analysis session not found')
        } else if (response.status === 410) {
          throw new Error('Analysis results have expired')
        } else if (response.status === 401) {
          throw new Error('You are not authorized to view this analysis')
        }
        throw new Error('Failed to load analysis results')
      }

      const data = await response.json()
      
      // Transform API response to match component expectations
      const transformedData = {
        session: {
          id: data.sessionId,
          status: data.status,
          riskLevel: data.riskLevel || 'low',
          riskScore: data.overallRiskScore || 0,
          confidenceScore: data.confidenceScore || 0,
          contentLength: data.contentLength,
          processingTimeMs: data.processingTimeMs || 0,
          createdAt: data.createdAt,
          completedAt: data.completedAt,
          expiresAt: data.expiresAt
        },
        summary: data.summary || {
          totalRisks: data.totalRisks || 0,
          riskBreakdown: data.summary?.riskBreakdown || { critical: 0, high: 0, medium: 0, low: 0 },
          recommendedActions: data.summary?.recommendedActions || [],
          analysisLimitations: data.summary?.analysisLimitations || []
        },
        riskAssessments: (data.riskAssessments || []).map((risk: any) => ({
          id: risk.id,
          clauseCategory: risk.category,
          riskLevel: risk.riskLevel,
          riskScore: risk.riskScore,
          confidenceScore: risk.confidenceScore,
          summary: risk.summary,
          rationale: risk.rationale,
          suggestedAction: risk.suggestedAction,
          startPosition: risk.startPosition,
          endPosition: risk.endPosition
        }))
      }
      
      setAnalysisResult(transformedData)
      
      // If still processing, continue polling
      if (data.status === 'processing' || data.status === 'queued') {
        if (!pollingActive) {
          setPollingActive(true)
          setTimeout(fetchResults, 2000) // Poll every 2 seconds
        }
      } else {
        setPollingActive(false)
      }
    } catch (error) {
      console.error('Failed to fetch analysis results:', error)
      setError(error instanceof Error ? error.message : 'Failed to load results')
      setPollingActive(false)
    } finally {
      setLoading(false)
    }
  }

  // Load results on mount
  useEffect(() => {
    fetchResults()
  }, [sessionId])

  // Handle actions
  const handleNewAnalysis = () => {
    router.push('/analysis')
  }

  const handleDownloadReport = async () => {
    if (!analysisResult) return

    try {
      // Create a simple report
      const report = generateTextReport(analysisResult)
      const blob = new Blob([report], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      
      const a = document.createElement('a')
      a.href = url
      a.download = `analysis-report-${analysisResult.session.id}.txt`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Failed to download report:', error)
    }
  }

  const handleShareResults = async () => {
    if (!analysisResult) return

    try {
      const url = window.location.href
      if (navigator.share) {
        await navigator.share({
          title: 'Terms Analysis Results',
          text: `Analysis found ${analysisResult.summary.totalRisks} risks with ${analysisResult.session.riskLevel} overall risk level`,
          url
        })
      } else {
        // Fallback to clipboard
        await navigator.clipboard.writeText(url)
        alert('Analysis URL copied to clipboard!')
      }
    } catch (error) {
      console.error('Failed to share results:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.back()}
                className="text-gray-600 hover:text-gray-800 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Analysis Results</h1>
                <p className="text-sm text-gray-600 mt-1">
                  Session ID: {sessionId}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={handleNewAnalysis}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                New Analysis
              </button>
              <AuthWidget variant="compact" />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error ? (
          <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
            <div className="text-red-600 text-6xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Unable to Load Results</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={handleNewAnalysis}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Start New Analysis
              </button>
              <button
                onClick={() => router.push('/')}
                className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Go Home
              </button>
            </div>
          </div>
        ) : (
          <ResultsDashboard
            analysisResult={analysisResult}
            onNewAnalysis={handleNewAnalysis}
            onDownloadReport={handleDownloadReport}
            onShareResults={handleShareResults}
          />
        )}

        {/* Status indicator for processing */}
        {analysisResult?.session?.status === 'processing' && (
          <div className="fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg">
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
              <span className="text-sm">Analysis in progress...</span>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default function AnalysisResultsPage() {
  return (
    <AuthGuard>
      <AnalysisResultsPageContent />
    </AuthGuard>
  )
}

/**
 * Generate a text report from analysis results
 */
function generateTextReport(results: AnalysisResults): string {
  const { session, summary, riskAssessments } = results
  
  const lines = [
    'TERMS & CONDITIONS ANALYSIS REPORT',
    '====================================',
    '',
    `Analysis Date: ${new Date(session.completedAt || session.createdAt).toLocaleString()}`,
    `Session ID: ${session.id}`,
    `Content Length: ${session.contentLength.toLocaleString()} characters`,
    `Processing Time: ${(session.processingTimeMs / 1000).toFixed(1)} seconds`,
    '',
    'SUMMARY',
    '-------',
    `Overall Risk Level: ${session.riskLevel.toUpperCase()} (${session.riskScore}%)`,
    `Confidence Score: ${session.confidenceScore}%`,
    `Total Risks Found: ${summary.totalRisks}`,
    '',
    'RISK BREAKDOWN',
    '--------------',
    `Critical: ${summary.riskBreakdown.critical}`,
    `High: ${summary.riskBreakdown.high}`,
    `Medium: ${summary.riskBreakdown.medium}`,
    `Low: ${summary.riskBreakdown.low}`,
    '',
  ]

  if (riskAssessments.length > 0) {
    lines.push('DETAILED RISK ASSESSMENTS')
    lines.push('--------------------------')
    lines.push('')

    riskAssessments.forEach((risk, index) => {
      lines.push(`${index + 1}. ${risk.summary}`)
      lines.push(`   Risk Level: ${risk.riskLevel.toUpperCase()} (${risk.riskScore}%)`)
      lines.push(`   Confidence: ${risk.confidenceScore}%`)
      lines.push(`   Category: ${risk.clauseCategory.replace('-', ' ').toUpperCase()}`)
      lines.push(`   Explanation: ${risk.rationale}`)
      if (risk.suggestedAction) {
        lines.push(`   Recommendation: ${risk.suggestedAction}`)
      }
      lines.push('')
    })
  }

  if (summary.recommendedActions.length > 0) {
    lines.push('RECOMMENDED ACTIONS')
    lines.push('-------------------')
    summary.recommendedActions.forEach((action, index) => {
      lines.push(`${index + 1}. ${action}`)
    })
    lines.push('')
  }

  if (summary.analysisLimitations.length > 0) {
    lines.push('ANALYSIS LIMITATIONS')
    lines.push('--------------------')
    summary.analysisLimitations.forEach((limitation, index) => {
      lines.push(`${index + 1}. ${limitation}`)
    })
    lines.push('')
  }

  lines.push('---')
  lines.push('Generated by Terms Watcher - AI-powered terms analysis')
  lines.push('This analysis is for informational purposes only and does not constitute legal advice.')

  return lines.join('\n')
}