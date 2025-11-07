/**
 * ⚠️ LEGACY QUOTA SERVICE - Uses outdated quota_usage table
 * 
 * This service uses the legacy quota_usage table schema which is being phased out.
 * For new code, use:
 * - QuotaCalculator and QuotaEnforcer from @/entities/quota/lib/quota-calculator
 * - daily_quotas table (date, free_analyses_used fields)
 * 
 * This file is kept for backward compatibility during migration.
 */

import { createServerClient } from '@/shared/config/database'
import type { QuotaUsage, QUOTA_LIMITS } from '@/entities/quota'

export interface QuotaCheckResult {
  canProceed: boolean
  daily: {
    current: number
    limit: number
    remaining: number
  }
  monthly: {
    current: number
    limit: number
    remaining: number
  }
}

export class QuotaService {
  private supabase = createServerClient()
  private dailyLimit = 3
  private monthlyLimit = 10

  async checkUserQuota(userId: string): Promise<QuotaCheckResult> {
    // Use the database function to check quota
    const { data: dailyResult, error: dailyError } = await this.supabase
      .rpc('check_quota_limit', {
        user_uuid: userId,
        quota_period: 'daily'
      })

    if (dailyError) {
      throw new Error(`Failed to check daily quota: ${dailyError.message}`)
    }

    const { data: monthlyResult, error: monthlyError } = await this.supabase
      .rpc('check_quota_limit', {
        user_uuid: userId,
        quota_period: 'monthly'
      })

    if (monthlyError) {
      throw new Error(`Failed to check monthly quota: ${monthlyError.message}`)
    }

    const daily = dailyResult[0] || { current_count: 0, limit_reached: false, remaining: this.dailyLimit }
    const monthly = monthlyResult[0] || { current_count: 0, limit_reached: false, remaining: this.monthlyLimit }

    return {
      canProceed: !daily.limit_reached && !monthly.limit_reached,
      daily: {
        current: daily.current_count,
        limit: this.dailyLimit,
        remaining: daily.remaining,
      },
      monthly: {
        current: monthly.current_count,
        limit: this.monthlyLimit,
        remaining: monthly.remaining,
      },
    }
  }

  async incrementUsage(userId: string): Promise<void> {
    const now = new Date().toISOString()

    // Get current usage first
    const { data: currentUsage, error: fetchError } = await this.supabase
      .from('quota_usage')
      .select('analysis_count, period')
      .eq('user_id', userId)

    if (fetchError) {
      throw new Error(`Failed to fetch current quota: ${fetchError.message}`)
    }

    // Increment daily usage
    const dailyUsage = currentUsage?.find(q => q.period === 'daily')
    const { error: dailyError } = await this.supabase
      .from('quota_usage')
      .update({
        analysis_count: (dailyUsage?.analysis_count || 0) + 1,
        updated_at: now,
      })
      .eq('user_id', userId)
      .eq('period', 'daily')

    if (dailyError) {
      throw new Error(`Failed to update daily quota: ${dailyError.message}`)
    }

    // Increment monthly usage
    const monthlyUsage = currentUsage?.find(q => q.period === 'monthly')
    const { error: monthlyError } = await this.supabase
      .from('quota_usage')
      .update({
        analysis_count: (monthlyUsage?.analysis_count || 0) + 1,
        updated_at: now,
      })
      .eq('user_id', userId)
      .eq('period', 'monthly')

    if (monthlyError) {
      throw new Error(`Failed to update monthly quota: ${monthlyError.message}`)
    }
  }

  async resetDailyQuota(userId: string): Promise<void> {
    const now = new Date().toISOString()

    const { error } = await this.supabase
      .from('quota_usage')
      .update({
        analysis_count: 0,
        last_reset_at: now,
        updated_at: now,
      })
      .eq('user_id', userId)
      .eq('period', 'daily')

    if (error) {
      throw new Error(`Failed to reset daily quota: ${error.message}`)
    }
  }

  async resetMonthlyQuota(userId: string): Promise<void> {
    const now = new Date().toISOString()

    const { error } = await this.supabase
      .from('quota_usage')
      .update({
        analysis_count: 0,
        last_reset_at: now,
        updated_at: now,
      })
      .eq('user_id', userId)
      .eq('period', 'monthly')

    if (error) {
      throw new Error(`Failed to reset monthly quota: ${error.message}`)
    }
  }

  async getUserQuotaUsage(userId: string): Promise<QuotaUsage[]> {
    const { data, error } = await this.supabase
      .from('quota_usage')
      .select('*')
      .eq('user_id', userId)
      .order('period')

    if (error) {
      throw new Error(`Failed to fetch quota usage: ${error.message}`)
    }

    return data || []
  }
}

export const quotaService = new QuotaService()