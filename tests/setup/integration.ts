import { createMocks } from 'node-mocks-http'
import { NextApiRequest, NextApiResponse } from 'next'

// Helper for integration testing of API routes
export const testApiHandler = async (
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void>,
  options: {
    method?: string
    body?: any
    query?: Record<string, string | string[]>
    headers?: Record<string, string>
  } = {}
) => {
  const { method = 'GET', body, query, headers } = options
  
  const { req, res } = createMocks({
    method: method as any,
    body,
    query,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  })
  
  await handler(req, res)
  
  return {
    req,
    res,
    status: res._getStatusCode(),
    data: res._getJSONData(),
  }
}

// Database test utilities
export const setupTestDatabase = async () => {
  // This would set up a test database
  // For now, we'll use mocks
  console.log('Setting up test database...')
}

export const cleanupTestDatabase = async () => {
  // This would clean up the test database
  console.log('Cleaning up test database...')
}

// Helper to wait for async operations
export const waitFor = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// Test environment setup
export const setupTestEnvironment = () => {
  // Set test environment variables
  // NODE_ENV is read-only in production builds
  process.env.NEXTAUTH_SECRET = 'test-secret'
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'
  process.env.GOOGLE_GEMINI_API_KEY = 'test-gemini-key'
  process.env.GOOGLE_CLIENT_ID = 'test-google-client-id'
  process.env.GOOGLE_CLIENT_SECRET = 'test-google-client-secret'
}