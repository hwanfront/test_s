/**
 * Analysis Form Widget Component
 * T064 [US1] Create analysis form widget + T098 quota display integration
 * 
 * Comprehensive form component for inputting terms and conditions text for analysis
 * Includes quota awareness and usage tracking
 */

import React, { useState, useEffect, useCallback } from 'react'
import { cn } from '@/shared/lib'
import { useAnalysisFormStore, estimateAnalysisTime, getCharacterCountInfo } from '../model/store'
import { QuotaDisplay, useQuotaStatus } from './quota-display'

export interface AnalysisFormSubmission {
  content: string
  skipCache: boolean
  contentType?: string
}

export interface AnalysisFormProps {
  onSubmit: (data: AnalysisFormSubmission) => void | Promise<void>
  onCancel?: () => void
  className?: string
  showAdvancedOptions?: boolean
  enableAutoSave?: boolean
  disabled?: boolean
}

/**
 * Main analysis form widget with comprehensive validation and UX features
 */
export const AnalysisForm: React.FC<AnalysisFormProps> = ({
  onSubmit,
  onCancel,
  className,
  showAdvancedOptions = false,
  enableAutoSave = true,
  disabled = false
}) => {
  const {
    content,
    skipCache,
    contentType,
    isSubmitting,
    errors,
    isDraft,
    lastSaved,
    setContent,
    setSkipCache,
    setErrors,
    validateContent,
    cleanFormatting,
    reset,
    loadDraft
  } = useAnalysisFormStore()

  const [localSkipCache, setLocalSkipCache] = useState(false)
  const [showFormatSuggestion, setShowFormatSuggestion] = useState(false)
  const [submissionError, setSubmissionError] = useState<string | null>(null)
  
  // Quota awareness
  const { canAnalyze, quotaStatus } = useQuotaStatus()

  // Load draft on mount
  useEffect(() => {
    if (enableAutoSave && !content) {
      const draftLoaded = loadDraft()
      if (draftLoaded) {
        console.log('Draft loaded from localStorage')
      }
    }
  }, [enableAutoSave, content, loadDraft])

  // Check for formatting issues
  useEffect(() => {
    const hasExcessiveWhitespace = /\s{4,}/.test(content) || /\n{3,}/.test(content)
    const hasTabCharacters = content.includes('\t')
    setShowFormatSuggestion(hasExcessiveWhitespace || hasTabCharacters)
  }, [content])

  const characterInfo = getCharacterCountInfo(content.length)
  const estimatedTime = estimateAnalysisTime(content.length)
  const validation = validateContent() || { isValid: false, errors: {} }

  const canSubmit = validation.isValid && !isSubmitting && !disabled && canAnalyze

  const handleContentChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value)
    setSubmissionError(null)
  }, [setContent])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Ctrl+Enter or Cmd+Enter to submit
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault()
      if (canSubmit) {
        handleSubmit()
      }
    }
  }, [canSubmit])

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return

    // Check quota before proceeding
    if (!canAnalyze) {
      setErrors({ 
        ...errors, 
        quota: 'Daily analysis quota exceeded. Please try again tomorrow.' 
      })
      return
    }

    const validation = validateContent()
    if (!validation.isValid) return

    try {
      setSubmissionError(null)
      await onSubmit({
        content,
        skipCache: showAdvancedOptions ? localSkipCache : false,
        contentType: contentType || undefined
      })
    } catch (error) {
      setSubmissionError(error instanceof Error ? error.message : 'Submission failed')
    }
  }, [canSubmit, canAnalyze, errors, setErrors, validateContent, onSubmit, content, showAdvancedOptions, localSkipCache, contentType])

  const handleClear = useCallback(() => {
    reset()
    setLocalSkipCache(false)
    setSubmissionError(null)
  }, [reset])

  const handleCleanFormatting = useCallback(() => {
    cleanFormatting()
  }, [cleanFormatting])

  const getContentTypeDisplay = () => {
    switch (contentType) {
      case 'privacy-policy':
        return 'Privacy Policy detected'
      case 'eula':
        return 'EULA detected'
      case 'user-agreement':
        return 'User Agreement detected'
      case 'terms-and-conditions':
        return 'Terms of Service detected'
      default:
        return null
    }
  }

  const renderErrors = () => {
    const allErrors = { ...errors }
    if (submissionError) {
      allErrors.submission = submissionError
    }

    if (Object.keys(allErrors).length === 0) return null

    return (
      <div role="alert" className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
        <h4 className="text-sm font-medium text-red-800 mb-2">Please fix the following issues:</h4>
        <ul className="text-sm text-red-700 space-y-1">
          {Object.values(allErrors).map((error, index) => (
            <li key={index} className="flex items-start gap-2">
              <span className="text-red-500 mt-0.5">•</span>
              <span>{error}</span>
            </li>
          ))}
        </ul>
      </div>
    )
  }

  const renderCharacterCount = () => {
    if (!characterInfo) return null
    
    return (
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-4">
          <span className={cn(
            'font-medium',
            characterInfo.isOverMaximum ? 'text-red-600' :
            characterInfo.isNearMaximum ? 'text-orange-600' :
            characterInfo.isMinimumMet ? 'text-green-600' :
            'text-gray-600'
          )}>
            {characterInfo.count.toLocaleString()} characters
          </span>
          
          {!characterInfo.isMinimumMet && (
            <span className="text-gray-500">
              {characterInfo.remaining} characters to go
            </span>
          )}

          {contentType && (
            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
              {getContentTypeDisplay()}
            </span>
          )}
        </div>

        {characterInfo.isMinimumMet && (
          <span className="text-gray-500">
            Estimated analysis time: {estimatedTime}
          </span>
        )}
      </div>
    )
  }

  const renderHelpText = () => (
    <div className="mt-2 text-sm text-gray-600 space-y-1">
      <p>Minimum {(100).toLocaleString()} characters required • Maximum {(100000).toLocaleString()} characters allowed</p>
      
      <div className="mt-3 p-3 bg-blue-50 rounded-lg">
        <p className="font-medium text-blue-800 mb-1">💡 Tip: Look for sections like:</p>
        <div className="text-blue-700 text-xs grid grid-cols-2 gap-1">
          <span>• Account termination policies</span>
          <span>• Privacy and data collection</span>
          <span>• Payment and refund terms</span>
          <span>• User responsibilities</span>
          <span>• Liability limitations</span>
          <span>• Dispute resolution</span>
        </div>
      </div>
    </div>
  )

  const renderAutoSaveIndicator = () => {
    if (!enableAutoSave || !isDraft) return null

    return (
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <div 
          data-testid="autosave-indicator"
          className="w-2 h-2 bg-green-500 rounded-full animate-pulse"
        />
        <span>Auto-save enabled</span>
        {lastSaved && (
          <span>• Last saved {lastSaved.toLocaleTimeString()}</span>
        )}
      </div>
    )
  }

  return (
    <div className={cn('space-y-6', className)}>
      <form
        role="form"
        aria-labelledby="analysis-form-title"
        onSubmit={(e) => {
          e.preventDefault()
          handleSubmit()
        }}
        className="space-y-6"
      >
        {/* Form Title */}
        <div>
          <h2 id="analysis-form-title" className="text-xl font-semibold text-gray-900 mb-2">
            Terms & Conditions Analysis
          </h2>
          <p className="text-gray-600">
            Paste your terms and conditions, privacy policy, or user agreement to get a detailed risk analysis.
          </p>
        </div>

        {/* Draft Indicator */}
        {enableAutoSave && renderAutoSaveIndicator()}

        {/* Content Type Detection */}
        {showFormatSuggestion && (
          <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-800">Format detected issues</p>
                <p className="text-xs text-orange-700">Excessive whitespace or formatting inconsistencies found</p>
              </div>
              <button
                type="button"
                onClick={handleCleanFormatting}
                className="px-3 py-1 bg-orange-600 text-white text-xs rounded hover:bg-orange-700 transition-colors"
              >
                Clean formatting
              </button>
            </div>
          </div>
        )}

        {/* Error Display */}
        {renderErrors()}

        {/* Main Text Area */}
        <div className="space-y-2">
          <label
            htmlFor="terms-content"
            className="block text-sm font-medium text-gray-700"
          >
            Terms and conditions text *
          </label>
          
          <textarea
            id="terms-content"
            value={content}
            onChange={handleContentChange}
            onKeyDown={handleKeyDown}
            disabled={isSubmitting || disabled}
            placeholder="Paste your terms and conditions, privacy policy, or user agreement here...

We'll analyze the text for potentially problematic clauses and provide clear explanations of any risks we find."
            className={cn(
              'w-full h-64 px-3 py-2 border border-gray-300 rounded-lg shadow-sm',
              'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
              'disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed',
              'placeholder:text-gray-400',
              (errors.content || errors.format) && 'border-red-300 focus:ring-red-500 focus:border-red-500'
            )}
            aria-describedby="content-help content-count"
            aria-required="true"
            aria-invalid={!!(errors.content || errors.format)}
          />

          <div id="content-count">
            {renderCharacterCount()}
          </div>

          <div id="content-help">
            {renderHelpText()}
          </div>
        </div>

        {/* Advanced Options */}
        {showAdvancedOptions && (
          <div className="p-4 bg-gray-50 rounded-lg space-y-3">
            <h3 className="text-sm font-medium text-gray-900">Advanced Options</h3>
            
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={localSkipCache}
                onChange={(e) => setLocalSkipCache(e.target.checked)}
                disabled={isSubmitting || disabled}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <div>
                <span className="text-sm font-medium text-gray-700">Skip cache</span>
                <p className="text-xs text-gray-500">Force new analysis even if similar content was recently analyzed</p>
              </div>
            </label>
          </div>
        )}

        {/* Quota Display */}
        <div className="bg-gray-50 rounded-lg p-4">
          <QuotaDisplay 
            variant="detailed"
            onQuotaExceeded={() => {
              setErrors({ 
                ...errors, 
                quota: 'Daily analysis quota exceeded. Please try again tomorrow.' 
              })
            }}
            onQuotaWarning={(remaining) => {
              if (remaining <= 3) {
                setErrors({ 
                  ...errors, 
                  quota: `Only ${remaining} analyses remaining for today.` 
                })
              }
            }}
          />
        </div>

        {/* Form Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={!canSubmit}
              className={cn(
                'px-6 py-2 rounded-lg font-medium transition-all duration-200',
                'focus:outline-none focus:ring-2 focus:ring-offset-2',
                canSubmit
                  ? 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              )}
              aria-describedby="submit-help"
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <div 
                    data-testid="loading-spinner"
                    className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"
                  />
                  Analyzing...
                </div>
              ) : (
                'Analyze'
              )}
            </button>

            <button
              type="button"
              onClick={handleClear}
              disabled={isSubmitting || disabled}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors"
            >
              Clear
            </button>

            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                disabled={isSubmitting}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors"
              >
                Cancel
              </button>
            )}
          </div>

          {canSubmit && (
            <div id="submit-help" className="text-xs text-gray-500">
              Press Ctrl+Enter to submit
            </div>
          )}
        </div>
      </form>

      {/* Status Announcements for Screen Readers */}
      <div
        role="status"
        aria-live="polite"
        className="sr-only"
      >
        {isSubmitting && 'Analyzing content...'}
        {validation.isValid && content.length > 0 && !isSubmitting && 'Content is ready for analysis'}
        {errors.content && `Validation error: ${errors.content}`}
      </div>
    </div>
  )
}