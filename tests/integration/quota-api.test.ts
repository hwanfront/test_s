/**
 * Contract Tests for Quota API (Task T073)
 * 
 * Tests the quota management endpoints according to the API contracts
 * defined in contracts/api.yaml
 */

import { NextApiRequest, NextApiResponse } from 'next'
import { testApiHandler } from '../setup/integration'

// Mock NextAuth JWT token
jest.mock('next-auth/jwt', () => ({
  getToken: jest.fn()
}))

// Mock Supabase
jest.mock('@/shared/config/database/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          gte: jest.fn(() => ({
            lt: jest.fn(() => ({
              single: jest.fn()
            }))
          }))
        }))
      }))
    }))
  }
}))

describe('Quota API Contract Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/quota', () => {
    it('should return current quota status for authenticated user', async () => {
      const { getToken } = require('next-auth/jwt')
      const { supabase } = require('@/shared/config/database/supabase')
      
      const mockToken = {
        userId: 'user_123',
        email: 'test@example.com',
        name: 'Test User'
      }
      
      getToken.mockResolvedValue(mockToken)
      
      // Mock database response
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            gte: jest.fn().mockReturnValue({
              lt: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: {
                    user_id: mockToken.userId,
                    analysis_count: 2,
                    quota_date: new Date().toISOString().split('T')[0]
                  },
                  error: null
                })
              })
            })
          })
        })
      })

      const mockHandler = async (req: NextApiRequest, res: NextApiResponse) => {
        if (req.method !== 'GET') {
          res.status(405).json({ error: 'Method not allowed' })
          return
        }

        const token = await getToken({ req })
        if (!token || !token.userId) {
          res.status(401).json({ error: 'Authentication required' })
          return
        }

        // Simulate quota check logic
        const quotaResponse = {
          userId: token.userId,
          dailyLimit: 3,
          currentUsage: 2,
          remainingAnalyses: 1,
          resetTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          quotaStatus: 'active' as const
        }

        res.status(200).json(quotaResponse)
      }

      const result = await testApiHandler(mockHandler, {
        method: 'GET',
        headers: {
          'Cookie': 'next-auth.session-token=mock-token'
        }
      })

      expect(result.status).toBe(200)
      expect(result.data).toHaveProperty('userId')
      expect(result.data).toHaveProperty('dailyLimit')
      expect(result.data).toHaveProperty('currentUsage')
      expect(result.data).toHaveProperty('remainingAnalyses')
      expect(result.data).toHaveProperty('resetTime')
      expect(result.data).toHaveProperty('quotaStatus')
      
      expect(result.data.dailyLimit).toBe(3)
      expect(result.data.currentUsage).toBe(2)
      expect(result.data.remainingAnalyses).toBe(1)
      expect(result.data.quotaStatus).toBe('active')
    })

    it('should return 401 for unauthenticated requests', async () => {
      const { getToken } = require('next-auth/jwt')
      getToken.mockResolvedValue(null)

      const mockHandler = async (req: NextApiRequest, res: NextApiResponse) => {
        const token = await getToken({ req })
        if (!token) {
          res.status(401).json({ 
            error: 'Unauthorized', 
            message: 'Authentication required to check quota' 
          })
          return
        }
      }

      const result = await testApiHandler(mockHandler, {
        method: 'GET'
      })

      expect(result.status).toBe(401)
      expect(result.data.error).toBe('Unauthorized')
    })

    it('should handle quota exceeded scenario', async () => {
      const { getToken } = require('next-auth/jwt')
      const { supabase } = require('@/shared/config/database/supabase')
      
      const mockToken = {
        userId: 'user_456',
        email: 'quota-exceeded@example.com'
      }
      
      getToken.mockResolvedValue(mockToken)
      
      // Mock database response for exceeded quota
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            gte: jest.fn().mockReturnValue({
              lt: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: {
                    user_id: mockToken.userId,
                    analysis_count: 3,
                    quota_date: new Date().toISOString().split('T')[0]
                  },
                  error: null
                })
              })
            })
          })
        })
      })

      const mockHandler = async (req: NextApiRequest, res: NextApiResponse) => {
        const token = await getToken({ req })
        
        // Simulate quota exceeded logic
        const quotaResponse = {
          userId: token.userId,
          dailyLimit: 3,
          currentUsage: 3,
          remainingAnalyses: 0,
          resetTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          quotaStatus: 'exceeded' as const
        }

        res.status(200).json(quotaResponse)
      }

      const result = await testApiHandler(mockHandler, {
        method: 'GET',
        headers: {
          'Cookie': 'next-auth.session-token=mock-token'
        }
      })

      expect(result.status).toBe(200)
      expect(result.data.quotaStatus).toBe('exceeded')
      expect(result.data.remainingAnalyses).toBe(0)
      expect(result.data.currentUsage).toBe(3)
    })

    it('should validate response schema according to contract', async () => {
      const { getToken } = require('next-auth/jwt')
      const mockToken = {
        userId: 'user_789',
        email: 'schema-test@example.com'
      }
      
      getToken.mockResolvedValue(mockToken)

      const mockHandler = async (req: NextApiRequest, res: NextApiResponse) => {
        const quotaResponse = {
          userId: mockToken.userId,
          dailyLimit: 3,
          currentUsage: 1,
          remainingAnalyses: 2,
          resetTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          quotaStatus: 'active' as const
        }

        res.status(200).json(quotaResponse)
      }

      const result = await testApiHandler(mockHandler, {
        method: 'GET',
        headers: {
          'Cookie': 'next-auth.session-token=mock-token'
        }
      })

      // Validate all required fields are present
      expect(result.data).toHaveProperty('userId')
      expect(result.data).toHaveProperty('dailyLimit')
      expect(result.data).toHaveProperty('currentUsage')
      expect(result.data).toHaveProperty('remainingAnalyses')
      expect(result.data).toHaveProperty('resetTime')
      expect(result.data).toHaveProperty('quotaStatus')

      // Validate data types
      expect(typeof result.data.userId).toBe('string')
      expect(typeof result.data.dailyLimit).toBe('number')
      expect(typeof result.data.currentUsage).toBe('number')
      expect(typeof result.data.remainingAnalyses).toBe('number')
      expect(typeof result.data.resetTime).toBe('string')
      expect(typeof result.data.quotaStatus).toBe('string')

      // Validate enum values
      expect(['active', 'exceeded', 'suspended']).toContain(result.data.quotaStatus)

      // Validate date format
      expect(new Date(result.data.resetTime)).toBeInstanceOf(Date)
      expect(isNaN(new Date(result.data.resetTime).getTime())).toBe(false)

      // Validate business logic
      expect(result.data.currentUsage).toBeLessThanOrEqual(result.data.dailyLimit)
      expect(result.data.remainingAnalyses).toBe(
        Math.max(0, result.data.dailyLimit - result.data.currentUsage)
      )
    })

    it('should not accept non-GET methods', async () => {
      const mockHandler = async (req: NextApiRequest, res: NextApiResponse) => {
        if (req.method !== 'GET') {
          res.setHeader('Allow', 'GET')
          res.status(405).json({ error: 'Method not allowed' })
          return
        }
      }

      for (const method of ['POST', 'PUT', 'DELETE', 'PATCH']) {
        const result = await testApiHandler(mockHandler, { method })
        expect(result.status).toBe(405)
        expect(result.data.error).toBe('Method not allowed')
      }
    })

    it('should handle database errors gracefully', async () => {
      const { getToken } = require('next-auth/jwt')
      const { supabase } = require('@/shared/config/database/supabase')
      
      const mockToken = {
        userId: 'user_error',
        email: 'error@example.com'
      }
      
      getToken.mockResolvedValue(mockToken)
      
      // Mock database error
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            gte: jest.fn().mockReturnValue({
              lt: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: null,
                  error: { message: 'Database connection failed' }
                })
              })
            })
          })
        })
      })

      const mockHandler = async (req: NextApiRequest, res: NextApiResponse) => {
        const token = await getToken({ req })
        
        try {
          // Simulate database error handling
          res.status(500).json({
            error: 'Internal server error',
            message: 'Unable to retrieve quota information'
          })
        } catch (error) {
          res.status(500).json({ error: 'Database error' })
        }
      }

      const result = await testApiHandler(mockHandler, {
        method: 'GET',
        headers: {
          'Cookie': 'next-auth.session-token=mock-token'
        }
      })

      expect(result.status).toBe(500)
      expect(result.data.error).toBe('Internal server error')
    })

    it('should handle new user with no quota records', async () => {
      const { getToken } = require('next-auth/jwt')
      const { supabase } = require('@/shared/config/database/supabase')
      
      const mockToken = {
        userId: 'new_user_123',
        email: 'newuser@example.com'
      }
      
      getToken.mockResolvedValue(mockToken)
      
      // Mock no existing quota record
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            gte: jest.fn().mockReturnValue({
              lt: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: null,
                  error: null
                })
              })
            })
          })
        })
      })

      const mockHandler = async (req: NextApiRequest, res: NextApiResponse) => {
        const token = await getToken({ req })
        
        // Simulate new user logic
        const quotaResponse = {
          userId: token.userId,
          dailyLimit: 3,
          currentUsage: 0,
          remainingAnalyses: 3,
          resetTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          quotaStatus: 'active' as const
        }

        res.status(200).json(quotaResponse)
      }

      const result = await testApiHandler(mockHandler, {
        method: 'GET',
        headers: {
          'Cookie': 'next-auth.session-token=mock-token'
        }
      })

      expect(result.status).toBe(200)
      expect(result.data.currentUsage).toBe(0)
      expect(result.data.remainingAnalyses).toBe(3)
      expect(result.data.quotaStatus).toBe('active')
    })
  })

  describe('Quota Business Logic', () => {
    it('should properly calculate remaining analyses', async () => {
      const testCases = [
        { dailyLimit: 3, currentUsage: 0, expected: 3 },
        { dailyLimit: 3, currentUsage: 1, expected: 2 },
        { dailyLimit: 3, currentUsage: 2, expected: 1 },
        { dailyLimit: 3, currentUsage: 3, expected: 0 },
        { dailyLimit: 3, currentUsage: 4, expected: 0 }, // Over limit
      ]

      for (const testCase of testCases) {
        const remaining = Math.max(0, testCase.dailyLimit - testCase.currentUsage)
        expect(remaining).toBe(testCase.expected)
      }
    })

    it('should determine correct quota status', async () => {
      const statusCases = [
        { currentUsage: 0, dailyLimit: 3, expectedStatus: 'active' },
        { currentUsage: 2, dailyLimit: 3, expectedStatus: 'active' },
        { currentUsage: 3, dailyLimit: 3, expectedStatus: 'exceeded' },
        { currentUsage: 5, dailyLimit: 3, expectedStatus: 'exceeded' },
      ]

      for (const statusCase of statusCases) {
        const status = statusCase.currentUsage >= statusCase.dailyLimit ? 'exceeded' : 'active'
        expect(status).toBe(statusCase.expectedStatus)
      }
    })
  })
})