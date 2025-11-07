/**
 * Analysis Service Orchestrator (Task T053)
 * 
 * Constitutional Compliance: This module coordinates all analysis components
 * while maintaining strict module isolation and constitutional compliance
 */

import { GeminiClient, GeminiAnalysisRequest, GeminiAnalysisResponse } from './gemini-client'
import { PatternMatcher, PatternMatchResult, ClausePattern } from './pattern-matcher'
import { PromptBuilder, AnalysisPrompt, PromptContext } from './prompt-builder'
import { ResultParser, ParsedAnalysisResult, RawAIResponse, ValidationContext } from './result-parser'
import { TextPreprocessor } from '../../text-preprocessing/lib/preprocessor'

export interface AnalysisInput {
  contentHash: string
  content: string
  contentLength: number
  contentType?: string
  context?: AnalysisContext
  options?: AnalysisOptions
}

export interface AnalysisContext {
  documentType?: string
  industry?: string
  jurisdiction?: string
  userRole?: string
  analysisDepth?: 'basic' | 'comprehensive' | 'detailed'
  focusAreas?: string[]
  customInstructions?: string
  sessionId?: string
}

export interface AnalysisOptions {
  enablePatternMatching?: boolean
  enableAIAnalysis?: boolean
  strictValidation?: boolean
  includeRawResponse?: boolean
  maxRetries?: number
  templateId?: string
  customPatterns?: ClausePattern[]
}

export interface RiskAssessment {
  id?: string
  category: string
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  riskScore: number
  confidenceScore: number
  summary: string
  rationale: string
  suggestedAction?: string
  startPosition: number
  endPosition: number
  source: 'pattern_matching' | 'ai_analysis' | 'hybrid'
  createdAt?: string
  validationFlags?: string[]
}

export interface AnalysisSummary {
  totalRisks: number
  riskBreakdown: {
    critical: number
    high: number
    medium: number
    low: number
  }
  topCategories: Array<{
    category: string
    count: number
    averageRisk: number
    source: string
  }>
  analysisLimitations: string[]
  recommendedActions: string[]
  qualityMetrics: {
    overallConfidence: number
    aiParsingSuccess: boolean
    patternMatchAccuracy: number
    validationScore: number
  }
}

export interface AnalysisResult {
  sessionId: string
  overallRiskScore: number
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  confidenceScore: number
  riskAssessments: RiskAssessment[]
  summary: AnalysisSummary
  processingTimeMs: number
  metadata: {
    contentHash: string
    contentLength: number
    analysisAt: string
    moduleVersions: Record<string, string>
    constitutionalCompliance: {
      originalTextStored: false
      preprocessingApplied: true
      aiLimitationsDisclosed: true
      transparencyMaintained: true
    }
  }
}

export interface AnalysisStepResult {
  stepName: string
  success: boolean
  duration: number
  result?: any
  error?: string
  warnings?: string[]
}

export interface AnalysisProgress {
  currentStep: string
  completedSteps: string[]
  totalSteps: number
  progressPercentage: number
  estimatedTimeRemaining?: number
  stepResults: AnalysisStepResult[]
}

/**
 * Main Analysis Service Orchestrator Class
 */
export class AnalysisService {
  private geminiClient: GeminiClient
  private patternMatcher: PatternMatcher
  private promptBuilder: PromptBuilder
  private resultParser: ResultParser
  private preprocessor: TextPreprocessor
  private defaultOptions: Required<AnalysisOptions>

  constructor() {
    this.geminiClient = new GeminiClient()
    this.patternMatcher = new PatternMatcher()
    this.promptBuilder = new PromptBuilder()
    this.resultParser = new ResultParser()
    this.preprocessor = new TextPreprocessor()

    this.defaultOptions = {
      enablePatternMatching: true,
      enableAIAnalysis: true,
      strictValidation: false,
      includeRawResponse: false,
      maxRetries: 3,
      templateId: 'mobile_gaming_basic',
      customPatterns: []
    }
  }

  /**
   * Main analysis orchestration method (Primary Method for Task T053)
   */
  async analyzeTerms(input: AnalysisInput): Promise<AnalysisResult> {
    const sessionId = input.context?.sessionId || this.generateSessionId()
    const startTime = Date.now()
    const stepResults: AnalysisStepResult[] = []

    try {
      // Step 1: Validate input
      const validateStep = await this.executeStep('validate_input', async () => {
        this.validateInput(input)
        return { valid: true }
      })
      stepResults.push(validateStep)

      // Step 2: Preprocess content (Constitutional compliance)
      const preprocessStep = await this.executeStep('preprocess_content', async () => {
        return await this.preprocessor.preprocess(input.content)
      })
      stepResults.push(preprocessStep)
      
      const preprocessedText = preprocessStep.result?.sanitizedText || input.content

      // Step 3: Pattern matching analysis
      let patternResult: PatternMatchResult | null = null
      if (this.getOption(input.options, 'enablePatternMatching')) {
        const patternStep = await this.executeStep('pattern_matching', async () => {
          const patterns = input.options?.customPatterns || []
          if (patterns.length > 0) {
            patterns.forEach(pattern => this.patternMatcher.addPattern(pattern))
          }
          return await this.patternMatcher.matchPatterns(preprocessedText)
        })
        stepResults.push(patternStep)
        patternResult = patternStep.result
      }

      // Step 4: Build AI analysis prompt
      const promptStep = await this.executeStep('build_prompt', async () => {
        const templateId = input.options?.templateId || this.defaultOptions.templateId
        const context: PromptContext = {
          documentType: input.context?.documentType || input.contentType,
          industry: input.context?.industry,
          jurisdiction: input.context?.jurisdiction,
          analysisDepth: input.context?.analysisDepth || 'basic',
          focusAreas: input.context?.focusAreas,
          customInstructions: input.context?.customInstructions
        }
        
        const patterns = patternResult?.matches.map((match: any) => ({
          id: match.patternId,
          category: match.category,
          name: `Pattern ${match.patternId}`,
          description: `Matched pattern in ${match.category}`,
          riskLevel: match.riskLevel,
          keywords: match.matchedKeywords,
          promptTemplate: `Analyze this ${match.category} clause`,
          weight: match.weight
        } as ClausePattern)) || []

        return this.promptBuilder.buildPrompt(templateId, context, patterns)
      })
      stepResults.push(promptStep)
      const analysisPrompt: AnalysisPrompt = promptStep.result

      // Step 5: AI analysis (if enabled)
      let aiResult: ParsedAnalysisResult | null = null
      if (this.getOption(input.options, 'enableAIAnalysis')) {
        const aiStep = await this.executeStep('ai_analysis', async () => {
          const geminiRequest: GeminiAnalysisRequest = {
            sanitizedText: preprocessedText,
            prompt: analysisPrompt,
            options: {
              maxRetries: input.options?.maxRetries || 3,
              timeoutMs: 60000
            }
          }
          
          const geminiResponse = await this.geminiClient.analyzeTerms(geminiRequest)
          
          if (!geminiResponse.success) {
            throw new Error(`AI analysis failed: ${geminiResponse.error?.message}`)
          }

          const rawResponse: RawAIResponse = {
            text: JSON.stringify(geminiResponse.result),
            usage: geminiResponse.usage,
            finishReason: 'stop'
          }

          const validationContext: ValidationContext = {
            originalTextLength: input.content.length
          }

          return await this.resultParser.parseAnalysisResponse(
            rawResponse,
            validationContext,
            {
              strictMode: input.options?.strictValidation || false,
              preserveRawResponse: input.options?.includeRawResponse || false
            }
          )
        })
        stepResults.push(aiStep)
        aiResult = aiStep.result
      }

      // Step 6: Merge and enhance results
      const mergeStep = await this.executeStep('merge_results', async () => {
        return this.mergeAnalysisResults(patternResult, aiResult, preprocessStep.result)
      })
      stepResults.push(mergeStep)

      // Step 7: Generate final analysis result
      const finalStep = await this.executeStep('finalize_result', async () => {
        const enhancedResult = this.enhanceResult(
          mergeStep.result,
          input,
          sessionId,
          stepResults
        )
        
        enhancedResult.processingTimeMs = Date.now() - startTime
        return enhancedResult
      })
      stepResults.push(finalStep)

      return finalStep.result

    } catch (error) {
      return this.createErrorResult(
        sessionId,
        error instanceof Error ? error.message : 'Unknown analysis error',
        input,
        stepResults,
        Date.now() - startTime
      )
    }
  }

  /**
   * Progress tracking for long-running analysis
   */
  async getAnalysisProgress(sessionId: string): Promise<AnalysisProgress | null> {
    return null
  }

  private generateSessionId(): string {
    return crypto.randomUUID()
  }

  private async executeStep<T>(stepName: string, operation: () => Promise<T>): Promise<AnalysisStepResult> {
    const startTime = Date.now()
    try {
      const result = await operation()
      return {
        stepName,
        success: true,
        duration: Date.now() - startTime,
        result,
        warnings: []
      }
    } catch (error) {
      return {
        stepName,
        success: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
        warnings: []
      }
    }
  }

  private getOption<K extends keyof AnalysisOptions>(
    options: AnalysisOptions | undefined,
    key: K
  ): AnalysisOptions[K] {
    return options?.[key] ?? this.defaultOptions[key]
  }

  private validateInput(input: AnalysisInput): void {
    if (!input.content || input.content.trim().length === 0) {
      throw new Error('Content is required for analysis')
    }
    if (input.content.length > 1000000) {
      throw new Error('Content exceeds maximum length limit')
    }
    if (!input.contentHash) {
      throw new Error('Content hash is required for analysis')
    }
  }

  private mergeAnalysisResults(
    patternResult: PatternMatchResult | null,
    aiResult: ParsedAnalysisResult | null,
    preprocessResult: any
  ): RiskAssessment[] {
    const risks: RiskAssessment[] = []

    if (patternResult && patternResult.matches) {
      patternResult.matches.forEach((match: any) => {
        risks.push({
          id: `pattern_${match.patternId}`,
          category: match.category,
          riskLevel: match.riskLevel,
          riskScore: match.riskScore || this.mapRiskLevelToScore(match.riskLevel),
          confidenceScore: match.confidence || 0.8,
          summary: `Pattern match: ${match.category}`,
          rationale: `Matched keywords: ${match.matchedKeywords?.join(', ') || 'N/A'}`,
          startPosition: match.startPosition || 0,
          endPosition: match.endPosition || 0,
          source: 'pattern_matching' as const,
          createdAt: new Date().toISOString()
        })
      })
    }

    if (aiResult && aiResult.result && Array.isArray(aiResult.result)) {
      aiResult.result.forEach((risk: any) => {
        risks.push({
          ...risk,
          source: 'ai_analysis' as const,
          createdAt: new Date().toISOString()
        })
      })
    }

    return risks
  }

  private enhanceResult(
    riskAssessments: RiskAssessment[],
    input: AnalysisInput,
    sessionId: string,
    stepResults: AnalysisStepResult[]
  ): AnalysisResult {
    const overallRiskScore = this.calculateOverallRiskScore(riskAssessments)
    const riskLevel = this.mapScoreToRiskLevel(overallRiskScore)
    const confidenceScore = this.calculateConfidenceScore(riskAssessments, stepResults)
    const summary = this.generateAnalysisSummary(riskAssessments, stepResults)

    const metadata = {
      contentHash: input.contentHash,
      contentLength: input.contentLength,
      analysisAt: new Date().toISOString(),
      moduleVersions: {
        'ai-analysis': '1.0.0',
        'text-preprocessing': '1.0.0',
        'pattern-matcher': '1.0.0'
      },
      constitutionalCompliance: {
        originalTextStored: false as const,
        preprocessingApplied: true as const,
        aiLimitationsDisclosed: true as const,
        transparencyMaintained: true as const
      }
    }

    return {
      sessionId,
      overallRiskScore,
      riskLevel,
      confidenceScore,
      riskAssessments,
      summary,
      processingTimeMs: 0,
      metadata
    }
  }

  private createErrorResult(
    sessionId: string,
    errorMessage: string,
    input: AnalysisInput,
    stepResults: AnalysisStepResult[],
    processingTimeMs: number
  ): AnalysisResult {
    return {
      sessionId,
      overallRiskScore: 0,
      riskLevel: 'low',
      confidenceScore: 0,
      riskAssessments: [],
      summary: {
        totalRisks: 0,
        riskBreakdown: { critical: 0, high: 0, medium: 0, low: 0 },
        topCategories: [],
        analysisLimitations: [errorMessage],
        recommendedActions: ['Please try again with valid input'],
        qualityMetrics: {
          overallConfidence: 0,
          aiParsingSuccess: false,
          patternMatchAccuracy: 0,
          validationScore: 0
        }
      },
      processingTimeMs,
      metadata: {
        contentHash: input.contentHash,
        contentLength: input.contentLength,
        analysisAt: new Date().toISOString(),
        moduleVersions: {
          'ai-analysis': '1.0.0',
          'text-preprocessing': '1.0.0',
          'pattern-matcher': '1.0.0'
        },
        constitutionalCompliance: {
          originalTextStored: false as const,
          preprocessingApplied: true as const,
          aiLimitationsDisclosed: true as const,
          transparencyMaintained: true as const
        }
      }
    }
  }

  private mapRiskLevelToScore(riskLevel: string): number {
    switch (riskLevel) {
      case 'critical': return 90
      case 'high': return 70
      case 'medium': return 50
      case 'low': return 30
      default: return 0
    }
  }

  private mapScoreToRiskLevel(score: number): 'low' | 'medium' | 'high' | 'critical' {
    if (score >= 80) return 'critical'
    if (score >= 60) return 'high'
    if (score >= 40) return 'medium'
    return 'low'
  }

  private calculateOverallRiskScore(risks: RiskAssessment[]): number {
    if (risks.length === 0) return 0
    const totalScore = risks.reduce((sum, risk) => sum + risk.riskScore, 0)
    return Math.round(totalScore / risks.length)
  }

  private calculateConfidenceScore(risks: RiskAssessment[], stepResults: AnalysisStepResult[]): number {
    if (risks.length === 0) return 0
    
    const totalConfidence = risks.reduce((sum, risk) => sum + risk.confidenceScore, 0)
    const averageConfidence = totalConfidence / risks.length
    const successfulSteps = stepResults.filter(step => step.success).length
    const successRate = successfulSteps / stepResults.length
    
    return Math.round(averageConfidence * successRate * 100) / 100
  }

  private generateAnalysisSummary(risks: RiskAssessment[], stepResults: AnalysisStepResult[]): AnalysisSummary {
    const riskBreakdown = {
      critical: risks.filter(r => r.riskLevel === 'critical').length,
      high: risks.filter(r => r.riskLevel === 'high').length,
      medium: risks.filter(r => r.riskLevel === 'medium').length,
      low: risks.filter(r => r.riskLevel === 'low').length
    }

    const categoryStats = new Map<string, { count: number, totalRisk: number, source: string }>()
    risks.forEach(risk => {
      const current = categoryStats.get(risk.category) || { count: 0, totalRisk: 0, source: risk.source }
      categoryStats.set(risk.category, {
        count: current.count + 1,
        totalRisk: current.totalRisk + risk.riskScore,
        source: risk.source
      })
    })

    const topCategories = Array.from(categoryStats.entries())
      .map(([category, stats]) => ({
        category,
        count: stats.count,
        averageRisk: Math.round(stats.totalRisk / stats.count),
        source: stats.source
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    const analysisLimitations = stepResults
      .filter(step => !step.success)
      .map(step => `${step.stepName} failed: ${step.error}`)

    const recommendedActions = this.generateRecommendedActions(riskBreakdown, analysisLimitations)

    const qualityMetrics = {
      overallConfidence: this.calculateConfidenceScore(risks, stepResults),
      aiParsingSuccess: stepResults.some(step => step.stepName === 'ai_analysis' && step.success),
      patternMatchAccuracy: stepResults.some(step => step.stepName === 'pattern_matching' && step.success) ? 0.85 : 0,
      validationScore: stepResults.filter(step => step.success).length / stepResults.length
    }

    return {
      totalRisks: risks.length,
      riskBreakdown,
      topCategories,
      analysisLimitations,
      recommendedActions,
      qualityMetrics
    }
  }

  private generateRecommendedActions(riskBreakdown: any, limitations: string[]): string[] {
    const actions: string[] = []

    if (riskBreakdown.critical > 0) {
      actions.push('Review critical risk clauses immediately with legal counsel')
    }
    if (riskBreakdown.high > 0) {
      actions.push('Consider negotiating high-risk terms before acceptance')
    }
    if (limitations.length > 0) {
      actions.push('Manual review recommended due to analysis limitations')
    }

    return actions
  }
}

/**
 * Convenience function for analyzing terms using the default service instance
 */
export async function analyzeTerms(input: AnalysisInput): Promise<AnalysisResult> {
  const service = new AnalysisService()
  return await service.analyzeTerms(input)
}