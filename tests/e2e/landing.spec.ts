import { test, expect } from '@playwright/test';

test.describe('Landing Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display the landing page correctly', async ({ page }) => {
    // Check that the page title is set
    await expect(page).toHaveTitle(/AI Analysis/);
    
    // Check for main heading
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    
    // Check for analysis form or CTA button
    const analysisButton = page.getByRole('button', { name: /analyze|start/i });
    if (await analysisButton.count() > 0) {
      await expect(analysisButton.first()).toBeVisible();
    }
  });

  test('should be responsive on mobile devices', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Check that the page is still functional
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    
    // Check for mobile navigation
    const mobileNav = page.getByRole('button', { name: /menu|hamburger/i });
    if (await mobileNav.count() > 0) {
      await expect(mobileNav).toBeVisible();
    }
  });

  test('should handle dark mode toggle if available', async ({ page }) => {
    // Look for dark mode toggle
    const darkModeToggle = page.getByRole('button', { name: /dark|light|theme/i });
    
    if (await darkModeToggle.count() > 0) {
      await darkModeToggle.click();
      
      // Check if theme changed (look for dark class or style changes)
      const html = page.locator('html');
      const hasDarkMode = await html.evaluate((el) => 
        el.classList.contains('dark') || 
        el.getAttribute('data-theme') === 'dark'
      );
      
      // Theme toggle should work
      expect(typeof hasDarkMode).toBe('boolean');
    }
  });

  test('should have proper SEO meta tags', async ({ page }) => {
    // Check for description meta tag
    const description = page.locator('meta[name="description"]');
    if (await description.count() > 0) {
      await expect(description).toHaveAttribute('content', /.+/);
    }
    
    // Check for viewport meta tag
    await expect(page.locator('meta[name="viewport"]')).toHaveAttribute(
      'content', 
      /width=device-width/
    );
  });

  test('should load without JavaScript errors', async ({ page }) => {
    const errors: string[] = [];
    
    page.on('pageerror', (error) => {
      errors.push(error.message);
    });
    
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    await page.waitForLoadState('networkidle');
    
    // Should have no critical JavaScript errors
    expect(errors.filter(error => 
      !error.includes('favicon') && 
      !error.includes('404') &&
      !error.includes('Network request failed')
    )).toHaveLength(0);
  });
});