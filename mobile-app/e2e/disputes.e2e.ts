/**
 * CPFI Disputes E2E Tests
 * Tests complete dispute creation and management flows
 */

describe('Disputes Flow', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
    // Login
    await element(by.id('email-input')).typeText('test@example.com');
    await element(by.id('password-input')).typeText('password123');
    await element(by.id('login-button')).tap();
    await waitFor(element(by.id('dashboard-screen')))
      .toBeVisible()
      .withTimeout(10000);
  });

  describe('Disputes List', () => {
    beforeEach(async () => {
      await element(by.id('disputes-tab')).tap();
    });

    it('should display disputes list', async () => {
      await expect(element(by.id('disputes-screen'))).toBeVisible();
      await expect(element(by.id('disputes-list'))).toBeVisible();
    });

    it('should filter disputes by status', async () => {
      await element(by.id('status-filter')).tap();
      await element(by.text('Pending')).tap();
      await expect(element(by.id('disputes-list'))).toBeVisible();
    });

    it('should filter disputes by bureau', async () => {
      await element(by.id('bureau-filter')).tap();
      await element(by.text('Experian')).tap();
      await expect(element(by.id('disputes-list'))).toBeVisible();
    });
  });

  describe('Create Dispute', () => {
    it('should navigate to create dispute', async () => {
      await element(by.id('disputes-tab')).tap();
      await element(by.id('create-dispute-button')).tap();
      await expect(element(by.id('create-dispute-screen'))).toBeVisible();
    });

    it('should select dispute type', async () => {
      await element(by.id('dispute-type-selector')).tap();
      await element(by.text('Late Payment')).tap();
      await expect(element(by.id('dispute-type-selected'))).toHaveText('Late Payment');
    });

    it('should select bureau', async () => {
      await element(by.id('bureau-selector')).tap();
      await element(by.text('Experian')).tap();
    });

    it('should enter account details', async () => {
      await element(by.id('account-name-input')).typeText('Credit Card Account');
      await element(by.id('account-number-input')).typeText('****1234');
    });

    it('should generate AI letter', async () => {
      await element(by.id('generate-letter-button')).tap();
      await waitFor(element(by.id('generated-letter')))
        .toBeVisible()
        .withTimeout(15000);
    });

    it('should submit dispute', async () => {
      await element(by.id('submit-dispute-button')).tap();
      await waitFor(element(by.id('dispute-success-modal')))
        .toBeVisible()
        .withTimeout(10000);
    });
  });

  describe('Dispute Details', () => {
    it('should view dispute details', async () => {
      await element(by.id('disputes-tab')).tap();
      await element(by.id('dispute-item-0')).tap();
      await expect(element(by.id('dispute-details-screen'))).toBeVisible();
    });

    it('should display dispute timeline', async () => {
      await expect(element(by.id('dispute-timeline'))).toBeVisible();
    });

    it('should show dispute letter', async () => {
      await element(by.id('view-letter-button')).tap();
      await expect(element(by.id('dispute-letter-modal'))).toBeVisible();
    });

    it('should allow editing draft dispute', async () => {
      await element(by.id('edit-dispute-button')).tap();
      await expect(element(by.id('edit-dispute-screen'))).toBeVisible();
    });
  });

  describe('AI Dispute Assistant', () => {
    it('should open AI assistant', async () => {
      await element(by.id('disputes-tab')).tap();
      await element(by.id('ai-assistant-button')).tap();
      await expect(element(by.id('ai-assistant-screen'))).toBeVisible();
    });

    it('should analyze credit report for disputes', async () => {
      await element(by.id('analyze-report-button')).tap();
      await waitFor(element(by.id('analysis-results')))
        .toBeVisible()
        .withTimeout(20000);
    });

    it('should suggest dispute strategies', async () => {
      await expect(element(by.id('strategy-recommendations'))).toBeVisible();
    });
  });

  describe('Dispute Tracking', () => {
    it('should show dispute progress', async () => {
      await element(by.id('disputes-tab')).tap();
      await element(by.id('tracking-button')).tap();
      await expect(element(by.id('tracking-screen'))).toBeVisible();
    });

    it('should display success rate', async () => {
      await expect(element(by.id('success-rate-card'))).toBeVisible();
    });

    it('should show estimated completion', async () => {
      await expect(element(by.id('estimated-completion'))).toBeVisible();
    });
  });
});

