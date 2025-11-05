import { NextResponse } from 'next/server'

export interface ApiErrorResponse {
  error: string
  message: string
  details?: any
}

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public error: string,
    message: string,
    public details?: any
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export const handleApiError = (error: unknown): NextResponse<ApiErrorResponse> => {
  console.error('API Error:', error)

  if (error instanceof AppError) {
    return NextResponse.json(
      {
        error: error.error,
        message: error.message,
        details: error.details,
      },
      { status: error.statusCode }
    )
  }

  if (error instanceof Error) {
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' 
          ? error.message 
          : 'An unexpected error occurred',
      },
      { status: 500 }
    )
  }

  return NextResponse.json(
    {
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    },
    { status: 500 }
  )
}

// Common error types
export const errors = {
  unauthorized: (message = 'Authentication required') =>
    new AppError(401, 'Unauthorized', message),
  
  forbidden: (message = 'Access denied') =>
    new AppError(403, 'Forbidden', message),
  
  notFound: (resource = 'Resource') =>
    new AppError(404, 'Not Found', `${resource} not found`),
  
  badRequest: (message = 'Invalid request') =>
    new AppError(400, 'Bad Request', message),
  
  conflict: (message = 'Resource already exists') =>
    new AppError(409, 'Conflict', message),
  
  tooManyRequests: (message = 'Rate limit exceeded') =>
    new AppError(429, 'Too Many Requests', message),
  
  internal: (message = 'Internal server error') =>
    new AppError(500, 'Internal Server Error', message),
  
  quotaExceeded: (message = 'Usage quota exceeded') =>
    new AppError(429, 'Quota Exceeded', message),
}