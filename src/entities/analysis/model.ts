export interface AnalysisSession {
  id: string
  user_id: string
  title: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  created_at: string
  updated_at: string
  completed_at: string | null
}

export interface AnalysisResult {
  id: string
  session_id: string
  overall_risk_score: number
  summary: string
  issues_found: AnalysisIssue[]
  metadata: AnalysisMetadata
  created_at: string
}

export interface AnalysisIssue {
  id: string
  type: 'data_collection' | 'user_rights' | 'liability' | 'termination' | 'pricing' | 'other'
  severity: 'low' | 'medium' | 'high' | 'critical'
  title: string
  description: string
  quote: string
  explanation: string
  confidence_score: number
  suggestions: string[]
}

export interface AnalysisMetadata {
  text_length: number
  processing_time_ms: number
  model_version: string
  language: string
  confidence_score: number
}

export interface AnalysisSessionCreateData {
  user_id: string
  title: string
}

export interface AnalysisResultCreateData {
  session_id: string
  overall_risk_score: number
  summary: string
  issues_found: AnalysisIssue[]
  metadata: AnalysisMetadata
}