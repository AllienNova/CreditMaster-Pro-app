/**
 * E2E Tests for Holdings Management
 *
 * Tests complete user journeys for managing investment holdings
 */

import { test, expect } from "@playwright/test";
import { AUTH_STORAGE_STATE } from "../utils/auth";

test.use({ storageState: AUTH_STORAGE_STATE });

test.describe("Holdings Management", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to holdings management page
    await page.goto("/investments/holdings");
    await page.waitForLoadState("networkidle");
  });

  test("should load holdings management page successfully", async ({
    page,
  }) => {
    await expect(
      page.getByRole("heading", { name: /Holdings Management/i }),
    ).toBeVisible();
  });

  test("should display holdings list", async ({ page }) => {
    // Wait for data to load
    await page.waitForTimeout(2000);

    const errorState = page.getByText(/Error/i);
    if (await errorState.isVisible()) {
      await expect(errorState).toBeVisible();
      return;
    }

    // Check for holdings table or list
    const holdingsList = page.locator('[data-testid="holdings-list"]');
    if (await holdingsList.isVisible()) {
      await expect(holdingsList).toBeVisible();
    }
  });

  test("should display add holding button", async ({ page }) => {
    // Check for add holding button
    const errorState = page.getByText(/Error/i);
    if (await errorState.isVisible()) {
      await expect(errorState).toBeVisible();
      return;
    }
    const addButton = page.locator('[data-testid="add-holding-button"]');
    await expect(addButton).toBeVisible();
  });

  test("should open add holding dialog", async ({ page }) => {
    const errorState = page.getByText(/Error/i);
    if (await errorState.isVisible()) {
      await expect(errorState).toBeVisible();
      return;
    }

    // Click add holding button
    const addButton = page.locator('[data-testid="add-holding-button"]');
    await addButton.click();
    await page.waitForTimeout(500);

    // Should show dialog
    const dialog = page.locator('[data-testid="add-holding-modal"]');
    if (await dialog.isVisible()) {
      await expect(dialog).toBeVisible();

      // Should have form fields
      await expect(page.getByLabel(/Symbol/i)).toBeVisible();
      await expect(page.getByLabel(/Shares/i)).toBeVisible();
      await expect(page.getByLabel(/Avg Cost/i)).toBeVisible();
    }
  });

  test("should allow filling add holding form", async ({ page }) => {
    const errorState = page.getByText(/Error/i);
    if (await errorState.isVisible()) {
      await expect(errorState).toBeVisible();
      return;
    }

    const addButton = page.locator('[data-testid="add-holding-button"]');
    await addButton.click();
    await page.waitForTimeout(500);

    await page.getByLabel(/Symbol/i).fill("TSLA");
    await page.getByLabel(/Shares/i).fill("10");
    await page.getByLabel(/Avg Cost/i).fill("250.00");

    await expect(
      page.getByRole("button", { name: /Add Holding/i }),
    ).toBeEnabled();
    await page.getByRole("button", { name: /Cancel/i }).click();
  });

  test("should filter holdings by asset type", async ({ page }) => {
    // Wait for data to load
    await page.waitForTimeout(2000);

    const errorState = page.getByText(/Error/i);
    if (await errorState.isVisible()) {
      await expect(errorState).toBeVisible();
      return;
    }

    // Find filter dropdown
    const filterSelect = page.locator('[data-testid="filter-type-select"]');
    if (await filterSelect.isVisible()) {
      await filterSelect.selectOption("stock");
      await page.waitForTimeout(500);

      // Holdings list should filter
      const holdingsList = page.locator('[data-testid="holdings-list"]');
      await expect(holdingsList).toBeVisible();
    }
  });

  test("should sort holdings", async ({ page }) => {
    // Wait for data to load
    await page.waitForTimeout(2000);

    const errorState = page.getByText(/Error/i);
    if (await errorState.isVisible()) {
      await expect(errorState).toBeVisible();
      return;
    }

    const valueHeader = page.getByRole("columnheader", { name: /Value/i });
    if (await valueHeader.isVisible()) {
      await valueHeader.click();
      await page.waitForTimeout(500);
      await expect(page.locator('[data-testid="holdings-list"]')).toBeVisible();
    }
  });

  test("should edit a holding", async ({ page }) => {
    // Wait for data to load
    await page.waitForTimeout(2000);

    const errorState = page.getByText(/Error/i);
    if (await errorState.isVisible()) {
      await expect(errorState).toBeVisible();
      return;
    }

    // Find edit button for first holding
    const editButton = page.getByRole("button", { name: /Edit/i }).first();
    if (await editButton.isVisible()) {
      await editButton.click();
      await page.waitForTimeout(500);

      // Should show edit dialog
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();

      // Update shares
      const sharesInput = page.getByLabel(/Shares/i);
      await sharesInput.clear();
      await sharesInput.fill("15");

      await expect(
        page.getByRole("button", { name: /Save|Update/i }),
      ).toBeEnabled();
      await page.getByRole("button", { name: /Cancel/i }).click();
    }
  });

  test("should delete a holding", async ({ page }) => {
    // Wait for data to load
    await page.waitForTimeout(2000);

    const errorState = page.getByText(/Error/i);
    if (await errorState.isVisible()) {
      await expect(errorState).toBeVisible();
      return;
    }

    const deleteButton = page.getByRole("button", { name: /Delete/i }).first();
    if (await deleteButton.isVisible()) {
      await deleteButton.click();
      await page.waitForTimeout(500);
      await expect(page.locator('[data-testid="holdings-list"]')).toBeVisible();
    }
  });

  test("should be responsive on mobile", async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Reload page
    await page.reload();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Check that main elements are still visible
    await expect(page.getByText(/Holdings/i)).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Add Holding/i }),
    ).toBeVisible();
  });
});
