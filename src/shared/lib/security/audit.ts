/**
 * Security Audit Utilities
 * 
 * Provides comprehensive security audit capabilities including
 * vulnerability scanning, security checklist validation, and monitoring
 */

import { NextRequest } from 'next/server';
import crypto from 'crypto';

export interface SecurityAuditResult {
  timestamp: number;
  category: SecurityCategory;
  severity: SecuritySeverity;
  finding: string;
  recommendation: string;
  metadata?: Record<string, any>;
}

export type SecurityCategory = 
  | 'authentication'
  | 'authorization'
  | 'input-validation'
  | 'output-encoding'
  | 'session-management'
  | 'error-handling'
  | 'logging'
  | 'configuration'
  | 'dependencies'
  | 'headers'
  | 'csrf'
  | 'xss'
  | 'sql-injection'
  | 'file-upload'
  | 'rate-limiting'
  | 'data-protection';

export type SecuritySeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export interface SecurityConfig {
  /** Allowed file types for uploads */
  allowedFileTypes: string[];
  /** Maximum file size in bytes */
  maxFileSize: number;
  /** Allowed origins for CORS */
  allowedOrigins: string[];
  /** Session timeout in milliseconds */
  sessionTimeout: number;
  /** Enable debug mode */
  debugMode: boolean;
}

export interface AuditOptions {
  /** Categories to include in audit */
  categories?: SecurityCategory[];
  /** Minimum severity level to report */
  minSeverity?: SecuritySeverity;
  /** Include recommendations */
  includeRecommendations?: boolean;
  /** Custom security rules */
  customRules?: SecurityRule[];
}

export interface SecurityRule {
  id: string;
  category: SecurityCategory;
  severity: SecuritySeverity;
  description: string;
  check: (context: AuditContext) => Promise<boolean>;
  recommendation: string;
}

export interface AuditContext {
  request?: NextRequest;
  headers?: Record<string, string>;
  cookies?: Record<string, string>;
  config?: SecurityConfig;
  environment?: Record<string, string>;
}

const severityWeights: Record<SecuritySeverity, number> = {
  critical: 100,
  high: 75,
  medium: 50,
  low: 25,
  info: 10
};

/**
 * Default security configuration
 */
export const defaultSecurityConfig: SecurityConfig = {
  allowedFileTypes: ['.jpg', '.jpeg', '.png', '.gif', '.pdf', '.doc', '.docx'],
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedOrigins: ['http://localhost:3000', 'https://yourdomain.com'],
  sessionTimeout: 24 * 60 * 60 * 1000, // 24 hours
  debugMode: process.env.NODE_ENV === 'development'
};

/**
 * Built-in security rules
 */
export const securityRules: SecurityRule[] = [
  {
    id: 'secure-headers-check',
    category: 'headers',
    severity: 'high',
    description: 'Check for security headers',
    check: async (context) => {
      const headers = context.headers || {};
      const requiredHeaders = [
        'x-frame-options',
        'x-content-type-options',
        'strict-transport-security',
        'content-security-policy'
      ];
      return requiredHeaders.every(header => 
        Object.keys(headers).some(h => h.toLowerCase() === header)
      );
    },
    recommendation: 'Ensure all security headers are properly configured'
  },
  {
    id: 'https-enforcement',
    category: 'configuration',
    severity: 'critical',
    description: 'Check HTTPS enforcement',
    check: async (context) => {
      if (context.request) {
        const url = new URL(context.request.url);
        return url.protocol === 'https:' || url.hostname === 'localhost';
      }
      return true;
    },
    recommendation: 'Enforce HTTPS in production environments'
  },
  {
    id: 'debug-mode-check',
    category: 'configuration',
    severity: 'medium',
    description: 'Check if debug mode is disabled in production',
    check: async (context) => {
      const isProduction = process.env.NODE_ENV === 'production';
      const debugMode = context.config?.debugMode || false;
      return !isProduction || !debugMode;
    },
    recommendation: 'Disable debug mode in production environments'
  },
  {
    id: 'session-timeout-check',
    category: 'session-management',
    severity: 'medium',
    description: 'Check session timeout configuration',
    check: async (context) => {
      const timeout = context.config?.sessionTimeout || 0;
      const maxTimeout = 8 * 60 * 60 * 1000; // 8 hours
      return timeout > 0 && timeout <= maxTimeout;
    },
    recommendation: 'Configure appropriate session timeout (recommended: 1-8 hours)'
  },
  {
    id: 'file-upload-validation',
    category: 'file-upload',
    severity: 'high',
    description: 'Check file upload restrictions',
    check: async (context) => {
      const allowedTypes = context.config?.allowedFileTypes || [];
      const maxSize = context.config?.maxFileSize || 0;
      return allowedTypes.length > 0 && maxSize > 0 && maxSize <= 50 * 1024 * 1024; // 50MB max
    },
    recommendation: 'Implement file type and size restrictions for uploads'
  },
  {
    id: 'sensitive-data-exposure',
    category: 'data-protection',
    severity: 'critical',
    description: 'Check for sensitive data in logs or responses',
    check: async (context) => {
      // This would need to be implemented based on your specific logging system
      return true; // Placeholder - implement based on your needs
    },
    recommendation: 'Ensure sensitive data is not exposed in logs or error responses'
  },
  {
    id: 'input-validation-check',
    category: 'input-validation',
    severity: 'high',
    description: 'Check for input validation implementation',
    check: async (context) => {
      // This would check if proper validation middleware is in place
      return true; // Placeholder - implement based on your validation strategy
    },
    recommendation: 'Implement comprehensive input validation for all user inputs'
  },
  {
    id: 'error-handling-check',
    category: 'error-handling',
    severity: 'medium',
    description: 'Check error handling implementation',
    check: async (context) => {
      // Check if generic error responses are implemented
      return true; // Placeholder - implement based on your error handling
    },
    recommendation: 'Implement generic error responses to avoid information disclosure'
  }
];

/**
 * Run security audit with specified options
 */
export async function runSecurityAudit(
  context: AuditContext,
  options: AuditOptions = {}
): Promise<SecurityAuditResult[]> {
  const {
    categories = [],
    minSeverity = 'info',
    includeRecommendations = true,
    customRules = []
  } = options;

  const allRules = [...securityRules, ...customRules];
  const results: SecurityAuditResult[] = [];
  const minWeight = severityWeights[minSeverity];

  for (const rule of allRules) {
    // Filter by category if specified
    if (categories.length > 0 && !categories.includes(rule.category)) {
      continue;
    }

    // Filter by severity
    if (severityWeights[rule.severity] < minWeight) {
      continue;
    }

    try {
      const passed = await rule.check(context);
      
      if (!passed) {
        results.push({
          timestamp: Date.now(),
          category: rule.category,
          severity: rule.severity,
          finding: rule.description,
          recommendation: includeRecommendations ? rule.recommendation : '',
          metadata: { ruleId: rule.id }
        });
      }
    } catch (error) {
      console.error(`Security audit rule ${rule.id} failed:`, error);
      results.push({
        timestamp: Date.now(),
        category: 'configuration',
        severity: 'medium',
        finding: `Security audit rule '${rule.id}' execution failed`,
        recommendation: 'Review and fix the security audit rule implementation',
        metadata: { ruleId: rule.id, error: String(error) }
      });
    }
  }

  return results;
}

/**
 * Generate security audit report
 */
export function generateAuditReport(results: SecurityAuditResult[]): {
  summary: {
    total: number;
    bySeverity: Record<SecuritySeverity, number>;
    byCategory: Record<SecurityCategory, number>;
    score: number; // Security score out of 100
  };
  findings: SecurityAuditResult[];
  recommendations: string[];
} {
  const bySeverity: Record<string, number> = {};
  const byCategory: Record<string, number> = {};
  const recommendations: string[] = [];

  for (const result of results) {
    bySeverity[result.severity] = (bySeverity[result.severity] || 0) + 1;
    byCategory[result.category] = (byCategory[result.category] || 0) + 1;
    
    if (result.recommendation && !recommendations.includes(result.recommendation)) {
      recommendations.push(result.recommendation);
    }
  }

  // Calculate security score (100 - weighted penalty for findings)
  const totalPenalty = results.reduce((penalty, result) => {
    return penalty + (severityWeights[result.severity] / 10);
  }, 0);
  
  const score = Math.max(0, Math.min(100, 100 - totalPenalty));

  return {
    summary: {
      total: results.length,
      bySeverity: bySeverity as Record<SecuritySeverity, number>,
      byCategory: byCategory as Record<SecurityCategory, number>,
      score: Math.round(score)
    },
    findings: results,
    recommendations
  };
}

/**
 * Audit request for security issues
 */
export async function auditRequest(
  request: NextRequest,
  config: SecurityConfig = defaultSecurityConfig
): Promise<SecurityAuditResult[]> {
  const context: AuditContext = {
    request,
    headers: Object.fromEntries(request.headers.entries()),
    config,
    environment: Object.fromEntries(
      Object.entries(process.env).filter(([_, value]) => value !== undefined)
    ) as Record<string, string>
  };

  return runSecurityAudit(context, {
    categories: ['headers', 'configuration', 'input-validation', 'authentication']
  });
}

/**
 * Validate Content Security Policy
 */
export function validateCSP(csp: string): {
  valid: boolean;
  warnings: string[];
  suggestions: string[];
} {
  const warnings: string[] = [];
  const suggestions: string[] = [];
  
  const directives = csp.split(';').map(d => d.trim());
  const directiveMap = new Map<string, string[]>();

  // Parse directives
  for (const directive of directives) {
    const [name, ...values] = directive.split(/\s+/);
    if (name) {
      directiveMap.set(name.toLowerCase(), values);
    }
  }

  // Check for dangerous directives
  if (directiveMap.has('script-src')) {
    const scriptSrc = directiveMap.get('script-src') || [];
    if (scriptSrc.includes("'unsafe-eval'")) {
      warnings.push("'unsafe-eval' in script-src allows dangerous eval() usage");
    }
    if (scriptSrc.includes("'unsafe-inline'")) {
      warnings.push("'unsafe-inline' in script-src allows inline scripts");
    }
  } else {
    suggestions.push("Add script-src directive to control script execution");
  }

  // Check for missing important directives
  const importantDirectives = ['default-src', 'script-src', 'object-src', 'base-uri'];
  for (const directive of importantDirectives) {
    if (!directiveMap.has(directive)) {
      suggestions.push(`Consider adding ${directive} directive`);
    }
  }

  return {
    valid: warnings.length === 0,
    warnings,
    suggestions
  };
}

/**
 * Generate security hash for integrity checking
 */
export function generateSecurityHash(data: string, algorithm: string = 'sha256'): string {
  return crypto.createHash(algorithm).update(data).digest('base64');
}

/**
 * Validate file upload security
 */
export function validateFileUpload(
  file: { name: string; size: number; type: string },
  config: SecurityConfig = defaultSecurityConfig
): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check file size
  if (file.size > config.maxFileSize) {
    errors.push(`File size ${file.size} exceeds maximum allowed size ${config.maxFileSize}`);
  }

  // Check file extension
  const extension = '.' + file.name.split('.').pop()?.toLowerCase();
  if (!config.allowedFileTypes.includes(extension)) {
    errors.push(`File type ${extension} is not allowed`);
  }

  // Check MIME type consistency
  const expectedMimeTypes: Record<string, string[]> = {
    '.jpg': ['image/jpeg'],
    '.jpeg': ['image/jpeg'],
    '.png': ['image/png'],
    '.gif': ['image/gif'],
    '.pdf': ['application/pdf'],
    '.doc': ['application/msword'],
    '.docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document']
  };

  const expectedTypes = expectedMimeTypes[extension];
  if (expectedTypes && !expectedTypes.includes(file.type)) {
    errors.push(`MIME type ${file.type} doesn't match file extension ${extension}`);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Monitor security events
 */
export class SecurityMonitor {
  private events: Array<{
    timestamp: number;
    type: string;
    severity: SecuritySeverity;
    message: string;
    metadata?: any;
  }> = [];

  log(type: string, severity: SecuritySeverity, message: string, metadata?: any): void {
    this.events.push({
      timestamp: Date.now(),
      type,
      severity,
      message,
      metadata
    });

    // In production, you might want to send this to an external logging service
    if (severity === 'critical' || severity === 'high') {
      console.warn(`Security Alert [${severity.toUpperCase()}]: ${message}`, metadata);
    }
  }

  getEvents(since?: number): typeof this.events {
    const cutoff = since || 0;
    return this.events.filter(event => event.timestamp >= cutoff);
  }

  getEventsByType(type: string): typeof this.events {
    return this.events.filter(event => event.type === type);
  }

  clear(): void {
    this.events = [];
  }
}

// Global security monitor instance
export const securityMonitor = new SecurityMonitor();