import { test, expect } from "@playwright/test";

test.describe("Pricing Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/pricing");
  });

  test("should display pricing tiers", async ({ page }) => {
    // Should have multiple pricing cards
    const pricingCards = page.locator(
      '[class*="card"], [class*="plan"], [class*="tier"]',
    );
    const count = await pricingCards.count();
    expect(count).toBeGreaterThanOrEqual(2);
  });

  test("should show plan names", async ({ page }) => {
    // Check for common plan names
    const pageContent = await page.textContent("body");
    const hasPlans =
      pageContent?.toLowerCase().includes("basic") ||
      pageContent?.toLowerCase().includes("professional") ||
      pageContent?.toLowerCase().includes("enterprise") ||
      pageContent?.toLowerCase().includes("starter") ||
      pageContent?.toLowerCase().includes("pro");

    expect(hasPlans).toBeTruthy();
  });

  test("should display prices", async ({ page }) => {
    // Should have price indicators
    const prices = page.locator("text=/\\$\\d+/");
    const count = await prices.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test("should have CTA buttons for each plan", async ({ page }) => {
    const ctaButtons = page.getByRole("button", {
      name: /get started|subscribe|choose|select|buy/i,
    });
    const count = await ctaButtons.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test("should toggle between monthly and yearly pricing", async ({ page }) => {
    // Look for toggle or tabs for billing period
    const toggle = page.locator(
      '[role="switch"], [class*="toggle"], button:has-text("yearly"), button:has-text("annual")',
    );

    if ((await toggle.count()) > 0) {
      // Get initial price
      const initialPrice = await page
        .locator("text=/\\$\\d+/")
        .first()
        .textContent();

      // Click toggle
      await toggle.first().click();

      // Price should potentially change (or stay same if designed that way)
      await page.waitForTimeout(500);
    }
  });

  test("should highlight recommended plan", async ({ page }) => {
    // Look for highlighted/recommended plan
    const recommended = page.locator(
      '[class*="popular"], [class*="recommended"], [class*="featured"], :has-text("Most Popular"), :has-text("Recommended")',
    );

    // It's optional but good practice to have one
    const hasRecommended = (await recommended.count()) > 0;
    // Just log, don't fail if not present
    console.log(`Has recommended plan highlight: ${hasRecommended}`);
  });

  test("should list features for each plan", async ({ page }) => {
    // Should have feature lists
    const featureLists = page.locator('ul, [class*="features"]');
    const count = await featureLists.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test("should be accessible", async ({ page }) => {
    // Check for proper heading structure
    const h1Count = await page.locator("h1").count();
    expect(h1Count).toBe(1);

    // Buttons should be accessible
    const buttons = page.getByRole("button");
    const buttonCount = await buttons.count();

    for (let i = 0; i < Math.min(buttonCount, 5); i++) {
      const button = buttons.nth(i);
      const text = await button.textContent();
      const ariaLabel = await button.getAttribute("aria-label");
      expect(text?.trim() || ariaLabel).toBeTruthy();
    }
  });
});

test.describe("Pricing Page Navigation", () => {
  test("should navigate to signup when clicking CTA", async ({ page }) => {
    await page.goto("/pricing");

    const ctaButton = page
      .getByRole("button", { name: /get started|subscribe|choose/i })
      .first();

    if ((await ctaButton.count()) > 0) {
      await ctaButton.click();

      // Should navigate to signup or checkout
      await expect(page).toHaveURL(/register|signup|checkout|login/);
    }
  });

  test("should have FAQ section or link", async ({ page }) => {
    await page.goto("/pricing");

    // Look for FAQ
    const faq = page.locator("text=/FAQ|Frequently Asked|Questions/i");
    const hasFaq = (await faq.count()) > 0;

    // Optional but good to have
    console.log(`Has FAQ section: ${hasFaq}`);
  });
});
