export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          name: string | null
          avatar_url: string | null
          provider: 'google' | 'naver'
          provider_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          name?: string | null
          avatar_url?: string | null
          provider: 'google' | 'naver'
          provider_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string | null
          avatar_url?: string | null
          provider?: 'google' | 'naver'
          provider_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      analysis_sessions: {
        Row: {
          id: string
          user_id: string
          title: string
          status: 'pending' | 'processing' | 'completed' | 'failed'
          created_at: string
          updated_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          status?: 'pending' | 'processing' | 'completed' | 'failed'
          created_at?: string
          updated_at?: string
          completed_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          status?: 'pending' | 'processing' | 'completed' | 'failed'
          created_at?: string
          updated_at?: string
          completed_at?: string | null
        }
      }
      analysis_results: {
        Row: {
          id: string
          session_id: string
          overall_risk_score: number
          summary: string
          issues_found: Json
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          overall_risk_score: number
          summary: string
          issues_found?: Json
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          overall_risk_score?: number
          summary?: string
          issues_found?: Json
          metadata?: Json
          created_at?: string
        }
      }
      quota_usage: {
        Row: {
          id: string
          user_id: string
          analysis_count: number
          last_reset_at: string
          period: 'daily' | 'monthly'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          analysis_count?: number
          last_reset_at?: string
          period: 'daily' | 'monthly'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          analysis_count?: number
          last_reset_at?: string
          period?: 'daily' | 'monthly'
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_quota_limit: {
        Args: {
          user_uuid: string
          quota_period: string
        }
        Returns: {
          current_count: number
          limit_reached: boolean
          remaining: number
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}