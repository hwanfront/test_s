/**
 * T125 [P] Create user-friendly error pages in src/app/error.tsx
 * 
 * Global error page for Next.js App Router
 */

'use client'

import { useEffect } from 'react'
import { Button } from '@/shared/ui/button'
import { Alert } from '@/shared/ui/alert'
import { globalErrorHandler } from '@/shared/lib/error/global-handler'

interface ErrorPageProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    // Report the error to our global error handler
    globalErrorHandler.handleError(error, {
      type: 'app_router_error',
      digest: error.digest,
      page: 'root_error'
    })
  }, [error])

  const getErrorInfo = () => {
    // Chunk loading errors
    if (error.message.includes('Loading chunk') || error.name === 'ChunkLoadError') {
      return {
        title: 'Application Update',
        description: 'A new version of the application is available. Please refresh the page to get the latest updates.',
        icon: '🔄',
        actionText: 'Refresh Page',
        action: () => window.location.reload()
      }
    }

    // Network errors
    if (error.message.includes('fetch') || error.message.includes('network')) {
      return {
        title: 'Connection Error',
        description: 'Unable to connect to our servers. Please check your internet connection and try again.',
        icon: '🌐',
        actionText: 'Try Again',
        action: reset
      }
    }

    // API errors
    if (error.message.includes('500') || error.message.includes('Internal Server Error')) {
      return {
        title: 'Server Error',
        description: 'Our servers are experiencing issues. We\'ve been notified and are working to fix this.',
        icon: '🔧',
        actionText: 'Try Again',
        action: reset
      }
    }

    // Permission errors
    if (error.message.includes('403') || error.message.includes('Forbidden')) {
      return {
        title: 'Access Denied',
        description: 'You don\'t have permission to access this resource. Please sign in or contact support.',
        icon: '🔒',
        actionText: 'Go to Sign In',
        action: () => window.location.href = '/signin'
      }
    }

    // Generic error
    return {
      title: 'Something Went Wrong',
      description: 'An unexpected error occurred. We apologize for the inconvenience and are working to fix this issue.',
      icon: '😵',
      actionText: 'Try Again',
      action: reset
    }
  }

  const errorInfo = getErrorInfo()
  const isDevelopment = process.env.NODE_ENV === 'development'

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-lg rounded-lg sm:px-10">
          <div className="text-center">
            {/* Error Icon */}
            <div className="text-6xl mb-4">{errorInfo.icon}</div>
            
            {/* Error Title */}
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {errorInfo.title}
            </h1>
            
            {/* Error Description */}
            <p className="text-gray-600 mb-6">
              {errorInfo.description}
            </p>
            
            {/* Error ID */}
            {error.digest && (
              <Alert className="mb-6">
                <div className="text-sm">
                  <strong>Error ID:</strong>{' '}
                  <code className="font-mono text-xs bg-gray-100 px-1 py-0.5 rounded">
                    {error.digest}
                  </code>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Include this ID when contacting support
                </div>
              </Alert>
            )}

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button 
                onClick={errorInfo.action} 
                className="w-full"
                variant="default"
              >
                {errorInfo.actionText}
              </Button>
              
              <Button 
                onClick={() => window.location.href = '/'} 
                className="w-full" 
                variant="outline"
              >
                Go Home
              </Button>
              
              <Button 
                onClick={() => window.location.reload()} 
                className="w-full" 
                variant="outline"
              >
                Reload Page
              </Button>
            </div>

            {/* Development Error Details */}
            {isDevelopment && (
              <details className="mt-8 text-left">
                <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-700 mb-3">
                  🔧 Development Details
                </summary>
                
                <div className="space-y-4">
                  {/* Error Message */}
                  <div className="p-3 bg-red-50 border border-red-200 rounded">
                    <div className="text-xs font-medium text-red-800 mb-1">Error Message:</div>
                    <div className="text-xs text-red-700 font-mono break-all">
                      {error.message}
                    </div>
                  </div>

                  {/* Error Name */}
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                    <div className="text-xs font-medium text-yellow-800 mb-1">Error Type:</div>
                    <div className="text-xs text-yellow-700 font-mono">
                      {error.name}
                    </div>
                  </div>

                  {/* Stack Trace */}
                  {error.stack && (
                    <div className="p-3 bg-gray-50 border border-gray-200 rounded">
                      <div className="text-xs font-medium text-gray-800 mb-1">Stack Trace:</div>
                      <pre className="text-xs text-gray-700 font-mono whitespace-pre-wrap overflow-auto max-h-40 break-all">
                        {error.stack}
                      </pre>
                    </div>
                  )}

                  {/* Error Digest */}
                  {error.digest && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                      <div className="text-xs font-medium text-blue-800 mb-1">Error Digest:</div>
                      <div className="text-xs text-blue-700 font-mono break-all">
                        {error.digest}
                      </div>
                    </div>
                  )}
                </div>
              </details>
            )}

            {/* Support Information */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <p className="text-xs text-gray-500">
                If this problem persists, please contact our support team.
              </p>
              <div className="mt-2 space-x-4 text-xs">
                <a 
                  href="mailto:support@example.com" 
                  className="text-blue-600 hover:text-blue-800"
                >
                  Email Support
                </a>
                <a 
                  href="/help" 
                  className="text-blue-600 hover:text-blue-800"
                >
                  Help Center
                </a>
                <a 
                  href="/status" 
                  className="text-blue-600 hover:text-blue-800"
                >
                  System Status
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}