/**
 * Data Retention Policy Enforcement (Task T111)
 * 
 * Automated enforcement of data retention policies to ensure privacy compliance
 * and legal risk minimization through systematic data lifecycle management.
 * 
 * Constitutional Principle II: Legal Risk Minimization
 * - Automated data expiration and deletion
 * - Compliance with data protection regulations
 * - No manual intervention required for policy enforcement
 * 
 * @module shared/lib/cleanup/retention-policy
 */

/**
 * Data retention policy rule
 */
export interface RetentionPolicyRule {
  /** Unique identifier for the rule */
  id: string
  /** Human-readable name */
  name: string
  /** Description of what the rule governs */
  description: string
  /** Data type or table name */
  dataType: string
  /** Retention period in milliseconds */
  retentionPeriodMs: number
  /** Whether the rule is currently active */
  isActive: boolean
  /** Priority for rule execution (higher numbers = higher priority) */
  priority: number
  /** Legal basis for retention period */
  legalBasis: string
  /** Jurisdiction this rule applies to */
  jurisdiction: string[]
  /** When this rule was created */
  createdAt: string
  /** When this rule was last updated */
  updatedAt: string
}

/**
 * Data retention enforcement result
 */
export interface RetentionEnforcementResult {
  /** Rules that were executed */
  executedRules: string[]
  /** Total data entries processed */
  totalEntriesProcessed: number
  /** Total data entries deleted */
  totalEntriesDeleted: number
  /** Estimated space freed (bytes) */
  estimatedSpaceFreed: number
  /** Enforcement duration */
  duration: number
  /** Enforcement timestamp */
  completedAt: string
  /** Errors encountered */
  errors: Array<{
    ruleId: string
    error: string
    affectedCount: number
  }>
  /** Warnings generated */
  warnings: Array<{
    ruleId: string
    warning: string
    recommendation: string
  }>
}

/**
 * Data retention audit record
 */
export interface RetentionAuditRecord {
  /** Audit record ID */
  id: string
  /** Timestamp of audit */
  auditedAt: string
  /** Rule that was audited */
  ruleId: string
  /** Data type audited */
  dataType: string
  /** Records found for deletion */
  recordsFound: number
  /** Records actually deleted */
  recordsDeleted: number
  /** Compliance status */
  complianceStatus: 'compliant' | 'non-compliant' | 'warning'
  /** Next audit date */
  nextAuditDate: string
  /** Any issues found */
  issues: string[]
}

/**
 * Retention policy configuration
 */
export interface RetentionPolicyConfig {
  /** Enable automatic enforcement */
  enableAutoEnforcement: boolean
  /** Enforcement schedule (cron expression) */
  enforcementSchedule: string
  /** Maximum records to process in one batch */
  maxBatchSize: number
  /** Enable detailed audit logging */
  enableAuditLogging: boolean
  /** Dry run mode (no actual deletions) */
  dryRunMode: boolean
  /** Grace period before actual deletion (ms) */
  gracePeriodMs: number
  /** Enable email notifications for policy violations */
  enableNotifications: boolean
}

/**
 * Data retention policy enforcement service
 */
export class DataRetentionPolicyService {
  private config: Required<RetentionPolicyConfig>
  private rules: Map<string, RetentionPolicyRule>
  private auditHistory: RetentionAuditRecord[]
  private enforcementHistory: RetentionEnforcementResult[]
  private isEnforcementRunning: boolean

  constructor(config?: Partial<RetentionPolicyConfig>) {
    this.config = {
      enableAutoEnforcement: true,
      enforcementSchedule: '0 2 * * *', // Daily at 2 AM
      maxBatchSize: 1000,
      enableAuditLogging: true,
      dryRunMode: false,
      gracePeriodMs: 24 * 60 * 60 * 1000, // 24 hours
      enableNotifications: false,
      ...config
    }

    this.rules = new Map()
    this.auditHistory = []
    this.enforcementHistory = []
    this.isEnforcementRunning = false

    // Load default retention policies
    this.loadDefaultPolicies()
  }

  /**
   * Add or update a retention policy rule
   */
  async addRetentionRule(rule: Omit<RetentionPolicyRule, 'createdAt' | 'updatedAt'>): Promise<void> {
    const now = new Date().toISOString()
    
    const completeRule: RetentionPolicyRule = {
      ...rule,
      createdAt: this.rules.has(rule.id) ? this.rules.get(rule.id)!.createdAt : now,
      updatedAt: now
    }

    // Validate rule
    const validation = this.validateRule(completeRule)
    if (!validation.isValid) {
      throw new Error(`Invalid retention rule: ${validation.errors.join(', ')}`)
    }

    this.rules.set(rule.id, completeRule)
  }

  /**
   * Remove a retention policy rule
   */
  async removeRetentionRule(ruleId: string): Promise<boolean> {
    return this.rules.delete(ruleId)
  }

  /**
   * Enforce all active retention policies
   */
  async enforceRetentionPolicies(): Promise<RetentionEnforcementResult> {
    if (this.isEnforcementRunning) {
      throw new Error('Retention policy enforcement already in progress')
    }

    this.isEnforcementRunning = true
    const startTime = Date.now()

    const result: RetentionEnforcementResult = {
      executedRules: [],
      totalEntriesProcessed: 0,
      totalEntriesDeleted: 0,
      estimatedSpaceFreed: 0,
      duration: 0,
      completedAt: '',
      errors: [],
      warnings: []
    }

    try {
      // Get active rules sorted by priority
      const activeRules = Array.from(this.rules.values())
        .filter(rule => rule.isActive)
        .sort((a, b) => b.priority - a.priority)

      for (const rule of activeRules) {
        try {
          const ruleResult = await this.enforceRule(rule)
          
          result.executedRules.push(rule.id)
          result.totalEntriesProcessed += ruleResult.entriesProcessed
          result.totalEntriesDeleted += ruleResult.entriesDeleted
          result.estimatedSpaceFreed += ruleResult.spaceFreed

          // Create audit record
          if (this.config.enableAuditLogging) {
            await this.createAuditRecord(rule, ruleResult)
          }

        } catch (error) {
          result.errors.push({
            ruleId: rule.id,
            error: error instanceof Error ? error.message : 'Unknown error',
            affectedCount: 0
          })
        }
      }

    } finally {
      this.isEnforcementRunning = false
      result.duration = Date.now() - startTime
      result.completedAt = new Date().toISOString()
      
      // Record enforcement result
      this.enforcementHistory.push(result)

      // Send notifications if enabled
      if (this.config.enableNotifications) {
        await this.sendEnforcementNotification(result)
      }
    }

    return result
  }

  /**
   * Audit compliance with retention policies
   */
  async auditRetentionCompliance(): Promise<{
    overallCompliance: 'compliant' | 'non-compliant' | 'warning'
    ruleCompliance: Array<{
      ruleId: string
      status: 'compliant' | 'non-compliant' | 'warning'
      expiredRecords: number
      issues: string[]
    }>
    recommendations: string[]
  }> {
    const ruleCompliance: Array<{
      ruleId: string
      status: 'compliant' | 'non-compliant' | 'warning'
      expiredRecords: number
      issues: string[]
    }> = []

    const recommendations: string[] = []
    let hasNonCompliant = false
    let hasWarnings = false

    for (const rule of this.rules.values()) {
      if (!rule.isActive) continue

      try {
        const auditResult = await this.auditRule(rule)
        ruleCompliance.push(auditResult)

        if (auditResult.status === 'non-compliant') {
          hasNonCompliant = true
        } else if (auditResult.status === 'warning') {
          hasWarnings = true
        }

        // Generate recommendations
        if (auditResult.expiredRecords > 1000) {
          recommendations.push(`Consider running enforcement for rule ${rule.id} (${auditResult.expiredRecords} expired records)`)
        }

      } catch (error) {
        ruleCompliance.push({
          ruleId: rule.id,
          status: 'non-compliant',
          expiredRecords: 0,
          issues: [`Audit failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
        })
        hasNonCompliant = true
      }
    }

    // Determine overall compliance
    let overallCompliance: 'compliant' | 'non-compliant' | 'warning' = 'compliant'
    if (hasNonCompliant) {
      overallCompliance = 'non-compliant'
    } else if (hasWarnings) {
      overallCompliance = 'warning'
    }

    return {
      overallCompliance,
      ruleCompliance,
      recommendations
    }
  }

  /**
   * Get retention policy statistics
   */
  getRetentionStats(): {
    totalRules: number
    activeRules: number
    lastEnforcement?: string
    nextEnforcement?: string
    totalDataDeleted: number
    totalSpaceFreed: number
    complianceRate: number
  } {
    const totalRules = this.rules.size
    const activeRules = Array.from(this.rules.values()).filter(r => r.isActive).length
    
    const totalDataDeleted = this.enforcementHistory.reduce(
      (sum, result) => sum + result.totalEntriesDeleted, 0
    )
    
    const totalSpaceFreed = this.enforcementHistory.reduce(
      (sum, result) => sum + result.estimatedSpaceFreed, 0
    )

    const lastEnforcement = this.enforcementHistory.length > 0 
      ? this.enforcementHistory[this.enforcementHistory.length - 1].completedAt
      : undefined

    // Calculate compliance rate from recent audits
    const recentAudits = this.auditHistory.slice(-activeRules)
    const compliantAudits = recentAudits.filter(a => a.complianceStatus === 'compliant').length
    const complianceRate = recentAudits.length > 0 ? compliantAudits / recentAudits.length : 1.0

    return {
      totalRules,
      activeRules,
      lastEnforcement,
      nextEnforcement: this.calculateNextEnforcement(),
      totalDataDeleted,
      totalSpaceFreed,
      complianceRate
    }
  }

  /**
   * Get all retention rules
   */
  getRetentionRules(): RetentionPolicyRule[] {
    return Array.from(this.rules.values())
  }

  /**
   * Get specific retention rule
   */
  getRetentionRule(ruleId: string): RetentionPolicyRule | undefined {
    return this.rules.get(ruleId)
  }

  /**
   * Validate retention rule
   */
  private validateRule(rule: RetentionPolicyRule): {
    isValid: boolean
    errors: string[]
    warnings: string[]
  } {
    const errors: string[] = []
    const warnings: string[] = []

    if (!rule.id || rule.id.trim().length === 0) {
      errors.push('Rule ID is required')
    }

    if (!rule.name || rule.name.trim().length === 0) {
      errors.push('Rule name is required')
    }

    if (!rule.dataType || rule.dataType.trim().length === 0) {
      errors.push('Data type is required')
    }

    if (rule.retentionPeriodMs <= 0) {
      errors.push('Retention period must be positive')
    }

    if (rule.retentionPeriodMs < 24 * 60 * 60 * 1000) {
      warnings.push('Retention period is less than 24 hours')
    }

    if (rule.priority < 0 || rule.priority > 100) {
      warnings.push('Priority should be between 0 and 100')
    }

    if (!rule.jurisdiction || rule.jurisdiction.length === 0) {
      warnings.push('No jurisdiction specified for rule')
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  /**
   * Enforce a specific retention rule
   */
  private async enforceRule(rule: RetentionPolicyRule): Promise<{
    entriesProcessed: number
    entriesDeleted: number
    spaceFreed: number
  }> {
    const cutoffDate = new Date(Date.now() - rule.retentionPeriodMs - this.config.gracePeriodMs)
    
    // TODO: Implement actual database operations based on data type
    // This is a placeholder implementation
    
    switch (rule.dataType) {
      case 'analysis_sessions':
        return this.enforceAnalysisSessionsRule(rule, cutoffDate)
      case 'risk_assessments':
        return this.enforceRiskAssessmentsRule(rule, cutoffDate)
      case 'daily_quotas':
        return this.enforceDailyQuotasRule(rule, cutoffDate)
      case 'audit_logs':
        return this.enforceAuditLogsRule(rule, cutoffDate)
      default:
        throw new Error(`Unknown data type: ${rule.dataType}`)
    }
  }

  /**
   * Enforce analysis sessions retention rule
   */
  private async enforceAnalysisSessionsRule(
    rule: RetentionPolicyRule, 
    cutoffDate: Date
  ): Promise<{ entriesProcessed: number; entriesDeleted: number; spaceFreed: number }> {
    // TODO: Implement actual database query
    // SELECT COUNT(*) FROM analysis_sessions WHERE expires_at < cutoffDate
    const entriesFound = 0
    
    if (this.config.dryRunMode) {
      return {
        entriesProcessed: entriesFound,
        entriesDeleted: 0,
        spaceFreed: 0
      }
    }

    // TODO: Implement actual deletion
    // DELETE FROM analysis_sessions WHERE expires_at < cutoffDate
    const entriesDeleted = 0
    const avgSessionSize = 2000 // bytes
    
    return {
      entriesProcessed: entriesFound,
      entriesDeleted,
      spaceFreed: entriesDeleted * avgSessionSize
    }
  }

  /**
   * Enforce risk assessments retention rule
   */
  private async enforceRiskAssessmentsRule(
    rule: RetentionPolicyRule,
    cutoffDate: Date
  ): Promise<{ entriesProcessed: number; entriesDeleted: number; spaceFreed: number }> {
    // Placeholder implementation
    return {
      entriesProcessed: 0,
      entriesDeleted: 0,
      spaceFreed: 0
    }
  }

  /**
   * Enforce daily quotas retention rule
   */
  private async enforceDailyQuotasRule(
    rule: RetentionPolicyRule,
    cutoffDate: Date
  ): Promise<{ entriesProcessed: number; entriesDeleted: number; spaceFreed: number }> {
    // Placeholder implementation
    return {
      entriesProcessed: 0,
      entriesDeleted: 0,
      spaceFreed: 0
    }
  }

  /**
   * Enforce audit logs retention rule
   */
  private async enforceAuditLogsRule(
    rule: RetentionPolicyRule,
    cutoffDate: Date
  ): Promise<{ entriesProcessed: number; entriesDeleted: number; spaceFreed: number }> {
    // Placeholder implementation
    return {
      entriesProcessed: 0,
      entriesDeleted: 0,
      spaceFreed: 0
    }
  }

  /**
   * Audit a specific rule for compliance
   */
  private async auditRule(rule: RetentionPolicyRule): Promise<{
    ruleId: string
    status: 'compliant' | 'non-compliant' | 'warning'
    expiredRecords: number
    issues: string[]
  }> {
    const cutoffDate = new Date(Date.now() - rule.retentionPeriodMs)
    const issues: string[] = []

    // TODO: Count expired records for this rule
    const expiredRecords = 0

    let status: 'compliant' | 'non-compliant' | 'warning' = 'compliant'
    
    if (expiredRecords > 1000) {
      status = 'non-compliant'
      issues.push(`${expiredRecords} records past retention period`)
    } else if (expiredRecords > 100) {
      status = 'warning'
      issues.push(`${expiredRecords} records approaching deletion threshold`)
    }

    return {
      ruleId: rule.id,
      status,
      expiredRecords,
      issues
    }
  }

  /**
   * Create audit record
   */
  private async createAuditRecord(
    rule: RetentionPolicyRule,
    enforcementResult: { entriesProcessed: number; entriesDeleted: number; spaceFreed: number }
  ): Promise<void> {
    const auditRecord: RetentionAuditRecord = {
      id: `audit-${Date.now()}-${rule.id}`,
      auditedAt: new Date().toISOString(),
      ruleId: rule.id,
      dataType: rule.dataType,
      recordsFound: enforcementResult.entriesProcessed,
      recordsDeleted: enforcementResult.entriesDeleted,
      complianceStatus: enforcementResult.entriesProcessed === enforcementResult.entriesDeleted ? 'compliant' : 'warning',
      nextAuditDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      issues: []
    }

    this.auditHistory.push(auditRecord)
  }

  /**
   * Send enforcement notification
   */
  private async sendEnforcementNotification(result: RetentionEnforcementResult): Promise<void> {
    // TODO: Implement email notification system
    const notification = {
      subject: 'Data Retention Policy Enforcement Completed',
      summary: {
        rulesExecuted: result.executedRules.length,
        recordsDeleted: result.totalEntriesDeleted,
        spaceFreed: this.formatBytes(result.estimatedSpaceFreed),
        errors: result.errors.length,
        duration: `${Math.round(result.duration / 1000)}s`
      },
      errors: result.errors,
      warnings: result.warnings
    }

    console.log('Retention enforcement notification:', notification)
  }

  /**
   * Load default retention policies
   */
  private loadDefaultPolicies(): void {
    const defaultPolicies: Array<Omit<RetentionPolicyRule, 'createdAt' | 'updatedAt'>> = [
      {
        id: 'analysis-sessions-7d',
        name: 'Analysis Sessions (7 days)',
        description: 'Delete analysis sessions after 7 days',
        dataType: 'analysis_sessions',
        retentionPeriodMs: 7 * 24 * 60 * 60 * 1000,
        isActive: true,
        priority: 90,
        legalBasis: 'Data minimization principle',
        jurisdiction: ['KR', 'EU', 'US']
      },
      {
        id: 'daily-quotas-90d',
        name: 'Daily Quotas (90 days)',
        description: 'Delete old daily quota records after 90 days',
        dataType: 'daily_quotas',
        retentionPeriodMs: 90 * 24 * 60 * 60 * 1000,
        isActive: true,
        priority: 70,
        legalBasis: 'Business record retention',
        jurisdiction: ['KR', 'EU', 'US']
      },
      {
        id: 'audit-logs-1y',
        name: 'Audit Logs (1 year)',
        description: 'Delete audit logs after 1 year',
        dataType: 'audit_logs',
        retentionPeriodMs: 365 * 24 * 60 * 60 * 1000,
        isActive: true,
        priority: 50,
        legalBasis: 'Audit requirement compliance',
        jurisdiction: ['KR', 'EU', 'US']
      }
    ]

    for (const policy of defaultPolicies) {
      this.addRetentionRule(policy).catch(console.error)
    }
  }

  /**
   * Calculate next enforcement time
   */
  private calculateNextEnforcement(): string {
    // Parse cron expression and calculate next run time
    // This is a simplified implementation
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(2, 0, 0, 0)
    return tomorrow.toISOString()
  }

  /**
   * Format bytes for human readability
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes'
    
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  /**
   * Get audit history
   */
  getAuditHistory(limit: number = 50): RetentionAuditRecord[] {
    return this.auditHistory
      .slice(-limit)
      .sort((a, b) => new Date(b.auditedAt).getTime() - new Date(a.auditedAt).getTime())
  }

  /**
   * Get enforcement history
   */
  getEnforcementHistory(limit: number = 10): RetentionEnforcementResult[] {
    return this.enforcementHistory
      .slice(-limit)
      .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
  }

  /**
   * Clear all history (for testing)
   */
  clearHistory(): void {
    this.auditHistory = []
    this.enforcementHistory = []
  }
}

/**
 * Default data retention policy service
 */
export const defaultRetentionPolicy = new DataRetentionPolicyService()

/**
 * Create retention policy service with custom configuration
 */
export function createRetentionPolicyService(config?: Partial<RetentionPolicyConfig>): DataRetentionPolicyService {
  return new DataRetentionPolicyService(config)
}

/**
 * Utility function to enforce retention policies
 */
export async function enforceDataRetention(): Promise<RetentionEnforcementResult> {
  return defaultRetentionPolicy.enforceRetentionPolicies()
}

/**
 * Utility function to audit retention compliance
 */
export async function auditDataRetention(): Promise<{
  overallCompliance: 'compliant' | 'non-compliant' | 'warning'
  ruleCompliance: Array<{
    ruleId: string
    status: 'compliant' | 'non-compliant' | 'warning'
    expiredRecords: number
    issues: string[]
  }>
  recommendations: string[]
}> {
  return defaultRetentionPolicy.auditRetentionCompliance()
}

// Export types
export type {
  RetentionPolicyRule as DataRetentionRule,
  RetentionEnforcementResult as DataRetentionEnforcementResult,
  RetentionAuditRecord as DataRetentionAuditRecord,
  RetentionPolicyConfig as DataRetentionPolicyConfig
}