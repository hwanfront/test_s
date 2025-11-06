export interface LogLevel {
  ERROR: 'error';
  WARN: 'warn';
  INFO: 'info';
  DEBUG: 'debug';
}

export interface LogContext {
  userId?: string;
  sessionId?: string;
  requestId?: string;
  component?: string;
  operation?: string;
  duration?: number;
  metadata?: Record<string, any>;
}

export interface LogEntry {
  level: keyof LogLevel;
  message: string;
  timestamp: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

export interface MetricEvent {
  name: string;
  value: number;
  unit?: string;
  tags?: Record<string, string>;
  timestamp: string;
}

export interface PerformanceMetric {
  name: string;
  duration: number;
  startTime: number;
  endTime: number;
  metadata?: Record<string, any>;
}

export interface SecurityEvent {
  type: 'auth_failure' | 'rate_limit' | 'suspicious_activity' | 'data_access';
  severity: 'low' | 'medium' | 'high' | 'critical';
  userId?: string;
  ip?: string;
  userAgent?: string;
  details: Record<string, any>;
  timestamp: string;
}

export interface BusinessMetric {
  event: 'analysis_completed' | 'user_registered' | 'error_occurred' | 'quota_exceeded';
  userId?: string;
  properties?: Record<string, any>;
  timestamp: string;
}