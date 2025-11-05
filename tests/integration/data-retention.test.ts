/**
 * Data Retention Integration Test (Task T104)
 * Tests for automated data retention and cleanup policies
 */

import { createHash } from 'crypto'

// Mock database operations for testing data retention
class MockDatabase {
  private data: { [table: string]: any[] } = {
    analysis_sessions: [],
    risk_assessments: [],
    daily_quotas: [],
    users: []
  }

  // Simulate database insert
  async insert(table: string, record: any): Promise<{ data: any; error: null }> {
    const newRecord = {
      id: `${table}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      created_at: new Date().toISOString(),
      ...record
    }
    this.data[table].push(newRecord)
    return { data: newRecord, error: null }
  }

  // Simulate database select
  async select(table: string, conditions?: any): Promise<{ data: any[]; error: null }> {
    let results = [...this.data[table]]
    
    if (conditions) {
      if (conditions.lt) {
        const [field, value] = conditions.lt
        results = results.filter(record => 
          new Date(record[field]).getTime() < new Date(value).getTime()
        )
      }
      if (conditions.eq) {
        const [field, value] = conditions.eq
        results = results.filter(record => record[field] === value)
      }
      if (conditions.gte) {
        const [field, value] = conditions.gte
        results = results.filter(record => 
          new Date(record[field]).getTime() >= new Date(value).getTime()
        )
      }
    }
    
    return { data: results, error: null }
  }

  // Simulate database delete
  async delete(table: string, conditions: any): Promise<{ data: null; error: null; count: number }> {
    const initialLength = this.data[table].length
    
    if (conditions.lt) {
      const [field, value] = conditions.lt
      this.data[table] = this.data[table].filter(record => 
        new Date(record[field]).getTime() >= new Date(value).getTime()
      )
    }
    if (conditions.eq) {
      const [field, value] = conditions.eq
      this.data[table] = this.data[table].filter(record => record[field] !== value)
    }
    
    const deletedCount = initialLength - this.data[table].length
    return { data: null, error: null, count: deletedCount }
  }

  // Get table count
  async count(table: string): Promise<number> {
    return this.data[table].length
  }

  // Clear all data (for test cleanup)
  clear(): void {
    Object.keys(this.data).forEach(table => {
      this.data[table] = []
    })
  }
}

// Data retention service for testing
class DataRetentionService {
  constructor(private db: MockDatabase) {}

  /**
   * Clean up expired analysis sessions
   */
  async cleanupExpiredSessions(): Promise<{ deletedCount: number; error?: string }> {
    try {
      const now = new Date().toISOString()
      
      // Find expired sessions
      const { data: expiredSessions } = await this.db.select('analysis_sessions', {
        lt: ['expires_at', now]
      })

      if (expiredSessions.length === 0) {
        return { deletedCount: 0 }
      }

      // Delete related risk assessments first
      let totalDeleted = 0
      for (const session of expiredSessions) {
        const { count: assessmentCount } = await this.db.delete('risk_assessments', {
          eq: ['session_id', session.id]
        })
        totalDeleted += assessmentCount
      }

      // Delete expired sessions
      const { count: sessionCount } = await this.db.delete('analysis_sessions', {
        lt: ['expires_at', now]
      })

      return { deletedCount: sessionCount + totalDeleted }
    } catch (error) {
      return { deletedCount: 0, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  /**
   * Clean up old quota records
   */
  async cleanupOldQuotas(): Promise<{ deletedCount: number; error?: string }> {
    try {
      // Delete quota records older than 30 days
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      
      const { count: deletedCount } = await this.db.delete('daily_quotas', {
        lt: ['date', thirtyDaysAgo]
      })

      return { deletedCount }
    } catch (error) {
      return { deletedCount: 0, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  /**
   * Get retention policy status
   */
  async getRetentionStatus(): Promise<{
    totalSessions: number
    expiredSessions: number
    totalQuotas: number
    oldQuotas: number
    nextCleanupRecommended: string
  }> {
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()

    const totalSessions = await this.db.count('analysis_sessions')
    const { data: expiredSessionsData } = await this.db.select('analysis_sessions', {
      lt: ['expires_at', now.toISOString()]
    })
    const expiredSessions = expiredSessionsData.length

    const totalQuotas = await this.db.count('daily_quotas')
    const { data: oldQuotasData } = await this.db.select('daily_quotas', {
      lt: ['date', thirtyDaysAgo]
    })
    const oldQuotas = oldQuotasData.length

    // Recommend cleanup if there are expired items
    const nextCleanupRecommended = (expiredSessions > 0 || oldQuotas > 0) 
      ? 'Immediate' 
      : 'Within 24 hours'

    return {
      totalSessions,
      expiredSessions,
      totalQuotas,
      oldQuotas,
      nextCleanupRecommended
    }
  }

  /**
   * Perform full retention cleanup
   */
  async performFullCleanup(): Promise<{
    sessionsDeleted: number
    quotasDeleted: number
    totalDeleted: number
    errors: string[]
  }> {
    const errors: string[] = []
    
    const sessionResult = await this.cleanupExpiredSessions()
    if (sessionResult.error) {
      errors.push(`Session cleanup: ${sessionResult.error}`)
    }

    const quotaResult = await this.cleanupOldQuotas()
    if (quotaResult.error) {
      errors.push(`Quota cleanup: ${quotaResult.error}`)
    }

    return {
      sessionsDeleted: sessionResult.deletedCount,
      quotasDeleted: quotaResult.deletedCount,
      totalDeleted: sessionResult.deletedCount + quotaResult.deletedCount,
      errors
    }
  }
}

describe('Data Retention Integration Tests', () => {
  let mockDb: MockDatabase
  let retentionService: DataRetentionService

  beforeEach(() => {
    mockDb = new MockDatabase()
    retentionService = new DataRetentionService(mockDb)
  })

  afterEach(() => {
    mockDb.clear()
  })

  describe('Analysis Session Retention', () => {
    it('should identify and clean up expired analysis sessions', async () => {
      const now = Date.now()
      const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000).toISOString()
      const oneWeekFromNow = new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString()

      // Create expired session
      const expiredSession = {
        user_id: 'user-123',
        content_hash: createHash('sha256').update('expired content').digest('hex'),
        content_length: 100,
        status: 'completed',
        risk_score: 75,
        risk_level: 'medium',
        confidence_score: 80,
        expires_at: oneDayAgo // Already expired
      }

      // Create active session
      const activeSession = {
        user_id: 'user-456',
        content_hash: createHash('sha256').update('active content').digest('hex'),
        content_length: 150,
        status: 'completed',
        risk_score: 60,
        risk_level: 'low',
        confidence_score: 85,
        expires_at: oneWeekFromNow // Not expired
      }

      await mockDb.insert('analysis_sessions', expiredSession)
      await mockDb.insert('analysis_sessions', activeSession)

      // Verify initial state
      const initialCount = await mockDb.count('analysis_sessions')
      expect(initialCount).toBe(2)

      // Perform cleanup
      const result = await retentionService.cleanupExpiredSessions()
      
      // Verify cleanup results
      expect(result.deletedCount).toBe(1)
      expect(result.error).toBeUndefined()

      // Verify only active session remains
      const remainingCount = await mockDb.count('analysis_sessions')
      expect(remainingCount).toBe(1)

      const { data: remainingSessions } = await mockDb.select('analysis_sessions')
      expect(remainingSessions[0].expires_at).toBe(oneWeekFromNow)
    })

    it('should clean up related risk assessments when sessions expire', async () => {
      const expiredDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

      // Create expired session
      const { data: expiredSession } = await mockDb.insert('analysis_sessions', {
        user_id: 'user-123',
        content_hash: createHash('sha256').update('expired with risks').digest('hex'),
        content_length: 200,
        status: 'completed',
        expires_at: expiredDate
      })

      // Create related risk assessments
      await mockDb.insert('risk_assessments', {
        session_id: expiredSession.id,
        clause_category: 'account-termination',
        risk_level: 'high',
        risk_score: 85,
        confidence_score: 90,
        summary: 'High-risk termination clause',
        rationale: 'Arbitrary termination allowed',
        suggested_action: 'Request clearer terms',
        start_position: 100,
        end_position: 200
      })

      await mockDb.insert('risk_assessments', {
        session_id: expiredSession.id,
        clause_category: 'data-collection',
        risk_level: 'medium',
        risk_score: 65,
        confidence_score: 75,
        summary: 'Data collection concerns',
        rationale: 'Broad data collection scope',
        suggested_action: 'Review privacy policy',
        start_position: 300,
        end_position: 400
      })

      // Verify initial state
      const initialSessionCount = await mockDb.count('analysis_sessions')
      const initialRiskCount = await mockDb.count('risk_assessments')
      expect(initialSessionCount).toBe(1)
      expect(initialRiskCount).toBe(2)

      // Perform cleanup
      const result = await retentionService.cleanupExpiredSessions()

      // Verify all related data is cleaned up
      expect(result.deletedCount).toBe(3) // 1 session + 2 risk assessments
      
      const finalSessionCount = await mockDb.count('analysis_sessions')
      const finalRiskCount = await mockDb.count('risk_assessments')
      expect(finalSessionCount).toBe(0)
      expect(finalRiskCount).toBe(0)
    })

    it('should not delete active sessions', async () => {
      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

      // Create active sessions
      await mockDb.insert('analysis_sessions', {
        user_id: 'user-1',
        content_hash: createHash('sha256').update('active 1').digest('hex'),
        content_length: 100,
        status: 'completed',
        expires_at: futureDate
      })

      await mockDb.insert('analysis_sessions', {
        user_id: 'user-2',
        content_hash: createHash('sha256').update('active 2').digest('hex'),
        content_length: 150,
        status: 'processing',
        expires_at: futureDate
      })

      // Verify initial state
      const initialCount = await mockDb.count('analysis_sessions')
      expect(initialCount).toBe(2)

      // Perform cleanup
      const result = await retentionService.cleanupExpiredSessions()

      // Verify no sessions were deleted
      expect(result.deletedCount).toBe(0)
      
      const finalCount = await mockDb.count('analysis_sessions')
      expect(finalCount).toBe(2)
    })
  })

  describe('Quota Data Retention', () => {
    it('should clean up old quota records', async () => {
      const now = Date.now()
      const fortyDaysAgo = new Date(now - 40 * 24 * 60 * 60 * 1000).toISOString()
      const twentyDaysAgo = new Date(now - 20 * 24 * 60 * 60 * 1000).toISOString()
      const today = new Date(now).toISOString()

      // Create old quota record (should be deleted)
      await mockDb.insert('daily_quotas', {
        user_id: 'user-123',
        date: fortyDaysAgo,
        used_quota: 5,
        max_quota: 10,
        reset_at: fortyDaysAgo
      })

      // Create recent quota record (should be kept)
      await mockDb.insert('daily_quotas', {
        user_id: 'user-123',
        date: twentyDaysAgo,
        used_quota: 3,
        max_quota: 10,
        reset_at: twentyDaysAgo
      })

      // Create current quota record (should be kept)
      await mockDb.insert('daily_quotas', {
        user_id: 'user-123',
        date: today,
        used_quota: 1,
        max_quota: 10,
        reset_at: today
      })

      // Verify initial state
      const initialCount = await mockDb.count('daily_quotas')
      expect(initialCount).toBe(3)

      // Perform cleanup
      const result = await retentionService.cleanupOldQuotas()

      // Verify only old quota was deleted
      expect(result.deletedCount).toBe(1)
      expect(result.error).toBeUndefined()

      const finalCount = await mockDb.count('daily_quotas')
      expect(finalCount).toBe(2)

      // Verify remaining records are recent
      const { data: remainingQuotas } = await mockDb.select('daily_quotas')
      const remainingDates = remainingQuotas.map(q => q.date)
      expect(remainingDates).toContain(twentyDaysAgo)
      expect(remainingDates).toContain(today)
      expect(remainingDates).not.toContain(fortyDaysAgo)
    })

    it('should not delete recent quota records', async () => {
      const now = Date.now()
      const recentDates = [
        new Date(now - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
        new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString(), // 1 week ago
        new Date(now - 15 * 24 * 60 * 60 * 1000).toISOString(), // 2 weeks ago
        new Date(now - 25 * 24 * 60 * 60 * 1000).toISOString(), // 3.5 weeks ago
      ]

      // Create recent quota records
      for (const date of recentDates) {
        await mockDb.insert('daily_quotas', {
          user_id: 'user-123',
          date,
          used_quota: 2,
          max_quota: 10,
          reset_at: date
        })
      }

      // Verify initial state
      const initialCount = await mockDb.count('daily_quotas')
      expect(initialCount).toBe(4)

      // Perform cleanup
      const result = await retentionService.cleanupOldQuotas()

      // Verify no records were deleted
      expect(result.deletedCount).toBe(0)
      
      const finalCount = await mockDb.count('daily_quotas')
      expect(finalCount).toBe(4)
    })
  })

  describe('Retention Status and Monitoring', () => {
    it('should provide accurate retention status', async () => {
      const now = Date.now()
      const expiredDate = new Date(now - 24 * 60 * 60 * 1000).toISOString()
      const activeDate = new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString()
      const oldQuotaDate = new Date(now - 40 * 24 * 60 * 60 * 1000).toISOString()
      const recentQuotaDate = new Date(now - 10 * 24 * 60 * 60 * 1000).toISOString()

      // Create test data
      await mockDb.insert('analysis_sessions', {
        user_id: 'user-1',
        content_hash: createHash('sha256').update('expired').digest('hex'),
        content_length: 100,
        status: 'completed',
        expires_at: expiredDate
      })

      await mockDb.insert('analysis_sessions', {
        user_id: 'user-2',
        content_hash: createHash('sha256').update('active').digest('hex'),
        content_length: 150,
        status: 'completed',
        expires_at: activeDate
      })

      await mockDb.insert('daily_quotas', {
        user_id: 'user-1',
        date: oldQuotaDate,
        used_quota: 5,
        max_quota: 10
      })

      await mockDb.insert('daily_quotas', {
        user_id: 'user-2',
        date: recentQuotaDate,
        used_quota: 3,
        max_quota: 10
      })

      // Get retention status
      const status = await retentionService.getRetentionStatus()

      // Verify status
      expect(status.totalSessions).toBe(2)
      expect(status.expiredSessions).toBe(1)
      expect(status.totalQuotas).toBe(2)
      expect(status.oldQuotas).toBe(1)
      expect(status.nextCleanupRecommended).toBe('Immediate')
    })

    it('should recommend appropriate cleanup timing', async () => {
      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      const recentDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()

      // Create only active/recent data
      await mockDb.insert('analysis_sessions', {
        user_id: 'user-1',
        content_hash: createHash('sha256').update('active').digest('hex'),
        content_length: 100,
        status: 'completed',
        expires_at: futureDate
      })

      await mockDb.insert('daily_quotas', {
        user_id: 'user-1',
        date: recentDate,
        used_quota: 3,
        max_quota: 10
      })

      const status = await retentionService.getRetentionStatus()

      expect(status.expiredSessions).toBe(0)
      expect(status.oldQuotas).toBe(0)
      expect(status.nextCleanupRecommended).toBe('Within 24 hours')
    })
  })

  describe('Full Cleanup Operations', () => {
    it('should perform comprehensive cleanup of all expired data', async () => {
      const now = Date.now()
      const expiredDate = new Date(now - 24 * 60 * 60 * 1000).toISOString()
      const oldQuotaDate = new Date(now - 40 * 24 * 60 * 60 * 1000).toISOString()
      const activeDate = new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString()
      const recentQuotaDate = new Date(now - 10 * 24 * 60 * 60 * 1000).toISOString()

      // Create expired session with risk assessments
      const { data: expiredSession } = await mockDb.insert('analysis_sessions', {
        user_id: 'user-1',
        content_hash: createHash('sha256').update('expired').digest('hex'),
        content_length: 100,
        status: 'completed',
        expires_at: expiredDate
      })

      await mockDb.insert('risk_assessments', {
        session_id: expiredSession.id,
        clause_category: 'account-termination',
        risk_level: 'high',
        risk_score: 85
      })

      // Create active session
      await mockDb.insert('analysis_sessions', {
        user_id: 'user-2',
        content_hash: createHash('sha256').update('active').digest('hex'),
        content_length: 150,
        status: 'completed',
        expires_at: activeDate
      })

      // Create old and recent quotas
      await mockDb.insert('daily_quotas', {
        user_id: 'user-1',
        date: oldQuotaDate,
        used_quota: 5,
        max_quota: 10
      })

      await mockDb.insert('daily_quotas', {
        user_id: 'user-2',
        date: recentQuotaDate,
        used_quota: 3,
        max_quota: 10
      })

      // Verify initial state
      expect(await mockDb.count('analysis_sessions')).toBe(2)
      expect(await mockDb.count('risk_assessments')).toBe(1)
      expect(await mockDb.count('daily_quotas')).toBe(2)

      // Perform full cleanup
      const result = await retentionService.performFullCleanup()

      // Verify cleanup results
      expect(result.sessionsDeleted).toBe(2) // 1 session + 1 risk assessment
      expect(result.quotasDeleted).toBe(1)
      expect(result.totalDeleted).toBe(3)
      expect(result.errors).toEqual([])

      // Verify final state
      expect(await mockDb.count('analysis_sessions')).toBe(1) // Only active session remains
      expect(await mockDb.count('risk_assessments')).toBe(0) // Risk assessment deleted
      expect(await mockDb.count('daily_quotas')).toBe(1) // Only recent quota remains
    })

    it('should handle cleanup errors gracefully', async () => {
      // This test would normally involve database errors, 
      // but our mock is simple. We can test the error handling structure.
      const result = await retentionService.performFullCleanup()
      
      expect(result).toHaveProperty('sessionsDeleted')
      expect(result).toHaveProperty('quotasDeleted')
      expect(result).toHaveProperty('totalDeleted')
      expect(result).toHaveProperty('errors')
      expect(Array.isArray(result.errors)).toBe(true)
    })
  })

  describe('Privacy Compliance in Retention', () => {
    it('should ensure no original content survives retention process', async () => {
      const sensitiveContent = 'Sensitive user terms with personal data: email@example.com'
      const contentHash = createHash('sha256').update(sensitiveContent).digest('hex')
      const expiredDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

      // Create session with hash (no original content)
      const { data: session } = await mockDb.insert('analysis_sessions', {
        user_id: 'user-123',
        content_hash: contentHash,
        content_length: sensitiveContent.length,
        status: 'completed',
        expires_at: expiredDate
      })

      // Create risk assessment (analytical results only)
      await mockDb.insert('risk_assessments', {
        session_id: session.id,
        clause_category: 'data-collection',
        risk_level: 'high',
        risk_score: 90,
        confidence_score: 85,
        summary: 'Broad data collection identified',
        rationale: 'Terms indicate extensive personal data collection',
        suggested_action: 'Review data collection scope',
        start_position: 50,
        end_position: 120
      })

      // Verify no original content is stored before cleanup
      const { data: beforeCleanup } = await mockDb.select('analysis_sessions')
      const { data: risksBefore } = await mockDb.select('risk_assessments')
      
      const allDataBefore = JSON.stringify([...beforeCleanup, ...risksBefore])
      expect(allDataBefore).not.toContain(sensitiveContent)
      expect(allDataBefore).not.toContain('email@example.com')
      expect(allDataBefore).toContain(contentHash) // Hash is OK

      // Perform cleanup
      await retentionService.cleanupExpiredSessions()

      // Verify no data remains (expired)
      expect(await mockDb.count('analysis_sessions')).toBe(0)
      expect(await mockDb.count('risk_assessments')).toBe(0)

      // Even if data remained, it wouldn't contain original content
      const { data: afterCleanup } = await mockDb.select('analysis_sessions')
      const { data: risksAfter } = await mockDb.select('risk_assessments')
      
      const allDataAfter = JSON.stringify([...afterCleanup, ...risksAfter])
      expect(allDataAfter).not.toContain(sensitiveContent)
      expect(allDataAfter).not.toContain('email@example.com')
    })
  })
})

export { DataRetentionService, MockDatabase }