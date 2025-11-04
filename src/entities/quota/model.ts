export interface QuotaUsage {
  id: string
  user_id: string
  analysis_count: number
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

export interface QuotaUsageCreateData {
  user_id: string
  period: 'daily' | 'monthly'
}

export interface QuotaUsageUpdateData {
  analysis_count?: number
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