/**
 * Quota Validation Service (Task T084)
 * 
 * Implements business logic validation for quota management operations
 * following Feature-Sliced Design principles and data model constraints
 */

import { QuotaCalculator, type DailyQuotaRecord, QUOTA_CONFIG } from './quota-calculator'

/**
 * Quota validation result interface
 */
export interface QuotaValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  canProceed: boolean
  quotaInfo?: {
    currentUsage: number
    remainingAnalyses: number
    resetTime: Date
    quotaStatus: 'active' | 'exceeded' | 'reset_pending'
  }
}

/**
 * Quota operation types
 */
export type QuotaOperation = 
  | 'analysis_request'
  | 'quota_check'
  | 'quota_reset'
  | 'quota_override'
  | 'usage_increment'

/**
 * Quota validation context
 */
export interface QuotaValidationContext {
  userId: string
  operation: QuotaOperation
  requestedAnalyses?: number
  bypassLimits?: boolean
  targetDate?: Date
  currentRecords?: DailyQuotaRecord[]
}

/**
 * Main quota validation service
 */
export class QuotaValidator {
  /**
   * Validates a quota operation against business rules
   */
  static async validateOperation(
    context: QuotaValidationContext,
    dailyLimit: number = QUOTA_CONFIG.DAILY_LIMIT
  ): Promise<QuotaValidationResult> {
    const errors: string[] = []
    const warnings: string[] = []

    // Basic context validation
    const contextValidation = this.validateContext(context)
    if (!contextValidation.isValid) {
      return {
        isValid: false,
        errors: contextValidation.errors,
        warnings: [],
        canProceed: false
      }
    }

    // Operation-specific validation
    switch (context.operation) {
      case 'analysis_request':
        return this.validateAnalysisRequest(context, dailyLimit)
      
      case 'quota_check':
        return this.validateQuotaCheck(context, dailyLimit)
      
      case 'quota_reset':
        return this.validateQuotaReset(context)
      
      case 'quota_override':
        return this.validateQuotaOverride(context)
      
      case 'usage_increment':
        return this.validateUsageIncrement(context, dailyLimit)
      
      default:
        return {
          isValid: false,
          errors: [`Unsupported operation: ${context.operation}`],
          warnings: [],
          canProceed: false
        }
    }
  }

  /**
   * Validates analysis request against quota limits
   */
  private static validateAnalysisRequest(
    context: QuotaValidationContext,
    dailyLimit: number
  ): QuotaValidationResult {
    const errors: string[] = []
    const warnings: string[] = []
    const records = context.currentRecords || []
    const targetDate = context.targetDate || new Date()

    // Calculate current quota status
    const quotaCalculation = QuotaCalculator.calculateQuotaStatus(records, targetDate, dailyLimit)
    
    // Check if user can perform analysis
    const canPerform = QuotaCalculator.canPerformAnalysis(records, targetDate, dailyLimit)

    if (!canPerform.canPerform) {
      errors.push(canPerform.reason || 'Analysis request denied')
    }

    // Add warnings for near-limit usage
    if (quotaCalculation.remainingAnalyses === 1) {
      warnings.push('This is your last free analysis for today')
    } else if (quotaCalculation.remainingAnalyses === 0) {
      warnings.push('Daily quota limit reached')
    }

    // Check for bypass permissions
    const canProceed = context.bypassLimits || canPerform.canPerform

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      canProceed,
      quotaInfo: {
        currentUsage: quotaCalculation.currentUsage,
        remainingAnalyses: quotaCalculation.remainingAnalyses,
        resetTime: quotaCalculation.resetTime,
        quotaStatus: quotaCalculation.quotaStatus
      }
    }
  }

  /**
   * Validates quota check request
   */
  private static validateQuotaCheck(
    context: QuotaValidationContext,
    dailyLimit: number
  ): QuotaValidationResult {
    const records = context.currentRecords || []
    const targetDate = context.targetDate || new Date()

    const quotaCalculation = QuotaCalculator.calculateQuotaStatus(records, targetDate, dailyLimit)
    
    return {
      isValid: true,
      errors: [],
      warnings: [],
      canProceed: true,
      quotaInfo: {
        currentUsage: quotaCalculation.currentUsage,
        remainingAnalyses: quotaCalculation.remainingAnalyses,
        resetTime: quotaCalculation.resetTime,
        quotaStatus: quotaCalculation.quotaStatus
      }
    }
  }

  /**
   * Validates quota reset operation
   */
  private static validateQuotaReset(
    context: QuotaValidationContext
  ): QuotaValidationResult {
    const errors: string[] = []
    const warnings: string[] = []
    const targetDate = context.targetDate || new Date()

    // Check if reset is actually needed
    const records = context.currentRecords || []
    const todayRecord = records.find(record => 
      record.quota_date === QuotaCalculator.getDateString(targetDate)
    )

    if (!todayRecord || todayRecord.analysis_count === 0) {
      warnings.push('No usage to reset for this date')
    }

    // Validate reset timing (typically should be done at midnight)
    const currentHour = targetDate.getHours()
    if (currentHour !== QUOTA_CONFIG.RESET_HOUR) {
      warnings.push(`Reset typically occurs at ${QUOTA_CONFIG.RESET_HOUR}:00, current time may be unusual`)
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      canProceed: true
    }
  }

  /**
   * Validates quota override operation (admin function)
   */
  private static validateQuotaOverride(
    context: QuotaValidationContext
  ): QuotaValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    if (!context.bypassLimits) {
      errors.push('Quota override requires bypass permissions')
    }

    if (context.requestedAnalyses && context.requestedAnalyses > 100) {
      warnings.push('Requested analysis count is very high')
    }

    warnings.push('Quota override should be used sparingly and documented')

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      canProceed: context.bypassLimits || false
    }
  }

  /**
   * Validates usage increment operation
   */
  private static validateUsageIncrement(
    context: QuotaValidationContext,
    dailyLimit: number
  ): QuotaValidationResult {
    const errors: string[] = []
    const warnings: string[] = []
    const records = context.currentRecords || []
    const targetDate = context.targetDate || new Date()

    const quotaCalculation = QuotaCalculator.calculateQuotaStatus(records, targetDate, dailyLimit)
    
    // Check if increment would exceed limits
    const incrementAmount = context.requestedAnalyses || 1
    const newUsage = quotaCalculation.currentUsage + incrementAmount

    if (newUsage > dailyLimit && !context.bypassLimits) {
      errors.push(`Increment would exceed daily limit (${newUsage} > ${dailyLimit})`)
    }

    if (incrementAmount > 1) {
      warnings.push(`Incrementing by ${incrementAmount} analyses`)
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      canProceed: errors.length === 0 || !!context.bypassLimits
    }
  }

  /**
   * Validates the basic context structure
   */
  private static validateContext(context: QuotaValidationContext): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!context.userId || typeof context.userId !== 'string') {
      errors.push('Valid userId is required')
    }

    if (!context.operation) {
      errors.push('Operation type is required')
    }

    if (context.requestedAnalyses !== undefined) {
      if (typeof context.requestedAnalyses !== 'number' || context.requestedAnalyses < 0) {
        errors.push('requestedAnalyses must be a non-negative number')
      }
    }

    if (context.targetDate && !(context.targetDate instanceof Date)) {
      errors.push('targetDate must be a valid Date object')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Validates quota record data integrity
   */
  static validateQuotaRecord(record: Partial<DailyQuotaRecord>): QuotaValidationResult {
    const validation = QuotaCalculator.validateQuotaRecord(record)
    
    return {
      isValid: validation.isValid,
      errors: validation.errors,
      warnings: [],
      canProceed: validation.isValid
    }
  }

  /**
   * Validates multiple quota records for consistency
   */
  static validateQuotaRecords(records: DailyQuotaRecord[]): QuotaValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    // Check for duplicates (same user + date)
    const recordKeys = new Set<string>()
    const duplicates = new Set<string>()

    records.forEach(record => {
      const key = `${record.user_id}_${record.quota_date}`
      if (recordKeys.has(key)) {
        duplicates.add(key)
      }
      recordKeys.add(key)
    })

    if (duplicates.size > 0) {
      errors.push(`Duplicate records found for: ${Array.from(duplicates).join(', ')}`)
    }

    // Validate individual records
    records.forEach((record, index) => {
      const recordValidation = this.validateQuotaRecord(record)
      if (!recordValidation.isValid) {
        errors.push(`Record ${index}: ${recordValidation.errors.join(', ')}`)
      }
    })

    // Check for suspicious patterns
    const highUsageRecords = records.filter(record => record.analysis_count > QUOTA_CONFIG.DAILY_LIMIT)
    if (highUsageRecords.length > 0) {
      warnings.push(`${highUsageRecords.length} records exceed daily limit`)
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      canProceed: errors.length === 0
    }
  }

  /**
   * Validates quota configuration parameters
   */
  static validateQuotaConfiguration(config: {
    dailyLimit?: number
    resetHour?: number
    resetMinute?: number
  }): QuotaValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    if (config.dailyLimit !== undefined) {
      if (typeof config.dailyLimit !== 'number' || config.dailyLimit <= 0) {
        errors.push('dailyLimit must be a positive number')
      } else if (config.dailyLimit > 100) {
        warnings.push('dailyLimit is very high (>100)')
      }
    }

    if (config.resetHour !== undefined) {
      if (typeof config.resetHour !== 'number' || config.resetHour < 0 || config.resetHour > 23) {
        errors.push('resetHour must be between 0 and 23')
      }
    }

    if (config.resetMinute !== undefined) {
      if (typeof config.resetMinute !== 'number' || config.resetMinute < 0 || config.resetMinute > 59) {
        errors.push('resetMinute must be between 0 and 59')
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      canProceed: errors.length === 0
    }
  }

  /**
   * Validates user permissions for quota operations
   */
  static validateUserPermissions(
    userId: string,
    operation: QuotaOperation,
    permissions: {
      isAdmin?: boolean
      canBypassLimits?: boolean
      canViewQuota?: boolean
      canModifyQuota?: boolean
    }
  ): QuotaValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    const requiredPermissions: Record<QuotaOperation, string[]> = {
      'analysis_request': ['canViewQuota'],
      'quota_check': ['canViewQuota'],
      'quota_reset': ['canModifyQuota'],
      'quota_override': ['isAdmin', 'canBypassLimits'],
      'usage_increment': ['canModifyQuota']
    }

    const required = requiredPermissions[operation] || []
    
    for (const permission of required) {
      if (!permissions[permission as keyof typeof permissions]) {
        errors.push(`Missing permission: ${permission}`)
      }
    }

    // Additional security warnings
    if (operation === 'quota_override' && !permissions.isAdmin) {
      warnings.push('Quota override without admin permissions is highly restricted')
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      canProceed: errors.length === 0
    }
  }
}

/**
 * Quick validation helpers for common scenarios
 */
export const QuotaValidationHelpers = {
  /**
   * Quick check if user can perform analysis
   */
  async canUserAnalyze(
    userId: string,
    currentRecords: DailyQuotaRecord[],
    dailyLimit: number = QUOTA_CONFIG.DAILY_LIMIT
  ): Promise<boolean> {
    const validation = await QuotaValidator.validateOperation({
      userId,
      operation: 'analysis_request',
      currentRecords
    }, dailyLimit)
    
    return validation.canProceed
  },

  /**
   * Quick quota status check
   */
  async getQuotaStatus(
    userId: string,
    currentRecords: DailyQuotaRecord[],
    dailyLimit: number = QUOTA_CONFIG.DAILY_LIMIT
  ) {
    const validation = await QuotaValidator.validateOperation({
      userId,
      operation: 'quota_check',
      currentRecords
    }, dailyLimit)
    
    return validation.quotaInfo
  },

  /**
   * Validate and increment usage safely
   */
  async validateAndIncrement(
    userId: string,
    currentRecords: DailyQuotaRecord[],
    incrementBy: number = 1,
    dailyLimit: number = QUOTA_CONFIG.DAILY_LIMIT
  ): Promise<QuotaValidationResult> {
    return QuotaValidator.validateOperation({
      userId,
      operation: 'usage_increment',
      requestedAnalyses: incrementBy,
      currentRecords
    }, dailyLimit)
  }
}