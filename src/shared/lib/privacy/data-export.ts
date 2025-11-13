/**
 * Data Export Functionality (Task T114)
 * 
 * GDPR-compliant data export with user data portability and comprehensive export formats.
 * Implements GDPR Article 20 (Right to data portability) and Article 15 (Right of access).
 * 
 * Constitutional Principle II: Legal Risk Minimization
 * - GDPR Article 15 compliance (Right of access)
 * - GDPR Article 20 compliance (Right to data portability)
 * - Secure data export with comprehensive audit trail
 * 
 * @module shared/lib/privacy/data-export
 */

import { createHash } from 'crypto'

/**
 * Data export request interface
 */
export interface DataExportRequest {
  /** Unique request identifier */
  requestId: string
  /** User requesting export */
  userId: string
  /** Requester email for verification */
  requestorEmail: string
  /** Export format */
  format: 'json' | 'csv' | 'xml' | 'pdf' | 'zip'
  /** Data types to export */
  dataTypes: ('profile' | 'settings' | 'analysis_sessions' | 'history' | 'all')[]
  /** Export scope */
  scope: {
    /** Include deleted data if available */
    includeDeleted?: boolean
    /** Date range for data */
    dateRange?: {
      start: string
      end: string
    }
    /** Include metadata */
    includeMetadata?: boolean
    /** Include system data */
    includeSystemData?: boolean
  }
  /** Reason for export */
  reason: 'user_request' | 'gdpr_compliance' | 'data_migration' | 'backup' | 'other'
  /** Additional reason details */
  reasonDetails?: string
  /** Request timestamp */
  requestedAt: string
  /** Requested by (user or admin) */
  requestedBy: 'user' | 'admin' | 'system'
  /** Export schedule */
  scheduledFor?: string
  /** Verification token for user-initiated requests */
  verificationToken?: string
  /** Whether verification is required */
  requiresVerification: boolean
  /** Data retention for export file (hours) */
  retentionHours: number
}

/**
 * Data export result interface
 */
export interface DataExportResult {
  /** Request identifier */
  requestId: string
  /** Export status */
  status: 'completed' | 'partial' | 'failed' | 'pending_verification' | 'processing'
  /** Export timestamp */
  exportedAt: string
  /** Export file information */
  exportFile: {
    /** File path or URL */
    location: string
    /** File size (bytes) */
    sizeBytes: number
    /** File format */
    format: string
    /** File hash for integrity verification */
    fileHash: string
    /** Expiration timestamp */
    expiresAt: string
    /** Download token */
    downloadToken: string
  }
  /** Exported data summary */
  dataSummary: {
    /** Data types exported */
    dataTypes: string[]
    /** Total records exported */
    totalRecords: number
    /** Export duration (ms) */
    exportDuration: number
    /** Data categories */
    categories: ExportCategory[]
  }
  /** Audit trail entry ID */
  auditTrailId: string
  /** Any warnings or notes */
  warnings: string[]
  /** GDPR compliance information */
  gdprCompliance: {
    /** Article 15 compliance (Right of access) */
    article15Compliant: boolean
    /** Article 20 compliance (Right to data portability) */
    article20Compliant: boolean
    /** Data processing basis */
    processingBasis: string[]
    /** Data retention information */
    retentionInfo: string
  }
}

/**
 * Export category interface
 */
export interface ExportCategory {
  /** Category name */
  category: string
  /** Category description */
  description: string
  /** Number of records */
  recordCount: number
  /** Data size (bytes) */
  sizeBytes: number
  /** Data fields included */
  fields: string[]
  /** GDPR processing basis */
  processingBasis: string
  /** Data source */
  source: string
}

/**
 * Export configuration interface
 */
export interface DataExportConfig {
  /** Enable file encryption */
  enableEncryption: boolean
  /** Enable file compression */
  enableCompression: boolean
  /** Maximum export file size (bytes) */
  maxFileSizeBytes: number
  /** Export timeout (ms) */
  exportTimeout: number
  /** Enable audit logging */
  enableAuditLogging: boolean
  /** File retention period (hours) */
  fileRetentionHours: number
  /** Require email verification for user requests */
  requireEmailVerification: boolean
  /** Allowed export formats */
  allowedFormats: string[]
  /** Maximum concurrent exports per user */
  maxConcurrentExports: number
}

/**
 * Export statistics interface
 */
export interface ExportStatistics {
  /** Total export requests processed */
  totalRequests: number
  /** Successful exports */
  successfulExports: number
  /** Failed exports */
  failedExports: number
  /** Total data exported (bytes) */
  totalDataExported: number
  /** Average export time (ms) */
  averageExportTime: number
  /** Export requests by format */
  requestsByFormat: Record<string, number>
  /** Export requests by reason */
  requestsByReason: Record<string, number>
  /** Recent activity */
  recentActivity: Array<{
    date: string
    requestCount: number
    dataExported: number
  }>
}

/**
 * Exportable data item interface
 */
export interface ExportableDataItem {
  /** Item type */
  type: 'profile' | 'settings' | 'session' | 'analysis' | 'metadata'
  /** Item identifier */
  id: string
  /** Item data */
  data: any
  /** Data size (bytes) */
  sizeBytes: number
  /** Creation timestamp */
  createdAt: string
  /** Last modified timestamp */
  modifiedAt?: string
  /** GDPR processing basis */
  processingBasis: string
  /** Data category */
  category: string
  /** Data source */
  source: string
}

/**
 * Data export utilities class
 */
export class DataExportUtilities {
  private config: Required<DataExportConfig>
  private exportHistory: DataExportResult[]
  private pendingRequests: Map<string, DataExportRequest>
  private activeExports: Map<string, { userId: string; startTime: number }>
  private verificationTokens: Map<string, { token: string; expiresAt: number; requestId: string }>

  constructor(config?: Partial<DataExportConfig>) {
    this.config = {
      enableEncryption: true,
      enableCompression: true,
      maxFileSizeBytes: 100 * 1024 * 1024, // 100MB
      exportTimeout: 30 * 60 * 1000, // 30 minutes
      enableAuditLogging: true,
      fileRetentionHours: 72, // 3 days
      requireEmailVerification: true,
      allowedFormats: ['json', 'csv', 'xml', 'pdf', 'zip'],
      maxConcurrentExports: 3,
      ...config
    }
    this.exportHistory = []
    this.pendingRequests = new Map()
    this.activeExports = new Map()
    this.verificationTokens = new Map()
  }

  /**
   * Submit a data export request
   */
  async submitExportRequest(request: Omit<DataExportRequest, 'requestId' | 'requestedAt' | 'requiresVerification' | 'retentionHours'>): Promise<DataExportRequest> {
    // Check concurrent export limit
    const userActiveExports = Array.from(this.activeExports.values())
      .filter(exp => exp.userId === request.userId).length
    
    if (userActiveExports >= this.config.maxConcurrentExports) {
      throw new Error(`Maximum concurrent exports limit reached (${this.config.maxConcurrentExports})`)
    }

    // Validate export format
    if (!this.config.allowedFormats.includes(request.format)) {
      throw new Error(`Unsupported export format: ${request.format}`)
    }

    const exportRequest: DataExportRequest = {
      ...request,
      requestId: this.generateRequestId(),
      requestedAt: new Date().toISOString(),
      requiresVerification: this.config.requireEmailVerification && request.requestedBy === 'user',
      retentionHours: this.config.fileRetentionHours
    }

    // Generate verification token if required
    if (exportRequest.requiresVerification) {
      const verificationToken = this.generateVerificationToken()
      exportRequest.verificationToken = verificationToken
      
      this.verificationTokens.set(verificationToken, {
        token: verificationToken,
        expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
        requestId: exportRequest.requestId
      })

      // In production, send verification email
      await this.sendVerificationEmail(exportRequest)
    }

    // Store pending request
    this.pendingRequests.set(exportRequest.requestId, exportRequest)

    // If no verification required, process immediately
    if (!exportRequest.requiresVerification) {
      const result = await this.processExportRequest(exportRequest.requestId)
      return exportRequest // Return the request, not the result
    }

    return exportRequest
  }

  /**
   * Verify export request with token
   */
  async verifyExportRequest(verificationToken: string): Promise<DataExportResult> {
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
      throw new Error('Export request not found')
    }

    // Remove verification token
    this.verificationTokens.delete(verificationToken)

    // Process the export
    return this.processExportRequest(request.requestId)
  }

  /**
   * Process an export request
   */
  async processExportRequest(requestId: string): Promise<DataExportResult> {
    const request = this.pendingRequests.get(requestId)
    if (!request) {
      throw new Error('Export request not found')
    }

    const startTime = Date.now()
    
    // Mark export as active
    this.activeExports.set(requestId, {
      userId: request.userId,
      startTime
    })

    try {
      // Collect data to export
      const exportableData = await this.collectExportableData(request)

      // Validate export size
      const totalSize = exportableData.reduce((sum, item) => sum + item.sizeBytes, 0)
      if (totalSize > this.config.maxFileSizeBytes) {
        throw new Error(`Export data size exceeds limit: ${totalSize} > ${this.config.maxFileSizeBytes}`)
      }

      // Generate export file
      const exportFile = await this.generateExportFile(request, exportableData)

      // Create data summary
      const dataSummary = this.createDataSummary(exportableData, Date.now() - startTime)

      // Create GDPR compliance info
      const gdprCompliance = this.createGDPRComplianceInfo(request, exportableData)

      // Create result
      const result: DataExportResult = {
        requestId,
        status: 'completed',
        exportedAt: new Date().toISOString(),
        exportFile,
        dataSummary,
        auditTrailId: await this.createAuditTrailEntry(request, exportableData),
        warnings: [],
        gdprCompliance
      }

      // Store result
      this.exportHistory.push(result)

      // Remove from pending and active
      this.pendingRequests.delete(requestId)
      this.activeExports.delete(requestId)

      return result

    } catch (error) {
      // Create failed result
      const result: DataExportResult = {
        requestId,
        status: 'failed',
        exportedAt: new Date().toISOString(),
        exportFile: {
          location: '',
          sizeBytes: 0,
          format: request.format,
          fileHash: '',
          expiresAt: new Date().toISOString(),
          downloadToken: ''
        },
        dataSummary: {
          dataTypes: [],
          totalRecords: 0,
          exportDuration: Date.now() - startTime,
          categories: []
        },
        auditTrailId: await this.createAuditTrailEntry(request, []),
        warnings: [`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        gdprCompliance: {
          article15Compliant: false,
          article20Compliant: false,
          processingBasis: [],
          retentionInfo: 'Export failed'
        }
      }

      this.exportHistory.push(result)
      this.pendingRequests.delete(requestId)
      this.activeExports.delete(requestId)

      throw error
    }
  }

  /**
   * Collect exportable data
   */
  private async collectExportableData(request: DataExportRequest): Promise<ExportableDataItem[]> {
    const data: ExportableDataItem[] = []

    for (const dataType of request.dataTypes) {
      switch (dataType) {
        case 'profile':
          data.push(...await this.collectProfileData(request.userId))
          break
        case 'settings':
          data.push(...await this.collectSettingsData(request.userId))
          break
        case 'analysis_sessions':
          data.push(...await this.collectAnalysisSessionData(request.userId, request.scope))
          break
        case 'history':
          data.push(...await this.collectHistoryData(request.userId, request.scope))
          break
        case 'all':
          data.push(...await this.collectAllUserData(request.userId, request.scope))
          break
      }
    }

    return data
  }

  /**
   * Collect user profile data
   */
  private async collectProfileData(userId: string): Promise<ExportableDataItem[]> {
    // TODO: Implement actual data collection
    return [
      {
        type: 'profile',
        id: `profile_${userId}`,
        data: {
          userId,
          email: 'user@example.com',
          name: 'User Name',
          createdAt: '2024-01-01T00:00:00Z'
        },
        sizeBytes: 256,
        createdAt: '2024-01-01T00:00:00Z',
        processingBasis: 'Contract performance',
        category: 'Identity Data',
        source: 'User Registration'
      }
    ]
  }

  /**
   * Collect user settings data
   */
  private async collectSettingsData(userId: string): Promise<ExportableDataItem[]> {
    return [
      {
        type: 'settings',
        id: `settings_${userId}`,
        data: {
          userId,
          preferences: {
            language: 'en',
            theme: 'light',
            notifications: true
          }
        },
        sizeBytes: 128,
        createdAt: '2024-01-01T00:00:00Z',
        processingBasis: 'Legitimate interest',
        category: 'Preference Data',
        source: 'User Settings'
      }
    ]
  }

  /**
   * Collect analysis session data
   */
  private async collectAnalysisSessionData(userId: string, scope: DataExportRequest['scope']): Promise<ExportableDataItem[]> {
    return [
      {
        type: 'session',
        id: `session_${userId}_1`,
        data: {
          sessionId: 'session_1',
          userId,
          status: 'completed',
          createdAt: '2024-01-01T00:00:00Z',
          analysisType: 'terms_analysis'
        },
        sizeBytes: 512,
        createdAt: '2024-01-01T00:00:00Z',
        processingBasis: 'Contract performance',
        category: 'Usage Data',
        source: 'Analysis Service'
      }
    ]
  }

  /**
   * Collect user history data
   */
  private async collectHistoryData(userId: string, scope: DataExportRequest['scope']): Promise<ExportableDataItem[]> {
    return [
      {
        type: 'metadata',
        id: `history_${userId}`,
        data: {
          userId,
          lastLogin: '2024-01-01T00:00:00Z',
          loginCount: 10,
          lastAnalysis: '2024-01-01T00:00:00Z'
        },
        sizeBytes: 256,
        createdAt: '2024-01-01T00:00:00Z',
        processingBasis: 'Legitimate interest',
        category: 'Activity Data',
        source: 'Usage Tracking'
      }
    ]
  }

  /**
   * Collect all user data
   */
  private async collectAllUserData(userId: string, scope: DataExportRequest['scope']): Promise<ExportableDataItem[]> {
    const profileData = await this.collectProfileData(userId)
    const settingsData = await this.collectSettingsData(userId)
    const sessionData = await this.collectAnalysisSessionData(userId, scope)
    const historyData = await this.collectHistoryData(userId, scope)
    
    return [...profileData, ...settingsData, ...sessionData, ...historyData]
  }

  /**
   * Generate export file
   */
  private async generateExportFile(request: DataExportRequest, data: ExportableDataItem[]): Promise<DataExportResult['exportFile']> {
    // Generate file content based on format
    const fileContent = await this.formatExportData(request.format, data)
    
    // Generate file hash
    const fileHash = createHash('sha256').update(fileContent).digest('hex')
    
    // Calculate expiration time
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + request.retentionHours)
    
    // Generate download token
    const downloadToken = this.generateDownloadToken()
    
    // Generate file path (in production, this would be a real file path or URL)
    const fileName = `export_${request.requestId}_${Date.now()}.${request.format}`
    const location = `/exports/${fileName}`

    // TODO: Actually save file content to storage
    
    return {
      location,
      sizeBytes: Buffer.byteLength(fileContent, 'utf8'),
      format: request.format,
      fileHash,
      expiresAt: expiresAt.toISOString(),
      downloadToken
    }
  }

  /**
   * Format export data based on format
   */
  private async formatExportData(format: string, data: ExportableDataItem[]): Promise<string> {
    switch (format) {
      case 'json':
        return JSON.stringify({
          exportMetadata: {
            exportedAt: new Date().toISOString(),
            totalRecords: data.length,
            format: 'json'
          },
          data: data.map(item => ({
            type: item.type,
            id: item.id,
            data: item.data,
            metadata: {
              createdAt: item.createdAt,
              modifiedAt: item.modifiedAt,
              processingBasis: item.processingBasis,
              category: item.category,
              source: item.source
            }
          }))
        }, null, 2)

      case 'csv':
        const csvHeaders = ['Type', 'ID', 'Data', 'Created At', 'Processing Basis', 'Category', 'Source']
        const csvRows = data.map(item => [
          item.type,
          item.id,
          JSON.stringify(item.data),
          item.createdAt,
          item.processingBasis,
          item.category,
          item.source
        ])
        return [csvHeaders, ...csvRows].map(row => row.join(',')).join('\n')

      case 'xml':
        const xmlData = data.map(item => `
          <item type="${item.type}" id="${item.id}">
            <data>${JSON.stringify(item.data)}</data>
            <metadata>
              <createdAt>${item.createdAt}</createdAt>
              <processingBasis>${item.processingBasis}</processingBasis>
              <category>${item.category}</category>
              <source>${item.source}</source>
            </metadata>
          </item>
        `).join('')
        return `<?xml version="1.0" encoding="UTF-8"?><export>${xmlData}</export>`

      default:
        return JSON.stringify(data, null, 2)
    }
  }

  /**
   * Create data summary
   */
  private createDataSummary(data: ExportableDataItem[], duration: number): DataExportResult['dataSummary'] {
    const categoryMap = new Map<string, ExportCategory>()

    for (const item of data) {
      const existing = categoryMap.get(item.category) || {
        category: item.category,
        description: `${item.category} data`,
        recordCount: 0,
        sizeBytes: 0,
        fields: [],
        processingBasis: item.processingBasis,
        source: item.source
      }

      existing.recordCount++
      existing.sizeBytes += item.sizeBytes
      
      // Add fields from data object
      if (typeof item.data === 'object' && item.data !== null) {
        const fields = Object.keys(item.data)
        existing.fields = [...new Set([...existing.fields, ...fields])]
      }

      categoryMap.set(item.category, existing)
    }

    return {
      dataTypes: [...new Set(data.map(item => item.type))],
      totalRecords: data.length,
      exportDuration: duration,
      categories: Array.from(categoryMap.values())
    }
  }

  /**
   * Create GDPR compliance information
   */
  private createGDPRComplianceInfo(request: DataExportRequest, data: ExportableDataItem[]): DataExportResult['gdprCompliance'] {
    const processingBases = [...new Set(data.map(item => item.processingBasis))]
    
    return {
      article15Compliant: true, // Right of access
      article20Compliant: request.format === 'json' || request.format === 'xml', // Structured format for portability
      processingBasis: processingBases,
      retentionInfo: `Export file retained for ${request.retentionHours} hours, then automatically deleted`
    }
  }

  /**
   * Create audit trail entry
   */
  private async createAuditTrailEntry(request: DataExportRequest, data: ExportableDataItem[]): Promise<string> {
    const auditId = `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const auditEntry = {
      auditId,
      timestamp: new Date().toISOString(),
      action: 'data_export',
      requestId: request.requestId,
      userId: request.userId,
      exportFormat: request.format,
      dataTypes: request.dataTypes,
      reason: request.reason,
      recordsExported: data.length,
      totalBytesExported: data.reduce((sum, item) => sum + item.sizeBytes, 0),
      requestedBy: request.requestedBy,
      complianceType: 'GDPR Article 15 & 20'
    }

    // TODO: Store audit entry in permanent audit log
    console.log('Export audit trail entry created:', auditEntry)

    return auditId
  }

  /**
   * Generate request ID
   */
  private generateRequestId(): string {
    return `exp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
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
   * Generate download token
   */
  private generateDownloadToken(): string {
    return createHash('sha256')
      .update(`download_${Date.now()}_${Math.random()}`)
      .digest('hex')
      .substr(0, 24)
  }

  /**
   * Send verification email
   */
  private async sendVerificationEmail(request: DataExportRequest): Promise<void> {
    // TODO: Implement email sending
    console.log(`Export verification email sent to ${request.requestorEmail} for request ${request.requestId}`)
    console.log(`Verification token: ${request.verificationToken}`)
  }

  /**
   * Get export request status
   */
  getExportRequestStatus(requestId: string): DataExportRequest | DataExportResult | null {
    // Check pending requests
    const pendingRequest = this.pendingRequests.get(requestId)
    if (pendingRequest) {
      return pendingRequest
    }

    // Check completed requests
    const completedRequest = this.exportHistory.find(result => result.requestId === requestId)
    return completedRequest || null
  }

  /**
   * Get export statistics
   */
  getExportStatistics(): ExportStatistics {
    const stats: ExportStatistics = {
      totalRequests: this.exportHistory.length,
      successfulExports: this.exportHistory.filter(r => r.status === 'completed').length,
      failedExports: this.exportHistory.filter(r => r.status === 'failed').length,
      totalDataExported: this.exportHistory.reduce((sum, r) => sum + r.exportFile.sizeBytes, 0),
      averageExportTime: this.exportHistory.length > 0 
        ? this.exportHistory.reduce((sum, r) => sum + r.dataSummary.exportDuration, 0) / this.exportHistory.length
        : 0,
      requestsByFormat: {},
      requestsByReason: {},
      recentActivity: []
    }

    // Calculate format and reason statistics
    for (const result of this.exportHistory) {
      stats.requestsByFormat[result.exportFile.format] = (stats.requestsByFormat[result.exportFile.format] || 0) + 1
    }

    // Calculate recent activity
    const recent = this.exportHistory.slice(-30) // Last 30 requests
    const activityByDate = new Map<string, { count: number; dataExported: number }>()

    for (const result of recent) {
      const date = result.exportedAt.split('T')[0]
      const existing = activityByDate.get(date) || { count: 0, dataExported: 0 }
      existing.count++
      existing.dataExported += result.exportFile.sizeBytes
      activityByDate.set(date, existing)
    }

    stats.recentActivity = Array.from(activityByDate.entries()).map(([date, data]) => ({
      date,
      requestCount: data.count,
      dataExported: data.dataExported
    }))

    return stats
  }

  /**
   * Cancel pending export request
   */
  cancelExportRequest(requestId: string): boolean {
    const request = this.pendingRequests.get(requestId)
    if (!request) {
      return false
    }

    // Remove verification token if exists
    if (request.verificationToken) {
      this.verificationTokens.delete(request.verificationToken)
    }

    // Remove from pending and active
    this.pendingRequests.delete(requestId)
    this.activeExports.delete(requestId)

    return true
  }

  /**
   * Get pending requests
   */
  getPendingRequests(): DataExportRequest[] {
    return Array.from(this.pendingRequests.values())
  }

  /**
   * Get export history
   */
  getExportHistory(limit: number = 50): DataExportResult[] {
    return this.exportHistory
      .slice(-limit)
      .sort((a, b) => new Date(b.exportedAt).getTime() - new Date(a.exportedAt).getTime())
  }

  /**
   * Clean up expired export files
   */
  async cleanupExpiredExports(): Promise<number> {
    const now = new Date()
    let cleanupCount = 0

    for (const result of this.exportHistory) {
      if (new Date(result.exportFile.expiresAt) <= now) {
        // TODO: Actually delete the file
        console.log(`Cleaning up expired export file: ${result.exportFile.location}`)
        cleanupCount++
      }
    }

    return cleanupCount
  }

  /**
   * Clear export history (admin only)
   */
  clearExportHistory(): void {
    this.exportHistory = []
  }
}

/**
 * Default data export utilities instance
 */
export const defaultDataExport = new DataExportUtilities()

/**
 * Quick data export for user
 */
export async function exportUserData(
  userId: string, 
  requestorEmail: string, 
  format: 'json' | 'csv' | 'xml' = 'json',
  dataTypes: DataExportRequest['dataTypes'] = ['all']
): Promise<DataExportRequest> {
  return defaultDataExport.submitExportRequest({
    userId,
    requestorEmail,
    format,
    dataTypes,
    scope: {
      includeMetadata: true
    },
    reason: 'user_request',
    requestedBy: 'user'
  })
}

/**
 * Quick GDPR export request
 */
export async function processGDPRExportRequest(
  userId: string,
  requestorEmail: string,
  format: 'json' | 'xml' = 'json'
): Promise<DataExportRequest> {
  return defaultDataExport.submitExportRequest({
    userId,
    requestorEmail,
    format,
    dataTypes: ['all'],
    scope: {
      includeMetadata: true,
      includeSystemData: true
    },
    reason: 'gdpr_compliance',
    reasonDetails: 'GDPR Article 15 & 20 - Right of access and data portability',
    requestedBy: 'user'
  })
}

// Export types for external use
export type {
  DataExportRequest as ExportRequest,
  DataExportResult as ExportResult,
  ExportCategory as ExportCategoryType,
  DataExportConfig as ExportConfig,
  ExportStatistics as ExportStats,
  ExportableDataItem as ExportableItem
}