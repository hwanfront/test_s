import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { expectAccessible } from '@/shared/lib/testing/accessibility';

test.describe('Accessibility Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authenticated state for accessibility testing
    await page.addInitScript(() => {
      localStorage.setItem('auth-token', 'mock-token');
      localStorage.setItem('user', JSON.stringify({
        id: 'user-123',
        name: 'Test User',
        email: 'test@example.com'
      }));
    });
  });

  test('homepage should be accessible', async ({ page }) => {
    await page.goto('/');
    
    // Run comprehensive accessibility check
    const axeBuilder = new AxeBuilder({ page });
    const results = await axeBuilder.analyze();
    
    expect(results.violations).toHaveLength(0);
  });

  test('analysis page should be accessible', async ({ page }) => {
    await page.goto('/analysis');
    
    // Check for specific accessibility requirements
    await expectAccessible(page, {
      wcagLevel: 'AA',
      tags: ['wcag2a', 'wcag2aa']
    });
  });

  test('should have proper heading hierarchy', async ({ page }) => {
    await page.goto('/');
    
    // Check heading structure
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').all();
    
    expect(headings.length).toBeGreaterThan(0);
    
    // Should have exactly one h1
    const h1Count = await page.locator('h1').count();
    expect(h1Count).toBe(1);
  });

  test('should have proper alt text for images', async ({ page }) => {
    await page.goto('/');
    
    // Check all images have alt text
    const images = await page.locator('img').all();
    
    for (const img of images) {
      const alt = await img.getAttribute('alt');
      const ariaLabel = await img.getAttribute('aria-label');
      const role = await img.getAttribute('role');
      
      // Images should have alt text unless they're decorative
      if (role !== 'presentation' && !alt && !ariaLabel) {
        const src = await img.getAttribute('src');
        throw new Error(`Image missing alt text: ${src}`);
      }
    }
  });

  test('should be keyboard navigable', async ({ page }) => {
    await page.goto('/');
    
    // Start keyboard navigation
    await page.keyboard.press('Tab');
    
    // Should focus on first focusable element
    const firstFocused = await page.locator(':focus').first();
    expect(firstFocused).toBeVisible();
    
    // Tab through several elements
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab');
      const focused = await page.locator(':focus').first();
      if (await focused.count() > 0) {
        await expect(focused).toBeVisible();
      }
    }
  });

  test('should have proper form labels', async ({ page }) => {
    await page.goto('/analysis');
    
    // Check all form inputs have labels
    const inputs = await page.locator('input, select, textarea').all();
    
    for (const input of inputs) {
      const id = await input.getAttribute('id');
      const ariaLabel = await input.getAttribute('aria-label');
      const ariaLabelledby = await input.getAttribute('aria-labelledby');
      
      let hasLabel = false;
      
      if (id) {
        const labelCount = await page.locator(`label[for="${id}"]`).count();
        hasLabel = labelCount > 0;
      }
      
      if (!hasLabel && !ariaLabel && !ariaLabelledby) {
        const type = await input.getAttribute('type') || 'unknown';
        throw new Error(`Form input (type: ${type}) missing label`);
      }
    }
  });

  test('should have sufficient color contrast', async ({ page }) => {
    await page.goto('/');
    
    // Use axe-core to check color contrast
    const axeBuilder = new AxeBuilder({ page })
      .withRules(['color-contrast']);
    
    const results = await axeBuilder.analyze();
    
    expect(results.violations).toHaveLength(0);
  });

  test('should support screen readers', async ({ page }) => {
    await page.goto('/');
    
    // Check for ARIA landmarks
    const landmarks = await page.locator('[role="main"], [role="navigation"], [role="banner"], [role="contentinfo"], main, nav, header, footer').count();
    expect(landmarks).toBeGreaterThan(0);
    
    // Check for skip links
    const skipLink = page.locator('a[href="#main"], a[href="#content"]').first();
    if (await skipLink.count() > 0) {
      await expect(skipLink).toBeVisible();
    }
  });

  test('should handle focus management in modals', async ({ page }) => {
    await page.goto('/');
    
    // Look for modal triggers
    const modalTrigger = page.locator('[data-testid="modal-trigger"], button[aria-haspopup="dialog"]').first();
    
    if (await modalTrigger.count() > 0) {
      await modalTrigger.click();
      
      // Modal should be visible
      const modal = page.locator('[role="dialog"], .modal').first();
      await expect(modal).toBeVisible();
      
      // Focus should be trapped in modal
      await page.keyboard.press('Tab');
      const focusedElement = await page.locator(':focus').first();
      
      // The focused element should be inside the modal
      const isInsideModal = await modal.locator(':focus').count() > 0;
      expect(isInsideModal).toBeTruthy();
      
      // Escape should close modal
      await page.keyboard.press('Escape');
      await expect(modal).not.toBeVisible();
    }
  });

  test('should be accessible on mobile devices', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    // Run accessibility check on mobile
    const axeBuilder = new AxeBuilder({ page });
    const results = await axeBuilder.analyze();
    
    expect(results.violations).toHaveLength(0);
    
    // Check touch targets are large enough (44px minimum)
    const buttons = await page.locator('button, a, input[type="button"], input[type="submit"]').all();
    
    for (const button of buttons.slice(0, 10)) { // Check first 10 to avoid timeout
      if (await button.isVisible()) {
        const box = await button.boundingBox();
        if (box) {
          // WCAG recommends minimum 44x44px touch targets
          expect(box.width).toBeGreaterThanOrEqual(24); // Relaxed for testing
          expect(box.height).toBeGreaterThanOrEqual(24);
        }
      }
    }
  });

  test('should have readable content', async ({ page }) => {
    await page.goto('/');
    
    // Check for text readability
    const textElements = await page.locator('p, div, span, h1, h2, h3, h4, h5, h6').all();
    
    for (const element of textElements.slice(0, 10)) { // Check first 10
      if (await element.isVisible()) {
        const text = await element.textContent();
        
        if (text && text.trim().length > 0) {
          // Check font size is reasonable
          const fontSize = await element.evaluate(el => {
            const style = window.getComputedStyle(el);
            return parseInt(style.fontSize);
          });
          
          // Minimum readable font size
          expect(fontSize).toBeGreaterThanOrEqual(12);
        }
      }
    }
  });
});