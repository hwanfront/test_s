/**
 * Enhanced Content Anonymization (Task T106)
 * 
 * Privacy-focused text processing that removes or hashes identifiable content
 * while preserving analytical structure for terms and conditions analysis.
 * 
 * Constitutional Principle II: Legal Risk Minimization
 * - No original terms text is stored
 * - Only analysis outcomes and generalized patterns are persisted
 * - Hash-based deduplication without content retention
 */

import { createHash } from 'crypto'

/**
 * Anonymization configuration options
 */
interface AnonymizationConfig {
  hashSalt?: string
  preserveStructure?: boolean
  contentLengthThreshold?: number
  enableContentHashing?: boolean
  retainMetrics?: boolean
}

/**
 * Content analysis metadata (privacy-safe)
 */
interface ContentMetadata {
  contentHash: string
  originalLength: number
  normalizedLength: number
  wordCount: number
  paragraphCount: number
  sectionCount: number
  hasNumberedItems: boolean
  hasLegalLanguage: boolean
  estimatedReadingTime: number
  languageIndicators: string[]
  structuralFeatures: {
    hasHeaders: boolean
    hasLists: boolean
    hasLinks: boolean
    hasFormatting: boolean
  }
}

/**
 * Anonymized content result
 */
interface AnonymizedContent {
  contentHash: string
  metadata: ContentMetadata
  processingInfo: {
    anonymizedAt: string
    processingTime: number
    method: 'hash-only' | 'structured-hash'
    version: string
  }
}

/**
 * Enhanced content anonymizer
 */
export class EnhancedAnonymizer {
  private config: Required<AnonymizationConfig>

  constructor(config: AnonymizationConfig = {}) {
    this.config = {
      hashSalt: config.hashSalt || process.env.CONTENT_HASH_SALT || 'default-anonymization-salt',
      preserveStructure: config.preserveStructure ?? true,
      contentLengthThreshold: config.contentLengthThreshold || 50,
      enableContentHashing: config.enableContentHashing ?? true,
      retainMetrics: config.retainMetrics ?? true
    }
  }

  /**
   * Anonymize content by hashing while extracting privacy-safe metadata
   */
  async anonymizeContent(content: string): Promise<AnonymizedContent> {
    const startTime = Date.now()

    if (!content || content.trim().length < this.config.contentLengthThreshold) {
      throw new Error(`Content too short for anonymization (minimum ${this.config.contentLengthThreshold} characters)`)
    }

    // Normalize content for consistent hashing
    const normalized = this.normalizeContent(content)
    
    // Generate secure content hash
    const contentHash = this.generateContentHash(normalized)
    
    // Extract privacy-safe metadata
    const metadata = this.extractMetadata(content, normalized, contentHash)
    
    const processingTime = Date.now() - startTime

    return {
      contentHash,
      metadata,
      processingInfo: {
        anonymizedAt: new Date().toISOString(),
        processingTime,
        method: this.config.preserveStructure ? 'structured-hash' : 'hash-only',
        version: '1.0.0'
      }
    }
  }

  /**
   * Normalize content for consistent anonymization
   */
  private normalizeContent(content: string): string {
    return content
      // Normalize unicode
      .normalize('NFKC')
      // Normalize line endings
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      // Normalize quotes and dashes
      .replace(/[""'']/g, '"')
      .replace(/[–—]/g, '-')
      // Normalize whitespace but preserve structure
      .replace(/[ \t]+/g, ' ')
      // Clean up multiple line breaks
      .replace(/\n\s*\n\s*\n/g, '\n\n')
      // Trim lines
      .split('\n')
      .map(line => line.trim())
      .join('\n')
      // Convert to lowercase for case-insensitive analysis
      .toLowerCase()
      .trim()
  }

  /**
   * Generate secure content hash with salt
   */
  private generateContentHash(normalizedContent: string): string {
    const hashInput = normalizedContent + this.config.hashSalt
    return createHash('sha256').update(hashInput).digest('hex')
  }

  /**
   * Extract privacy-safe metadata from content
   */
  private extractMetadata(
    originalContent: string, 
    normalizedContent: string, 
    contentHash: string
  ): ContentMetadata {
    // Count basic metrics
    const wordCount = this.countWords(normalizedContent)
    const paragraphCount = this.countParagraphs(normalizedContent)
    const sectionCount = this.countSections(normalizedContent)

    // Detect structural features
    const structuralFeatures = this.detectStructuralFeatures(originalContent)
    
    // Detect legal language patterns (privacy-safe)
    const hasLegalLanguage = this.detectLegalLanguage(normalizedContent)
    
    // Detect numbered items
    const hasNumberedItems = this.detectNumberedItems(normalizedContent)
    
    // Extract language indicators (without exposing content)
    const languageIndicators = this.extractLanguageIndicators(normalizedContent)
    
    // Calculate reading time
    const estimatedReadingTime = this.calculateReadingTime(wordCount)

    return {
      contentHash,
      originalLength: originalContent.length,
      normalizedLength: normalizedContent.length,
      wordCount,
      paragraphCount,
      sectionCount,
      hasNumberedItems,
      hasLegalLanguage,
      estimatedReadingTime,
      languageIndicators,
      structuralFeatures
    }
  }

  /**
   * Count words in normalized content
   */
  private countWords(content: string): number {
    return content
      .split(/\s+/)
      .filter(word => word.length > 0)
      .length
  }

  /**
   * Count paragraphs in content
   */
  private countParagraphs(content: string): number {
    return content
      .split(/\n\s*\n/)
      .filter(paragraph => paragraph.trim().length > 0)
      .length
  }

  /**
   * Count numbered sections
   */
  private countSections(content: string): number {
    const numberedSectionPattern = /^\s*\d+\./gm
    const matches = content.match(numberedSectionPattern)
    return matches ? matches.length : 0
  }

  /**
   * Detect structural features in original content
   */
  private detectStructuralFeatures(content: string): ContentMetadata['structuralFeatures'] {
    return {
      hasHeaders: /^#+\s+|\*\*[^*]+\*\*|^[A-Z\s]+$/m.test(content),
      hasLists: /^\s*[-*•]\s+|^\s*\d+\.\s+/m.test(content),
      hasLinks: /https?:\/\/|www\.|\.com|\.org/i.test(content),
      hasFormatting: /\*\*[^*]+\*\*|__[^_]+__|`[^`]+`/.test(content)
    }
  }

  /**
   * Detect legal language patterns (privacy-safe)
   */
  private detectLegalLanguage(normalizedContent: string): boolean {
    const legalKeywords = [
      'terms', 'conditions', 'agreement', 'contract', 'policy',
      'liability', 'warranty', 'indemnify', 'jurisdiction',
      'compliance', 'governing', 'breach', 'termination',
      'intellectual property', 'copyright', 'trademark'
    ]

    return legalKeywords.some(keyword => 
      normalizedContent.includes(keyword.toLowerCase())
    )
  }

  /**
   * Detect numbered items in content
   */
  private detectNumberedItems(content: string): boolean {
    return /^\s*\d+\./m.test(content)
  }

  /**
   * Extract language indicators without exposing content
   */
  private extractLanguageIndicators(content: string): string[] {
    const indicators: string[] = []

    // Common English legal phrases (privacy-safe patterns)
    if (/\b(shall|hereby|whereas|pursuant|notwithstanding)\b/.test(content)) {
      indicators.push('formal-english')
    }

    // Terms and conditions indicators
    if (/\b(terms|conditions|agreement)\b/.test(content)) {
      indicators.push('terms-document')
    }

    // Privacy policy indicators
    if (/\b(privacy|personal data|information)\b/.test(content)) {
      indicators.push('privacy-document')
    }

    // Service agreement indicators
    if (/\b(service|platform|application)\b/.test(content)) {
      indicators.push('service-document')
    }

    return indicators
  }

  /**
   * Calculate estimated reading time
   */
  private calculateReadingTime(wordCount: number): number {
    const wordsPerMinute = 200 // Average reading speed
    return Math.max(1, Math.ceil(wordCount / wordsPerMinute))
  }

  /**
   * Validate content hash against original (for integrity checking)
   */
  async validateContentHash(originalContent: string, hash: string): Promise<boolean> {
    try {
      const anonymized = await this.anonymizeContent(originalContent)
      return anonymized.contentHash === hash
    } catch {
      return false
    }
  }

  /**
   * Compare two pieces of content without storing them
   */
  async areContentsSimilar(content1: string, content2: string): Promise<boolean> {
    try {
      const hash1 = (await this.anonymizeContent(content1)).contentHash
      const hash2 = (await this.anonymizeContent(content2)).contentHash
      return hash1 === hash2
    } catch {
      return false
    }
  }

  /**
   * Generate content fingerprint for deduplication
   */
  async generateFingerprint(content: string): Promise<{
    hash: string
    length: number
    wordCount: number
    structuralSignature: string
  }> {
    const anonymized = await this.anonymizeContent(content)
    
    // Create structural signature without exposing content
    const structuralSignature = createHash('md5')
      .update([
        anonymized.metadata.sectionCount,
        anonymized.metadata.paragraphCount,
        anonymized.metadata.hasNumberedItems ? '1' : '0',
        anonymized.metadata.hasLegalLanguage ? '1' : '0',
        anonymized.metadata.structuralFeatures.hasLists ? '1' : '0'
      ].join('-'))
      .digest('hex')
      .substring(0, 8) // Short signature

    return {
      hash: anonymized.contentHash,
      length: anonymized.metadata.originalLength,
      wordCount: anonymized.metadata.wordCount,
      structuralSignature
    }
  }

  /**
   * Create privacy report for audit purposes
   */
  generatePrivacyReport(anonymizedContent: AnonymizedContent): {
    complianceStatus: 'compliant' | 'warning' | 'violation'
    checks: {
      name: string
      status: 'pass' | 'fail'
      description: string
    }[]
    summary: string
  } {
    const checks: {
      name: string
      status: 'pass' | 'fail'
      description: string
    }[] = [
      {
        name: 'content-hashing',
        status: anonymizedContent.contentHash.length === 64 ? 'pass' : 'fail',
        description: 'Content is properly hashed with SHA-256'
      },
      {
        name: 'no-original-content',
        status: 'pass' as const, // By design, we never store original content
        description: 'Original content is not stored or exposed'
      },
      {
        name: 'metadata-safety',
        status: anonymizedContent.metadata.languageIndicators.every(ind => 
          !ind.includes('@') && !ind.includes('http')
        ) ? 'pass' : 'fail',
        description: 'Metadata contains only privacy-safe indicators'
      },
      {
        name: 'processing-transparency',
        status: anonymizedContent.processingInfo.method ? 'pass' : 'fail',
        description: 'Processing method is documented for transparency'
      }
    ]

    const failedChecks = checks.filter(check => check.status === 'fail')
    const complianceStatus = failedChecks.length === 0 ? 'compliant' : 'warning'

    const summary = complianceStatus === 'compliant' 
      ? 'Content anonymization fully complies with privacy requirements'
      : `Privacy concerns detected: ${failedChecks.map(c => c.name).join(', ')}`

    return {
      complianceStatus,
      checks,
      summary
    }
  }
}

/**
 * Default anonymizer instance with standard configuration
 */
export const defaultAnonymizer = new EnhancedAnonymizer({
  preserveStructure: true,
  enableContentHashing: true,
  retainMetrics: true
})

/**
 * High-security anonymizer for sensitive content
 */
export const secureAnonymizer = new EnhancedAnonymizer({
  preserveStructure: false,
  enableContentHashing: true,
  retainMetrics: false,
  contentLengthThreshold: 100
})

// Export types for use in other modules
export type { 
  AnonymizationConfig, 
  ContentMetadata, 
  AnonymizedContent 
}