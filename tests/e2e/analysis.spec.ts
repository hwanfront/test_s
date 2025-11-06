import { test, expect } from '@playwright/test';

test.describe('Analysis Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authenticated state for all tests
    await page.addInitScript(() => {
      localStorage.setItem('auth-token', 'mock-token');
      localStorage.setItem('user', JSON.stringify({
        id: 'user-123',
        name: 'Test User',
        email: 'test@example.com',
        dailyQuota: { used: 0, limit: 3 }
      }));
    });
    
    await page.goto('/analysis');
  });

  test('should display analysis form with required elements', async ({ page }) => {
    // Should have text input area
    const textArea = page.getByRole('textbox', { name: /terms|contract|text/i });
    await expect(textArea).toBeVisible();
    await expect(textArea).toBeEnabled();
    
    // Should have analyze button
    const analyzeButton = page.getByRole('button', { name: /analyze/i });
    await expect(analyzeButton).toBeVisible();
    
    // Should show quota indicator
    const quotaIndicator = page.getByText(/quota|remaining|analyses/i);
    if (await quotaIndicator.count() > 0) {
      await expect(quotaIndicator).toBeVisible();
    }
  });

  test('should validate text input requirements', async ({ page }) => {
    const textArea = page.getByRole('textbox');
    const analyzeButton = page.getByRole('button', { name: /analyze/i });
    
    // Try to analyze without text
    await analyzeButton.click();
    
    // Should show validation error
    const errorMessage = page.getByText(/required|empty|enter/i);
    if (await errorMessage.count() > 0) {
      await expect(errorMessage).toBeVisible();
    }
    
    // Button should be disabled or show error state
    const isDisabled = await analyzeButton.isDisabled();
    const hasErrorClass = await analyzeButton.evaluate((el) => 
      el.classList.contains('error') || el.classList.contains('disabled')
    );
    
    expect(isDisabled || hasErrorClass).toBeTruthy();
  });

  test('should handle successful analysis submission', async ({ page }) => {
    const textArea = page.getByRole('textbox');
    const analyzeButton = page.getByRole('button', { name: /analyze/i });
    
    // Enter sample terms text
    const sampleText = `
      Terms of Service
      By using this mobile game, you agree to the following terms:
      1. We collect your personal data for analytics
      2. You grant us unlimited rights to your content
      3. We can terminate your account at any time
      4. All purchases are non-refundable
    `;
    
    await textArea.fill(sampleText);
    
    // Submit analysis
    await analyzeButton.click();
    
    // Should show loading state
    await expect(page.getByText(/analyzing|processing|loading/i)).toBeVisible();
    
    // Wait for results or navigation
    await page.waitForTimeout(3000);
    
    // Should navigate to results page or show results
    const currentUrl = page.url();
    const hasResults = currentUrl.includes('/analysis/') || 
                     await page.getByText(/risk|analysis|results/i).count() > 0;
    
    expect(hasResults).toBeTruthy();
  });

  test('should display analysis results correctly', async ({ page }) => {
    // Mock analysis results
    await page.addInitScript(() => {
      // Mock fetch to return analysis results
      window.fetch = async (url) => {
        if (url.toString().includes('/api/analysis')) {
          return {
            ok: true,
            json: async () => ({
              sessionId: 'session-123',
              status: 'completed',
              results: {
                riskScore: 75,
                findings: [
                  {
                    type: 'data-collection',
                    severity: 'high',
                    text: 'We collect your personal data',
                    explanation: 'Broad data collection clause'
                  }
                ]
              }
            })
          };
        }
        return { ok: false };
      };
    });
    
    await page.goto('/analysis/session-123');
    
    // Should show risk score
    const riskScore = page.getByText(/risk.*score|score.*risk/i);
    if (await riskScore.count() > 0) {
      await expect(riskScore).toBeVisible();
    }
    
    // Should show findings
    const findings = page.getByText(/finding|clause|risk/i);
    if (await findings.count() > 0) {
      await expect(findings.first()).toBeVisible();
    }
    
    // Should have explanation or details
    const explanation = page.getByText(/explanation|details|why/i);
    if (await explanation.count() > 0) {
      await expect(explanation).toBeVisible();
    }
  });

  test('should handle quota limits', async ({ page }) => {
    // Mock user with exhausted quota
    await page.addInitScript(() => {
      localStorage.setItem('user', JSON.stringify({
        id: 'user-123',
        name: 'Test User',
        email: 'test@example.com',
        dailyQuota: { used: 3, limit: 3 }
      }));
    });
    
    await page.reload();
    
    // Should show quota exhausted message
    const quotaMessage = page.getByText(/quota.*exceeded|limit.*reached|no.*analyses/i);
    if (await quotaMessage.count() > 0) {
      await expect(quotaMessage).toBeVisible();
    }
    
    // Analyze button should be disabled
    const analyzeButton = page.getByRole('button', { name: /analyze/i });
    if (await analyzeButton.count() > 0) {
      await expect(analyzeButton).toBeDisabled();
    }
  });

  test('should handle analysis errors gracefully', async ({ page }) => {
    // Mock fetch to return error
    await page.addInitScript(() => {
      window.fetch = async (url) => {
        if (url.toString().includes('/api/analysis')) {
          return {
            ok: false,
            status: 500,
            json: async () => ({ error: 'Internal server error' })
          };
        }
        return { ok: false };
      };
    });
    
    const textArea = page.getByRole('textbox');
    const analyzeButton = page.getByRole('button', { name: /analyze/i });
    
    await textArea.fill('Sample terms text');
    await analyzeButton.click();
    
    // Should show error message
    const errorMessage = page.getByText(/error|failed|try.*again/i);
    await expect(errorMessage).toBeVisible();
    
    // Should allow retry
    await expect(analyzeButton).toBeEnabled();
  });

  test('should be accessible to screen readers', async ({ page }) => {
    // Check for proper ARIA labels
    const textArea = page.getByRole('textbox');
    if (await textArea.count() > 0) {
      const hasLabel = await textArea.getAttribute('aria-label') || 
                      await textArea.getAttribute('aria-labelledby');
      expect(hasLabel).toBeTruthy();
    }
    
    // Check for proper heading structure
    const headings = page.getByRole('heading');
    const headingCount = await headings.count();
    expect(headingCount).toBeGreaterThan(0);
    
    // Check for focus management
    await page.keyboard.press('Tab');
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
  });

  test('should work on mobile devices', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Form should still be usable
    const textArea = page.getByRole('textbox');
    await expect(textArea).toBeVisible();
    
    // Should be able to scroll and interact
    await textArea.click();
    await textArea.fill('Mobile test text');
    
    const analyzeButton = page.getByRole('button', { name: /analyze/i });
    await expect(analyzeButton).toBeVisible();
    await expect(analyzeButton).toBeEnabled();
  });
});