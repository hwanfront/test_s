import { preprocessText, hashContent, sanitizeText } from '@/features/text-preprocessing/lib/preprocessor'
import { ContentHasher } from '@/features/text-preprocessing/lib/content-hasher'
import { TextSanitizer } from '@/features/text-preprocessing/lib/text-sanitizer'

describe('Text Preprocessing Module', () => {
  describe('preprocessText', () => {
    it('should process text and return hash and metadata', async () => {
      const input = `
        TERMS OF SERVICE
        
        1. Account Termination
        We reserve the right to terminate your account at any time.
        
        2. Data Collection
        We collect all your personal information.
      `.trim()

      const result = await preprocessText(input)

      expect(result).toMatchObject({
        contentHash: expect.stringMatching(/^[a-f0-9]{64}$/), // SHA-256 hash
        contentLength: expect.any(Number),
        sanitizedLength: expect.any(Number),
        metadata: {
          originalLength: input.length,
          sanitizedLength: expect.any(Number),
          processingTimeMs: expect.any(Number)
        }
      })

      expect(result.contentLength).toBeGreaterThan(0)
      expect(result.sanitizedLength).toBeLessThanOrEqual(result.contentLength)
    })

    it('should handle empty input gracefully', async () => {
      await expect(preprocessText('')).rejects.toThrow('Content too short')
    })

    it('should handle very long input', async () => {
      const longInput = 'A'.repeat(100000)
      const result = await preprocessText(longInput)

      expect(result.contentHash).toMatch(/^[a-f0-9]{64}$/)
      expect(result.contentLength).toBe(100000)
    })

    it('should reject input that is too long', async () => {
      const tooLongInput = 'A'.repeat(100001)
      await expect(preprocessText(tooLongInput)).rejects.toThrow('Content too long')
    })

    it('should produce consistent hashes for identical content', async () => {
      const input = 'Same content for hashing test'
      
      const result1 = await preprocessText(input)
      const result2 = await preprocessText(input)

      expect(result1.contentHash).toBe(result2.contentHash)
    })

    it('should produce different hashes for different content', async () => {
      const input1 = 'First content for hashing test'
      const input2 = 'Second content for hashing test'
      
      const result1 = await preprocessText(input1)
      const result2 = await preprocessText(input2)

      expect(result1.contentHash).not.toBe(result2.contentHash)
    })
  })

  describe('ContentHasher', () => {
    let hasher: ContentHasher

    beforeEach(() => {
      hasher = new ContentHasher()
    })

    it('should generate SHA-256 hash', () => {
      const input = 'Test content for hashing'
      const hash = hasher.generateHash(input)

      expect(hash).toMatch(/^[a-f0-9]{64}$/)
      expect(hash).toHaveLength(64)
    })

    it('should generate consistent hashes', () => {
      const input = 'Consistent hashing test'
      
      const hash1 = hasher.generateHash(input)
      const hash2 = hasher.generateHash(input)

      expect(hash1).toBe(hash2)
    })

    it('should detect hash collisions (theoretical)', () => {
      const input1 = 'Content one'
      const input2 = 'Content two'
      
      const hash1 = hasher.generateHash(input1)
      const hash2 = hasher.generateHash(input2)

      expect(hash1).not.toBe(hash2)
    })

    it('should handle empty strings', () => {
      const hash = hasher.generateHash('')
      expect(hash).toMatch(/^[a-f0-9]{64}$/)
    })

    it('should handle unicode content', () => {
      const input = '한글 테스트 콘텐츠 🎮🎯'
      const hash = hasher.generateHash(input)

      expect(hash).toMatch(/^[a-f0-9]{64}$/)
      expect(hash).toHaveLength(64)
    })
  })

  describe('TextSanitizer', () => {
    let sanitizer: TextSanitizer

    beforeEach(() => {
      sanitizer = new TextSanitizer()
    })

    it('should remove sensitive personal information', () => {
      const input = `
        Contact us at john.doe@example.com or call +82-10-1234-5678.
        Your account ID is USER123456 and SSN is 123-45-6789.
      `

      const result = sanitizer.sanitize(input)

      expect(result).not.toContain('john.doe@example.com')
      expect(result).not.toContain('+82-10-1234-5678')
      expect(result).not.toContain('USER123456')
      expect(result).not.toContain('123-45-6789')
      
      // Should contain placeholder patterns
      expect(result).toContain('[EMAIL]')
      expect(result).toContain('[PHONE]')
      expect(result).toContain('[ID]')
      expect(result).toContain('[SSN]')
    })

    it('should normalize whitespace and formatting', () => {
      const input = `
        Terms    of    Service
        
        
        
        Section 1:    Important    stuff
      `

      const result = sanitizer.sanitize(input)

      expect(result).not.toMatch(/[ \t]{2,}/) // No multiple spaces/tabs (but allow multiple newlines)
      expect(result).not.toMatch(/\n{3,}/) // No more than 2 consecutive line breaks
      expect(result.trim()).toBe(result) // No leading/trailing whitespace
    })

    it('should preserve structure while sanitizing', () => {
      const input = `
        TERMS OF SERVICE
        
        1. Account Management
        Contact support@company.com for help.
        
        2. Privacy Policy
        We collect your phone number +1-555-0123.
      `

      const result = sanitizer.sanitize(input)

      expect(result).toContain('TERMS OF SERVICE')
      expect(result).toContain('1. Account Management')
      expect(result).toContain('2. Privacy Policy')
      expect(result).toContain('[EMAIL]')
      expect(result).toContain('[PHONE]')
    })

    it('should handle empty input', () => {
      const result = sanitizer.sanitize('')
      expect(result).toBe('')
    })

    it('should handle input with no sensitive data', () => {
      const input = 'This is clean content with no personal information.'
      const result = sanitizer.sanitize(input)

      expect(result).toBe('This is clean content with no personal information.')
    })
  })
})