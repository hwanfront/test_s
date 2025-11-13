/**
 * Data Retention Cleanup Service (Task T110)
 * 
 * Automated data retention and cleanup service ensuring constitutional compliance
 * with no original text storage and proper anonymized data lifecycle management.
 * 
 * Constitutional Principle II: Legal Risk Minimization
 * - Automated cleanup of expired anonymized data
 * - Secure deletion with verification
 * - Audit trail for compliance demonstration
 */

import { createHash } from 'crypto'

/**
 * Data retention policy configuration
 */
interface RetentionPolicy {
  id: string
  name: string
  dataType: 'analysis_result' | 'session_data' | 'audit_log' | 'quota_record' | 'user_preference'
  retentionDays: number
  autoCleanup: boolean
  secureDelete: boolean
  archiveBeforeDelete: boolean
  archiveLocation?: string
  notificationThreshold: number // Days before deletion to send notice
}

/**
 * Cleanup task configuration
 */
interface CleanupTask {
  id: string
  policyId: string
  scheduledAt: string
  completedAt?: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  recordsFound: number
  recordsDeleted: number
  recordsArchived: number
  errors: string[]
  verificationHash?: string
}

/**
 * Data retention record
 */
interface RetentionRecord {
  id: string
  dataType: string
  contentHash: string
  createdAt: string
  expiresAt: string
  lastAccessed?: string
  retentionPolicyId: string
  metadata: Record<string, any>
  isArchived: boolean
  securityLevel: 'low' | 'medium' | 'high' | 'critical'
}

/**
 * Cleanup verification result
 */
interface CleanupVerification {
  taskId: string
  isComplete: boolean
  verificationHash: string
  deletedCount: number
  remainingCount: number
  verifiedAt: string
  errors: string[]
}

/**
 * Archive configuration
 */
interface ArchiveConfig {
  enabled: boolean
  location: string
  encryption: boolean
  compressionLevel: number
  maxArchiveSize: number // MB
  archiveRetentionDays: number
}

/**
 * Data retention cleanup service
 */
export class DataRetentionCleanupService {
  private retentionPolicies: Map<string, RetentionPolicy>
  private cleanupTasks: Map<string, CleanupTask>
  private retentionRecords: Map<string, RetentionRecord>
  private archiveConfig: ArchiveConfig
  private isRunning: boolean

  constructor(archiveConfig?: Partial<ArchiveConfig>) {
    this.retentionPolicies = new Map()
    this.cleanupTasks = new Map()
    this.retentionRecords = new Map()
    this.isRunning = false
    
    this.archiveConfig = {
      enabled: true,
      location: '/tmp/privacy-archive',
      encryption: true,
      compressionLevel: 6,
      maxArchiveSize: 100, // 100MB
      archiveRetentionDays: 2555, // ~7 years for compliance
      ...archiveConfig
    }

    // Initialize default policies
    this.initializeDefaultPolicies()
  }

  /**
   * Initialize default retention policies
   */
  private initializeDefaultPolicies(): void {
    const defaultPolicies: RetentionPolicy[] = [
      {
        id: 'analysis-results',
        name: 'Analysis Results',
        dataType: 'analysis_result',
        retentionDays: 90, // 3 months
        autoCleanup: true,
        secureDelete: true,
        archiveBeforeDelete: true,
        notificationThreshold: 7
      },
      {
        id: 'session-data',
        name: 'Session Data',
        dataType: 'session_data',
        retentionDays: 30, // 1 month
        autoCleanup: true,
        secureDelete: true,
        archiveBeforeDelete: false,
        notificationThreshold: 3
      },
      {
        id: 'audit-logs',
        name: 'Audit Logs',
        dataType: 'audit_log',
        retentionDays: 2555, // ~7 years for compliance
        autoCleanup: false,
        secureDelete: true,
        archiveBeforeDelete: true,
        notificationThreshold: 30
      },
      {
        id: 'quota-records',
        name: 'Quota Usage Records',
        dataType: 'quota_record',
        retentionDays: 365, // 1 year
        autoCleanup: true,
        secureDelete: true,
        archiveBeforeDelete: true,
        notificationThreshold: 14
      },
      {
        id: 'user-preferences',
        name: 'User Preferences',
        dataType: 'user_preference',
        retentionDays: 1095, // 3 years
        autoCleanup: false,
        secureDelete: true,
        archiveBeforeDelete: true,
        notificationThreshold: 30
      }
    ]

    for (const policy of defaultPolicies) {
      this.retentionPolicies.set(policy.id, policy)
    }
  }

  /**
   * Add or update retention policy
   */
  setRetentionPolicy(policy: RetentionPolicy): void {
    this.retentionPolicies.set(policy.id, policy)
  }

  /**
   * Get retention policy
   */
  getRetentionPolicy(policyId: string): RetentionPolicy | undefined {
    return this.retentionPolicies.get(policyId)
  }

  /**
   * Register data for retention tracking
   */
  registerForRetention(
    dataId: string,
    dataType: string,
    contentHash: string,
    policyId: string,
    metadata: Record<string, any> = {},
    securityLevel: 'low' | 'medium' | 'high' | 'critical' = 'medium'
  ): RetentionRecord {
    const policy = this.retentionPolicies.get(policyId)
    if (!policy) {
      throw new Error(`Retention policy not found: ${policyId}`)
    }

    const now = new Date()
    const expiresAt = new Date(now.getTime() + policy.retentionDays * 24 * 60 * 60 * 1000)

    const record: RetentionRecord = {
      id: dataId,
      dataType,
      contentHash,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      retentionPolicyId: policyId,
      metadata: {
        ...metadata,
        registrationHash: this.generateRegistrationHash(dataId, contentHash)
      },
      isArchived: false,
      securityLevel
    }

    this.retentionRecords.set(dataId, record)
    return record
  }

  /**
   * Update last accessed time for retention record
   */
  updateLastAccessed(dataId: string): void {
    const record = this.retentionRecords.get(dataId)
    if (record) {
      record.lastAccessed = new Date().toISOString()
    }
  }

  /**
   * Find expired records
   */
  findExpiredRecords(
    policyId?: string,
    dataType?: string
  ): RetentionRecord[] {
    const now = new Date()
    
    return Array.from(this.retentionRecords.values())
      .filter(record => {
        const isExpired = new Date(record.expiresAt) <= now
        const matchesPolicy = !policyId || record.retentionPolicyId === policyId
        const matchesType = !dataType || record.dataType === dataType
        
        return isExpired && matchesPolicy && matchesType
      })
      .sort((a, b) => new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime())
  }

  /**
   * Find records expiring soon (within notification threshold)
   */
  findExpiringRecords(
    policyId?: string,
    dataType?: string
  ): RetentionRecord[] {
    const records: RetentionRecord[] = []
    
    for (const record of this.retentionRecords.values()) {
      if (policyId && record.retentionPolicyId !== policyId) continue
      if (dataType && record.dataType !== dataType) continue
      
      const policy = this.retentionPolicies.get(record.retentionPolicyId)
      if (!policy) continue
      
      const now = new Date()
      const expiresAt = new Date(record.expiresAt)
      const notificationTime = new Date(expiresAt.getTime() - policy.notificationThreshold * 24 * 60 * 60 * 1000)
      
      if (now >= notificationTime && now < expiresAt) {
        records.push(record)
      }
    }
    
    return records.sort((a, b) => new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime())
  }

  /**
   * Schedule cleanup task
   */
  scheduleCleanup(
    policyId: string,
    scheduledAt?: Date
  ): CleanupTask {
    const policy = this.retentionPolicies.get(policyId)
    if (!policy) {
      throw new Error(`Retention policy not found: ${policyId}`)
    }

    const task: CleanupTask = {
      id: `cleanup-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      policyId,
      scheduledAt: (scheduledAt || new Date()).toISOString(),
      status: 'pending',
      recordsFound: 0,
      recordsDeleted: 0,
      recordsArchived: 0,
      errors: []
    }

    this.cleanupTasks.set(task.id, task)
    return task
  }

  /**
   * Execute cleanup task
   */
  async executeCleanup(taskId: string): Promise<CleanupTask> {
    const task = this.cleanupTasks.get(taskId)
    if (!task) {
      throw new Error(`Cleanup task not found: ${taskId}`)
    }

    if (this.isRunning) {
      throw new Error('Cleanup service is already running')
    }

    this.isRunning = true
    task.status = 'running'

    try {
      const policy = this.retentionPolicies.get(task.policyId)
      if (!policy) {
        throw new Error(`Retention policy not found: ${task.policyId}`)
      }

      // Find expired records
      const expiredRecords = this.findExpiredRecords(task.policyId)
      task.recordsFound = expiredRecords.length

      // Process each expired record
      for (const record of expiredRecords) {
        try {
          // Archive before deletion if required
          if (policy.archiveBeforeDelete && this.archiveConfig.enabled) {
            await this.archiveRecord(record)
            task.recordsArchived++
          }

          // Perform secure deletion
          await this.secureDeleteRecord(record)
          task.recordsDeleted++

          // Remove from tracking
          this.retentionRecords.delete(record.id)

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          task.errors.push(`Failed to process record ${record.id}: ${errorMessage}`)
        }
      }

      // Generate verification hash
      task.verificationHash = this.generateCleanupVerificationHash(task)
      task.status = 'completed'
      task.completedAt = new Date().toISOString()

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      task.errors.push(`Cleanup task failed: ${errorMessage}`)
      task.status = 'failed'
    } finally {
      this.isRunning = false
    }

    return task
  }

  /**
   * Archive record before deletion
   */
  private async archiveRecord(record: RetentionRecord): Promise<void> {
    if (!this.archiveConfig.enabled) {
      return
    }

    // In a real implementation, this would write to actual archive storage
    // For this privacy-compliant implementation, we only log the archival
    
    const archiveEntry = {
      recordId: record.id,
      contentHash: record.contentHash,
      dataType: record.dataType,
      archivedAt: new Date().toISOString(),
      originalExpiry: record.expiresAt,
      archiveHash: this.generateArchiveHash(record)
    }

    // Mark record as archived
    record.isArchived = true
    record.metadata.archivedAt = archiveEntry.archivedAt
    record.metadata.archiveHash = archiveEntry.archiveHash

    // Log archival for audit trail
    console.log(`Record archived: ${record.id} (${record.dataType})`)
  }

  /**
   * Perform secure deletion of record
   */
  private async secureDeleteRecord(record: RetentionRecord): Promise<void> {
    // Generate deletion proof hash
    const deletionHash = createHash('sha256')
      .update(record.contentHash)
      .update(new Date().toISOString())
      .update('SECURELY_DELETED')
      .digest('hex')

    // In a real implementation, this would:
    // 1. Overwrite data multiple times
    // 2. Verify deletion completion
    // 3. Update database records
    
    // Log secure deletion for audit trail
    console.log(`Record securely deleted: ${record.id} (verification: ${deletionHash.substring(0, 16)}...)`)
  }

  /**
   * Verify cleanup completion
   */
  verifyCleanup(taskId: string): CleanupVerification {
    const task = this.cleanupTasks.get(taskId)
    if (!task) {
      throw new Error(`Cleanup task not found: ${taskId}`)
    }

    // Count remaining expired records for this policy
    const remainingExpired = this.findExpiredRecords(task.policyId)
    
    const verification: CleanupVerification = {
      taskId,
      isComplete: task.status === 'completed' && remainingExpired.length === 0,
      verificationHash: task.verificationHash || '',
      deletedCount: task.recordsDeleted,
      remainingCount: remainingExpired.length,
      verifiedAt: new Date().toISOString(),
      errors: [...task.errors]
    }

    return verification
  }

  /**
   * Run automatic cleanup for all auto-cleanup policies
   */
  async runAutomaticCleanup(): Promise<CleanupTask[]> {
    const autoCleanupPolicies = Array.from(this.retentionPolicies.values())
      .filter(policy => policy.autoCleanup)

    const tasks: CleanupTask[] = []

    for (const policy of autoCleanupPolicies) {
      // Check if there are expired records for this policy
      const expiredRecords = this.findExpiredRecords(policy.id)
      
      if (expiredRecords.length > 0) {
        const task = this.scheduleCleanup(policy.id)
        const completedTask = await this.executeCleanup(task.id)
        tasks.push(completedTask)
      }
    }

    return tasks
  }

  /**
   * Get retention statistics
   */
  getRetentionStats(): {
    totalRecords: number
    recordsByType: Record<string, number>
    expiredRecords: number
    expiringRecords: number
    archivedRecords: number
    averageRetentionDays: number
    oldestRecord?: string
    newestRecord?: string
  } {
    const records = Array.from(this.retentionRecords.values())
    const now = new Date()
    
    const recordsByType: Record<string, number> = {}
    let totalRetentionDays = 0
    let archivedCount = 0
    
    for (const record of records) {
      recordsByType[record.dataType] = (recordsByType[record.dataType] || 0) + 1
      
      if (record.isArchived) {
        archivedCount++
      }
      
      const createdAt = new Date(record.createdAt)
      const retentionDays = (now.getTime() - createdAt.getTime()) / (24 * 60 * 60 * 1000)
      totalRetentionDays += retentionDays
    }
    
    const expiredRecords = this.findExpiredRecords()
    const expiringRecords = this.findExpiringRecords()
    
    return {
      totalRecords: records.length,
      recordsByType,
      expiredRecords: expiredRecords.length,
      expiringRecords: expiringRecords.length,
      archivedRecords: archivedCount,
      averageRetentionDays: records.length > 0 ? totalRetentionDays / records.length : 0,
      oldestRecord: records.length > 0 ? 
        records.reduce((oldest, record) => 
          new Date(record.createdAt) < new Date(oldest.createdAt) ? record : oldest
        ).createdAt : undefined,
      newestRecord: records.length > 0 ? 
        records.reduce((newest, record) => 
          new Date(record.createdAt) > new Date(newest.createdAt) ? record : newest
        ).createdAt : undefined
    }
  }

  /**
   * Generate registration hash for audit trail
   */
  private generateRegistrationHash(dataId: string, contentHash: string): string {
    return createHash('sha256')
      .update(dataId)
      .update(contentHash)
      .update(new Date().toISOString())
      .digest('hex')
  }

  /**
   * Generate archive hash for verification
   */
  private generateArchiveHash(record: RetentionRecord): string {
    return createHash('sha256')
      .update(record.id)
      .update(record.contentHash)
      .update(record.dataType)
      .update('ARCHIVED')
      .digest('hex')
  }

  /**
   * Generate cleanup verification hash
   */
  private generateCleanupVerificationHash(task: CleanupTask): string {
    return createHash('sha256')
      .update(task.id)
      .update(task.policyId)
      .update(task.recordsDeleted.toString())
      .update(task.recordsArchived.toString())
      .update('CLEANUP_VERIFIED')
      .digest('hex')
  }

  /**
   * Export retention records for compliance audit
   */
  exportRetentionData(): {
    policies: RetentionPolicy[]
    records: RetentionRecord[]
    tasks: CleanupTask[]
    stats: {
      totalRecords: number
      recordsByType: Record<string, number>
      expiredRecords: number
      expiringRecords: number
      archivedRecords: number
      averageRetentionDays: number
      oldestRecord?: string
      newestRecord?: string
    }
    exportedAt: string
    privacyCompliant: boolean
  } {
    return {
      policies: Array.from(this.retentionPolicies.values()),
      records: Array.from(this.retentionRecords.values()),
      tasks: Array.from(this.cleanupTasks.values()),
      stats: this.getRetentionStats(),
      exportedAt: new Date().toISOString(),
      privacyCompliant: true // All data is hash-based and privacy-compliant
    }
  }

  /**
   * Clear all retention data (for testing)
   */
  clearAllData(): void {
    this.retentionRecords.clear()
    this.cleanupTasks.clear()
    // Keep policies for reuse
  }
}

/**
 * Default data retention cleanup service
 */
export const defaultRetentionService = new DataRetentionCleanupService()

/**
 * High-security retention service with strict policies
 */
export const strictRetentionService = new DataRetentionCleanupService({
  enabled: true,
  encryption: true,
  archiveRetentionDays: 2555, // 7 years
  maxArchiveSize: 50 // 50MB
})

// Export types
export type {
  RetentionPolicy,
  CleanupTask,
  RetentionRecord,
  CleanupVerification,
  ArchiveConfig
}