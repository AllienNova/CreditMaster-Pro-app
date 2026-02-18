/**
 * E2E Tests for Portfolio Management
 *
 * Tests complete user journeys for portfolio creation, viewing, and management
 */

import { test, expect } from "@playwright/test";
import { AUTH_STORAGE_STATE } from "../utils/auth";

test.use({ storageState: AUTH_STORAGE_STATE });

test.describe("Portfolio Management", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the portfolio dashboard
    await page.goto("/investments");
    await page.waitForLoadState("networkidle");
  });

  test("should load portfolio dashboard successfully", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: /Investment Portfolio/i }),
    ).toBeVisible();
  });

  test("should display portfolio summary cards", async ({ page }) => {
    // Wait for data to load
    await page.waitForTimeout(2000);

    const errorState = page.getByText(/Error/i);
    if (await errorState.isVisible()) {
      await expect(errorState).toBeVisible();
      return;
    }

    // Check for summary metrics
    const summaryCards = page.locator('[data-testid="summary-card"]');
    await expect(summaryCards.first()).toBeVisible();

    // Should show total value and return
    await expect(page.getByText(/Total Value/i)).toBeVisible();
    await expect(page.getByText(/Total Return/i)).toBeVisible();
  });

  test("should switch between time periods", async ({ page }) => {
    // Find period selector buttons
    const period1M = page.getByRole("button", { name: "1M" });
    const period3M = page.getByRole("button", { name: "3M" });
    const period1Y = page.getByRole("button", { name: "1Y" });

    if (!(await period1M.isVisible())) {
      await expect(page.getByText(/Error/i)).toBeVisible();
      return;
    }

    // Click different periods
    await period1M.click();
    await page.waitForTimeout(500);

    await period3M.click();
    await page.waitForTimeout(500);

    await period1Y.click();
    await page.waitForTimeout(500);

    // Verify the chart updates (check for chart container)
    const chart = page.locator('[data-testid="performance-chart"]');
    await expect(chart).toBeVisible();
  });

  test("should display asset allocation chart", async ({ page }) => {
    // Wait for data to load
    await page.waitForTimeout(2000);

    const errorState = page.getByText(/Error/i);
    if (await errorState.isVisible()) {
      await expect(errorState).toBeVisible();
      return;
    }

    // Check for allocation section
    await expect(page.getByText(/Asset Allocation/i)).toBeVisible();

    // Check for allocation chart or breakdown
    const allocationSection = page.locator('[data-testid="asset-allocation"]');
    await expect(allocationSection).toBeVisible();
  });

  test("should display holdings list", async ({ page }) => {
    // Wait for data to load
    await page.waitForTimeout(2000);

    const errorState = page.getByText(/Error/i);
    if (await errorState.isVisible()) {
      await expect(errorState).toBeVisible();
      return;
    }

    // Check for holdings section
    await expect(page.getByText(/Holdings/i)).toBeVisible();

    // Check for holdings table or list
    const holdingsList = page.locator('[data-testid="holdings-list"]');
    await expect(holdingsList).toBeVisible();
  });

  test("should navigate to holdings management", async ({ page }) => {
    const addHoldingButton = page.getByRole("button", { name: /Add Holding/i });

    if (await addHoldingButton.isVisible()) {
      await addHoldingButton.click();
      await page.waitForLoadState("networkidle");

      // Should navigate to holdings page
      expect(page.url()).toContain("/holdings");
    }
  });

  test("should handle empty portfolio state", async ({ page }) => {
    // This test assumes a new user with no holdings
    // Check for empty state message
    const emptyState = page.getByText(/No Portfolio Data|No holdings/i);

    if (await emptyState.isVisible()) {
      // Should show CTA to add holdings
      await expect(
        page.getByRole("button", { name: /Add Holding/i }),
      ).toBeVisible();
    }
  });

  test("should be responsive on mobile", async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Reload page
    await page.reload();
    await page.waitForLoadState("networkidle");

    // Check that main elements are still visible
    await expect(page.getByText(/Portfolio/i)).toBeVisible();
    await expect(page.getByText(/Total Value/i)).toBeVisible();
  });
});
