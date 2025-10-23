describe('User Workflow', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000');
  });

  it('should complete the full user journey', () => {
    // Test landing page
    cy.contains('Agentic Credit Repair').should('be.visible');
    cy.contains('AI-Agent Powered Platform').should('be.visible');

    // Navigate to dashboard
    cy.contains('Dashboard').click();
    cy.wait(1000);
    cy.url().should('include', '/dashboard');

    // Check dashboard elements
    cy.contains('Credit Score Overview').should('be.visible');
    cy.contains('Active Disputes').should('be.visible');
    cy.contains('Recommendations').should('be.visible');

    // Navigate to student loans section
    cy.contains('Student Loans').click();
    cy.wait(1000);
    cy.url().should('include', '/student-loan-agent');

    // Check student loan agent page
    cy.contains('Student Loan AI Agent').should('be.visible');
    cy.contains('Upload Documents').should('be.visible');

    // Navigate to pricing page
    cy.contains('Pricing').click();
    cy.wait(1000);
    cy.url().should('include', '/pricing');

    // Check pricing page
    cy.contains('Essential').should('be.visible');
    cy.contains('Pro').should('be.visible');
    cy.contains('Elite').should('be.visible');
  });

  it('should handle student loan document upload workflow', () => {
    // Navigate to student loan agent
    cy.visit('http://localhost:3000/student-loan-agent');

    // Check for upload functionality
    cy.contains('Upload Documents').should('be.visible');
    cy.contains('Drag and drop your student loan documents').should('be.visible');

    // Test file upload area interaction
    cy.get('[data-testid="file-upload-area"]').should('exist');
  });

  it('should display pricing tiers correctly', () => {
    cy.visit('http://localhost:3000/pricing');

    // Check all pricing tiers
    cy.contains('Essential').should('be.visible');
    cy.contains('$49').should('be.visible');
    cy.contains('Pro').should('be.visible');
    cy.contains('$99').should('be.visible');
    cy.contains('Elite').should('be.visible');
    cy.contains('$199').should('be.visible');

    // Check features are displayed
    cy.contains('AI-powered credit analysis').should('be.visible');
    cy.contains('Student loan credit repair').should('be.visible');
    cy.contains('Federal system integration').should('be.visible');
  });
});
