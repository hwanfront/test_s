/**
 * Content Deduplication Service (Task T107)
 * 
 * Manages content deduplication using privacy-safe hashing while maintaining 
 * analysis efficiency and user experience.
 * 
 * Constitutional Principle II: Legal Risk Minimization
 * - Hash-based deduplication without content retention
 * - No original terms text storage or comparison
 */

import { createHash } from 'crypto'
import { EnhancedAnonymizer, type AnonymizedContent } from './enhanced-anonymizer'

/**
 * Deduplication result interface
 */
interface DeduplicationResult {
  isDuplicate: boolean
  existingHash?: string
  existingSessionId?: string
  contentHash: string
  similarity: number
  metadata: {
    checkedAt: string
    processingTime: number
    method: 'hash-exact' | 'hash-similarity' | 'structural'
  }
}

/**
 * Content fingerprint for structural similarity
 */
interface ContentFingerprint {
  hash: string
  structuralSignature: string
  wordCount: number
  sectionCount: number
  length: number
  features: {
    hasNumberedItems: boolean
    hasLegalLanguage: boolean
    estimatedReadingTime: number
  }
}

/**
 * Duplicate detection configuration
 */
interface DeduplicationConfig {
  exactMatchThreshold: number
  similarityThreshold: number
  structuralThreshold: number
  enableStructuralAnalysis: boolean
  cacheTTL: number
}

/**
 * Content deduplication service
 */
export class ContentDeduplicationService {
  private anonymizer: EnhancedAnonymizer
  private config: DeduplicationConfig
  private hashCache: Map<string, { sessionId: string; timestamp: number; fingerprint: ContentFingerprint }>

  constructor(
    anonymizer?: EnhancedAnonymizer,
    config?: Partial<DeduplicationConfig>
  ) {
    this.anonymizer = anonymizer || new EnhancedAnonymizer()
    this.config = {
      exactMatchThreshold: 1.0,
      similarityThreshold: 0.85,
      structuralThreshold: 0.7,
      enableStructuralAnalysis: true,
      cacheTTL: 24 * 60 * 60 * 1000, // 24 hours
      ...config
    }
    this.hashCache = new Map()
  }

  /**
   * Check if content is duplicate of existing analysis
   */
  async checkDuplication(
    content: string,
    userId: string,
    existingSessions?: Array<{ id: string; contentHash: string; createdAt: string }>
  ): Promise<DeduplicationResult> {
    const startTime = Date.now()

    try {
      // Generate anonymized content for comparison
      const anonymizedContent = await this.anonymizer.anonymizeContent(content)
      const contentHash = anonymizedContent.contentHash

      // First check: Exact hash match
      const exactMatch = this.findExactMatch(contentHash, existingSessions)
      if (exactMatch) {
        return {
          isDuplicate: true,
          existingHash: contentHash,
          existingSessionId: exactMatch.sessionId,
          contentHash,
          similarity: 1.0,
          metadata: {
            checkedAt: new Date().toISOString(),
            processingTime: Date.now() - startTime,
            method: 'hash-exact'
          }
        }
      }

      // Second check: Structural similarity (if enabled)
      if (this.config.enableStructuralAnalysis) {
        const fingerprint = await this.generateFingerprint(anonymizedContent)
        const structuralMatch = await this.findStructuralMatch(fingerprint, existingSessions)
        
        if (structuralMatch && structuralMatch.similarity >= this.config.structuralThreshold) {
          return {
            isDuplicate: true,
            existingHash: structuralMatch.hash,
            existingSessionId: structuralMatch.sessionId,
            contentHash,
            similarity: structuralMatch.similarity,
            metadata: {
              checkedAt: new Date().toISOString(),
              processingTime: Date.now() - startTime,
              method: 'structural'
            }
          }
        }
      }

      // No duplicates found
      return {
        isDuplicate: false,
        contentHash,
        similarity: 0,
        metadata: {
          checkedAt: new Date().toISOString(),
          processingTime: Date.now() - startTime,
          method: 'hash-exact'
        }
      }

    } catch (error) {
      throw new Error(`Deduplication check failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Register new content hash for future deduplication
   */
  async registerContent(
    sessionId: string,
    anonymizedContent: AnonymizedContent
  ): Promise<void> {
    const fingerprint = await this.generateFingerprint(anonymizedContent)
    
    this.hashCache.set(anonymizedContent.contentHash, {
      sessionId,
      timestamp: Date.now(),
      fingerprint
    })

    // Clean up expired cache entries
    this.cleanupCache()
  }

  /**
   * Find exact hash match in existing sessions
   */
  private findExactMatch(
    contentHash: string,
    existingSessions?: Array<{ id: string; contentHash: string; createdAt: string }>
  ): { sessionId: string; hash: string } | null {
    // Check cache first
    const cached = this.hashCache.get(contentHash)
    if (cached && (Date.now() - cached.timestamp) < this.config.cacheTTL) {
      return { sessionId: cached.sessionId, hash: contentHash }
    }

    // Check provided existing sessions
    if (existingSessions) {
      const match = existingSessions.find(session => session.contentHash === contentHash)
      if (match) {
        return { sessionId: match.id, hash: contentHash }
      }
    }

    return null
  }

  /**
   * Find structural similarity matches
   */
  private async findStructuralMatch(
    targetFingerprint: ContentFingerprint,
    existingSessions?: Array<{ id: string; contentHash: string; createdAt: string }>
  ): Promise<{ sessionId: string; hash: string; similarity: number } | null> {
    let bestMatch: { sessionId: string; hash: string; similarity: number } | null = null
    let highestSimilarity = 0

    // Check cache entries
    for (const [hash, cached] of this.hashCache.entries()) {
      if ((Date.now() - cached.timestamp) >= this.config.cacheTTL) {
        continue
      }

      const similarity = this.calculateStructuralSimilarity(targetFingerprint, cached.fingerprint)
      if (similarity > highestSimilarity && similarity >= this.config.structuralThreshold) {
        highestSimilarity = similarity
        bestMatch = { sessionId: cached.sessionId, hash, similarity }
      }
    }

    // Check provided sessions (would need fingerprints from database in real implementation)
    // This is a simplified version for testing
    if (existingSessions && !bestMatch) {
      for (const session of existingSessions) {
        // In real implementation, we'd retrieve stored fingerprints from database
        // For now, we'll only do exact matches
        if (session.contentHash === targetFingerprint.hash) {
          return { sessionId: session.id, hash: session.contentHash, similarity: 1.0 }
        }
      }
    }

    return bestMatch
  }

  /**
   * Generate content fingerprint for structural analysis
   */
  private async generateFingerprint(anonymizedContent: AnonymizedContent): Promise<ContentFingerprint> {
    const metadata = anonymizedContent.metadata

    // Create structural signature based on document structure
    const structuralComponents = [
      metadata.sectionCount.toString(),
      metadata.paragraphCount.toString(),
      metadata.hasNumberedItems ? '1' : '0',
      metadata.hasLegalLanguage ? '1' : '0',
      metadata.structuralFeatures.hasLists ? '1' : '0',
      metadata.structuralFeatures.hasHeaders ? '1' : '0',
      Math.floor(metadata.wordCount / 100).toString(), // Quantize word count
      Math.floor(metadata.estimatedReadingTime / 5).toString() // Quantize reading time
    ]

    const structuralSignature = createHash('md5')
      .update(structuralComponents.join('-'))
      .digest('hex')
      .substring(0, 16) // 16-character signature

    return {
      hash: anonymizedContent.contentHash,
      structuralSignature,
      wordCount: metadata.wordCount,
      sectionCount: metadata.sectionCount,
      length: metadata.originalLength,
      features: {
        hasNumberedItems: metadata.hasNumberedItems,
        hasLegalLanguage: metadata.hasLegalLanguage,
        estimatedReadingTime: metadata.estimatedReadingTime
      }
    }
  }

  /**
   * Calculate structural similarity between two fingerprints
   */
  private calculateStructuralSimilarity(
    fingerprint1: ContentFingerprint,
    fingerprint2: ContentFingerprint
  ): number {
    let similarity = 0
    let totalChecks = 0

    // Structural signature match (most important)
    if (fingerprint1.structuralSignature === fingerprint2.structuralSignature) {
      similarity += 0.4
    }
    totalChecks += 0.4

    // Word count similarity
    const wordCountSimilarity = this.calculateNumericSimilarity(
      fingerprint1.wordCount,
      fingerprint2.wordCount,
      0.2 // 20% tolerance
    )
    similarity += wordCountSimilarity * 0.2
    totalChecks += 0.2

    // Length similarity
    const lengthSimilarity = this.calculateNumericSimilarity(
      fingerprint1.length,
      fingerprint2.length,
      0.15 // 15% tolerance
    )
    similarity += lengthSimilarity * 0.15
    totalChecks += 0.15

    // Section count match
    if (fingerprint1.sectionCount === fingerprint2.sectionCount) {
      similarity += 0.1
    }
    totalChecks += 0.1

    // Feature matches
    const featureMatches = [
      fingerprint1.features.hasNumberedItems === fingerprint2.features.hasNumberedItems,
      fingerprint1.features.hasLegalLanguage === fingerprint2.features.hasLegalLanguage,
      Math.abs(fingerprint1.features.estimatedReadingTime - fingerprint2.features.estimatedReadingTime) <= 2
    ].filter(Boolean).length

    similarity += (featureMatches / 3) * 0.15
    totalChecks += 0.15

    return similarity / totalChecks
  }

  /**
   * Calculate similarity between two numeric values
   */
  private calculateNumericSimilarity(value1: number, value2: number, tolerance: number): number {
    if (value1 === 0 && value2 === 0) return 1
    if (value1 === 0 || value2 === 0) return 0

    const ratio = Math.min(value1, value2) / Math.max(value1, value2)
    const difference = Math.abs(value1 - value2) / Math.max(value1, value2)

    if (difference <= tolerance) {
      return 1
    }

    return Math.max(0, ratio - difference)
  }

  /**
   * Clean up expired cache entries
   */
  private cleanupCache(): void {
    const now = Date.now()
    const expiredKeys: string[] = []

    for (const [key, cached] of this.hashCache.entries()) {
      if ((now - cached.timestamp) >= this.config.cacheTTL) {
        expiredKeys.push(key)
      }
    }

    expiredKeys.forEach(key => this.hashCache.delete(key))
  }

  /**
   * Get cache statistics for monitoring
   */
  getCacheStats(): {
    totalEntries: number
    validEntries: number
    expiredEntries: number
    cacheHitRate: number
    memoryUsage: string
  } {
    const now = Date.now()
    let validEntries = 0
    let expiredEntries = 0

    for (const cached of this.hashCache.values()) {
      if ((now - cached.timestamp) < this.config.cacheTTL) {
        validEntries++
      } else {
        expiredEntries++
      }
    }

    // Rough memory estimate (this is simplified)
    const avgEntrySize = 500 // bytes per cache entry (estimated)
    const memoryUsageBytes = this.hashCache.size * avgEntrySize
    const memoryUsage = memoryUsageBytes > 1024 * 1024 
      ? `${(memoryUsageBytes / (1024 * 1024)).toFixed(2)} MB`
      : `${(memoryUsageBytes / 1024).toFixed(2)} KB`

    return {
      totalEntries: this.hashCache.size,
      validEntries,
      expiredEntries,
      cacheHitRate: validEntries / Math.max(1, this.hashCache.size),
      memoryUsage
    }
  }

  /**
   * Clear all cached data
   */
  clearCache(): void {
    this.hashCache.clear()
  }

  /**
   * Export cache data for persistence (privacy-safe)
   */
  exportCacheData(): Array<{
    hash: string
    sessionId: string
    timestamp: number
    fingerprint: ContentFingerprint
  }> {
    const now = Date.now()
    const validEntries: Array<{
      hash: string
      sessionId: string
      timestamp: number
      fingerprint: ContentFingerprint
    }> = []

    for (const [hash, cached] of this.hashCache.entries()) {
      if ((now - cached.timestamp) < this.config.cacheTTL) {
        validEntries.push({
          hash,
          sessionId: cached.sessionId,
          timestamp: cached.timestamp,
          fingerprint: cached.fingerprint
        })
      }
    }

    return validEntries
  }

  /**
   * Import cache data from persistent storage
   */
  importCacheData(data: Array<{
    hash: string
    sessionId: string
    timestamp: number
    fingerprint: ContentFingerprint
  }>): number {
    const now = Date.now()
    let importedCount = 0

    for (const entry of data) {
      // Only import non-expired entries
      if ((now - entry.timestamp) < this.config.cacheTTL) {
        this.hashCache.set(entry.hash, {
          sessionId: entry.sessionId,
          timestamp: entry.timestamp,
          fingerprint: entry.fingerprint
        })
        importedCount++
      }
    }

    return importedCount
  }
}

/**
 * Default deduplication service instance
 */
export const defaultDeduplicationService = new ContentDeduplicationService()

// Export types
export type { 
  DeduplicationResult, 
  ContentFingerprint, 
  DeduplicationConfig 
}