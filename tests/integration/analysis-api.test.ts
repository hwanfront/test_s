import { NextRequest } from 'next/server'
import { POST } from '@/app/api/analysis/route'
import { GET } from '@/app/api/analysis/[sessionId]/route'
import { 
  mockAuthenticatedRequest, 
  mockUnauthenticatedRequest,
  expectApiResponse 
} from '@/tests/setup/api-test-utils'

describe('Analysis API Endpoints', () => {
  describe('POST /api/analysis', () => {
    it('should create analysis session with valid request', async () => {
      const requestBody = {
        content: 'A'.repeat(1000), // Minimum 100 characters
        skipCache: false
      }

      const request = mockAuthenticatedRequest('POST', 'http://localhost:3000/api/analysis', requestBody)
      const response = await POST(request)

      const data = await expectApiResponse(response, 201)
      
      expect(data).toMatchObject({
        sessionId: expect.any(String),
        status: 'processing',
        estimatedTimeMs: expect.any(Number),
        contentLength: 1000,
        createdAt: expect.any(String),
        expiresAt: expect.any(String)
      })
    })

    it('should reject unauthenticated requests', async () => {
      const requestBody = {
        content: 'A'.repeat(1000)
      }

      const request = mockUnauthenticatedRequest('POST', 'http://localhost:3000/api/analysis', requestBody)
      const response = await POST(request)

      await expectApiResponse(response, 401, {
        error: 'Unauthorized'
      })
    })

    it('should reject content that is too short', async () => {
      const requestBody = {
        content: 'Too short' // Less than 100 characters
      }

      const request = mockAuthenticatedRequest('POST', 'http://localhost:3000/api/analysis', requestBody)
      const response = await POST(request)

      await expectApiResponse(response, 400, {
        error: 'Bad Request'
      })
    })

    it('should reject content that is too long', async () => {
      const requestBody = {
        content: 'A'.repeat(100001) // More than 100,000 characters
      }

      const request = mockAuthenticatedRequest('POST', 'http://localhost:3000/api/analysis', requestBody)
      const response = await POST(request)

      await expectApiResponse(response, 400, {
        error: 'Bad Request'
      })
    })

    it('should respect quota limits', async () => {
      // Mock quota service to return quota exceeded
      const requestBody = {
        content: 'A'.repeat(1000)
      }

      const request = mockAuthenticatedRequest('POST', 'http://localhost:3000/api/analysis', requestBody)
      // This test will need to mock the quota service to return exceeded state
      // We'll implement this when we have the quota service integrated
    })
  })

  describe('GET /api/analysis/[sessionId]', () => {
    it('should return analysis results for valid session', async () => {
      const sessionId = '550e8400-e29b-41d4-a716-446655440000'
      const request = mockAuthenticatedRequest('GET', `http://localhost:3000/api/analysis/${sessionId}`)
      
      const response = await GET(request, { params: { sessionId } })

      const data = await expectApiResponse(response, 200)
      
      expect(data).toMatchObject({
        session: {
          id: sessionId,
          contentLength: expect.any(Number),
          status: expect.stringMatching(/^(completed|failed|expired)$/),
          createdAt: expect.any(String),
          expiresAt: expect.any(String)
        },
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
        }
      })
    })

    it('should reject unauthenticated requests', async () => {
      const sessionId = '550e8400-e29b-41d4-a716-446655440000'
      const request = mockUnauthenticatedRequest('GET', `http://localhost:3000/api/analysis/${sessionId}`)
      
      const response = await GET(request, { params: { sessionId } })

      await expectApiResponse(response, 401, {
        error: 'Unauthorized'
      })
    })

    it('should return 404 for non-existent session', async () => {
      const sessionId = '00000000-0000-0000-0000-000000000000'
      const request = mockAuthenticatedRequest('GET', `http://localhost:3000/api/analysis/${sessionId}`)
      
      const response = await GET(request, { params: { sessionId } })

      await expectApiResponse(response, 404, {
        error: 'Not Found'
      })
    })

    it('should return 403 for sessions belonging to other users', async () => {
      const sessionId = '550e8400-e29b-41d4-a716-446655440000'
      const request = mockAuthenticatedRequest('GET', `http://localhost:3000/api/analysis/${sessionId}`, undefined, 'other-user-id')
      
      const response = await GET(request, { params: { sessionId } })

      await expectApiResponse(response, 403, {
        error: 'Forbidden'
      })
    })

    it('should handle expired sessions appropriately', async () => {
      const sessionId = '550e8400-e29b-41d4-a716-446655440000'
      const request = mockAuthenticatedRequest('GET', `http://localhost:3000/api/analysis/${sessionId}`)
      
      // This test will need to mock an expired session
      // We'll implement this when we have the analysis service integrated
    })
  })
})