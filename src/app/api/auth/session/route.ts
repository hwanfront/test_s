/**
 * GET /api/auth/session API Route (Task T090)
 * 
 * Provides current user session information for authentication state management
 * following Next.js 14+ app router conventions
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/shared/config/auth'

/**
 * Session response interface matching API contracts
 */
interface SessionResponse {
  user: {
    id: string
    email: string
    name: string
    provider: 'google' | 'naver'
    avatarUrl?: string
    createdAt: string
    lastLoginAt: string
  }
  expires: string
}

/**
 * Error response interface
 */
interface ErrorResponse {
  error: string
  message: string
  timestamp: string
}

/**
 * GET /api/auth/session
 * 
 * Retrieves current authenticated user's session information
 * Used by frontend to validate authentication state and get user data
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Get session using NextAuth.js
    const session = await getServerSession(authOptions)

    // Check if user is authenticated
    if (!session || !session.user) {
      const errorResponse: ErrorResponse = {
        error: 'not_authenticated',
        message: 'User is not authenticated',
        timestamp: new Date().toISOString()
      }

      return NextResponse.json(errorResponse, { 
        status: 401,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache'
        }
      })
    }

    // Transform session to match API contract
    const sessionResponse: SessionResponse = {
      user: {
        id: session.user.id,
        email: session.user.email || '',
        name: session.user.name || '',
        provider: (session.provider as 'google' | 'naver') || 'google',
        avatarUrl: session.user.image || undefined,
        createdAt: new Date().toISOString(), // Default since not available in session
        lastLoginAt: new Date().toISOString() // Current time as last login
      },
      expires: session.expires
    }

    return NextResponse.json(sessionResponse, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache'
      }
    })

  } catch (error) {
    console.error('Session retrieval error:', error)

    const errorResponse: ErrorResponse = {
      error: 'session_error',
      message: 'Failed to retrieve session information',
      timestamp: new Date().toISOString()
    }

    return NextResponse.json(errorResponse, { 
      status: 500,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache'
      }
    })
  }
}

/**
 * Handle unsupported HTTP methods
 */
export async function POST(): Promise<NextResponse> {
  return NextResponse.json(
    { 
      error: 'method_not_allowed',
      message: 'POST method not supported for session endpoint',
      timestamp: new Date().toISOString()
    },
    { status: 405 }
  )
}

export async function PUT(): Promise<NextResponse> {
  return NextResponse.json(
    { 
      error: 'method_not_allowed',
      message: 'PUT method not supported for session endpoint',
      timestamp: new Date().toISOString()
    },
    { status: 405 }
  )
}

export async function DELETE(): Promise<NextResponse> {
  return NextResponse.json(
    { 
      error: 'method_not_allowed',
      message: 'DELETE method not supported for session endpoint',
      timestamp: new Date().toISOString()
    },
    { status: 405 }
  )
}

export async function PATCH(): Promise<NextResponse> {
  return NextResponse.json(
    { 
      error: 'method_not_allowed',
      message: 'PATCH method not supported for session endpoint',
      timestamp: new Date().toISOString()
    },
    { status: 405 }
  )
}