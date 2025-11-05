/**
 * T123 [P] Add error boundary components in src/shared/ui/error-boundary.tsx
 * 
 * React Error Boundary components for graceful error handling
 */

'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { Button } from '@/shared/ui/button'
import { Alert } from '@/shared/ui/alert'
import { cn } from '@/shared/lib'

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
  errorInfo?: ErrorInfo
  errorId?: string
}

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo, errorId: string) => void
  showErrorDetails?: boolean
  className?: string
  level?: 'app' | 'page' | 'component'
}

/**
 * Main Error Boundary component
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    const errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    return {
      hasError: true,
      error,
      errorId
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const errorId = this.state.errorId || `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    this.setState({
      errorInfo,
      errorId
    })

    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error Boundary caught an error:', error, errorInfo)
    }

    // Call custom error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo, errorId)
    }

    // Send error to monitoring service in production
    if (process.env.NODE_ENV === 'production') {
      this.reportErrorToService(error, errorInfo, errorId)
    }
  }

  private reportErrorToService = async (error: Error, errorInfo: ErrorInfo, errorId: string) => {
    try {
      // Send error report to monitoring service
      await fetch('/api/errors/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          errorId,
          message: error.message,
          stack: error.stack,
          componentStack: errorInfo.componentStack,
          level: this.props.level || 'component',
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          url: window.location.href
        })
      })
    } catch (reportError) {
      console.error('Failed to report error:', reportError)
    }
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined, errorId: undefined })
  }

  private handleReload = () => {
    window.location.reload()
  }

  private handleGoHome = () => {
    window.location.href = '/'
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      const { error, errorInfo, errorId } = this.state
      const { level = 'component', showErrorDetails = false } = this.props

      return (
        <div className={cn('error-boundary', this.props.className)}>
          {level === 'app' ? (
            <AppLevelErrorFallback
              error={error}
              errorInfo={errorInfo}
              errorId={errorId}
              onRetry={this.handleRetry}
              onReload={this.handleReload}
              onGoHome={this.handleGoHome}
              showDetails={showErrorDetails}
            />
          ) : level === 'page' ? (
            <PageLevelErrorFallback
              error={error}
              errorInfo={errorInfo}
              errorId={errorId}
              onRetry={this.handleRetry}
              onReload={this.handleReload}
              showDetails={showErrorDetails}
            />
          ) : (
            <ComponentLevelErrorFallback
              error={error}
              errorInfo={errorInfo}
              errorId={errorId}
              onRetry={this.handleRetry}
              showDetails={showErrorDetails}
            />
          )}
        </div>
      )
    }

    return this.props.children
  }
}

/**
 * App-level error fallback (full page error)
 */
const AppLevelErrorFallback: React.FC<{
  error?: Error
  errorInfo?: ErrorInfo
  errorId?: string
  onRetry: () => void
  onReload: () => void
  onGoHome: () => void
  showDetails?: boolean
}> = ({ error, errorInfo, errorId, onRetry, onReload, onGoHome, showDetails }) => (
  <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
    <div className="sm:mx-auto sm:w-full sm:max-w-md">
      <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
        <div className="text-center">
          <div className="text-6xl mb-4">😵</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Something went wrong
          </h1>
          <p className="text-gray-600 mb-6">
            We're sorry, but something unexpected happened. Please try one of the options below.
          </p>
          
          {errorId && (
            <div className="bg-gray-100 p-3 rounded-lg mb-6">
              <p className="text-sm text-gray-600">
                Error ID: <code className="font-mono text-xs bg-gray-200 px-1 py-0.5 rounded">{errorId}</code>
              </p>
            </div>
          )}

          <div className="space-y-3">
            <Button onClick={onRetry} className="w-full" variant="default">
              Try Again
            </Button>
            <Button onClick={onReload} className="w-full" variant="outline">
              Reload Page
            </Button>
            <Button onClick={onGoHome} className="w-full" variant="outline">
              Go Home
            </Button>
          </div>

          {showDetails && error && (
            <details className="mt-6 text-left">
              <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-700">
                Technical Details
              </summary>
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded text-xs">
                <div className="font-medium text-red-800 mb-2">Error Message:</div>
                <div className="text-red-700 mb-3 font-mono">{error.message}</div>
                
                {error.stack && (
                  <>
                    <div className="font-medium text-red-800 mb-2">Stack Trace:</div>
                    <pre className="text-red-700 whitespace-pre-wrap overflow-auto max-h-32">
                      {error.stack}
                    </pre>
                  </>
                )}
              </div>
            </details>
          )}
        </div>
      </div>
    </div>
  </div>
)

/**
 * Page-level error fallback
 */
const PageLevelErrorFallback: React.FC<{
  error?: Error
  errorInfo?: ErrorInfo
  errorId?: string
  onRetry: () => void
  onReload: () => void
  showDetails?: boolean
}> = ({ error, errorInfo, errorId, onRetry, onReload, showDetails }) => (
  <div className="max-w-2xl mx-auto py-16 px-4 sm:py-24 sm:px-6 lg:px-8">
    <div className="text-center">
      <div className="text-4xl mb-4">⚠️</div>
      <h1 className="text-xl font-semibold text-gray-900 mb-2">
        Page Error
      </h1>
      <p className="text-gray-600 mb-6">
        This page encountered an error and couldn't load properly.
      </p>
      
      {errorId && (
        <Alert className="mb-4">
          <p className="text-sm">
            Error ID: <code className="font-mono text-xs">{errorId}</code>
          </p>
        </Alert>
      )}

      <div className="flex justify-center space-x-4">
        <Button onClick={onRetry} variant="default">
          Try Again
        </Button>
        <Button onClick={onReload} variant="outline">
          Reload Page
        </Button>
      </div>

      {showDetails && error && (
        <details className="mt-6 text-left max-w-lg mx-auto">
          <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-700">
            Technical Details
          </summary>
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded text-xs">
            <div className="font-medium text-red-800 mb-2">Error:</div>
            <div className="text-red-700 font-mono">{error.message}</div>
          </div>
        </details>
      )}
    </div>
  </div>
)

/**
 * Component-level error fallback
 */
const ComponentLevelErrorFallback: React.FC<{
  error?: Error
  errorInfo?: ErrorInfo
  errorId?: string
  onRetry: () => void
  showDetails?: boolean
}> = ({ error, errorInfo, errorId, onRetry, showDetails }) => (
  <div className="border border-red-200 rounded-lg p-4 bg-red-50">
    <div className="flex items-start">
      <div className="shrink-0">
        <span className="text-red-500 text-lg">⚠️</span>
      </div>
      <div className="ml-3 flex-1">
        <h3 className="text-sm font-medium text-red-800">
          Component Error
        </h3>
        <p className="mt-1 text-sm text-red-700">
          This component encountered an error and couldn't render properly.
        </p>
        
        {errorId && (
          <p className="mt-2 text-xs text-red-600">
            Error ID: <code className="font-mono">{errorId}</code>
          </p>
        )}

        <div className="mt-3">
          <Button 
            onClick={onRetry} 
            size="sm" 
            variant="outline"
            className="border-red-300 text-red-700 hover:bg-red-100"
          >
            Retry Component
          </Button>
        </div>

        {showDetails && error && (
          <details className="mt-3">
            <summary className="text-xs text-red-600 cursor-pointer hover:text-red-800">
              Error Details
            </summary>
            <div className="mt-2 p-2 bg-red-100 rounded text-xs">
              <div className="font-medium text-red-800">Message:</div>
              <div className="text-red-700 font-mono">{error.message}</div>
            </div>
          </details>
        )}
      </div>
    </div>
  </div>
)

/**
 * HOC for wrapping components with error boundary
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  )

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`
  
  return WrappedComponent
}

/**
 * Hook for handling errors in functional components
 */
export function useErrorHandler() {
  const [error, setError] = React.useState<Error | null>(null)

  const resetError = React.useCallback(() => {
    setError(null)
  }, [])

  const handleError = React.useCallback((error: Error) => {
    setError(error)
  }, [])

  React.useEffect(() => {
    if (error) {
      throw error
    }
  }, [error])

  return {
    handleError,
    resetError,
    hasError: !!error
  }
}

/**
 * Async error boundary for handling Promise rejections
 */
export const AsyncErrorBoundary: React.FC<{
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error) => void
}> = ({ children, fallback, onError }) => {
  const { handleError } = useErrorHandler()

  React.useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const error = event.reason instanceof Error ? event.reason : new Error(String(event.reason))
      
      if (onError) {
        onError(error)
      }
      
      handleError(error)
      event.preventDefault()
    }

    window.addEventListener('unhandledrejection', handleUnhandledRejection)
    
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    }
  }, [handleError, onError])

  return (
    <ErrorBoundary fallback={fallback} onError={onError} level="component">
      {children}
    </ErrorBoundary>
  )
}

/**
 * Error boundary specifically for forms
 */
export const FormErrorBoundary: React.FC<{
  children: ReactNode
  onError?: (error: Error) => void
}> = ({ children, onError }) => (
  <ErrorBoundary
    level="component"
    onError={onError}
    fallback={
      <div className="border border-red-200 rounded-lg p-4 bg-red-50">
        <div className="text-center">
          <span className="text-red-500 text-lg">📝</span>
          <h3 className="text-sm font-medium text-red-800 mt-1">
            Form Error
          </h3>
          <p className="mt-1 text-sm text-red-700">
            This form encountered an error. Please refresh the page and try again.
          </p>
        </div>
      </div>
    }
  >
    {children}
  </ErrorBoundary>
)

/**
 * Error boundary for route-level errors
 */
export const RouteErrorBoundary: React.FC<{
  children: ReactNode
}> = ({ children }) => (
  <ErrorBoundary level="page" showErrorDetails={process.env.NODE_ENV === 'development'}>
    {children}
  </ErrorBoundary>
)

/**
 * Error boundary for the entire application
 */
export const AppErrorBoundary: React.FC<{
  children: ReactNode
}> = ({ children }) => (
  <ErrorBoundary level="app" showErrorDetails={process.env.NODE_ENV === 'development'}>
    {children}
  </ErrorBoundary>
)