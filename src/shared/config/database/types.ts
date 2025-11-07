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
          is_active: boolean
          last_login_at: string
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
          is_active?: boolean
          last_login_at?: string
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
          is_active?: boolean
          last_login_at?: string
        }
      }
      analysis_sessions: {
        Row: {
          id: string
          user_id: string
          title: string | null
          content_hash: string
          content_length: number
          status: 'processing' | 'completed' | 'failed' | 'expired'
          risk_score: number | null
          risk_level: 'low' | 'medium' | 'high' | 'critical' | null
          confidence_score: number | null
          processing_time_ms: number | null
          created_at: string
          completed_at: string | null
          expires_at: string
          error_message: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title?: string | null
          content_hash: string
          content_length: number
          status?: 'processing' | 'completed' | 'failed' | 'expired'
          risk_score?: number | null
          risk_level?: 'low' | 'medium' | 'high' | 'critical' | null
          confidence_score?: number | null
          processing_time_ms?: number | null
          created_at?: string
          completed_at?: string | null
          expires_at: string
          error_message?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string | null
          content_hash?: string
          content_length?: number
          status?: 'processing' | 'completed' | 'failed' | 'expired'
          risk_score?: number | null
          risk_level?: 'low' | 'medium' | 'high' | 'critical' | null
          confidence_score?: number | null
          processing_time_ms?: number | null
          created_at?: string
          completed_at?: string | null
          expires_at?: string
          error_message?: string | null
          updated_at?: string
        }
      }
      risk_assessments: {
        Row: {
          id: string
          session_id: string
          assessment_id: string
          clause_category: string
          risk_level: 'low' | 'medium' | 'high' | 'critical'
          risk_score: number
          confidence_score: number
          summary: string
          rationale: string
          suggested_action: string | null
          start_position: number
          end_position: number
          source: string
          validation_flags: Json
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          assessment_id: string
          clause_category: string
          risk_level: 'low' | 'medium' | 'high' | 'critical'
          risk_score: number
          confidence_score: number
          summary: string
          rationale: string
          suggested_action?: string | null
          start_position: number
          end_position: number
          source: string
          validation_flags?: Json
          created_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          assessment_id?: string
          clause_category?: string
          risk_level?: 'low' | 'medium' | 'high' | 'critical'
          risk_score?: number
          confidence_score?: number
          summary?: string
          rationale?: string
          suggested_action?: string | null
          start_position?: number
          end_position?: number
          source?: string
          validation_flags?: Json
          created_at?: string
        }
      }
      daily_quotas: {
        Row: {
          id: string
          user_id: string
          date: string
          free_analyses_used: number
          paid_analyses_used: number
          free_analyses_limit: number
          last_reset_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          date: string
          free_analyses_used?: number
          paid_analyses_used?: number
          free_analyses_limit?: number
          last_reset_at?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          date?: string
          free_analyses_used?: number
          paid_analyses_used?: number
          free_analyses_limit?: number
          last_reset_at?: string
          created_at?: string
          updated_at?: string
        }
      }
      clause_patterns: {
        Row: {
          id: string
          category: string
          name: string
          description: string
          risk_level: 'low' | 'medium' | 'high' | 'critical'
          keywords: Json
          prompt_template: string
          is_active: boolean
          industry: string
          version: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          category: string
          name: string
          description: string
          risk_level: 'low' | 'medium' | 'high' | 'critical'
          keywords: Json
          prompt_template: string
          is_active?: boolean
          industry?: string
          version?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          category?: string
          name?: string
          description?: string
          risk_level?: 'low' | 'medium' | 'high' | 'critical'
          keywords?: Json
          prompt_template?: string
          is_active?: boolean
          industry?: string
          version?: number
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
        }
        Returns: {
          current_count: number
          limit_reached: boolean
          remaining: number
          daily_limit: number
        }[]
      }
      increment_quota_usage: {
        Args: {
          user_uuid: string
        }
        Returns: boolean
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