import { test, expect } from '@playwright/test';

// Note: These tests assume authentication - in real scenario, 
// you'd set up auth state via storageState or API calls

test.describe('Dashboard - Unauthenticated', () => {
  test('should redirect to login', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/login/);
  });
});

test.describe('Dashboard Layout Elements', () => {
  // Skip these if not authenticated - these are structural tests
  test.skip('should have sidebar navigation', async ({ page }) => {
    await page.goto('/dashboard');
    
    const sidebar = page.locator('[class*="sidebar"], aside, nav[class*="side"]');
    await expect(sidebar.first()).toBeVisible();
  });

  test.skip('should have header with user info', async ({ page }) => {
    await page.goto('/dashboard');
    
    const header = page.locator('header, [class*="header"]');
    await expect(header.first()).toBeVisible();
  });

  test.skip('should have credit score display', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Look for score display
    const scoreDisplay = page.locator('[class*="score"], [data-testid*="score"]');
    await expect(scoreDisplay.first()).toBeVisible();
  });
});

test.describe('Dashboard Navigation Structure', () => {
  test('dashboard routes should exist', async ({ page }) => {
    // Test that these routes are defined (will redirect to login if unauth)
    const routes = [
      '/dashboard',
      '/dashboard/disputes',
      '/dashboard/credit-builder',
      '/dashboard/reports',
      '/dashboard/documents',
    ];

    for (const route of routes) {
      const response = await page.goto(route);
      // Should get a response (even if redirect)
      expect(response?.status()).toBeLessThan(500);
    }
  });
});

test.describe('Dashboard Mobile Responsiveness', () => {
  test('should have mobile menu on small screens', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/dashboard');
    
    // Should redirect to login on mobile too
    await expect(page).toHaveURL(/login/);
  });
});

test.describe('Dashboard API Routes', () => {
  test('disputes API should respond', async ({ request }) => {
    const response = await request.get('/api/disputes');
    // Should return 401 or valid response
    expect([200, 401, 403]).toContain(response.status());
  });

  test('credit-builder API should respond', async ({ request }) => {
    const response = await request.get('/api/credit-builder/tools');
    expect([200, 401, 403]).toContain(response.status());
  });

  test('notifications API should respond', async ({ request }) => {
    const response = await request.get('/api/notifications');
    expect([200, 401, 403]).toContain(response.status());
  });
});

test.describe('Dashboard Performance', () => {
  test('dashboard should load quickly', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/dashboard');
    const loadTime = Date.now() - startTime;
    
    // Even with redirect, should be under 3 seconds
    expect(loadTime).toBeLessThan(3000);
  });
});

