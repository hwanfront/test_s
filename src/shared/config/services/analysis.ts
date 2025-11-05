import { createServerClient } from '@/shared/config/database'
import type { Database } from '@/shared/config/database/types'
import type { 
  AnalysisSession, 
  CreateAnalysisSessionData, 
  UpdateAnalysisSessionData 
} from '@/entities/analysis'

export class AnalysisService {
  private supabase = createServerClient()

  async createSession(data: CreateAnalysisSessionData): Promise<AnalysisSession> {
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

    const { data: session, error } = await this.supabase
      .from('analysis_sessions')
      .insert(sessionData)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create analysis session: ${error.message}`)
    }

    return this.mapSessionFromDb(session)
  }

  async updateSession(sessionId: string, data: UpdateAnalysisSessionData): Promise<void> {
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

    const { error } = await this.supabase
      .from('analysis_sessions')
      .update(updateData)
      .eq('id', sessionId)

    if (error) {
      throw new Error(`Failed to update session: ${error.message}`)
    }
  }

  async getUserSessions(
    userId: string, 
    page: number = 1, 
    limit: number = 20
  ): Promise<{ sessions: AnalysisSession[]; total: number }> {
    const offset = (page - 1) * limit

    const { data: sessions, error, count } = await this.supabase
      .from('analysis_sessions')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      throw new Error(`Failed to fetch user sessions: ${error.message}`)
    }

    return {
      sessions: (sessions || []).map(this.mapSessionFromDb),
      total: count || 0,
    }
  }

  async getSession(sessionId: string, userId: string): Promise<AnalysisSession | null> {
    const { data: session, error } = await this.supabase
      .from('analysis_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', userId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null // Not found
      }
      throw new Error(`Failed to fetch session: ${error.message}`)
    }

    return this.mapSessionFromDb(session)
  }

  async deleteSession(sessionId: string, userId: string): Promise<void> {
    // First delete associated risk assessments
    await this.supabase
      .from('risk_assessments')
      .delete()
      .eq('session_id', sessionId)

    // Then delete the session
    const { error } = await this.supabase
      .from('analysis_sessions')
      .delete()
      .eq('id', sessionId)
      .eq('user_id', userId)

    if (error) {
      throw new Error(`Failed to delete session: ${error.message}`)
    }
  }

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
      constitutionalCompliance: dbSession.constitutional_compliance || {
        originalTextStored: false,
        preprocessingApplied: true,
        aiLimitationsDisclosed: true,
        transparencyMaintained: true
      }
    }
  }
}

export const analysisService = new AnalysisService()