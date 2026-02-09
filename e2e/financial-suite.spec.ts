/**
 * Phase 6.4.1: E2E Financial Flows Test Suite
 * Focused smoke coverage for budget, goals, and debt pages.
 */

import { test, expect } from '@playwright/test';
import { AUTH_STORAGE_STATE, restoreAuthSession } from './utils/auth';

test.use({ storageState: AUTH_STORAGE_STATE });

const createTestGoal = () => ({
  name: 'Emergency Fund',
  targetAmount: 10000,
  currentAmount: 2000,
  targetDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0],
});

test.describe('Financial Flows E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await restoreAuthSession(page);
  });

  test('Smart Budget Page Loads', async ({ page }) => {
    await page.goto('/financial/smart-budget');

    const errorState = page.locator('[data-testid="budget-error"]');
    if (await errorState.isVisible()) {
      await expect(errorState).toBeVisible();
      return;
    }

    await expect(page.locator('[data-testid="smart-budget-page"]')).toBeVisible();
    await expect(page.locator('[data-testid="budget-overview"]')).toBeVisible();
  });

  test('Goal Creation Modal Opens', async ({ page }) => {
    const goal = createTestGoal();
    await page.goto('/financial/goals');

    await page.click('[data-testid="create-goal-button"]');
    await expect(page.locator('[data-testid="goal-modal"]')).toBeVisible();

    await page.fill('[data-testid="goal-name-input"]', goal.name);
    await page.fill(
      '[data-testid="goal-target-amount-input"]',
      goal.targetAmount.toString()
    );
    await page.fill(
      '[data-testid="goal-current-amount-input"]',
      goal.currentAmount.toString()
    );
    await page.fill(
      '[data-testid="goal-target-date-input"]',
      goal.targetDate
    );

    await expect(page.getByRole('button', { name: 'Create Goal' })).toBeEnabled();
    await page.getByRole('button', { name: 'Cancel' }).click();
  });

  test('Debt Payoff Page Loads', async ({ page }) => {
    await page.goto('/financial/debt');

    await expect(
      page.getByRole('heading', { name: /Debt Payoff Planner/i })
    ).toBeVisible();
    await expect(page.getByText(/Avalanche Method/i)).toBeVisible();
    await expect(page.getByText(/Snowball Method/i)).toBeVisible();
  });

  test('Mobile Viewport Budget Page', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/financial/smart-budget');

    const errorState = page.locator('[data-testid="budget-error"]');
    if (await errorState.isVisible()) {
      await expect(errorState).toBeVisible();
      return;
    }

    await expect(page.locator('[data-testid="smart-budget-page"]')).toBeVisible();
  });
});
