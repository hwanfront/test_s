import { createServerClient } from '@/shared/config/database'
import type { Database } from '@/shared/config/database/types'
import type { 
  AnalysisSession, 
  AnalysisResult, 
  AnalysisSessionCreateData, 
  AnalysisResultCreateData 
} from '@/entities/analysis'

export class AnalysisService {
  private supabase = createServerClient()

  async createSession(userId: string, data: AnalysisSessionCreateData): Promise<AnalysisSession> {
    const { data: session, error } = await this.supabase
      .from('analysis_sessions')
      .insert({
        user_id: userId,
        title: data.title,
        status: 'pending',
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create analysis session: ${error.message}`)
    }

    return session
  }

  async updateSessionStatus(
    sessionId: string, 
    status: Database['public']['Tables']['analysis_sessions']['Row']['status'],
    completedAt?: string
  ): Promise<void> {
    const updateData: any = { status }
    if (completedAt) {
      updateData.completed_at = completedAt
    }

    const { error } = await this.supabase
      .from('analysis_sessions')
      .update(updateData)
      .eq('id', sessionId)

    if (error) {
      throw new Error(`Failed to update session status: ${error.message}`)
    }
  }

  async saveAnalysisResult(data: AnalysisResultCreateData): Promise<AnalysisResult> {
    const { data: result, error } = await this.supabase
      .from('analysis_results')
      .insert({
        session_id: data.session_id,
        overall_risk_score: data.overall_risk_score,
        summary: data.summary,
        issues_found: data.issues_found,
        metadata: data.metadata,
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to save analysis result: ${error.message}`)
    }

    return result
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
      sessions: sessions || [],
      total: count || 0,
    }
  }

  async getSessionWithResult(sessionId: string, userId: string): Promise<{
    session: AnalysisSession
    result: AnalysisResult | null
  }> {
    // First get the session
    const { data: session, error: sessionError } = await this.supabase
      .from('analysis_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', userId)
      .single()

    if (sessionError) {
      throw new Error(`Failed to fetch session: ${sessionError.message}`)
    }

    // Then get the result if it exists
    const { data: result, error: resultError } = await this.supabase
      .from('analysis_results')
      .select('*')
      .eq('session_id', sessionId)
      .maybeSingle()

    if (resultError) {
      throw new Error(`Failed to fetch analysis result: ${resultError.message}`)
    }

    return {
      session,
      result,
    }
  }

  async deleteSession(sessionId: string, userId: string): Promise<void> {
    const { error } = await this.supabase
      .from('analysis_sessions')
      .delete()
      .eq('id', sessionId)
      .eq('user_id', userId)

    if (error) {
      throw new Error(`Failed to delete session: ${error.message}`)
    }
  }
}

export const analysisService = new AnalysisService()