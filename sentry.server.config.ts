import { init } from '@sentry/nextjs';

const SENTRY_DSN = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

init({
  dsn: SENTRY_DSN,
  environment: process.env.NODE_ENV,
  
  // Performance Monitoring
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  
  // Server-specific configuration
  spotlight: process.env.NODE_ENV === 'development',
  
  // Error Filtering for Server
  beforeSend(event, hint) {
    const error = hint.originalException;
    
    if (error && typeof error === 'object' && 'message' in error) {
      const message = String(error.message);
      
      // Filter out known server errors that aren't actionable
      const ignoredMessages = [
        'ECONNRESET',
        'ECONNREFUSED', 
        'ETIMEDOUT',
        'socket hang up',
        'request aborted'
      ];
      
      if (ignoredMessages.some(msg => message.includes(msg))) {
        return null;
      }
    }
    
    return event;
  },
  
  // Release tracking
  release: process.env.VERCEL_GIT_COMMIT_SHA || process.env.npm_package_version,
  
  // Custom tags for server
  initialScope: {
    tags: {
      component: 'server',
      feature: 'ai-analysis'
    }
  },
  
  // Debug mode for development
  debug: process.env.NODE_ENV === 'development',
  
  // Disable in development
  enabled: process.env.NODE_ENV === 'production'
});