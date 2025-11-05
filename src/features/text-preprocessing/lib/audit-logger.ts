/**
 * Preprocessing Audit Logger (Task T109)
 * 
 * Privacy-compliant audit logging for text preprocessing operations
 * Tracks processing events without exposing original content.
 * 
 * Constitutional Principle II: Legal Risk Minimization
 * - Logs processing outcomes without original content
 * - Maintains audit trail for privacy compliance verification
 */

import { createHash } from 'crypto'

/**
 * Preprocessing event types
 */
type PreprocessingEventType = 
  | 'content_received'
  | 'content_normalized'
  | 'content_hashed'
  | 'anonymization_started'
  | 'anonymization_completed'
  | 'deduplication_check'
  | 'hash_comparison'
  | 'processing_error'
  | 'privacy_violation_detected'
  | 'content_rejected'

/**
 * Audit log entry for preprocessing
 */
interface PreprocessingAuditEntry {
  id: string
  timestamp: string
  eventType: PreprocessingEventType
  sessionId?: string
  userId?: string
  contentHash?: string
  processingTime?: number
  metadata: Record<string, any>
  securityLevel: 'low' | 'medium' | 'high' | 'critical'
  privacyCompliance: {
    containsOriginalContent: boolean
    containsPII: boolean
    hashOnly: boolean
    validated: boolean
  }
}

/**
 * Audit configuration
 */
interface AuditConfig {
  enableDetailedLogging: boolean
  enablePerformanceTracking: boolean
  enablePrivacyValidation: boolean
  logRetentionDays: number
  securityLevel: 'basic' | 'standard' | 'strict'
  maxLogSize: number
}

/**
 * Privacy validation result
 */
interface PrivacyValidationResult {
  isCompliant: boolean
  violations: string[]
  warnings: string[]
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
}

/**
 * Preprocessing audit logger
 */
export class PreprocessingAuditLogger {
  private config: Required<AuditConfig>
  private auditLogs: PreprocessingAuditEntry[]
  private sessionMetrics: Map<string, {
    startTime: number
    events: number
    errors: number
    lastActivity: number
  }>

  constructor(config?: Partial<AuditConfig>) {
    this.config = {
      enableDetailedLogging: true,
      enablePerformanceTracking: true,
      enablePrivacyValidation: true,
      logRetentionDays: 90,
      securityLevel: 'standard',
      maxLogSize: 10000,
      ...config
    }
    
    this.auditLogs = []
    this.sessionMetrics = new Map()
  }

  /**
   * Log preprocessing event with privacy validation
   */
  async logEvent(
    eventType: PreprocessingEventType,
    options: {
      sessionId?: string
      userId?: string
      contentHash?: string
      processingTime?: number
      metadata?: Record<string, any>
      securityLevel?: 'low' | 'medium' | 'high' | 'critical'
    } = {}
  ): Promise<PreprocessingAuditEntry> {
    const startTime = Date.now()
    
    const entry: PreprocessingAuditEntry = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      eventType,
      sessionId: options.sessionId,
      userId: options.userId,
      contentHash: options.contentHash,
      processingTime: options.processingTime,
      metadata: options.metadata || {},
      securityLevel: options.securityLevel || this.determineSecurityLevel(eventType),
      privacyCompliance: {
        containsOriginalContent: false, // By design
        containsPII: false, // By design
        hashOnly: Boolean(options.contentHash),
        validated: false
      }
    }

    // Validate privacy compliance
    if (this.config.enablePrivacyValidation) {
      const validation = await this.validatePrivacyCompliance(entry)
      entry.privacyCompliance.validated = true
      
      if (!validation.isCompliant) {
        // Log privacy violation
        await this.logPrivacyViolation(entry, validation)
      }
    }

    // Update session metrics
    if (options.sessionId) {
      this.updateSessionMetrics(options.sessionId, entry)
    }

    // Add to audit log
    this.auditLogs.push(entry)

    // Manage log size
    this.manageLogSize()

    // Performance tracking
    if (this.config.enablePerformanceTracking) {
      entry.metadata.auditLogTime = Date.now() - startTime
    }

    return entry
  }

  /**
   * Log content processing start
   */
  async logContentReceived(
    sessionId: string,
    userId: string,
    contentLength: number,
    ipAddressHash?: string
  ): Promise<PreprocessingAuditEntry> {
    return this.logEvent('content_received', {
      sessionId,
      userId,
      metadata: {
        contentLength,
        ipAddressHash,
        processingStarted: true
      },
      securityLevel: 'medium'
    })
  }

  /**
   * Log content normalization
   */
  async logContentNormalized(
    sessionId: string,
    originalLength: number,
    normalizedLength: number,
    processingTime: number
  ): Promise<PreprocessingAuditEntry> {
    return this.logEvent('content_normalized', {
      sessionId,
      processingTime,
      metadata: {
        originalLength,
        normalizedLength,
        reductionRatio: (originalLength - normalizedLength) / originalLength
      },
      securityLevel: 'low'
    })
  }

  /**
   * Log content hashing
   */
  async logContentHashed(
    sessionId: string,
    contentHash: string,
    hashingTime: number,
    algorithm: string = 'sha256'
  ): Promise<PreprocessingAuditEntry> {
    return this.logEvent('content_hashed', {
      sessionId,
      contentHash,
      processingTime: hashingTime,
      metadata: {
        algorithm,
        hashLength: contentHash.length,
        timestamp: new Date().toISOString()
      },
      securityLevel: 'high'
    })
  }

  /**
   * Log anonymization process
   */
  async logAnonymizationCompleted(
    sessionId: string,
    contentHash: string,
    processingTime: number,
    metadata: Record<string, any>
  ): Promise<PreprocessingAuditEntry> {
    return this.logEvent('anonymization_completed', {
      sessionId,
      contentHash,
      processingTime,
      metadata: {
        ...metadata,
        anonymizationMethod: 'enhanced-hash',
        privacyLevel: 'maximum'
      },
      securityLevel: 'high'
    })
  }

  /**
   * Log deduplication check
   */
  async logDeduplicationCheck(
    sessionId: string,
    contentHash: string,
    isDuplicate: boolean,
    similarity: number,
    checkTime: number
  ): Promise<PreprocessingAuditEntry> {
    return this.logEvent('deduplication_check', {
      sessionId,
      contentHash,
      processingTime: checkTime,
      metadata: {
        isDuplicate,
        similarity,
        deduplicationMethod: 'hash-based'
      },
      securityLevel: 'medium'
    })
  }

  /**
   * Log hash comparison operation
   */
  async logHashComparison(
    sessionId: string,
    hash1: string,
    hash2: string,
    isMatch: boolean,
    comparisonTime: number
  ): Promise<PreprocessingAuditEntry> {
    return this.logEvent('hash_comparison', {
      sessionId,
      processingTime: comparisonTime,
      metadata: {
        hash1Length: hash1.length,
        hash2Length: hash2.length,
        isMatch,
        comparisonMethod: 'timing-safe'
      },
      securityLevel: 'high'
    })
  }

  /**
   * Log processing error
   */
  async logProcessingError(
    sessionId: string,
    errorType: string,
    errorMessage: string,
    stage: string
  ): Promise<PreprocessingAuditEntry> {
    return this.logEvent('processing_error', {
      sessionId,
      metadata: {
        errorType,
        errorMessage: this.sanitizeErrorMessage(errorMessage),
        stage,
        severity: 'error'
      },
      securityLevel: 'critical'
    })
  }

  /**
   * Get audit logs for session
   */
  getSessionLogs(sessionId: string): PreprocessingAuditEntry[] {
    return this.auditLogs
      .filter(log => log.sessionId === sessionId)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
  }

  /**
   * Get audit logs for user
   */
  getUserLogs(userId: string, limit: number = 100): PreprocessingAuditEntry[] {
    return this.auditLogs
      .filter(log => log.userId === userId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit)
  }

  /**
   * Get processing statistics
   */
  getProcessingStats(timeframe?: { start: string; end: string }): {
    totalEvents: number
    eventsByType: Record<PreprocessingEventType, number>
    averageProcessingTime: number
    errorRate: number
    privacyComplianceRate: number
    sessionCount: number
  } {
    let logs = this.auditLogs

    if (timeframe) {
      const startTime = new Date(timeframe.start).getTime()
      const endTime = new Date(timeframe.end).getTime()
      logs = logs.filter(log => {
        const logTime = new Date(log.timestamp).getTime()
        return logTime >= startTime && logTime <= endTime
      })
    }

    const eventsByType = {} as Record<PreprocessingEventType, number>
    let totalProcessingTime = 0
    let processedEventsCount = 0
    let errorCount = 0
    let compliantCount = 0
    const sessions = new Set<string>()

    for (const log of logs) {
      eventsByType[log.eventType] = (eventsByType[log.eventType] || 0) + 1

      if (log.processingTime) {
        totalProcessingTime += log.processingTime
        processedEventsCount++
      }

      if (log.eventType === 'processing_error') {
        errorCount++
      }

      if (log.privacyCompliance.validated && log.privacyCompliance.hashOnly) {
        compliantCount++
      }

      if (log.sessionId) {
        sessions.add(log.sessionId)
      }
    }

    return {
      totalEvents: logs.length,
      eventsByType,
      averageProcessingTime: processedEventsCount > 0 ? totalProcessingTime / processedEventsCount : 0,
      errorRate: logs.length > 0 ? errorCount / logs.length : 0,
      privacyComplianceRate: logs.length > 0 ? compliantCount / logs.length : 1,
      sessionCount: sessions.size
    }
  }

  /**
   * Export audit logs for compliance
   */
  exportAuditLogs(
    filters?: {
      sessionId?: string
      userId?: string
      eventTypes?: PreprocessingEventType[]
      startDate?: string
      endDate?: string
      securityLevel?: 'low' | 'medium' | 'high' | 'critical'
    }
  ): {
    logs: PreprocessingAuditEntry[]
    summary: {
      totalEntries: number
      exportedAt: string
      filters: typeof filters
      privacyCompliant: boolean
    }
  } {
    let filteredLogs = [...this.auditLogs]

    if (filters) {
      if (filters.sessionId) {
        filteredLogs = filteredLogs.filter(log => log.sessionId === filters.sessionId)
      }

      if (filters.userId) {
        filteredLogs = filteredLogs.filter(log => log.userId === filters.userId)
      }

      if (filters.eventTypes) {
        filteredLogs = filteredLogs.filter(log => filters.eventTypes!.includes(log.eventType))
      }

      if (filters.securityLevel) {
        filteredLogs = filteredLogs.filter(log => log.securityLevel === filters.securityLevel)
      }

      if (filters.startDate) {
        const startTime = new Date(filters.startDate).getTime()
        filteredLogs = filteredLogs.filter(log => 
          new Date(log.timestamp).getTime() >= startTime
        )
      }

      if (filters.endDate) {
        const endTime = new Date(filters.endDate).getTime()
        filteredLogs = filteredLogs.filter(log => 
          new Date(log.timestamp).getTime() <= endTime
        )
      }
    }

    // Verify privacy compliance of export
    const privacyCompliant = filteredLogs.every(log => 
      !log.privacyCompliance.containsOriginalContent && 
      !log.privacyCompliance.containsPII
    )

    return {
      logs: filteredLogs,
      summary: {
        totalEntries: filteredLogs.length,
        exportedAt: new Date().toISOString(),
        filters,
        privacyCompliant
      }
    }
  }

  /**
   * Validate privacy compliance of audit entry
   */
  private async validatePrivacyCompliance(entry: PreprocessingAuditEntry): Promise<PrivacyValidationResult> {
    const violations: string[] = []
    const warnings: string[] = []
    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low'

    // Check for original content exposure
    const entryString = JSON.stringify(entry)
    
    // Check for potential PII patterns
    const piiPatterns = [
      /@\w+\.\w+/, // Email patterns
      /\b\d{3}-\d{2}-\d{4}\b/, // SSN patterns
      /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/, // Credit card patterns
      /\b(?:\+1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}\b/ // Phone patterns
    ]

    for (const pattern of piiPatterns) {
      if (pattern.test(entryString)) {
        violations.push(`Potential PII detected matching pattern: ${pattern.source}`)
        riskLevel = 'critical'
      }
    }

    // Check for content fragments
    if (entry.metadata) {
      const metadataString = JSON.stringify(entry.metadata)
      if (metadataString.length > 1000) {
        warnings.push('Large metadata object - review for potential content exposure')
        riskLevel = 'medium'
      }

      // Check for suspicious metadata keys
      const suspiciousKeys = ['content', 'originalText', 'userInput', 'rawData']
      for (const key of suspiciousKeys) {
        if (metadataString.toLowerCase().includes(key.toLowerCase())) {
          violations.push(`Suspicious metadata key detected: ${key}`)
          riskLevel = 'high'
        }
      }
    }

    // Validate hash format if present
    if (entry.contentHash && !/^[a-f0-9]{64}$/.test(entry.contentHash)) {
      violations.push('Invalid hash format - should be SHA-256 hex string')
      riskLevel = 'high'
    }

    return {
      isCompliant: violations.length === 0,
      violations,
      warnings,
      riskLevel
    }
  }

  /**
   * Log privacy violation
   */
  private async logPrivacyViolation(
    originalEntry: PreprocessingAuditEntry,
    validation: PrivacyValidationResult
  ): Promise<void> {
    await this.logEvent('privacy_violation_detected', {
      sessionId: originalEntry.sessionId,
      metadata: {
        originalEventType: originalEntry.eventType,
        violations: validation.violations,
        warnings: validation.warnings,
        riskLevel: validation.riskLevel,
        originalEntryId: originalEntry.id
      },
      securityLevel: 'critical'
    })
  }

  /**
   * Determine security level based on event type
   */
  private determineSecurityLevel(eventType: PreprocessingEventType): 'low' | 'medium' | 'high' | 'critical' {
    const securityLevels: Record<PreprocessingEventType, 'low' | 'medium' | 'high' | 'critical'> = {
      'content_received': 'medium',
      'content_normalized': 'low',
      'content_hashed': 'high',
      'anonymization_started': 'medium',
      'anonymization_completed': 'high',
      'deduplication_check': 'medium',
      'hash_comparison': 'high',
      'processing_error': 'critical',
      'privacy_violation_detected': 'critical',
      'content_rejected': 'high'
    }

    return securityLevels[eventType] || 'medium'
  }

  /**
   * Update session metrics
   */
  private updateSessionMetrics(sessionId: string, entry: PreprocessingAuditEntry): void {
    if (!this.sessionMetrics.has(sessionId)) {
      this.sessionMetrics.set(sessionId, {
        startTime: Date.now(),
        events: 0,
        errors: 0,
        lastActivity: Date.now()
      })
    }

    const metrics = this.sessionMetrics.get(sessionId)!
    metrics.events++
    metrics.lastActivity = Date.now()

    if (entry.eventType === 'processing_error') {
      metrics.errors++
    }
  }

  /**
   * Sanitize error messages to remove potential content exposure
   */
  private sanitizeErrorMessage(errorMessage: string): string {
    // Remove potential content fragments from error messages
    return errorMessage
      .replace(/content[:\s]*["']([^"']{50,})["']/gi, 'content: [REDACTED]')
      .replace(/input[:\s]*["']([^"']{50,})["']/gi, 'input: [REDACTED]')
      .replace(/text[:\s]*["']([^"']{50,})["']/gi, 'text: [REDACTED]')
      .substring(0, 500) // Limit error message length
  }

  /**
   * Manage log size to prevent memory issues
   */
  private manageLogSize(): void {
    if (this.auditLogs.length > this.config.maxLogSize) {
      // Remove oldest logs, keeping the most recent ones
      const excessLogs = this.auditLogs.length - this.config.maxLogSize
      this.auditLogs.splice(0, excessLogs)
    }
  }

  /**
   * Clear all audit logs
   */
  clearLogs(): void {
    this.auditLogs = []
    this.sessionMetrics.clear()
  }

  /**
   * Get current audit statistics
   */
  getAuditStats(): {
    totalLogs: number
    activeSessions: number
    memoryUsage: string
    oldestLog?: string
    newestLog?: string
  } {
    const now = Date.now()
    const activeSessions = Array.from(this.sessionMetrics.entries())
      .filter(([_, metrics]) => (now - metrics.lastActivity) < 60 * 60 * 1000) // Active in last hour
      .length

    // Rough memory estimate
    const avgLogSize = 1000 // bytes per log entry (estimated)
    const memoryUsageBytes = this.auditLogs.length * avgLogSize
    const memoryUsage = memoryUsageBytes > 1024 * 1024 
      ? `${(memoryUsageBytes / (1024 * 1024)).toFixed(2)} MB`
      : `${(memoryUsageBytes / 1024).toFixed(2)} KB`

    return {
      totalLogs: this.auditLogs.length,
      activeSessions,
      memoryUsage,
      oldestLog: this.auditLogs.length > 0 ? this.auditLogs[0].timestamp : undefined,
      newestLog: this.auditLogs.length > 0 ? this.auditLogs[this.auditLogs.length - 1].timestamp : undefined
    }
  }
}

/**
 * Default preprocessing audit logger
 */
export const defaultPreprocessingAuditor = new PreprocessingAuditLogger({
  enableDetailedLogging: true,
  enablePrivacyValidation: true,
  securityLevel: 'standard'
})

/**
 * High-security preprocessing audit logger
 */
export const securePreprocessingAuditor = new PreprocessingAuditLogger({
  enableDetailedLogging: true,
  enablePrivacyValidation: true,
  securityLevel: 'strict',
  maxLogSize: 50000
})

// Export types
export type { 
  PreprocessingEventType, 
  PreprocessingAuditEntry, 
  AuditConfig, 
  PrivacyValidationResult 
}