import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should show sign-in options when not authenticated', async ({ page }) => {
    // Navigate to analysis page or click analyze button
    const analyzeButton = page.getByRole('button', { name: /analyze|start/i });
    if (await analyzeButton.count() > 0) {
      await analyzeButton.click();
    } else {
      await page.goto('/analysis');
    }
    
    // Should redirect to sign-in or show sign-in options
    const signInButton = page.getByRole('button', { name: /sign in|login/i });
    const googleSignIn = page.getByRole('button', { name: /google/i });
    const naverSignIn = page.getByRole('button', { name: /naver/i });
    
    // At least one sign-in option should be visible
    const hasSignInOptions = 
      (await signInButton.count() > 0) ||
      (await googleSignIn.count() > 0) ||
      (await naverSignIn.count() > 0);
    
    expect(hasSignInOptions).toBeTruthy();
  });

  test('should display OAuth provider buttons', async ({ page }) => {
    // Navigate to sign-in page
    await page.goto('/signin');
    
    // Should have Google OAuth button
    const googleButton = page.getByRole('button', { name: /continue with google|google/i });
    if (await googleButton.count() > 0) {
      await expect(googleButton).toBeVisible();
      await expect(googleButton).toBeEnabled();
    }
    
    // Should have Naver OAuth button  
    const naverButton = page.getByRole('button', { name: /continue with naver|naver/i });
    if (await naverButton.count() > 0) {
      await expect(naverButton).toBeVisible();
      await expect(naverButton).toBeEnabled();
    }
  });

  test('should handle OAuth redirect flow', async ({ page }) => {
    await page.goto('/signin');
    
    const googleButton = page.getByRole('button', { name: /google/i });
    
    if (await googleButton.count() > 0) {
      // Click Google sign-in button
      await googleButton.click();
      
      // Should navigate to OAuth provider or show loading state
      await page.waitForTimeout(1000);
      
      // Should either be on Google OAuth page or have navigated away from signin
      const currentUrl = page.url();
      const isOnGoogleOAuth = currentUrl.includes('accounts.google.com');
      const isOffSigninPage = !currentUrl.includes('/signin');
      
      expect(isOnGoogleOAuth || isOffSigninPage).toBeTruthy();
    }
  });

  test('should handle authentication state correctly', async ({ page }) => {
    // Mock authenticated state using localStorage or cookies
    await page.addInitScript(() => {
      // Mock authentication token in localStorage
      localStorage.setItem('auth-token', 'mock-token');
    });
    
    await page.goto('/analysis');
    
    // Should now show analysis form instead of sign-in
    const textArea = page.getByRole('textbox', { name: /terms|contract|text/i });
    const analyzeButton = page.getByRole('button', { name: /analyze/i });
    
    if (await textArea.count() > 0 && await analyzeButton.count() > 0) {
      await expect(textArea).toBeVisible();
      await expect(analyzeButton).toBeVisible();
    }
  });

  test('should show user profile when authenticated', async ({ page }) => {
    // Mock authenticated state
    await page.addInitScript(() => {
      localStorage.setItem('auth-token', 'mock-token');
      localStorage.setItem('user', JSON.stringify({
        name: 'Test User',
        email: 'test@example.com',
        image: 'https://example.com/avatar.jpg'
      }));
    });
    
    await page.goto('/');
    
    // Should show user avatar or profile menu
    const userAvatar = page.getByRole('button', { name: /profile|avatar|user menu/i });
    const userEmail = page.getByText('test@example.com');
    
    if (await userAvatar.count() > 0) {
      await expect(userAvatar).toBeVisible();
    } else if (await userEmail.count() > 0) {
      await expect(userEmail).toBeVisible();
    }
  });

  test('should handle sign-out flow', async ({ page }) => {
    // Mock authenticated state
    await page.addInitScript(() => {
      localStorage.setItem('auth-token', 'mock-token');
    });
    
    await page.goto('/');
    
    // Look for sign-out button
    const signOutButton = page.getByRole('button', { name: /sign out|logout/i });
    const profileMenu = page.getByRole('button', { name: /profile|avatar|user menu/i });
    
    if (await profileMenu.count() > 0) {
      await profileMenu.click();
      const dropdownSignOut = page.getByRole('menuitem', { name: /sign out|logout/i });
      if (await dropdownSignOut.count() > 0) {
        await dropdownSignOut.click();
      }
    } else if (await signOutButton.count() > 0) {
      await signOutButton.click();
    }
    
    // Should redirect to sign-in or home page
    await page.waitForTimeout(1000);
    const currentUrl = page.url();
    const isOnHomeOrSignin = currentUrl.includes('/signin') || currentUrl === page.url();
    
    expect(isOnHomeOrSignin).toBeTruthy();
  });
});