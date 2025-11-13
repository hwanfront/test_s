/**
 * Analysis Entity Service (Task T070)
 * 
 * Constitutional Compliance: This service provides analysis entity operations
 * with proper business logic and data access patterns
 */

import type { 
  AnalysisSession, 
  RiskAssessment, 
  CreateAnalysisSessionData,
  UpdateAnalysisSessionData 
} from '../model'
import { supabase } from '@/shared/config/database/supabase'
import { AppError } from '@/shared/lib/errors'

export interface AnalysisEntityService {
  // Session management
  createSession(data: CreateAnalysisSessionData): Promise<AnalysisSession>
  getSession(sessionId: string, userId: string): Promise<AnalysisSession | null>
  updateSession(sessionId: string, data: UpdateAnalysisSessionData): Promise<AnalysisSession>
  deleteSession(sessionId: string, userId: string): Promise<void>
  
  // Risk assessments
  getRiskAssessments(sessionId: string): Promise<RiskAssessment[]>
  createRiskAssessments(sessionId: string, assessments: Omit<RiskAssessment, 'id' | 'sessionId' | 'createdAt'>[]): Promise<RiskAssessment[]>
  
  // Queries
  getUserSessions(userId: string, limit?: number): Promise<AnalysisSession[]>
  getSessionByHash(contentHash: string, userId: string): Promise<AnalysisSession | null>
  cleanupExpiredSessions(): Promise<number>
}

export class AnalysisEntityServiceImpl implements AnalysisEntityService {
  
  /**
   * Create a new analysis session
   */
  async createSession(data: CreateAnalysisSessionData): Promise<AnalysisSession> {
    try {
      const sessionData = {
        id: data.id,
        user_id: data.userId,
        content_hash: data.contentHash,
        content_length: data.contentLength,
        content_type: data.contentType,
        status: data.status,
        priority: data.priority || 'normal',
        context: data.context || {},
        options: data.options || {},
        estimated_time_ms: data.estimatedTimeMs,
        created_at: new Date().toISOString(),
        expires_at: data.expiresAt,
        constitutional_compliance: {
          original_text_stored: false,
          preprocessing_applied: true,
          ai_limitations_disclosed: true,
          transparency_maintained: true
        }
      }

      const { data: session, error } = await supabase
        .from('analysis_sessions')
        .insert(sessionData)
        .select()
        .single()

      if (error) {
        throw new AppError(500, 'Database Error', `Failed to create analysis session: ${error.message}`)
      }

      return this.mapSessionFromDb(session)
    } catch (error) {
      if (error instanceof AppError) throw error
      throw new AppError(500, 'Internal Server Error', 'Unexpected error creating analysis session')
    }
  }

  /**
   * Get an analysis session by ID
   */
  async getSession(sessionId: string, userId: string): Promise<AnalysisSession | null> {
    try {
      const { data: session, error } = await supabase
        .from('analysis_sessions')
        .select('*')
        .eq('id', sessionId)
        .eq('user_id', userId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return null // Not found
        }
        throw new AppError(500, 'Database Error', `Failed to retrieve analysis session: ${error.message}`)
      }

      return this.mapSessionFromDb(session)
    } catch (error) {
      if (error instanceof AppError) throw error
      throw new AppError(500, 'Internal Server Error', 'Unexpected error retrieving analysis session')
    }
  }

  /**
   * Update an analysis session
   */
  async updateSession(sessionId: string, data: UpdateAnalysisSessionData): Promise<AnalysisSession> {
    try {
      const updateData: any = {
        updated_at: new Date().toISOString()
      }

      if (data.status !== undefined) updateData.status = data.status
      if (data.riskScore !== undefined) updateData.risk_score = data.riskScore
      if (data.riskLevel !== undefined) updateData.risk_level = data.riskLevel
      if (data.confidenceScore !== undefined) updateData.confidence_score = data.confidenceScore
      if (data.processingTimeMs !== undefined) updateData.processing_time_ms = data.processingTimeMs
      if (data.totalRisks !== undefined) updateData.total_risks = data.totalRisks
      if (data.errorMessage !== undefined) updateData.error_message = data.errorMessage
      if (data.analysisMetadata !== undefined) updateData.analysis_metadata = data.analysisMetadata
      if (data.completedAt !== undefined) updateData.completed_at = data.completedAt

      const { data: session, error } = await supabase
        .from('analysis_sessions')
        .update(updateData)
        .eq('id', sessionId)
        .select()
        .single()

      if (error) {
        throw new AppError(500, 'Database Error', `Failed to update analysis session: ${error.message}`)
      }

      return this.mapSessionFromDb(session)
    } catch (error) {
      if (error instanceof AppError) throw error
      throw new AppError(500, 'Internal Server Error', 'Unexpected error updating analysis session')
    }
  }

  /**
   * Delete an analysis session
   */
  async deleteSession(sessionId: string, userId: string): Promise<void> {
    try {
      // First delete associated risk assessments
      await supabase
        .from('risk_assessments')
        .delete()
        .eq('session_id', sessionId)

      // Then delete the session
      const { error } = await supabase
        .from('analysis_sessions')
        .delete()
        .eq('id', sessionId)
        .eq('user_id', userId)

      if (error) {
        throw new AppError(500, "Database Error", `Failed to delete analysis session: ${error.message}`)
      }
    } catch (error) {
      if (error instanceof AppError) throw error
      throw new AppError(500, "Database Error", 'Unexpected error deleting analysis session')
    }
  }

  /**
   * Get risk assessments for a session
   */
  async getRiskAssessments(sessionId: string): Promise<RiskAssessment[]> {
    try {
      const { data: assessments, error } = await supabase
        .from('risk_assessments')
        .select('*')
        .eq('session_id', sessionId)
        .order('risk_score', { ascending: false })

      if (error) {
        throw new AppError(500, "Database Error", `Failed to retrieve risk assessments: ${error.message}`)
      }

      return (assessments || []).map(this.mapRiskAssessmentFromDb)
    } catch (error) {
      if (error instanceof AppError) throw error
      throw new AppError(500, "Database Error", 'Unexpected error retrieving risk assessments')
    }
  }

  /**
   * Create multiple risk assessments
   */
  async createRiskAssessments(
    sessionId: string, 
    assessments: Omit<RiskAssessment, 'id' | 'sessionId' | 'createdAt'>[]
  ): Promise<RiskAssessment[]> {
    try {
      const assessmentData = assessments.map(assessment => ({
        session_id: sessionId,
        assessment_id: `risk_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        clause_category: assessment.clauseCategory,
        risk_level: assessment.riskLevel,
        risk_score: assessment.riskScore,
        confidence_score: assessment.confidenceScore,
        summary: assessment.summary,
        rationale: assessment.rationale,
        suggested_action: assessment.suggestedAction,
        start_position: assessment.startPosition,
        end_position: assessment.endPosition,
        source: assessment.source,
        validation_flags: assessment.validationFlags || [],
        created_at: new Date().toISOString()
      }))

      const { data: createdAssessments, error } = await supabase
        .from('risk_assessments')
        .insert(assessmentData)
        .select()

      if (error) {
        throw new AppError(500, "Database Error", `Failed to create risk assessments: ${error.message}`)
      }

      return (createdAssessments || []).map(this.mapRiskAssessmentFromDb)
    } catch (error) {
      if (error instanceof AppError) throw error
      throw new AppError(500, "Database Error", 'Unexpected error creating risk assessments')
    }
  }

  /**
   * Get user's analysis sessions
   */
  async getUserSessions(userId: string, limit = 20): Promise<AnalysisSession[]> {
    try {
      const { data: sessions, error } = await supabase
        .from('analysis_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) {
        throw new AppError(500, "Database Error", `Failed to retrieve user sessions: ${error.message}`)
      }

      return (sessions || []).map(this.mapSessionFromDb)
    } catch (error) {
      if (error instanceof AppError) throw error
      throw new AppError(500, "Database Error", 'Unexpected error retrieving user sessions')
    }
  }

  /**
   * Get session by content hash (for caching)
   */
  async getSessionByHash(contentHash: string, userId: string): Promise<AnalysisSession | null> {
    try {
      const { data: session, error } = await supabase
        .from('analysis_sessions')
        .select('*')
        .eq('content_hash', contentHash)
        .eq('user_id', userId)
        .in('status', ['completed', 'processing'])
        .gte('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return null // Not found
        }
        throw new AppError(500, "Database Error", `Failed to retrieve session by hash: ${error.message}`)
      }

      return this.mapSessionFromDb(session)
    } catch (error) {
      if (error instanceof AppError) throw error
      throw new AppError(500, "Database Error", 'Unexpected error retrieving session by hash')
    }
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions(): Promise<number> {
    try {
      // First get expired session IDs
      const { data: expiredSessions, error: selectError } = await supabase
        .from('analysis_sessions')
        .select('id')
        .lt('expires_at', new Date().toISOString())

      if (selectError || !expiredSessions) {
        throw new AppError(500, "Database Error", `Failed to find expired sessions: ${selectError?.message}`)
      }

      if (expiredSessions.length === 0) {
        return 0
      }

      const sessionIds = expiredSessions.map(s => s.id)

      // Delete associated risk assessments
      await supabase
        .from('risk_assessments')
        .delete()
        .in('session_id', sessionIds)

      // Delete expired sessions
      const { error: deleteError } = await supabase
        .from('analysis_sessions')
        .delete()
        .lt('expires_at', new Date().toISOString())

      if (deleteError) {
        throw new AppError(500, "Database Error", `Failed to delete expired sessions: ${deleteError.message}`)
      }

      return expiredSessions.length
    } catch (error) {
      if (error instanceof AppError) throw error
      throw new AppError(500, "Database Error", 'Unexpected error cleaning up expired sessions')
    }
  }

  /**
   * Map database session to domain model
   */
  private mapSessionFromDb(dbSession: any): AnalysisSession {
    return {
      id: dbSession.id,
      userId: dbSession.user_id,
      contentHash: dbSession.content_hash,
      contentLength: dbSession.content_length,
      contentType: dbSession.content_type,
      status: dbSession.status,
      priority: dbSession.priority,
      context: dbSession.context || {},
      options: dbSession.options || {},
      estimatedTimeMs: dbSession.estimated_time_ms,
      riskScore: dbSession.risk_score,
      riskLevel: dbSession.risk_level,
      confidenceScore: dbSession.confidence_score,
      processingTimeMs: dbSession.processing_time_ms,
      totalRisks: dbSession.total_risks,
      errorMessage: dbSession.error_message,
      analysisMetadata: dbSession.analysis_metadata,
      createdAt: dbSession.created_at,
      updatedAt: dbSession.updated_at,
      completedAt: dbSession.completed_at,
      expiresAt: dbSession.expires_at,
      privacyCompliance: dbSession.privacy_compliance || {
        contentHashOnly: true,
        noOriginalTextStored: true,
        anonymizationApplied: true,
        retentionPolicyApplied: true
      },
      constitutionalCompliance: dbSession.constitutional_compliance || {
        originalTextStored: false,
        preprocessingApplied: true,
        aiLimitationsDisclosed: true,
        transparencyMaintained: true
      }
    }
  }

  /**
   * Map database risk assessment to domain model
   */
  private mapRiskAssessmentFromDb(dbAssessment: any): RiskAssessment {
    return {
      id: dbAssessment.assessment_id || dbAssessment.id,
      sessionId: dbAssessment.session_id,
      clauseCategory: dbAssessment.clause_category,
      riskLevel: dbAssessment.risk_level,
      riskScore: dbAssessment.risk_score,
      confidenceScore: dbAssessment.confidence_score,
      summary: dbAssessment.summary,
      rationale: dbAssessment.rationale,
      suggestedAction: dbAssessment.suggested_action,
      startPosition: dbAssessment.start_position,
      endPosition: dbAssessment.end_position,
      source: dbAssessment.source,
      validationFlags: dbAssessment.validation_flags || [],
      createdAt: dbAssessment.created_at
    }
  }
}

// Export singleton instance
export const analysisEntityService = new AnalysisEntityServiceImpl()