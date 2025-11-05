// AI Analysis Module
// Handles AI-powered analysis of legal documents using Google Gemini

export {
  AnalysisService,
  analyzeTerms,
  type AnalysisInput,
  type AnalysisResult,
  type RiskAssessment,
  type AnalysisSummary,
  type AnalysisContext,
  type AnalysisOptions
} from './lib/analysis-service'

export {
  GeminiClient,
  type GeminiResponse,
  type GeminiConfig
} from './lib/gemini-client'

export {
  PatternMatcher,
  type PatternMatch,
  type PatternRule
} from './lib/pattern-matcher'

export {
  PromptBuilder,
  type PromptContext
} from './lib/prompt-builder'

export {
  ResultParser,
  type ParsedResponse
} from './lib/result-parser'

export {
  MobileGamingSeeder,
  createSeededPatternMatcher,
  DEFAULT_MOBILE_GAMING_SEEDING_OPTIONS,
  type MobileGamingPatternCategory,
  type SeedingResult,
  type SeedingOptions
} from './lib/mobile-gaming-seeder'

// Analysis Workflow Component
export { AnalysisWorkflow } from './components/analysis-workflow'
export type { AnalysisWorkflowProps, AnalysisState } from './components/analysis-workflow'

// Re-export commonly used functions for convenience
export { analyzeTerms as analyze } from './lib/analysis-service'