/**
 * Analysis Session Cleanup Service (Task T110)
 * 
 * Automated cleanup of expired analysis sessions and associated data
 * to maintain database performance and privacy compliance.
 * 
 * Constitutional Principle II: Legal Risk Minimization
 * - Automated removal of expired analysis data
 * - No manual intervention required for data deletion
 * - Compliance with data retention policies
 * 
 * @module shared/lib/cleanup/session-cleanup
 */

// TODO: Import from proper entity path when available
interface AnalysisSession {
  id: string
  userId: string
  contentHash: string
  status: 'processing' | 'completed' | 'failed' | 'expired'
  createdAt: Date
  expiresAt: Date
  completedAt?: Date
}

/**
 * Cleanup operation result
 */
export interface CleanupResult {
  /** Number of sessions cleaned up */
  cleanedSessions: number
  /** Number of risk assessments cleaned up */
  cleanedAssessments: number
  /** Total space freed (estimated bytes) */
  freedSpace: number
  /** Cleanup operation duration */
  duration: number
  /** Cleanup timestamp */
  completedAt: string
  /** Any errors encountered during cleanup */
  errors: string[]
  /** Warnings generated during cleanup */
  warnings: string[]
}

/**
 * Cleanup configuration
 */
export interface CleanupConfig {
  /** Session expiration time in milliseconds (default: 7 days) */
  sessionExpirationMs: number
  /** Maximum sessions to clean in one batch */
  batchSize: number
  /** Enable soft delete vs hard delete */
  enableSoftDelete: boolean
  /** Cleanup operation timeout in milliseconds */
  operationTimeoutMs: number
  /** Enable parallel cleanup operations */
  enableParallelCleanup: boolean
  /** Log cleanup operations for audit */
  enableAuditLogging: boolean
}

/**
 * Cleanup statistics
 */
export interface CleanupStats {
  /** Total cleanups performed */
  totalCleanups: number
  /** Total sessions cleaned */
  totalSessionsCleaned: number
  /** Total assessments cleaned */
  totalAssessmentsCleaned: number
  /** Average cleanup duration */
  averageCleanupDuration: number
  /** Last cleanup timestamp */
  lastCleanup?: string
  /** Next scheduled cleanup */
  nextScheduledCleanup?: string
  /** Database size before/after last cleanup */
  databaseSizeReduction?: {
    before: number
    after: number
    reduction: number
  }
}

/**
 * Session cleanup service
 */
export class AnalysisSessionCleanupService {
  private config: Required<CleanupConfig>
  private cleanupHistory: CleanupResult[]
  private isCleanupRunning: boolean
  private cleanupAbortController?: AbortController

  constructor(config?: Partial<CleanupConfig>) {
    this.config = {
      sessionExpirationMs: 7 * 24 * 60 * 60 * 1000, // 7 days
      batchSize: 100,
      enableSoftDelete: false,
      operationTimeoutMs: 30 * 60 * 1000, // 30 minutes
      enableParallelCleanup: true,
      enableAuditLogging: true,
      ...config
    }
    
    this.cleanupHistory = []
    this.isCleanupRunning = false
  }

  /**
   * Clean up expired analysis sessions
   */
  async cleanupExpiredSessions(): Promise<CleanupResult> {
    if (this.isCleanupRunning) {
      throw new Error('Cleanup operation already in progress')
    }

    this.isCleanupRunning = true
    this.cleanupAbortController = new AbortController()
    
    const startTime = Date.now()
    const result: CleanupResult = {
      cleanedSessions: 0,
      cleanedAssessments: 0,
      freedSpace: 0,
      duration: 0,
      completedAt: '',
      errors: [],
      warnings: []
    }

    try {
      // Set operation timeout
      const timeoutId = setTimeout(() => {
        this.cleanupAbortController?.abort()
        result.errors.push('Cleanup operation timed out')
      }, this.config.operationTimeoutMs)

      // Find expired sessions
      const expiredSessions = await this.findExpiredSessions()
      
      if (expiredSessions.length === 0) {
        result.warnings.push('No expired sessions found for cleanup')
        return result
      }

      // Process sessions in batches
      const batches = this.createBatches(expiredSessions, this.config.batchSize)
      
      if (this.config.enableParallelCleanup) {
        // Parallel batch processing
        const batchPromises = batches.map(batch => 
          this.processBatch(batch, this.cleanupAbortController!.signal)
        )
        
        const batchResults = await Promise.allSettled(batchPromises)
        
        for (const batchResult of batchResults) {
          if (batchResult.status === 'fulfilled') {
            result.cleanedSessions += batchResult.value.cleanedSessions
            result.cleanedAssessments += batchResult.value.cleanedAssessments
            result.freedSpace += batchResult.value.freedSpace
          } else {
            result.errors.push(`Batch cleanup failed: ${batchResult.reason}`)
          }
        }
      } else {
        // Sequential batch processing
        for (const batch of batches) {
          if (this.cleanupAbortController?.signal.aborted) {
            result.warnings.push('Cleanup operation was aborted')
            break
          }
          
          try {
            const batchResult = await this.processBatch(batch, this.cleanupAbortController!.signal)
            result.cleanedSessions += batchResult.cleanedSessions
            result.cleanedAssessments += batchResult.cleanedAssessments
            result.freedSpace += batchResult.freedSpace
          } catch (error) {
            result.errors.push(`Batch cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
          }
        }
      }

      clearTimeout(timeoutId)

    } catch (error) {
      result.errors.push(`Cleanup operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      this.isCleanupRunning = false
      this.cleanupAbortController = undefined
      
      result.duration = Date.now() - startTime
      result.completedAt = new Date().toISOString()
      
      // Record cleanup result
      this.cleanupHistory.push(result)
      
      // Audit logging
      if (this.config.enableAuditLogging) {
        await this.logCleanupOperation(result)
      }
    }

    return result
  }

  /**
   * Clean up specific session and its data
   */
  async cleanupSession(sessionId: string): Promise<{
    success: boolean
    cleanedAssessments: number
    freedSpace: number
    error?: string
  }> {
    try {
      // Get session details before deletion
      const session = await this.getSessionById(sessionId)
      if (!session) {
        return {
          success: false,
          cleanedAssessments: 0,
          freedSpace: 0,
          error: 'Session not found'
        }
      }

      // Calculate space to be freed
      const estimatedSize = this.estimateSessionSize(session)

      // Clean up risk assessments first
      const cleanedAssessments = await this.cleanupSessionAssessments(sessionId)

      // Clean up the session record
      await this.deleteSession(sessionId)

      return {
        success: true,
        cleanedAssessments,
        freedSpace: estimatedSize,
      }

    } catch (error) {
      return {
        success: false,
        cleanedAssessments: 0,
        freedSpace: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Get cleanup statistics
   */
  getCleanupStats(): CleanupStats {
    if (this.cleanupHistory.length === 0) {
      return {
        totalCleanups: 0,
        totalSessionsCleaned: 0,
        totalAssessmentsCleaned: 0,
        averageCleanupDuration: 0
      }
    }

    const totalSessionsCleaned = this.cleanupHistory.reduce(
      (sum, result) => sum + result.cleanedSessions, 0
    )
    
    const totalAssessmentsCleaned = this.cleanupHistory.reduce(
      (sum, result) => sum + result.cleanedAssessments, 0
    )
    
    const totalDuration = this.cleanupHistory.reduce(
      (sum, result) => sum + result.duration, 0
    )

    const lastCleanup = this.cleanupHistory[this.cleanupHistory.length - 1]

    return {
      totalCleanups: this.cleanupHistory.length,
      totalSessionsCleaned,
      totalAssessmentsCleaned,
      averageCleanupDuration: totalDuration / this.cleanupHistory.length,
      lastCleanup: lastCleanup.completedAt,
      nextScheduledCleanup: this.calculateNextCleanup()
    }
  }

  /**
   * Check if cleanup is needed
   */
  async isCleanupNeeded(): Promise<{
    needsCleanup: boolean
    expiredSessionCount: number
    estimatedSpaceSavings: number
    recommendedAction: 'immediate' | 'scheduled' | 'none'
  }> {
    try {
      const expiredSessions = await this.findExpiredSessions()
      const estimatedSpaceSavings = expiredSessions.reduce(
        (total, session) => total + this.estimateSessionSize(session), 0
      )

      let recommendedAction: 'immediate' | 'scheduled' | 'none' = 'none'
      
      if (expiredSessions.length > 1000) {
        recommendedAction = 'immediate'
      } else if (expiredSessions.length > 100) {
        recommendedAction = 'scheduled'
      }

      return {
        needsCleanup: expiredSessions.length > 0,
        expiredSessionCount: expiredSessions.length,
        estimatedSpaceSavings,
        recommendedAction
      }

    } catch (error) {
      throw new Error(`Failed to check cleanup needs: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Abort running cleanup operation
   */
  abortCleanup(): boolean {
    if (this.isCleanupRunning && this.cleanupAbortController) {
      this.cleanupAbortController.abort()
      return true
    }
    return false
  }

  /**
   * Validate cleanup configuration
   */
  validateConfig(): {
    isValid: boolean
    errors: string[]
    warnings: string[]
  } {
    const errors: string[] = []
    const warnings: string[] = []

    if (this.config.sessionExpirationMs < 24 * 60 * 60 * 1000) {
      warnings.push('Session expiration time is less than 24 hours')
    }

    if (this.config.batchSize > 1000) {
      warnings.push('Large batch size may impact database performance')
    }

    if (this.config.operationTimeoutMs < 60 * 1000) {
      errors.push('Operation timeout is too short (minimum 1 minute)')
    }

    if (this.config.batchSize <= 0) {
      errors.push('Batch size must be positive')
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  /**
   * Find expired analysis sessions
   */
  private async findExpiredSessions(): Promise<AnalysisSession[]> {
    // TODO: Implement actual database query
    // This would query the database for sessions where expires_at < NOW()
    
    // Placeholder implementation
    const now = new Date()
    const mockExpiredSessions: AnalysisSession[] = []
    
    // In real implementation:
    // const query = `
    //   SELECT * FROM analysis_sessions 
    //   WHERE expires_at < $1 
    //   ORDER BY expires_at ASC 
    //   LIMIT $2
    // `
    // return await database.query(query, [now, this.config.batchSize * 10])
    
    return mockExpiredSessions
  }

  /**
   * Create batches from session list
   */
  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = []
    
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize))
    }
    
    return batches
  }

  /**
   * Process a batch of sessions for cleanup
   */
  private async processBatch(
    sessions: AnalysisSession[], 
    abortSignal: AbortSignal
  ): Promise<{
    cleanedSessions: number
    cleanedAssessments: number
    freedSpace: number
  }> {
    let cleanedSessions = 0
    let cleanedAssessments = 0
    let freedSpace = 0

    for (const session of sessions) {
      if (abortSignal.aborted) {
        break
      }

      try {
        // Estimate size before deletion
        const sessionSize = this.estimateSessionSize(session)

        // Clean up risk assessments
        const assessmentCount = await this.cleanupSessionAssessments(session.id)

        // Delete the session
        await this.deleteSession(session.id)

        cleanedSessions++
        cleanedAssessments += assessmentCount
        freedSpace += sessionSize

      } catch (error) {
        // Log error but continue with batch
        console.error(`Failed to cleanup session ${session.id}:`, error)
      }
    }

    return {
      cleanedSessions,
      cleanedAssessments,
      freedSpace
    }
  }

  /**
   * Clean up risk assessments for a session
   */
  private async cleanupSessionAssessments(sessionId: string): Promise<number> {
    // TODO: Implement actual database cleanup
    // This would delete all risk_assessments where session_id = sessionId
    
    // Placeholder implementation
    // const query = `DELETE FROM risk_assessments WHERE session_id = $1`
    // const result = await database.query(query, [sessionId])
    // return result.rowCount || 0
    
    return 0
  }

  /**
   * Delete analysis session
   */
  private async deleteSession(sessionId: string): Promise<void> {
    // TODO: Implement actual database deletion
    // This would delete the session record from analysis_sessions table
    
    if (this.config.enableSoftDelete) {
      // Soft delete: mark as deleted instead of removing
      // const query = `UPDATE analysis_sessions SET deleted_at = NOW() WHERE id = $1`
      // await database.query(query, [sessionId])
    } else {
      // Hard delete: remove from database
      // const query = `DELETE FROM analysis_sessions WHERE id = $1`
      // await database.query(query, [sessionId])
    }
  }

  /**
   * Get session by ID
   */
  private async getSessionById(sessionId: string): Promise<AnalysisSession | null> {
    // TODO: Implement actual database query
    // const query = `SELECT * FROM analysis_sessions WHERE id = $1`
    // const result = await database.query(query, [sessionId])
    // return result.rows[0] || null
    
    return null
  }

  /**
   * Estimate storage size of a session
   */
  private estimateSessionSize(session: AnalysisSession): number {
    // Rough estimate based on typical session data size
    const baseSessionSize = 500 // bytes for session metadata
    const assessmentSize = 1000 // bytes per risk assessment (estimated)
    const estimatedAssessments = 5 // average number of assessments per session
    
    return baseSessionSize + (assessmentSize * estimatedAssessments)
  }

  /**
   * Calculate next cleanup time
   */
  private calculateNextCleanup(): string {
    // Schedule next cleanup for tomorrow at 2 AM
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(2, 0, 0, 0)
    
    return tomorrow.toISOString()
  }

  /**
   * Log cleanup operation for audit
   */
  private async logCleanupOperation(result: CleanupResult): Promise<void> {
    // TODO: Integrate with audit logging system
    const logEntry = {
      timestamp: result.completedAt,
      operation: 'session_cleanup',
      result: {
        sessionsDeleted: result.cleanedSessions,
        assessmentsDeleted: result.cleanedAssessments,
        spaceFree: result.freedSpace,
        duration: result.duration,
        errors: result.errors.length,
        warnings: result.warnings.length
      }
    }

    // Log to audit system
    console.info('Session cleanup completed:', logEntry)
  }

  /**
   * Get recent cleanup history
   */
  getCleanupHistory(limit: number = 10): CleanupResult[] {
    return this.cleanupHistory
      .slice(-limit)
      .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
  }

  /**
   * Clear cleanup history
   */
  clearHistory(): void {
    this.cleanupHistory = []
  }
}

/**
 * Default session cleanup service instance
 */
export const defaultSessionCleanup = new AnalysisSessionCleanupService()

/**
 * Create cleanup service with custom configuration
 */
export function createSessionCleanupService(config?: Partial<CleanupConfig>): AnalysisSessionCleanupService {
  return new AnalysisSessionCleanupService(config)
}

/**
 * Utility function for immediate cleanup
 */
export async function cleanupExpiredSessions(): Promise<CleanupResult> {
  return defaultSessionCleanup.cleanupExpiredSessions()
}

/**
 * Utility function to check if cleanup is needed
 */
export async function checkCleanupNeeds(): Promise<{
  needsCleanup: boolean
  expiredSessionCount: number
  estimatedSpaceSavings: number
}> {
  const result = await defaultSessionCleanup.isCleanupNeeded()
  return {
    needsCleanup: result.needsCleanup,
    expiredSessionCount: result.expiredSessionCount,
    estimatedSpaceSavings: result.estimatedSpaceSavings
  }
}

// Export types
export type {
  CleanupResult as SessionCleanupResult,
  CleanupConfig as SessionCleanupConfig,
  CleanupStats as SessionCleanupStats
}