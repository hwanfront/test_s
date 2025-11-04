import { createHash } from 'crypto'
import { TextSanitizer } from './text-sanitizer'

export interface PreprocessingOptions {
  removeFormatting?: boolean
  normalizeWhitespace?: boolean
  removeEmptyLines?: boolean
  maxLength?: number
}

export interface PreprocessingResult {
  text: string
  contentHash: string
  contentLength: number
  sanitizedLength: number
  metadata: {
    originalLength: number
    sanitizedLength: number
    processingTimeMs: number
  }
}

/**
 * Core text preprocessing service that prepares user input for AI analysis
 * Handles cleaning, normalization, and content hashing
 */
export class TextPreprocessor {
  private textSanitizer: TextSanitizer

  constructor() {
    this.textSanitizer = new TextSanitizer()
  }

  /**
   * Preprocess text content for analysis
   * @param text Raw text input from user
   * @param options Preprocessing configuration
   * @returns Cleaned text with hash and metadata
   */
  async preprocessText(
    text: string,
    options: PreprocessingOptions = {}
  ): Promise<PreprocessingResult> {
    const startTime = Date.now()

    // Validate input
    const validation = this.validateInput(text)
    if (!validation.valid) {
      throw new Error(validation.error)
    }

    const defaultOptions: PreprocessingOptions = {
      removeFormatting: true,
      normalizeWhitespace: true,
      removeEmptyLines: true,
      maxLength: 10000,
      ...options
    }

    // Store original metrics
    const originalLength = text.length

    // Sanitize the text first
    let processedText = this.textSanitizer.sanitize(text)

    // Apply formatting removal if enabled
    if (defaultOptions.removeFormatting) {
      processedText = this.removeFormatting(processedText)
    }

    // Normalize whitespace if enabled
    if (defaultOptions.normalizeWhitespace) {
      processedText = this.normalizeWhitespace(processedText)
    }

    // Remove empty lines if enabled
    if (defaultOptions.removeEmptyLines) {
      processedText = this.removeEmptyLines(processedText)
    }

    // Truncate if necessary
    if (defaultOptions.maxLength && processedText.length > defaultOptions.maxLength) {
      processedText = processedText.substring(0, defaultOptions.maxLength)
    }

    // Generate content hash
    const contentHash = this.generateContentHash(processedText)

    // Calculate metrics
    const sanitizedLength = processedText.length
    const contentLength = text.length
    const processingTimeMs = Date.now() - startTime

    return {
      text: processedText,
      contentHash,
      contentLength,
      sanitizedLength,
      metadata: {
        originalLength,
        sanitizedLength,
        processingTimeMs
      }
    }
  }

  /**
   * Remove markdown, HTML, and other formatting
   */
  private removeFormatting(text: string): string {
    return text
      // Remove markdown headers
      .replace(/^#{1,6}\s+/gm, '')
      // Remove markdown emphasis (* and _)
      .replace(/(\*{1,2}|_{1,2})(.*?)\1/g, '$2')
      // Remove markdown links [text](url)
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      // Remove markdown code blocks
      .replace(/```[\s\S]*?```/g, '')
      // Remove inline code
      .replace(/`([^`]+)`/g, '$1')
      // Remove markdown lists (bullets)
      .replace(/^[\s]*[-*+]\s+/gm, '')
      // Remove numbered lists
      .replace(/^[\s]*\d+\.\s+/gm, '')
      // Remove HTML tags
      .replace(/<[^>]*>/g, '')
      // Remove HTML entities
      .replace(/&[a-zA-Z0-9#]+;/g, ' ')
      // Remove horizontal rules
      .replace(/^[-=]{3,}$/gm, '')
  }

  /**
   * Normalize whitespace and line breaks
   */
  private normalizeWhitespace(text: string): string {
    return text
      // Replace multiple spaces with single space
      .replace(/[ \t]+/g, ' ')
      // Replace multiple line breaks with single line break
      .replace(/\n{3,}/g, '\n\n')
      // Trim whitespace at start and end of lines
      .replace(/^[ \t]+|[ \t]+$/gm, '')
      // Trim overall
      .trim()
  }

  /**
   * Remove empty lines
   */
  private removeEmptyLines(text: string): string {
    return text
      .split('\n')
      .filter(line => line.trim().length > 0)
      .join('\n')
  }

  /**
   * Count words in text
   */
  private countWords(text: string): number {
    return text
      .trim()
      .split(/\s+/)
      .filter(word => word.length > 0)
      .length
  }

  /**
   * Generate SHA-256 hash of content
   */
  private generateContentHash(text: string): string {
    return createHash('sha256')
      .update(text, 'utf8')
      .digest('hex')
  }

  /**
   * Quick validation of text input
   */
  validateInput(text: string): { valid: boolean; error?: string } {
    if (typeof text !== 'string') {
      return { valid: false, error: 'Text must be a non-empty string' }
    }

    if (text.length === 0 || text.trim().length === 0) {
      return { valid: false, error: 'Content too short' }
    }

    if (text.length > 100000) {
      return { valid: false, error: 'Content too long' }
    }

    return { valid: true }
  }
}

/**
 * Convenience function for preprocessing text
 */
export async function preprocessText(
  text: string,
  options?: PreprocessingOptions
): Promise<PreprocessingResult> {
  const preprocessor = new TextPreprocessor()
  return preprocessor.preprocessText(text, options)
}