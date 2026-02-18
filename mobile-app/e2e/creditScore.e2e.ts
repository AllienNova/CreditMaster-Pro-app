/**
 * Fynvita Credit Score E2E Tests
 * Tests credit score viewing and monitoring flows
 */

describe("Credit Score Flow", () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
    // Login
    await element(by.id("email-input")).typeText("test@example.com");
    await element(by.id("password-input")).typeText("password123");
    await element(by.id("login-button")).tap();
    await waitFor(element(by.id("dashboard-screen")))
      .toBeVisible()
      .withTimeout(10000);
  });

  describe("Dashboard Credit Score", () => {
    it("should display credit score on dashboard", async () => {
      await expect(element(by.id("credit-score-card"))).toBeVisible();
      await expect(element(by.id("credit-score-value"))).toBeVisible();
    });

    it("should show score trend indicator", async () => {
      await expect(element(by.id("score-trend-indicator"))).toBeVisible();
    });

    it("should navigate to credit details on tap", async () => {
      await element(by.id("credit-score-card")).tap();
      await expect(element(by.id("credit-score-screen"))).toBeVisible();
    });
  });

  describe("Credit Score Details", () => {
    beforeEach(async () => {
      await element(by.id("credit-tab")).tap();
    });

    it("should display all bureau scores", async () => {
      await expect(element(by.id("experian-score"))).toBeVisible();
      await expect(element(by.id("equifax-score"))).toBeVisible();
      await expect(element(by.id("transunion-score"))).toBeVisible();
    });

    it("should show score history chart", async () => {
      await expect(element(by.id("score-history-chart"))).toBeVisible();
    });

    it("should allow period selection for history", async () => {
      await element(by.id("period-selector")).tap();
      await element(by.text("6 Months")).tap();
      await expect(element(by.id("score-history-chart"))).toBeVisible();
    });

    it("should display credit factors", async () => {
      await element(by.id("factors-tab")).tap();
      await expect(element(by.id("credit-factors-list"))).toBeVisible();
      await expect(element(by.id("payment-history-factor"))).toBeVisible();
    });
  });

  describe("Score Simulator", () => {
    it("should navigate to simulator", async () => {
      await element(by.id("credit-tab")).tap();
      await element(by.id("simulator-button")).tap();
      await expect(element(by.id("score-simulator-screen"))).toBeVisible();
    });

    it("should simulate paying off debt", async () => {
      await element(by.id("pay-debt-slider")).swipe("right");
      await expect(element(by.id("projected-score"))).toBeVisible();
      await expect(element(by.id("score-impact"))).toBeVisible();
    });

    it("should simulate opening new credit", async () => {
      await element(by.id("new-credit-toggle")).tap();
      await expect(element(by.id("projected-score"))).toBeVisible();
    });
  });

  describe("Credit Monitoring", () => {
    it("should display monitoring status", async () => {
      await element(by.id("credit-tab")).tap();
      await element(by.id("monitoring-button")).tap();
      await expect(element(by.id("monitoring-status"))).toBeVisible();
    });

    it("should show recent alerts", async () => {
      await expect(element(by.id("alerts-list"))).toBeVisible();
    });

    it("should mark alert as read", async () => {
      await element(by.id("alert-item-0")).tap();
      await expect(element(by.id("alert-details"))).toBeVisible();
      await element(by.id("mark-read-button")).tap();
    });
  });

  describe("Credit Report", () => {
    it("should navigate to credit report", async () => {
      await element(by.id("credit-tab")).tap();
      await element(by.id("view-report-button")).tap();
      await expect(element(by.id("credit-report-screen"))).toBeVisible();
    });

    it("should display report sections", async () => {
      await expect(element(by.id("personal-info-section"))).toBeVisible();
      await expect(element(by.id("accounts-section"))).toBeVisible();
      await expect(element(by.id("inquiries-section"))).toBeVisible();
    });

    it("should allow downloading report", async () => {
      await element(by.id("download-report-button")).tap();
      await expect(element(by.id("download-success-toast"))).toBeVisible();
    });
  });
});
