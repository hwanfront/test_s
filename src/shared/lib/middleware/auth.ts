import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function withAuth(
  request: NextRequest,
  handler: (request: NextRequest, context: { userId: string }) => Promise<Response>
) {
  try {
    const token = await getToken({ 
      req: request,
      secret: process.env.NEXTAUTH_SECRET 
    })

    if (!token || !token.userId) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      )
    }

    return handler(request, { userId: token.userId as string })
  } catch (error) {
    console.error('Auth middleware error:', error)
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Authentication failed' },
      { status: 500 }
    )
  }
}

export async function withOptionalAuth(
  request: NextRequest,
  handler: (request: NextRequest, context: { userId?: string }) => Promise<Response>
) {
  try {
    const token = await getToken({ 
      req: request,
      secret: process.env.NEXTAUTH_SECRET 
    })

    return handler(request, { userId: token?.userId as string | undefined })
  } catch (error) {
    console.error('Optional auth middleware error:', error)
    return handler(request, { userId: undefined })
  }
}