/**
 * Clause Pattern Matcher (Task T050)
 * 
 * Constitutional Compliance: This module analyzes preprocessed text patterns
 * without storing original content, maintaining strict isolation
 */

export interface ClausePattern {
  id: string
  category: string
  name: string
  description: string
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  keywords: string[]
  promptTemplate: string
  weight?: number
  enabled?: boolean
  lastUpdated?: string
}

export interface PatternMatch {
  patternId: string
  category: string
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  confidence: number
  startPosition: number
  endPosition: number
  matchedText: string
  matchedKeywords: string[]
  context: string
  weight: number
}

export interface PatternMatchResult {
  totalMatches: number
  highRiskMatches: number
  mediumRiskMatches: number
  lowRiskMatches: number
  matches: PatternMatch[]
  overallRiskScore: number
  confidence: number
  processingTimeMs: number
}

export interface PatternMatchOptions {
  caseSensitive?: boolean
  wholeWordOnly?: boolean
  maxContextLength?: number
  minConfidence?: number
  enabledCategoriesOnly?: boolean
  customWeights?: Record<string, number>
}

// Legacy interfaces for backward compatibility
export interface PatternRule {
  category: string
  patterns: RegExp[]
  keywords: string[]
  weight: number
  description: string
}

/**
 * Mobile Gaming Clause Patterns (Seeded Data)
 */
export const MOBILE_GAMING_PATTERNS: ClausePattern[] = [
  {
    id: 'mg_001',
    category: 'payment',
    name: 'Auto-Renewal Subscription',
    description: 'Clauses about automatic subscription renewals that may be difficult to cancel',
    riskLevel: 'high',
    keywords: ['auto-renew', 'automatically renewed', 'continuous subscription', 'recurring billing', 'auto-billing'],
    promptTemplate: 'Analyze this clause for automatic renewal terms and potential difficulty in cancellation',
    weight: 0.8,
    enabled: true
  },
  {
    id: 'mg_002',
    category: 'payment',
    name: 'In-App Purchase Restrictions',
    description: 'Terms that limit refunds or returns for in-app purchases',
    riskLevel: 'critical',
    keywords: ['no refund', 'final sale', 'non-refundable', 'virtual currency', 'in-app purchase'],
    promptTemplate: 'Examine this clause for unfair restrictions on in-app purchase refunds',
    weight: 1.0,
    enabled: true
  },
  {
    id: 'mg_003',
    category: 'data',
    name: 'Broad Data Collection',
    description: 'Excessive personal data collection beyond game functionality',
    riskLevel: 'high',
    keywords: ['collect personal data', 'usage information', 'device information', 'location data', 'behavioral data'],
    promptTemplate: 'Assess whether data collection is proportionate to game functionality',
    weight: 0.7,
    enabled: true
  },
  {
    id: 'mg_004',
    category: 'data',
    name: 'Third-Party Data Sharing',
    description: 'Sharing user data with advertisers or unknown third parties',
    riskLevel: 'critical',
    keywords: ['share with partners', 'third-party services', 'advertising partners', 'analytics providers', 'data sharing'],
    promptTemplate: 'Analyze data sharing practices with third parties and user control',
    weight: 0.9,
    enabled: true
  },
  {
    id: 'mg_005',
    category: 'account',
    name: 'Account Termination',
    description: 'Broad company rights to terminate accounts without clear reasons',
    riskLevel: 'medium',
    keywords: ['terminate account', 'suspend access', 'ban user', 'sole discretion', 'violation'],
    promptTemplate: 'Review account termination clauses for fairness and due process',
    weight: 0.6,
    enabled: true
  },
  {
    id: 'mg_006',
    category: 'content',
    name: 'User Content Rights',
    description: 'Terms giving the company broad rights over user-generated content',
    riskLevel: 'medium',
    keywords: ['user content', 'license to use', 'intellectual property', 'royalty-free', 'perpetual license'],
    promptTemplate: 'Evaluate user content licensing terms for fairness',
    weight: 0.5,
    enabled: true
  },
  {
    id: 'mg_007',
    category: 'liability',
    name: 'Limitation of Liability',
    description: 'Clauses that excessively limit company liability for damages',
    riskLevel: 'high',
    keywords: ['limit liability', 'no damages', 'exclude liability', 'maximum liability', 'not responsible'],
    promptTemplate: 'Assess whether liability limitations are reasonable and legal',
    weight: 0.7,
    enabled: true
  },
  {
    id: 'mg_008',
    category: 'dispute',
    name: 'Mandatory Arbitration',
    description: 'Requirements for arbitration that may limit user legal rights',
    riskLevel: 'high',
    keywords: ['binding arbitration', 'waive right to jury', 'class action waiver', 'arbitration clause', 'dispute resolution'],
    promptTemplate: 'Examine arbitration requirements and their impact on user rights',
    weight: 0.8,
    enabled: true
  },
  {
    id: 'mg_009',
    category: 'changes',
    name: 'Unilateral Terms Changes',
    description: 'Company rights to change terms without user consent or notice',
    riskLevel: 'medium',
    keywords: ['modify terms', 'change agreement', 'update terms', 'unilateral changes', 'without notice'],
    promptTemplate: 'Review terms modification clauses for adequate user protection',
    weight: 0.6,
    enabled: true
  },
  {
    id: 'mg_010',
    category: 'virtual_goods',
    name: 'Virtual Currency Restrictions',
    description: 'Terms that devalue or restrict virtual currency and items',
    riskLevel: 'high',
    keywords: ['virtual currency', 'game currency', 'no real value', 'virtual items', 'digital goods'],
    promptTemplate: 'Analyze virtual currency terms for fairness and transparency',
    weight: 0.7,
    enabled: true
  }
]

/**
 * Main Pattern Matcher Class
 */
export class PatternMatcher {
  private patterns: Map<string, ClausePattern>
  private defaultOptions: Required<PatternMatchOptions>
  private legacyRules: PatternRule[] // For backward compatibility

  constructor(patterns: ClausePattern[] = MOBILE_GAMING_PATTERNS) {
    this.patterns = new Map()
    patterns.forEach(pattern => this.patterns.set(pattern.id, pattern))

    this.defaultOptions = {
      caseSensitive: false,
      wholeWordOnly: true,
      maxContextLength: 200,
      minConfidence: 0.1,
      enabledCategoriesOnly: true,
      customWeights: {}
    }

    this.legacyRules = this.initializeLegacyRules()
  }

  /**
   * Main pattern matching method (Task T050)
   */
  async matchPatterns(
    text: string,
    options: PatternMatchOptions = {}
  ): Promise<PatternMatchResult> {
    const startTime = Date.now()
    const mergedOptions = { ...this.defaultOptions, ...options }
    
    const matches: PatternMatch[] = []
    const enabledPatterns = Array.from(this.patterns.values())
      .filter(pattern => !mergedOptions.enabledCategoriesOnly || pattern.enabled !== false)

    // Process each pattern
    for (const pattern of enabledPatterns) {
      const patternMatches = await this.findPatternMatches(text, pattern, mergedOptions)
      matches.push(...patternMatches)
    }

    // Sort matches by position
    matches.sort((a, b) => a.startPosition - b.startPosition)

    // Remove overlapping matches (keep highest confidence)
    const deduplicatedMatches = this.removeDuplicateMatches(matches)

    // Calculate statistics
    const stats = this.calculateMatchStatistics(deduplicatedMatches)
    const processingTimeMs = Date.now() - startTime

    return {
      ...stats,
      matches: deduplicatedMatches,
      processingTimeMs
    }
  }

  /**
   * Find matches for a specific pattern
   */
  private async findPatternMatches(
    text: string,
    pattern: ClausePattern,
    options: Required<PatternMatchOptions>
  ): Promise<PatternMatch[]> {
    const matches: PatternMatch[] = []
    const processedText = options.caseSensitive ? text : text.toLowerCase()
    const weight = options.customWeights[pattern.id] || pattern.weight || 1.0

    for (const keyword of pattern.keywords) {
      const searchKeyword = options.caseSensitive ? keyword : keyword.toLowerCase()
      
      let startIndex = 0
      while (true) {
        let matchIndex = processedText.indexOf(searchKeyword, startIndex)
        
        if (matchIndex === -1) break

        // Check whole word requirement
        if (options.wholeWordOnly && !this.isWholeWordMatch(processedText, matchIndex, searchKeyword)) {
          startIndex = matchIndex + 1
          continue
        }

        // Calculate confidence based on keyword match quality
        const confidence = this.calculateMatchConfidence(
          text,
          matchIndex,
          searchKeyword,
          pattern,
          weight
        )

        if (confidence >= options.minConfidence) {
          const context = this.extractContext(text, matchIndex, searchKeyword.length, options.maxContextLength)
          
          matches.push({
            patternId: pattern.id,
            category: pattern.category,
            riskLevel: pattern.riskLevel,
            confidence,
            startPosition: matchIndex,
            endPosition: matchIndex + searchKeyword.length,
            matchedText: text.substring(matchIndex, matchIndex + searchKeyword.length),
            matchedKeywords: [keyword],
            context,
            weight
          })
        }

        startIndex = matchIndex + 1
      }
    }

    return matches
  }

  /**
   * Check if match is a whole word
   */
  private isWholeWordMatch(text: string, index: number, keyword: string): boolean {
    const before = index > 0 ? text[index - 1] : ' '
    const after = index + keyword.length < text.length ? text[index + keyword.length] : ' '
    
    const wordBoundaryRegex = /[^a-zA-Z0-9_]/
    return wordBoundaryRegex.test(before) && wordBoundaryRegex.test(after)
  }

  /**
   * Calculate match confidence score
   */
  private calculateMatchConfidence(
    text: string,
    matchIndex: number,
    keyword: string,
    pattern: ClausePattern,
    weight: number
  ): number {
    let confidence = 0.5 // Base confidence

    // Adjust for keyword length (longer keywords are more specific)
    confidence += Math.min(0.3, keyword.length * 0.02)

    // Adjust for pattern weight
    confidence *= weight

    // Adjust for risk level (higher risk patterns get slightly higher confidence)
    const riskBonus = {
      'low': 0.0,
      'medium': 0.05,
      'high': 0.1,
      'critical': 0.15
    }
    confidence += riskBonus[pattern.riskLevel] || 0

    // Context analysis - check for related keywords nearby
    const contextRadius = 50
    const contextStart = Math.max(0, matchIndex - contextRadius)
    const contextEnd = Math.min(text.length, matchIndex + keyword.length + contextRadius)
    const contextText = text.substring(contextStart, contextEnd).toLowerCase()

    // Count other keywords from the same pattern in nearby context
    const relatedKeywords = pattern.keywords.filter(k => 
      k.toLowerCase() !== keyword.toLowerCase() && 
      contextText.includes(k.toLowerCase())
    )
    confidence += relatedKeywords.length * 0.1

    return Math.min(1.0, Math.max(0.0, confidence))
  }

  /**
   * Extract context around a match
   */
  private extractContext(text: string, matchIndex: number, matchLength: number, maxLength: number): string {
    const beforeLength = Math.floor((maxLength - matchLength) / 2)
    const afterLength = maxLength - matchLength - beforeLength

    const start = Math.max(0, matchIndex - beforeLength)
    const end = Math.min(text.length, matchIndex + matchLength + afterLength)

    let context = text.substring(start, end)

    // Add ellipsis if truncated
    if (start > 0) context = '...' + context
    if (end < text.length) context = context + '...'

    return context
  }

  /**
   * Remove overlapping matches, keeping highest confidence
   */
  private removeDuplicateMatches(matches: PatternMatch[]): PatternMatch[] {
    if (matches.length <= 1) return matches

    const sorted = [...matches].sort((a, b) => b.confidence - a.confidence)
    const result: PatternMatch[] = []

    for (const match of sorted) {
      const hasOverlap = result.some(existing => 
        this.hasOverlap(match, existing)
      )

      if (!hasOverlap) {
        result.push(match)
      }
    }

    return result.sort((a, b) => a.startPosition - b.startPosition)
  }

  /**
   * Check if two matches overlap
   */
  private hasOverlap(match1: PatternMatch, match2: PatternMatch): boolean {
    return !(match1.endPosition <= match2.startPosition || match2.endPosition <= match1.startPosition)
  }

  /**
   * Calculate match statistics
   */
  private calculateMatchStatistics(matches: PatternMatch[]): Omit<PatternMatchResult, 'matches' | 'processingTimeMs'> {
    const totalMatches = matches.length
    const highRiskMatches = matches.filter(m => m.riskLevel === 'high' || m.riskLevel === 'critical').length
    const mediumRiskMatches = matches.filter(m => m.riskLevel === 'medium').length
    const lowRiskMatches = matches.filter(m => m.riskLevel === 'low').length

    // Calculate overall risk score
    let weightedRiskSum = 0
    let totalWeight = 0

    for (const match of matches) {
      const riskValue = this.getRiskValue(match.riskLevel)
      const weight = match.weight * match.confidence
      weightedRiskSum += riskValue * weight
      totalWeight += weight
    }

    const overallRiskScore = totalWeight > 0 ? Math.round((weightedRiskSum / totalWeight) * 100) / 100 : 0

    // Calculate overall confidence
    const avgConfidence = matches.length > 0 
      ? matches.reduce((sum, match) => sum + match.confidence, 0) / matches.length 
      : 0

    return {
      totalMatches,
      highRiskMatches,
      mediumRiskMatches,
      lowRiskMatches,
      overallRiskScore,
      confidence: Math.round(avgConfidence * 100) / 100
    }
  }

  /**
   * Convert risk level to numeric value
   */
  private getRiskValue(riskLevel: string): number {
    const values = {
      'low': 25,
      'medium': 50,
      'high': 75,
      'critical': 100
    }
    return values[riskLevel as keyof typeof values] || 0
  }

  /**
   * Pattern management methods
   */
  addPattern(pattern: ClausePattern): void {
    this.patterns.set(pattern.id, {
      ...pattern,
      enabled: pattern.enabled !== false,
      lastUpdated: new Date().toISOString()
    })
  }

  removePattern(patternId: string): boolean {
    return this.patterns.delete(patternId)
  }

  updatePattern(patternId: string, updates: Partial<ClausePattern>): boolean {
    const existing = this.patterns.get(patternId)
    if (!existing) return false

    this.patterns.set(patternId, {
      ...existing,
      ...updates,
      lastUpdated: new Date().toISOString()
    })
    return true
  }

  getPattern(patternId: string): ClausePattern | undefined {
    return this.patterns.get(patternId)
  }

  getAllPatterns(): ClausePattern[] {
    return Array.from(this.patterns.values())
  }

  getPatternsByCategory(category: string): ClausePattern[] {
    return Array.from(this.patterns.values()).filter(p => p.category === category)
  }

  getEnabledPatterns(): ClausePattern[] {
    return Array.from(this.patterns.values()).filter(p => p.enabled !== false)
  }

  /**
   * Export/Import patterns for backup and sharing
   */
  exportPatterns(): string {
    return JSON.stringify(Array.from(this.patterns.values()), null, 2)
  }

  importPatterns(patternsJson: string): number {
    try {
      const patterns: ClausePattern[] = JSON.parse(patternsJson)
      let imported = 0

      for (const pattern of patterns) {
        if (pattern.id && pattern.category && pattern.name) {
          this.addPattern(pattern)
          imported++
        }
      }

      return imported
    } catch (error) {
      throw new Error(`Failed to import patterns: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get pattern matching statistics
   */
  getPatternStats(): {
    totalPatterns: number
    enabledPatterns: number
    patternsByCategory: Record<string, number>
    patternsByRisk: Record<string, number>
  } {
    const allPatterns = this.getAllPatterns()
    const enabledPatterns = this.getEnabledPatterns()

    const patternsByCategory: Record<string, number> = {}
    const patternsByRisk: Record<string, number> = {}

    allPatterns.forEach(pattern => {
      patternsByCategory[pattern.category] = (patternsByCategory[pattern.category] || 0) + 1
      patternsByRisk[pattern.riskLevel] = (patternsByRisk[pattern.riskLevel] || 0) + 1
    })

    return {
      totalPatterns: allPatterns.length,
      enabledPatterns: enabledPatterns.length,
      patternsByCategory,
      patternsByRisk
    }
  }

  // Legacy methods for backward compatibility
  /**
   * Legacy method - Find all pattern matches in the given content
   * @param content Text content to analyze
   * @returns Array of pattern matches (legacy format)
   */
  async findPatterns(content: string): Promise<Array<{
    category: string
    confidence: number
    startPosition: number
    endPosition: number
    matchedText: string
    keywords: string[]
  }>> {
    const result = await this.matchPatterns(content)
    
    // Convert new format to legacy format
    return result.matches.map(match => ({
      category: match.category,
      confidence: Math.round(match.confidence * 100),
      startPosition: match.startPosition,
      endPosition: match.endPosition,
      matchedText: match.matchedText,
      keywords: match.matchedKeywords
    }))
  }

  private initializeLegacyRules(): PatternRule[] {
    return [
      {
        category: 'account-termination',
        patterns: [
          /we\s+(?:reserve\s+the\s+right\s+to\s+)?(?:terminate|suspend|cancel|deactivate|delete)\s+(?:your\s+)?account\s*(?:at\s+any\s+time)?(?:\s+without\s+(?:notice|warning|cause|reason))?/gi,
          /(?:termination|suspension|cancellation)\s+(?:of\s+)?(?:your\s+)?account\s*(?:without\s+(?:notice|warning|cause|reason))/gi,
          /account\s+(?:may\s+be\s+)?(?:terminated|suspended|cancelled)\s*(?:at\s+any\s+time)?(?:\s+without\s+(?:notice|warning|cause|reason))?/gi
        ],
        keywords: ['terminate', 'suspend', 'cancel', 'account', 'without notice', 'at any time', 'discretion'],
        weight: 80,
        description: 'Arbitrary account termination without notice or cause'
      },
      {
        category: 'virtual-currency',
        patterns: [
          /virtual\s+(?:currency|money|coins?|gems?|points?)\s+(?:has\s+no\s+|have\s+no\s+)?(?:real[\s-]?world\s+)?value/gi,
          /(?:virtual\s+)?(?:currency|money|coins?|gems?|points?)\s+(?:may\s+be\s+)?(?:forfeited|lost|removed|deleted|confiscated)/gi,
          /no\s+(?:real[\s-]?world\s+)?(?:monetary\s+)?value\s+(?:for\s+)?(?:virtual\s+)?(?:currency|items?|coins?)/gi
        ],
        keywords: ['virtual currency', 'no value', 'forfeited', 'real-world value', 'confiscated'],
        weight: 75,
        description: 'Virtual currency with no real-world value or risk of forfeiture'
      }
    ]
  }

  /**
   * Legacy method - Add a custom pattern rule
   */
  addRule(rule: PatternRule): void {
    this.legacyRules.push(rule)
  }

  /**
   * Legacy method - Remove a pattern rule by category
   */
  removeRule(category: string): void {
    this.legacyRules = this.legacyRules.filter((rule: PatternRule) => rule.category !== category)
  }

  /**
   * Legacy method - Get all available pattern categories
   */
  getCategories(): string[] {
    const newCategories = this.getAllPatterns().map(p => p.category)
    const legacyCategories = this.legacyRules.map((rule: PatternRule) => rule.category)
    return [...new Set([...newCategories, ...legacyCategories])]
  }

  /**
   * Legacy method - Get statistics about pattern matching
   */
  async getStats(content: string): Promise<{ 
    totalMatches: number
    categoryCounts: Record<string, number>
    averageConfidence: number
  }> {
    const matches = await this.findPatterns(content)
    
    const categoryCounts: Record<string, number> = {}
    matches.forEach((match: any) => {
      categoryCounts[match.category] = (categoryCounts[match.category] || 0) + 1
    })

    const averageConfidence = matches.length > 0 
      ? matches.reduce((sum: any, match: any) => sum + match.confidence, 0) / matches.length
      : 0

    return {
      totalMatches: matches.length,
      categoryCounts,
      averageConfidence: Math.round(averageConfidence)
    }
  }
}