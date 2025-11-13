/**
 * AI Response Result Parser and Validator (Task T052)
 * 
 * Constitutional Compliance: This module validates and sanitizes AI responses
 * while maintaining transparency about parsing limitations and data handling
 */

export interface RawAIResponse {
  text: string
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
  finishReason?: 'stop' | 'length' | 'safety' | 'recitation'
  metadata?: {
    model?: string
    timestamp?: string
    requestId?: string
  }
}

export interface ParsedAnalysisResult {
  success: boolean
  result?: {
    overallRiskScore: number
    overallRiskLevel: 'low' | 'medium' | 'high' | 'critical'
    confidenceScore: number
    riskAssessments: RiskAssessment[]
    metadata: {
      parsedAt: string
      originalLength: number
      validationErrors: string[]
      confidenceAdjustments: string[]
    }
  }
  error?: {
    code: string
    message: string
    details?: any
  }
  rawResponse?: {
    text: string
    usage?: any
  }
}

export interface RiskAssessment {
  category: string
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  riskScore: number
  confidenceScore: number
  summary: string
  rationale: string
  suggestedAction?: string
  startPosition: number
  endPosition: number
  validationFlags?: string[]
  quote?: string // Legacy compatibility
}

export interface ValidationRule {
  id: string
  name: string
  description: string
  validator: (data: any, context: ValidationContext) => ValidationResult
  severity: 'error' | 'warning' | 'info'
  enabled: boolean
}

export interface ValidationContext {
  originalTextLength: number
  expectedCategories?: string[]
  minConfidence?: number
  maxRiskScore?: number
  requirePositions?: boolean
}

export interface ValidationResult {
  valid: boolean
  message?: string
  suggestedFix?: any
  confidence?: number
}

export interface ParsingOptions {
  strictMode?: boolean
  maxRetries?: number
  fallbackMode?: boolean
  validatePositions?: boolean
  adjustConfidence?: boolean
  sanitizeOutput?: boolean
  preserveRawResponse?: boolean
}

// Legacy interface for backward compatibility
export interface ParsedResponse {
  overallRiskScore: number
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  confidenceScore: number
  riskAssessments: RiskAssessment[]
}

/**
 * Default validation rules for AI responses
 */
export const DEFAULT_VALIDATION_RULES: ValidationRule[] = [
  {
    id: 'overall_risk_score_range',
    name: 'Overall Risk Score Range',
    description: 'Overall risk score must be between 0 and 100',
    validator: (data: any) => ({
      valid: typeof data.overallRiskScore === 'number' && 
             data.overallRiskScore >= 0 && 
             data.overallRiskScore <= 100,
      message: 'Overall risk score must be a number between 0 and 100',
      suggestedFix: Math.max(0, Math.min(100, Number(data.overallRiskScore) || 0))
    }),
    severity: 'error',
    enabled: true
  },
  {
    id: 'risk_level_enum',
    name: 'Risk Level Enumeration',
    description: 'Risk levels must be valid enum values',
    validator: (data: any) => {
      const validLevels = ['low', 'medium', 'high', 'critical']
      return {
        valid: typeof data.overallRiskLevel === 'string' && 
               validLevels.includes(data.overallRiskLevel),
        message: 'Risk level must be one of: low, medium, high, critical',
        suggestedFix: 'medium'
      }
    },
    severity: 'error',
    enabled: true
  },
  {
    id: 'confidence_score_range',
    name: 'Confidence Score Range',
    description: 'Confidence score must be between 0 and 100',
    validator: (data: any) => ({
      valid: typeof data.confidenceScore === 'number' && 
             data.confidenceScore >= 0 && 
             data.confidenceScore <= 100,
      message: 'Confidence score must be a number between 0 and 100',
      suggestedFix: Math.max(0, Math.min(100, Number(data.confidenceScore) || 50))
    }),
    severity: 'error',
    enabled: true
  },
  {
    id: 'risk_assessments_array',
    name: 'Risk Assessments Array',
    description: 'Risk assessments must be an array',
    validator: (data: any) => ({
      valid: Array.isArray(data.riskAssessments),
      message: 'Risk assessments must be an array',
      suggestedFix: []
    }),
    severity: 'error',
    enabled: true
  }
]

/**
 * Enhanced Result Parser Class (Task T052)
 */
export class ResultParser {
  private validationRules: Map<string, ValidationRule>
  private defaultOptions: Required<ParsingOptions>

  constructor(customRules: ValidationRule[] = []) {
    this.validationRules = new Map()
    
    // Add default rules
    DEFAULT_VALIDATION_RULES.forEach(rule => {
      this.validationRules.set(rule.id, rule)
    })
    
    // Add custom rules
    customRules.forEach(rule => {
      this.validationRules.set(rule.id, rule)
    })

    this.defaultOptions = {
      strictMode: false,
      maxRetries: 3,
      fallbackMode: true,
      validatePositions: true,
      adjustConfidence: true,
      sanitizeOutput: true,
      preserveRawResponse: false
    }
  }
  /**
   * Parse and validate AI analysis response (Primary Method for Task T052)
   */
  async parseAnalysisResponse(
    rawResponse: RawAIResponse,
    context: ValidationContext,
    options: ParsingOptions = {}
  ): Promise<ParsedAnalysisResult> {
    const mergedOptions = { ...this.defaultOptions, ...options }

    try {
      // Extract JSON from response text
      const extractedData = this.extractJsonFromResponse(rawResponse.text)
      
      if (!extractedData.success) {
        return this.createErrorResult('JSON_EXTRACTION_FAILED', extractedData.error!, rawResponse, mergedOptions)
      }

      // Validate the extracted data
      const validationResult = await this.validateExtractedData(
        extractedData.data,
        context,
        mergedOptions
      )

      if (!validationResult.valid && mergedOptions.strictMode) {
        return this.createErrorResult(
          'VALIDATION_FAILED',
          `Validation failed: ${validationResult.errors.join(', ')}`,
          rawResponse,
          mergedOptions
        )
      }

      // Sanitize and fix the data
      const sanitizedData = this.sanitizeAnalysisData(
        extractedData.data,
        validationResult,
        mergedOptions
      )

      // Calculate adjusted confidence scores
      const adjustedData = mergedOptions.adjustConfidence 
        ? this.adjustConfidenceScores(sanitizedData, validationResult)
        : sanitizedData

      // Create final result
      const result: ParsedAnalysisResult = {
        success: true,
        result: {
          ...adjustedData,
          metadata: {
            parsedAt: new Date().toISOString(),
            originalLength: rawResponse.text.length,
            validationErrors: validationResult.errors,
            confidenceAdjustments: validationResult.adjustments || []
          }
        }
      }

      if (mergedOptions.preserveRawResponse) {
        result.rawResponse = {
          text: rawResponse.text,
          usage: rawResponse.usage
        }
      }

      return result

    } catch (error) {
      return this.createErrorResult(
        'PARSING_ERROR',
        error instanceof Error ? error.message : 'Unknown parsing error',
        rawResponse,
        mergedOptions
      )
    }
  }

  /**
   * Extract JSON data from AI response text
   */
  private extractJsonFromResponse(responseText: string): { success: boolean; data?: any; error?: string } {
    try {
      // Try to find JSON object in the response
      const jsonMatches = [
        // Look for complete JSON object
        responseText.match(/\{[\s\S]*\}/),
        // Look for JSON between code blocks
        responseText.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/),
        // Look for JSON after specific markers
        responseText.match(/(?:```json|JSON|json)\s*(\{[\s\S]*?\})/i)
      ]

      for (const match of jsonMatches) {
        if (match) {
          try {
            const jsonText = match[1] || match[0]
            const parsed = JSON.parse(jsonText)
            return { success: true, data: parsed }
          } catch (e) {
            continue
          }
        }
      }

      // If no JSON found, try to extract key-value pairs
      return this.extractKeyValuePairs(responseText)

    } catch (error) {
      return {
        success: false,
        error: `JSON extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  /**
   * Extract key-value pairs as fallback when JSON parsing fails
   */
  private extractKeyValuePairs(text: string): { success: boolean; data?: any; error?: string } {
    try {
      const result: any = {}

      // Extract overall risk score
      const riskScoreMatch = text.match(/(?:overall\s*risk\s*score|overallRiskScore)[\s:]*(\d+)/i)
      if (riskScoreMatch) {
        result.overallRiskScore = parseInt(riskScoreMatch[1])
      }

      // Extract risk level
      const riskLevelMatch = text.match(/(?:risk\s*level|riskLevel)[\s:]*(?:is\s*)?(low|medium|high|critical)/i)
      if (riskLevelMatch) {
        result.overallRiskLevel = riskLevelMatch[1].toLowerCase()
      }

      // Extract confidence score
      const confidenceMatch = text.match(/(?:confidence\s*score|confidenceScore)[\s:]*(\d+)/i)
      if (confidenceMatch) {
        result.confidenceScore = parseInt(confidenceMatch[1])
      }

      // Create basic risk assessment if we found indicators
      result.riskAssessments = []
      
      // Look for risk indicators
      const riskIndicators = [
        { category: 'general', keywords: ['risk', 'concern', 'problematic', 'unfair'] },
        { category: 'payment', keywords: ['payment', 'subscription', 'billing', 'refund'] },
        { category: 'data', keywords: ['data', 'privacy', 'information', 'collect'] },
        { category: 'account', keywords: ['account', 'terminate', 'suspend', 'ban'] }
      ]

      for (const indicator of riskIndicators) {
        const hasKeywords = indicator.keywords.some(keyword => 
          text.toLowerCase().includes(keyword.toLowerCase())
        )
        
        if (hasKeywords) {
          result.riskAssessments.push({
            category: indicator.category,
            riskLevel: result.overallRiskLevel || 'medium',
            riskScore: result.overallRiskScore || 50,
            confidenceScore: 40, // Lower confidence for extracted data
            summary: `${indicator.category} related risks identified`,
            rationale: 'Identified through keyword extraction (fallback parsing)',
            startPosition: 0,
            endPosition: Math.min(100, text.length)
          })
        }
      }

      if (Object.keys(result).length > 0) {
        return { success: true, data: result }
      }

      return {
        success: false,
        error: 'Could not extract meaningful data from response'
      }

    } catch (error) {
      return {
        success: false,
        error: `Key-value extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  /**
   * Validate extracted data against rules
   */
  private async validateExtractedData(
    data: any,
    context: ValidationContext,
    options: Required<ParsingOptions>
  ): Promise<{ valid: boolean; errors: string[]; warnings: string[]; fixes: any; adjustments?: string[] }> {
    const errors: string[] = []
    const warnings: string[] = []
    const fixes: any = {}
    const adjustments: string[] = []

    const enabledRules = Array.from(this.validationRules.values()).filter(rule => rule.enabled)

    for (const rule of enabledRules) {
      try {
        const result = rule.validator(data, context)
        
        if (!result.valid) {
          const message = `${rule.name}: ${result.message || 'Validation failed'}`
          
          if (rule.severity === 'error') {
            errors.push(message)
          } else if (rule.severity === 'warning') {
            warnings.push(message)
          }

          if (result.suggestedFix !== undefined) {
            fixes[rule.id] = result.suggestedFix
          }

          if (result.confidence !== undefined) {
            adjustments.push(`${rule.name}: confidence adjusted to ${result.confidence}`)
          }
        }
      } catch (error) {
        warnings.push(`Validation rule ${rule.id} failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      fixes,
      adjustments
    }
  }

  /**
   * Sanitize and fix analysis data
   */
  private sanitizeAnalysisData(
    data: any,
    validationResult: { fixes: any; warnings: string[] },
    options: Required<ParsingOptions>
  ): any {
    const sanitized = { ...data }

    // Apply fixes from validation
    Object.entries(validationResult.fixes).forEach(([ruleId, fix]) => {
      if (ruleId === 'overall_risk_score_range') {
        sanitized.overallRiskScore = fix
      } else if (ruleId === 'risk_level_enum') {
        sanitized.overallRiskLevel = fix
      } else if (ruleId === 'confidence_score_range') {
        sanitized.confidenceScore = fix
      } else if (ruleId === 'risk_assessments_array') {
        sanitized.riskAssessments = fix
      }
    })

    // Ensure required fields exist
    if (sanitized.overallRiskScore === undefined) {
      sanitized.overallRiskScore = 0
    }
    if (sanitized.overallRiskLevel === undefined) {
      sanitized.overallRiskLevel = 'low'
    }
    if (sanitized.confidenceScore === undefined) {
      sanitized.confidenceScore = 50
    }
    if (!Array.isArray(sanitized.riskAssessments)) {
      sanitized.riskAssessments = []
    }

    // Sanitize risk assessments
    sanitized.riskAssessments = sanitized.riskAssessments.map((assessment: any) => {
      return {
        category: String(assessment.category || 'unknown').substring(0, 100),
        riskLevel: this.validateRiskLevel(assessment.riskLevel),
        riskScore: this.clampScore(assessment.riskScore),
        confidenceScore: this.clampScore(assessment.confidenceScore),
        summary: String(assessment.summary || 'Risk identified').substring(0, 200),
        rationale: String(assessment.rationale || 'No rationale provided').substring(0, 1000),
        suggestedAction: assessment.suggestedAction ? String(assessment.suggestedAction).substring(0, 500) : undefined,
        startPosition: Math.max(0, Number(assessment.startPosition) || 0),
        endPosition: Math.max(0, Number(assessment.endPosition) || 0),
        validationFlags: assessment.validationFlags || []
      }
    })

    return sanitized
  }

  /**
   * Adjust confidence scores based on validation results
   */
  private adjustConfidenceScores(
    data: any,
    validationResult: { warnings: string[]; errors: string[]; adjustments?: string[] }
  ): any {
    const adjusted = { ...data }

    // Reduce confidence based on validation issues
    const totalIssues = validationResult.errors.length + validationResult.warnings.length
    if (totalIssues > 0) {
      const confidenceReduction = Math.min(30, totalIssues * 5)
      adjusted.confidenceScore = Math.max(20, adjusted.confidenceScore - confidenceReduction)

      // Also adjust individual assessment confidence
      adjusted.riskAssessments = adjusted.riskAssessments.map((assessment: any) => ({
        ...assessment,
        confidenceScore: Math.max(20, assessment.confidenceScore - confidenceReduction)
      }))
    }

    return adjusted
  }

  /**
   * Create error result
   */
  private createErrorResult(
    code: string,
    message: string,
    rawResponse: RawAIResponse,
    options: Required<ParsingOptions>
  ): ParsedAnalysisResult {
    const result: ParsedAnalysisResult = {
      success: false,
      error: {
        code,
        message,
        details: {
          originalLength: rawResponse.text.length,
          finishReason: rawResponse.finishReason
        }
      }
    }

    if (options.preserveRawResponse) {
      result.rawResponse = {
        text: rawResponse.text,
        usage: rawResponse.usage
      }
    }

    return result
  }

  /**
   * Helper methods
   */
  private clampScore(score: any): number {
    const num = Number(score)
    if (isNaN(num)) return 0
    return Math.max(0, Math.min(100, Math.round(num)))
  }

  private validateRiskLevel(level: any): 'low' | 'medium' | 'high' | 'critical' {
    if (typeof level === 'string') {
      const normalized = level.toLowerCase()
      if (['low', 'medium', 'high', 'critical'].includes(normalized)) {
        return normalized as 'low' | 'medium' | 'high' | 'critical'
      }
    }
    return 'low'
  }

  // Legacy methods for backward compatibility

  /**
   * Legacy method - Parse and validate AI response
   * @param responseText Raw text response from AI
   * @returns Validated and structured analysis result
   */
  parseResponse(responseText: string): ParsedResponse {
    try {
      // Clean the response text (remove markdown, code blocks, etc.)
      const cleanedText = this.cleanResponseText(responseText)
      
      // Parse JSON
      const rawResponse = JSON.parse(cleanedText)
      
      // Validate structure
      this.validateResponseStructure(rawResponse)
      
      // Normalize and enhance the response
      const normalizedResponse = this.normalizeResponse(rawResponse)
      
      return normalizedResponse
    } catch (error) {
      throw new Error(`Failed to parse AI response: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Clean response text by removing markdown and other formatting
   */
  private cleanResponseText(text: string): string {
    return text
      // Remove markdown code blocks
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/g, '')
      // Remove leading/trailing whitespace
      .trim()
      // Remove any text before the first {
      .replace(/^[^{]*/, '')
      // Remove any text after the last }
      .replace(/[^}]*$/, '')
  }

  /**
   * Validate the structure of the AI response
   */
  private validateResponseStructure(response: any): void {
    const errors: string[] = []

    // Check required top-level fields
    if (typeof response.overallRiskScore !== 'number') {
      errors.push('overallRiskScore must be a number')
    } else if (response.overallRiskScore < 0 || response.overallRiskScore > 100) {
      errors.push('overallRiskScore must be between 0 and 100')
    }

    if (!['low', 'medium', 'high', 'critical'].includes(response.riskLevel)) {
      errors.push('riskLevel must be one of: low, medium, high, critical')
    }

    if (typeof response.confidenceScore !== 'number') {
      errors.push('confidenceScore must be a number')
    } else if (response.confidenceScore < 0 || response.confidenceScore > 100) {
      errors.push('confidenceScore must be between 0 and 100')
    }

    if (!Array.isArray(response.riskAssessments)) {
      errors.push('riskAssessments must be an array')
    } else {
      // Validate each risk assessment
      response.riskAssessments.forEach((assessment: any, index: number) => {
        const assessmentErrors = this.validateRiskAssessment(assessment, index)
        errors.push(...assessmentErrors)
      })
    }

    if (errors.length > 0) {
      throw new Error(`Invalid response structure: ${errors.join(', ')}`)
    }
  }

  /**
   * Validate individual risk assessment
   */
  private validateRiskAssessment(assessment: any, index: number): string[] {
    const errors: string[] = []
    const prefix = `riskAssessments[${index}]`

    if (typeof assessment.category !== 'string' || assessment.category.length === 0) {
      errors.push(`${prefix}.category must be a non-empty string`)
    }

    if (!['low', 'medium', 'high', 'critical'].includes(assessment.riskLevel)) {
      errors.push(`${prefix}.riskLevel must be one of: low, medium, high, critical`)
    }

    if (typeof assessment.riskScore !== 'number' || assessment.riskScore < 0 || assessment.riskScore > 100) {
      errors.push(`${prefix}.riskScore must be a number between 0 and 100`)
    }

    if (typeof assessment.confidenceScore !== 'number' || assessment.confidenceScore < 0 || assessment.confidenceScore > 100) {
      errors.push(`${prefix}.confidenceScore must be a number between 0 and 100`)
    }

    if (typeof assessment.summary !== 'string' || assessment.summary.length === 0) {
      errors.push(`${prefix}.summary must be a non-empty string`)
    }

    if (typeof assessment.rationale !== 'string' || assessment.rationale.length === 0) {
      errors.push(`${prefix}.rationale must be a non-empty string`)
    }

    if (typeof assessment.startPosition !== 'number' || assessment.startPosition < 0) {
      errors.push(`${prefix}.startPosition must be a non-negative number`)
    }

    if (typeof assessment.endPosition !== 'number' || assessment.endPosition < assessment.startPosition) {
      errors.push(`${prefix}.endPosition must be a number greater than startPosition`)
    }

    return errors
  }

  /**
   * Normalize and enhance the response
   */
  private normalizeResponse(response: any): ParsedResponse {
    return {
      overallRiskScore: Math.round(response.overallRiskScore),
      riskLevel: response.riskLevel,
      confidenceScore: Math.round(response.confidenceScore),
      riskAssessments: response.riskAssessments.map((assessment: any) => ({
        category: this.normalizeCategory(assessment.category),
        riskLevel: assessment.riskLevel,
        riskScore: Math.round(assessment.riskScore),
        confidenceScore: Math.round(assessment.confidenceScore),
        summary: assessment.summary.trim(),
        rationale: assessment.rationale.trim(),
        suggestedAction: assessment.suggestedAction?.trim() || this.generateDefaultAction(assessment),
        startPosition: Math.round(assessment.startPosition),
        endPosition: Math.round(assessment.endPosition)
      }))
    }
  }

  /**
   * Normalize category names to kebab-case
   */
  private normalizeCategory(category: string): string {
    return category
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Remove duplicate hyphens
      .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
  }

  /**
   * Generate default suggested action if not provided
   */
  private generateDefaultAction(assessment: any): string {
    const actions: Record<string, string> = {
      'account-termination': 'Look for services with clear termination policies that provide notice and appeal processes.',
      'virtual-currency': 'Be aware that virtual currency may have no real-world value and can be lost.',
      'data-collection': 'Review privacy settings and consider whether the data collection is necessary for the service.',
      'liability-limitation': 'Understand that your legal recourse may be limited in case of service issues.',
      'content-ownership': 'Consider the implications of granting broad rights to your content.',
      'dispute-resolution': 'Be aware that you may be required to use arbitration instead of courts.',
      'automatic-renewal': 'Set calendar reminders to review subscriptions before renewal dates.',
      'price-changes': 'Monitor for price change notifications and review alternatives if prices increase.'
    }

    return actions[assessment.category] || 'Review this clause carefully and consider seeking legal advice if concerned.'
  }

  /**
   * Parse multiple responses and merge them
   */
  parseMultipleResponses(responses: string[]): ParsedResponse {
    const parsedResponses = responses.map(response => this.parseResponse(response))
    
    // Merge responses (simple implementation - could be more sophisticated)
    const allAssessments: RiskAssessment[] = []
    let totalRiskScore = 0
    let totalConfidence = 0

    parsedResponses.forEach(response => {
      allAssessments.push(...response.riskAssessments)
      totalRiskScore += response.overallRiskScore
      totalConfidence += response.confidenceScore
    })

    const averageRiskScore = Math.round(totalRiskScore / parsedResponses.length)
    const averageConfidence = Math.round(totalConfidence / parsedResponses.length)

    return {
      overallRiskScore: averageRiskScore,
      riskLevel: this.scoreToRiskLevel(averageRiskScore),
      confidenceScore: averageConfidence,
      riskAssessments: this.deduplicateAssessments(allAssessments)
    }
  }

  /**
   * Convert numeric score to risk level
   */
  private scoreToRiskLevel(score: number): 'low' | 'medium' | 'high' | 'critical' {
    if (score >= 80) return 'critical'
    if (score >= 60) return 'high'
    if (score >= 40) return 'medium'
    return 'low'
  }

  /**
   * Remove duplicate risk assessments
   */
  private deduplicateAssessments(assessments: RiskAssessment[]): RiskAssessment[] {
    const seen = new Set<string>()
    return assessments.filter(assessment => {
      const key = `${assessment.category}-${assessment.startPosition}-${assessment.endPosition}`
      if (seen.has(key)) {
        return false
      }
      seen.add(key)
      return true
    })
  }

  /**
   * Validate that parsed result is reasonable
   */
  validateParsedResult(result: ParsedResponse, originalContent: string): boolean {
    // Check that positions are within content bounds
    for (const assessment of result.riskAssessments) {
      if (assessment.startPosition >= originalContent.length || 
          assessment.endPosition > originalContent.length ||
          assessment.startPosition >= assessment.endPosition) {
        return false
      }
    }

    // Check that risk level matches score ranges
    const expectedRiskLevel = this.scoreToRiskLevel(result.overallRiskScore)
    if (result.riskLevel !== expectedRiskLevel) {
      return false
    }

    return true
  }

  /**
   * Extract specific quotes from original content
   */
  extractQuotes(result: ParsedResponse, originalContent: string): ParsedResponse {
    const enhancedAssessments = result.riskAssessments.map(assessment => {
      const quote = originalContent.substring(assessment.startPosition, assessment.endPosition)
      return {
        ...assessment,
        quote: quote.trim()
      }
    })

    return {
      ...result,
      riskAssessments: enhancedAssessments
    }
  }

  /**
   * Rule management methods
   */
  addValidationRule(rule: ValidationRule): void {
    this.validationRules.set(rule.id, rule)
  }

  removeValidationRule(ruleId: string): boolean {
    return this.validationRules.delete(ruleId)
  }

  updateValidationRule(ruleId: string, updates: Partial<ValidationRule>): boolean {
    const existing = this.validationRules.get(ruleId)
    if (!existing) return false

    this.validationRules.set(ruleId, { ...existing, ...updates })
    return true
  }

  getValidationRule(ruleId: string): ValidationRule | undefined {
    return this.validationRules.get(ruleId)
  }

  getAllValidationRules(): ValidationRule[] {
    return Array.from(this.validationRules.values())
  }

  getEnabledValidationRules(): ValidationRule[] {
    return Array.from(this.validationRules.values()).filter(rule => rule.enabled)
  }

  /**
   * Create fallback result when all parsing fails
   */
  createFallbackResult(
    rawResponse: RawAIResponse,
    error: string
  ): ParsedAnalysisResult {
    const hasRiskKeywords = /critical|dangerous|concerning|problematic|unfair/i.test(rawResponse.text)
    const hasMediumRiskKeywords = /questionable|unclear|potentially|may be/i.test(rawResponse.text)

    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low'
    let riskScore = 30

    if (hasRiskKeywords) {
      riskLevel = 'high'
      riskScore = 75
    } else if (hasMediumRiskKeywords) {
      riskLevel = 'medium'
      riskScore = 50
    }

    return {
      success: true,
      result: {
        overallRiskScore: riskScore,
        overallRiskLevel: riskLevel,
        confidenceScore: 25, // Very low confidence for fallback
        riskAssessments: [{
          category: 'general',
          riskLevel,
          riskScore,
          confidenceScore: 25,
          summary: 'General analysis (parsing failed)',
          rationale: 'Response parsing failed, providing fallback assessment based on keyword analysis',
          startPosition: 0,
          endPosition: Math.min(100, rawResponse.text.length),
          validationFlags: ['fallback_parsing']
        }],
        metadata: {
          parsedAt: new Date().toISOString(),
          originalLength: rawResponse.text.length,
          validationErrors: [error],
          confidenceAdjustments: ['Fallback parsing applied due to parsing failure']
        }
      }
    }
  }

  /**
   * Get parsing statistics
   */
  getParsingStats(): {
    totalRules: number
    enabledRules: number
    rulesBySeverity: Record<string, number>
  } {
    const allRules = this.getAllValidationRules()
    const enabledRules = this.getEnabledValidationRules()

    const rulesBySeverity: Record<string, number> = {}
    allRules.forEach(rule => {
      rulesBySeverity[rule.severity] = (rulesBySeverity[rule.severity] || 0) + 1
    })

    return {
      totalRules: allRules.length,
      enabledRules: enabledRules.length,
      rulesBySeverity
    }
  }
}