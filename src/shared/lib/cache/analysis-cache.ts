/**
 * T126 [P] Implement analysis result caching in src/shared/lib/cache/analysis-cache.ts
 * 
 * Analysis result caching system with memory and persistent storage options
 */

import { createHash } from 'crypto'

export interface AnalysisResults {
  sessionId: string
  status: 'queued' | 'processing' | 'completed' | 'failed'
  summary: {
    overallRisk: string
    totalRisks: number
    riskDistribution: Record<string, number>
    mainConcerns: string[]
  }
  risks: Array<{
    id: string
    type: string
    severity: string
    title: string
    description: string
    quote: string
    explanation: string
    confidence_score: number
    suggestions: string[]
  }>
  session: {
    id: string
    userId: string
    riskLevel?: string
    riskScore?: number
    confidenceScore?: number
    processingTimeMs?: number
    totalRisks?: number
    createdAt: string
    completedAt?: string
    expiresAt: string
  }
  metadata?: Record<string, any>
}

export interface CacheEntry<T = any> {
  key: string
  value: T
  timestamp: number
  expiresAt: number
  accessCount: number
  lastAccessedAt: number
  size: number
  tags: string[]
}

export interface CacheConfig {
  maxSize: number
  defaultTTL: number
  maxAge: number
  checkPeriod: number
  enablePersistence: boolean
  persistenceKey: string
  compressionEnabled: boolean
  evictionPolicy: 'LRU' | 'LFU' | 'FIFO'
}

/**
 * Default cache configuration
 */
const DEFAULT_CACHE_CONFIG: CacheConfig = {
  maxSize: 100, // Maximum number of entries
  defaultTTL: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days maximum age
  checkPeriod: 60 * 1000, // Clean up every minute
  enablePersistence: true,
  persistenceKey: 'analysis_cache',
  compressionEnabled: true,
  evictionPolicy: 'LRU'
}

/**
 * Analysis cache implementation with multiple storage strategies
 */
export class AnalysisCache {
  private cache = new Map<string, CacheEntry>()
  private config: CacheConfig
  private cleanupInterval?: NodeJS.Timeout
  private accessOrder: string[] = [] // For LRU tracking
  private accessFrequency = new Map<string, number>() // For LFU tracking

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = { ...DEFAULT_CACHE_CONFIG, ...config }
    this.startCleanupScheduler()
    this.loadFromPersistence()
  }

  /**
   * Generate cache key for analysis content
   */
  private generateCacheKey(content: string, options?: Record<string, any>): string {
    const contentHash = createHash('sha256').update(content).digest('hex')
    const optionsHash = options ? createHash('sha256').update(JSON.stringify(options)).digest('hex') : ''
    return `analysis:${contentHash}:${optionsHash}`
  }

  /**
   * Calculate entry size in bytes
   */
  private calculateSize(value: any): number {
    return new Blob([JSON.stringify(value)]).size
  }

  /**
   * Update access tracking
   */
  private updateAccessTracking(key: string): void {
    const now = Date.now()
    
    // Update access count and timestamp
    const entry = this.cache.get(key)
    if (entry) {
      entry.accessCount++
      entry.lastAccessedAt = now
    }

    // Update LRU order
    const existingIndex = this.accessOrder.indexOf(key)
    if (existingIndex !== -1) {
      this.accessOrder.splice(existingIndex, 1)
    }
    this.accessOrder.push(key)

    // Update LFU frequency
    this.accessFrequency.set(key, (this.accessFrequency.get(key) || 0) + 1)
  }

  /**
   * Check if cache entry is expired
   */
  private isExpired(entry: CacheEntry): boolean {
    const now = Date.now()
    return now > entry.expiresAt || (now - entry.timestamp) > this.config.maxAge
  }

  /**
   * Evict entries based on policy
   */
  private evictEntries(count: number = 1): void {
    const candidates: string[] = []

    switch (this.config.evictionPolicy) {
      case 'LRU':
        // Remove least recently used
        candidates.push(...this.accessOrder.slice(0, count))
        break
      
      case 'LFU':
        // Remove least frequently used
        const frequencyEntries = Array.from(this.accessFrequency.entries())
          .sort(([, a], [, b]) => a - b)
          .slice(0, count)
        candidates.push(...frequencyEntries.map(([key]) => key))
        break
      
      case 'FIFO':
        // Remove oldest entries
        const entries = Array.from(this.cache.entries())
          .sort(([, a], [, b]) => a.timestamp - b.timestamp)
          .slice(0, count)
        candidates.push(...entries.map(([key]) => key))
        break
    }

    // Remove selected entries
    for (const key of candidates) {
      this.delete(key)
    }
  }

  /**
   * Ensure cache size is within limits
   */
  private enforceSize(): void {
    while (this.cache.size >= this.config.maxSize) {
      this.evictEntries(1)
    }
  }

  /**
   * Compress value if compression is enabled
   */
  private compressValue(value: any): any {
    if (!this.config.compressionEnabled) {
      return value
    }

    // Simple compression by removing whitespace from JSON
    if (typeof value === 'object') {
      return JSON.parse(JSON.stringify(value))
    }
    
    return value
  }

  /**
   * Store analysis results in cache
   */
  set(
    content: string, 
    results: AnalysisResults, 
    options?: Record<string, any>,
    ttl?: number
  ): void {
    const key = this.generateCacheKey(content, options)
    const now = Date.now()
    const expiresAt = now + (ttl || this.config.defaultTTL)
    
    // Ensure we have space
    this.enforceSize()

    const entry: CacheEntry<AnalysisResults> = {
      key,
      value: this.compressValue(results),
      timestamp: now,
      expiresAt,
      accessCount: 0,
      lastAccessedAt: now,
      size: this.calculateSize(results),
      tags: this.generateTags(results)
    }

    this.cache.set(key, entry)
    this.updateAccessTracking(key)
    this.saveToPersistence()
  }

  /**
   * Retrieve analysis results from cache
   */
  get(content: string, options?: Record<string, any>): AnalysisResults | null {
    const key = this.generateCacheKey(content, options)
    const entry = this.cache.get(key) as CacheEntry<AnalysisResults> | undefined

    if (!entry) {
      return null
    }

    if (this.isExpired(entry)) {
      this.delete(key)
      return null
    }

    this.updateAccessTracking(key)
    return entry.value
  }

  /**
   * Check if content is cached
   */
  has(content: string, options?: Record<string, any>): boolean {
    const key = this.generateCacheKey(content, options)
    const entry = this.cache.get(key)
    
    if (!entry) {
      return false
    }

    if (this.isExpired(entry)) {
      this.delete(key)
      return false
    }

    return true
  }

  /**
   * Delete entry from cache
   */
  delete(keyOrContent: string, options?: Record<string, any>): boolean {
    let key: string
    
    if (keyOrContent.includes(':')) {
      key = keyOrContent // Direct key
    } else {
      key = this.generateCacheKey(keyOrContent, options) // Generate from content
    }

    const deleted = this.cache.delete(key)
    
    if (deleted) {
      // Clean up tracking
      const accessIndex = this.accessOrder.indexOf(key)
      if (accessIndex !== -1) {
        this.accessOrder.splice(accessIndex, 1)
      }
      this.accessFrequency.delete(key)
      this.saveToPersistence()
    }

    return deleted
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear()
    this.accessOrder = []
    this.accessFrequency.clear()
    this.saveToPersistence()
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number
    maxSize: number
    hitRate: number
    totalAccesses: number
    totalHits: number
    totalMisses: number
    averageAccessCount: number
    oldestEntry?: Date
    newestEntry?: Date
    totalSizeBytes: number
  } {
    const entries = Array.from(this.cache.values())
    const totalAccesses = entries.reduce((sum, entry) => sum + entry.accessCount, 0)
    const totalSizeBytes = entries.reduce((sum, entry) => sum + entry.size, 0)
    
    const timestamps = entries.map(entry => entry.timestamp)
    const oldestEntry = timestamps.length > 0 ? new Date(Math.min(...timestamps)) : undefined
    const newestEntry = timestamps.length > 0 ? new Date(Math.max(...timestamps)) : undefined

    return {
      size: this.cache.size,
      maxSize: this.config.maxSize,
      hitRate: totalAccesses > 0 ? totalAccesses / (totalAccesses + 1) : 0,
      totalAccesses,
      totalHits: totalAccesses,
      totalMisses: 0, // Would need separate tracking
      averageAccessCount: entries.length > 0 ? totalAccesses / entries.length : 0,
      oldestEntry,
      newestEntry,
      totalSizeBytes
    }
  }

  /**
   * Generate tags for cache entry categorization
   */
  private generateTags(results: AnalysisResults): string[] {
    const tags: string[] = []

    // Status tag
    tags.push(`status:${results.status}`)

    // Risk level tag
    if (results.summary.overallRisk) {
      tags.push(`risk:${results.summary.overallRisk}`)
    }

    // Risk count tags
    const riskCount = results.summary.totalRisks
    if (riskCount === 0) tags.push('risks:none')
    else if (riskCount <= 5) tags.push('risks:low')
    else if (riskCount <= 15) tags.push('risks:medium')
    else tags.push('risks:high')

    // User tag
    if (results.session.userId) {
      tags.push(`user:${results.session.userId}`)
    }

    return tags
  }

  /**
   * Get entries by tag
   */
  getByTag(tag: string): AnalysisResults[] {
    const results: AnalysisResults[] = []
    
    for (const entry of this.cache.values()) {
      if (entry.tags.includes(tag) && !this.isExpired(entry)) {
        results.push((entry as CacheEntry<AnalysisResults>).value)
      }
    }

    return results
  }

  /**
   * Clean expired entries
   */
  cleanExpired(): number {
    const expiredKeys: string[] = []
    
    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry)) {
        expiredKeys.push(key)
      }
    }

    for (const key of expiredKeys) {
      this.delete(key)
    }

    return expiredKeys.length
  }

  /**
   * Start cleanup scheduler
   */
  private startCleanupScheduler(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
    }

    this.cleanupInterval = setInterval(() => {
      const cleaned = this.cleanExpired()
      if (cleaned > 0) {
        console.log(`Cache: Cleaned ${cleaned} expired entries`)
      }
    }, this.config.checkPeriod)
  }

  /**
   * Stop cleanup scheduler
   */
  stopCleanupScheduler(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = undefined
    }
  }

  /**
   * Save cache to persistent storage
   */
  private saveToPersistence(): void {
    if (!this.config.enablePersistence || typeof window === 'undefined') {
      return
    }

    try {
      const cacheData = {
        entries: Array.from(this.cache.entries()),
        accessOrder: this.accessOrder,
        accessFrequency: Array.from(this.accessFrequency.entries()),
        timestamp: Date.now()
      }

      localStorage.setItem(this.config.persistenceKey, JSON.stringify(cacheData))
    } catch (error) {
      console.warn('Failed to save cache to persistence:', error)
    }
  }

  /**
   * Load cache from persistent storage
   */
  private loadFromPersistence(): void {
    if (!this.config.enablePersistence || typeof window === 'undefined') {
      return
    }

    try {
      const stored = localStorage.getItem(this.config.persistenceKey)
      if (!stored) {
        return
      }

      const cacheData = JSON.parse(stored)
      
      // Restore cache entries
      for (const [key, entry] of cacheData.entries || []) {
        if (!this.isExpired(entry)) {
          this.cache.set(key, entry)
        }
      }

      // Restore access tracking
      this.accessOrder = cacheData.accessOrder || []
      this.accessFrequency = new Map(cacheData.accessFrequency || [])

      console.log(`Cache: Loaded ${this.cache.size} entries from persistence`)
    } catch (error) {
      console.warn('Failed to load cache from persistence:', error)
    }
  }

  /**
   * Export cache data for debugging
   */
  exportData(): any {
    return {
      entries: Array.from(this.cache.entries()),
      accessOrder: this.accessOrder,
      accessFrequency: Array.from(this.accessFrequency.entries()),
      config: this.config,
      stats: this.getStats()
    }
  }

  /**
   * Update cache configuration
   */
  updateConfig(newConfig: Partial<CacheConfig>): void {
    this.config = { ...this.config, ...newConfig }
    
    // Restart cleanup scheduler with new period
    if (newConfig.checkPeriod) {
      this.startCleanupScheduler()
    }
  }
}

/**
 * Global analysis cache instance
 */
export const analysisCache = new AnalysisCache()

/**
 * Cache utilities for common operations
 */
export const cacheUtils = {
  /**
   * Cache analysis results
   */
  cacheResults: (content: string, results: AnalysisResults, options?: Record<string, any>) => {
    analysisCache.set(content, results, options)
  },

  /**
   * Get cached results
   */
  getCachedResults: (content: string, options?: Record<string, any>) => {
    return analysisCache.get(content, options)
  },

  /**
   * Check if results are cached
   */
  isCached: (content: string, options?: Record<string, any>) => {
    return analysisCache.has(content, options)
  },

  /**
   * Clear user's cached results
   */
  clearUserCache: (userId: string) => {
    const userResults = analysisCache.getByTag(`user:${userId}`)
    for (const result of userResults) {
      analysisCache.delete(result.sessionId)
    }
  },

  /**
   * Get cache statistics
   */
  getStats: () => analysisCache.getStats(),

  /**
   * Clean expired entries manually
   */
  cleanExpired: () => analysisCache.cleanExpired()
}

/**
 * React hook for cache management
 */
export function useAnalysisCache() {
  const [stats, setStats] = React.useState(analysisCache.getStats())

  React.useEffect(() => {
    const interval = setInterval(() => {
      setStats(analysisCache.getStats())
    }, 5000) // Update stats every 5 seconds

    return () => clearInterval(interval)
  }, [])

  return {
    cache: analysisCache,
    stats,
    utils: cacheUtils
  }
}

// Fix React import for the hook
import React from 'react'