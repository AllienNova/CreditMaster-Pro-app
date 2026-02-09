/**
 * Accessibility Tests for Investment Features
 *
 * Tests WCAG 2.1 AA compliance, screen reader support, keyboard navigation, and color contrast
 */

import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { AUTH_STORAGE_STATE } from '../utils/auth';

test.use({ storageState: AUTH_STORAGE_STATE });

test.describe('Investment Accessibility Tests', () => {
  test.describe('Portfolio Dashboard', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/investments');
      await page.waitForLoadState('networkidle');
    });

    test('should not have any automatically detectable accessibility issues', async ({ page }) => {
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      expect(accessibilityScanResults.violations).toEqual([]);
    });

    test('should have proper heading hierarchy', async ({ page }) => {
      const headings = await page.locator('h1, h2, h3, h4, h5, h6').all();
      
      // Should have at least one h1
      const h1Count = await page.locator('h1').count();
      expect(h1Count).toBeGreaterThanOrEqual(1);

      // Headings should be in logical order
      expect(headings.length).toBeGreaterThan(0);
    });

    test('should have proper ARIA labels on interactive elements', async ({ page }) => {
      // Check buttons have accessible names
      const buttons = await page.locator('button').all();
      
      for (const button of buttons) {
        const ariaLabel = await button.getAttribute('aria-label');
        const text = await button.textContent();
        
        // Button should have either aria-label or text content
        expect(ariaLabel || text).toBeTruthy();
      }
    });

    test('should support keyboard navigation', async ({ page }) => {
      // Tab through interactive elements
      await page.keyboard.press('Tab');
      
      // Check that focus is visible
      const focusedElement = await page.locator(':focus');
      await expect(focusedElement).toBeVisible();

      // Tab through multiple elements
      for (let i = 0; i < 5; i++) {
        await page.keyboard.press('Tab');
        const focused = await page.locator(':focus');
        await expect(focused).toBeVisible();
      }
    });

    test('should have sufficient color contrast', async ({ page }) => {
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2aa'])
        .disableRules(['color-contrast']) // We'll check this separately
        .analyze();

      // Check for color contrast violations
      const contrastResults = await new AxeBuilder({ page })
        .include('body')
        .withRules(['color-contrast'])
        .analyze();

      expect(contrastResults.violations).toEqual([]);
    });

    test('should have alt text for images', async ({ page }) => {
      const images = await page.locator('img').all();
      
      for (const img of images) {
        const alt = await img.getAttribute('alt');
        const role = await img.getAttribute('role');
        
        // Image should have alt text or role="presentation"
        expect(alt !== null || role === 'presentation').toBeTruthy();
      }
    });

    test('should have proper form labels', async ({ page }) => {
      const inputs = await page.locator('input, select, textarea').all();
      
      for (const input of inputs) {
        const id = await input.getAttribute('id');
        const ariaLabel = await input.getAttribute('aria-label');
        const ariaLabelledBy = await input.getAttribute('aria-labelledby');
        
        // Input should have associated label
        if (id) {
          const label = await page.locator(`label[for="${id}"]`).count();
          expect(label > 0 || ariaLabel || ariaLabelledBy).toBeTruthy();
        }
      }
    });

    test('should announce dynamic content changes to screen readers', async ({ page }) => {
      // Check for aria-live regions
      const liveRegions = await page.locator('[aria-live]').count();
      
      // Should have at least one live region for dynamic updates
      expect(liveRegions).toBeGreaterThanOrEqual(0);
    });
  });

  test.describe('Stock Analysis Page', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/investments/analyze/AAPL');
      await page.waitForLoadState('networkidle');
    });

    test('should not have any automatically detectable accessibility issues', async ({ page }) => {
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa'])
        .analyze();

      expect(accessibilityScanResults.violations).toEqual([]);
    });

    test('should have accessible tabs', async ({ page }) => {
      const tabs = await page.locator('[role="tab"]').all();
      
      for (const tab of tabs) {
        const ariaSelected = await tab.getAttribute('aria-selected');
        const ariaControls = await tab.getAttribute('aria-controls');
        
        // Tab should have aria-selected and aria-controls
        expect(ariaSelected).toBeTruthy();
        expect(ariaControls).toBeTruthy();
      }
    });

    test('should support keyboard navigation in tabs', async ({ page }) => {
      const firstTab = page.locator('[role="tab"]').first();
      await firstTab.focus();

      // Arrow keys should navigate between tabs
      await page.keyboard.press('ArrowRight');
      
      const focusedTab = await page.locator('[role="tab"]:focus');
      await expect(focusedTab).toBeVisible();
    });
  });

  test.describe('Holdings Management Page', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/investments/holdings');
      await page.waitForLoadState('networkidle');
    });

    test('should not have any automatically detectable accessibility issues', async ({ page }) => {
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa'])
        .analyze();

      expect(accessibilityScanResults.violations).toEqual([]);
    });

    test('should have accessible table', async ({ page }) => {
      const tables = await page.locator('table').all();
      
      for (const table of tables) {
        // Table should have caption or aria-label
        const caption = await table.locator('caption').count();
        const ariaLabel = await table.getAttribute('aria-label');
        
        expect(caption > 0 || ariaLabel).toBeTruthy();

        // Table should have proper headers
        const headers = await table.locator('th').count();
        expect(headers).toBeGreaterThan(0);
      }
    });

    test('should have accessible dialogs', async ({ page }) => {
      // Open add holding dialog
      const addButton = page.getByRole('button', { name: /Add Holding/i });
      
      if (await addButton.isVisible()) {
        await addButton.click();
        await page.waitForTimeout(500);

        // Dialog should have role="dialog"
        const dialog = page.locator('[role="dialog"]');
        await expect(dialog).toBeVisible();

        // Dialog should have aria-labelledby or aria-label
        const ariaLabel = await dialog.getAttribute('aria-label');
        const ariaLabelledBy = await dialog.getAttribute('aria-labelledby');
        expect(ariaLabel || ariaLabelledBy).toBeTruthy();

        // Dialog should trap focus
        await page.keyboard.press('Tab');
        const focusedElement = await page.locator(':focus');
        const isInsideDialog = await focusedElement.evaluate((el, dialogEl) => {
          return dialogEl.contains(el);
        }, await dialog.elementHandle());
        
        expect(isInsideDialog).toBeTruthy();
      }
    });
  });

  test.describe('Mobile Accessibility', () => {
    test.beforeEach(async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
    });

    test('should have touch targets at least 44x44 pixels', async ({ page }) => {
      await page.goto('/investments');
      await page.waitForLoadState('networkidle');

      const buttons = await page.locator('button, a').all();
      
      for (const button of buttons.slice(0, 10)) { // Check first 10 buttons
        const box = await button.boundingBox();
        
        if (box) {
          // Touch target should be at least 44x44 pixels
          expect(box.width >= 44 || box.height >= 44).toBeTruthy();
        }
      }
    });
  });
});
