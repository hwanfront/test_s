/**
 * Mobile Gaming Clause Patterns Seeder (Task T054)
 * 
 * Constitutional Compliance: This module provides comprehensive mobile gaming patterns
 * while maintaining strict isolation and constitutional compliance requirements
 */

import { PatternMatcher, ClausePattern } from './pattern-matcher'

export interface MobileGamingPatternCategory {
  id: string
  name: string
  description: string
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  patterns: ClausePattern[]
}

export interface SeedingResult {
  success: boolean
  totalPatterns: number
  categoriesSeeded: string[]
  duplicatesSkipped: number
  errors: string[]
  seededAt: string
}

export interface SeedingOptions {
  overwriteExisting?: boolean
  validatePatterns?: boolean
  enableAllCategories?: boolean
  specificCategories?: string[]
  customPatterns?: ClausePattern[]
}

/**
 * Mobile Gaming Patterns Seeder Class
 * Provides comprehensive patterns for mobile gaming T&C analysis
 */
export class MobileGamingSeeder {
  private patternMatcher: PatternMatcher
  private readonly MOBILE_GAMING_CATEGORIES: MobileGamingPatternCategory[]

  constructor(patternMatcher?: PatternMatcher) {
    this.patternMatcher = patternMatcher || new PatternMatcher()
    this.MOBILE_GAMING_CATEGORIES = this.initializeMobileGamingCategories()
  }

  /**
   * Seed all mobile gaming patterns into the pattern matcher
   */
  async seedPatterns(options: SeedingOptions = {}): Promise<SeedingResult> {
    const startTime = new Date()
    const result: SeedingResult = {
      success: false,
      totalPatterns: 0,
      categoriesSeeded: [],
      duplicatesSkipped: 0,
      errors: [],
      seededAt: startTime.toISOString()
    }

    try {
      // Determine which categories to seed
      const categoriesToSeed = this.determineCategoriesToSeed(options)
      
      // Validate patterns if requested
      if (options.validatePatterns) {
        const validationErrors = this.validateAllPatterns(categoriesToSeed)
        if (validationErrors.length > 0) {
          result.errors.push(...validationErrors)
          return result
        }
      }

      // Seed patterns by category
      for (const category of categoriesToSeed) {
        try {
          const categoryResult = await this.seedCategory(category, options)
          result.totalPatterns += categoryResult.patternsAdded
          result.duplicatesSkipped += categoryResult.duplicatesSkipped
          result.categoriesSeeded.push(category.name)
        } catch (error) {
          const errorMsg = `Failed to seed category ${category.name}: ${error instanceof Error ? error.message : 'Unknown error'}`
          result.errors.push(errorMsg)
        }
      }

      // Add custom patterns if provided
      if (options.customPatterns && options.customPatterns.length > 0) {
        const customResult = await this.seedCustomPatterns(options.customPatterns, options)
        result.totalPatterns += customResult.patternsAdded
        result.duplicatesSkipped += customResult.duplicatesSkipped
      }

      result.success = result.errors.length === 0
      return result

    } catch (error) {
      result.errors.push(`Seeding failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      return result
    }
  }

  /**
   * Get all available mobile gaming pattern categories
   */
  getAvailableCategories(): MobileGamingPatternCategory[] {
    return this.MOBILE_GAMING_CATEGORIES.map(cat => ({
      ...cat,
      patterns: cat.patterns.map(p => ({ ...p })) // Deep copy to prevent modification
    }))
  }

  /**
   * Get patterns for a specific category
   */
  getCategoryPatterns(categoryId: string): ClausePattern[] {
    const category = this.MOBILE_GAMING_CATEGORIES.find(cat => cat.id === categoryId)
    return category ? category.patterns.map(p => ({ ...p })) : []
  }

  /**
   * Validate a single pattern
   */
  validatePattern(pattern: ClausePattern): string[] {
    const errors: string[] = []

    if (!pattern.id || pattern.id.trim().length === 0) {
      errors.push('Pattern ID is required')
    }

    if (!pattern.category || pattern.category.trim().length === 0) {
      errors.push('Pattern category is required')
    }

    if (!pattern.name || pattern.name.trim().length === 0) {
      errors.push('Pattern name is required')
    }

    if (!pattern.keywords || pattern.keywords.length === 0) {
      errors.push('Pattern must have at least one keyword')
    }

    if (!['low', 'medium', 'high', 'critical'].includes(pattern.riskLevel)) {
      errors.push('Pattern must have valid risk level')
    }

    if (pattern.weight !== undefined && (pattern.weight < 0 || pattern.weight > 1)) {
      errors.push('Pattern weight must be between 0 and 1')
    }

    return errors
  }

  private initializeMobileGamingCategories(): MobileGamingPatternCategory[] {
    return [
      {
        id: 'payment_monetization',
        name: 'Payment & Monetization',
        description: 'Patterns related to in-app purchases, subscriptions, and monetization practices',
        riskLevel: 'high',
        patterns: [
          {
            id: 'mg_001',
            category: 'payment_monetization',
            name: 'Aggressive In-App Purchase Pressure',
            description: 'Terms that enable aggressive monetization tactics and purchase pressure',
            riskLevel: 'high',
            keywords: ['in-app purchase', 'virtual currency', 'premium content', 'purchase required', 'upgrade now', 'limited time offer'],
            promptTemplate: 'Analyze this clause for aggressive monetization tactics and consumer protection concerns',
            weight: 0.8
          },
          {
            id: 'mg_002',
            category: 'payment_monetization',
            name: 'Subscription Auto-Renewal Traps',
            description: 'Problematic auto-renewal and subscription terms that may trap users',
            riskLevel: 'critical',
            keywords: ['auto-renewal', 'automatic billing', 'subscription continues', 'unless cancelled', 'recurring charge', 'automatic payment'],
            promptTemplate: 'Evaluate this subscription clause for potential auto-renewal traps and unclear cancellation terms',
            weight: 0.9
          },
          {
            id: 'mg_003',
            category: 'payment_monetization',
            name: 'Virtual Currency Devaluation',
            description: 'Terms allowing arbitrary changes to virtual currency value',
            riskLevel: 'medium',
            keywords: ['virtual currency', 'game currency', 'coins', 'gems', 'credits', 'value may change', 'exchange rate'],
            promptTemplate: 'Analyze this virtual currency clause for consumer protection and value stability issues',
            weight: 0.7
          }
        ]
      },
      {
        id: 'data_privacy',
        name: 'Data Privacy & Tracking',
        description: 'Patterns related to user data collection, privacy, and tracking practices',
        riskLevel: 'critical',
        patterns: [
          {
            id: 'mg_004',
            category: 'data_privacy',
            name: 'Extensive Data Collection',
            description: 'Broad data collection terms that may violate privacy expectations',
            riskLevel: 'critical',
            keywords: ['collect data', 'personal information', 'device information', 'location data', 'contacts', 'usage analytics', 'behavioral data'],
            promptTemplate: 'Evaluate this data collection clause for privacy compliance and user rights protection',
            weight: 0.9
          },
          {
            id: 'mg_005',
            category: 'data_privacy',
            name: 'Third-Party Data Sharing',
            description: 'Terms allowing extensive sharing of user data with third parties',
            riskLevel: 'high',
            keywords: ['share with partners', 'third-party', 'advertising partners', 'analytics providers', 'data sharing', 'partners and affiliates'],
            promptTemplate: 'Analyze this data sharing clause for transparency and user control over personal information',
            weight: 0.85
          },
          {
            id: 'mg_006',
            category: 'data_privacy',
            name: 'Behavioral Tracking and Profiling',
            description: 'Terms enabling extensive behavioral tracking and user profiling',
            riskLevel: 'high',
            keywords: ['track behavior', 'user profiling', 'behavioral analysis', 'preference tracking', 'activity monitoring', 'engagement metrics'],
            promptTemplate: 'Examine this tracking clause for potential privacy overreach and user autonomy concerns',
            weight: 0.8
          }
        ]
      },
      {
        id: 'user_content',
        name: 'User-Generated Content',
        description: 'Patterns related to user content rights, ownership, and usage',
        riskLevel: 'medium',
        patterns: [
          {
            id: 'mg_007',
            category: 'user_content',
            name: 'Broad Content License Grant',
            description: 'Overly broad licenses granted to user-generated content',
            riskLevel: 'medium',
            keywords: ['license to use', 'user content', 'worldwide license', 'perpetual license', 'royalty-free', 'sublicense', 'modify content'],
            promptTemplate: 'Assess this content licensing clause for fairness and scope of rights granted to the platform',
            weight: 0.7
          },
          {
            id: 'mg_008',
            category: 'user_content',
            name: 'Content Ownership Transfer',
            description: 'Terms that may transfer ownership of user content to the platform',
            riskLevel: 'high',
            keywords: ['own content', 'transfer ownership', 'assign rights', 'content becomes ours', 'irrevocable transfer', 'waive rights'],
            promptTemplate: 'Evaluate this ownership clause for potential overreach and user rights preservation',
            weight: 0.85
          }
        ]
      },
      {
        id: 'account_termination',
        name: 'Account & Service Termination',
        description: 'Patterns related to account suspension, termination, and service availability',
        riskLevel: 'medium',
        patterns: [
          {
            id: 'mg_009',
            category: 'account_termination',
            name: 'Arbitrary Account Termination',
            description: 'Terms allowing termination of accounts without clear cause or process',
            riskLevel: 'medium',
            keywords: ['terminate account', 'suspend access', 'without notice', 'sole discretion', 'any reason', 'immediate termination'],
            promptTemplate: 'Analyze this termination clause for fairness and due process protections',
            weight: 0.75
          },
          {
            id: 'mg_010',
            category: 'account_termination',
            name: 'Loss of Purchased Content',
            description: 'Terms that may result in loss of purchased content upon termination',
            riskLevel: 'high',
            keywords: ['lose access', 'purchased content', 'virtual items', 'no refund', 'forfeit purchases', 'content unavailable'],
            promptTemplate: 'Examine this clause for consumer protection issues regarding purchased digital content',
            weight: 0.8
          }
        ]
      },
      {
        id: 'liability_disputes',
        name: 'Liability & Dispute Resolution',
        description: 'Patterns related to liability limitations and dispute resolution mechanisms',
        riskLevel: 'medium',
        patterns: [
          {
            id: 'mg_011',
            category: 'liability_disputes',
            name: 'Broad Liability Exclusion',
            description: 'Overly broad exclusions of platform liability',
            riskLevel: 'medium',
            keywords: ['no liability', 'exclude liability', 'not responsible', 'disclaim warranties', 'as-is basis', 'use at risk'],
            promptTemplate: 'Assess this liability exclusion for reasonableness and consumer protection compliance',
            weight: 0.7
          },
          {
            id: 'mg_012',
            category: 'liability_disputes',
            name: 'Mandatory Arbitration Clauses',
            description: 'Terms requiring binding arbitration and waiving right to jury trial',
            riskLevel: 'medium',
            keywords: ['binding arbitration', 'waive jury trial', 'individual arbitration', 'class action waiver', 'dispute resolution', 'arbitration agreement'],
            promptTemplate: 'Evaluate this arbitration clause for fairness and access to justice considerations',
            weight: 0.75
          }
        ]
      },
      {
        id: 'minor_protection',
        name: 'Minor Protection & Safety',
        description: 'Patterns related to protection of minors and child safety measures',
        riskLevel: 'critical',
        patterns: [
          {
            id: 'mg_013',
            category: 'minor_protection',
            name: 'Inadequate Age Verification',
            description: 'Insufficient age verification measures for content with age restrictions',
            riskLevel: 'high',
            keywords: ['age verification', 'parental consent', 'under 13', 'minors', 'child protection', 'age-appropriate'],
            promptTemplate: 'Analyze this age verification clause for adequacy of minor protection measures',
            weight: 0.85
          },
          {
            id: 'mg_014',
            category: 'minor_protection',
            name: 'Predatory Monetization Targeting Minors',
            description: 'Monetization practices that may exploit minors',
            riskLevel: 'critical',
            keywords: ['parental approval', 'spending limits', 'purchase protection', 'minor purchases', 'parental controls', 'spending oversight'],
            promptTemplate: 'Examine this monetization clause for potential exploitation of minors and parental protection gaps',
            weight: 0.9
          }
        ]
      }
    ]
  }

  private determineCategoriesToSeed(options: SeedingOptions): MobileGamingPatternCategory[] {
    if (options.enableAllCategories || (!options.specificCategories && !options.enableAllCategories)) {
      return this.MOBILE_GAMING_CATEGORIES
    }

    if (options.specificCategories && options.specificCategories.length > 0) {
      return this.MOBILE_GAMING_CATEGORIES.filter(cat => 
        options.specificCategories!.includes(cat.id) || options.specificCategories!.includes(cat.name)
      )
    }

    return []
  }

  private validateAllPatterns(categories: MobileGamingPatternCategory[]): string[] {
    const errors: string[] = []

    for (const category of categories) {
      for (const pattern of category.patterns) {
        const patternErrors = this.validatePattern(pattern)
        if (patternErrors.length > 0) {
          errors.push(`Category ${category.name}, Pattern ${pattern.id}: ${patternErrors.join(', ')}`)
        }
      }
    }

    return errors
  }

  private async seedCategory(category: MobileGamingPatternCategory, options: SeedingOptions): Promise<{ patternsAdded: number, duplicatesSkipped: number }> {
    let patternsAdded = 0
    let duplicatesSkipped = 0

    for (const pattern of category.patterns) {
      try {
        const exists = this.patternMatcher.getPattern(pattern.id) !== undefined
        
        if (exists && !options.overwriteExisting) {
          duplicatesSkipped++
          continue
        }

        if (exists && options.overwriteExisting) {
          this.patternMatcher.removePattern(pattern.id)
        }

        this.patternMatcher.addPattern(pattern)
        patternsAdded++

      } catch (error) {
        throw new Error(`Failed to add pattern ${pattern.id}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    return { patternsAdded, duplicatesSkipped }
  }

  private async seedCustomPatterns(customPatterns: ClausePattern[], options: SeedingOptions): Promise<{ patternsAdded: number, duplicatesSkipped: number }> {
    let patternsAdded = 0
    let duplicatesSkipped = 0

    for (const pattern of customPatterns) {
      if (options.validatePatterns) {
        const errors = this.validatePattern(pattern)
        if (errors.length > 0) {
          throw new Error(`Custom pattern ${pattern.id} validation failed: ${errors.join(', ')}`)
        }
      }

      const exists = this.patternMatcher.getPattern(pattern.id) !== undefined
      
      if (exists && !options.overwriteExisting) {
        duplicatesSkipped++
        continue
      }

      if (exists && options.overwriteExisting) {
        this.patternMatcher.removePattern(pattern.id)
      }

      this.patternMatcher.addPattern(pattern)
      patternsAdded++
    }

    return { patternsAdded, duplicatesSkipped }
  }
}

/**
 * Utility function to create and seed a pattern matcher with mobile gaming patterns
 */
export async function createSeededPatternMatcher(options: SeedingOptions = {}): Promise<{ patternMatcher: PatternMatcher, seedingResult: SeedingResult }> {
  const patternMatcher = new PatternMatcher()
  const seeder = new MobileGamingSeeder(patternMatcher)
  
  const seedingResult = await seeder.seedPatterns({
    enableAllCategories: true,
    validatePatterns: true,
    ...options
  })

  return { patternMatcher, seedingResult }
}

/**
 * Default seeding options for mobile gaming analysis
 */
export const DEFAULT_MOBILE_GAMING_SEEDING_OPTIONS: SeedingOptions = {
  overwriteExisting: false,
  validatePatterns: true,
  enableAllCategories: true,
  specificCategories: [],
  customPatterns: []
}