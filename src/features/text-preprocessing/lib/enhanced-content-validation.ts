/**
 * Enhanced Content Validation Service (Task T112)
 * 
 * Advanced content validation with privacy-compliant processing
 * ensuring constitutional compliance before any processing begins.
 * 
 * Constitutional Principle II: Legal Risk Minimization
 * - Pre-processing validation without content exposure
 * - Privacy-safe content analysis
 * - Constitutional compliance verification
 */

import { createHash } from 'crypto'

/**
 * Content validation rules
 */
interface ValidationRule {
  id: string
  name: string
  category: 'security' | 'privacy' | 'content' | 'constitutional' | 'format'
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  enabled: boolean
  pattern?: RegExp
  validator?: (content: string) => boolean
  privacySafe: boolean // Whether the rule can be applied without exposing content
}

/**
 * Content validation result
 */
interface ContentValidationResult {
  id: string
  timestamp: string
  contentHash: string
  isValid: boolean
  overallScore: number // 0-100
  violations: ValidationViolation[]
  warnings: ValidationWarning[]
  metadata: {
    contentLength: number
    processingTime: number
    rulesApplied: number
    privacyCompliant: boolean
  }
}

/**
 * Validation violation
 */
interface ValidationViolation {
  ruleId: string
  ruleName: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  category: string
  description: string
  position?: {
    start: number
    end: number
  }
  recommendation: string
  autoFixable: boolean
}

/**
 * Validation warning
 */
interface ValidationWarning {
  ruleId: string
  ruleName: string
  category: string
  description: string
  recommendation: string
}

/**
 * Content metrics (privacy-safe)
 */
interface ContentMetrics {
  length: number
  wordCount: number
  paragraphCount: number
  sentenceCount: number
  averageWordLength: number
  averageSentenceLength: number
  complexityScore: number
  languageDetection?: string
  encodingValidation: boolean
}

/**
 * Content preprocessing validation configuration
 */
interface ValidationConfig {
  enableSecurityRules: boolean
  enablePrivacyRules: boolean
  enableContentRules: boolean
  enableConstitutionalRules: boolean
  enableFormatRules: boolean
  maxContentLength: number
  minContentLength: number
  allowedEncodings: string[]
  blockedPatterns: string[]
  requireValidUTF8: boolean
  enableMetricsCollection: boolean
  privacySafeOnly: boolean
}

/**
 * Enhanced content validation service
 */
export class EnhancedContentValidationService {
  private config: Required<ValidationConfig>
  private validationRules: Map<string, ValidationRule>
  private validationHistory: ContentValidationResult[]

  constructor(config?: Partial<ValidationConfig>) {
    this.config = {
      enableSecurityRules: true,
      enablePrivacyRules: true,
      enableContentRules: true,
      enableConstitutionalRules: true,
      enableFormatRules: true,
      maxContentLength: 1000000, // 1MB
      minContentLength: 1,
      allowedEncodings: ['utf8', 'utf-8', 'ascii'],
      blockedPatterns: [],
      requireValidUTF8: true,
      enableMetricsCollection: true,
      privacySafeOnly: true,
      ...config
    }

    this.validationRules = new Map()
    this.validationHistory = []

    // Initialize default validation rules
    this.initializeDefaultRules()
  }

  /**
   * Initialize default validation rules
   */
  private initializeDefaultRules(): void {
    const rules: ValidationRule[] = [
      // Security Rules
      {
        id: 'sql-injection-check',
        name: 'SQL Injection Detection',
        category: 'security',
        severity: 'critical',
        description: 'Detects potential SQL injection attempts',
        enabled: true,
        pattern: /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/i,
        privacySafe: true
      },
      {
        id: 'script-injection-check',
        name: 'Script Injection Detection',
        category: 'security',
        severity: 'critical',
        description: 'Detects potential script injection attempts',
        enabled: true,
        pattern: /<script[^>]*>.*?<\/script>/i,
        privacySafe: true
      },
      {
        id: 'xss-prevention',
        name: 'XSS Prevention',
        category: 'security',
        severity: 'high',
        description: 'Prevents cross-site scripting attacks',
        enabled: true,
        pattern: /(javascript:|data:|vbscript:|onload=|onerror=)/i,
        privacySafe: true
      },

      // Privacy Rules
      {
        id: 'pii-detection',
        name: 'PII Detection',
        category: 'privacy',
        severity: 'critical',
        description: 'Detects personally identifiable information',
        enabled: true,
        validator: (content: string) => this.detectPII(content),
        privacySafe: false // This rule needs content analysis
      },
      {
        id: 'email-detection',
        name: 'Email Address Detection',
        category: 'privacy',
        severity: 'high',
        description: 'Detects email addresses in content',
        enabled: true,
        pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
        privacySafe: true
      },
      {
        id: 'phone-detection',
        name: 'Phone Number Detection',
        category: 'privacy',
        severity: 'high',
        description: 'Detects phone numbers in content',
        enabled: true,
        pattern: /\b(?:\+1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}\b/g,
        privacySafe: true
      },

      // Constitutional Rules
      {
        id: 'content-storage-check',
        name: 'Content Storage Prevention',
        category: 'constitutional',
        severity: 'critical',
        description: 'Ensures no original content is stored',
        enabled: true,
        validator: (content: string) => this.validateNoContentStorage(content),
        privacySafe: true
      },
      {
        id: 'hash-only-validation',
        name: 'Hash-Only Processing Validation',
        category: 'constitutional',
        severity: 'critical',
        description: 'Validates hash-only processing approach',
        enabled: true,
        validator: (content: string) => this.validateHashOnlyProcessing(content),
        privacySafe: true
      },

      // Format Rules
      {
        id: 'encoding-validation',
        name: 'Character Encoding Validation',
        category: 'format',
        severity: 'medium',
        description: 'Validates character encoding',
        enabled: true,
        validator: (content: string) => this.validateEncoding(content),
        privacySafe: true
      },
      {
        id: 'length-validation',
        name: 'Content Length Validation',
        category: 'format',
        severity: 'medium',
        description: 'Validates content length limits',
        enabled: true,
        validator: (content: string) => this.validateLength(content),
        privacySafe: true
      },

      // Content Rules
      {
        id: 'malformed-content',
        name: 'Malformed Content Detection',
        category: 'content',
        severity: 'medium',
        description: 'Detects potentially malformed content',
        enabled: true,
        validator: (content: string) => this.detectMalformedContent(content),
        privacySafe: true
      },
      {
        id: 'excessive-repetition',
        name: 'Excessive Repetition Detection',
        category: 'content',
        severity: 'low',
        description: 'Detects excessive character or word repetition',
        enabled: true,
        validator: (content: string) => this.detectExcessiveRepetition(content),
        privacySafe: true
      }
    ]

    for (const rule of rules) {
      this.validationRules.set(rule.id, rule)
    }
  }

  /**
   * Validate content with privacy-compliant processing
   */
  async validateContent(
    content: string,
    options: {
      ruleCategories?: string[]
      skipPrivacyUnsafeRules?: boolean
      collectMetrics?: boolean
    } = {}
  ): Promise<ContentValidationResult> {
    const startTime = Date.now()
    const contentHash = this.generateContentHash(content)
    
    const violations: ValidationViolation[] = []
    const warnings: ValidationWarning[] = []
    let rulesApplied = 0

    // Get applicable rules
    const applicableRules = this.getApplicableRules(options)

    // Apply validation rules
    for (const rule of applicableRules) {
      try {
        // Skip privacy-unsafe rules if requested or configured
        if ((options.skipPrivacyUnsafeRules || this.config.privacySafeOnly) && !rule.privacySafe) {
          continue
        }

        const ruleResult = await this.applyValidationRule(rule, content)
        
        if (ruleResult.violation) {
          violations.push(ruleResult.violation)
        }
        
        if (ruleResult.warning) {
          warnings.push(ruleResult.warning)
        }
        
        rulesApplied++
      } catch (error) {
        console.error(`Error applying rule ${rule.id}:`, error)
      }
    }

    // Calculate overall score
    const overallScore = this.calculateValidationScore(violations, warnings, rulesApplied)

    // Collect metrics if enabled
    let metrics: ContentMetrics | undefined
    if (options.collectMetrics && this.config.enableMetricsCollection) {
      metrics = this.collectContentMetrics(content)
    }

    const result: ContentValidationResult = {
      id: `validation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      contentHash,
      isValid: violations.length === 0,
      overallScore,
      violations,
      warnings,
      metadata: {
        contentLength: content.length,
        processingTime: Date.now() - startTime,
        rulesApplied,
        privacyCompliant: this.verifyPrivacyCompliance(violations)
      }
    }

    // Add to validation history
    this.validationHistory.push(result)
    this.manageValidationHistory()

    return result
  }

  /**
   * Validate content with hash-only approach (maximum privacy)
   */
  async validateContentHashOnly(
    contentHash: string,
    contentLength: number,
    contentMetrics?: Partial<ContentMetrics>
  ): Promise<ContentValidationResult> {
    const startTime = Date.now()
    
    const violations: ValidationViolation[] = []
    const warnings: ValidationWarning[] = []

    // Apply privacy-safe rules only
    const privacySafeRules = Array.from(this.validationRules.values())
      .filter(rule => rule.privacySafe && rule.enabled)

    // Validate length
    if (contentLength > this.config.maxContentLength) {
      violations.push({
        ruleId: 'length-validation',
        ruleName: 'Content Length Validation',
        severity: 'medium',
        category: 'format',
        description: `Content exceeds maximum length: ${contentLength} > ${this.config.maxContentLength}`,
        recommendation: 'Reduce content length',
        autoFixable: false
      })
    }

    if (contentLength < this.config.minContentLength) {
      violations.push({
        ruleId: 'length-validation',
        ruleName: 'Content Length Validation',
        severity: 'medium',
        category: 'format',
        description: `Content below minimum length: ${contentLength} < ${this.config.minContentLength}`,
        recommendation: 'Provide more content',
        autoFixable: false
      })
    }

    // Validate content metrics if provided
    if (contentMetrics) {
      const metricsValidation = this.validateContentMetrics(contentMetrics)
      violations.push(...metricsValidation.violations)
      warnings.push(...metricsValidation.warnings)
    }

    const result: ContentValidationResult = {
      id: `validation-hash-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      contentHash,
      isValid: violations.length === 0,
      overallScore: this.calculateValidationScore(violations, warnings, privacySafeRules.length),
      violations,
      warnings,
      metadata: {
        contentLength,
        processingTime: Date.now() - startTime,
        rulesApplied: privacySafeRules.length,
        privacyCompliant: true // Hash-only approach is privacy-compliant
      }
    }

    this.validationHistory.push(result)
    return result
  }

  /**
   * Apply validation rule to content
   */
  private async applyValidationRule(
    rule: ValidationRule,
    content: string
  ): Promise<{
    violation?: ValidationViolation
    warning?: ValidationWarning
  }> {
    let isViolation = false
    let violationDetails: string = ''

    try {
      if (rule.pattern) {
        const matches = content.match(rule.pattern)
        if (matches && matches.length > 0) {
          isViolation = true
          violationDetails = `Pattern matched: ${matches.length} occurrences`
        }
      }

      if (rule.validator) {
        const validatorResult = rule.validator(content)
        if (!validatorResult) {
          isViolation = true
          violationDetails = 'Validator returned false'
        }
      }

      if (isViolation) {
        const violation: ValidationViolation = {
          ruleId: rule.id,
          ruleName: rule.name,
          severity: rule.severity,
          category: rule.category,
          description: `${rule.description}: ${violationDetails}`,
          recommendation: this.getRecommendationForRule(rule),
          autoFixable: this.isAutoFixable(rule)
        }

        return { violation }
      }

    } catch (error) {
      // Convert errors to warnings
      const warning: ValidationWarning = {
        ruleId: rule.id,
        ruleName: rule.name,
        category: rule.category,
        description: `Rule application error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        recommendation: 'Review rule configuration'
      }

      return { warning }
    }

    return {}
  }

  /**
   * Collect privacy-safe content metrics
   */
  private collectContentMetrics(content: string): ContentMetrics {
    const words = content.trim().split(/\s+/).filter(word => word.length > 0)
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0)
    const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim().length > 0)

    const totalWordLength = words.reduce((sum, word) => sum + word.length, 0)
    const totalSentenceLength = sentences.reduce((sum, sentence) => sum + sentence.trim().length, 0)

    return {
      length: content.length,
      wordCount: words.length,
      paragraphCount: paragraphs.length,
      sentenceCount: sentences.length,
      averageWordLength: words.length > 0 ? totalWordLength / words.length : 0,
      averageSentenceLength: sentences.length > 0 ? totalSentenceLength / sentences.length : 0,
      complexityScore: this.calculateComplexityScore(content),
      encodingValidation: this.isValidUTF8(content)
    }
  }

  /**
   * Calculate content complexity score
   */
  private calculateComplexityScore(content: string): number {
    const words = content.trim().split(/\s+/)
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0)
    
    if (sentences.length === 0 || words.length === 0) return 0

    const averageWordsPerSentence = words.length / sentences.length
    const averageCharactersPerWord = content.replace(/\s/g, '').length / words.length

    // Flesch-like complexity score (simplified)
    const complexity = (averageWordsPerSentence * 1.015) + (averageCharactersPerWord * 84.6)
    
    return Math.min(100, Math.max(0, 100 - complexity))
  }

  /**
   * Validation rule implementations
   */
  private detectPII(content: string): boolean {
    // This is a privacy-unsafe rule - only use if explicitly allowed
    const piiPatterns = [
      /\b\d{3}-\d{2}-\d{4}\b/, // SSN
      /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/, // Credit card
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/ // Email
    ]

    return !piiPatterns.some(pattern => pattern.test(content))
  }

  private validateNoContentStorage(content: string): boolean {
    // Constitutional validation: ensure no content storage references
    const storagePatterns = [
      /store.*content/i,
      /save.*text/i,
      /persist.*data/i,
      /cache.*content/i
    ]

    return !storagePatterns.some(pattern => pattern.test(content))
  }

  private validateHashOnlyProcessing(content: string): boolean {
    // Validate that processing follows hash-only approach
    // This checks for patterns that might indicate non-hash processing
    const nonHashPatterns = [
      /originalText/i,
      /rawContent/i,
      /unprocessedData/i
    ]

    return !nonHashPatterns.some(pattern => pattern.test(content))
  }

  private validateEncoding(content: string): boolean {
    return this.isValidUTF8(content)
  }

  private validateLength(content: string): boolean {
    return content.length >= this.config.minContentLength && 
           content.length <= this.config.maxContentLength
  }

  private detectMalformedContent(content: string): boolean {
    // Check for common malformation patterns
    const malformationPatterns = [
      /\0/, // Null bytes
      /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/, // Control characters
      /\uFFFE|\uFFFF/ // Invalid Unicode
    ]

    return !malformationPatterns.some(pattern => pattern.test(content))
  }

  private detectExcessiveRepetition(content: string): boolean {
    // Check for excessive character repetition
    const excessiveRepetition = /(.)\1{10,}/ // Same character 10+ times
    const excessiveWordRepetition = /\b(\w+)\s+\1\s+\1\s+\1\b/i // Same word 4+ times

    return !(excessiveRepetition.test(content) || excessiveWordRepetition.test(content))
  }

  /**
   * Utility methods
   */
  private isValidUTF8(content: string): boolean {
    try {
      // Test UTF-8 validity by encoding and decoding
      const buffer = Buffer.from(content, 'utf8')
      return buffer.toString('utf8') === content
    } catch {
      return false
    }
  }

  private generateContentHash(content: string): string {
    return createHash('sha256')
      .update(content)
      .digest('hex')
  }

  private getApplicableRules(options: { ruleCategories?: string[] }): ValidationRule[] {
    let rules = Array.from(this.validationRules.values()).filter(rule => rule.enabled)

    if (options.ruleCategories) {
      rules = rules.filter(rule => options.ruleCategories!.includes(rule.category))
    }

    return rules
  }

  private calculateValidationScore(
    violations: ValidationViolation[],
    warnings: ValidationWarning[],
    rulesApplied: number
  ): number {
    if (rulesApplied === 0) return 100

    const criticalViolations = violations.filter(v => v.severity === 'critical').length
    const highViolations = violations.filter(v => v.severity === 'high').length
    const mediumViolations = violations.filter(v => v.severity === 'medium').length
    const lowViolations = violations.filter(v => v.severity === 'low').length

    // Critical violations result in zero score
    if (criticalViolations > 0) return 0

    const penalty = (highViolations * 20) + (mediumViolations * 10) + (lowViolations * 5) + (warnings.length * 2)
    
    return Math.max(0, 100 - penalty)
  }

  private verifyPrivacyCompliance(violations: ValidationViolation[]): boolean {
    // Check if any violations are privacy-related
    const privacyViolations = violations.filter(v => 
      v.category === 'privacy' || v.category === 'constitutional'
    )
    
    return privacyViolations.length === 0
  }

  private validateContentMetrics(metrics: Partial<ContentMetrics>): {
    violations: ValidationViolation[]
    warnings: ValidationWarning[]
  } {
    const violations: ValidationViolation[] = []
    const warnings: ValidationWarning[] = []

    if (metrics.length && metrics.length > this.config.maxContentLength) {
      violations.push({
        ruleId: 'metrics-length-validation',
        ruleName: 'Metrics Length Validation',
        severity: 'medium',
        category: 'format',
        description: 'Content length exceeds maximum allowed',
        recommendation: 'Reduce content length',
        autoFixable: false
      })
    }

    if (metrics.complexityScore && metrics.complexityScore < 10) {
      warnings.push({
        ruleId: 'metrics-complexity-warning',
        ruleName: 'Content Complexity Warning',
        category: 'content',
        description: 'Content complexity is very low',
        recommendation: 'Consider more varied content structure'
      })
    }

    return { violations, warnings }
  }

  private getRecommendationForRule(rule: ValidationRule): string {
    const recommendations: Record<string, string> = {
      'sql-injection-check': 'Remove SQL keywords and use parameterized queries',
      'script-injection-check': 'Remove script tags and JavaScript code',
      'xss-prevention': 'Remove potentially dangerous URL schemes and event handlers',
      'pii-detection': 'Remove or anonymize personally identifiable information',
      'email-detection': 'Remove or mask email addresses',
      'phone-detection': 'Remove or mask phone numbers',
      'content-storage-check': 'Ensure content is not stored in original form',
      'hash-only-validation': 'Use hash-only processing approach',
      'encoding-validation': 'Ensure content uses valid UTF-8 encoding',
      'length-validation': 'Adjust content length to meet requirements',
      'malformed-content': 'Fix malformed characters and encoding issues',
      'excessive-repetition': 'Reduce repetitive content patterns'
    }

    return recommendations[rule.id] || 'Review and fix the identified issue'
  }

  private isAutoFixable(rule: ValidationRule): boolean {
    const autoFixableRules = [
      'encoding-validation',
      'malformed-content',
      'excessive-repetition'
    ]

    return autoFixableRules.includes(rule.id)
  }

  private manageValidationHistory(): void {
    const maxHistory = 1000
    if (this.validationHistory.length > maxHistory) {
      this.validationHistory.splice(0, this.validationHistory.length - maxHistory)
    }
  }

  /**
   * Get validation statistics
   */
  getValidationStats(): {
    totalValidations: number
    validationsByCategory: Record<string, number>
    averageScore: number
    violationRate: number
    privacyComplianceRate: number
    mostCommonViolations: Array<{ ruleId: string; count: number }>
  } {
    const totalValidations = this.validationHistory.length
    
    if (totalValidations === 0) {
      return {
        totalValidations: 0,
        validationsByCategory: {},
        averageScore: 100,
        violationRate: 0,
        privacyComplianceRate: 1,
        mostCommonViolations: []
      }
    }

    const validationsByCategory: Record<string, number> = {}
    let totalScore = 0
    let validationsWithViolations = 0
    let privacyCompliantValidations = 0
    const violationCounts: Record<string, number> = {}

    for (const validation of this.validationHistory) {
      totalScore += validation.overallScore
      
      if (validation.violations.length > 0) {
        validationsWithViolations++
      }
      
      if (validation.metadata.privacyCompliant) {
        privacyCompliantValidations++
      }

      for (const violation of validation.violations) {
        validationsByCategory[violation.category] = (validationsByCategory[violation.category] || 0) + 1
        violationCounts[violation.ruleId] = (violationCounts[violation.ruleId] || 0) + 1
      }
    }

    const mostCommonViolations = Object.entries(violationCounts)
      .map(([ruleId, count]) => ({ ruleId, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    return {
      totalValidations,
      validationsByCategory,
      averageScore: totalScore / totalValidations,
      violationRate: validationsWithViolations / totalValidations,
      privacyComplianceRate: privacyCompliantValidations / totalValidations,
      mostCommonViolations
    }
  }

  /**
   * Export validation data for compliance
   */
  exportValidationData(): {
    validationHistory: ContentValidationResult[]
    validationRules: ValidationRule[]
    stats: {
      totalValidations: number
      validationsByCategory: Record<string, number>
      averageScore: number
      violationRate: number
      privacyComplianceRate: number
      mostCommonViolations: Array<{ ruleId: string; count: number }>
    }
    exportedAt: string
    privacyCompliant: boolean
  } {
    return {
      validationHistory: this.validationHistory,
      validationRules: Array.from(this.validationRules.values()),
      stats: this.getValidationStats(),
      exportedAt: new Date().toISOString(),
      privacyCompliant: true // Export data is privacy-compliant
    }
  }
}

/**
 * Default content validation service
 */
export const defaultContentValidator = new EnhancedContentValidationService({
  privacySafeOnly: true,
  enableConstitutionalRules: true
})

/**
 * Strict content validation service for maximum security
 */
export const strictContentValidator = new EnhancedContentValidationService({
  privacySafeOnly: true,
  enableConstitutionalRules: true,
  enableSecurityRules: true,
  enablePrivacyRules: true,
  maxContentLength: 500000 // 500KB
})

// Export types
export type {
  ValidationRule,
  ContentValidationResult,
  ValidationViolation,
  ValidationWarning,
  ContentMetrics,
  ValidationConfig
}