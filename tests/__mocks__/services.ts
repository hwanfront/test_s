// Mock Supabase client
export const mockSupabaseClient = {
  from: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn(),
    maybeSingle: jest.fn(),
    order: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    rpc: jest.fn(),
  })),
  auth: {
    getUser: jest.fn(),
    signIn: jest.fn(),
    signOut: jest.fn(),
  },
}

// Mock Google Gemini service
export const mockGeminiService = {
  analyzeTerms: jest.fn(),
}

// Mock Analysis service
export const mockAnalysisService = {
  createSession: jest.fn(),
  updateSessionStatus: jest.fn(),
  saveAnalysisResult: jest.fn(),
  getUserSessions: jest.fn(),
  getSessionWithResult: jest.fn(),
  deleteSession: jest.fn(),
}

// Mock Quota service
export const mockQuotaService = {
  checkUserQuota: jest.fn(),
  incrementUsage: jest.fn(),
  resetDailyQuota: jest.fn(),
  resetMonthlyQuota: jest.fn(),
  getUserQuotaUsage: jest.fn(),
}

// Set up default mock implementations
export const setupServiceMocks = () => {
  // Reset all mocks
  jest.clearAllMocks()
  
  // Set up default return values
  mockGeminiService.analyzeTerms.mockResolvedValue({
    overall_risk_score: 75,
    summary: 'Mock analysis summary',
    issues_found: [],
    metadata: {
      text_length: 1000,
      processing_time_ms: 1500,
      model_version: 'gemini-1.5-flash',
      language: 'en',
      confidence_score: 80,
    },
  })
  
  mockQuotaService.checkUserQuota.mockResolvedValue({
    canProceed: true,
    daily: { current: 1, limit: 3, remaining: 2 },
    monthly: { current: 3, limit: 10, remaining: 7 },
  })
}

// Export the mocks
export {
  mockSupabaseClient as supabase,
  mockGeminiService as geminiService,
  mockAnalysisService as analysisService,
  mockQuotaService as quotaService,
}