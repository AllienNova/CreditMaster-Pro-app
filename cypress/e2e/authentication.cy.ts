/**
 * Authentication E2E Tests
 * 
 * Tests user authentication flows including:
 * - Login
 * - Logout
 * - Protected routes
 * - Session persistence
 */

describe('Authentication', () => {
  const testUser = {
    email: Cypress.env('TEST_USER_EMAIL') || 'test@creditmaster.com',
    password: Cypress.env('TEST_USER_PASSWORD') || 'TestPassword123!',
  };

  beforeEach(() => {
    // Clear cookies and local storage before each test
    cy.clearCookies();
    cy.clearLocalStorage();
  });

  describe('Login Flow', () => {
    it('should display login page', () => {
      cy.visit('/login');
      cy.contains('Sign In').should('be.visible');
      cy.get('input[type="email"]').should('be.visible');
      cy.get('input[type="password"]').should('be.visible');
    });

    it('should show validation errors for empty fields', () => {
      cy.visit('/login');
      cy.get('button[type="submit"]').click();
      
      // Check for validation messages
      cy.contains(/email.*required/i).should('be.visible');
      cy.contains(/password.*required/i).should('be.visible');
    });

    it('should show error for invalid credentials', () => {
      cy.visit('/login');
      
      cy.get('input[type="email"]').type('invalid@example.com');
      cy.get('input[type="password"]').type('wrongpassword');
      cy.get('button[type="submit"]').click();
      
      cy.contains(/invalid.*credentials/i, { timeout: 10000 }).should('be.visible');
    });

    it('should successfully login with valid credentials', () => {
      cy.visit('/login');
      
      cy.get('input[type="email"]').type(testUser.email);
      cy.get('input[type="password"]').type(testUser.password);
      cy.get('button[type="submit"]').click();
      
      // Should redirect to dashboard
      cy.url({ timeout: 10000 }).should('include', '/dashboard');
      cy.contains('Credit Intelligence Dashboard').should('be.visible');
    });

    it('should persist session after page reload', () => {
      // Login first
      cy.visit('/login');
      cy.get('input[type="email"]').type(testUser.email);
      cy.get('input[type="password"]').type(testUser.password);
      cy.get('button[type="submit"]').click();
      cy.url({ timeout: 10000 }).should('include', '/dashboard');
      
      // Reload page
      cy.reload();
      
      // Should still be on dashboard
      cy.url().should('include', '/dashboard');
      cy.contains('Credit Intelligence Dashboard').should('be.visible');
    });
  });

  describe('Logout Flow', () => {
    beforeEach(() => {
      // Login before each logout test
      cy.visit('/login');
      cy.get('input[type="email"]').type(testUser.email);
      cy.get('input[type="password"]').type(testUser.password);
      cy.get('button[type="submit"]').click();
      cy.url({ timeout: 10000 }).should('include', '/dashboard');
    });

    it('should successfully logout', () => {
      // Click logout button
      cy.contains('Sign Out').click();
      
      // Should redirect to login page
      cy.url({ timeout: 10000 }).should('include', '/login');
      cy.contains('Sign In').should('be.visible');
    });

    it('should clear session after logout', () => {
      // Logout
      cy.contains('Sign Out').click();
      cy.url({ timeout: 10000 }).should('include', '/login');
      
      // Try to access protected route
      cy.visit('/dashboard');
      
      // Should redirect back to login
      cy.url({ timeout: 10000 }).should('include', '/login');
    });
  });

  describe('Protected Routes', () => {
    it('should redirect to login when accessing dashboard without auth', () => {
      cy.visit('/dashboard');
      cy.url({ timeout: 10000 }).should('include', '/login');
    });

    it('should redirect to login when accessing credit reports without auth', () => {
      cy.visit('/credit-reports');
      cy.url({ timeout: 10000 }).should('include', '/login');
    });

    it('should allow access to public pages without auth', () => {
      // Landing page
      cy.visit('/');
      cy.contains('CreditMaster Pro').should('be.visible');
      
      // Pricing page
      cy.visit('/pricing');
      cy.contains('Choose Your Plan').should('be.visible');
      
      // Student loan page (if public)
      cy.visit('/student-loan-agent');
      cy.url().should('include', '/student-loan-agent');
    });
  });

  describe('Session Management', () => {
    it('should handle expired session gracefully', () => {
      // Login
      cy.visit('/login');
      cy.get('input[type="email"]').type(testUser.email);
      cy.get('input[type="password"]').type(testUser.password);
      cy.get('button[type="submit"]').click();
      cy.url({ timeout: 10000 }).should('include', '/dashboard');
      
      // Clear session storage to simulate expired session
      cy.clearCookies();
      cy.clearLocalStorage();
      
      // Try to access protected route
      cy.visit('/dashboard');
      
      // Should redirect to login
      cy.url({ timeout: 10000 }).should('include', '/login');
    });

    it('should maintain session across multiple tabs', () => {
      // Login
      cy.visit('/login');
      cy.get('input[type="email"]').type(testUser.email);
      cy.get('input[type="password"]').type(testUser.password);
      cy.get('button[type="submit"]').click();
      cy.url({ timeout: 10000 }).should('include', '/dashboard');
      
      // Open new page (simulating new tab)
      cy.visit('/pricing');
      cy.contains('Choose Your Plan').should('be.visible');
      
      // Navigate back to dashboard
      cy.visit('/dashboard');
      cy.url().should('include', '/dashboard');
      cy.contains('Credit Intelligence Dashboard').should('be.visible');
    });
  });

  describe('User Profile', () => {
    beforeEach(() => {
      // Login before each test
      cy.visit('/login');
      cy.get('input[type="email"]').type(testUser.email);
      cy.get('input[type="password"]').type(testUser.password);
      cy.get('button[type="submit"]').click();
      cy.url({ timeout: 10000 }).should('include', '/dashboard');
    });

    it('should display user email in header', () => {
      cy.contains(testUser.email).should('be.visible');
    });

    it('should display welcome message', () => {
      cy.contains(/welcome/i).should('be.visible');
    });
  });
});

