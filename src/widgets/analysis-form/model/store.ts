/**
 * Analysis Form State Management Store
 * T065 [US1] Create analysis form state management
 * 
 * Zustand store for managing analysis form state including content, validation, and submission
 */

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

export interface ValidationResult {
  isValid: boolean
  errors: Record<string, string>
}

export interface AnalysisFormState {
  // Form content
  content: string
  skipCache: boolean
  contentType: 'terms-and-conditions' | 'privacy-policy' | 'user-agreement' | 'eula' | null

  // UI state
  isSubmitting: boolean
  errors: Record<string, string>

  // Auto-save and draft
  lastSaved?: Date
  isDraft: boolean

  // Actions
  setContent: (content: string) => void
  setSkipCache: (skipCache: boolean) => void
  setContentType: (type: AnalysisFormState['contentType']) => void
  setSubmitting: (submitting: boolean) => void
  setErrors: (errors: Record<string, string>) => void
  validateContent: () => ValidationResult
  detectContentType: () => void
  cleanFormatting: () => void
  reset: () => void
  saveDraft: () => void
  loadDraft: () => boolean
}

const STORAGE_KEY = 'analysis-form-draft'
const MIN_CONTENT_LENGTH = 100
const MAX_CONTENT_LENGTH = 100000

export const useAnalysisFormStore = create<AnalysisFormState>()(
  devtools(
    (set, get) => ({
      // Initial state
      content: '',
      skipCache: false,
      contentType: null,
      isSubmitting: false,
      errors: {},
      isDraft: false,

      // Actions
      setContent: (content: string) => {
        set((state) => {
          const newState: Partial<AnalysisFormState> = { 
            content, 
            isDraft: content.length > 0,
            lastSaved: new Date()
          }
          
          // Auto-detect content type
          const detectedType = detectContentTypeFromText(content)
          if (detectedType !== state.contentType) {
            newState.contentType = detectedType
          }

          // Clear content-related errors when content changes
          const errors = { ...state.errors }
          delete errors.content
          delete errors.format
          newState.errors = errors

          return newState
        })

        // Auto-save after a delay
        setTimeout(() => {
          const { saveDraft } = get()
          saveDraft()
        }, 1000)
      },

      setSkipCache: (skipCache: boolean) => {
        set({ skipCache })
      },

      setContentType: (contentType) => {
        set({ contentType })
      },

      setSubmitting: (isSubmitting: boolean) => {
        set({ isSubmitting })
      },

      setErrors: (errors: Record<string, string>) => {
        set({ errors })
      },

      // T146 FIX: Make validateContent pure - it returns validation result without mutating store.
      // This prevents "Cannot update a component while rendering" error.
      // The caller (typically event handlers or effects) should apply errors via setErrors.
      validateContent: (): ValidationResult => {
        const { content } = get()
        const errors: Record<string, string> = {}

        // Required field validation
        if (!content.trim()) {
          errors.content = 'Content is required'
          return { isValid: false, errors }
        }

        // Length validation
        if (content.length < MIN_CONTENT_LENGTH) {
          errors.content = `Content must be at least ${MIN_CONTENT_LENGTH} characters long`
        } else if (content.length > MAX_CONTENT_LENGTH) {
          errors.content = `Content must not exceed ${MAX_CONTENT_LENGTH.toLocaleString()} characters`
        }

        // Format validation
        if (content.includes('\ufffd') || /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/.test(content)) {
          errors.format = 'Content contains invalid characters'
        }

        // Check for suspicious content
        if (content.length < 200 && !content.toLowerCase().includes('terms')) {
          errors.content = 'Content appears too short to be terms and conditions'
        }

        const isValid = Object.keys(errors).length === 0
        // T146: Do NOT call set({ errors }) here - let the caller decide when to apply
        return { isValid, errors }
      },

      detectContentType: () => {
        const { content } = get()
        const detectedType = detectContentTypeFromText(content)
        set({ contentType: detectedType })
      },

      cleanFormatting: () => {
        set((state) => ({
          content: cleanTextFormatting(state.content)
        }))
      },

      reset: () => {
        set({
          content: '',
          skipCache: false,
          contentType: null,
          isSubmitting: false,
          errors: {},
          isDraft: false,
          lastSaved: undefined
        })
        
        // Clear saved draft
        if (typeof window !== 'undefined') {
          localStorage.removeItem(STORAGE_KEY)
        }
      },

      saveDraft: () => {
        const { content, skipCache, contentType } = get()
        
        if (typeof window !== 'undefined' && content.length > 0) {
          const draft = {
            content,
            skipCache,
            contentType,
            savedAt: new Date().toISOString()
          }
          localStorage.setItem(STORAGE_KEY, JSON.stringify(draft))
          set({ lastSaved: new Date() })
        }
      },

      loadDraft: (): boolean => {
        if (typeof window === 'undefined') return false

        try {
          const draftData = localStorage.getItem(STORAGE_KEY)
          if (!draftData) return false

          const draft = JSON.parse(draftData)
          const savedAt = new Date(draft.savedAt)
          const isRecent = Date.now() - savedAt.getTime() < 7 * 24 * 60 * 60 * 1000 // 7 days

          if (isRecent && draft.content) {
            set({
              content: draft.content,
              skipCache: draft.skipCache || false,
              contentType: draft.contentType || null,
              isDraft: true,
              lastSaved: savedAt
            })
            return true
          }
        } catch (error) {
          console.warn('Failed to load draft:', error)
          localStorage.removeItem(STORAGE_KEY)
        }

        return false
      }
    }),
    {
      name: 'analysis-form-store'
    }
  )
)

/**
 * Detect content type from text patterns
 */
function detectContentTypeFromText(content: string): AnalysisFormState['contentType'] {
  const text = content.toLowerCase()

  if (text.includes('privacy policy') || text.includes('personal information') || text.includes('data collection')) {
    return 'privacy-policy'
  }
  
  if (text.includes('end user license') || text.includes('software license') || text.includes('eula')) {
    return 'eula'
  }
  
  if (text.includes('user agreement') || text.includes('user terms')) {
    return 'user-agreement'
  }
  
  if (text.includes('terms of service') || text.includes('terms and conditions') || text.includes('terms of use')) {
    return 'terms-and-conditions'
  }

  return null
}

/**
 * Clean text formatting issues
 */
function cleanTextFormatting(content: string): string {
  return content
    // Normalize line breaks
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    // Remove excessive whitespace
    .replace(/[ \t]+/g, ' ')
    // Remove excessive line breaks
    .replace(/\n{3,}/g, '\n\n')
    // Trim leading/trailing whitespace on lines
    .split('\n')
    .map(line => line.trim())
    .join('\n')
    // Remove leading/trailing whitespace
    .trim()
}

/**
 * Calculate estimated analysis time based on content length
 */
export function estimateAnalysisTime(contentLength: number): string {
  if (contentLength < 1000) return '10-15 seconds'
  if (contentLength < 5000) return '15-30 seconds'
  if (contentLength < 20000) return '30-45 seconds'
  if (contentLength < 50000) return '45-60 seconds'
  return '60-90 seconds'
}

/**
 * Get character count with progress indicators
 */
export function getCharacterCountInfo(contentLength: number) {
  const remaining = MIN_CONTENT_LENGTH - contentLength
  const progress = Math.min(100, (contentLength / MIN_CONTENT_LENGTH) * 100)
  
  return {
    count: contentLength,
    remaining: Math.max(0, remaining),
    progress,
    isValid: contentLength >= MIN_CONTENT_LENGTH && contentLength <= MAX_CONTENT_LENGTH,
    isMinimumMet: contentLength >= MIN_CONTENT_LENGTH,
    isNearMaximum: contentLength > MAX_CONTENT_LENGTH * 0.9,
    isOverMaximum: contentLength > MAX_CONTENT_LENGTH
  }
}