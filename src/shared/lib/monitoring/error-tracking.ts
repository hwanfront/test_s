/**
 * Error Monitoring and Reporting Utilities
 * 
 * Provides comprehensive error tracking, user feedback collection,
 * and integration with Sentry for production monitoring
 */

import * as Sentry from '@sentry/nextjs';

export interface ErrorContext {
  userId?: string;
  sessionId?: string;
  feature?: string;
  action?: string;
  metadata?: Record<string, any>;
}

export interface UserFeedback {
  name?: string;
  email?: string;
  message: string;
  errorId?: string;
}

export type ErrorSeverity = 'fatal' | 'error' | 'warning' | 'info' | 'debug';

export interface ErrorReport {
  id: string;
  timestamp: number;
  severity: ErrorSeverity;
  message: string;
  stack?: string;
  context: ErrorContext;
  userAgent?: string;
  url?: string;
  userId?: string;
}

/**
 * Enhanced error tracking with context
 */
export class ErrorTracker {
  private static instance: ErrorTracker;
  private context: ErrorContext = {};

  static getInstance(): ErrorTracker {
    if (!ErrorTracker.instance) {
      ErrorTracker.instance = new ErrorTracker();
    }
    return ErrorTracker.instance;
  }

  /**
   * Set global context for all subsequent errors
   */
  setContext(context: Partial<ErrorContext>): void {
    this.context = { ...this.context, ...context };
    
    // Update Sentry scope
    Sentry.setContext('app', context as { [key: string]: unknown });
  }

  /**
   * Set user context
   */
  setUser(user: { id: string; email?: string; name?: string }): void {
    this.context.userId = user.id;
    
    Sentry.setUser({
      id: user.id,
      email: user.email,
      username: user.name
    });
  }

  /**
   * Clear user context (on logout)
   */
  clearUser(): void {
    delete this.context.userId;
    Sentry.setUser(null);
  }

  /**
   * Capture an error with context
   */
  captureError(
    error: Error | string,
    severity: ErrorSeverity = 'error',
    additionalContext?: Partial<ErrorContext>
  ): string {
    const errorId = Sentry.captureException(error, {
      level: severity as any,
      contexts: {
        app: { ...this.context, ...additionalContext }
      },
      tags: {
        feature: additionalContext?.feature || this.context.feature,
        action: additionalContext?.action || this.context.action
      }
    });

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error(`[${severity.toUpperCase()}]`, error, {
        errorId,
        context: { ...this.context, ...additionalContext }
      });
    }

    return errorId;
  }

  /**
   * Capture a message with context
   */
  captureMessage(
    message: string,
    severity: ErrorSeverity = 'info',
    additionalContext?: Partial<ErrorContext>
  ): string {
    const eventId = Sentry.captureMessage(message, {
      level: severity as any,
      contexts: {
        app: { ...this.context, ...additionalContext }
      }
    });

    if (process.env.NODE_ENV === 'development') {
      console.log(`[${severity.toUpperCase()}]`, message, {
        eventId,
        context: { ...this.context, ...additionalContext }
      });
    }

    return eventId;
  }

  /**
   * Capture user feedback
   */
  captureUserFeedback(feedback: UserFeedback): void {
    if (feedback.errorId) {
      Sentry.captureFeedback({
        name: feedback.name || 'Anonymous',
        email: feedback.email || '',
        message: feedback.message,
        associatedEventId: feedback.errorId
      });
    } else {
      // Create a new event for feedback without specific error
      const eventId = this.captureMessage(`User Feedback: ${feedback.message}`, 'info');
      
      Sentry.captureFeedback({
        name: feedback.name || 'Anonymous', 
        email: feedback.email || '',
        message: feedback.message,
        associatedEventId: eventId
      });
    }
  }

  /**
   * Add breadcrumb for debugging
   */
  addBreadcrumb(
    message: string,
    category?: string,
    data?: Record<string, any>
  ): void {
    Sentry.addBreadcrumb({
      message,
      category: category || 'custom',
      data,
      timestamp: Date.now() / 1000
    });
  }

  /**
   * Start a performance transaction
   */
  startTransaction(name: string, op?: string): any {
    return Sentry.startSpan({
      name,
      op: op || 'custom'
    }, (span) => span);
  }

  /**
   * Measure performance of async operations
   */
  async measurePerformance<T>(
    name: string,
    operation: () => Promise<T>,
    context?: Partial<ErrorContext>
  ): Promise<T> {
    return await Sentry.startSpan({
      name,
      op: 'measure'
    }, async (span) => {
      try {
        const result = await operation();
        span.setStatus({ code: 1, message: 'ok' });
        return result;
      } catch (error) {
        span.setStatus({ code: 2, message: 'internal_error' });
        this.captureError(error as Error, 'error', { 
          action: name,
          ...context 
        });
        throw error;
      }
    });
  }
}

/**
 * Global error tracker instance
 */
export const errorTracker = ErrorTracker.getInstance();

/**
 * React Error Boundary integration
 */
export function captureReactError(
  error: Error,
  errorInfo: { componentStack: string }
): string {
  return errorTracker.captureError(error, 'error', {
    feature: 'react',
    action: 'render_error',
    metadata: {
      componentStack: errorInfo.componentStack
    }
  });
}

/**
 * API error handler
 */
export function captureAPIError(
  error: Error,
  endpoint: string,
  method: string,
  statusCode?: number
): string {
  return errorTracker.captureError(error, 'error', {
    feature: 'api',
    action: `${method}_${endpoint}`,
    metadata: {
      endpoint,
      method,
      statusCode
    }
  });
}

/**
 * Analysis pipeline error handler
 */
export function captureAnalysisError(
  error: Error,
  stage: 'preprocessing' | 'ai_analysis' | 'postprocessing',
  sessionId?: string
): string {
  return errorTracker.captureError(error, 'error', {
    feature: 'analysis',
    action: `analysis_${stage}`,
    sessionId,
    metadata: {
      stage
    }
  });
}

/**
 * Authentication error handler
 */
export function captureAuthError(
  error: Error,
  provider?: string,
  action?: string
): string {
  return errorTracker.captureError(error, 'warning', {
    feature: 'auth',
    action: action || 'auth_error',
    metadata: {
      provider
    }
  });
}

/**
 * Performance monitoring helpers
 */
export const performanceMonitor = {
  /**
   * Track page load performance
   */
  trackPageLoad(page: string): void {
    if (typeof window !== 'undefined' && window.performance) {
      const loadTime = window.performance.timing.loadEventEnd - window.performance.timing.navigationStart;
      
      errorTracker.addBreadcrumb(`Page loaded: ${page}`, 'navigation', {
        loadTime,
        page
      });
      
      // Track slow page loads
      if (loadTime > 3000) {
        errorTracker.captureMessage(`Slow page load: ${page} (${loadTime}ms)`, 'warning', {
          feature: 'performance',
          action: 'slow_page_load',
          metadata: { page, loadTime }
        });
      }
    }
  },

  /**
   * Track API call performance
   */
  async trackAPICall<T>(
    endpoint: string,
    method: string,
    operation: () => Promise<T>
  ): Promise<T> {
    return errorTracker.measurePerformance(
      `API ${method} ${endpoint}`,
      operation,
      {
        feature: 'api',
        action: `${method.toLowerCase()}_${endpoint.replace(/[^a-z0-9]/gi, '_')}`,
        metadata: { endpoint, method }
      }
    );
  },

  /**
   * Track user interactions
   */
  trackInteraction(action: string, element?: string, data?: Record<string, any>): void {
    errorTracker.addBreadcrumb(`User interaction: ${action}`, 'user', {
      action,
      element,
      ...data
    });
  }
};

/**
 * Initialize error monitoring
 */
export function initializeErrorMonitoring(): void {
  // Set up global error handlers
  if (typeof window !== 'undefined') {
    // Unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      errorTracker.captureError(
        new Error(`Unhandled promise rejection: ${event.reason}`),
        'error',
        {
          feature: 'global',
          action: 'unhandled_rejection'
        }
      );
    });

    // Global errors
    window.addEventListener('error', (event) => {
      errorTracker.captureError(event.error || new Error(event.message), 'error', {
        feature: 'global',
        action: 'global_error',
        metadata: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        }
      });
    });

    // Track initial page load
    if (document.readyState === 'complete') {
      performanceMonitor.trackPageLoad(window.location.pathname);
    } else {
      window.addEventListener('load', () => {
        performanceMonitor.trackPageLoad(window.location.pathname);
      });
    }
  }
}

/**
 * Error monitoring configuration for different environments
 */
export const errorMonitoringConfig = {
  development: {
    enabled: false,
    logToConsole: true,
    captureUnhandledRejections: true
  },
  staging: {
    enabled: true,
    logToConsole: false,
    captureUnhandledRejections: true,
    sampleRate: 1.0
  },
  production: {
    enabled: true,
    logToConsole: false,
    captureUnhandledRejections: true,
    sampleRate: 0.1
  }
};

/**
 * Utility to check if error monitoring is enabled
 */
export function isErrorMonitoringEnabled(): boolean {
  const env = process.env.NODE_ENV || 'development';
  const config = errorMonitoringConfig[env as keyof typeof errorMonitoringConfig];
  return config?.enabled ?? false;
}