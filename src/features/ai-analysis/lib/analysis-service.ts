import { GeminiClient } from './gemini-client'
import { PatternMatcher } from './pattern-matcher'
import { PromptBuilder } from './prompt-builder'
import { ResultParser } from './result-parser'

export interface AnalysisInput {
  contentHash: string
  content: string
  contentLength: number
  contentType?: string
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
  createdAt?: string
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
  }>
  analysisLimitations: string[]
  recommendedActions: string[]
}

export interface AnalysisResult {
  overallRiskScore: number
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  confidenceScore: number
  riskAssessments: RiskAssessment[]
  summary: AnalysisSummary
  processingTimeMs: number
}

/**
 * Main service for analyzing terms and conditions using AI
 * Coordinates pattern matching, AI analysis, and result parsing
 */
export class AnalysisService {
  private geminiClient: GeminiClient
  private patternMatcher: PatternMatcher
  private promptBuilder: PromptBuilder
  private resultParser: ResultParser

  constructor() {
    this.geminiClient = new GeminiClient()
    this.patternMatcher = new PatternMatcher()
    this.promptBuilder = new PromptBuilder()
    this.resultParser = new ResultParser()
  }

  /**
   * Analyze terms and conditions content for legal risks
   * @param input Content and metadata to analyze
   * @returns Structured analysis results
   */
  async analyzeTerms(input: AnalysisInput): Promise<AnalysisResult> {
    const startTime = Date.now()

    // Validate input
    this.validateInput(input)

    try {
      // Step 1: Find potential risk patterns using regex/keyword matching
      const patterns = this.patternMatcher.findPatterns(input.content)

      // Step 2: Build AI analysis prompt with found patterns
      const prompt = this.promptBuilder.buildAnalysisPrompt(
        input.content,
        patterns,
        input.contentType || 'terms-and-conditions'
      )

      // Step 3: Send to Gemini AI for detailed analysis
      const geminiResponse = await this.geminiClient.generateContent(prompt)

      // Step 4: Parse and validate AI response
      const analysisResult = this.resultParser.parseResponse(geminiResponse.text)

      // Step 5: Enhance results with metadata
      const enhancedResult = this.enhanceResult(analysisResult, patterns, input)

      // Step 6: Calculate processing time
      const processingTimeMs = Date.now() - startTime

      return {
        ...enhancedResult,
        processingTimeMs
      }
    } catch (error) {
      throw new Error(`Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Validate analysis input
   */
  private validateInput(input: AnalysisInput): void {
    if (!input.content || input.content.trim().length === 0) {
      throw new Error('Content cannot be empty')
    }

    if (input.contentLength !== input.content.length) {
      throw new Error('Content length mismatch')
    }

    if (input.content.length > 50000) {
      throw new Error('Content too long (max 50,000 characters)')
    }

    if (!input.contentHash || input.contentHash.length !== 64) {
      throw new Error('Invalid content hash')
    }
  }

  /**
   * Enhance analysis result with additional metadata and calculations
   */
  private enhanceResult(
    result: AnalysisResult,
    patterns: any[],
    input: AnalysisInput
  ): AnalysisResult {
    // Calculate overall risk level from score
    const riskLevel = this.calculateRiskLevel(result.overallRiskScore)

    // Generate summary statistics
    const summary = this.generateSummary(result.riskAssessments)

    // Add metadata to risk assessments
    const enhancedAssessments = result.riskAssessments.map((assessment, index) => ({
      ...assessment,
      id: `risk-${index + 1}`,
      createdAt: new Date().toISOString()
    }))

    return {
      ...result,
      riskLevel,
      riskAssessments: enhancedAssessments,
      summary
    }
  }

  /**
   * Calculate risk level from numeric score
   */
  private calculateRiskLevel(score: number): 'low' | 'medium' | 'high' | 'critical' {
    if (score >= 80) return 'critical'
    if (score >= 60) return 'high'
    if (score >= 40) return 'medium'
    return 'low'
  }

  /**
   * Generate analysis summary from risk assessments
   */
  private generateSummary(assessments: RiskAssessment[]): AnalysisSummary {
    const totalRisks = assessments.length

    const riskBreakdown = {
      critical: assessments.filter(a => a.riskLevel === 'critical').length,
      high: assessments.filter(a => a.riskLevel === 'high').length,
      medium: assessments.filter(a => a.riskLevel === 'medium').length,
      low: assessments.filter(a => a.riskLevel === 'low').length
    }

    // Group by category
    const categoryMap = new Map<string, { count: number; totalRisk: number }>()
    assessments.forEach(assessment => {
      const existing = categoryMap.get(assessment.category) || { count: 0, totalRisk: 0 }
      categoryMap.set(assessment.category, {
        count: existing.count + 1,
        totalRisk: existing.totalRisk + assessment.riskScore
      })
    })

    const topCategories = Array.from(categoryMap.entries())
      .map(([category, data]) => ({
        category,
        count: data.count,
        averageRisk: Math.round(data.totalRisk / data.count)
      }))
      .sort((a, b) => b.averageRisk - a.averageRisk)
      .slice(0, 5)

    const analysisLimitations = [
      'Analysis based on AI interpretation and may not reflect all legal nuances',
      'Risk assessment focuses on common mobile gaming industry patterns',
      'Legal interpretation may vary by jurisdiction and specific circumstances'
    ]

    const recommendedActions = this.generateRecommendedActions(riskBreakdown)

    return {
      totalRisks,
      riskBreakdown,
      topCategories,
      analysisLimitations,
      recommendedActions
    }
  }

  /**
   * Generate recommended actions based on risk breakdown
   */
  private generateRecommendedActions(riskBreakdown: AnalysisSummary['riskBreakdown']): string[] {
    const actions: string[] = []

    if (riskBreakdown.critical > 0) {
      actions.push('Consider alternative services with fairer terms')
      actions.push('Consult with legal counsel before accepting these terms')
    }

    if (riskBreakdown.high > 0) {
      actions.push('Review high-risk clauses carefully before agreeing')
      actions.push('Look for services with more transparent policies')
    }

    if (riskBreakdown.medium > 0) {
      actions.push('Be aware of medium-risk terms and their implications')
    }

    if (riskBreakdown.critical === 0 && riskBreakdown.high === 0) {
      actions.push('Terms appear relatively fair and reasonable')
    }

    return actions
  }
}

/**
 * Convenience function for analyzing terms
 */
export async function analyzeTerms(input: AnalysisInput): Promise<AnalysisResult> {
  const service = new AnalysisService()
  return service.analyzeTerms(input)
}