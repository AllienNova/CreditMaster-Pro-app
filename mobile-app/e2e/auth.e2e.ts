/**
 * Fynvita Authentication E2E Tests
 * Tests complete authentication flows using Detox
 */

describe("Authentication Flow", () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  describe("Login", () => {
    it("should display login screen", async () => {
      await expect(element(by.id("login-screen"))).toBeVisible();
      await expect(element(by.id("email-input"))).toBeVisible();
      await expect(element(by.id("password-input"))).toBeVisible();
      await expect(element(by.id("login-button"))).toBeVisible();
    });

    it("should show error for invalid credentials", async () => {
      await element(by.id("email-input")).typeText("invalid@example.com");
      await element(by.id("password-input")).typeText("wrongpassword");
      await element(by.id("login-button")).tap();

      await waitFor(element(by.id("error-message")))
        .toBeVisible()
        .withTimeout(5000);

      await expect(element(by.text("Invalid credentials"))).toBeVisible();
    });

    it("should login successfully with valid credentials", async () => {
      await element(by.id("email-input")).clearText();
      await element(by.id("email-input")).typeText("test@example.com");
      await element(by.id("password-input")).clearText();
      await element(by.id("password-input")).typeText("password123");
      await element(by.id("login-button")).tap();

      await waitFor(element(by.id("dashboard-screen")))
        .toBeVisible()
        .withTimeout(10000);
    });

    it("should navigate to forgot password", async () => {
      await element(by.id("forgot-password-link")).tap();
      await expect(element(by.id("forgot-password-screen"))).toBeVisible();
    });
  });

  describe("Registration", () => {
    it("should navigate to registration screen", async () => {
      await element(by.id("register-link")).tap();
      await expect(element(by.id("register-screen"))).toBeVisible();
    });

    it("should validate email format", async () => {
      await element(by.id("name-input")).typeText("Test User");
      await element(by.id("email-input")).typeText("invalidemail");
      await element(by.id("password-input")).typeText("password123");
      await element(by.id("register-button")).tap();

      await expect(element(by.text("Invalid email format"))).toBeVisible();
    });

    it("should validate password strength", async () => {
      await element(by.id("email-input")).clearText();
      await element(by.id("email-input")).typeText("new@example.com");
      await element(by.id("password-input")).clearText();
      await element(by.id("password-input")).typeText("weak");
      await element(by.id("register-button")).tap();

      await expect(
        element(by.text("Password must be at least 8 characters")),
      ).toBeVisible();
    });

    it("should register successfully", async () => {
      await element(by.id("name-input")).clearText();
      await element(by.id("name-input")).typeText("New User");
      await element(by.id("email-input")).clearText();
      await element(by.id("email-input")).typeText("newuser@example.com");
      await element(by.id("password-input")).clearText();
      await element(by.id("password-input")).typeText("StrongPass123!");
      await element(by.id("confirm-password-input")).typeText("StrongPass123!");
      await element(by.id("register-button")).tap();

      await waitFor(element(by.id("onboarding-screen")))
        .toBeVisible()
        .withTimeout(10000);
    });
  });

  describe("Logout", () => {
    beforeEach(async () => {
      // Login first
      await element(by.id("email-input")).typeText("test@example.com");
      await element(by.id("password-input")).typeText("password123");
      await element(by.id("login-button")).tap();
      await waitFor(element(by.id("dashboard-screen")))
        .toBeVisible()
        .withTimeout(10000);
    });

    it("should logout successfully", async () => {
      await element(by.id("profile-tab")).tap();
      await element(by.id("logout-button")).tap();

      await waitFor(element(by.id("login-screen")))
        .toBeVisible()
        .withTimeout(5000);
    });
  });

  describe("Biometric Authentication", () => {
    it("should show biometric option when available", async () => {
      // This test would check for biometric availability
      // Implementation depends on device capabilities
      await expect(element(by.id("biometric-login-button"))).toExist();
    });
  });
});
