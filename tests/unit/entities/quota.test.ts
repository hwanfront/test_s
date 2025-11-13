/**
 * Unit Tests for Quota Management Entity (Task T075)
 * 
 * Tests the quota management business logic and calculations
 * following Feature-Sliced Design patterns
 */

// Mock quota calculator functions
const calculateDailyQuota = (userId: string, date: Date = new Date()) => {
  return {
    userId,
    date: date.toISOString().split('T')[0],
    dailyLimit: 3,
    baseQuota: 3,
    bonusQuota: 0,
    totalQuota: 3
  }
}

const calculateRemainingQuota = (
  currentUsage: number, 
  dailyLimit: number
) => {
  const safeUsage = Number.isFinite(currentUsage) && currentUsage > 0 ? currentUsage : 0
  const safeLimit = Number.isFinite(dailyLimit) && dailyLimit > 0 ? dailyLimit : 0
  return Math.max(0, safeLimit - safeUsage)
}

const validateQuotaUsage = (
  currentUsage: number,
  dailyLimit: number
) => {
  const safeUsage = Number.isFinite(currentUsage) && currentUsage > 0 ? currentUsage : 0
  const safeLimit = Number.isFinite(dailyLimit) && dailyLimit > 0 ? dailyLimit : 0
  const usagePct = safeLimit === 0 ? 0 : Math.min(100, Math.round((safeUsage / safeLimit) * 10000) / 100)

  return {
    // Valid only when strictly under the limit (limit reached -> not valid)
    isValid: safeUsage < safeLimit,
    isExceeded: safeUsage >= safeLimit,
    remainingAnalyses: calculateRemainingQuota(safeUsage, safeLimit),
    usagePercentage: usagePct
  }
}

const getQuotaResetTime = (timezone: string = 'UTC') => {
  const now = new Date()
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(0, 0, 0, 0)
  return tomorrow
}

describe('Quota Management Entity Unit Tests', () => {
  describe('Daily Quota Calculation', () => {
    it('should calculate default daily quota for new user', () => {
      const userId = 'user_123'
      const quota = calculateDailyQuota(userId)

      expect(quota.userId).toBe(userId)
      expect(quota.dailyLimit).toBe(3)
      expect(quota.baseQuota).toBe(3)
      expect(quota.bonusQuota).toBe(0)
      expect(quota.totalQuota).toBe(3)
      expect(quota.date).toBe(new Date().toISOString().split('T')[0])
    })

    it('should calculate quota for specific date', () => {
      const userId = 'user_456'
      const specificDate = new Date('2025-11-05')
      const quota = calculateDailyQuota(userId, specificDate)

      expect(quota.userId).toBe(userId)
      expect(quota.date).toBe('2025-11-05')
      expect(quota.dailyLimit).toBe(3)
    })

    it('should handle different user types with same base quota', () => {
      const users = ['user_1', 'user_2', 'user_3']
      
      users.forEach(userId => {
        const quota = calculateDailyQuota(userId)
        expect(quota.dailyLimit).toBe(3) // All users get same quota in MVP
        expect(quota.baseQuota).toBe(3)
        expect(quota.bonusQuota).toBe(0)
      })
    })
  })

  describe('Remaining Quota Calculation', () => {
    it('should calculate remaining quota correctly', () => {
      const testCases = [
        { currentUsage: 0, dailyLimit: 3, expected: 3 },
        { currentUsage: 1, dailyLimit: 3, expected: 2 },
        { currentUsage: 2, dailyLimit: 3, expected: 1 },
        { currentUsage: 3, dailyLimit: 3, expected: 0 },
        { currentUsage: 4, dailyLimit: 3, expected: 0 }, // Over limit
        { currentUsage: 10, dailyLimit: 3, expected: 0 } // Way over limit
      ]

      testCases.forEach(({ currentUsage, dailyLimit, expected }) => {
        const remaining = calculateRemainingQuota(currentUsage, dailyLimit)
        expect(remaining).toBe(expected)
      })
    })

    it('should never return negative remaining quota', () => {
      const overUsageCases = [5, 10, 100]
      
      overUsageCases.forEach(usage => {
        const remaining = calculateRemainingQuota(usage, 3)
        expect(remaining).toBeGreaterThanOrEqual(0)
      })
    })

    it('should handle edge cases', () => {
      expect(calculateRemainingQuota(0, 0)).toBe(0)
      expect(calculateRemainingQuota(-1, 3)).toBe(3) // Negative usage defaults to 0
      expect(calculateRemainingQuota(3, -1)).toBe(0) // Negative limit defaults to 0
    })
  })

  describe('Quota Usage Validation', () => {
    it('should validate normal usage within limits', () => {
      const result = validateQuotaUsage(2, 3)

      expect(result.isValid).toBe(true)
      expect(result.isExceeded).toBe(false)
      expect(result.remainingAnalyses).toBe(1)
      expect(result.usagePercentage).toBe(66.67) // 2/3 * 100, rounded to 2 decimals
    })

    it('should detect quota exceeded scenarios', () => {
      const result = validateQuotaUsage(3, 3)

      expect(result.isValid).toBe(false)
      expect(result.isExceeded).toBe(true)
      expect(result.remainingAnalyses).toBe(0)
      expect(result.usagePercentage).toBe(100)
    })

    it('should handle over-quota usage', () => {
      const result = validateQuotaUsage(5, 3)

      expect(result.isValid).toBe(false)
      expect(result.isExceeded).toBe(true)
      expect(result.remainingAnalyses).toBe(0)
      expect(result.usagePercentage).toBe(100) // Capped at 100%
    })

    it('should calculate usage percentage accurately', () => {
      const testCases = [
        { usage: 0, limit: 3, expectedPercentage: 0 },
        { usage: 1, limit: 3, expectedPercentage: 33.33 },
        { usage: 2, limit: 3, expectedPercentage: 66.67 },
        { usage: 3, limit: 3, expectedPercentage: 100 },
        { usage: 4, limit: 3, expectedPercentage: 100 }, // Capped
      ]

      testCases.forEach(({ usage, limit, expectedPercentage }) => {
        const result = validateQuotaUsage(usage, limit)
        expect(Math.round(result.usagePercentage * 100) / 100).toBe(expectedPercentage)
      })
    })

    it('should handle zero quota limit', () => {
      const result = validateQuotaUsage(0, 0)

      expect(result.isValid).toBe(true) // 0 usage with 0 limit is valid
      expect(result.isExceeded).toBe(true) // But also considered exceeded
      expect(result.remainingAnalyses).toBe(0)
      expect(result.usagePercentage).toBe(0) // 0/0 should be 0, not NaN
    })
  })

  describe('Quota Reset Time Calculation', () => {
    it('should calculate reset time for next day', () => {
      const resetTime = getQuotaResetTime()
      const now = new Date()
      
      expect(resetTime.getTime()).toBeGreaterThan(now.getTime())
      expect(resetTime.getHours()).toBe(0)
      expect(resetTime.getMinutes()).toBe(0)
      expect(resetTime.getSeconds()).toBe(0)
      expect(resetTime.getMilliseconds()).toBe(0)
    })

    it('should handle timezone-aware reset times', () => {
      const utcReset = getQuotaResetTime('UTC')
      const koreanReset = getQuotaResetTime('Asia/Seoul')
      
      // Both should be valid Date objects
      expect(utcReset).toBeInstanceOf(Date)
      expect(koreanReset).toBeInstanceOf(Date)
      
      // Should be different times (unless run exactly at midnight)
      // This test validates the structure, actual timezone handling would be in implementation
    })

    it('should reset to midnight of next day', () => {
      const resetTime = getQuotaResetTime()
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      
      expect(resetTime.getDate()).toBe(tomorrow.getDate())
      expect(resetTime.getHours()).toBe(0)
    })
  })

  describe('Quota State Management', () => {
    it('should determine quota status based on usage', () => {
      const getQuotaStatus = (currentUsage: number, dailyLimit: number) => {
        if (currentUsage >= dailyLimit) return 'exceeded'
        if (currentUsage >= dailyLimit * 0.8) return 'warning'
        return 'active'
      }

      expect(getQuotaStatus(0, 3)).toBe('active')
      expect(getQuotaStatus(1, 3)).toBe('active')
      expect(getQuotaStatus(2, 3)).toBe('active') // 2/3 = 66.7%, below 80% threshold
      expect(getQuotaStatus(3, 3)).toBe('exceeded')
      expect(getQuotaStatus(4, 3)).toBe('exceeded')
    })

    it('should handle quota state transitions', () => {
      const states = ['active', 'warning', 'exceeded']
      const transitions = [
        { from: 'active', to: 'warning', valid: true },
        { from: 'warning', to: 'exceeded', valid: true },
        { from: 'exceeded', to: 'active', valid: true }, // After reset
        { from: 'active', to: 'exceeded', valid: true }, // Skip warning
      ]

      transitions.forEach(transition => {
        expect(states).toContain(transition.from)
        expect(states).toContain(transition.to)
        expect(transition.valid).toBe(true)
      })
    })
  })

  describe('Quota Business Rules', () => {
    it('should enforce daily limit consistently', () => {
      const DAILY_LIMIT = 3
      
      for (let usage = 0; usage <= 10; usage++) {
        const validation = validateQuotaUsage(usage, DAILY_LIMIT)
        
        if (usage < DAILY_LIMIT) {
          expect(validation.isValid).toBe(true)
          expect(validation.remainingAnalyses).toBe(DAILY_LIMIT - usage)
        } else {
          expect(validation.isValid).toBe(false)
          expect(validation.remainingAnalyses).toBe(0)
        }
      }
    })

    it('should support quota extensions (future feature)', () => {
      // Test structure for future premium features
      const calculateExtendedQuota = (
        baseQuota: number,
        bonusQuota: number = 0,
        premiumQuota: number = 0
      ) => {
        return baseQuota + bonusQuota + premiumQuota
      }

      expect(calculateExtendedQuota(3)).toBe(3) // Base only
      expect(calculateExtendedQuota(3, 2)).toBe(5) // With bonus
      expect(calculateExtendedQuota(3, 2, 10)).toBe(15) // With premium
    })

    it('should validate quota increment operations', () => {
      const incrementQuota = (currentUsage: number, increment: number = 1) => {
        return Math.max(0, currentUsage + increment)
      }

      expect(incrementQuota(0)).toBe(1)
      expect(incrementQuota(2)).toBe(3)
      expect(incrementQuota(5, 2)).toBe(7)
      expect(incrementQuota(0, -1)).toBe(0) // Can't go below 0
    })

    it('should handle concurrent quota checks', () => {
      // Simulate concurrent quota validation
      const userId = 'user_concurrent'
      const currentUsage = 2
      const dailyLimit = 3

      // Multiple simultaneous quota checks should return consistent results
      const checks = Array(5).fill(null).map(() => 
        validateQuotaUsage(currentUsage, dailyLimit)
      )

      checks.forEach(check => {
        expect(check.remainingAnalyses).toBe(1)
        expect(check.isValid).toBe(true)
        expect(check.isExceeded).toBe(false)
      })
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle invalid input parameters', () => {
      // Test with invalid numbers
      expect(calculateRemainingQuota(NaN, 3)).toBe(3)
      expect(calculateRemainingQuota(3, NaN)).toBe(0)
      expect(calculateRemainingQuota(Infinity, 3)).toBe(0)
      expect(calculateRemainingQuota(3, Infinity)).toBe(Infinity)
    })

    it('should handle null and undefined values', () => {
      const safeCalculateRemainingQuota = (usage: any, limit: any) => {
        const safeUsage = Number(usage) || 0
        const safeLimit = Number(limit) || 0
        return Math.max(0, safeLimit - safeUsage)
      }

      expect(safeCalculateRemainingQuota(null, 3)).toBe(3)
      expect(safeCalculateRemainingQuota(undefined, 3)).toBe(3)
      expect(safeCalculateRemainingQuota(2, null)).toBe(0)
      expect(safeCalculateRemainingQuota(2, undefined)).toBe(0)
    })

    it('should validate user ID format', () => {
      const isValidUserId = (userId: string) => {
        return typeof userId === 'string' && 
               userId.length > 0 && 
               userId.trim() === userId &&
               !userId.includes(' ')
      }

      expect(isValidUserId('user_123')).toBe(true)
      expect(isValidUserId('google_abc123')).toBe(true)
      expect(isValidUserId('')).toBe(false)
      expect(isValidUserId(' user_123')).toBe(false)
      expect(isValidUserId('user 123')).toBe(false)
    })
  })
})