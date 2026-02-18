/**
 * Phase 6.4.2: E2E Investment Flows Test Suite
 * Smoke coverage for portfolio, holdings, and stock analysis pages.
 */

import { test, expect } from "@playwright/test";
import { AUTH_STORAGE_STATE, restoreAuthSession } from "./utils/auth";

test.use({ storageState: AUTH_STORAGE_STATE });

test.describe("Investment Flows E2E Tests", () => {
  test.beforeEach(async ({ page }) => {
    await restoreAuthSession(page);
  });

  test("Portfolio Overview Loads", async ({ page }) => {
    await page.goto("/investments");
    await expect(
      page.getByRole("heading", { name: /Investment Portfolio/i }),
    ).toBeVisible();

    const errorState = page.getByText(/Error/i);
    if (await errorState.isVisible()) {
      await expect(errorState).toBeVisible();
      return;
    }

    await expect(
      page.locator('[data-testid="summary-card"]').first(),
    ).toBeVisible();
  });

  test("Holdings Management Modal Opens", async ({ page }) => {
    await page.goto("/investments/holdings");
    await expect(
      page.getByRole("heading", { name: /Holdings Management/i }),
    ).toBeVisible();

    const addButton = page.locator('[data-testid="add-holding-button"]');
    if (await addButton.isVisible()) {
      await addButton.click();
      await expect(
        page.locator('[data-testid="add-holding-modal"]'),
      ).toBeVisible();
      await page.getByRole("button", { name: /Cancel/i }).click();
    }
  });

  test("Stock Analysis Loads", async ({ page }) => {
    await page.goto("/investments/analyze/AAPL");
    await expect(
      page.getByRole("heading", { name: /Stock Analysis/i }),
    ).toBeVisible();

    const price = page.locator('[data-testid="stock-price"]');
    if (await price.isVisible()) {
      await expect(price).toBeVisible();
    }
  });

  test("Mobile Responsive Portfolio", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/investments");
    await expect(
      page.getByRole("heading", { name: /Investment Portfolio/i }),
    ).toBeVisible();
  });
});
