// ⚠️ This interface is for the legacy quota_usage table
// For new code, use DailyQuotaRecord from quota-calculator.ts
export interface QuotaUsage {
  id: string
  user_id: string
  analysis_count: number  // Legacy field - use free_analyses_used in new code
  last_reset_at: string
  period: 'daily' | 'monthly'
  created_at: string
  updated_at: string
}

export interface QuotaLimit {
  period: 'daily' | 'monthly'
  free_tier_limit: number
  premium_tier_limit: number
}

// ⚠️ Legacy interfaces - for backward compatibility only
export interface QuotaUsageCreateData {
  user_id: string
  period: 'daily' | 'monthly'
}

export interface QuotaUsageUpdateData {
  analysis_count?: number  // Legacy field - use free_analyses_used in new code
  last_reset_at?: string
  updated_at?: string
}

export const QUOTA_LIMITS: QuotaLimit[] = [
  {
    period: 'daily',
    free_tier_limit: 3,
    premium_tier_limit: 50,
  },
  {
    period: 'monthly',
    free_tier_limit: 10,
    premium_tier_limit: 500,
  },
]