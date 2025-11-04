import React, { useState, useCallback } from 'react'
import { cn } from '@/shared/lib'
import { ResultsViewer, AnalysisResults } from '@/features/analysis-display'

export interface AnalysisWorkflowProps {
  onAnalysisComplete?: (results: AnalysisResults) => void
  onAnalysisError?: (error: string) => void
  initialText?: string
  className?: string
}

export interface AnalysisState {
  status: 'idle' | 'processing' | 'completed' | 'error'
  sessionId?: string
  results?: AnalysisResults
  error?: string
  progress: number
}

/**
 * Orchestrates the complete analysis workflow
 * Handles text input, API communication, and results display
 */
export const AnalysisWorkflow: React.FC<AnalysisWorkflowProps> = ({
  onAnalysisComplete,
  onAnalysisError,
  initialText = '',
  className
}) => {
  const [analysisState, setAnalysisState] = useState<AnalysisState>({
    status: 'idle',
    progress: 0
  })
  const [inputText, setInputText] = useState(initialText)

  // Submit analysis request
  const submitAnalysis = useCallback(async (content: string) => {
    if (!content.trim()) {
      return
    }

    setAnalysisState({
      status: 'processing',
      progress: 0
    })

    try {
      // Submit for analysis
      const response = await fetch('/api/analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: content.trim()
        })
      })

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Please sign in to analyze terms and conditions')
        }
        if (response.status === 429) {
          const data = await response.json()
          throw new Error(data.message || 'Daily analysis limit exceeded')
        }
        throw new Error('Failed to submit analysis request')
      }

      const sessionData = await response.json()
      const sessionId = sessionData.sessionId

      setAnalysisState(prev => ({
        ...prev,
        sessionId,
        progress: 25
      }))

      // Poll for results
      await pollForResults(sessionId)

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Analysis failed'
      setAnalysisState({
        status: 'error',
        error: errorMessage,
        progress: 0
      })
      onAnalysisError?.(errorMessage)
    }
  }, [onAnalysisError])

  // Poll analysis status and get results
  const pollForResults = useCallback(async (sessionId: string) => {
    const maxAttempts = 60 // 5 minutes max
    let attempts = 0

    const poll = async (): Promise<void> => {
      try {
        attempts++
        
        // Check status
        const statusResponse = await fetch(`/api/analysis/${sessionId}/status`)
        if (!statusResponse.ok) {
          throw new Error('Failed to check analysis status')
        }

        const statusData = await statusResponse.json()
        
        setAnalysisState(prev => ({
          ...prev,
          progress: Math.min(25 + (statusData.progress * 0.7), 95)
        }))

        if (statusData.status === 'completed') {
          // Get full results
          const resultsResponse = await fetch(`/api/analysis/${sessionId}`)
          if (!resultsResponse.ok) {
            throw new Error('Failed to fetch analysis results')
          }

          const results: AnalysisResults = await resultsResponse.json()
          
          setAnalysisState({
            status: 'completed',
            sessionId,
            results,
            progress: 100
          })
          
          onAnalysisComplete?.(results)
          return
        }

        if (statusData.status === 'failed') {
          throw new Error(statusData.errorMessage || 'Analysis processing failed')
        }

        if (statusData.status === 'expired') {
          throw new Error('Analysis session expired')
        }

        // Continue polling if still processing
        if (attempts < maxAttempts && statusData.status === 'processing') {
          setTimeout(poll, 5000) // Poll every 5 seconds
        } else if (attempts >= maxAttempts) {
          throw new Error('Analysis timeout - please try again')
        }

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to get analysis results'
        setAnalysisState({
          status: 'error',
          error: errorMessage,
          progress: 0
        })
        onAnalysisError?.(errorMessage)
      }
    }

    // Start polling
    setTimeout(poll, 2000) // Initial delay
  }, [onAnalysisComplete, onAnalysisError])

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    await submitAnalysis(inputText)
  }, [inputText, submitAnalysis])

  const resetAnalysis = useCallback(() => {
    setAnalysisState({
      status: 'idle',
      progress: 0
    })
    setInputText('')
  }, [])

  const isValidInput = inputText.trim().length >= 100
  const maxLength = 100000

  return (
    <div data-testid="analysis-workflow" className={cn('space-y-6', className)}>
      {/* Input Form - Show when idle or error */}
      {(analysisState.status === 'idle' || analysisState.status === 'error') && (
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Terms & Conditions Analysis
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="terms-input" className="block text-sm font-medium text-gray-700 mb-2">
                Paste your terms and conditions text below:
              </label>
              <textarea
                id="terms-input"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Copy and paste the terms and conditions text you want to analyze..."
                className="w-full h-64 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                maxLength={maxLength}
              />
              <div className="flex justify-between text-sm text-gray-600 mt-2">
                <span>
                  {isValidInput ? '✓ ' : ''}Minimum 100 characters required
                </span>
                <span>
                  {inputText.length.toLocaleString()} / {maxLength.toLocaleString()}
                </span>
              </div>
            </div>

            {analysisState.status === 'error' && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex">
                  <div className="text-red-600">⚠️</div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">
                      Analysis Error
                    </h3>
                    <p className="text-sm text-red-700 mt-1">
                      {analysisState.error}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={!isValidInput}
                className={cn(
                  'flex-1 py-3 px-6 rounded-lg font-medium transition-colors',
                  isValidInput
                    ? 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                )}
              >
                Analyze Terms & Conditions
              </button>
              
              {analysisState.status === 'error' && (
                <button
                  type="button"
                  onClick={resetAnalysis}
                  className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Reset
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      {/* Analysis Progress */}
      {analysisState.status === 'processing' && (
        <div className="bg-white rounded-lg border p-6">
          <div className="text-center space-y-4">
            <div className="animate-pulse">
              <div className="text-blue-600 text-4xl mb-2">🔍</div>
              <h3 className="text-lg font-medium text-gray-900">
                Analyzing Terms & Conditions
              </h3>
              <p className="text-gray-600">
                Our AI is carefully reviewing your document for potential risks...
              </p>
            </div>
            
            {/* Progress Bar */}
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-blue-600 h-3 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${analysisState.progress}%` }}
              />
            </div>
            <p className="text-sm text-gray-600">
              {analysisState.progress}% complete
            </p>
          </div>
        </div>
      )}

      {/* Results Display */}
      {analysisState.status === 'completed' && analysisState.results && (
        <>
          <ResultsViewer
            results={analysisState.results}
            originalText={inputText}
          />
          
          {/* New Analysis Button */}
          <div className="text-center">
            <button
              onClick={resetAnalysis}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Analyze New Terms
            </button>
          </div>
        </>
      )}
    </div>
  )
}