/**
 * React hooks for text preprocessing (Task T047)
 * 
 * Provides React integration for text preprocessing functionality
 * with state management and error handling
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import type { PreprocessingOptions, PreprocessedContent } from '../lib/preprocessor'
import { textPreprocessor } from '../lib/preprocessor'

export interface UsePreprocessingOptions extends PreprocessingOptions {
  debounceMs?: number
  autoProcess?: boolean
  minLength?: number
}

export interface PreprocessingState {
  isProcessing: boolean
  result: PreprocessedContent | null
  error: string | null
  progress: number
}

/**
 * Main hook for text preprocessing with React state management
 */
export function usePreprocessing(options: UsePreprocessingOptions = {}) {
  const [state, setState] = useState<PreprocessingState>({
    isProcessing: false,
    result: null,
    error: null,
    progress: 0
  })

  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const {
    debounceMs = 300,
    autoProcess = false,
    minLength = 100,
    ...preprocessingOptions
  } = options

  /**
   * Process text with preprocessing pipeline
   */
  const processText = useCallback(async (text: string) => {
    // Cancel any ongoing processing
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    // Clear previous debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    // Early validation
    if (!text || text.trim().length === 0) {
      setState({
        isProcessing: false,
        result: null,
        error: null,
        progress: 0
      })
      return
    }

    if (text.length < minLength) {
      setState({
        isProcessing: false,
        result: null,
        error: `Text must be at least ${minLength} characters long`,
        progress: 0
      })
      return
    }

    setState(prev => ({
      ...prev,
      isProcessing: true,
      error: null,
      progress: 10
    }))

    try {
      // Create abort controller for this processing session
      abortControllerRef.current = new AbortController()

      // Simulate progress updates
      setState(prev => ({ ...prev, progress: 30 }))

      // Process the text
      const result = await textPreprocessor.preprocess(text, {
        ...preprocessingOptions,
        enableTransparency: true
      })

      setState(prev => ({ ...prev, progress: 80 }))

      // Final state update
      setState({
        isProcessing: false,
        result,
        error: null,
        progress: 100
      })

      return result

    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Failed to process text'

      setState({
        isProcessing: false,
        result: null,
        error: errorMessage,
        progress: 0
      })

      throw error
    }
  }, [preprocessingOptions, minLength])

  /**
   * Process text with debouncing
   */
  const processTextDebounced = useCallback((text: string) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    debounceRef.current = setTimeout(() => {
      processText(text)
    }, debounceMs)
  }, [processText, debounceMs])

  /**
   * Reset processing state
   */
  const reset = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    setState({
      isProcessing: false,
      result: null,
      error: null,
      progress: 0
    })
  }, [])

  /**
   * Validate text without processing
   */
  const validateText = useCallback((text: string) => {
    return textPreprocessor.validateInput(text)
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [])

  return {
    ...state,
    processText: autoProcess ? processTextDebounced : processText,
    processTextDebounced,
    processTextImmediate: processText,
    validateText,
    reset
  }
}

/**
 * Hook for content validation only
 */
export function useContentValidation() {
  const [validation, setValidation] = useState<{
    valid: boolean
    error?: string
  } | null>(null)

  const validate = useCallback((text: string) => {
    const result = textPreprocessor.validateInput(text)
    setValidation(result)
    return result
  }, [])

  const reset = useCallback(() => {
    setValidation(null)
  }, [])

  return {
    validation,
    validate,
    reset
  }
}

/**
 * Hook for processing statistics
 */
export function useProcessingStats(result: PreprocessedContent | null) {
  const [stats, setStats] = useState<ReturnType<typeof textPreprocessor.getProcessingStats> | null>(null)

  useEffect(() => {
    if (result) {
      const newStats = textPreprocessor.getProcessingStats(result)
      setStats(newStats)
    } else {
      setStats(null)
    }
  }, [result])

  return stats
}

/**
 * Hook for real-time character counting and validation
 */
export function useCharacterCount(
  text: string,
  options: { minLength?: number; maxLength?: number } = {}
) {
  const { minLength = 100, maxLength = 50000 } = options

  const characterCount = text.length
  const wordCount = text.trim().split(/\s+/).filter(word => word.length > 0).length
  const isValid = characterCount >= minLength && characterCount <= maxLength
  const isMinimumMet = characterCount >= minLength
  const progress = Math.min((characterCount / minLength) * 100, 100)

  return {
    characterCount,
    wordCount,
    isValid,
    isMinimumMet,
    progress,
    minLength,
    maxLength,
    remaining: Math.max(0, minLength - characterCount),
    exceeding: Math.max(0, characterCount - maxLength)
  }
}

/**
 * Hook for content hash checking and deduplication
 */
export function useContentHash() {
  const [hashState, setHashState] = useState<{
    hash: string | null
    isChecking: boolean
    isDuplicate: boolean
  }>({
    hash: null,
    isChecking: false,
    isDuplicate: false
  })

  const checkHash = useCallback(async (text: string) => {
    if (!text || text.trim().length === 0) {
      setHashState({
        hash: null,
        isChecking: false,
        isDuplicate: false
      })
      return null
    }

    setHashState(prev => ({
      ...prev,
      isChecking: true
    }))

    try {
      // Generate hash for the content
      const result = await textPreprocessor.preprocess(text, { enableTransparency: false })
      const hash = result.contentHash

      // In a real implementation, this would check against a database
      // For now, we'll simulate the check
      const isDuplicate = false // Would be actual check result

      setHashState({
        hash,
        isChecking: false,
        isDuplicate
      })

      return hash

    } catch (error) {
      setHashState({
        hash: null,
        isChecking: false,
        isDuplicate: false
      })
      throw error
    }
  }, [])

  const reset = useCallback(() => {
    setHashState({
      hash: null,
      isChecking: false,
      isDuplicate: false
    })
  }, [])

  return {
    ...hashState,
    checkHash,
    reset
  }
}