/**
 * Performance Testing Utilities
 * 
 * Provides comprehensive performance testing for the analysis pipeline
 * including load testing, stress testing, and performance benchmarking
 */

import { performance } from 'perf_hooks';

export interface PerformanceMetrics {
  /** Response time in milliseconds */
  responseTime: number;
  /** Time to first byte in milliseconds */
  ttfb: number;
  /** Memory usage in bytes */
  memoryUsage: number;
  /** CPU usage percentage */
  cpuUsage?: number;
  /** Throughput (requests per second) */
  throughput?: number;
  /** Error rate percentage */
  errorRate: number;
  /** Concurrent users */
  concurrentUsers: number;
  /** Test duration in milliseconds */
  duration: number;
}

export interface LoadTestConfig {
  /** Target URL or function to test */
  target: string | Function;
  /** Number of concurrent users */
  concurrentUsers: number;
  /** Test duration in seconds */
  durationSeconds: number;
  /** Requests per second per user */
  requestsPerSecond: number;
  /** Ramp-up time in seconds */
  rampUpSeconds?: number;
  /** Test data generator */
  dataGenerator?: () => any;
  /** Custom headers */
  headers?: Record<string, string>;
  /** Performance thresholds */
  thresholds?: PerformanceThresholds;
}

export interface PerformanceThresholds {
  /** Maximum acceptable response time (ms) */
  maxResponseTime: number;
  /** Maximum acceptable error rate (%) */
  maxErrorRate: number;
  /** Minimum acceptable throughput (req/s) */
  minThroughput: number;
  /** Maximum acceptable memory usage (MB) */
  maxMemoryUsage?: number;
}

export interface TestResult {
  success: boolean;
  metrics: PerformanceMetrics;
  errors: string[];
  recommendations: string[];
  details: {
    requests: RequestResult[];
    summary: TestSummary;
  };
}

export interface RequestResult {
  timestamp: number;
  responseTime: number;
  statusCode: number;
  error?: string;
  size?: number;
}

export interface TestSummary {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  actualThroughput: number;
}

/**
 * Default performance thresholds for different test scenarios
 */
export const defaultThresholds: Record<string, PerformanceThresholds> = {
  api: {
    maxResponseTime: 2000, // 2 seconds
    maxErrorRate: 1, // 1%
    minThroughput: 10, // 10 req/s
    maxMemoryUsage: 512 // 512 MB
  },
  analysis: {
    maxResponseTime: 30000, // 30 seconds for AI analysis
    maxErrorRate: 0.5, // 0.5%
    minThroughput: 2, // 2 req/s
    maxMemoryUsage: 1024 // 1 GB
  },
  database: {
    maxResponseTime: 500, // 500ms
    maxErrorRate: 0.1, // 0.1%
    minThroughput: 100, // 100 req/s
    maxMemoryUsage: 256 // 256 MB
  }
};

/**
 * Generate test data for analysis endpoints
 */
export function generateAnalysisTestData(): {
  text: string;
  metadata?: Record<string, any>;
} {
  const sampleTexts = [
    `Terms of Service for Mobile Game:
     1. User agrees to data collection for analytics
     2. Company reserves right to terminate accounts
     3. All in-app purchases are non-refundable
     4. User content becomes property of company`,
    
    `Privacy Policy:
     We collect personal information including:
     - Device identifiers
     - Usage patterns
     - Location data
     - Contact lists`,
    
    `End User License Agreement:
     By installing this software, you grant us:
     - Unlimited access to device functions
     - Right to modify software remotely
     - Permission to share data with third parties`,
    
    `Cookie Policy:
     This website uses cookies to:
     - Track user behavior
     - Serve targeted advertisements
     - Analyze website performance
     - Remember user preferences`,
    
    `Terms and Conditions:
     User responsibilities include:
     - Providing accurate information
     - Maintaining account security
     - Complying with local laws
     - Not sharing account credentials`
  ];

  return {
    text: sampleTexts[Math.floor(Math.random() * sampleTexts.length)],
    metadata: {
      timestamp: Date.now(),
      testId: Math.random().toString(36).substring(7)
    }
  };
}

/**
 * Measure response time for a function
 */
export async function measureResponseTime<T>(
  fn: () => Promise<T>
): Promise<{ result: T; responseTime: number }> {
  const start = performance.now();
  
  try {
    const result = await fn();
    const responseTime = performance.now() - start;
    return { result, responseTime };
  } catch (error) {
    const responseTime = performance.now() - start;
    throw new Error(`Function failed after ${responseTime}ms: ${error}`);
  }
}

/**
 * Get current memory usage
 */
export function getMemoryUsage(): number {
  const usage = process.memoryUsage();
  return usage.heapUsed; // Return heap used in bytes
}

/**
 * Run single HTTP request test
 */
export async function runSingleRequest(
  url: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
    body?: any;
  } = {}
): Promise<RequestResult> {
  const { method = 'GET', headers = {}, body } = options;
  const startTime = performance.now();
  const timestamp = Date.now();

  try {
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      body: body ? JSON.stringify(body) : undefined
    });

    const responseTime = performance.now() - startTime;
    const size = parseInt(response.headers.get('content-length') || '0');

    return {
      timestamp,
      responseTime,
      statusCode: response.status,
      size
    };
  } catch (error) {
    const responseTime = performance.now() - startTime;
    
    return {
      timestamp,
      responseTime,
      statusCode: 0,
      error: String(error)
    };
  }
}

/**
 * Run load test
 */
export async function runLoadTest(config: LoadTestConfig): Promise<TestResult> {
  const {
    target,
    concurrentUsers,
    durationSeconds,
    requestsPerSecond,
    rampUpSeconds = 10,
    dataGenerator = generateAnalysisTestData,
    headers = {},
    thresholds = defaultThresholds.api
  } = config;

  const results: RequestResult[] = [];
  const errors: string[] = [];
  const startTime = Date.now();
  const endTime = startTime + (durationSeconds * 1000);

  console.log(`🚀 Starting load test: ${concurrentUsers} users, ${durationSeconds}s duration`);

  // Create user promises
  const userPromises: Promise<void>[] = [];

  for (let userId = 0; userId < concurrentUsers; userId++) {
    const userPromise = runUserSession({
      userId,
      target,
      endTime,
      requestsPerSecond,
      rampUpSeconds,
      dataGenerator,
      headers,
      results,
      errors
    });
    
    userPromises.push(userPromise);
    
    // Ramp up gradually
    if (rampUpSeconds > 0) {
      const delay = (rampUpSeconds * 1000) / concurrentUsers;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // Wait for all users to complete
  await Promise.all(userPromises);

  // Calculate metrics
  const summary = calculateTestSummary(results);
  const metrics = calculatePerformanceMetrics(results, concurrentUsers, durationSeconds);
  
  // Validate against thresholds
  const { success, recommendations } = validatePerformanceThresholds(metrics, thresholds);

  console.log(`✅ Load test completed: ${summary.totalRequests} requests, ${summary.failedRequests} errors`);

  return {
    success,
    metrics,
    errors,
    recommendations,
    details: {
      requests: results,
      summary
    }
  };
}

/**
 * Run individual user session
 */
async function runUserSession(params: {
  userId: number;
  target: string | Function;
  endTime: number;
  requestsPerSecond: number;
  rampUpSeconds: number;
  dataGenerator: () => any;
  headers: Record<string, string>;
  results: RequestResult[];
  errors: string[];
}): Promise<void> {
  const { userId, target, endTime, requestsPerSecond, dataGenerator, headers, results, errors } = params;
  
  const requestInterval = 1000 / requestsPerSecond; // ms between requests

  while (Date.now() < endTime) {
    const requestStart = Date.now();

    try {
      let result: RequestResult;

      if (typeof target === 'string') {
        // HTTP request
        const testData = dataGenerator();
        result = await runSingleRequest(target, {
          method: 'POST',
          headers,
          body: testData
        });
      } else {
        // Function call
        const testData = dataGenerator();
        const { responseTime } = await measureResponseTime(() => target(testData));
        
        result = {
          timestamp: Date.now(),
          responseTime,
          statusCode: 200
        };
      }

      results.push(result);

      if (result.error) {
        errors.push(`User ${userId}: ${result.error}`);
      }
    } catch (error) {
      errors.push(`User ${userId}: ${String(error)}`);
    }

    // Wait for next request interval
    const elapsed = Date.now() - requestStart;
    const waitTime = Math.max(0, requestInterval - elapsed);
    
    if (waitTime > 0) {
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
}

/**
 * Calculate test summary statistics
 */
function calculateTestSummary(results: RequestResult[]): TestSummary {
  const responseTimes = results.map(r => r.responseTime);
  const successfulRequests = results.filter(r => r.statusCode >= 200 && r.statusCode < 400);
  
  responseTimes.sort((a, b) => a - b);
  
  const p95Index = Math.floor(responseTimes.length * 0.95);
  const p99Index = Math.floor(responseTimes.length * 0.99);

  return {
    totalRequests: results.length,
    successfulRequests: successfulRequests.length,
    failedRequests: results.length - successfulRequests.length,
    averageResponseTime: responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length,
    p95ResponseTime: responseTimes[p95Index] || 0,
    p99ResponseTime: responseTimes[p99Index] || 0,
    minResponseTime: Math.min(...responseTimes),
    maxResponseTime: Math.max(...responseTimes),
    actualThroughput: results.length / ((Math.max(...results.map(r => r.timestamp)) - Math.min(...results.map(r => r.timestamp))) / 1000)
  };
}

/**
 * Calculate performance metrics
 */
function calculatePerformanceMetrics(
  results: RequestResult[],
  concurrentUsers: number,
  durationSeconds: number
): PerformanceMetrics {
  const summary = calculateTestSummary(results);
  const errorRate = (summary.failedRequests / summary.totalRequests) * 100;
  
  return {
    responseTime: summary.averageResponseTime,
    ttfb: summary.averageResponseTime, // Simplified - in real scenario, measure TTFB separately
    memoryUsage: getMemoryUsage(),
    throughput: summary.actualThroughput,
    errorRate,
    concurrentUsers,
    duration: durationSeconds * 1000
  };
}

/**
 * Validate performance against thresholds
 */
function validatePerformanceThresholds(
  metrics: PerformanceMetrics,
  thresholds: PerformanceThresholds
): { success: boolean; recommendations: string[] } {
  const recommendations: string[] = [];
  let success = true;

  if (metrics.responseTime > thresholds.maxResponseTime) {
    success = false;
    recommendations.push(
      `Average response time (${metrics.responseTime.toFixed(1)}ms) exceeds threshold (${thresholds.maxResponseTime}ms). Consider optimizing slow operations.`
    );
  }

  if (metrics.errorRate > thresholds.maxErrorRate) {
    success = false;
    recommendations.push(
      `Error rate (${metrics.errorRate.toFixed(2)}%) exceeds threshold (${thresholds.maxErrorRate}%). Investigate and fix errors.`
    );
  }

  if (metrics.throughput && metrics.throughput < thresholds.minThroughput) {
    success = false;
    recommendations.push(
      `Throughput (${metrics.throughput.toFixed(1)} req/s) below threshold (${thresholds.minThroughput} req/s). Consider scaling or optimization.`
    );
  }

  if (thresholds.maxMemoryUsage && metrics.memoryUsage > thresholds.maxMemoryUsage * 1024 * 1024) {
    success = false;
    recommendations.push(
      `Memory usage (${(metrics.memoryUsage / 1024 / 1024).toFixed(1)}MB) exceeds threshold (${thresholds.maxMemoryUsage}MB). Check for memory leaks.`
    );
  }

  if (success) {
    recommendations.push('All performance thresholds passed! 🎉');
  }

  return { success, recommendations };
}

/**
 * Run analysis pipeline performance test
 */
export async function testAnalysisPipelinePerformance(): Promise<TestResult> {
  console.log('🔬 Testing analysis pipeline performance...');

  const config: LoadTestConfig = {
    target: 'http://localhost:3000/api/analysis',
    concurrentUsers: 5,
    durationSeconds: 60,
    requestsPerSecond: 0.5, // Slow rate for AI analysis
    rampUpSeconds: 10,
    headers: {
      'Authorization': 'Bearer test-token',
      'x-csrf-token': 'test-csrf-token'
    },
    thresholds: defaultThresholds.analysis
  };

  return runLoadTest(config);
}

/**
 * Run API endpoints performance test
 */
export async function testAPIPerformance(): Promise<TestResult> {
  console.log('⚡ Testing API endpoints performance...');

  const config: LoadTestConfig = {
    target: 'http://localhost:3000/api/quota',
    concurrentUsers: 20,
    durationSeconds: 30,
    requestsPerSecond: 2,
    rampUpSeconds: 5,
    thresholds: defaultThresholds.api
  };

  return runLoadTest(config);
}

/**
 * Generate performance report
 */
export function generatePerformanceReport(results: TestResult[]): string {
  let report = '# Performance Test Report\n\n';
  
  report += `Generated: ${new Date().toISOString()}\n\n`;

  for (const [index, result] of results.entries()) {
    const testName = `Test ${index + 1}`;
    const { metrics, details } = result;
    
    report += `## ${testName}\n\n`;
    report += `**Status:** ${result.success ? '✅ PASSED' : '❌ FAILED'}\n\n`;
    
    report += `### Metrics\n`;
    report += `- Response Time: ${metrics.responseTime.toFixed(1)}ms\n`;
    report += `- Throughput: ${metrics.throughput?.toFixed(1) || 'N/A'} req/s\n`;
    report += `- Error Rate: ${metrics.errorRate.toFixed(2)}%\n`;
    report += `- Concurrent Users: ${metrics.concurrentUsers}\n`;
    report += `- Memory Usage: ${(metrics.memoryUsage / 1024 / 1024).toFixed(1)}MB\n\n`;
    
    report += `### Summary\n`;
    report += `- Total Requests: ${details.summary.totalRequests}\n`;
    report += `- Successful: ${details.summary.successfulRequests}\n`;
    report += `- Failed: ${details.summary.failedRequests}\n`;
    report += `- Average Response Time: ${details.summary.averageResponseTime.toFixed(1)}ms\n`;
    report += `- 95th Percentile: ${details.summary.p95ResponseTime.toFixed(1)}ms\n`;
    report += `- 99th Percentile: ${details.summary.p99ResponseTime.toFixed(1)}ms\n\n`;
    
    if (result.recommendations.length > 0) {
      report += `### Recommendations\n`;
      for (const recommendation of result.recommendations) {
        report += `- ${recommendation}\n`;
      }
      report += '\n';
    }
  }

  return report;
}

/**
 * CLI function to run all performance tests
 */
export async function runPerformanceTests(): Promise<void> {
  console.log('🚀 Starting comprehensive performance testing...\n');

  const results: TestResult[] = [];

  try {
    // Test API performance
    const apiResults = await testAPIPerformance();
    results.push(apiResults);

    // Test analysis pipeline performance
    const analysisResults = await testAnalysisPipelinePerformance();
    results.push(analysisResults);

    // Generate report
    const report = generatePerformanceReport(results);
    console.log(report);

    // Save report
    const fs = require('fs/promises');
    await fs.writeFile('performance-report.md', report);
    console.log('📊 Performance report saved to performance-report.md');

    // Check if all tests passed
    const allPassed = results.every(r => r.success);
    
    if (!allPassed) {
      console.error('❌ Some performance tests failed');
      process.exit(1);
    }

    console.log('✅ All performance tests passed!');
  } catch (error) {
    console.error('❌ Performance testing failed:', error);
    process.exit(1);
  }
}