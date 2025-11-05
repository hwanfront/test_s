/**
 * Global Error Handler Client Component
 * 
 * Initializes the global error handler on the client side
 */

'use client'

import { useEffect } from 'react'
import { initializeErrorHandling } from '@/shared/lib/error/global-handler'

export function GlobalErrorHandler() {
  useEffect(() => {
    // Initialize error handling
    initializeErrorHandling({
      enableConsoleLogging: process.env.NODE_ENV === 'development',
      enableRemoteLogging: process.env.NODE_ENV === 'production',
      enableUserNotification: true,
      maxRetries: 3,
      retryDelay: 1000,
      reportingEndpoint: '/api/errors/report',
      rateLimitPerMinute: 10
    })
  }, [])

  // This component doesn't render anything
  return null
}