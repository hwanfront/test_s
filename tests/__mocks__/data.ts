import type { User } from '@/entities/user'
import type { AnalysisSession, AnalysisResult, AnalysisIssue } from '@/entities/analysis'
import type { QuotaUsage } from '@/entities/quota'

// Mock User data
export const mockUser: User = {
  id: 'test-user-id',
  email: 'test@example.com',
  name: 'Test User',
  avatar_url: 'https://example.com/avatar.jpg',
  provider: 'google',
  provider_id: 'google-123',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

// Mock Analysis Session data
export const mockAnalysisSession: AnalysisSession = {
  id: 'test-session-id',
  user_id: 'test-user-id',
  title: 'Test Terms Analysis',
  status: 'completed',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T01:00:00Z',
  completed_at: '2024-01-01T01:00:00Z',
}

// Mock Analysis Issues
export const mockAnalysisIssues: AnalysisIssue[] = [
  {
    id: 'issue-1',
    type: 'data_collection',
    severity: 'high',
    title: 'Excessive Data Collection',
    description: 'The terms allow collection of extensive personal data',
    quote: 'We may collect all data from your device',
    explanation: 'This clause allows unlimited data collection which may violate privacy',
    confidence_score: 85,
    suggestions: ['Limit data collection to essential data only', 'Provide clear opt-out mechanisms'],
  },
  {
    id: 'issue-2',
    type: 'user_rights',
    severity: 'medium',
    title: 'Limited User Rights',
    description: 'Users have limited recourse options',
    quote: 'You waive all rights to dispute resolution',
    explanation: 'This limits user ability to seek remedies for issues',
    confidence_score: 78,
    suggestions: ['Provide dispute resolution mechanisms', 'Allow arbitration'],
  },
]

// Mock Analysis Result
export const mockAnalysisResult: AnalysisResult = {
  id: 'test-result-id',
  session_id: 'test-session-id',
  overall_risk_score: 75,
  summary: 'The terms contain several concerning clauses related to data collection and user rights.',
  issues_found: mockAnalysisIssues,
  metadata: {
    text_length: 5000,
    processing_time_ms: 2500,
    model_version: 'gemini-1.5-flash',
    language: 'en',
    confidence_score: 81,
  },
  created_at: '2024-01-01T01:00:00Z',
}

// Mock Quota Usage
export const mockQuotaUsage: QuotaUsage[] = [
  {
    id: 'quota-daily-id',
    user_id: 'test-user-id',
    analysis_count: 2,
    last_reset_at: '2024-01-01T00:00:00Z',
    period: 'daily',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'quota-monthly-id',
    user_id: 'test-user-id',
    analysis_count: 5,
    last_reset_at: '2024-01-01T00:00:00Z',
    period: 'monthly',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
]

// Mock Terms Text
export const mockTermsText = `
TERMS OF SERVICE

1. Data Collection
We may collect personal information including but not limited to your name, email address, device information, location data, browsing history, and usage patterns.

2. Data Usage
Your personal data may be used for analytics, advertising, marketing, and shared with third-party partners without explicit consent.

3. User Rights
By using this service, you waive all rights to dispute resolution, class action lawsuits, and agree to binding arbitration.

4. Liability
The company is not liable for any damages, data loss, or security breaches that may occur.

5. Termination
We reserve the right to terminate your account at any time without notice or refund.

6. Changes
These terms may be changed at any time without notice to users.
`.trim()

// Factory functions for creating test data
export const createMockUser = (overrides: Partial<User> = {}): User => ({
  ...mockUser,
  ...overrides,
})

export const createMockAnalysisSession = (overrides: Partial<AnalysisSession> = {}): AnalysisSession => ({
  ...mockAnalysisSession,
  ...overrides,
})

export const createMockAnalysisResult = (overrides: Partial<AnalysisResult> = {}): AnalysisResult => ({
  ...mockAnalysisResult,
  ...overrides,
})

export const createMockQuotaUsage = (overrides: Partial<QuotaUsage> = {}): QuotaUsage => ({
  ...mockQuotaUsage[0],
  ...overrides,
})