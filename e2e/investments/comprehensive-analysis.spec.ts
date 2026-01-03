/**
 * E2E Tests for Comprehensive Investment Analysis
 *
 * Tests the complete user flow for analyzing investments
 */

import { test, expect } from '@playwright/test';

test.describe('Comprehensive Investment Analysis', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the comprehensive analysis page
    await page.goto('/investments/comprehensive-analysis');
  });

  test('should load the analysis page', async ({ page }) => {
    // Check that the page title is correct
    await expect(page).toHaveTitle(/CreditMaster Pro/i);

    // Check that the main heading is visible
    await expect(page.getByRole('heading', { name: /Comprehensive Investment Analysis/i })).toBeVisible();
  });

  test('should have input controls', async ({ page }) => {
    // Check for symbol input
    const symbolInput = page.getByPlaceholder(/Enter symbol/i);
    await expect(symbolInput).toBeVisible();

    // Check for timeframe select
    const timeframeSelect = page.locator('select').first();
    await expect(timeframeSelect).toBeVisible();

    // Check for analyze button
    const analyzeButton = page.getByRole('button', { name: /Analyze/i });
    await expect(analyzeButton).toBeVisible();
  });

  test('should disable analyze button when symbol is empty', async ({ page }) => {
    const symbolInput = page.getByPlaceholder(/Enter symbol/i);
    const analyzeButton = page.getByRole('button', { name: /Analyze/i });

    // Clear the input
    await symbolInput.clear();

    // Button should be disabled
    await expect(analyzeButton).toBeDisabled();
  });

  test('should enable analyze button when symbol is provided', async ({ page }) => {
    const symbolInput = page.getByPlaceholder(/Enter symbol/i);
    const analyzeButton = page.getByRole('button', { name: /Analyze/i });

    // Enter a symbol
    await symbolInput.fill('AAPL');

    // Button should be enabled
    await expect(analyzeButton).toBeEnabled();
  });

  test('should analyze a stock symbol', async ({ page }) => {
    const symbolInput = page.getByPlaceholder(/Enter symbol/i);
    const analyzeButton = page.getByRole('button', { name: /Analyze/i });

    // Enter a symbol
    await symbolInput.fill('AAPL');

    // Click analyze button
    await analyzeButton.click();

    // Wait for loading state
    await expect(page.getByText(/Analyzing/i)).toBeVisible({ timeout: 2000 });

    // Wait for results (with longer timeout for API call)
    await expect(page.getByText(/Overall Signal/i)).toBeVisible({ timeout: 30000 });
  });

  test('should display analysis results', async ({ page }) => {
    const symbolInput = page.getByPlaceholder(/Enter symbol/i);
    const analyzeButton = page.getByRole('button', { name: /Analyze/i });

    // Enter a symbol
    await symbolInput.fill('MSFT');

    // Click analyze button
    await analyzeButton.click();

    // Wait for results
    await page.waitForSelector('text=/Overall Signal/i', { timeout: 30000 });

    // Check for key result elements
    await expect(page.getByText(/Composite Score/i)).toBeVisible();
    await expect(page.getByText(/Correlation Analysis/i)).toBeVisible();
    await expect(page.getByText(/Key Insights/i)).toBeVisible();
  });

  test('should show export buttons after analysis', async ({ page }) => {
    const symbolInput = page.getByPlaceholder(/Enter symbol/i);
    const analyzeButton = page.getByRole('button', { name: /Analyze/i });

    // Enter a symbol
    await symbolInput.fill('GOOGL');

    // Click analyze button
    await analyzeButton.click();

    // Wait for results
    await page.waitForSelector('text=/Overall Signal/i', { timeout: 30000 });

    // Check for export buttons
    await expect(page.getByText(/📊 CSV/)).toBeVisible();
    await expect(page.getByText(/📄 JSON/)).toBeVisible();
    await expect(page.getByText(/📑 PDF/)).toBeVisible();
  });

  test('should export to CSV', async ({ page }) => {
    const symbolInput = page.getByPlaceholder(/Enter symbol/i);
    const analyzeButton = page.getByRole('button', { name: /Analyze/i });

    // Enter a symbol
    await symbolInput.fill('TSLA');

    // Click analyze button
    await analyzeButton.click();

    // Wait for results
    await page.waitForSelector('text=/Overall Signal/i', { timeout: 30000 });

    // Set up download listener
    const downloadPromise = page.waitForEvent('download');

    // Click CSV export button
    await page.getByText(/📊 CSV/).click();

    // Wait for download
    const download = await downloadPromise;

    // Check download filename
    expect(download.suggestedFilename()).toMatch(/analysis-.*\.csv/);
  });

  test('should change timeframe', async ({ page }) => {
    const timeframeSelect = page.locator('select').first();

    // Change timeframe
    await timeframeSelect.selectOption('1h');

    // Verify selection
    await expect(timeframeSelect).toHaveValue('1h');
  });
});

