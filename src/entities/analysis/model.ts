export interface AnalysisSession {
  id: string
  userId: string
  contentHash: string
  contentLength: number
  contentType: string
  status: 'queued' | 'processing' | 'completed' | 'failed'
  priority: string
  context: Record<string, any>
  options: Record<string, any>
  estimatedTimeMs: number
  riskScore?: number
  riskLevel?: 'low' | 'medium' | 'high' | 'critical'
  confidenceScore?: number
  processingTimeMs?: number
  totalRisks?: number
  errorMessage?: string
  analysisMetadata?: Record<string, any>
  createdAt: string
  updatedAt?: string
  completedAt?: string
  expiresAt: string
  constitutionalCompliance: {
    originalTextStored: boolean
    preprocessingApplied: boolean
    aiLimitationsDisclosed: boolean
    transparencyMaintained: boolean
  }
  privacyCompliance: {
    gdprCompliant: boolean
    ccpaCompliant: boolean
    dataMinimizationApplied: boolean
    userConsentObtained: boolean
    retentionPolicyApplied: boolean
    encryptionApplied: boolean
    auditTrailMaintained: boolean
    rightToErasureSupported: boolean
    dataPortabilitySupported: boolean
    privacyByDesign: boolean
    lastAuditDate?: string
    complianceScore: number
    nonComplianceReasons: string[]
  }
}

export interface RiskAssessment {
  id: string
  sessionId: string
  clauseCategory: string
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  riskScore: number
  confidenceScore: number
  summary: string
  rationale: string
  suggestedAction?: string
  startPosition: number
  endPosition: number
  source: 'pattern_matching' | 'ai_analysis' | 'hybrid'
  validationFlags: string[]
  createdAt: string
}

export interface CreateAnalysisSessionData {
  id: string
  userId: string
  contentHash: string
  contentLength: number
  contentType: string
  status: 'queued' | 'processing' | 'completed' | 'failed'
  priority?: string
  context?: Record<string, any>
  options?: Record<string, any>
  estimatedTimeMs: number
  expiresAt: string
}

export interface UpdateAnalysisSessionData {
  status?: 'queued' | 'processing' | 'completed' | 'failed'
  riskScore?: number
  riskLevel?: 'low' | 'medium' | 'high' | 'critical'
  confidenceScore?: number
  processingTimeMs?: number
  totalRisks?: number
  errorMessage?: string
  analysisMetadata?: Record<string, any>
  completedAt?: string
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