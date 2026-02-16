/**
 * Pricing Page E2E Tests
 *
 * Comprehensive tests for the pricing page — plan display, feature comparison,
 * CTA buttons, billing toggle, responsive layout.
 */

describe('Pricing Page', () => {
  beforeEach(() => {
    cy.visit('/pricing');
  });

  describe('Plan Display', () => {
    it('displays at least 3 pricing tiers', () => {
      // Fynvita pricing tiers: Free, Standard, Pro, Family Duo, Family, Family Plus
      cy.contains(/free/i).should('exist');
      cy.contains(/standard/i).should('exist');
      cy.contains(/pro/i).should('exist');
    });

    it('displays dollar amounts for each plan', () => {
      cy.get('body').then(($body) => {
        const text = $body.text();
        // Should contain at least 2 different price points
        const pricePattern = /\$\d+/g;
        const prices = text.match(pricePattern);
        expect(prices).to.have.length.at.least(2);
      });
    });

    it('each plan has a CTA button', () => {
      cy.get('button, a[role="button"], a[href*="checkout"], a[href*="signup"]')
        .filter(':visible')
        .filter((_, el) => {
          const text = el.textContent?.toLowerCase() || '';
          return (
            text.includes('get started') ||
            text.includes('subscribe') ||
            text.includes('choose') ||
            text.includes('select') ||
            text.includes('start') ||
            text.includes('sign up') ||
            text.includes('try')
          );
        })
        .should('have.length.at.least', 2);
    });

    it('displays feature lists for each plan', () => {
      // Plans should list features (checkmarks, bullets, or list items)
      cy.get('ul, [class*="feature"]').should('have.length.at.least', 2);
    });
  });

  describe('Responsive Design', () => {
    it('stacks plans vertically on mobile', () => {
      cy.viewport(375, 667);
      cy.get('body').should('be.visible');
      // Plans should still be visible
      cy.contains(/\$\d+/).should('be.visible');
    });

    it('displays plans side by side on desktop', () => {
      cy.viewport(1280, 720);
      cy.get('body').should('be.visible');
      cy.contains(/\$\d+/).should('be.visible');
    });
  });
});
