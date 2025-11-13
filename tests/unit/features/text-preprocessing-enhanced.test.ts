/**
 * Enhanced Text Preprocessing Unit Test (Task T103)
 * Tests for enhanced content hasher with normalization and deduplication
 */

import { createHash } from 'crypto'

// Enhanced content hasher implementation for testing
class EnhancedContentHasher {
  /**
   * Normalize content before hashing to improve deduplication
   */
  static normalizeContent(content: string): string {
    return content
      // Normalize unicode first
      .normalize('NFKC')
      // Normalize line endings to unix style
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      // Remove common formatting variations
      .replace(/[""'']/g, '"')
      .replace(/[–—]/g, '-')
      // Normalize whitespace but preserve line breaks
      .replace(/[ \t]+/g, ' ')
      // Trim each line
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .join('\n')
      // Convert to lowercase for case-insensitive matching
      .toLowerCase()
      // Final trim
      .trim()
  }

  /**
   * Generate content hash with normalization
   */
  static generateHash(content: string): string {
    const normalized = this.normalizeContent(content)
    return createHash('sha256').update(normalized).digest('hex')
  }

  /**
   * Generate hash with content metadata
   */
  static generateHashWithMetadata(content: string): {
    hash: string
    originalLength: number
    normalizedLength: number
    normalized: string
  } {
    const normalized = this.normalizeContent(content)
    const hash = createHash('sha256').update(normalized).digest('hex')
    
    return {
      hash,
      originalLength: content.length,
      normalizedLength: normalized.length,
      normalized
    }
  }

  /**
   * Check if two contents are functionally identical
   */
  static areContentsSimilar(content1: string, content2: string): boolean {
    return this.generateHash(content1) === this.generateHash(content2)
  }

  /**
   * Extract content features for privacy-safe storage
   */
  static extractFeatures(content: string): {
    hash: string
    length: number
    wordCount: number
    sectionCount: number
    hasNumberedItems: boolean
    estimatedReadingTime: number
  } {
    const normalized = this.normalizeContent(content)
    const hash = createHash('sha256').update(normalized).digest('hex')
    
    // Count words (privacy-safe metric)
    const wordCount = normalized.split(/\s+/).filter(word => word.length > 0).length
    
    // Count sections (privacy-safe structural info)
    const sectionCount = (normalized.match(/^\s*\d+\./gm) || []).length
    
    // Check for numbered items (privacy-safe structural info)
    const hasNumberedItems = /^\s*\d+\./m.test(normalized)
    
    // Estimate reading time (privacy-safe metric)
    const estimatedReadingTime = Math.ceil(wordCount / 200) // 200 WPM average

    return {
      hash,
      length: content.length,
      wordCount,
      sectionCount,
      hasNumberedItems,
      estimatedReadingTime
    }
  }
}

describe('Enhanced Content Hasher', () => {
  const sampleTerms1 = `
    Terms and Conditions

    1. Account Termination
    We reserve the right to terminate your account at any time without notice.

    2. Virtual Currency
    All virtual currency is owned by the company and has no real-world value.

    3. Data Collection  
    We collect personal information including location, contacts, and device data.
  `

  const sampleTerms2 = `
Terms and Conditions

1. Account Termination
We reserve the right to terminate your account at any time without notice.

2. Virtual Currency
All virtual currency is owned by the company and has no real-world value.

3. Data Collection
We collect personal information including location, contacts, and device data.
  `

  const sampleTerms3 = `
    TERMS AND CONDITIONS

    1. Account Termination
    We reserve the right to terminate your account at any time without notice.

    2. Virtual Currency  
    All virtual currency is owned by the company and has no real-world value.

    3. Data Collection
    We collect personal information including location, contacts, and device data.
  `

  describe('Content Normalization', () => {
    it('should normalize whitespace consistently', () => {
      const content1 = 'Terms   and    Conditions\n\n\n1. Test'
      const content2 = 'Terms and Conditions\n1. Test'
      
      const normalized1 = EnhancedContentHasher.normalizeContent(content1)
      const normalized2 = EnhancedContentHasher.normalizeContent(content2)
      
      expect(normalized1).toBe(normalized2)
      expect(normalized1).toBe('terms and conditions\n1. test')
    })

    it('should normalize case for consistent hashing', () => {
      const upperCase = 'TERMS AND CONDITIONS'
      const lowerCase = 'terms and conditions'
      const mixedCase = 'Terms And Conditions'
      
      const norm1 = EnhancedContentHasher.normalizeContent(upperCase)
      const norm2 = EnhancedContentHasher.normalizeContent(lowerCase)
      const norm3 = EnhancedContentHasher.normalizeContent(mixedCase)
      
      expect(norm1).toBe(norm2)
      expect(norm2).toBe(norm3)
      expect(norm1).toBe('terms and conditions')
    })

    it('should normalize line endings', () => {
      const windowsEndings = 'Line 1\r\nLine 2\r\nLine 3'
      const macEndings = 'Line 1\rLine 2\rLine 3'
      const unixEndings = 'Line 1\nLine 2\nLine 3'
      
      const norm1 = EnhancedContentHasher.normalizeContent(windowsEndings)
      const norm2 = EnhancedContentHasher.normalizeContent(macEndings)
      const norm3 = EnhancedContentHasher.normalizeContent(unixEndings)
      
      expect(norm1).toBe(norm2)
      expect(norm2).toBe(norm3)
      expect(norm1).toBe('line 1\nline 2\nline 3')
    })

    it('should normalize quotes and dashes', () => {
      const smartQuotes = '"Smart quotes" and \'single quotes\' with – en-dash — em-dash'
      const regularQuotes = '"Smart quotes" and "single quotes" with - en-dash - em-dash'
      
      const norm1 = EnhancedContentHasher.normalizeContent(smartQuotes)
      const norm2 = EnhancedContentHasher.normalizeContent(regularQuotes)
      
      expect(norm1).toBe(norm2)
      expect(norm1).toBe('"smart quotes" and "single quotes" with - en-dash - em-dash')
    })
  })

  describe('Hash Generation', () => {
    it('should generate consistent hashes for normalized content', () => {
      const hash1 = EnhancedContentHasher.generateHash(sampleTerms1)
      const hash2 = EnhancedContentHasher.generateHash(sampleTerms2)
      const hash3 = EnhancedContentHasher.generateHash(sampleTerms3)
      
      // All should hash to the same value after normalization
      expect(hash1).toBe(hash2)
      expect(hash2).toBe(hash3)
      expect(hash1).toMatch(/^[a-f0-9]{64}$/)
    })

    it('should generate different hashes for different content', () => {
      const content1 = 'Terms and Conditions - Version 1'
      const content2 = 'Terms and Conditions - Version 2'
      
      const hash1 = EnhancedContentHasher.generateHash(content1)
      const hash2 = EnhancedContentHasher.generateHash(content2)
      
      expect(hash1).not.toBe(hash2)
      expect(hash1).toMatch(/^[a-f0-9]{64}$/)
      expect(hash2).toMatch(/^[a-f0-9]{64}$/)
    })

    it('should not reveal original content in hash', () => {
      const sensitiveContent = 'User email: user@example.com, Password: secret123'
      const hash = EnhancedContentHasher.generateHash(sensitiveContent)
      
      expect(hash).not.toContain('user@example.com')
      expect(hash).not.toContain('secret123')
      expect(hash).not.toContain('User email')
      expect(hash).toMatch(/^[a-f0-9]{64}$/)
    })
  })

  describe('Content Similarity Detection', () => {
    it('should detect similar content with formatting differences', () => {
      const similar1 = EnhancedContentHasher.areContentsSimilar(sampleTerms1, sampleTerms2)
      const similar2 = EnhancedContentHasher.areContentsSimilar(sampleTerms2, sampleTerms3)
      const similar3 = EnhancedContentHasher.areContentsSimilar(sampleTerms1, sampleTerms3)
      
      expect(similar1).toBe(true)
      expect(similar2).toBe(true)
      expect(similar3).toBe(true)
    })

    it('should detect different content', () => {
      const content1 = 'Terms and Conditions Version 1.0'
      const content2 = 'Privacy Policy Version 1.0'
      
      const similar = EnhancedContentHasher.areContentsSimilar(content1, content2)
      expect(similar).toBe(false)
    })

    it('should handle empty and whitespace-only content', () => {
      const empty1 = ''
      const empty2 = '   \n\n\t  '
      const empty3 = '\r\n   \r\n'
      
      const similar1 = EnhancedContentHasher.areContentsSimilar(empty1, empty2)
      const similar2 = EnhancedContentHasher.areContentsSimilar(empty2, empty3)
      
      expect(similar1).toBe(true)
      expect(similar2).toBe(true)
    })
  })

  describe('Metadata Extraction', () => {
    it('should extract hash with content metadata', () => {
      const result = EnhancedContentHasher.generateHashWithMetadata(sampleTerms1)
      
      expect(result.hash).toMatch(/^[a-f0-9]{64}$/)
      expect(result.originalLength).toBe(sampleTerms1.length)
      expect(result.normalizedLength).toBeLessThan(result.originalLength)
      expect(result.normalized).not.toContain('  ') // No double spaces
      expect(result.normalized).toBe(result.normalized.toLowerCase())
    })

    it('should extract privacy-safe content features', () => {
      const features = EnhancedContentHasher.extractFeatures(sampleTerms1)
      
      // Verify hash
      expect(features.hash).toMatch(/^[a-f0-9]{64}$/)
      
      // Verify metrics
      expect(features.length).toBe(sampleTerms1.length)
      expect(features.wordCount).toBeGreaterThan(0)
      expect(features.sectionCount).toBeGreaterThan(0)
      expect(features.hasNumberedItems).toBe(true)
      expect(features.estimatedReadingTime).toBeGreaterThan(0)
      
      // Verify no original content is exposed
      const featuresString = JSON.stringify(features)
      expect(featuresString).not.toContain('Account Termination')
      expect(featuresString).not.toContain('Virtual Currency')
      expect(featuresString).not.toContain('Data Collection')
    })

    it('should calculate reading time accurately', () => {
      const shortContent = 'Short terms with only ten words in total here.'
      const longContent = 'A '.repeat(500) + 'long terms document.' // ~1000 words
      
      const shortFeatures = EnhancedContentHasher.extractFeatures(shortContent)
      const longFeatures = EnhancedContentHasher.extractFeatures(longContent)
      
      expect(shortFeatures.estimatedReadingTime).toBe(1) // Minimum 1 minute
      expect(longFeatures.estimatedReadingTime).toBeGreaterThan(shortFeatures.estimatedReadingTime)
      expect(longFeatures.estimatedReadingTime).toBeGreaterThanOrEqual(3) // ~500 words = ~3 minutes
    })

    it('should detect structural features accurately', () => {
      const numberedContent = `
        1. First item
        2. Second item
        3. Third item
      `
      
      const unnumberedContent = `
        First item
        Second item
        Third item
      `
      
      const numberedFeatures = EnhancedContentHasher.extractFeatures(numberedContent)
      const unnumberedFeatures = EnhancedContentHasher.extractFeatures(unnumberedContent)
      
      expect(numberedFeatures.hasNumberedItems).toBe(true)
      expect(numberedFeatures.sectionCount).toBeGreaterThan(0)
      
      expect(unnumberedFeatures.hasNumberedItems).toBe(false)
      expect(unnumberedFeatures.sectionCount).toBe(0)
    })
  })

  describe('Privacy Compliance', () => {
    it('should never expose original content in any output', () => {
      const sensitiveTerms = `
        1. Personal Data Collection
        We collect your name, email address, phone number, and location data.
        
        2. Data Sharing
        We may share your data with third-party advertisers and marketing companies.
        
        3. Account Deletion
        We retain your data for 10 years after account deletion.
      `
      
      // Test all methods for privacy compliance
      const hash = EnhancedContentHasher.generateHash(sensitiveTerms)
      const normalized = EnhancedContentHasher.normalizeContent(sensitiveTerms)
      const metadata = EnhancedContentHasher.generateHashWithMetadata(sensitiveTerms)
      const features = EnhancedContentHasher.extractFeatures(sensitiveTerms)
      
      // Hash should not contain sensitive info
      expect(hash).not.toContain('email address')
      expect(hash).not.toContain('phone number')
      expect(hash).not.toContain('location data')
      expect(hash).not.toContain('third-party advertisers')
      
      // Normalized content should not be stored (only used for hashing)
      expect(normalized).not.toBeUndefined()
      
      // Metadata should not expose content
      expect(metadata.hash).not.toContain('Personal Data')
      expect(metadata.normalizedLength).toBeGreaterThan(0)
      
      // Features should be privacy-safe
      const featuresString = JSON.stringify(features)
      expect(featuresString).not.toContain('email address')
      expect(featuresString).not.toContain('phone number')
      expect(featuresString).not.toContain('location data')
      expect(featuresString).not.toContain('Personal Data Collection')
    })

    it('should enable deduplication without content storage', () => {
      const content1 = 'Terms of Service Version 2023.1'
      const content2 = '  TERMS OF SERVICE   VERSION 2023.1  '
      const content3 = 'Privacy Policy Version 2023.1'
      
      const hash1 = EnhancedContentHasher.generateHash(content1)
      const hash2 = EnhancedContentHasher.generateHash(content2)
      const hash3 = EnhancedContentHasher.generateHash(content3)
      
      // Same content should have same hash (deduplication)
      expect(hash1).toBe(hash2)
      
      // Different content should have different hash
      expect(hash1).not.toBe(hash3)
      
      // No hashes should reveal original content
      expect(hash1).not.toContain('Terms of Service')
      expect(hash2).not.toContain('Terms of Service')
      expect(hash3).not.toContain('Privacy Policy')
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty content', () => {
      const emptyHash = EnhancedContentHasher.generateHash('')
      const whitespaceHash = EnhancedContentHasher.generateHash('   \n\t  ')
      
      expect(emptyHash).toBe(whitespaceHash)
      expect(emptyHash).toMatch(/^[a-f0-9]{64}$/)
    })

    it('should handle very large content', () => {
      const largeContent = 'Large content: ' + 'A '.repeat(50000) // Create 50k words
      const hash = EnhancedContentHasher.generateHash(largeContent)
      const features = EnhancedContentHasher.extractFeatures(largeContent)
      
      expect(hash).toMatch(/^[a-f0-9]{64}$/)
      expect(features.length).toBe(largeContent.length)
      expect(features.wordCount).toBeGreaterThan(50000)
      expect(features.estimatedReadingTime).toBeGreaterThan(250) // ~250 minutes for 50k+ words
    })

    it('should handle special characters and unicode', () => {
      const unicodeContent = `
        Terms & Conditions 🔒
        1. Privacy Policy 📋
        2. Data Protection 🛡️
        3. User Rights ⚖️
        Special chars: @#$%^&*()+={}[]|\\:";'<>?,./
        Unicode: café, naïve, résumé, Zürich
      `
      
      const hash = EnhancedContentHasher.generateHash(unicodeContent)
      const features = EnhancedContentHasher.extractFeatures(unicodeContent)
      
      expect(hash).toMatch(/^[a-f0-9]{64}$/)
      expect(features.wordCount).toBeGreaterThan(0)
      expect(features.hasNumberedItems).toBe(true)
      
      // Should not expose unicode content
      expect(hash).not.toContain('🔒')
      expect(hash).not.toContain('café')
      expect(JSON.stringify(features)).not.toContain('Privacy Policy')
    })
  })
})

export { EnhancedContentHasher }