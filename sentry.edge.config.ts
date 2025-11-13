import { init } from '@sentry/nextjs';

const SENTRY_DSN = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

init({
  dsn: SENTRY_DSN,
  environment: process.env.NODE_ENV,
  
  // Performance Monitoring for Edge
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  
  // Edge runtime specific configuration
  beforeSend(event, hint) {
    // Edge runtime error filtering
    const error = hint.originalException;
    
    if (error && typeof error === 'object' && 'message' in error) {
      const message = String(error.message);
      
      // Filter edge-specific errors
      const ignoredMessages = [
        'Dynamic Code Evaluation',
        'AbortError'
      ];
      
      if (ignoredMessages.some(msg => message.includes(msg))) {
        return null;
      }
    }
    
    return event;
  },
  
  // Release tracking
  release: process.env.VERCEL_GIT_COMMIT_SHA || process.env.npm_package_version,
  
  // Custom tags for edge
  initialScope: {
    tags: {
      component: 'edge',
      feature: 'ai-analysis'
    }
  },
  
  // Disable in development
  enabled: process.env.NODE_ENV === 'production'
});