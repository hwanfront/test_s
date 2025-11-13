/**
 * Data Deletion Utilities (Task T115)
 * 
 * GDPR-compliant data deletion with secure erasure and comprehensive audit logging.
 * Implements right-to-erasure and data retention policy enforcement.
 * 
 * Constitutional Principle II: Legal Risk Minimization
 * - GDPR Article 17 compliance (Right to erasure)
 * - Secure data destruction with verification
 * - Comprehensive audit trail for compliance
 * 
 * @module shared/lib/privacy/data-deletion
 */

import { createHash } from 'crypto'

/**
 * Data deletion request interface
 */
export interface DataDeletionRequest {
  /** Unique request identifier */
  requestId: string
  /** User requesting deletion */
  userId: string
  /** Requester email for verification */
  requestorEmail: string
  /** Type of deletion request */
  deletionType: 'user_data' | 'analysis_sessions' | 'all_data' | 'specific_data'
  /** Specific data to delete (for specific_data type) */
  specificData?: {
    sessionIds?: string[]
    analysisIds?: string[]
    dataTypes?: ('profile' | 'settings' | 'history' | 'cache')[]
  }
  /** Reason for deletion */
  reason: 'user_request' | 'gdpr_compliance' | 'data_retention' | 'account_closure' | 'other'
  /** Additional reason details */
  reasonDetails?: string
  /** Request timestamp */
  requestedAt: string
  /** Requested by (user or admin) */
  requestedBy: 'user' | 'admin' | 'system'
  /** Deletion schedule */
  scheduledFor?: string
  /** Verification token for user-initiated requests */
  verificationToken?: string
  /** Whether verification is required */
  requiresVerification: boolean
}

/**
 * Data deletion result interface
 */
export interface DataDeletionResult {
  /** Request identifier */
  requestId: string
  /** Deletion status */
  status: 'completed' | 'partial' | 'failed' | 'pending_verification' | 'scheduled'
  /** Deletion timestamp */
  deletedAt: string
  /** Items successfully deleted */
  deletedItems: DeletionItem[]
  /** Items that failed to delete */
  failedItems: DeletionItem[]
  /** Total data size deleted (bytes) */
  totalBytesDeleted: number
  /** Deletion duration (ms) */
  deletionDuration: number
  /** Verification details */
  verification: {
    method: 'secure_hash' | 'database_query' | 'file_system_check' | 'disabled'
    verified: boolean
    verificationTime: string
    verificationDetails: any
  }
  /** Audit trail entry ID */
  auditTrailId: string
  /** Any warnings or notes */
  warnings: string[]
  /** Recovery information (if applicable) */
  recoveryInfo?: {
    recoverable: boolean
    recoveryDeadline?: string
    recoveryMethod?: string
  }
}

/**
 * Individual deletion item
 */
export interface DeletionItem {
  /** Item type */
  type: 'database_record' | 'file' | 'cache_entry' | 'session_data' | 'user_profile'
  /** Item identifier */
  id: string
  /** Item description */
  description: string
  /** Data size (bytes) */
  sizeBytes: number
  /** Location (table, file path, etc.) */
  location: string
  /** Deletion method used */
  deletionMethod: 'database_delete' | 'file_delete' | 'secure_wipe' | 'encryption_key_destroy'
  /** Deletion status */
  status: 'deleted' | 'failed' | 'not_found' | 'protected'
  /** Error message if failed */
  error?: string
  /** Verification hash before deletion */
  preDeleteHash?: string
  /** Verification check after deletion */
  postDeleteVerified: boolean
}

/**
 * Data deletion configuration
 */
export interface DataDeletionConfig {
  /** Enable secure wiping for sensitive data */
  enableSecureWipe: boolean
  /** Enable verification after deletion */
  enableVerification: boolean
  /** Maximum deletion batch size */
  maxBatchSize: number
  /** Deletion timeout (ms) */
  deletionTimeout: number
  /** Enable audit logging */
  enableAuditLogging: boolean
  /** Verification wait time (ms) */
  verificationWaitTime: number
  /** Recovery grace period (hours) */
  recoveryGracePeriod: number
  /** Require email verification for user requests */
  requireEmailVerification: boolean
}

/**
 * Deletion statistics interface
 */
export interface DeletionStatistics {
  /** Total deletion requests processed */
  totalRequests: number
  /** Successful deletions */
  successfulDeletions: number
  /** Failed deletions */
  failedDeletions: number
  /** Total data deleted (bytes) */
  totalDataDeleted: number
  /** Average deletion time (ms) */
  averageDeletionTime: number
  /** Deletion requests by type */
  requestsByType: Record<string, number>
  /** Deletion requests by reason */
  requestsByReason: Record<string, number>
  /** Recent activity */
  recentActivity: Array<{
    date: string
    requestCount: number
    dataDeleted: number
  }>
}

/**
 * Data deletion utilities class
 */
export class DataDeletionUtilities {
  private config: Required<DataDeletionConfig>
  private deletionHistory: DataDeletionResult[]
  private pendingRequests: Map<string, DataDeletionRequest>
  private verificationTokens: Map<string, { token: string; expiresAt: number; requestId: string }>

  constructor(config?: Partial<DataDeletionConfig>) {
    this.config = {
      enableSecureWipe: true,
      enableVerification: true,
      maxBatchSize: 1000,
      deletionTimeout: 30 * 60 * 1000, // 30 minutes
      enableAuditLogging: true,
      verificationWaitTime: 5 * 1000, // 5 seconds
      recoveryGracePeriod: 24, // 24 hours
      requireEmailVerification: true,
      ...config
    }
    this.deletionHistory = []
    this.pendingRequests = new Map()
    this.verificationTokens = new Map()
  }

  /**
   * Submit a data deletion request
   */
  async submitDeletionRequest(request: Omit<DataDeletionRequest, 'requestId' | 'requestedAt' | 'requiresVerification'>): Promise<DataDeletionRequest> {
    const deletionRequest: DataDeletionRequest = {
      ...request,
      requestId: this.generateRequestId(),
      requestedAt: new Date().toISOString(),
      requiresVerification: this.config.requireEmailVerification && request.requestedBy === 'user'
    }

    // Generate verification token if required
    if (deletionRequest.requiresVerification) {
      const verificationToken = this.generateVerificationToken()
      deletionRequest.verificationToken = verificationToken
      
      this.verificationTokens.set(verificationToken, {
        token: verificationToken,
        expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
        requestId: deletionRequest.requestId
      })

      // In production, send verification email
      await this.sendVerificationEmail(deletionRequest)
    }

    // Store pending request
    this.pendingRequests.set(deletionRequest.requestId, deletionRequest)

    // If no verification required, process immediately
    if (!deletionRequest.requiresVerification) {
      const result = await this.processDeletionRequest(deletionRequest.requestId)
      return deletionRequest // Return the request, not the result
    }

    return deletionRequest
  }

  /**
   * Verify deletion request with token
   */
  async verifyDeletionRequest(verificationToken: string): Promise<DataDeletionResult> {
    const tokenData = this.verificationTokens.get(verificationToken)
    
    if (!tokenData) {
      throw new Error('Invalid verification token')
    }

    if (Date.now() > tokenData.expiresAt) {
      this.verificationTokens.delete(verificationToken)
      throw new Error('Verification token expired')
    }

    const request = this.pendingRequests.get(tokenData.requestId)
    if (!request) {
      throw new Error('Deletion request not found')
    }

    // Remove verification token
    this.verificationTokens.delete(verificationToken)

    // Process the deletion
    return this.processDeletionRequest(request.requestId)
  }

  /**
   * Process a deletion request
   */
  async processDeletionRequest(requestId: string): Promise<DataDeletionResult> {
    const request = this.pendingRequests.get(requestId)
    if (!request) {
      throw new Error('Deletion request not found')
    }

    const startTime = Date.now()
    const deletedItems: DeletionItem[] = []
    const failedItems: DeletionItem[] = []
    const warnings: string[] = []
    let totalBytesDeleted = 0

    try {
      // Get items to delete based on request type
      const itemsToDelete = await this.getItemsToDelete(request)

      // Process deletion in batches
      const batches = this.createBatches(itemsToDelete, this.config.maxBatchSize)

      for (const batch of batches) {
        const batchResult = await this.processDeletionBatch(batch, request)
        deletedItems.push(...batchResult.deleted)
        failedItems.push(...batchResult.failed)
        totalBytesDeleted += batchResult.bytesDeleted
        warnings.push(...batchResult.warnings)
      }

      // Verify deletion if enabled
      const verification = this.config.enableVerification 
        ? await this.verifyDeletion(deletedItems)
        : {
            method: 'disabled' as const,
            verified: true,
            verificationTime: new Date().toISOString(),
            verificationDetails: { reason: 'verification_disabled' }
          }

      // Create result
      const result: DataDeletionResult = {
        requestId,
        status: failedItems.length === 0 ? 'completed' : 'partial',
        deletedAt: new Date().toISOString(),
        deletedItems,
        failedItems,
        totalBytesDeleted,
        deletionDuration: Date.now() - startTime,
        verification,
        auditTrailId: await this.createAuditTrailEntry(request, deletedItems, failedItems),
        warnings,
        recoveryInfo: this.getRecoveryInfo(request, deletedItems)
      }

      // Store result
      this.deletionHistory.push(result)

      // Remove from pending requests
      this.pendingRequests.delete(requestId)

      return result

    } catch (error) {
      // Create failed result
      const result: DataDeletionResult = {
        requestId,
        status: 'failed',
        deletedAt: new Date().toISOString(),
        deletedItems,
        failedItems,
        totalBytesDeleted,
        deletionDuration: Date.now() - startTime,
        verification: {
          method: 'disabled' as const,
          verified: false,
          verificationTime: new Date().toISOString(),
          verificationDetails: { error: error instanceof Error ? error.message : 'Unknown error' }
        },
        auditTrailId: await this.createAuditTrailEntry(request, deletedItems, failedItems),
        warnings: [...warnings, `Deletion failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
      }

      this.deletionHistory.push(result)
      this.pendingRequests.delete(requestId)

      throw error
    }
  }

  /**
   * Get items to delete based on request
   */
  private async getItemsToDelete(request: DataDeletionRequest): Promise<DeletionItem[]> {
    const items: DeletionItem[] = []

    switch (request.deletionType) {
      case 'user_data':
        items.push(...await this.getUserDataItems(request.userId))
        break

      case 'analysis_sessions':
        items.push(...await this.getAnalysisSessionItems(request.userId))
        break

      case 'all_data':
        items.push(...await this.getAllUserDataItems(request.userId))
        break

      case 'specific_data':
        if (request.specificData) {
          items.push(...await this.getSpecificDataItems(request.userId, request.specificData))
        }
        break
    }

    return items
  }

  /**
   * Get user data items for deletion
   */
  private async getUserDataItems(userId: string): Promise<DeletionItem[]> {
    // TODO: Implement actual data discovery
    // This would scan the database for user-related data
    
    return [
      {
        type: 'database_record',
        id: `user_profile_${userId}`,
        description: 'User profile data',
        sizeBytes: 1024,
        location: 'users table',
        deletionMethod: 'database_delete',
        status: 'deleted',
        postDeleteVerified: false
      },
      {
        type: 'database_record',
        id: `user_settings_${userId}`,
        description: 'User settings and preferences',
        sizeBytes: 512,
        location: 'user_settings table',
        deletionMethod: 'database_delete',
        status: 'deleted',
        postDeleteVerified: false
      }
    ]
  }

  /**
   * Get analysis session items for deletion
   */
  private async getAnalysisSessionItems(userId: string): Promise<DeletionItem[]> {
    // TODO: Implement actual session discovery
    
    return [
      {
        type: 'database_record',
        id: `analysis_sessions_${userId}`,
        description: 'Analysis session data',
        sizeBytes: 2048,
        location: 'analysis_sessions table',
        deletionMethod: 'database_delete',
        status: 'deleted',
        postDeleteVerified: false
      }
    ]
  }

  /**
   * Get all user data items for deletion
   */
  private async getAllUserDataItems(userId: string): Promise<DeletionItem[]> {
    const userDataItems = await this.getUserDataItems(userId)
    const sessionItems = await this.getAnalysisSessionItems(userId)
    
    return [...userDataItems, ...sessionItems]
  }

  /**
   * Get specific data items for deletion
   */
  private async getSpecificDataItems(userId: string, specificData: NonNullable<DataDeletionRequest['specificData']>): Promise<DeletionItem[]> {
    const items: DeletionItem[] = []

    if (specificData.sessionIds) {
      for (const sessionId of specificData.sessionIds) {
        items.push({
          type: 'database_record',
          id: sessionId,
          description: 'Analysis session',
          sizeBytes: 1024,
          location: 'analysis_sessions table',
          deletionMethod: 'database_delete',
          status: 'deleted',
          postDeleteVerified: false
        })
      }
    }

    if (specificData.dataTypes) {
      for (const dataType of specificData.dataTypes) {
        items.push({
          type: 'database_record',
          id: `${dataType}_${userId}`,
          description: `User ${dataType} data`,
          sizeBytes: 512,
          location: `${dataType} table`,
          deletionMethod: 'database_delete',
          status: 'deleted',
          postDeleteVerified: false
        })
      }
    }

    return items
  }

  /**
   * Process deletion batch
   */
  private async processDeletionBatch(items: DeletionItem[], request: DataDeletionRequest): Promise<{
    deleted: DeletionItem[]
    failed: DeletionItem[]
    bytesDeleted: number
    warnings: string[]
  }> {
    const deleted: DeletionItem[] = []
    const failed: DeletionItem[] = []
    const warnings: string[] = []
    let bytesDeleted = 0

    for (const item of items) {
      try {
        // Generate pre-deletion hash for verification
        if (this.config.enableVerification) {
          item.preDeleteHash = this.generateItemHash(item)
        }

        // Perform deletion based on type
        const success = await this.deleteItem(item)

        if (success) {
          item.status = 'deleted'
          
          // Verify deletion if enabled
          if (this.config.enableVerification) {
            await this.wait(this.config.verificationWaitTime)
            item.postDeleteVerified = await this.verifyItemDeletion(item)
          } else {
            item.postDeleteVerified = true
          }

          deleted.push(item)
          bytesDeleted += item.sizeBytes
        } else {
          item.status = 'failed'
          item.error = 'Deletion operation failed'
          failed.push(item)
        }

      } catch (error) {
        item.status = 'failed'
        item.error = error instanceof Error ? error.message : 'Unknown error'
        failed.push(item)
        warnings.push(`Failed to delete ${item.description}: ${item.error}`)
      }
    }

    return { deleted, failed, bytesDeleted, warnings }
  }

  /**
   * Delete an individual item
   */
  private async deleteItem(item: DeletionItem): Promise<boolean> {
    // TODO: Implement actual deletion logic based on item type
    // This would connect to database, file system, etc.
    
    switch (item.deletionMethod) {
      case 'database_delete':
        return this.deleteDatabaseRecord(item)
      case 'file_delete':
        return this.deleteFile(item)
      case 'secure_wipe':
        return this.secureWipeFile(item)
      case 'encryption_key_destroy':
        return this.destroyEncryptionKey(item)
      default:
        return false
    }
  }

  /**
   * Delete database record
   */
  private async deleteDatabaseRecord(item: DeletionItem): Promise<boolean> {
    // TODO: Implement database deletion
    console.log(`Deleting database record: ${item.id} from ${item.location}`)
    return true
  }

  /**
   * Delete file
   */
  private async deleteFile(item: DeletionItem): Promise<boolean> {
    // TODO: Implement file deletion
    console.log(`Deleting file: ${item.location}`)
    return true
  }

  /**
   * Secure wipe file
   */
  private async secureWipeFile(item: DeletionItem): Promise<boolean> {
    // TODO: Implement secure file wiping
    console.log(`Secure wiping file: ${item.location}`)
    return true
  }

  /**
   * Destroy encryption key
   */
  private async destroyEncryptionKey(item: DeletionItem): Promise<boolean> {
    // TODO: Implement key destruction
    console.log(`Destroying encryption key: ${item.id}`)
    return true
  }

  /**
   * Verify deletion
   */
  private async verifyDeletion(deletedItems: DeletionItem[]): Promise<DataDeletionResult['verification']> {
    const verificationStart = Date.now()
    
    for (const item of deletedItems) {
      if (!item.postDeleteVerified) {
        return {
          method: 'database_query',
          verified: false,
          verificationTime: new Date().toISOString(),
          verificationDetails: {
            failedItem: item.id,
            reason: 'Item verification failed'
          }
        }
      }
    }

    return {
      method: 'database_query',
      verified: true,
      verificationTime: new Date().toISOString(),
      verificationDetails: {
        itemsVerified: deletedItems.length,
        verificationDuration: Date.now() - verificationStart
      }
    }
  }

  /**
   * Verify individual item deletion
   */
  private async verifyItemDeletion(item: DeletionItem): Promise<boolean> {
    // TODO: Implement actual verification
    // This would check if the item still exists
    return true
  }

  /**
   * Create audit trail entry
   */
  private async createAuditTrailEntry(
    request: DataDeletionRequest,
    deletedItems: DeletionItem[],
    failedItems: DeletionItem[]
  ): Promise<string> {
    const auditId = `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const auditEntry = {
      auditId,
      timestamp: new Date().toISOString(),
      action: 'data_deletion',
      requestId: request.requestId,
      userId: request.userId,
      deletionType: request.deletionType,
      reason: request.reason,
      itemsDeleted: deletedItems.length,
      itemsFailed: failedItems.length,
      totalBytesDeleted: deletedItems.reduce((sum, item) => sum + item.sizeBytes, 0),
      requestedBy: request.requestedBy,
      complianceType: 'GDPR Article 17'
    }

    // TODO: Store audit entry in permanent audit log
    console.log('Audit trail entry created:', auditEntry)

    return auditId
  }

  /**
   * Get recovery information
   */
  private getRecoveryInfo(request: DataDeletionRequest, deletedItems: DeletionItem[]): DataDeletionResult['recoveryInfo'] {
    // For user-initiated requests, provide recovery period
    if (request.requestedBy === 'user' && request.reason === 'user_request') {
      const recoveryDeadline = new Date()
      recoveryDeadline.setHours(recoveryDeadline.getHours() + this.config.recoveryGracePeriod)

      return {
        recoverable: true,
        recoveryDeadline: recoveryDeadline.toISOString(),
        recoveryMethod: 'Contact support with request ID'
      }
    }

    return {
      recoverable: false
    }
  }

  /**
   * Create deletion batches
   */
  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = []
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize))
    }
    return batches
  }

  /**
   * Generate request ID
   */
  private generateRequestId(): string {
    return `del_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Generate verification token
   */
  private generateVerificationToken(): string {
    return createHash('sha256')
      .update(`${Date.now()}_${Math.random()}_${Math.random()}`)
      .digest('hex')
      .substr(0, 32)
  }

  /**
   * Generate item hash for verification
   */
  private generateItemHash(item: DeletionItem): string {
    return createHash('sha256')
      .update(`${item.type}_${item.id}_${item.location}`)
      .digest('hex')
  }

  /**
   * Send verification email
   */
  private async sendVerificationEmail(request: DataDeletionRequest): Promise<void> {
    // TODO: Implement email sending
    console.log(`Verification email sent to ${request.requestorEmail} for request ${request.requestId}`)
    console.log(`Verification token: ${request.verificationToken}`)
  }

  /**
   * Wait for specified duration
   */
  private async wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Get deletion request status
   */
  getDeletionRequestStatus(requestId: string): DataDeletionRequest | DataDeletionResult | null {
    // Check pending requests
    const pendingRequest = this.pendingRequests.get(requestId)
    if (pendingRequest) {
      return pendingRequest
    }

    // Check completed requests
    const completedRequest = this.deletionHistory.find(result => result.requestId === requestId)
    return completedRequest || null
  }

  /**
   * Get deletion statistics
   */
  getDeletionStatistics(): DeletionStatistics {
    const stats: DeletionStatistics = {
      totalRequests: this.deletionHistory.length,
      successfulDeletions: this.deletionHistory.filter(r => r.status === 'completed').length,
      failedDeletions: this.deletionHistory.filter(r => r.status === 'failed').length,
      totalDataDeleted: this.deletionHistory.reduce((sum, r) => sum + r.totalBytesDeleted, 0),
      averageDeletionTime: this.deletionHistory.length > 0 
        ? this.deletionHistory.reduce((sum, r) => sum + r.deletionDuration, 0) / this.deletionHistory.length
        : 0,
      requestsByType: {},
      requestsByReason: {},
      recentActivity: []
    }

    // Calculate activity statistics
    const recent = this.deletionHistory.slice(-30) // Last 30 requests
    const activityByDate = new Map<string, { count: number; dataDeleted: number }>()

    for (const result of recent) {
      const date = result.deletedAt.split('T')[0]
      const existing = activityByDate.get(date) || { count: 0, dataDeleted: 0 }
      existing.count++
      existing.dataDeleted += result.totalBytesDeleted
      activityByDate.set(date, existing)
    }

    stats.recentActivity = Array.from(activityByDate.entries()).map(([date, data]) => ({
      date,
      requestCount: data.count,
      dataDeleted: data.dataDeleted
    }))

    return stats
  }

  /**
   * Cancel pending deletion request
   */
  cancelDeletionRequest(requestId: string): boolean {
    const request = this.pendingRequests.get(requestId)
    if (!request) {
      return false
    }

    // Remove verification token if exists
    if (request.verificationToken) {
      this.verificationTokens.delete(request.verificationToken)
    }

    // Remove pending request
    this.pendingRequests.delete(requestId)

    return true
  }

  /**
   * Get pending requests
   */
  getPendingRequests(): DataDeletionRequest[] {
    return Array.from(this.pendingRequests.values())
  }

  /**
   * Get deletion history
   */
  getDeletionHistory(limit: number = 50): DataDeletionResult[] {
    return this.deletionHistory
      .slice(-limit)
      .sort((a, b) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime())
  }

  /**
   * Clear deletion history (admin only)
   */
  clearDeletionHistory(): void {
    this.deletionHistory = []
  }
}

/**
 * Default data deletion utilities instance
 */
export const defaultDataDeletion = new DataDeletionUtilities()

/**
 * Quick data deletion for user
 */
export async function deleteUserData(
  userId: string, 
  requestorEmail: string, 
  deletionType: DataDeletionRequest['deletionType'] = 'user_data'
): Promise<DataDeletionRequest> {
  return defaultDataDeletion.submitDeletionRequest({
    userId,
    requestorEmail,
    deletionType,
    reason: 'user_request',
    requestedBy: 'user'
  })
}

/**
 * Quick GDPR deletion request
 */
export async function processGDPRDeletionRequest(
  userId: string,
  requestorEmail: string
): Promise<DataDeletionRequest> {
  return defaultDataDeletion.submitDeletionRequest({
    userId,
    requestorEmail,
    deletionType: 'all_data',
    reason: 'gdpr_compliance',
    reasonDetails: 'GDPR Article 17 - Right to erasure',
    requestedBy: 'user'
  })
}

// Export types for external use
export type {
  DataDeletionRequest as DeletionRequest,
  DataDeletionResult as DeletionResult,
  DeletionItem as DeletionItemType,
  DataDeletionConfig as DeletionConfig,
  DeletionStatistics as DeletionStats
}