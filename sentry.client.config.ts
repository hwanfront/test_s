import { init } from '@sentry/nextjs';

const SENTRY_DSN = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

init({
  dsn: SENTRY_DSN,
  environment: process.env.NODE_ENV,
  
  // Performance Monitoring
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  
  // Session Replay
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  
  // Error Filtering
  beforeSend(event, hint) {
    // Filter out known non-critical errors
    const error = hint.originalException;
    
    if (error && typeof error === 'object' && 'message' in error) {
      const message = String(error.message);
      
      // Filter out common browser/network errors that aren't actionable
      const ignoredMessages = [
        'Network request failed',
        'Failed to fetch',
        'Load failed',
        'Script error',
        'Non-Error promise rejection captured',
        'ResizeObserver loop limit exceeded',
        'ChunkLoadError'
      ];
      
      if (ignoredMessages.some(msg => message.includes(msg))) {
        return null;
      }
    }
    
    // Filter out localhost errors in development
    if (process.env.NODE_ENV === 'development' && event.request?.url?.includes('localhost')) {
      return null;
    }
    
    return event;
  },
  
  // Release tracking
  release: process.env.VERCEL_GIT_COMMIT_SHA || process.env.npm_package_version,
  
  // Custom tags
  initialScope: {
    tags: {
      component: 'web',
      feature: 'ai-analysis'
    }
  },
  
  // Integration configurations
  integrations: [
    // Add additional integrations as needed
  ],
  
  // Debug mode for development
  debug: process.env.NODE_ENV === 'development',
  
  // Disable in development to avoid noise
  enabled: process.env.NODE_ENV === 'production'
});