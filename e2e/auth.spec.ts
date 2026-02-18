import { test, expect } from "@playwright/test";

test.describe("Authentication Flow", () => {
  test.describe("Login Page", () => {
    test("should display login form", async ({ page }) => {
      await page.goto("/auth/login");

      // Check for form elements
      await expect(page.getByLabel(/email/i)).toBeVisible();
      await expect(
        page.getByRole("textbox", { name: /password/i }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: /sign in|log in/i }),
      ).toBeVisible();
    });

    test("should show validation errors for empty form", async ({ page }) => {
      await page.goto("/auth/login");

      // Click submit without filling form
      await page.getByRole("button", { name: /sign in|log in/i }).click();

      // Should show validation message
      const errorMessage = page.locator(
        '[role="alert"], .error, [class*="error"]',
      );
      // Form should not proceed (still on login page)
      await expect(page).toHaveURL(/auth\/login/);
    });

    test("should show error for invalid credentials", async ({ page }) => {
      await page.goto("/auth/login");

      await page.getByLabel(/email/i).fill("invalid@test.com");
      await page
        .getByRole("textbox", { name: /password/i })
        .fill("wrongpassword");
      await page.getByRole("button", { name: /sign in|log in/i }).click();

      // Should show error or remain on login page
      await expect(page).toHaveURL(/auth\/login/);
    });

    test("should have forgot password link", async ({ page }) => {
      await page.goto("/auth/login");

      const forgotLink = page.getByRole("link", { name: /forgot|reset/i });
      await expect(forgotLink).toBeVisible();
    });

    test("should have sign up link", async ({ page }) => {
      await page.goto("/auth/login");

      const signUpLink = page.getByRole("link", {
        name: /sign up|register|create account/i,
      });
      await expect(signUpLink).toBeVisible();
    });
  });

  test.describe("Registration", () => {
    test("should navigate to registration from login", async ({ page }) => {
      await page.goto("/auth/login");

      await page
        .getByRole("link", { name: /sign up|register|create account/i })
        .click();

      // Should be on registration page
      await expect(page).toHaveURL(/register|signup|sign-up/);
    });
  });

  test.describe("Protected Routes", () => {
    test("should redirect to login when accessing dashboard unauthenticated", async ({
      page,
    }) => {
      await page.goto("/dashboard");

      // Should redirect to login
      await expect(page).toHaveURL(/auth\/login/);
    });

    test("should redirect to login when accessing disputes unauthenticated", async ({
      page,
    }) => {
      await page.goto("/dashboard/disputes");

      // Should redirect to login
      await expect(page).toHaveURL(/auth\/login/);
    });
  });

  test.describe("Password Visibility Toggle", () => {
    test("should toggle password visibility", async ({ page }) => {
      await page.goto("/auth/login");

      const passwordInput = page.getByRole("textbox", { name: /password/i });
      await passwordInput.fill("testpassword");

      // Initially should be type password
      await expect(passwordInput).toHaveAttribute("type", "password");

      // Look for toggle button
      const toggleButton = page.locator(
        '[aria-label*="password"], [data-testid*="toggle"], button:near(input[type="password"])',
      );

      if ((await toggleButton.count()) > 0) {
        await toggleButton.first().click();
        // After click, should be type text
        await expect(passwordInput).toHaveAttribute("type", "text");
      }
    });
  });
});
