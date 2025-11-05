/**
 * Audit Trail Unit Test (Task T105)
 * Tests for privacy-compliant audit logging and monitoring
 */

import { createHash } from 'crypto'

// Audit event types
type AuditEventType = 
  | 'analysis_started'
  | 'analysis_completed'
  | 'analysis_failed'
  | 'session_expired'
  | 'data_deleted'
  | 'quota_exceeded'
  | 'user_signed_in'
  | 'user_signed_out'
  | 'privacy_policy_viewed'
  | 'terms_accepted'

// Audit log entry interface
interface AuditLogEntry {
  id: string
  timestamp: string
  event_type: AuditEventType
  user_id?: string
  session_id?: string
  content_hash?: string
  metadata: Record<string, any>
  ip_address_hash?: string
  user_agent_hash?: string
}

// Audit trail service
class AuditTrailService {
  private logs: AuditLogEntry[] = []

  /**
   * Generate privacy-compliant hash for IP addresses
   */
  private hashSensitiveData(data: string): string {
    return createHash('sha256').update(data + process.env.AUDIT_SALT || 'default-salt').digest('hex')
  }

  /**
   * Create a new audit log entry
   */
  async logEvent(
    eventType: AuditEventType,
    options: {
      userId?: string
      sessionId?: string
      contentHash?: string
      ipAddress?: string
      userAgent?: string
      metadata?: Record<string, any>
    } = {}
  ): Promise<AuditLogEntry> {
    const entry: AuditLogEntry = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      event_type: eventType,
      user_id: options.userId,
      session_id: options.sessionId,
      content_hash: options.contentHash,
      metadata: options.metadata || {},
      ip_address_hash: options.ipAddress ? this.hashSensitiveData(options.ipAddress) : undefined,
      user_agent_hash: options.userAgent ? this.hashSensitiveData(options.userAgent) : undefined
    }

    this.logs.push(entry)
    return entry
  }

  /**
   * Get audit logs for a specific user (privacy-compliant)
   */
  async getUserAuditLogs(userId: string, limit = 50): Promise<AuditLogEntry[]> {
    return this.logs
      .filter(log => log.user_id === userId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit)
  }

  /**
   * Get audit logs for a specific session
   */
  async getSessionAuditLogs(sessionId: string): Promise<AuditLogEntry[]> {
    return this.logs
      .filter(log => log.session_id === sessionId)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
  }

  /**
   * Get audit statistics (privacy-safe aggregations)
   */
  async getAuditStatistics(timeframe: { start: string; end: string }): Promise<{
    totalEvents: number
    eventsByType: Record<AuditEventType, number>
    uniqueUsers: number
    uniqueSessions: number
    timeframe: { start: string; end: string }
  }> {
    const startTime = new Date(timeframe.start).getTime()
    const endTime = new Date(timeframe.end).getTime()

    const relevantLogs = this.logs.filter(log => {
      const logTime = new Date(log.timestamp).getTime()
      return logTime >= startTime && logTime <= endTime
    })

    const eventsByType = {} as Record<AuditEventType, number>
    const uniqueUsers = new Set<string>()
    const uniqueSessions = new Set<string>()

    for (const log of relevantLogs) {
      eventsByType[log.event_type] = (eventsByType[log.event_type] || 0) + 1
      
      if (log.user_id) {
        uniqueUsers.add(log.user_id)
      }
      
      if (log.session_id) {
        uniqueSessions.add(log.session_id)
      }
    }

    return {
      totalEvents: relevantLogs.length,
      eventsByType,
      uniqueUsers: uniqueUsers.size,
      uniqueSessions: uniqueSessions.size,
      timeframe
    }
  }

  /**
   * Clean up old audit logs (retention policy)
   */
  async cleanupOldLogs(retentionDays = 90): Promise<{ deletedCount: number }> {
    const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000)
    const initialCount = this.logs.length

    this.logs = this.logs.filter(log => 
      new Date(log.timestamp).getTime() > cutoffDate.getTime()
    )

    return { deletedCount: initialCount - this.logs.length }
  }

  /**
   * Export audit logs for compliance (privacy-safe)
   */
  async exportAuditLogs(
    filters: {
      userId?: string
      eventTypes?: AuditEventType[]
      startDate?: string
      endDate?: string
    } = {}
  ): Promise<{
    logs: AuditLogEntry[]
    summary: {
      totalEntries: number
      dateRange: { start: string; end: string }
      exportedAt: string
    }
  }> {
    let filteredLogs = [...this.logs]

    if (filters.userId) {
      filteredLogs = filteredLogs.filter(log => log.user_id === filters.userId)
    }

    if (filters.eventTypes) {
      filteredLogs = filteredLogs.filter(log => filters.eventTypes!.includes(log.event_type))
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

    const sortedLogs = filteredLogs.sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    )

    const dateRange = {
      start: sortedLogs.length > 0 ? sortedLogs[0].timestamp : new Date().toISOString(),
      end: sortedLogs.length > 0 ? sortedLogs[sortedLogs.length - 1].timestamp : new Date().toISOString()
    }

    return {
      logs: sortedLogs,
      summary: {
        totalEntries: sortedLogs.length,
        dateRange,
        exportedAt: new Date().toISOString()
      }
    }
  }

  /**
   * Validate audit trail integrity
   */
  async validateIntegrity(): Promise<{
    isValid: boolean
    totalEntries: number
    errors: string[]
    warnings: string[]
  }> {
    const errors: string[] = []
    const warnings: string[] = []

    // Check for required fields
    for (const log of this.logs) {
      if (!log.id || !log.timestamp || !log.event_type) {
        errors.push(`Invalid log entry: missing required fields in ${log.id || 'unknown'}`)
      }

      // Check timestamp validity
      if (isNaN(new Date(log.timestamp).getTime())) {
        errors.push(`Invalid timestamp in log ${log.id}`)
      }

      // Check for privacy compliance
      const logString = JSON.stringify(log)
      if (logString.includes('@') && !logString.includes('hash')) {
        warnings.push(`Potential PII in log ${log.id}: contains email-like pattern`)
      }

      // Check metadata for sensitive data
      if (log.metadata) {
        const metadataString = JSON.stringify(log.metadata)
        if (metadataString.toLowerCase().includes('password') || 
            metadataString.toLowerCase().includes('secret')) {
          errors.push(`Sensitive data in metadata for log ${log.id}`)
        }
      }
    }

    return {
      isValid: errors.length === 0,
      totalEntries: this.logs.length,
      errors,
      warnings
    }
  }

  // Test helper methods
  clear(): void {
    this.logs = []
  }

  getAllLogs(): AuditLogEntry[] {
    return [...this.logs]
  }
}

describe('Audit Trail Service', () => {
  let auditService: AuditTrailService

  beforeEach(() => {
    auditService = new AuditTrailService()
  })

  afterEach(() => {
    auditService.clear()
  })

  describe('Event Logging', () => {
    it('should create audit log entries with required fields', async () => {
      const entry = await auditService.logEvent('analysis_started', {
        userId: 'user-123',
        sessionId: 'session-456',
        contentHash: createHash('sha256').update('test content').digest('hex'),
        metadata: { contentLength: 100 }
      })

      expect(entry.id).toBeDefined()
      expect(entry.timestamp).toBeDefined()
      expect(entry.event_type).toBe('analysis_started')
      expect(entry.user_id).toBe('user-123')
      expect(entry.session_id).toBe('session-456')
      expect(entry.content_hash).toMatch(/^[a-f0-9]{64}$/)
      expect(entry.metadata.contentLength).toBe(100)
    })

    it('should hash sensitive data like IP addresses and user agents', async () => {
      const entry = await auditService.logEvent('user_signed_in', {
        userId: 'user-123',
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      })

      expect(entry.ip_address_hash).toBeDefined()
      expect(entry.ip_address_hash).toMatch(/^[a-f0-9]{64}$/)
      expect(entry.ip_address_hash).not.toContain('192.168.1.100')

      expect(entry.user_agent_hash).toBeDefined()
      expect(entry.user_agent_hash).toMatch(/^[a-f0-9]{64}$/)
      expect(entry.user_agent_hash).not.toContain('Mozilla')
      expect(entry.user_agent_hash).not.toContain('Windows')
    })

    it('should support all audit event types', async () => {
      const eventTypes: AuditEventType[] = [
        'analysis_started',
        'analysis_completed',
        'analysis_failed',
        'session_expired',
        'data_deleted',
        'quota_exceeded',
        'user_signed_in',
        'user_signed_out',
        'privacy_policy_viewed',
        'terms_accepted'
      ]

      for (const eventType of eventTypes) {
        const entry = await auditService.logEvent(eventType, {
          userId: 'user-123'
        })

        expect(entry.event_type).toBe(eventType)
      }

      const allLogs = auditService.getAllLogs()
      expect(allLogs).toHaveLength(eventTypes.length)
    })

    it('should handle minimal event logging', async () => {
      const entry = await auditService.logEvent('privacy_policy_viewed')

      expect(entry.id).toBeDefined()
      expect(entry.timestamp).toBeDefined()
      expect(entry.event_type).toBe('privacy_policy_viewed')
      expect(entry.user_id).toBeUndefined()
      expect(entry.session_id).toBeUndefined()
      expect(entry.metadata).toEqual({})
    })
  })

  describe('Log Retrieval', () => {
    beforeEach(async () => {
      // Create test data
      await auditService.logEvent('user_signed_in', { userId: 'user-1' })
      await auditService.logEvent('analysis_started', { userId: 'user-1', sessionId: 'session-1' })
      await auditService.logEvent('analysis_completed', { userId: 'user-1', sessionId: 'session-1' })
      await auditService.logEvent('user_signed_in', { userId: 'user-2' })
      await auditService.logEvent('analysis_started', { userId: 'user-2', sessionId: 'session-2' })
    })

    it('should retrieve audit logs for specific user', async () => {
      const user1Logs = await auditService.getUserAuditLogs('user-1')
      const user2Logs = await auditService.getUserAuditLogs('user-2')

      expect(user1Logs).toHaveLength(3)
      expect(user2Logs).toHaveLength(2)

      user1Logs.forEach(log => {
        expect(log.user_id).toBe('user-1')
      })

      user2Logs.forEach(log => {
        expect(log.user_id).toBe('user-2')
      })
    })

    it('should retrieve audit logs for specific session', async () => {
      const session1Logs = await auditService.getSessionAuditLogs('session-1')
      const session2Logs = await auditService.getSessionAuditLogs('session-2')

      expect(session1Logs).toHaveLength(2)
      expect(session2Logs).toHaveLength(1)

      session1Logs.forEach(log => {
        expect(log.session_id).toBe('session-1')
      })

      // Verify chronological order for session logs
      expect(session1Logs[0].event_type).toBe('analysis_started')
      expect(session1Logs[1].event_type).toBe('analysis_completed')
    })

    it('should limit number of returned logs', async () => {
      // There are already 3 logs for user-1 from beforeEach, add 50 more 
      for (let i = 0; i < 50; i++) {
        await auditService.logEvent('privacy_policy_viewed', { userId: 'user-1' })
      }

      const allLogs = await auditService.getUserAuditLogs('user-1', 100) // Request more than default
      const limitedLogs = await auditService.getUserAuditLogs('user-1', 10)

      expect(allLogs.length).toBe(53) // 3 from beforeEach + 50 added
      expect(limitedLogs).toHaveLength(10)
    })

    it('should return logs in reverse chronological order for users', async () => {
      const userLogs = await auditService.getUserAuditLogs('user-1')

      for (let i = 0; i < userLogs.length - 1; i++) {
        const currentTime = new Date(userLogs[i].timestamp).getTime()
        const nextTime = new Date(userLogs[i + 1].timestamp).getTime()
        expect(currentTime).toBeGreaterThanOrEqual(nextTime)
      }
    })
  })

  describe('Audit Statistics', () => {
    beforeEach(async () => {
      const now = Date.now()
      
      // Create events across different times
      await auditService.logEvent('user_signed_in', { 
        userId: 'user-1',
        metadata: { timestamp: new Date(now - 60000).toISOString() }
      })
      await auditService.logEvent('analysis_started', { 
        userId: 'user-1', 
        sessionId: 'session-1',
        metadata: { timestamp: new Date(now - 30000).toISOString() }
      })
      await auditService.logEvent('analysis_completed', { 
        userId: 'user-1', 
        sessionId: 'session-1',
        metadata: { timestamp: new Date(now).toISOString() }
      })
      await auditService.logEvent('user_signed_in', { 
        userId: 'user-2',
        metadata: { timestamp: new Date(now + 60000).toISOString() }
      })
    })

    it('should generate accurate statistics for timeframe', async () => {
      const now = new Date()
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
      const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000)

      const stats = await auditService.getAuditStatistics({
        start: oneHourAgo.toISOString(),
        end: oneHourFromNow.toISOString()
      })

      expect(stats.totalEvents).toBe(4)
      expect(stats.eventsByType.user_signed_in).toBe(2)
      expect(stats.eventsByType.analysis_started).toBe(1)
      expect(stats.eventsByType.analysis_completed).toBe(1)
      expect(stats.uniqueUsers).toBe(2)
      expect(stats.uniqueSessions).toBe(1)
    })

    it('should handle empty timeframes', async () => {
      const futureStart = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      const futureEnd = new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString()

      const stats = await auditService.getAuditStatistics({
        start: futureStart,
        end: futureEnd
      })

      expect(stats.totalEvents).toBe(0)
      expect(stats.uniqueUsers).toBe(0)
      expect(stats.uniqueSessions).toBe(0)
    })
  })

  describe('Data Retention and Cleanup', () => {
    beforeEach(async () => {
      const now = Date.now()
      
      // Create old logs (100 days ago)
      const oldTimestamp = new Date(now - 100 * 24 * 60 * 60 * 1000).toISOString()
      await auditService.logEvent('user_signed_in', { 
        userId: 'old-user',
        metadata: { originalTimestamp: oldTimestamp }
      })
      
      // Create recent logs (10 days ago)
      const recentTimestamp = new Date(now - 10 * 24 * 60 * 60 * 1000).toISOString()
      await auditService.logEvent('analysis_started', { 
        userId: 'recent-user',
        metadata: { originalTimestamp: recentTimestamp }
      })
      
      // Override timestamps for testing
      const logs = auditService.getAllLogs()
      logs[0].timestamp = oldTimestamp
      logs[1].timestamp = recentTimestamp
    })

    it('should clean up logs older than retention period', async () => {
      const initialCount = auditService.getAllLogs().length
      expect(initialCount).toBe(2)

      const result = await auditService.cleanupOldLogs(90) // 90 days retention

      expect(result.deletedCount).toBe(1)
      
      const remainingLogs = auditService.getAllLogs()
      expect(remainingLogs).toHaveLength(1)
      expect(remainingLogs[0].user_id).toBe('recent-user')
    })

    it('should not delete logs within retention period', async () => {
      const result = await auditService.cleanupOldLogs(30) // 30 days retention

      expect(result.deletedCount).toBe(1) // Only the 100-day old log should be deleted

      // Test with longer retention
      auditService.clear()
      
      // Create fresh test data
      const now = Date.now()
      const recentTimestamp = new Date(now - 10 * 24 * 60 * 60 * 1000).toISOString()
      await auditService.logEvent('user_signed_in', { userId: 'new-user' })
      
      // Override timestamp
      const logs = auditService.getAllLogs()
      logs[0].timestamp = recentTimestamp
      
      const result3 = await auditService.cleanupOldLogs(1) // 1 day retention
      expect(result3.deletedCount).toBe(1) // 10-day old log should be deleted
      
      const result4 = await auditService.cleanupOldLogs(30) // 30 day retention  
      expect(result4.deletedCount).toBe(0) // No logs to delete now
    })
  })

  describe('Audit Export and Compliance', () => {
    beforeEach(async () => {
      const now = Date.now()
      
      await auditService.logEvent('user_signed_in', { 
        userId: 'user-1',
        metadata: { loginMethod: 'oauth' }
      })
      await auditService.logEvent('analysis_started', { 
        userId: 'user-1', 
        sessionId: 'session-1'
      })
      await auditService.logEvent('analysis_completed', { 
        userId: 'user-1', 
        sessionId: 'session-1'
      })
      await auditService.logEvent('quota_exceeded', { 
        userId: 'user-2'
      })
    })

    it('should export logs with filters', async () => {
      const export1 = await auditService.exportAuditLogs({
        userId: 'user-1'
      })

      expect(export1.logs).toHaveLength(3)
      expect(export1.summary.totalEntries).toBe(3)
      export1.logs.forEach(log => {
        expect(log.user_id).toBe('user-1')
      })

      const export2 = await auditService.exportAuditLogs({
        eventTypes: ['analysis_started', 'analysis_completed']
      })

      expect(export2.logs).toHaveLength(2)
      export2.logs.forEach(log => {
        expect(['analysis_started', 'analysis_completed']).toContain(log.event_type)
      })
    })

    it('should export logs with date range filters', async () => {
      const now = new Date()
      const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000)

      const export1 = await auditService.exportAuditLogs({
        startDate: now.toISOString(),
        endDate: oneHourFromNow.toISOString()
      })

      expect(export1.logs.length).toBeGreaterThan(0)
      expect(export1.summary.dateRange).toBeDefined()
      expect(export1.summary.exportedAt).toBeDefined()
    })

    it('should include summary information in exports', async () => {
      const exported = await auditService.exportAuditLogs()

      expect(exported.summary).toHaveProperty('totalEntries')
      expect(exported.summary).toHaveProperty('dateRange')
      expect(exported.summary).toHaveProperty('exportedAt')
      expect(exported.summary.totalEntries).toBe(exported.logs.length)
    })
  })

  describe('Integrity Validation', () => {
    it('should validate audit trail integrity', async () => {
      await auditService.logEvent('user_signed_in', { 
        userId: 'user-1',
        metadata: { safe: 'data' }
      })

      const validation = await auditService.validateIntegrity()

      expect(validation.isValid).toBe(true)
      expect(validation.totalEntries).toBe(1)
      expect(validation.errors).toEqual([])
      expect(validation.warnings).toEqual([])
    })

    it('should detect integrity issues', async () => {
      // Create a valid log first
      await auditService.logEvent('user_signed_in', { userId: 'user-1' })

      // Manually corrupt a log entry for testing
      const logs = auditService.getAllLogs()
      logs[0].timestamp = 'invalid-timestamp'

      const validation = await auditService.validateIntegrity()

      expect(validation.isValid).toBe(false)
      expect(validation.errors.length).toBeGreaterThan(0)
      expect(validation.errors[0]).toContain('Invalid timestamp')
    })

    it('should warn about potential PII in logs', async () => {
      await auditService.logEvent('user_signed_in', { 
        userId: 'user-1',
        metadata: { userEmail: 'user@example.com' } // This should trigger a warning
      })

      const validation = await auditService.validateIntegrity()

      expect(validation.warnings.length).toBeGreaterThan(0)
      expect(validation.warnings[0]).toContain('Potential PII')
    })

    it('should detect sensitive data in metadata', async () => {
      await auditService.logEvent('user_signed_in', { 
        userId: 'user-1',
        metadata: { password: 'secret123' } // This should trigger an error
      })

      const validation = await auditService.validateIntegrity()

      expect(validation.isValid).toBe(false)
      expect(validation.errors.length).toBeGreaterThan(0)
      expect(validation.errors[0]).toContain('Sensitive data in metadata')
    })
  })

  describe('Privacy Compliance', () => {
    it('should never store original IP addresses or user agents', async () => {
      const originalIP = '203.0.113.42'
      const originalUserAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'

      await auditService.logEvent('user_signed_in', {
        userId: 'user-1',
        ipAddress: originalIP,
        userAgent: originalUserAgent
      })

      const logs = auditService.getAllLogs()
      const logString = JSON.stringify(logs)

      expect(logString).not.toContain(originalIP)
      expect(logString).not.toContain(originalUserAgent)
      expect(logString).not.toContain('203.0.113.42')
      expect(logString).not.toContain('Mozilla')
      expect(logString).not.toContain('Macintosh')

      // But hashes should be present
      expect(logs[0].ip_address_hash).toBeDefined()
      expect(logs[0].user_agent_hash).toBeDefined()
      expect(logs[0].ip_address_hash).toMatch(/^[a-f0-9]{64}$/)
      expect(logs[0].user_agent_hash).toMatch(/^[a-f0-9]{64}$/)
    })

    it('should support privacy-compliant user identification', async () => {
      const userId = 'user-privacy-123'

      await auditService.logEvent('analysis_started', {
        userId,
        sessionId: 'session-456',
        contentHash: createHash('sha256').update('privacy test content').digest('hex')
      })

      const userLogs = await auditService.getUserAuditLogs(userId)
      
      expect(userLogs).toHaveLength(1)
      expect(userLogs[0].user_id).toBe(userId)
      expect(userLogs[0].content_hash).toMatch(/^[a-f0-9]{64}$/)
      
      // Verify no original content is stored
      const logString = JSON.stringify(userLogs)
      expect(logString).not.toContain('privacy test content')
    })

    it('should maintain audit trail without exposing sensitive operations', async () => {
      const contentHash = createHash('sha256').update('sensitive terms document').digest('hex')

      await auditService.logEvent('analysis_started', {
        userId: 'user-1',
        sessionId: 'session-secure',
        contentHash,
        metadata: {
          contentLength: 1500,
          estimatedTime: '15 seconds',
          riskCategories: ['account-termination', 'data-collection']
        }
      })

      await auditService.logEvent('analysis_completed', {
        userId: 'user-1',
        sessionId: 'session-secure',
        contentHash,
        metadata: {
          riskScore: 85,
          riskLevel: 'high',
          processingTime: 14.5
        }
      })

      const sessionLogs = await auditService.getSessionAuditLogs('session-secure')
      
      expect(sessionLogs).toHaveLength(2)
      
      // Verify audit trail contains analytical results but no original content
      const logString = JSON.stringify(sessionLogs)
      expect(logString).toContain('account-termination')
      expect(logString).toContain('data-collection')
      expect(logString).toContain('high')
      expect(logString).not.toContain('sensitive terms document')
      expect(logString).toContain(contentHash)
    })
  })
})

export { AuditTrailService, type AuditEventType, type AuditLogEntry }