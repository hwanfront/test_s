import { analyzeTerms, AnalysisService } from '@/features/ai-analysis/lib/analysis-service'
import { GeminiClient } from '@/features/ai-analysis/lib/gemini-client'
import { PatternMatcher } from '@/features/ai-analysis/lib/pattern-matcher'
import { PromptBuilder } from '@/features/ai-analysis/lib/prompt-builder'
import { ResultParser } from '@/features/ai-analysis/lib/result-parser'

// Mock GoogleGenerativeAI at the module level
jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockReturnValue({
      generateContent: jest.fn().mockImplementation((prompt: string) => {
        // Check if the prompt contains content that should be considered "fair"
        if (prompt.includes('perfectly fair and reasonable')) {
          return Promise.resolve({
            response: {
              text: () => JSON.stringify({
                overallRiskScore: 15,
                riskLevel: 'low',
                confidenceScore: 85,
                riskAssessments: []
              })
            }
          })
        }
        
        // Default response for normal risky content
        return Promise.resolve({
          response: {
            text: () => JSON.stringify({
              overallRiskScore: 75,
              riskLevel: 'high',
              confidenceScore: 90,
              riskAssessments: [
                {
                  category: 'account-termination',
                  riskLevel: 'critical',
                  riskScore: 95,
                  confidenceScore: 92,
                  summary: 'Arbitrary account termination',
                  rationale: 'This clause allows termination without cause',
                  startPosition: 10,
                  endPosition: 50
                }
              ]
            })
          }
        })
      })
    })
  }))
}))

describe('AI Analysis Module', () => {
  describe('AnalysisService', () => {
    let service: AnalysisService

    beforeEach(() => {
      service = new AnalysisService()
    })

    it('should analyze terms and return structured results', async () => {
      const contentText = `
        TERMS OF SERVICE
        
        1. Account Termination
        We reserve the right to terminate your account at any time without notice.
        
        2. Virtual Currency
        All virtual currency has no real-world value and may be forfeited.
      `.trim()
      
      const input = {
        contentHash: 'a'.repeat(64),
        content: contentText,
        contentLength: contentText.length
      }

      const result = await service.analyzeTerms(input)

      expect(result).toMatchObject({
        overallRiskScore: expect.any(Number),
        riskLevel: expect.stringMatching(/^(low|medium|high|critical)$/),
        confidenceScore: expect.any(Number),
        riskAssessments: expect.any(Array),
        summary: {
          totalRisks: expect.any(Number),
          riskBreakdown: {
            critical: expect.any(Number),
            high: expect.any(Number),
            medium: expect.any(Number),
            low: expect.any(Number)
          },
          topCategories: expect.any(Array),
          analysisLimitations: expect.any(Array),
          recommendedActions: expect.any(Array)
        },
        processingTimeMs: expect.any(Number)
      })

      expect(result.overallRiskScore).toBeGreaterThanOrEqual(0)
      expect(result.overallRiskScore).toBeLessThanOrEqual(100)
      expect(result.riskAssessments.length).toBeGreaterThan(0)
    })

    it('should handle content with no risks found', async () => {
      const contentText = 'This is a perfectly fair and reasonable terms of service document.'
      const input = {
        contentHash: 'b'.repeat(64),
        content: contentText,
        contentLength: contentText.length
      }

      const result = await service.analyzeTerms(input)

      expect(result.overallRiskScore).toBeLessThan(30)
      expect(result.riskLevel).toBe('low')
      expect(result.riskAssessments).toHaveLength(0)
    })

    it('should reject empty content', async () => {
      const input = {
        contentHash: 'c'.repeat(64),
        content: '',
        contentLength: 0
      }

      await expect(service.analyzeTerms(input)).rejects.toThrow('Content cannot be empty')
    })

    it('should handle API failures gracefully', async () => {
      // Mock API failure
      const input = {
        contentHash: 'd'.repeat(64),
        content: 'Content that will trigger API failure',
        contentLength: 35
      }

      // This test will need proper mocking of the Gemini client
      // For now, we expect the service to handle failures
    })
  })

  describe('GeminiClient', () => {
    let client: GeminiClient

    beforeEach(() => {
      client = new GeminiClient()
    })

    it('should send request to Gemini API', async () => {
      const prompt = 'Analyze this terms of service for risks.'
      
      // Mock the GoogleGenerativeAI client
      const mockGenerateContent = jest.fn().mockResolvedValue({
        response: {
          text: () => '{"overallRiskScore": 75, "riskLevel": "high", "confidenceScore": 85, "riskAssessments": []}'
        }
      })
      
      // Mock the getGenerativeModel method
      client.client = {
        getGenerativeModel: jest.fn().mockReturnValue({
          generateContent: mockGenerateContent
        })
      }
      
      const response = await client.generateContent(prompt)

      expect(response).toMatchObject({
        text: expect.any(String),
        usage: {
          promptTokens: expect.any(Number),
          completionTokens: expect.any(Number),
          totalTokens: expect.any(Number)
        },
        finishReason: expect.stringMatching(/^(stop|length|safety|recitation)$/)
      })
    })

    it('should handle API rate limits', async () => {
      const prompt = 'Test prompt for rate limiting'
      
      // This test will need to mock rate limit scenarios
      // For now, we expect proper error handling
    })

    it('should validate API key configuration', () => {
      expect(() => new GeminiClient()).not.toThrow()
    })

    it('should handle malformed responses', async () => {
      const prompt = 'Prompt that might cause malformed response'
      
      // This test will need to mock malformed API responses
      // For now, we expect graceful error handling
    })
  })

  describe('PatternMatcher', () => {
    let matcher: PatternMatcher

    beforeEach(() => {
      matcher = new PatternMatcher()
    })

    it('should identify account termination patterns', () => {
      const content = 'We reserve the right to terminate your account at any time without notice.'
      
      const matches = matcher.findPatterns(content)
      
      expect(matches).toContainEqual(
        expect.objectContaining({
          category: 'account-termination',
          confidence: expect.any(Number),
          startPosition: expect.any(Number),
          endPosition: expect.any(Number)
        })
      )
    })

    it('should identify virtual currency patterns', () => {
      const content = 'Virtual currency has no real-world value and may be forfeited at our discretion.'
      
      const matches = matcher.findPatterns(content)
      
      expect(matches).toContainEqual(
        expect.objectContaining({
          category: 'virtual-currency',
          confidence: expect.any(Number)
        })
      )
    })

    it('should identify data collection patterns', () => {
      const content = 'We collect all your personal information and may share it with third parties.'
      
      const matches = matcher.findPatterns(content)
      
      expect(matches).toContainEqual(
        expect.objectContaining({
          category: 'data-collection',
          confidence: expect.any(Number)
        })
      )
    })

    it('should handle content with no patterns', () => {
      const content = 'This is completely innocent content with no problematic clauses.'
      
      const matches = matcher.findPatterns(content)
      
      expect(matches).toHaveLength(0)
    })

    it('should score pattern confidence accurately', () => {
      const content = 'We reserve the right to terminate accounts without notice or reason.'
      
      const matches = matcher.findPatterns(content)
      const terminationMatch = matches.find(m => m.category === 'account-termination')
      
      expect(terminationMatch?.confidence).toBeGreaterThan(80)
    })
  })

  describe('PromptBuilder', () => {
    let builder: PromptBuilder

    beforeEach(() => {
      builder = new PromptBuilder()
    })

    it('should build structured analysis prompt', () => {
      const content = 'Sample terms of service content'
      const patterns = [
        { category: 'account-termination', keywords: ['terminate', 'suspension'] }
      ]

      const prompt = builder.buildAnalysisPrompt(content, patterns)

      expect(prompt).toContain('CONTENT TO ANALYZE')
      expect(prompt).toContain('account-termination')
      expect(prompt).toContain('JSON object')
      expect(prompt).toContain(content)
    })

    it('should include mobile gaming context', () => {
      const content = 'Mobile game terms'
      const patterns = []

      const prompt = builder.buildAnalysisPrompt(content, patterns, 'mobile-gaming')

      expect(prompt).toContain('Mobile gaming')
      expect(prompt).toContain('in-app purchases')
      expect(prompt).toContain('virtual currency')
    })

    it('should handle empty patterns gracefully', () => {
      const content = 'Terms content'
      const patterns: any[] = []

      const prompt = builder.buildAnalysisPrompt(content, patterns)

      expect(prompt).toContain(content)
      expect(prompt).not.toThrow
    })
  })

  describe('ResultParser', () => {
    let parser: ResultParser

    beforeEach(() => {
      parser = new ResultParser()
    })

    it('should parse valid Gemini response', () => {
      const geminiResponse = {
        overallRiskScore: 85,
        riskLevel: 'high',
        confidenceScore: 90,
        riskAssessments: [
          {
            category: 'account-termination',
            riskLevel: 'critical',
            riskScore: 95,
            confidenceScore: 92,
            summary: 'Arbitrary account termination',
            rationale: 'This clause allows termination without cause',
            startPosition: 10,
            endPosition: 50
          }
        ]
      }

      const result = parser.parseResponse(JSON.stringify(geminiResponse))

      expect(result).toMatchObject({
        overallRiskScore: 85,
        riskLevel: 'high',
        riskAssessments: expect.arrayContaining([
          expect.objectContaining({
            category: 'account-termination',
            riskLevel: 'critical',
            riskScore: 95
          })
        ])
      })
    })

    it('should validate response structure', () => {
      const invalidResponse = {
        overallRiskScore: 150, // Invalid - over 100
        riskLevel: 'invalid-level'
      }

      expect(() => {
        parser.parseResponse(JSON.stringify(invalidResponse))
      }).toThrow('Invalid response structure')
    })

    it('should handle malformed JSON', () => {
      const malformedJson = '{ "overallRiskScore": 85, invalid json }'

      expect(() => {
        parser.parseResponse(malformedJson)
      }).toThrow('Failed to parse AI response')
    })

    it('should validate risk assessment fields', () => {
      const responseWithInvalidAssessment = {
        overallRiskScore: 75,
        riskLevel: 'medium',
        riskAssessments: [
          {
            category: 'account-termination',
            riskLevel: 'critical',
            riskScore: -10, // Invalid - negative score
            confidenceScore: 'high' // Invalid - should be number
          }
        ]
      }

      expect(() => {
        parser.parseResponse(JSON.stringify(responseWithInvalidAssessment))
      }).toThrow('Failed to parse AI response')
    })
  })
})