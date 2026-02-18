/**
 * Fynvita Onboarding E2E Tests
 * Tests complete onboarding flow for new users
 */

describe("Onboarding Flow", () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true, delete: true });
  });

  describe("Welcome Screens", () => {
    it("should display welcome screen", async () => {
      await expect(element(by.id("welcome-screen"))).toBeVisible();
      await expect(element(by.id("app-logo"))).toBeVisible();
      await expect(element(by.text("Welcome to Fynvita Pro"))).toBeVisible();
    });

    it("should navigate through intro slides", async () => {
      await element(by.id("next-button")).tap();
      await expect(element(by.id("intro-slide-1"))).toBeVisible();

      await element(by.id("next-button")).tap();
      await expect(element(by.id("intro-slide-2"))).toBeVisible();

      await element(by.id("next-button")).tap();
      await expect(element(by.id("intro-slide-3"))).toBeVisible();
    });

    it("should skip intro slides", async () => {
      await device.reloadReactNative();
      await element(by.id("skip-button")).tap();
      await expect(element(by.id("login-screen"))).toBeVisible();
    });
  });

  describe("New User Registration", () => {
    beforeEach(async () => {
      await device.reloadReactNative();
      await element(by.id("skip-button")).tap();
      await element(by.id("register-link")).tap();
    });

    it("should complete registration form", async () => {
      await element(by.id("name-input")).typeText("New User");
      await element(by.id("email-input")).typeText("newuser@example.com");
      await element(by.id("password-input")).typeText("SecurePass123!");
      await element(by.id("confirm-password-input")).typeText("SecurePass123!");
      await element(by.id("terms-checkbox")).tap();
      await element(by.id("register-button")).tap();

      await waitFor(element(by.id("onboarding-profile-screen")))
        .toBeVisible()
        .withTimeout(10000);
    });
  });

  describe("Profile Setup", () => {
    it("should complete profile information", async () => {
      await expect(element(by.id("onboarding-profile-screen"))).toBeVisible();

      await element(by.id("phone-input")).typeText("5551234567");
      await element(by.id("dob-input")).tap();
      await element(by.text("Done")).tap();
      await element(by.id("address-input")).typeText("123 Main St");
      await element(by.id("city-input")).typeText("New York");
      await element(by.id("state-selector")).tap();
      await element(by.text("NY")).tap();
      await element(by.id("zip-input")).typeText("10001");

      await element(by.id("continue-button")).tap();
    });
  });

  describe("Credit Bureau Connection", () => {
    it("should display bureau connection options", async () => {
      await expect(element(by.id("connect-bureaus-screen"))).toBeVisible();
      await expect(element(by.id("experian-connect"))).toBeVisible();
      await expect(element(by.id("equifax-connect"))).toBeVisible();
      await expect(element(by.id("transunion-connect"))).toBeVisible();
    });

    it("should connect to Experian", async () => {
      await element(by.id("experian-connect")).tap();
      await waitFor(element(by.id("experian-connected-badge")))
        .toBeVisible()
        .withTimeout(15000);
    });

    it("should skip bureau connection", async () => {
      await element(by.id("skip-connection-button")).tap();
      await expect(element(by.id("goals-screen"))).toBeVisible();
    });
  });

  describe("Goals Selection", () => {
    it("should display goal options", async () => {
      await expect(element(by.id("goals-screen"))).toBeVisible();
      await expect(element(by.id("goal-improve-score"))).toBeVisible();
      await expect(element(by.id("goal-dispute-errors"))).toBeVisible();
      await expect(element(by.id("goal-build-credit"))).toBeVisible();
    });

    it("should select multiple goals", async () => {
      await element(by.id("goal-improve-score")).tap();
      await element(by.id("goal-dispute-errors")).tap();
      await element(by.id("continue-button")).tap();
    });
  });

  describe("Subscription Selection", () => {
    it("should display subscription plans", async () => {
      await expect(element(by.id("subscription-screen"))).toBeVisible();
      await expect(element(by.id("plan-free"))).toBeVisible();
      await expect(element(by.id("plan-premium"))).toBeVisible();
      await expect(element(by.id("plan-pro"))).toBeVisible();
    });

    it("should select free plan", async () => {
      await element(by.id("plan-free")).tap();
      await element(by.id("continue-button")).tap();
    });

    it("should complete onboarding", async () => {
      await waitFor(element(by.id("onboarding-complete-screen")))
        .toBeVisible()
        .withTimeout(5000);

      await element(by.id("get-started-button")).tap();
      await expect(element(by.id("dashboard-screen"))).toBeVisible();
    });
  });

  describe("Onboarding Resume", () => {
    it("should resume onboarding from last step", async () => {
      // Simulate app restart during onboarding
      await device.reloadReactNative();

      // Should resume from where user left off
      await expect(element(by.id("onboarding-resume-modal"))).toBeVisible();
      await element(by.id("resume-button")).tap();
    });
  });
});
