/**
 * Accessibility Testing Utilities
 * 
 * Provides comprehensive accessibility testing using axe-core
 * and manual accessibility checks for WCAG compliance
 */

import { expect, Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { AxeResults, ElementContext, RunOptions, Spec, Result } from 'axe-core';

export interface AccessibilityViolation {
  id: string;
  impact: 'minor' | 'moderate' | 'serious' | 'critical';
  description: string;
  help: string;
  helpUrl: string;
  elements: Array<{
    target: string;
    html: string;
    failureSummary: string;
  }>;
}

export interface AccessibilityReport {
  url: string;
  timestamp: number;
  totalViolations: number;
  violationsBySeverity: Record<string, number>;
  violations: AccessibilityViolation[];
  wcagLevel: 'A' | 'AA' | 'AAA';
  passed: boolean;
  score: number; // 0-100
}

export interface AccessibilityTestConfig {
  /** WCAG level to test against */
  wcagLevel?: 'A' | 'AA' | 'AAA';
  /** Specific rules to include */
  rules?: Record<string, { enabled: boolean }>;
  /** Elements to exclude from testing */
  exclude?: string[];
  /** Tags to include in testing */
  tags?: string[];
  /** Custom axe-core configuration */
  axeConfig?: RunOptions;
}

/**
 * Default accessibility configuration
 */
export const defaultA11yConfig: AccessibilityTestConfig = {
  wcagLevel: 'AA',
  tags: ['wcag2a', 'wcag2aa', 'wcag21aa'],
  rules: {
    // Common rules to enforce
    'color-contrast': { enabled: true },
    'keyboard-navigation': { enabled: true },
    'focus-management': { enabled: true },
    'alt-text': { enabled: true },
    'heading-order': { enabled: true },
    'landmark-roles': { enabled: true },
    'aria-labels': { enabled: true }
  }
};

/**
 * WCAG criteria mapping
 */
export const wcagCriteria = {
  A: {
    tags: ['wcag2a'],
    description: 'Level A - Minimum level of accessibility'
  },
  AA: {
    tags: ['wcag2a', 'wcag2aa'],
    description: 'Level AA - Standard level for most websites'
  },
  AAA: {
    tags: ['wcag2a', 'wcag2aa', 'wcag2aaa'],
    description: 'Level AAA - Highest level of accessibility'
  }
};

/**
 * Initialize axe-core on a page
 */
export async function initializeAxe(page: Page): Promise<void> {
  // @axe-core/playwright handles injection automatically
  // This function is kept for compatibility
}

/**
 * Run accessibility audit on a page
 */
export async function auditPageAccessibility(
  page: Page,
  config: AccessibilityTestConfig = defaultA11yConfig
): Promise<AccessibilityReport> {
  const url = page.url();
  const timestamp = Date.now();

  // Use AxeBuilder for modern axe-core/playwright API
  const axeBuilder = new AxeBuilder({ page });
  
  // Configure axe options
  if (config.tags) {
    axeBuilder.withTags(config.tags);
  }
  
  if (config.exclude) {
    axeBuilder.exclude(config.exclude);
  }

  if (config.rules) {
    Object.entries(config.rules).forEach(([rule, settings]) => {
      if (settings.enabled) {
        axeBuilder.withRules([rule]);
      } else {
        axeBuilder.disableRules([rule]);
      }
    });
  }

  // Run accessibility audit
  const results = await axeBuilder.analyze();
  
  // Process violations
  const violations: AccessibilityViolation[] = results.violations.map((violation: Result) => ({
    id: violation.id,
    impact: violation.impact as any,
    description: violation.description,
    help: violation.help,
    helpUrl: violation.helpUrl,
    elements: violation.nodes.map((node: any) => ({
      target: node.target.join(', '),
      html: node.html,
      failureSummary: node.failureSummary || ''
    }))
  }));

  // Calculate violations by severity
  const violationsBySeverity = violations.reduce((acc, violation) => {
    acc[violation.impact] = (acc[violation.impact] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Calculate accessibility score (0-100)
  const criticalWeight = 10;
  const seriousWeight = 7;
  const moderateWeight = 4;
  const minorWeight = 1;

  const totalPenalty = 
    (violationsBySeverity.critical || 0) * criticalWeight +
    (violationsBySeverity.serious || 0) * seriousWeight +
    (violationsBySeverity.moderate || 0) * moderateWeight +
    (violationsBySeverity.minor || 0) * minorWeight;

  const score = Math.max(0, Math.min(100, 100 - totalPenalty));
  const passed = violations.length === 0 || score >= 80; // 80% threshold

  return {
    url,
    timestamp,
    totalViolations: violations.length,
    violationsBySeverity,
    violations,
    wcagLevel: config.wcagLevel || 'AA',
    passed,
    score
  };
}

/**
 * Test keyboard navigation
 */
export async function testKeyboardNavigation(page: Page): Promise<{
  passed: boolean;
  issues: string[];
}> {
  const issues: string[] = [];

  try {
    // Check if all interactive elements are keyboard accessible
    const interactiveElements = await page.locator('button, a, input, select, textarea, [tabindex]:not([tabindex="-1"])').all();
    
    for (const element of interactiveElements) {
      // Focus on element
      await element.focus();
      
      // Check if element is actually focused
      const isFocused = await element.evaluate(el => el === document.activeElement);
      
      if (!isFocused) {
        const tagName = await element.evaluate(el => el.tagName.toLowerCase());
        issues.push(`Element ${tagName} is not keyboard focusable`);
      }
    }

    // Test tab navigation
    await page.keyboard.press('Tab');
    const firstFocusable = await page.locator(':focus').first();
    
    if (await firstFocusable.count() === 0) {
      issues.push('No element receives focus on Tab press');
    }

    // Test escape key for modals/dialogs
    const modals = await page.locator('[role="dialog"], .modal').all();
    for (const modal of modals) {
      if (await modal.isVisible()) {
        await page.keyboard.press('Escape');
        const stillVisible = await modal.isVisible();
        if (stillVisible) {
          issues.push('Modal does not close with Escape key');
        }
      }
    }

  } catch (error) {
    issues.push(`Keyboard navigation test failed: ${error}`);
  }

  return {
    passed: issues.length === 0,
    issues
  };
}

/**
 * Test color contrast
 */
export async function testColorContrast(page: Page): Promise<{
  passed: boolean;
  issues: string[];
}> {
  const issues: string[] = [];

  try {
    // Check color contrast using axe-core
    const axeBuilder = new AxeBuilder({ page }).withRules(['color-contrast']);
    const results = await axeBuilder.analyze();

    for (const violation of results.violations) {
      if (violation.id === 'color-contrast') {
        issues.push(`Color contrast violation: ${violation.description}`);
      }
    }

  } catch (error) {
    issues.push(`Color contrast test failed: ${error}`);
  }

  return {
    passed: issues.length === 0,
    issues
  };
}

/**
 * Test ARIA labels and roles
 */
export async function testAriaLabelsAndRoles(page: Page): Promise<{
  passed: boolean;
  issues: string[];
}> {
  const issues: string[] = [];

  try {
    // Check for missing alt text on images
    const images = await page.locator('img').all();
    for (const img of images) {
      const alt = await img.getAttribute('alt');
      const ariaLabel = await img.getAttribute('aria-label');
      const ariaLabelledby = await img.getAttribute('aria-labelledby');
      
      if (!alt && !ariaLabel && !ariaLabelledby) {
        issues.push('Image missing alt text or ARIA label');
      }
    }

    // Check for proper heading hierarchy
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').all();
    let previousLevel = 0;
    
    for (const heading of headings) {
      const tagName = await heading.evaluate(el => el.tagName.toLowerCase());
      const currentLevel = parseInt(tagName.substring(1));
      
      if (currentLevel > previousLevel + 1) {
        issues.push(`Heading level skipped: found ${tagName} after h${previousLevel}`);
      }
      
      previousLevel = currentLevel;
    }

    // Check for proper form labels
    const inputs = await page.locator('input, select, textarea').all();
    for (const input of inputs) {
      const id = await input.getAttribute('id');
      const ariaLabel = await input.getAttribute('aria-label');
      const ariaLabelledby = await input.getAttribute('aria-labelledby');
      
      let hasLabel = false;
      
      if (id) {
        const label = await page.locator(`label[for="${id}"]`).count();
        hasLabel = label > 0;
      }
      
      if (!hasLabel && !ariaLabel && !ariaLabelledby) {
        const type = await input.getAttribute('type');
        issues.push(`Form input (type: ${type}) missing label or ARIA label`);
      }
    }

  } catch (error) {
    issues.push(`ARIA labels and roles test failed: ${error}`);
  }

  return {
    passed: issues.length === 0,
    issues
  };
}

/**
 * Test focus management
 */
export async function testFocusManagement(page: Page): Promise<{
  passed: boolean;
  issues: string[];
}> {
  const issues: string[] = [];

  try {
    // Check for visible focus indicators
    const focusableElements = await page.locator('button, a, input, select, textarea').all();
    
    for (const element of focusableElements.slice(0, 5)) { // Test first 5 to avoid timeout
      await element.focus();
      
      // Check if focus outline is visible
      const outlineStyle = await element.evaluate(el => {
        const computed = window.getComputedStyle(el);
        return {
          outline: computed.outline,
          outlineWidth: computed.outlineWidth,
          outlineStyle: computed.outlineStyle,
          outlineColor: computed.outlineColor,
          boxShadow: computed.boxShadow
        };
      });

      const hasVisibleFocus = 
        outlineStyle.outline !== 'none' ||
        outlineStyle.outlineWidth !== '0px' ||
        outlineStyle.boxShadow.includes('rgb') ||
        outlineStyle.boxShadow.includes('rgba');

      if (!hasVisibleFocus) {
        const tagName = await element.evaluate(el => el.tagName.toLowerCase());
        issues.push(`Element ${tagName} lacks visible focus indicator`);
      }
    }

    // Check focus trap in modals
    const modals = await page.locator('[role="dialog"], .modal').all();
    for (const modal of modals) {
      if (await modal.isVisible()) {
        // Tab should stay within modal
        await page.keyboard.press('Tab');
        const focusedElement = await page.locator(':focus').first();
        const isInsideModal = await modal.locator(':focus').count() > 0;
        
        if (!isInsideModal) {
          issues.push('Focus escapes modal dialog');
        }
      }
    }

  } catch (error) {
    issues.push(`Focus management test failed: ${error}`);
  }

  return {
    passed: issues.length === 0,
    issues
  };
}

/**
 * Run comprehensive accessibility test suite
 */
export async function runAccessibilityTestSuite(
  page: Page,
  config: AccessibilityTestConfig = defaultA11yConfig
): Promise<{
  overall: AccessibilityReport;
  keyboard: { passed: boolean; issues: string[] };
  colorContrast: { passed: boolean; issues: string[] };
  ariaLabels: { passed: boolean; issues: string[] };
  focusManagement: { passed: boolean; issues: string[] };
  allPassed: boolean;
}> {
  console.log(`♿ Running accessibility tests for ${page.url()}`);

  // Run all tests in parallel where possible
  const [overall, keyboard, colorContrast, ariaLabels, focusManagement] = await Promise.all([
    auditPageAccessibility(page, config),
    testKeyboardNavigation(page),
    testColorContrast(page),
    testAriaLabelsAndRoles(page),
    testFocusManagement(page)
  ]);

  const allPassed = 
    overall.passed &&
    keyboard.passed &&
    colorContrast.passed &&
    ariaLabels.passed &&
    focusManagement.passed;

  return {
    overall,
    keyboard,
    colorContrast,
    ariaLabels,
    focusManagement,
    allPassed
  };
}

/**
 * Generate accessibility report
 */
export function generateAccessibilityReport(results: Array<{
  url: string;
  overall: AccessibilityReport;
  keyboard: { passed: boolean; issues: string[] };
  colorContrast: { passed: boolean; issues: string[] };
  ariaLabels: { passed: boolean; issues: string[] };
  focusManagement: { passed: boolean; issues: string[] };
  allPassed: boolean;
}>): string {
  let report = '# Accessibility Test Report\n\n';
  
  report += `Generated: ${new Date().toISOString()}\n`;
  report += `WCAG Level: ${results[0]?.overall.wcagLevel || 'AA'}\n\n`;

  // Summary
  const totalPages = results.length;
  const passedPages = results.filter(r => r.allPassed).length;
  const overallScore = results.reduce((sum, r) => sum + r.overall.score, 0) / totalPages;

  report += `## Summary\n\n`;
  report += `- **Total Pages Tested:** ${totalPages}\n`;
  report += `- **Pages Passed:** ${passedPages} (${((passedPages/totalPages)*100).toFixed(1)}%)\n`;
  report += `- **Overall Score:** ${overallScore.toFixed(1)}/100\n`;
  report += `- **Status:** ${passedPages === totalPages ? '✅ PASSED' : '❌ FAILED'}\n\n`;

  // Detailed results
  for (const result of results) {
    report += `## ${result.url}\n\n`;
    report += `**Status:** ${result.allPassed ? '✅ PASSED' : '❌ FAILED'}\n`;
    report += `**Score:** ${result.overall.score}/100\n\n`;

    // Axe violations
    if (result.overall.violations.length > 0) {
      report += `### Axe Violations (${result.overall.totalViolations})\n\n`;
      
      for (const violation of result.overall.violations) {
        report += `#### ${violation.impact.toUpperCase()}: ${violation.id}\n`;
        report += `${violation.description}\n`;
        report += `**Help:** ${violation.help}\n`;
        report += `**More Info:** ${violation.helpUrl}\n`;
        report += `**Elements:** ${violation.elements.length}\n\n`;
      }
    }

    // Manual test results
    const manualTests = [
      { name: 'Keyboard Navigation', result: result.keyboard },
      { name: 'Color Contrast', result: result.colorContrast },
      { name: 'ARIA Labels', result: result.ariaLabels },
      { name: 'Focus Management', result: result.focusManagement }
    ];

    for (const test of manualTests) {
      if (!test.result.passed && test.result.issues.length > 0) {
        report += `### ${test.name} Issues\n\n`;
        for (const issue of test.result.issues) {
          report += `- ${issue}\n`;
        }
        report += '\n';
      }
    }
  }

  // Recommendations
  report += `## Recommendations\n\n`;
  
  if (passedPages === totalPages) {
    report += `🎉 All pages passed accessibility tests! Great job on maintaining WCAG ${results[0]?.overall.wcagLevel} compliance.\n\n`;
  } else {
    report += `To improve accessibility compliance:\n\n`;
    report += `1. **Fix Critical Violations:** Address all critical and serious axe violations first\n`;
    report += `2. **Improve Keyboard Navigation:** Ensure all interactive elements are keyboard accessible\n`;
    report += `3. **Check Color Contrast:** Verify text meets WCAG contrast requirements\n`;
    report += `4. **Add ARIA Labels:** Provide proper labels for form inputs and images\n`;
    report += `5. **Enhance Focus Management:** Ensure visible focus indicators and proper focus flow\n\n`;
  }

  return report;
}

/**
 * Playwright test helper for accessibility
 */
export async function expectAccessible(page: Page, config?: AccessibilityTestConfig): Promise<void> {
  const axeBuilder = new AxeBuilder({ page });
  
  if (config?.tags) {
    axeBuilder.withTags(config.tags);
  }
  
  if (config?.exclude) {
    axeBuilder.exclude(config.exclude);
  }

  const results = await axeBuilder.analyze();
  
  if (results.violations.length > 0) {
    const violationMessages = results.violations.map(v => 
      `${v.id}: ${v.description} (${v.nodes.length} elements)`
    ).join('\n');
    
    throw new Error(`Accessibility violations found:\n${violationMessages}`);
  }
}

/**
 * CLI function to run accessibility tests
 */
export async function runAccessibilityTests(urls: string[]): Promise<void> {
  console.log('♿ Starting accessibility testing...\n');

  const { chromium } = require('playwright');
  const browser = await chromium.launch();
  const page = await browser.newPage();

  const results = [];

  try {
    for (const url of urls) {
      console.log(`Testing: ${url}`);
      await page.goto(url);
      
      const result = await runAccessibilityTestSuite(page);
      results.push({ url, ...result });
    }

    const report = generateAccessibilityReport(results);
    console.log(report);

    // Save report
    const fs = require('fs/promises');
    await fs.writeFile('accessibility-report.md', report);
    console.log('♿ Accessibility report saved to accessibility-report.md');

    const allPassed = results.every(r => r.allPassed);
    
    if (!allPassed) {
      console.error('❌ Some accessibility tests failed');
      process.exit(1);
    }

    console.log('✅ All accessibility tests passed!');
  } finally {
    await browser.close();
  }
}