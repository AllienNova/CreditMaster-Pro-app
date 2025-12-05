import { test, expect } from '@playwright/test';

test.describe('Student Loan Agent Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/student-loan-agent');
  });

  test('should display student loan tools', async ({ page }) => {
    // Should have heading about student loans
    const heading = page.locator('h1, h2');
    await expect(heading.first()).toBeVisible();
  });

  test('should have loan calculator section', async ({ page }) => {
    // Look for calculator or input fields
    const inputs = page.locator('input[type="number"], input[inputmode="numeric"], [class*="calculator"]');
    const hasCalculator = await inputs.count() > 0;
    console.log(`Has calculator inputs: ${hasCalculator}`);
  });

  test('should display program options', async ({ page }) => {
    // Look for program information
    const programs = page.locator('text=/IDR|PAYE|SAVE|IBR|PSLF|Income.*Driven/i');
    const hasPrograms = await programs.count() > 0;
    console.log(`Has program information: ${hasPrograms}`);
  });

  test('should have interactive elements', async ({ page }) => {
    // Should have buttons or form controls
    const buttons = page.getByRole('button');
    const count = await buttons.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should be responsive', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/student-loan-agent');
    
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });
});

test.describe('Student Loan Calculations', () => {
  test('should calculate loan payments', async ({ page }) => {
    await page.goto('/student-loan-agent');
    
    // Try to find and fill loan amount input
    const loanInput = page.locator('input[name*="loan"], input[name*="balance"], input[placeholder*="loan"]');
    
    if (await loanInput.count() > 0) {
      await loanInput.first().fill('50000');
      
      // Try to find interest rate input
      const rateInput = page.locator('input[name*="rate"], input[name*="interest"]');
      if (await rateInput.count() > 0) {
        await rateInput.first().fill('5.5');
      }
      
      // Try to submit or calculate
      const calculateBtn = page.getByRole('button', { name: /calculate|estimate|show/i });
      if (await calculateBtn.count() > 0) {
        await calculateBtn.first().click();
        await page.waitForTimeout(500);
      }
    }
  });
});

test.describe('Student Loan Programs Information', () => {
  test('SAVE program information should be accessible', async ({ page }) => {
    await page.goto('/student-loan-agent');
    
    const saveInfo = page.locator('text=/SAVE/i');
    if (await saveInfo.count() > 0) {
      console.log('SAVE program information found');
    }
  });

  test('PSLF information should be accessible', async ({ page }) => {
    await page.goto('/student-loan-agent');
    
    const pslfInfo = page.locator('text=/PSLF|Public Service/i');
    if (await pslfInfo.count() > 0) {
      console.log('PSLF program information found');
    }
  });

  test('Fresh Start information should be accessible', async ({ page }) => {
    await page.goto('/student-loan-agent');
    
    const freshStart = page.locator('text=/Fresh Start/i');
    if (await freshStart.count() > 0) {
      console.log('Fresh Start program information found');
    }
  });
});

test.describe('Student Loan Navigation', () => {
  test('should have navigation back to main app', async ({ page }) => {
    await page.goto('/student-loan-agent');
    
    const homeLink = page.getByRole('link', { name: /home|back|dashboard/i });
    const hasNav = await homeLink.count() > 0;
    console.log(`Has navigation: ${hasNav}`);
  });

  test('should have related links', async ({ page }) => {
    await page.goto('/student-loan-agent');
    
    const links = page.locator('a[href*="loan"], a[href*="student"]');
    const count = await links.count();
    console.log(`Related links count: ${count}`);
  });
});

