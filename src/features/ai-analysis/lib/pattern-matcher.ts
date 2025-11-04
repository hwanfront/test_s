export interface PatternMatch {
  category: string
  confidence: number
  startPosition: number
  endPosition: number
  matchedText: string
  keywords: string[]
}

export interface PatternRule {
  category: string
  patterns: RegExp[]
  keywords: string[]
  weight: number
  description: string
}

/**
 * Pattern matcher for identifying common problematic clauses in legal documents
 * Uses regex patterns and keyword matching to find potential risks
 */
export class PatternMatcher {
  private rules: PatternRule[]

  constructor() {
    this.rules = this.initializeRules()
  }

  /**
   * Find all pattern matches in the given content
   * @param content Text content to analyze
   * @returns Array of pattern matches
   */
  findPatterns(content: string): PatternMatch[] {
    const matches: PatternMatch[] = []

    for (const rule of this.rules) {
      const ruleMatches = this.findRuleMatches(content, rule)
      matches.push(...ruleMatches)
    }

    // Sort by confidence score (highest first)
    return matches.sort((a, b) => b.confidence - a.confidence)
  }

  /**
   * Find matches for a specific rule
   */
  private findRuleMatches(content: string, rule: PatternRule): PatternMatch[] {
    const matches: PatternMatch[] = []

    // Check regex patterns
    for (const pattern of rule.patterns) {
      let match
      while ((match = pattern.exec(content)) !== null) {
        const startPosition = match.index
        const endPosition = match.index + match[0].length
        const matchedText = match[0]

        // Calculate confidence based on context and keywords
        const confidence = this.calculateConfidence(matchedText, content, rule)

        matches.push({
          category: rule.category,
          confidence,
          startPosition,
          endPosition,
          matchedText,
          keywords: rule.keywords
        })

        // Prevent infinite loop for global patterns
        if (!pattern.global) break
      }
    }

    return matches
  }

  /**
   * Calculate confidence score for a match
   */
  private calculateConfidence(matchedText: string, fullContent: string, rule: PatternRule): number {
    let confidence = rule.weight // Base confidence from rule weight

    // Boost confidence if multiple keywords are present
    const keywordMatches = rule.keywords.filter(keyword => 
      matchedText.toLowerCase().includes(keyword.toLowerCase())
    )
    confidence += keywordMatches.length * 5

    // Boost confidence based on context around the match
    const context = this.getContext(matchedText, fullContent, 50)
    const contextKeywords = rule.keywords.filter(keyword =>
      context.toLowerCase().includes(keyword.toLowerCase())
    )
    confidence += contextKeywords.length * 3

    // Reduce confidence for very short matches
    if (matchedText.length < 20) {
      confidence -= 10
    }

    // Cap confidence at 100
    return Math.min(confidence, 100)
  }

  /**
   * Get context around a matched text
   */
  private getContext(matchedText: string, fullContent: string, contextLength: number): string {
    const matchIndex = fullContent.indexOf(matchedText)
    if (matchIndex === -1) return matchedText

    const start = Math.max(0, matchIndex - contextLength)
    const end = Math.min(fullContent.length, matchIndex + matchedText.length + contextLength)

    return fullContent.substring(start, end)
  }

  /**
   * Initialize pattern recognition rules
   */
  private initializeRules(): PatternRule[] {
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
      },
      {
        category: 'data-collection',
        patterns: [
          /we\s+(?:collect|gather|obtain|acquire)\s+(?:all\s+)?(?:your\s+)?personal\s+(?:information|data)/gi,
          /(?:personal\s+)?(?:information|data)\s+(?:may\s+be\s+)?(?:shared|sold|transferred)\s+(?:with\s+|to\s+)?(?:third\s+parties|partners|affiliates)/gi,
          /we\s+(?:may\s+)?(?:share|sell|transfer|disclose)\s+(?:your\s+)?(?:personal\s+)?(?:information|data)/gi
        ],
        keywords: ['collect', 'personal information', 'share', 'third parties', 'data', 'privacy'],
        weight: 70,
        description: 'Extensive personal data collection or sharing with third parties'
      },
      {
        category: 'liability-limitation',
        patterns: [
          /we\s+(?:are\s+)?not\s+(?:liable|responsible)\s+for\s+any\s+(?:damages?|losses?|harm)/gi,
          /(?:limitation\s+of\s+)?liability\s*:\s*(?:we\s+)?(?:disclaim|exclude|limit)\s+(?:all\s+)?(?:liability|responsibility)/gi,
          /to\s+the\s+(?:maximum\s+)?extent\s+permitted\s+by\s+law\s*,?\s*we\s+(?:disclaim|exclude|limit)/gi
        ],
        keywords: ['not liable', 'limitation of liability', 'disclaim', 'maximum extent', 'damages'],
        weight: 60,
        description: 'Broad limitation or exclusion of service provider liability'
      },
      {
        category: 'content-ownership',
        patterns: [
          /(?:all\s+)?(?:user\s+)?content\s+(?:becomes\s+|is\s+)?(?:our\s+)?(?:property|owned\s+by\s+us)/gi,
          /you\s+(?:grant|give)\s+us\s+(?:a\s+)?(?:perpetual|irrevocable|worldwide)\s+(?:license|right)/gi,
          /we\s+(?:own|retain)\s+(?:all\s+)?(?:rights|ownership)\s+(?:to\s+|in\s+)?(?:user\s+)?content/gi
        ],
        keywords: ['content ownership', 'perpetual license', 'irrevocable', 'user content', 'property'],
        weight: 65,
        description: 'Claims of ownership or broad rights over user-generated content'
      },
      {
        category: 'dispute-resolution',
        patterns: [
          /(?:all\s+)?disputes?\s+(?:must\s+be\s+|will\s+be\s+)?resolved\s+(?:through\s+|by\s+)?arbitration/gi,
          /you\s+(?:waive|give\s+up)\s+(?:your\s+)?right\s+to\s+(?:a\s+)?(?:jury\s+trial|class\s+action)/gi,
          /(?:binding\s+)?arbitration\s+(?:clause|agreement|provision)/gi
        ],
        keywords: ['arbitration', 'waive', 'jury trial', 'class action', 'binding', 'disputes'],
        weight: 55,
        description: 'Mandatory arbitration or waiver of legal rights'
      },
      {
        category: 'automatic-renewal',
        patterns: [
          /(?:subscription|service)\s+(?:will\s+)?(?:automatically\s+)?(?:renew|continue|extend)/gi,
          /(?:auto[\s-]?renewal|automatic\s+renewal|automatic\s+billing)/gi,
          /unless\s+you\s+cancel\s+(?:before\s+|prior\s+to\s+)?(?:the\s+)?(?:renewal\s+)?(?:date|period)/gi
        ],
        keywords: ['automatic renewal', 'auto-renewal', 'automatically renew', 'unless you cancel'],
        weight: 50,
        description: 'Automatic subscription renewal without explicit consent'
      },
      {
        category: 'price-changes',
        patterns: [
          /we\s+(?:reserve\s+the\s+right\s+to\s+|may\s+)?(?:change|modify|adjust|increase)\s+(?:our\s+)?(?:prices?|fees?|rates?)/gi,
          /(?:prices?|fees?|rates?)\s+(?:are\s+)?subject\s+to\s+change\s+(?:at\s+any\s+time)?(?:\s+without\s+notice)?/gi,
          /(?:pricing|fee)\s+(?:changes|modifications)\s+(?:without\s+(?:notice|warning))/gi
        ],
        keywords: ['price changes', 'fees subject to change', 'without notice', 'reserve the right'],
        weight: 45,
        description: 'Unilateral price changes without adequate notice'
      }
    ]
  }

  /**
   * Add a custom pattern rule
   */
  addRule(rule: PatternRule): void {
    this.rules.push(rule)
  }

  /**
   * Remove a pattern rule by category
   */
  removeRule(category: string): void {
    this.rules = this.rules.filter(rule => rule.category !== category)
  }

  /**
   * Get all available pattern categories
   */
  getCategories(): string[] {
    return this.rules.map(rule => rule.category)
  }

  /**
   * Get statistics about pattern matching
   */
  getStats(content: string): { 
    totalMatches: number
    categoryCounts: Record<string, number>
    averageConfidence: number
  } {
    const matches = this.findPatterns(content)
    
    const categoryCounts: Record<string, number> = {}
    matches.forEach(match => {
      categoryCounts[match.category] = (categoryCounts[match.category] || 0) + 1
    })

    const averageConfidence = matches.length > 0 
      ? matches.reduce((sum, match) => sum + match.confidence, 0) / matches.length
      : 0

    return {
      totalMatches: matches.length,
      categoryCounts,
      averageConfidence: Math.round(averageConfidence)
    }
  }
}