/**
 * Test Coverage Configuration and Utilities
 * 
 * Provides comprehensive test coverage reporting and analysis
 * for integration tests and code quality metrics
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

export interface CoverageReport {
  totalLines: number;
  coveredLines: number;
  linePercentage: number;
  totalBranches: number;
  coveredBranches: number;
  branchPercentage: number;
  totalFunctions: number;
  coveredFunctions: number;
  functionPercentage: number;
  totalStatements: number;
  coveredStatements: number;
  statementPercentage: number;
}

export interface FileCoverage {
  filePath: string;
  lines: CoverageReport['totalLines'];
  branches: CoverageReport['totalBranches'];
  functions: CoverageReport['totalFunctions'];
  statements: CoverageReport['totalStatements'];
  uncoveredLines: number[];
}

export interface CoverageThresholds {
  lines: number;
  branches: number;
  functions: number;
  statements: number;
}

export interface TestSuite {
  name: string;
  tests: number;
  passes: number;
  failures: number;
  pending: number;
  duration: number;
  coverage?: CoverageReport;
}

/**
 * Default coverage thresholds for different test types
 */
export const coverageThresholds: Record<string, CoverageThresholds> = {
  unit: {
    lines: 90,
    branches: 85,
    functions: 90,
    statements: 90
  },
  integration: {
    lines: 80,
    branches: 75,
    functions: 80,
    statements: 80
  },
  e2e: {
    lines: 60,
    branches: 55,
    functions: 60,
    statements: 60
  },
  overall: {
    lines: 85,
    branches: 80,
    functions: 85,
    statements: 85
  }
};

/**
 * Run Jest tests with coverage reporting
 */
export async function runTestsWithCoverage(
  testPattern?: string,
  options: {
    collectCoverage?: boolean;
    coverageDirectory?: string;
    coverageReporters?: string[];
    testPathPattern?: string;
  } = {}
): Promise<{
  success: boolean;
  coverage: CoverageReport | null;
  testResults: any;
}> {
  const {
    collectCoverage = true,
    coverageDirectory = 'coverage',
    coverageReporters = ['text', 'lcov', 'html', 'json'],
    testPathPattern
  } = options;

  const jestArgs = [
    '--verbose',
    '--passWithNoTests',
    collectCoverage ? '--coverage' : '',
    collectCoverage ? `--coverageDirectory=${coverageDirectory}` : '',
    collectCoverage ? `--coverageReporters=${coverageReporters.join(',')}` : '',
    testPathPattern ? `--testPathPattern="${testPathPattern}"` : '',
    testPattern ? testPattern : ''
  ].filter(Boolean);

  try {
    const { stdout, stderr } = await execAsync(`npm test -- ${jestArgs.join(' ')}`);
    
    let coverage: CoverageReport | null = null;
    
    if (collectCoverage) {
      coverage = await parseCoverageReport(path.join(coverageDirectory, 'coverage-summary.json'));
    }

    return {
      success: true,
      coverage,
      testResults: { stdout, stderr }
    };
  } catch (error) {
    console.error('Test execution failed:', error);
    return {
      success: false,
      coverage: null,
      testResults: { error: String(error) }
    };
  }
}

/**
 * Parse Jest coverage summary JSON
 */
export async function parseCoverageReport(summaryPath: string): Promise<CoverageReport | null> {
  try {
    const summaryContent = await fs.readFile(summaryPath, 'utf-8');
    const summary = JSON.parse(summaryContent);
    
    const total = summary.total;
    
    return {
      totalLines: total.lines.total,
      coveredLines: total.lines.covered,
      linePercentage: total.lines.pct,
      totalBranches: total.branches.total,
      coveredBranches: total.branches.covered,
      branchPercentage: total.branches.pct,
      totalFunctions: total.functions.total,
      coveredFunctions: total.functions.covered,
      functionPercentage: total.functions.pct,
      totalStatements: total.statements.total,
      coveredStatements: total.statements.covered,
      statementPercentage: total.statements.pct
    };
  } catch (error) {
    console.error('Failed to parse coverage report:', error);
    return null;
  }
}

/**
 * Validate coverage against thresholds
 */
export function validateCoverage(
  coverage: CoverageReport,
  thresholds: CoverageThresholds
): {
  passed: boolean;
  failures: Array<{
    metric: string;
    actual: number;
    threshold: number;
  }>;
} {
  const failures: Array<{ metric: string; actual: number; threshold: number }> = [];

  const checks = [
    { metric: 'lines', actual: coverage.linePercentage, threshold: thresholds.lines },
    { metric: 'branches', actual: coverage.branchPercentage, threshold: thresholds.branches },
    { metric: 'functions', actual: coverage.functionPercentage, threshold: thresholds.functions },
    { metric: 'statements', actual: coverage.statementPercentage, threshold: thresholds.statements }
  ];

  for (const check of checks) {
    if (check.actual < check.threshold) {
      failures.push(check);
    }
  }

  return {
    passed: failures.length === 0,
    failures
  };
}

/**
 * Generate coverage badge data
 */
export function generateCoverageBadge(coverage: CoverageReport): {
  subject: string;
  status: string;
  color: string;
} {
  const overallPercentage = Math.round(
    (coverage.linePercentage + coverage.branchPercentage + 
     coverage.functionPercentage + coverage.statementPercentage) / 4
  );

  let color = 'red';
  if (overallPercentage >= 90) color = 'brightgreen';
  else if (overallPercentage >= 80) color = 'green';
  else if (overallPercentage >= 70) color = 'yellow';
  else if (overallPercentage >= 60) color = 'orange';

  return {
    subject: 'coverage',
    status: `${overallPercentage}%`,
    color
  };
}

/**
 * Run specific test suites and collect coverage
 */
export async function runTestSuites(): Promise<{
  suites: TestSuite[];
  overallCoverage: CoverageReport | null;
  passed: boolean;
}> {
  const suites: TestSuite[] = [];
  let overallCoverage: CoverageReport | null = null;
  let allPassed = true;

  // Unit tests
  console.log('Running unit tests...');
  const unitResults = await runTestsWithCoverage('unit', {
    testPathPattern: 'tests/unit',
    coverageDirectory: 'coverage/unit'
  });

  if (unitResults.coverage) {
    const unitValidation = validateCoverage(unitResults.coverage, coverageThresholds.unit);
    suites.push({
      name: 'Unit Tests',
      tests: 0, // Would be parsed from Jest output
      passes: unitResults.success ? 1 : 0,
      failures: unitResults.success ? 0 : 1,
      pending: 0,
      duration: 0,
      coverage: unitResults.coverage
    });

    if (!unitValidation.passed) {
      allPassed = false;
      console.warn('Unit test coverage below threshold:', unitValidation.failures);
    }
  }

  // Integration tests
  console.log('Running integration tests...');
  const integrationResults = await runTestsWithCoverage('integration', {
    testPathPattern: 'tests/integration',
    coverageDirectory: 'coverage/integration'
  });

  if (integrationResults.coverage) {
    const integrationValidation = validateCoverage(integrationResults.coverage, coverageThresholds.integration);
    suites.push({
      name: 'Integration Tests',
      tests: 0,
      passes: integrationResults.success ? 1 : 0,
      failures: integrationResults.success ? 0 : 1,
      pending: 0,
      duration: 0,
      coverage: integrationResults.coverage
    });

    if (!integrationValidation.passed) {
      allPassed = false;
      console.warn('Integration test coverage below threshold:', integrationValidation.failures);
    }
  }

  // Overall coverage
  console.log('Running all tests for overall coverage...');
  const overallResults = await runTestsWithCoverage('', {
    coverageDirectory: 'coverage/overall'
  });

  if (overallResults.coverage) {
    overallCoverage = overallResults.coverage;
    const overallValidation = validateCoverage(overallResults.coverage, coverageThresholds.overall);

    if (!overallValidation.passed) {
      allPassed = false;
      console.warn('Overall test coverage below threshold:', overallValidation.failures);
    }
  }

  return {
    suites,
    overallCoverage,
    passed: allPassed
  };
}

/**
 * Generate coverage report summary
 */
export function generateCoverageReport(
  suites: TestSuite[],
  overallCoverage: CoverageReport | null
): string {
  let report = '# Test Coverage Report\n\n';
  
  if (overallCoverage) {
    const badge = generateCoverageBadge(overallCoverage);
    
    report += `## Overall Coverage: ${badge.status}\n\n`;
    report += `| Metric | Coverage | Threshold |\n`;
    report += `|--------|----------|----------|\n`;
    report += `| Lines | ${overallCoverage.linePercentage.toFixed(1)}% | ${coverageThresholds.overall.lines}% |\n`;
    report += `| Branches | ${overallCoverage.branchPercentage.toFixed(1)}% | ${coverageThresholds.overall.branches}% |\n`;
    report += `| Functions | ${overallCoverage.functionPercentage.toFixed(1)}% | ${coverageThresholds.overall.functions}% |\n`;
    report += `| Statements | ${overallCoverage.statementPercentage.toFixed(1)}% | ${coverageThresholds.overall.statements}% |\n\n`;
  }

  report += '## Test Suites\n\n';
  for (const suite of suites) {
    report += `### ${suite.name}\n`;
    report += `- Tests: ${suite.tests}\n`;
    report += `- Passes: ${suite.passes}\n`;
    report += `- Failures: ${suite.failures}\n`;
    
    if (suite.coverage) {
      report += `- Line Coverage: ${suite.coverage.linePercentage.toFixed(1)}%\n`;
      report += `- Branch Coverage: ${suite.coverage.branchPercentage.toFixed(1)}%\n`;
    }
    
    report += '\n';
  }

  return report;
}

/**
 * Watch mode for continuous coverage monitoring
 */
export async function watchCoverage(callback?: (coverage: CoverageReport) => void): Promise<void> {
  console.log('Starting coverage watch mode...');
  
  const runCoverage = async () => {
    const results = await runTestSuites();
    
    if (results.overallCoverage && callback) {
      callback(results.overallCoverage);
    }
    
    console.log('Coverage check completed. Watching for changes...');
  };

  // Initial run
  await runCoverage();

  // Watch for file changes (simplified - in production use chokidar or similar)
  const fs = require('fs');
  const path = require('path');
  
  const watchDir = (dir: string) => {
    fs.watch(dir, { recursive: true }, async (eventType: string, filename: string) => {
      if (filename && (filename.endsWith('.ts') || filename.endsWith('.tsx') || filename.endsWith('.js'))) {
        console.log(`File changed: ${filename}`);
        setTimeout(runCoverage, 1000); // Debounce
      }
    });
  };

  watchDir('./src');
  watchDir('./tests');
}

/**
 * CLI function to run coverage analysis
 */
export async function runCoverageAnalysis(): Promise<void> {
  console.log('🧪 Running comprehensive test coverage analysis...\n');

  const results = await runTestSuites();
  
  const report = generateCoverageReport(results.suites, results.overallCoverage);
  
  console.log(report);
  
  // Save report to file
  await fs.writeFile('coverage-report.md', report);
  console.log('📊 Coverage report saved to coverage-report.md');
  
  if (!results.passed) {
    console.error('❌ Coverage thresholds not met');
    process.exit(1);
  }
  
  console.log('✅ All coverage thresholds passed');
}