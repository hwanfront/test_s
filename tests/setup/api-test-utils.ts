import { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

// Mock NextAuth JWT token
export const mockToken = {
  userId: 'test-user-id',
  provider: 'google',
  accessToken: 'mock-access-token',
}

// Mock the getToken function
jest.mock('next-auth/jwt', () => ({
  getToken: jest.fn(),
}))

export const mockGetToken = getToken as jest.MockedFunction<typeof getToken>

// Helper to create mock NextRequest
export const createMockRequest = (
  method: string = 'GET',
  url: string = 'http://localhost:3000/api/test',
  body?: any,
  headers?: Record<string, string>
): NextRequest => {
  const init: any = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  }

  if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    init.body = JSON.stringify(body)
  }

  return new NextRequest(url, init)
}

// Helper to mock authenticated requests
export const mockAuthenticatedRequest = (
  method: string = 'GET',
  url: string = 'http://localhost:3000/api/test',
  body?: any,
  userId: string = 'test-user-id'
) => {
  mockGetToken.mockResolvedValue({
    ...mockToken,
    userId,
  })
  
  return createMockRequest(method, url, body)
}

// Helper to mock unauthenticated requests
export const mockUnauthenticatedRequest = (
  method: string = 'GET',
  url: string = 'http://localhost:3000/api/test',
  body?: any
) => {
  mockGetToken.mockResolvedValue(null)
  return createMockRequest(method, url, body)
}

// Helper to test API responses
export const expectApiResponse = async (
  response: Response,
  expectedStatus: number,
  expectedData?: any
) => {
  expect(response.status).toBe(expectedStatus)
  
  const responseData = await response.json()
  
  if (expectedData) {
    expect(responseData).toMatchObject(expectedData)
  }
  
  return responseData
}