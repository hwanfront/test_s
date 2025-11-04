import { AnalysisResult, RiskAssessment } from './analysis-service'

export interface ParsedResponse {
  overallRiskScore: number
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  confidenceScore: number
  riskAssessments: RiskAssessment[]
}

/**
 * Parser for AI-generated analysis results
 * Validates and structures responses from Gemini AI
 */
export class ResultParser {
  /**
   * Parse and validate AI response
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
}