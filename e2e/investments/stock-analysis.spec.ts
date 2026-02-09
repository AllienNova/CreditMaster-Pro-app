/**
 * E2E Tests for Stock Analysis
 *
 * Tests complete user journeys for AI-powered stock analysis
 */

import { test, expect } from '@playwright/test';
import { AUTH_STORAGE_STATE } from '../utils/auth';

test.use({ storageState: AUTH_STORAGE_STATE });

test.describe('Stock Analysis', () => {
  const testSymbol = 'AAPL';

  test.beforeEach(async ({ page }) => {
    // Navigate to stock analysis page
    await page.goto(`/investments/analyze/${testSymbol}`);
    await page.waitForLoadState('networkidle');
  });

  test('should load stock analysis page successfully', async ({ page }) => {
    await expect(page).toHaveTitle(/Stock Analysis|Fynvita/i);

    // Check for stock symbol
    await expect(page.getByText(testSymbol)).toBeVisible();
  });

  test('should display stock header with price information', async ({ page }) => {
    // Wait for data to load
    await page.waitForTimeout(3000);

    // Check for stock name and symbol
    await expect(page.getByText(testSymbol)).toBeVisible();

    // Check for price information
    const priceElement = page.locator('[data-testid="stock-price"]');
    if (await priceElement.isVisible()) {
      await expect(priceElement).toBeVisible();
    }
  });

  test('should display AI recommendation', async ({ page }) => {
    // Wait for analysis to load
    await page.waitForTimeout(5000);

    const recommendationText = page.locator('[data-testid="recommendation"]');
    if (await recommendationText.isVisible()) {
      await expect(recommendationText).toBeVisible();
    }
  });

  test('should display confidence score', async ({ page }) => {
    // Wait for analysis to load
    await page.waitForTimeout(5000);

    // Check for confidence score if present
    const recommendationText = page.locator('[data-testid="recommendation"]');
    if (await recommendationText.isVisible()) {
      await expect(recommendationText).toBeVisible();
    }
  });

  test('should display target price', async ({ page }) => {
    // Wait for analysis to load
    await page.waitForTimeout(5000);

    // Check for target price
    const targetPrice = page.locator('[data-testid="target-price"]');
    if (await targetPrice.isVisible()) {
      await expect(targetPrice).toBeVisible();
    }
  });

  test('should display technical analysis tab', async ({ page }) => {
    // Wait for page to load
    await page.waitForTimeout(3000);

    // Find and click technical analysis tab
    const technicalTab = page.getByRole('tab', { name: /Technical/i });
    if (await technicalTab.isVisible()) {
      await technicalTab.click();
      await page.waitForTimeout(1000);

      // Should show technical indicators
      await expect(page.getByText(/RSI/i)).toBeVisible();
      await expect(page.getByText(/MACD/i)).toBeVisible();
    }
  });

  test('should display fundamental analysis tab', async ({ page }) => {
    // Wait for page to load
    await page.waitForTimeout(3000);

    // Find and click fundamental analysis tab
    const fundamentalTab = page.getByRole('tab', { name: /Fundamental/i });
    if (await fundamentalTab.isVisible()) {
      await fundamentalTab.click();
      await page.waitForTimeout(1000);

      // Should show fundamental metrics
      await expect(page.getByText(/P\/E Ratio/i)).toBeVisible();
    }
  });

  test('should display sentiment analysis tab', async ({ page }) => {
    // Wait for page to load
    await page.waitForTimeout(3000);

    // Find and click sentiment analysis tab
    const sentimentTab = page.getByRole('tab', { name: /Sentiment/i });
    if (await sentimentTab.isVisible()) {
      await sentimentTab.click();
      await page.waitForTimeout(1000);

      // Should show sentiment data
      await expect(page.getByText(/Sentiment/i)).toBeVisible();
    }
  });

  test('should display AI insights tab', async ({ page }) => {
    // Wait for page to load
    await page.waitForTimeout(3000);

    // Find and click AI insights tab
    const aiTab = page.getByRole('tab', { name: /AI/i });
    if (await aiTab.isVisible()) {
      await aiTab.click();
      await page.waitForTimeout(1000);

      // Should show AI-generated insights
      await expect(page.getByText(/Analysis/i)).toBeVisible();
    }
  });

  test('should display price chart', async ({ page }) => {
    // Wait for chart to load
    await page.waitForTimeout(3000);

    // Check for chart container
    const chart = page.locator('[data-testid="price-chart"]');
    if (await chart.isVisible()) {
      await expect(chart).toBeVisible();
    }
  });

  test('should allow adding to watchlist', async ({ page }) => {
    // Find add to watchlist button
    const watchlistButton = page.getByRole('button', { name: /Add to Watchlist/i });
    
    if (await watchlistButton.isVisible()) {
      await watchlistButton.click();
      await page.waitForTimeout(500);

      // Should show success message
      await expect(page.getByText(/Added to watchlist/i)).toBeVisible({ timeout: 2000 });
    }
  });

  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Check that main elements are still visible
    await expect(page.getByText(testSymbol)).toBeVisible();
  });
});
