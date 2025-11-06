import * as Sentry from '@sentry/nextjs';
import { 
  LogEntry, 
  LogContext, 
  MetricEvent, 
  PerformanceMetric, 
  SecurityEvent,
  BusinessMetric,
  LogLevel 
} from '@/shared/types/logging';

class Logger {
  private static instance: Logger;
  private isDev = process.env.NODE_ENV === 'development';
  private enableConsole = process.env.ENABLE_CONSOLE_LOGS !== 'false';

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  /**
   * Create structured log entry
   */
  private createLogEntry(
    level: keyof LogLevel,
    message: string,
    context?: LogContext,
    error?: Error
  ): LogEntry {
    return {
      level,
      message,
      timestamp: new Date().toISOString(),
      context,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : undefined
    };
  }

  /**
   * Log error messages
   */
  error(message: string, error?: Error, context?: LogContext): void {
    const logEntry = this.createLogEntry('ERROR', message, context, error);
    
    // Send to Sentry
    if (error) {
      Sentry.withScope((scope) => {
        if (context) {
          scope.setContext('custom', context as Record<string, any>);
          if (context.userId) scope.setUser({ id: context.userId });
          if (context.component) scope.setTag('component', context.component);
          if (context.operation) scope.setTag('operation', context.operation);
        }
        Sentry.captureException(error);
      });
    } else {
      Sentry.captureMessage(message, 'error');
    }

    // Console output in development
    if (this.isDev && this.enableConsole) {
      console.error('[ERROR]', message, { context, error });
    }

    // Send to external logging service (implement as needed)
    this.sendToExternalLogger(logEntry);
  }

  /**
   * Log warning messages
   */
  warn(message: string, context?: LogContext): void {
    const logEntry = this.createLogEntry('WARN', message, context);
    
    Sentry.captureMessage(message, 'warning');
    
    if (this.isDev && this.enableConsole) {
      console.warn('[WARN]', message, { context });
    }

    this.sendToExternalLogger(logEntry);
  }

  /**
   * Log info messages
   */
  info(message: string, context?: LogContext): void {
    const logEntry = this.createLogEntry('INFO', message, context);
    
    if (this.isDev && this.enableConsole) {
      console.info('[INFO]', message, { context });
    }

    this.sendToExternalLogger(logEntry);
  }

  /**
   * Log debug messages
   */
  debug(message: string, context?: LogContext): void {
    if (!this.isDev) return; // Only log debug in development
    
    const logEntry = this.createLogEntry('DEBUG', message, context);
    
    if (this.enableConsole) {
      console.debug('[DEBUG]', message, { context });
    }

    this.sendToExternalLogger(logEntry);
  }

  /**
   * Track custom metrics
   */
  metric(name: string, value: number, unit?: string, tags?: Record<string, string>): void {
    const metric: MetricEvent = {
      name,
      value,
      unit,
      tags,
      timestamp: new Date().toISOString()
    };

    // Send to Sentry as custom metric
    Sentry.metrics.gauge(name, value, {
      unit: unit as any
    });

    if (this.isDev && this.enableConsole) {
      console.log('[METRIC]', metric);
    }

    // Send to external metrics service
    this.sendToExternalMetrics(metric);
  }

  /**
   * Track performance metrics
   */
  performance(metric: PerformanceMetric): void {
    // Send to Sentry
    Sentry.metrics.gauge('performance.duration', metric.duration, {
      unit: 'millisecond'
    });

    if (this.isDev && this.enableConsole) {
      console.log('[PERFORMANCE]', metric);
    }

    // Send to external performance monitoring
    this.sendToExternalMetrics({
      name: `performance.${metric.name}`,
      value: metric.duration,
      unit: 'ms',
      tags: metric.metadata as Record<string, string>,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Track security events
   */
  security(event: SecurityEvent): void {
    // Send to Sentry with high priority
    Sentry.withScope((scope) => {
      scope.setLevel(event.severity === 'critical' ? 'fatal' : 'error');
      scope.setContext('security', event as Record<string, any>);
      scope.setTag('security_event', event.type);
      if (event.userId) scope.setUser({ id: event.userId });
      
      Sentry.captureMessage(`Security Event: ${event.type}`, 'error');
    });

    // Always log security events regardless of environment
    console.warn('[SECURITY]', event);

    // Send to security monitoring service
    this.sendToSecurityMonitoring(event);
  }

  /**
   * Track business metrics
   */
  business(metric: BusinessMetric): void {
    // Send to Sentry as business metric
    Sentry.metrics.gauge('business.events', 1);

    if (this.isDev && this.enableConsole) {
      console.log('[BUSINESS]', metric);
    }

    // Send to business analytics service
    this.sendToBusinessAnalytics(metric);
  }

  /**
   * Create performance timing wrapper
   */
  time<T>(operation: string, fn: () => Promise<T>, context?: LogContext): Promise<T> {
    const startTime = Date.now();
    
    return fn().then(
      (result) => {
        const duration = Date.now() - startTime;
        this.performance({
          name: operation,
          duration,
          startTime,
          endTime: Date.now(),
          metadata: context
        });
        return result;
      },
      (error) => {
        const duration = Date.now() - startTime;
        this.error(`Operation failed: ${operation}`, error, {
          ...context,
          duration
        });
        throw error;
      }
    );
  }

  /**
   * Send logs to external logging service
   */
  private sendToExternalLogger(logEntry: LogEntry): void {
    // Implement integration with external logging service
    // Examples: DataDog, LogRocket, CloudWatch, etc.
    
    if (process.env.EXTERNAL_LOGGING_ENDPOINT) {
      fetch(process.env.EXTERNAL_LOGGING_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.EXTERNAL_LOGGING_API_KEY}`
        },
        body: JSON.stringify(logEntry)
      }).catch((error) => {
        console.error('Failed to send log to external service:', error);
      });
    }
  }

  /**
   * Send metrics to external metrics service
   */
  private sendToExternalMetrics(metric: MetricEvent): void {
    // Implement integration with external metrics service
    // Examples: DataDog, New Relic, Prometheus, etc.
    
    if (process.env.EXTERNAL_METRICS_ENDPOINT) {
      fetch(process.env.EXTERNAL_METRICS_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.EXTERNAL_METRICS_API_KEY}`
        },
        body: JSON.stringify(metric)
      }).catch((error) => {
        console.error('Failed to send metric to external service:', error);
      });
    }
  }

  /**
   * Send security events to security monitoring
   */
  private sendToSecurityMonitoring(event: SecurityEvent): void {
    // Implement integration with security monitoring service
    // Examples: Splunk, Sumo Logic, etc.
    
    if (process.env.SECURITY_MONITORING_ENDPOINT) {
      fetch(process.env.SECURITY_MONITORING_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SECURITY_MONITORING_API_KEY}`
        },
        body: JSON.stringify(event)
      }).catch((error) => {
        console.error('Failed to send security event:', error);
      });
    }
  }

  /**
   * Send business metrics to analytics service
   */
  private sendToBusinessAnalytics(metric: BusinessMetric): void {
    // Implement integration with business analytics service
    // Examples: Mixpanel, Amplitude, Google Analytics, etc.
    
    if (process.env.BUSINESS_ANALYTICS_ENDPOINT) {
      fetch(process.env.BUSINESS_ANALYTICS_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.BUSINESS_ANALYTICS_API_KEY}`
        },
        body: JSON.stringify(metric)
      }).catch((error) => {
        console.error('Failed to send business metric:', error);
      });
    }
  }
}

// Export singleton instance
export const logger = Logger.getInstance();

// Export convenience functions
export const logError = logger.error.bind(logger);
export const logWarn = logger.warn.bind(logger);
export const logInfo = logger.info.bind(logger);
export const logDebug = logger.debug.bind(logger);
export const trackMetric = logger.metric.bind(logger);
export const trackPerformance = logger.performance.bind(logger);
export const trackSecurity = logger.security.bind(logger);
export const trackBusiness = logger.business.bind(logger);
export const timeOperation = logger.time.bind(logger);