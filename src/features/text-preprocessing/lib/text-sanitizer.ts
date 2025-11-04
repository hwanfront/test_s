/**
 * Text sanitization utilities for safe processing of user input
 * Handles security concerns and content validation
 */
export class TextSanitizer {
  /**
   * Sanitize user input text to prevent injection and ensure safe processing
   * @param text Raw user input
   * @returns Sanitized text safe for processing
   */
  sanitize(text: string): string {
    if (!text || typeof text !== 'string') {
      return ''
    }

    let sanitized = text

    // Remove or escape potentially dangerous content
    sanitized = this.removeDangerousPatterns(sanitized)
    
    // Replace sensitive personal information with placeholders
    sanitized = this.replaceSensitiveInfo(sanitized)
    
    // Normalize encoding
    sanitized = this.normalizeEncoding(sanitized)
    
    // Normalize whitespace
    sanitized = this.normalizeWhitespace(sanitized)
    
    // Remove excessive repetition
    sanitized = this.removeExcessiveRepetition(sanitized)

    return sanitized.trim()
  }

  /**
   * Replace sensitive personal information with placeholders
   */
  private replaceSensitiveInfo(text: string): string {
    return text
      // Replace email addresses
      .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL]')
      // Replace SSN patterns FIRST (before phone numbers that might match)
      .replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[SSN]')
      // Replace phone numbers (various formats) - more specific pattern
      .replace(/\+[0-9]{1,3}-[0-9]{2,3}-[0-9]{4,8}/g, '[PHONE]')
      .replace(/\+[0-9]{1,3}\s[0-9]{2,3}\s[0-9]{4,8}/g, '[PHONE]')
      // Replace credit card patterns
      .replace(/\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, '[CARD]')
      // Replace user ID patterns (letters followed by numbers)
      .replace(/\b[A-Z]{2,}[0-9]{3,}\b/g, '[ID]')
      // Replace IP addresses
      .replace(/\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/g, '[IP]')
  }

  /**
   * Normalize whitespace
   */
  private normalizeWhitespace(text: string): string {
    return text
      // Trim whitespace at start and end of lines first
      .replace(/^[ \t]+|[ \t]+$/gm, '')
      // Replace multiple spaces/tabs with single space
      .replace(/[ \t]+/g, ' ')
      // Replace multiple line breaks with maximum 2
      .replace(/\n{3,}/g, '\n\n')
  }

  /**
   * Remove or escape potentially dangerous patterns that could cause issues
   */
  private removeDangerousPatterns(text: string): string {
    return text
      // Remove potential script injection attempts
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      // Remove potential style injection
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      // Remove potential iframe injection
      .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
      // Remove javascript: URLs
      .replace(/javascript:/gi, '')
      // Remove data: URLs (could contain malicious content)
      .replace(/data:\s*[^,]*,/gi, '')
      // Remove potential XSS vectors
      .replace(/on\w+\s*=/gi, '')
      // Remove null bytes
      .replace(/\x00/g, '')
      // Remove vertical tabs and form feeds
      .replace(/[\v\f]/g, ' ')
  }

  /**
   * Normalize text encoding to prevent encoding attacks
   */
  private normalizeEncoding(text: string): string {
    return text
      // Normalize Unicode (NFKC normalization)
      .normalize('NFKC')
      // Remove/replace problematic Unicode characters
      .replace(/[\u200B-\u200D\uFEFF]/g, '') // Zero-width spaces
      .replace(/[\u2028\u2029]/g, '\n') // Line/paragraph separators
      // Convert curly quotes to straight quotes
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u201C\u201D]/g, '"')
      // Convert em/en dashes to regular hyphens
      .replace(/[\u2013\u2014]/g, '-')
  }

  /**
   * Remove excessive character repetition that might indicate spam or abuse
   */
  private removeExcessiveRepetition(text: string): string {
    return text
      // Limit consecutive identical characters to 3
      .replace(/(.)\1{3,}/g, '$1$1$1')
      // Limit consecutive identical words to 2
      .replace(/\b(\w+)(\s+\1){2,}/gi, '$1 $1')
  }

  /**
   * Validate that text content appears to be legitimate terms/policy text
   */
  validateContent(text: string): { valid: boolean; warnings: string[] } {
    const warnings: string[] = []
    
    // Check for excessive repetition
    if (this.hasExcessiveRepetition(text)) {
      warnings.push('Content contains excessive repetition')
    }

    // Check for suspicious patterns
    if (this.hasSuspiciousPatterns(text)) {
      warnings.push('Content contains potentially malicious patterns')
    }

    // Check if content looks like terms/policy text
    if (!this.looksLikeLegalText(text)) {
      warnings.push('Content may not be terms of service or privacy policy text')
    }

    // Check for minimum meaningful content
    if (!this.hasMinimumContent(text)) {
      warnings.push('Content appears to lack substantial legal terms')
    }

    return {
      valid: warnings.length === 0,
      warnings
    }
  }

  /**
   * Check for excessive repetition patterns
   */
  private hasExcessiveRepetition(text: string): boolean {
    // Check for repeated characters (more than 10 in a row)
    if (/(.)\1{10,}/.test(text)) return true
    
    // Check for repeated words (same word more than 5 times consecutively)
    if (/\b(\w+)(\s+\1){5,}/i.test(text)) return true
    
    return false
  }

  /**
   * Check for suspicious patterns that might indicate malicious content
   */
  private hasSuspiciousPatterns(text: string): boolean {
    const suspiciousPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+\s*=/i,
      /data:\s*text\/html/i,
      /vbscript:/i,
      /expression\s*\(/i,
    ]

    return suspiciousPatterns.some(pattern => pattern.test(text))
  }

  /**
   * Check if text looks like legitimate legal document text
   */
  private looksLikeLegalText(text: string): boolean {
    const legalIndicators = [
      /\b(terms|condition|agreement|policy|privacy|service|user|account|data|information)\b/i,
      /\b(shall|will|may|must|should|agree|consent|acknowledge)\b/i,
      /\b(license|liability|disclaimer|warranty|indemnity|governing)\b/i,
      /\b(terminate|suspend|modify|update|effective|applicable)\b/i,
    ]

    // At least 2 different legal indicators should be present
    const matches = legalIndicators.filter(pattern => pattern.test(text))
    return matches.length >= 2
  }

  /**
   * Check if text has minimum substantial content
   */
  private hasMinimumContent(text: string): boolean {
    const words = text.toLowerCase().split(/\s+/).filter(word => word.length > 3)
    const uniqueWords = new Set(words)
    
    // Should have at least 50 unique meaningful words
    return uniqueWords.size >= 50
  }

  /**
   * Clean text specifically for legal document processing
   */
  cleanLegalText(text: string): string {
    return text
      // Remove section numbers at start of lines
      .replace(/^\s*\d+(\.\d+)*\s*/gm, '')
      // Remove excessive legal formatting
      .replace(/\s+(?:WHEREAS|THEREFORE|WHEREFORE)\s+/gi, ' ')
      // Normalize legal spacing
      .replace(/\s*[;,]\s*/g, ', ')
      .replace(/\s*\.\s*/g, '. ')
      // Remove excessive capitalization (but preserve intentional caps)
      .replace(/\b[A-Z]{2,}(?=\s|$)/g, match => 
        match.length > 5 ? match.charAt(0) + match.slice(1).toLowerCase() : match
      )
  }
}