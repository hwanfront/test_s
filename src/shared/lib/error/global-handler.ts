/**
 * T124 [P] Implement global error handling in src/shared/lib/error/global-handler.ts
 * 
 * Global error handling system for comprehensive error management
 */

interface ErrorReport {
  id: string
  timestamp: string
  level: 'error' | 'warning' | 'info'
  message: string
  stack?: string
  component?: string
  userId?: string
  sessionId?: string
  url: string
  userAgent: string
  context?: Record<string, any>
  tags?: string[]
}

interface ErrorHandlerConfig {
  enableConsoleLogging: boolean
  enableRemoteLogging: boolean
  enableUserNotification: boolean
  maxRetries: number
  retryDelay: number
  reportingEndpoint: string
  ignoredErrors: (string | RegExp)[]
  sensitiveDataPatterns: RegExp[]
  rateLimitPerMinute: number
}

type ErrorHandler = (error: Error, context?: Record<string, any>) => void
type ErrorFilter = (error: Error, context?: Record<string, any>) => boolean

/**
 * Default configuration for error handling
 */
const DEFAULT_CONFIG: ErrorHandlerConfig = {
  enableConsoleLogging: process.env.NODE_ENV === 'development',
  enableRemoteLogging: process.env.NODE_ENV === 'production',
  enableUserNotification: true,
  maxRetries: 3,
  retryDelay: 1000,
  reportingEndpoint: '/api/errors/report',
  ignoredErrors: [
    'ResizeObserver loop limit exceeded',
    'Non-Error promise rejection captured',
    /Script error/,
    /Network Error/
  ],
  sensitiveDataPatterns: [
    /password/i,
    /token/i,
    /key/i,
    /secret/i,
    /api[_-]?key/i,
    /auth/i
  ],
  rateLimitPerMinute: 10
}

/**
 * Global error handler class
 */
class GlobalErrorHandler {
  private config: ErrorHandlerConfig
  private errorReports: Map<string, ErrorReport> = new Map()
  private errorHandlers: Set<ErrorHandler> = new Set()
  private errorFilters: Set<ErrorFilter> = new Set()
  private reportQueue: ErrorReport[] = []
  private isReporting = false
  private reportingRateLimit = new Map<string, number>()

  constructor(config: Partial<ErrorHandlerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    // Only setup handlers in browser environment
    if (typeof window !== 'undefined') {
      this.setupGlobalHandlers()
    }
  }

  /**
   * Set up global error listeners (client-side only)
   */
  private setupGlobalHandlers(): void {
    // Guard: Only run in browser
    if (typeof window === 'undefined') return

    // Handle JavaScript errors
    window.addEventListener('error', (event) => {
      const error = event.error || new Error(event.message)
      this.handleError(error, {
        type: 'javascript_error',
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      })
    })

    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      const error = event.reason instanceof Error 
        ? event.reason 
        : new Error(String(event.reason))
      
      this.handleError(error, {
        type: 'unhandled_promise_rejection',
        reason: event.reason
      })
    })

    // Handle fetch errors
    const originalFetch = window.fetch
    window.fetch = async (...args) => {
      try {
        const response = await originalFetch(...args)
        
        if (!response.ok) {
          this.handleError(new Error(`HTTP ${response.status}: ${response.statusText}`), {
            type: 'fetch_error',
            url: args[0],
            status: response.status,
            statusText: response.statusText
          })
        }
        
        return response
      } catch (error) {
        this.handleError(error as Error, {
          type: 'fetch_network_error',
          url: args[0]
        })
        throw error
      }
    }

    // Handle React errors (for when error boundaries don't catch them)
    if (typeof window !== 'undefined' && (window as any).React) {
      const originalCreateElement = (window as any).React.createElement
      
      ;(window as any).React.createElement = (...args: any[]) => {
        try {
          return originalCreateElement(...args)
        } catch (error) {
          this.handleError(error as Error, {
            type: 'react_render_error',
            component: args[0]?.name || 'Unknown'
          })
          throw error
        }
      }
    }
  }

  /**
   * Main error handling method
   */
  handleError(error: Error, context: Record<string, any> = {}): void {
    try {
      // Check if error should be ignored
      if (this.shouldIgnoreError(error)) {
        return
      }

      // Apply filters
      for (const filter of this.errorFilters) {
        if (!filter(error, context)) {
          return
        }
      }

      // Check rate limiting
      if (this.isRateLimited(error)) {
        return
      }

      // Generate error report
      const report = this.createErrorReport(error, context)

      // Store report
      this.errorReports.set(report.id, report)

      // Console logging
      if (this.config.enableConsoleLogging) {
        this.logToConsole(report)
      }

      // User notification
      if (this.config.enableUserNotification) {
        this.notifyUser(report)
      }

      // Remote logging
      if (this.config.enableRemoteLogging) {
        this.queueForReporting(report)
      }

      // Call custom handlers
      for (const handler of this.errorHandlers) {
        try {
          handler(error, context)
        } catch (handlerError) {
          console.error('Error in custom error handler:', handlerError)
        }
      }

    } catch (handlingError) {
      // Fallback error handling
      console.error('Error in error handler:', handlingError)
      console.error('Original error:', error)
    }
  }

  /**
   * Create an error report
   */
  private createErrorReport(error: Error, context: Record<string, any>): ErrorReport {
    const id = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // Sanitize sensitive data
    const sanitizedContext = this.sanitizeData(context)
    const sanitizedStack = this.sanitizeData(error.stack || '')

    return {
      id,
      timestamp: new Date().toISOString(),
      level: this.determineErrorLevel(error, context),
      message: error.message,
      stack: sanitizedStack as string,
      component: context.component,
      userId: this.getCurrentUserId(),
      sessionId: this.getCurrentSessionId(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      context: sanitizedContext,
      tags: this.generateTags(error, context)
    }
  }

  /**
   * Determine error severity level
   */
  private determineErrorLevel(error: Error, context: Record<string, any>): 'error' | 'warning' | 'info' {
    // Critical errors
    if (error.name === 'ChunkLoadError' || error.message.includes('Loading chunk')) {
      return 'error'
    }

    // API errors
    if (context.type === 'fetch_error' && context.status >= 500) {
      return 'error'
    }

    // React errors
    if (context.type === 'react_render_error') {
      return 'error'
    }

    // Network errors
    if (context.type === 'fetch_network_error') {
      return 'warning'
    }

    // Default to error
    return 'error'
  }

  /**
   * Check if error should be ignored
   */
  private shouldIgnoreError(error: Error): boolean {
    return this.config.ignoredErrors.some(pattern => {
      if (typeof pattern === 'string') {
        return error.message.includes(pattern)
      }
      return pattern.test(error.message)
    })
  }

  /**
   * Check rate limiting
   */
  private isRateLimited(error: Error): boolean {
    const key = `${error.name}:${error.message.substring(0, 50)}`
    const now = Date.now()
    const windowStart = now - 60000 // 1 minute window
    
    const count = this.reportingRateLimit.get(key) || 0
    
    if (count >= this.config.rateLimitPerMinute) {
      return true
    }
    
    this.reportingRateLimit.set(key, count + 1)
    
    // Clean up old entries
    setTimeout(() => {
      this.reportingRateLimit.delete(key)
    }, 60000)
    
    return false
  }

  /**
   * Sanitize sensitive data
   */
  private sanitizeData(data: any): any {
    if (typeof data === 'string') {
      let sanitized = data
      for (const pattern of this.config.sensitiveDataPatterns) {
        sanitized = sanitized.replace(pattern, '[REDACTED]')
      }
      return sanitized
    }

    if (typeof data === 'object' && data !== null) {
      const sanitized: any = Array.isArray(data) ? [] : {}
      
      for (const [key, value] of Object.entries(data)) {
        // Check if key contains sensitive information
        const isSensitiveKey = this.config.sensitiveDataPatterns.some(pattern => pattern.test(key))
        
        if (isSensitiveKey) {
          sanitized[key] = '[REDACTED]'
        } else {
          sanitized[key] = this.sanitizeData(value)
        }
      }
      
      return sanitized
    }

    return data
  }

  /**
   * Generate tags for error categorization
   */
  private generateTags(error: Error, context: Record<string, any>): string[] {
    const tags: string[] = []

    // Error type tags
    tags.push(`error_type:${error.name}`)

    // Context type tags
    if (context.type) {
      tags.push(`context:${context.type}`)
    }

    // Component tags
    if (context.component) {
      tags.push(`component:${context.component}`)
    }

    // Browser tags
    tags.push(`browser:${this.getBrowserName()}`)

    // Environment tags
    tags.push(`env:${process.env.NODE_ENV}`)

    return tags
  }

  /**
   * Get browser name for tagging
   */
  private getBrowserName(): string {
    const userAgent = navigator.userAgent
    
    if (userAgent.includes('Chrome')) return 'chrome'
    if (userAgent.includes('Firefox')) return 'firefox'
    if (userAgent.includes('Safari')) return 'safari'
    if (userAgent.includes('Edge')) return 'edge'
    
    return 'unknown'
  }

  /**
   * Get current user ID (implement based on your auth system)
   */
  private getCurrentUserId(): string | undefined {
    // This should be implemented based on your authentication system
    // For example, reading from session storage, cookies, or global state
    try {
      const session = window.localStorage.getItem('session')
      if (session) {
        const parsed = JSON.parse(session)
        return parsed.user?.id
      }
    } catch {
      // Ignore errors getting user ID
    }
    return undefined
  }

  /**
   * Get current session ID
   */
  private getCurrentSessionId(): string | undefined {
    try {
      const sessionId = window.sessionStorage.getItem('sessionId')
      return sessionId || undefined
    } catch {
      return undefined
    }
  }

  /**
   * Log error to console
   */
  private logToConsole(report: ErrorReport): void {
    const logMethod = report.level === 'error' ? console.error : 
                     report.level === 'warning' ? console.warn : 
                     console.info

    logMethod(`[${report.level.toUpperCase()}] ${report.message}`, {
      id: report.id,
      timestamp: report.timestamp,
      context: report.context,
      stack: report.stack
    })
  }

  /**
   * Notify user of error
   */
  private notifyUser(report: ErrorReport): void {
    // Only show user notifications for critical errors
    if (report.level !== 'error') {
      return
    }

    // Avoid spamming user with notifications
    const lastNotification = localStorage.getItem('lastErrorNotification')
    const now = Date.now()
    
    if (lastNotification && now - parseInt(lastNotification) < 30000) {
      return // Don't show notifications more than once every 30 seconds
    }

    // Create user-friendly error message
    const userMessage = this.getUserFriendlyMessage(report)
    
    // You can implement this with your preferred notification system
    // For now, we'll use a simple approach
    if (window.confirm(`${userMessage}\n\nWould you like to reload the page?`)) {
      window.location.reload()
    }

    localStorage.setItem('lastErrorNotification', now.toString())
  }

  /**
   * Get user-friendly error message
   */
  private getUserFriendlyMessage(report: ErrorReport): string {
    // Network errors
    if (report.context?.type === 'fetch_network_error') {
      return 'Network connection error. Please check your internet connection.'
    }

    // Chunk loading errors
    if (report.message.includes('Loading chunk')) {
      return 'Application update detected. The page will be reloaded.'
    }

    // API errors
    if (report.context?.type === 'fetch_error') {
      return 'Server error occurred. Please try again later.'
    }

    // Generic error
    return 'An unexpected error occurred. We apologize for the inconvenience.'
  }

  /**
   * Queue error report for remote logging
   */
  private queueForReporting(report: ErrorReport): void {
    this.reportQueue.push(report)
    
    if (!this.isReporting) {
      this.processReportQueue()
    }
  }

  /**
   * Process queued error reports
   */
  private async processReportQueue(): Promise<void> {
    if (this.isReporting || this.reportQueue.length === 0) {
      return
    }

    this.isReporting = true

    try {
      const batchSize = 5
      const batch = this.reportQueue.splice(0, batchSize)

      const response = await fetch(this.config.reportingEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reports: batch })
      })

      if (!response.ok) {
        // Re-queue failed reports
        this.reportQueue.unshift(...batch)
      }

    } catch (error) {
      console.error('Failed to report errors:', error)
      // Don't re-queue on network errors to avoid infinite loops
    } finally {
      this.isReporting = false

      // Process remaining queue
      if (this.reportQueue.length > 0) {
        setTimeout(() => this.processReportQueue(), this.config.retryDelay)
      }
    }
  }

  /**
   * Add custom error handler
   */
  addErrorHandler(handler: ErrorHandler): void {
    this.errorHandlers.add(handler)
  }

  /**
   * Remove custom error handler
   */
  removeErrorHandler(handler: ErrorHandler): void {
    this.errorHandlers.delete(handler)
  }

  /**
   * Add error filter
   */
  addErrorFilter(filter: ErrorFilter): void {
    this.errorFilters.add(filter)
  }

  /**
   * Remove error filter
   */
  removeErrorFilter(filter: ErrorFilter): void {
    this.errorFilters.delete(filter)
  }

  /**
   * Get error statistics
   */
  getErrorStats(): {
    totalErrors: number
    errorsByLevel: Record<string, number>
    errorsByType: Record<string, number>
    recentErrors: ErrorReport[]
  } {
    const reports = Array.from(this.errorReports.values())
    
    const errorsByLevel: Record<string, number> = {}
    const errorsByType: Record<string, number> = {}

    reports.forEach(report => {
      errorsByLevel[report.level] = (errorsByLevel[report.level] || 0) + 1
      
      const errorType = report.tags?.find(tag => tag.startsWith('error_type:'))?.split(':')[1] || 'unknown'
      errorsByType[errorType] = (errorsByType[errorType] || 0) + 1
    })

    // Get recent errors (last 10)
    const recentErrors = reports
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 10)

    return {
      totalErrors: reports.length,
      errorsByLevel,
      errorsByType,
      recentErrors
    }
  }

  /**
   * Clear error reports
   */
  clearErrorReports(): void {
    this.errorReports.clear()
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<ErrorHandlerConfig>): void {
    this.config = { ...this.config, ...config }
  }
}

/**
 * Global error handler instance
 */
export const globalErrorHandler = new GlobalErrorHandler()

/**
 * Initialize error handling with custom config
 */
export function initializeErrorHandling(config?: Partial<ErrorHandlerConfig>): void {
  if (config) {
    globalErrorHandler.updateConfig(config)
  }
}

/**
 * Manual error reporting function
 */
export function reportError(error: Error, context?: Record<string, any>): void {
  globalErrorHandler.handleError(error, context)
}

/**
 * Wrapper function for async operations
 */
export function withErrorHandling<T extends (...args: any[]) => any>(
  fn: T,
  context?: Record<string, any>
): T {
  return ((...args: any[]) => {
    try {
      const result = fn(...args)
      
      if (result instanceof Promise) {
        return result.catch(error => {
          globalErrorHandler.handleError(error, { ...context, function: fn.name })
          throw error
        })
      }
      
      return result
    } catch (error) {
      globalErrorHandler.handleError(error as Error, { ...context, function: fn.name })
      throw error
    }
  }) as T
}

/**
 * Error handling utilities
 */
export const errorUtils = {
  /**
   * Add custom error handler
   */
  onError: (handler: ErrorHandler) => globalErrorHandler.addErrorHandler(handler),

  /**
   * Add error filter
   */
  filter: (filter: ErrorFilter) => globalErrorHandler.addErrorFilter(filter),

  /**
   * Get error statistics
   */
  getStats: () => globalErrorHandler.getErrorStats(),

  /**
   * Clear error reports
   */
  clearReports: () => globalErrorHandler.clearErrorReports(),

  /**
   * Manual error reporting
   */
  report: reportError
}