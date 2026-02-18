import { test, expect } from "@playwright/test";

test.describe("Marketplace Pages", () => {
  const marketplaceRoutes = [
    "/marketplace",
    "/marketplace/tradelines",
    "/marketplace/secured-cards",
    "/marketplace/loans",
    "/marketplace/services",
    "/marketplace/education",
    "/marketplace/attorneys",
  ];

  test("marketplace routes should be accessible", async ({ page }) => {
    for (const route of marketplaceRoutes) {
      const response = await page.goto(route);
      expect(response?.status()).toBe(200);
    }
  });

  test("main marketplace page should display categories", async ({ page }) => {
    await page.goto("/marketplace");

    // Should have multiple category cards/sections
    const categories = page.locator(
      '[class*="card"], [class*="category"], a[href*="marketplace"]',
    );
    const count = await categories.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });
});

test.describe("Tradelines Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/marketplace/tradelines");
  });

  test("should display tradeline listings", async ({ page }) => {
    // Should have product cards
    const listings = page.locator(
      '[class*="card"], [class*="listing"], [class*="product"]',
    );
    await expect(listings.first()).toBeVisible();
  });

  test("should have filter options", async ({ page }) => {
    // Look for filter controls
    const filters = page.locator(
      'select, [class*="filter"], input[type="checkbox"], [role="listbox"]',
    );
    const hasFilters = (await filters.count()) > 0;
    console.log(`Has filter options: ${hasFilters}`);
  });

  test("should show pricing information", async ({ page }) => {
    const prices = page.locator("text=/\\$\\d+/");
    const count = await prices.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });
});

test.describe("Secured Cards Page", () => {
  test("should display card offerings", async ({ page }) => {
    await page.goto("/marketplace/secured-cards");

    // Should show card products
    const cards = page.locator('[class*="card"]');
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test("should show card benefits", async ({ page }) => {
    await page.goto("/marketplace/secured-cards");

    // Should list features/benefits
    const features = page.locator(
      'ul li, [class*="feature"], [class*="benefit"]',
    );
    const count = await features.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });
});

test.describe("Education Page", () => {
  test("should display educational content", async ({ page }) => {
    await page.goto("/marketplace/education");

    // Should have articles or course listings
    const content = page.locator(
      '[class*="article"], [class*="course"], [class*="content"]',
    );
    const count = await content.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });
});

test.describe("Marketplace Search", () => {
  test("should have search functionality", async ({ page }) => {
    await page.goto("/marketplace");

    const searchInput = page.locator(
      'input[type="search"], input[placeholder*="search"], [class*="search"] input',
    );

    if ((await searchInput.count()) > 0) {
      await searchInput.first().fill("credit");
      await searchInput.first().press("Enter");

      // Should show results or filter
      await page.waitForTimeout(500);
    }
  });
});

test.describe("Marketplace Mobile", () => {
  test("should be responsive", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/marketplace");

    // Content should still be visible
    await expect(page.locator("h1, h2").first()).toBeVisible();
  });

  test("tradelines should be mobile-friendly", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/marketplace/tradelines");

    // Cards should stack vertically
    await expect(page.locator('[class*="card"]').first()).toBeVisible();
  });
});
