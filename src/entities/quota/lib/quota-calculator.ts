/**
 * Quota Calculation Utilities (Task T083)
 * 
 * Implements quota calculation logic for daily analysis limits
 * following Feature-Sliced Design principles and business rules
 */

/**
 * Quota configuration constants
 */
export const QUOTA_CONFIG = {
  DAILY_LIMIT: 3,
  RESET_HOUR: 0, // Midnight UTC
  RESET_MINUTE: 0,
  RESET_SECOND: 0
} as const

/**
 * Quota calculation result interface
 */
export interface QuotaCalculation {
  currentUsage: number
  dailyLimit: number
  remainingAnalyses: number
  quotaStatus: 'active' | 'exceeded' | 'reset_pending'
  resetTime: Date
  usagePercentage: number
  canPerformAnalysis: boolean
}

/**
 * Daily quota record interface (aligned with database schema)
 */
export interface DailyQuotaRecord {
  user_id: string
  date: string  // Changed from quota_date to match schema
  free_analyses_used: number  // Changed from free_analyses_used to match schema
  paid_analyses_used?: number
  free_analyses_limit?: number
  created_at?: Date
  updated_at?: Date
}

/**
 * Quota calculation utilities
 */
export class QuotaCalculator {
  /**
   * Calculates current quota status for a user
   */
  static calculateQuotaStatus(
    dailyRecords: DailyQuotaRecord[],
    targetDate: Date = new Date(),
    dailyLimit: number = QUOTA_CONFIG.DAILY_LIMIT
  ): QuotaCalculation {
    const dateString = this.getDateString(targetDate)
    
    // Find today's record
    const todayRecord = dailyRecords.find(record => record.date === dateString)
    const currentUsage = todayRecord?.free_analyses_used || 0
    
    // Calculate remaining analyses
    const remainingAnalyses = Math.max(0, dailyLimit - currentUsage)
    
    // Determine quota status
    let quotaStatus: QuotaCalculation['quotaStatus'] = 'active'
    if (currentUsage >= dailyLimit) {
      quotaStatus = 'exceeded'
    }
    
    // Calculate next reset time
    const resetTime = this.getNextResetTime(targetDate)
    
    // Calculate usage percentage
    const usagePercentage = Math.min(100, Math.round((currentUsage / dailyLimit) * 100))
    
    return {
      currentUsage,
      dailyLimit,
      remainingAnalyses,
      quotaStatus,
      resetTime,
      usagePercentage,
      canPerformAnalysis: remainingAnalyses > 0
    }
  }

  /**
   * Calculates quota for multiple days (for analytics)
   */
  static calculateMultiDayQuota(
    dailyRecords: DailyQuotaRecord[],
    startDate: Date,
    endDate: Date,
    dailyLimit: number = QUOTA_CONFIG.DAILY_LIMIT
  ): Array<QuotaCalculation & { date: string }> {
    const results: Array<QuotaCalculation & { date: string }> = []
    const currentDate = new Date(startDate)
    
    while (currentDate <= endDate) {
      const calculation = this.calculateQuotaStatus(dailyRecords, currentDate, dailyLimit)
      results.push({
        ...calculation,
        date: this.getDateString(currentDate)
      })
      currentDate.setDate(currentDate.getDate() + 1)
    }
    
    return results
  }

  /**
   * Increments usage count for a user
   */
  static incrementUsage(
    currentRecord: DailyQuotaRecord | null,
    userId: string,
    targetDate: Date = new Date()
  ): DailyQuotaRecord {
    const dateString = this.getDateString(targetDate)
    
    if (currentRecord && currentRecord.date === dateString) {
      return {
        ...currentRecord,
        free_analyses_used: currentRecord.free_analyses_used + 1,
        updated_at: new Date()
      }
    }

    // Create new record for the day
    return {
      user_id: userId,
      date: dateString,
      free_analyses_used: 1,
      created_at: new Date(),
      updated_at: new Date()
    }
  }

  /**
   * Validates if a user can perform an analysis
   */
  static canPerformAnalysis(
    dailyRecords: DailyQuotaRecord[],
    targetDate: Date = new Date(),
    dailyLimit: number = QUOTA_CONFIG.DAILY_LIMIT
  ): { canPerform: boolean; reason?: string; quotaInfo: QuotaCalculation } {
    const quotaInfo = this.calculateQuotaStatus(dailyRecords, targetDate, dailyLimit)
    
    if (!quotaInfo.canPerformAnalysis) {
      return {
        canPerform: false,
        reason: 'Daily quota limit exceeded',
        quotaInfo
      }
    }
    
    return {
      canPerform: true,
      quotaInfo
    }
  }

  /**
   * Gets the date string in YYYY-MM-DD format
   */
  static getDateString(date: Date): string {
    return date.toISOString().split('T')[0]
  }

  /**
   * Gets the next quota reset time
   */
  static getNextResetTime(currentDate: Date = new Date()): Date {
    const resetTime = new Date(currentDate)
    resetTime.setHours(QUOTA_CONFIG.RESET_HOUR, QUOTA_CONFIG.RESET_MINUTE, QUOTA_CONFIG.RESET_SECOND, 0)
    
    // If reset time has passed today, set to tomorrow
    if (resetTime <= currentDate) {
      resetTime.setDate(resetTime.getDate() + 1)
    }
    
    return resetTime
  }

  /**
   * Gets time until next quota reset in milliseconds
   */
  static getTimeUntilReset(currentDate: Date = new Date()): number {
    const resetTime = this.getNextResetTime(currentDate)
    return resetTime.getTime() - currentDate.getTime()
  }

  /**
   * Checks if a date is today
   */
  static isToday(date: Date, referenceDate: Date = new Date()): boolean {
    return this.getDateString(date) === this.getDateString(referenceDate)
  }

  /**
   * Gets quota usage statistics for a date range
   */
  static getUsageStatistics(
    dailyRecords: DailyQuotaRecord[],
    startDate: Date,
    endDate: Date,
    dailyLimit: number = QUOTA_CONFIG.DAILY_LIMIT
  ) {
    const filteredRecords = dailyRecords.filter(record => {
      const recordDate = new Date(record.date)
      return recordDate >= startDate && recordDate <= endDate
    })

    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
    const daysWithUsage = filteredRecords.length
    const totalUsage = filteredRecords.reduce((sum, record) => sum + record.free_analyses_used, 0)
    const totalPossibleUsage = totalDays * dailyLimit
    const averageDailyUsage = daysWithUsage > 0 ? totalUsage / daysWithUsage : 0
    const peakUsage = filteredRecords.reduce((max, record) => Math.max(max, record.free_analyses_used), 0)
    const daysAtLimit = filteredRecords.filter(record => record.free_analyses_used >= dailyLimit).length

    return {
      totalDays,
      daysWithUsage,
      daysWithoutUsage: totalDays - daysWithUsage,
      totalUsage,
      totalPossibleUsage,
      averageDailyUsage: Math.round(averageDailyUsage * 100) / 100,
      peakUsage,
      daysAtLimit,
      utilizationRate: Math.round((totalUsage / totalPossibleUsage) * 100),
      quotaExceededDays: daysAtLimit
    }
  }

  /**
   * Predicts quota usage based on historical data
   */
  static predictUsage(
    dailyRecords: DailyQuotaRecord[],
    predictionDays: number = 7
  ): Array<{ date: string; predictedUsage: number; confidence: number }> {
    if (dailyRecords.length === 0) {
      return []
    }

    // Simple moving average prediction
    const recentRecords = dailyRecords.slice(-7) // Last 7 days
    const averageUsage = recentRecords.reduce((sum, record) => sum + record.free_analyses_used, 0) / recentRecords.length
    
    // Calculate confidence based on data consistency
    const variance = recentRecords.reduce((sum, record) => {
      return sum + Math.pow(record.free_analyses_used - averageUsage, 2)
    }, 0) / recentRecords.length
    
    const confidence = Math.max(0, Math.min(100, 100 - (variance * 10)))

    const predictions: Array<{ date: string; predictedUsage: number; confidence: number }> = []
    const startDate = new Date()
    startDate.setDate(startDate.getDate() + 1) // Start from tomorrow

    for (let i = 0; i < predictionDays; i++) {
      const predictionDate = new Date(startDate)
      predictionDate.setDate(predictionDate.getDate() + i)
      
      predictions.push({
        date: this.getDateString(predictionDate),
        predictedUsage: Math.round(averageUsage),
        confidence: Math.round(confidence)
      })
    }

    return predictions
  }

  /**
   * Validates quota record data
   */
  static validateQuotaRecord(record: Partial<DailyQuotaRecord>): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!record.user_id || typeof record.user_id !== 'string') {
      errors.push('user_id is required and must be a string')
    }

    if (!record.date || typeof record.date !== 'string') {
      errors.push('date is required and must be a string')
    } else if (!/^\d{4}-\d{2}-\d{2}$/.test(record.date)) {
      errors.push('date must be in YYYY-MM-DD format')
    }

    if (record.free_analyses_used !== undefined) {
      if (typeof record.free_analyses_used !== 'number' || record.free_analyses_used < 0) {
        errors.push('free_analyses_used must be a non-negative number')
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Merges multiple quota records for the same day
   */
  static mergeDailyRecords(records: DailyQuotaRecord[]): DailyQuotaRecord[] {
    const recordMap = new Map<string, DailyQuotaRecord>()

    records.forEach(record => {
      const key = `${record.user_id}_${record.date}`
      const existing = recordMap.get(key)

      if (existing) {
        recordMap.set(key, {
          ...existing,
          free_analyses_used: existing.free_analyses_used + record.free_analyses_used,
          updated_at: new Date()
        })
      } else {
        recordMap.set(key, { ...record })
      }
    })

    return Array.from(recordMap.values())
  }
}

/**
 * Quota enforcement utilities
 */
export class QuotaEnforcer {
  /**
   * Enforces quota limits before allowing an operation
   */
  static async enforceQuota(
    userId: string,
    getQuotaRecords: (userId: string) => Promise<DailyQuotaRecord[]>,
    dailyLimit: number = QUOTA_CONFIG.DAILY_LIMIT
  ): Promise<{ allowed: boolean; quotaInfo: QuotaCalculation; error?: string }> {
    try {
      const records = await getQuotaRecords(userId)
      const validation = QuotaCalculator.canPerformAnalysis(records, new Date(), dailyLimit)

      return {
        allowed: validation.canPerform,
        quotaInfo: validation.quotaInfo,
        error: validation.reason
      }
    } catch (error) {
      return {
        allowed: false,
        quotaInfo: {
          currentUsage: 0,
          dailyLimit,
          remainingAnalyses: 0,
          quotaStatus: 'exceeded',
          resetTime: QuotaCalculator.getNextResetTime(),
          usagePercentage: 0,
          canPerformAnalysis: false
        },
        error: 'Failed to check quota status'
      }
    }
  }

  /**
   * Records usage after a successful operation
   */
  static async recordUsage(
    userId: string,
    updateQuotaRecord: (record: DailyQuotaRecord) => Promise<void>,
    getCurrentRecord: (userId: string, date: string) => Promise<DailyQuotaRecord | null>
  ): Promise<{ success: boolean; newRecord: DailyQuotaRecord; error?: string }> {
    try {
      const today = new Date()
      const dateString = QuotaCalculator.getDateString(today)
      const currentRecord = await getCurrentRecord(userId, dateString)
      
      const newRecord = QuotaCalculator.incrementUsage(currentRecord, userId, today)
      await updateQuotaRecord(newRecord)

      return {
        success: true,
        newRecord
      }
    } catch (error) {
      return {
        success: false,
        newRecord: {
          user_id: userId,
          date: QuotaCalculator.getDateString(new Date()),
          free_analyses_used: 0
        },
        error: error instanceof Error ? error.message : 'Failed to record usage'
      }
    }
  }
}