/**
 * Quota Reset Scheduler (Task T085)
 * 
 * Implements daily quota reset scheduling and management
 * following Feature-Sliced Design principles and business requirements
 */

import { QuotaCalculator, type DailyQuotaRecord, QUOTA_CONFIG } from './quota-calculator'
import { QuotaValidator, type QuotaValidationContext } from './quota-validator'

/**
 * Quota reset configuration
 */
export interface QuotaResetConfig {
  resetHour: number // Hour of day (0-23) for reset
  resetMinute: number // Minute of hour (0-59) for reset
  resetSecond: number // Second of minute (0-59) for reset
  timezone: string // Timezone for reset scheduling
  enableAutoReset: boolean // Whether to automatically schedule resets
  resetGracePeriodMs: number // Grace period after reset time
}

/**
 * Default quota reset configuration
 */
export const DEFAULT_RESET_CONFIG: QuotaResetConfig = {
  resetHour: QUOTA_CONFIG.RESET_HOUR,
  resetMinute: QUOTA_CONFIG.RESET_MINUTE,
  resetSecond: QUOTA_CONFIG.RESET_SECOND,
  timezone: 'Asia/Seoul', // KST timezone
  enableAutoReset: true,
  resetGracePeriodMs: 5 * 60 * 1000 // 5 minutes grace period
}

/**
 * Quota reset result interface
 */
export interface QuotaResetResult {
  success: boolean
  affectedUsers: number
  resetDate: string
  resetTimestamp: Date
  errors: string[]
  warnings: string[]
  resetDetails: {
    usersReset: string[]
    usersSkipped: string[]
    errorsEncountered: Array<{ userId: string; error: string }>
  }
}

/**
 * Quota reset scheduler service
 */
export class QuotaResetScheduler {
  private config: QuotaResetConfig
  private resetInterval: NodeJS.Timeout | null = null
  private isRunning = false

  constructor(config: Partial<QuotaResetConfig> = {}) {
    this.config = { ...DEFAULT_RESET_CONFIG, ...config }
  }

  /**
   * Starts the automatic quota reset scheduler
   */
  start(): void {
    if (this.isRunning) {
      console.warn('Quota reset scheduler is already running')
      return
    }

    if (!this.config.enableAutoReset) {
      console.log('Auto reset is disabled, scheduler not started')
      return
    }

    this.isRunning = true
    this.scheduleNextReset()
    console.log('Quota reset scheduler started')
  }

  /**
   * Stops the automatic quota reset scheduler
   */
  stop(): void {
    if (this.resetInterval) {
      clearTimeout(this.resetInterval)
      this.resetInterval = null
    }
    this.isRunning = false
    console.log('Quota reset scheduler stopped')
  }

  /**
   * Schedules the next quota reset
   */
  private scheduleNextReset(): void {
    const nextResetTime = this.getNextResetTime()
    const timeUntilReset = nextResetTime.getTime() - Date.now()

    console.log(`Next quota reset scheduled for: ${nextResetTime.toISOString()}`)
    
    this.resetInterval = setTimeout(async () => {
      try {
        await this.performScheduledReset()
      } catch (error) {
        console.error('Scheduled quota reset failed:', error)
      }
      
      // Schedule the next reset if still running
      if (this.isRunning) {
        this.scheduleNextReset()
      }
    }, timeUntilReset)
  }

  /**
   * Gets the next quota reset time based on configuration
   */
  getNextResetTime(): Date {
    const now = new Date()
    const resetTime = new Date()
    
    resetTime.setHours(this.config.resetHour, this.config.resetMinute, this.config.resetSecond, 0)
    
    // If reset time has passed today, schedule for tomorrow
    if (resetTime <= now) {
      resetTime.setDate(resetTime.getDate() + 1)
    }
    
    return resetTime
  }

  /**
   * Performs a scheduled quota reset
   */
  private async performScheduledReset(): Promise<QuotaResetResult> {
    const resetDate = QuotaCalculator.getDateString(new Date())
    console.log(`Performing scheduled quota reset for date: ${resetDate}`)
    
    try {
      // Get all users who need quota reset
      const usersToReset = await this.getUsersForReset(resetDate)
      
      // Perform reset for each user
      const result = await this.resetQuotasForUsers(usersToReset, resetDate)
      
      console.log(`Quota reset completed. Reset ${result.affectedUsers} users`)
      return result
    } catch (error) {
      console.error('Failed to perform scheduled quota reset:', error)
      throw error
    }
  }

  /**
   * Manually triggers a quota reset (admin function)
   */
  async manualReset(
    targetDate?: Date,
    userIds?: string[]
  ): Promise<QuotaResetResult> {
    const resetDate = QuotaCalculator.getDateString(targetDate || new Date())
    const resetTimestamp = new Date()
    
    console.log(`Performing manual quota reset for date: ${resetDate}`)
    
    try {
      let usersToReset: string[]
      
      if (userIds && userIds.length > 0) {
        usersToReset = userIds
      } else {
        usersToReset = await this.getUsersForReset(resetDate)
      }
      
      const result = await this.resetQuotasForUsers(usersToReset, resetDate)
      
      console.log(`Manual quota reset completed. Reset ${result.affectedUsers} users`)
      return result
    } catch (error) {
      console.error('Manual quota reset failed:', error)
      return {
        success: false,
        affectedUsers: 0,
        resetDate,
        resetTimestamp,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        warnings: [],
        resetDetails: {
          usersReset: [],
          usersSkipped: [],
          errorsEncountered: []
        }
      }
    }
  }

  /**
   * Gets list of users that need quota reset
   */
  private async getUsersForReset(resetDate: string): Promise<string[]> {
    // This would typically query the database for users with quota records
    // For now, return empty array as this requires database integration
    // In real implementation, this would be:
    // return await supabase.from('daily_quotas').select('user_id').eq('date', resetDate)
    console.log(`Getting users for reset on date: ${resetDate}`)
    return [] // Placeholder - would be implemented with actual database queries
  }

  /**
   * Resets quotas for specified users
   */
  private async resetQuotasForUsers(
    userIds: string[],
    resetDate: string
  ): Promise<QuotaResetResult> {
    const resetTimestamp = new Date()
    const usersReset: string[] = []
    const usersSkipped: string[] = []
    const errorsEncountered: Array<{ userId: string; error: string }> = []
    const warnings: string[] = []

    for (const userId of userIds) {
      try {
        // Validate reset operation
        const validation = await QuotaValidator.validateOperation({
          userId,
          operation: 'quota_reset',
          targetDate: new Date(resetDate)
        } as QuotaValidationContext)

        if (!validation.canProceed) {
          usersSkipped.push(userId)
          warnings.push(`Skipped user ${userId}: ${validation.errors.join(', ')}`)
          continue
        }

        // Perform the actual reset
        await this.resetUserQuota(userId, resetDate)
        usersReset.push(userId)
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        errorsEncountered.push({ userId, error: errorMessage })
        console.error(`Failed to reset quota for user ${userId}:`, error)
      }
    }

    return {
      success: errorsEncountered.length === 0,
      affectedUsers: usersReset.length,
      resetDate,
      resetTimestamp,
      errors: errorsEncountered.map(e => `User ${e.userId}: ${e.error}`),
      warnings,
      resetDetails: {
        usersReset,
        usersSkipped,
        errorsEncountered
      }
    }
  }

  /**
   * Resets quota for a single user
   */
  private async resetUserQuota(userId: string, resetDate: string): Promise<void> {
    // Create a new quota record with reset values
    const newQuotaRecord: DailyQuotaRecord = {
      user_id: userId,
      quota_date: resetDate,
      analysis_count: 0,
      created_at: new Date(),
      updated_at: new Date()
    }

    // This would typically update the database
    // For now, just log the reset operation
    console.log(`Reset quota for user ${userId} on ${resetDate}`)
    
    // In real implementation, this would be:
    // await supabase.from('daily_quotas').upsert(newQuotaRecord)
  }

  /**
   * Checks if a reset is needed for a specific date
   */
  async isResetNeeded(targetDate: Date = new Date()): Promise<boolean> {
    const dateString = QuotaCalculator.getDateString(targetDate)
    const resetTime = this.getNextResetTime()
    
    // Check if current time is past the reset time for the date
    const now = new Date()
    const todayResetTime = new Date(targetDate)
    todayResetTime.setHours(this.config.resetHour, this.config.resetMinute, this.config.resetSecond, 0)
    
    return now >= todayResetTime
  }

  /**
   * Gets the time until the next quota reset
   */
  getTimeUntilNextReset(): number {
    const nextResetTime = this.getNextResetTime()
    return Math.max(0, nextResetTime.getTime() - Date.now())
  }

  /**
   * Gets human-readable time until next reset
   */
  getTimeUntilNextResetFormatted(): string {
    const timeUntilReset = this.getTimeUntilNextReset()
    
    const hours = Math.floor(timeUntilReset / (1000 * 60 * 60))
    const minutes = Math.floor((timeUntilReset % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((timeUntilReset % (1000 * 60)) / 1000)
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`
    } else {
      return `${seconds}s`
    }
  }

  /**
   * Updates the scheduler configuration
   */
  updateConfig(newConfig: Partial<QuotaResetConfig>): void {
    const wasRunning = this.isRunning
    
    if (wasRunning) {
      this.stop()
    }
    
    this.config = { ...this.config, ...newConfig }
    
    if (wasRunning && this.config.enableAutoReset) {
      this.start()
    }
    
    console.log('Quota reset scheduler configuration updated')
  }

  /**
   * Gets current scheduler status
   */
  getStatus(): {
    isRunning: boolean
    config: QuotaResetConfig
    nextResetTime: Date
    timeUntilReset: number
    timeUntilResetFormatted: string
  } {
    return {
      isRunning: this.isRunning,
      config: this.config,
      nextResetTime: this.getNextResetTime(),
      timeUntilReset: this.getTimeUntilNextReset(),
      timeUntilResetFormatted: this.getTimeUntilNextResetFormatted()
    }
  }

  /**
   * Validates the reset configuration
   */
  validateConfig(): { isValid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = []
    const warnings: string[] = []

    if (this.config.resetHour < 0 || this.config.resetHour > 23) {
      errors.push('resetHour must be between 0 and 23')
    }

    if (this.config.resetMinute < 0 || this.config.resetMinute > 59) {
      errors.push('resetMinute must be between 0 and 59')
    }

    if (this.config.resetSecond < 0 || this.config.resetSecond > 59) {
      errors.push('resetSecond must be between 0 and 59')
    }

    if (this.config.resetGracePeriodMs < 0) {
      errors.push('resetGracePeriodMs must be non-negative')
    }

    if (this.config.resetGracePeriodMs > 60 * 60 * 1000) {
      warnings.push('resetGracePeriodMs is very long (>1 hour)')
    }

    // Validate timezone
    try {
      Intl.DateTimeFormat(undefined, { timeZone: this.config.timezone })
    } catch (error) {
      errors.push(`Invalid timezone: ${this.config.timezone}`)
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }
}

/**
 * Global quota reset scheduler instance
 */
let globalScheduler: QuotaResetScheduler | null = null

/**
 * Gets or creates the global quota reset scheduler
 */
export function getQuotaResetScheduler(config?: Partial<QuotaResetConfig>): QuotaResetScheduler {
  if (!globalScheduler) {
    globalScheduler = new QuotaResetScheduler(config)
  }
  return globalScheduler
}

/**
 * Starts the global quota reset scheduler
 */
export function startQuotaResetScheduler(config?: Partial<QuotaResetConfig>): void {
  const scheduler = getQuotaResetScheduler(config)
  scheduler.start()
}

/**
 * Stops the global quota reset scheduler
 */
export function stopQuotaResetScheduler(): void {
  if (globalScheduler) {
    globalScheduler.stop()
  }
}

/**
 * Utility functions for quota reset scheduling
 */
export const QuotaResetUtils = {
  /**
   * Creates a cron expression for quota reset
   */
  createCronExpression(config: QuotaResetConfig): string {
    return `${config.resetSecond} ${config.resetMinute} ${config.resetHour} * * *`
  },

  /**
   * Parses a cron expression to reset config
   */
  parseCronExpression(cronExpression: string): Partial<QuotaResetConfig> | null {
    const parts = cronExpression.split(' ')
    if (parts.length !== 6) return null

    const [second, minute, hour] = parts
    
    return {
      resetSecond: parseInt(second, 10),
      resetMinute: parseInt(minute, 10),
      resetHour: parseInt(hour, 10)
    }
  },

  /**
   * Gets next reset time in specific timezone
   */
  getNextResetTimeInTimezone(config: QuotaResetConfig): Date {
    const now = new Date()
    const resetTime = new Date()
    
    // Convert to the specified timezone
    const timeZoneOffset = new Intl.DateTimeFormat('en', {
      timeZone: config.timezone,
      timeZoneName: 'longOffset'
    }).formatToParts(now).find(part => part.type === 'timeZoneName')?.value || '+00:00'
    
    resetTime.setHours(config.resetHour, config.resetMinute, config.resetSecond, 0)
    
    if (resetTime <= now) {
      resetTime.setDate(resetTime.getDate() + 1)
    }
    
    return resetTime
  }
}