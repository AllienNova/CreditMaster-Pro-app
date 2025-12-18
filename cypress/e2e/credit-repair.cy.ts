/**
 * E2E Tests for Credit Repair Features
 * 
 * Tests complete user workflows for:
 * - Dispute management
 * - Credit card tracking
 * - Goodwill letters
 * - Negotiations
 * - Credit reports
 */

describe('Credit Repair - Complete User Workflows', () => {
  beforeEach(() => {
    // Visit the application
    cy.visit('/');
    
    // Mock authentication (if needed)
    // In a real scenario, you'd log in here
  });

  describe('Landing Page', () => {
    it('should display the landing page correctly', () => {
      cy.contains('CPFI').should('be.visible');
      cy.contains('AI-Powered Credit Repair').should('be.visible');
      
      // Check for key features
      cy.contains('300+ AI Models').should('be.visible');
      cy.contains('Intelligent Routing').should('be.visible');
      cy.contains('Enterprise Security').should('be.visible');
    });

    it('should navigate to pricing page', () => {
      cy.contains('Pricing').click();
      cy.url().should('include', '/pricing');
      
      // Check pricing tiers
      cy.contains('Basic').should('be.visible');
      cy.contains('Premium').should('be.visible');
      cy.contains('Enterprise').should('be.visible');
    });
  });

  describe('Dashboard', () => {
    beforeEach(() => {
      cy.visit('/dashboard');
    });

    it('should display dashboard overview', () => {
      cy.contains('Dashboard').should('be.visible');
      cy.contains('Credit Score').should('be.visible');
      cy.contains('Active Disputes').should('be.visible');
    });

    it('should show credit score widget', () => {
      cy.get('[data-testid="credit-score-widget"]').should('exist');
      // Credit score should be a number between 300-850
      cy.get('[data-testid="credit-score-value"]').should('exist');
    });

    it('should display recent activity', () => {
      cy.contains('Recent Activity').should('be.visible');
      cy.get('[data-testid="activity-list"]').should('exist');
    });
  });

  describe('Dispute Management', () => {
    beforeEach(() => {
      cy.visit('/dashboard/disputes');
    });

    it('should display disputes list', () => {
      cy.contains('Disputes').should('be.visible');
      cy.get('[data-testid="disputes-list"]').should('exist');
    });

    it('should create a new dispute', () => {
      // Click create dispute button
      cy.contains('Create Dispute').click();
      
      // Fill out dispute form
      cy.get('[data-testid="bureau-select"]').select('Experian');
      cy.get('[data-testid="item-type-select"]').select('Late Payment');
      cy.get('[data-testid="item-description"]').type('Late payment on credit card from 2023');
      cy.get('[data-testid="reason-select"]').select('Not Mine');
      
      // Submit form
      cy.get('[data-testid="submit-dispute"]').click();
      
      // Verify success message
      cy.contains('Dispute created successfully').should('be.visible');
      
      // Verify dispute appears in list
      cy.get('[data-testid="disputes-list"]').should('contain', 'Late payment');
    });

    it('should filter disputes by status', () => {
      cy.get('[data-testid="status-filter"]').select('Draft');
      cy.get('[data-testid="disputes-list"]').should('exist');
      
      cy.get('[data-testid="status-filter"]').select('Sent');
      cy.get('[data-testid="disputes-list"]').should('exist');
    });

    it('should view dispute details', () => {
      // Click on first dispute
      cy.get('[data-testid="dispute-item"]').first().click();
      
      // Verify details page
      cy.url().should('include', '/disputes/');
      cy.contains('Dispute Details').should('be.visible');
      cy.get('[data-testid="dispute-status"]').should('exist');
      cy.get('[data-testid="dispute-timeline"]').should('exist');
    });

    it('should update dispute status', () => {
      // Open first dispute
      cy.get('[data-testid="dispute-item"]').first().click();
      
      // Update status
      cy.get('[data-testid="status-select"]').select('Sent');
      cy.get('[data-testid="save-dispute"]').click();
      
      // Verify success
      cy.contains('Dispute updated successfully').should('be.visible');
    });

    it('should generate dispute letter with AI', () => {
      // Create new dispute
      cy.contains('Create Dispute').click();
      
      // Fill form
      cy.get('[data-testid="bureau-select"]').select('Experian');
      cy.get('[data-testid="item-type-select"]').select('Late Payment');
      cy.get('[data-testid="item-description"]').type('Test dispute');
      cy.get('[data-testid="reason-select"]').select('Not Mine');
      
      // Enable AI letter generation
      cy.get('[data-testid="generate-letter-checkbox"]').check();
      
      // Submit
      cy.get('[data-testid="submit-dispute"]').click();
      
      // Wait for AI generation
      cy.contains('Generating letter', { timeout: 10000 }).should('be.visible');
      cy.contains('Letter generated successfully', { timeout: 30000 }).should('be.visible');
      
      // Verify letter content
      cy.get('[data-testid="dispute-letter"]').should('exist');
      cy.get('[data-testid="dispute-letter"]').should('contain', 'Dear');
    });
  });

  describe('Credit Card Management', () => {
    beforeEach(() => {
      cy.visit('/dashboard/credit-cards');
    });

    it('should display credit cards list', () => {
      cy.contains('Credit Cards').should('be.visible');
      cy.get('[data-testid="credit-cards-list"]').should('exist');
    });

    it('should add a new credit card', () => {
      cy.contains('Add Card').click();
      
      // Fill form
      cy.get('[data-testid="card-name"]').type('Chase Freedom');
      cy.get('[data-testid="credit-limit"]').type('5000');
      cy.get('[data-testid="current-balance"]').type('1000');
      
      // Submit
      cy.get('[data-testid="save-card"]').click();
      
      // Verify success
      cy.contains('Card added successfully').should('be.visible');
      
      // Verify utilization is calculated (20%)
      cy.get('[data-testid="credit-cards-list"]').should('contain', '20%');
    });

    it('should update credit card balance', () => {
      // Click on first card
      cy.get('[data-testid="card-item"]').first().click();
      
      // Update balance
      cy.get('[data-testid="current-balance"]').clear().type('2500');
      cy.get('[data-testid="save-card"]').click();
      
      // Verify utilization updated (50%)
      cy.contains('Card updated successfully').should('be.visible');
      cy.get('[data-testid="utilization-value"]').should('contain', '50%');
    });

    it('should show utilization warning for high usage', () => {
      // Add card with high utilization
      cy.contains('Add Card').click();
      cy.get('[data-testid="card-name"]').type('High Utilization Card');
      cy.get('[data-testid="credit-limit"]').type('1000');
      cy.get('[data-testid="current-balance"]').type('900');
      cy.get('[data-testid="save-card"]').click();
      
      // Verify warning
      cy.contains('High utilization').should('be.visible');
      cy.get('[data-testid="utilization-warning"]').should('exist');
    });
  });

  describe('Goodwill Letters', () => {
    beforeEach(() => {
      cy.visit('/dashboard/goodwill');
    });

    it('should create goodwill letter', () => {
      cy.contains('Create Goodwill Letter').click();
      
      // Fill form
      cy.get('[data-testid="creditor-name"]').type('Bank of America');
      cy.get('[data-testid="account-number"]').type('1234567890');
      cy.get('[data-testid="issue-description"]').type('Late payment due to medical emergency');
      
      // Generate with AI
      cy.get('[data-testid="generate-letter-checkbox"]').check();
      cy.get('[data-testid="submit-goodwill"]').click();
      
      // Wait for AI generation
      cy.contains('Generating letter', { timeout: 10000 }).should('be.visible');
      cy.contains('Letter generated successfully', { timeout: 30000 }).should('be.visible');
    });
  });

  describe('Quick Wins Analysis', () => {
    beforeEach(() => {
      cy.visit('/dashboard/quick-wins');
    });

    it('should analyze credit for quick wins', () => {
      cy.contains('Quick Wins').should('be.visible');
      
      // Click analyze button
      cy.get('[data-testid="analyze-button"]').click();
      
      // Wait for analysis
      cy.contains('Analyzing', { timeout: 10000 }).should('be.visible');
      cy.contains('Analysis complete', { timeout: 30000 }).should('be.visible');
      
      // Verify recommendations
      cy.get('[data-testid="recommendations-list"]').should('exist');
      cy.get('[data-testid="recommendation-item"]').should('have.length.greaterThan', 0);
    });

    it('should display impact scores', () => {
      cy.get('[data-testid="analyze-button"]').click();
      cy.contains('Analysis complete', { timeout: 30000 }).should('be.visible');
      
      // Check impact scores
      cy.get('[data-testid="impact-score"]').should('exist');
      cy.get('[data-testid="effort-score"]').should('exist');
    });
  });

  describe('Performance', () => {
    it('should load dashboard within 3 seconds', () => {
      const start = Date.now();
      cy.visit('/dashboard');
      cy.contains('Dashboard').should('be.visible');
      const duration = Date.now() - start;
      expect(duration).to.be.lessThan(3000);
    });

    it('should handle multiple rapid clicks', () => {
      cy.visit('/dashboard');
      
      // Rapidly click navigation items
      cy.contains('Disputes').click();
      cy.contains('Credit Cards').click();
      cy.contains('Dashboard').click();
      
      // Should still work
      cy.contains('Dashboard').should('be.visible');
    });
  });

  describe('Error Handling', () => {
    it('should show error for invalid form submission', () => {
      cy.visit('/dashboard/disputes');
      cy.contains('Create Dispute').click();
      
      // Submit without filling required fields
      cy.get('[data-testid="submit-dispute"]').click();
      
      // Verify error messages
      cy.contains('required').should('be.visible');
    });

    it('should handle network errors gracefully', () => {
      // Intercept API calls and force error
      cy.intercept('POST', '/api/credit-repair/disputes', {
        statusCode: 500,
        body: { error: 'Internal server error' },
      });
      
      cy.visit('/dashboard/disputes');
      cy.contains('Create Dispute').click();
      
      // Fill and submit
      cy.get('[data-testid="bureau-select"]').select('Experian');
      cy.get('[data-testid="item-type-select"]').select('Late Payment');
      cy.get('[data-testid="item-description"]').type('Test');
      cy.get('[data-testid="reason-select"]').select('Not Mine');
      cy.get('[data-testid="submit-dispute"]').click();
      
      // Verify error message
      cy.contains('error', { matchCase: false }).should('be.visible');
    });
  });
});

