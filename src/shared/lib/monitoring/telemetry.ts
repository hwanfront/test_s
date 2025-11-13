import { logger } from '@/shared/lib/monitoring/logger';

interface TelemetryClient {
  metric(name: string, value: number, unit?: string, tags?: Record<string, string>): void;
  log(level: 'error' | 'warn' | 'info' | 'debug', message: string, context?: Record<string, any>): void;
  performance(name: string, duration: number, metadata?: Record<string, any>): void;
  business(event: string, properties?: Record<string, any>): void;
  time<T>(name: string, fn: () => T | Promise<T>): Promise<T>;
}

class ClientTelemetry implements TelemetryClient {
  private isClient = typeof window !== 'undefined';
  private apiEndpoint = '/api/telemetry';

  /**
   * Send metric to telemetry API
   */
  metric(name: string, value: number, unit?: string, tags?: Record<string, string>): void {
    if (this.isClient) {
      this.sendToAPI('metric', {
        name,
        value,
        unit,
        tags,
        timestamp: new Date().toISOString()
      });
    } else {
      // Server-side: use logger directly
      logger.metric(name, value, unit, tags);
    }
  }

  /**
   * Send log to telemetry API
   */
  log(level: 'error' | 'warn' | 'info' | 'debug', message: string, context?: Record<string, any>): void {
    if (this.isClient) {
      this.sendToAPI('log', {
        level,
        message,
        context: {
          userAgent: navigator.userAgent,
          url: window.location.href,
          timestamp: new Date().toISOString(),
          ...context
        }
      });
    } else {
      // Server-side: use logger directly
      switch (level) {
        case 'error':
          logger.error(message, undefined, context);
          break;
        case 'warn':
          logger.warn(message, context);
          break;
        case 'info':
          logger.info(message, context);
          break;
        case 'debug':
          logger.debug(message, context);
          break;
      }
    }
  }

  /**
   * Send performance metric to telemetry API
   */
  performance(name: string, duration: number, metadata?: Record<string, any>): void {
    if (this.isClient) {
      this.sendToAPI('performance', {
        name,
        duration,
        startTime: Date.now() - duration,
        endTime: Date.now(),
        metadata: {
          userAgent: navigator.userAgent,
          url: window.location.href,
          ...metadata
        }
      });
    } else {
      // Server-side: use logger directly
      logger.performance({
        name,
        duration,
        startTime: Date.now() - duration,
        endTime: Date.now(),
        metadata
      });
    }
  }

  /**
   * Send business metric to telemetry API
   */
  business(event: string, properties?: Record<string, any>): void {
    if (this.isClient) {
      this.sendToAPI('business', {
        event,
        properties: {
          userAgent: navigator.userAgent,
          url: window.location.href,
          ...properties
        },
        timestamp: new Date().toISOString()
      });
    } else {
      // Server-side: use logger directly
      logger.business({
        event: event as any,
        properties,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Time a function execution
   */
  async time<T>(name: string, fn: () => T | Promise<T>): Promise<T> {
    const startTime = Date.now();
    
    try {
      const result = await fn();
      const duration = Date.now() - startTime;
      this.performance(name, duration);
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.log('error', `Operation failed: ${name}`, {
        duration,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Track page view (client-side only)
   */
  pageView(path?: string): void {
    if (!this.isClient) return;

    this.business('page_view', {
      path: path || window.location.pathname,
      referrer: document.referrer,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Track user interaction (client-side only)
   */
  interaction(element: string, action: string, properties?: Record<string, any>): void {
    if (!this.isClient) return;

    this.business('user_interaction', {
      element,
      action,
      ...properties
    });
  }

  /**
   * Track error with context
   */
  error(error: Error, context?: Record<string, any>): void {
    this.log('error', error.message, {
      name: error.name,
      stack: error.stack,
      ...context
    });
  }

  /**
   * Track performance timing from Performance API (client-side only)
   */
  performanceTiming(): void {
    if (!this.isClient || !window.performance) return;

    const timing = window.performance.timing;
    const navigation = timing.loadEventEnd - timing.navigationStart;
    const domContentLoaded = timing.domContentLoadedEventEnd - timing.navigationStart;
    const domComplete = timing.domComplete - timing.navigationStart;

    this.performance('page_load', navigation, {
      domContentLoaded,
      domComplete,
      url: window.location.href
    });
  }

  /**
   * Send data to telemetry API
   */
  private sendToAPI(type: string, data: any): void {
    if (!this.isClient) return;

    // Use sendBeacon if available for better reliability
    if (navigator.sendBeacon) {
      const payload = JSON.stringify({ type, data });
      navigator.sendBeacon(this.apiEndpoint, payload);
    } else {
      // Fallback to fetch
      fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ type, data }),
        keepalive: true
      }).catch((error) => {
        console.warn('Failed to send telemetry data:', error);
      });
    }
  }
}

// Export singleton instance
export const telemetry = new ClientTelemetry();

// Export convenience functions
export const trackMetric = telemetry.metric.bind(telemetry);
export const trackLog = telemetry.log.bind(telemetry);
export const trackPerformance = telemetry.performance.bind(telemetry);
export const trackBusiness = telemetry.business.bind(telemetry);
export const timeOperation = telemetry.time.bind(telemetry);
export const trackPageView = telemetry.pageView.bind(telemetry);
export const trackInteraction = telemetry.interaction.bind(telemetry);
export const trackError = telemetry.error.bind(telemetry);