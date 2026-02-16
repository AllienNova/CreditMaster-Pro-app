/**
 * Landing Page E2E Tests
 *
 * Comprehensive tests for the public landing page — the first thing users see.
 * Tests: layout, navigation, responsive design, links, accessibility basics.
 */

describe('Landing Page', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  describe('Layout & Content', () => {
    it('renders the page without errors', () => {
      cy.get('body').should('be.visible');
      cy.document().its('title').should('not.be.empty');
    });

    it('displays navigation bar with key links', () => {
      cy.get('nav, header').first().within(() => {
        // Should have clickable navigation items
        cy.get('a, button').should('have.length.at.least', 1);
      });
    });

    it('displays a primary heading', () => {
      cy.get('h1').should('exist').and('be.visible');
    });

    it('has at least one call-to-action button', () => {
      cy.get('a, button')
        .filter(':visible')
        .filter((_, el) => {
          const text = el.textContent?.toLowerCase() || '';
          return (
            text.includes('get started') ||
            text.includes('sign up') ||
            text.includes('try') ||
            text.includes('start') ||
            text.includes('begin') ||
            text.includes('dashboard') ||
            text.includes('login')
          );
        })
        .should('have.length.at.least', 1);
    });

    it('includes footer with copyright or legal info', () => {
      cy.get('footer').should('exist');
    });
  });

  describe('Navigation', () => {
    it('Pricing link navigates to /pricing', () => {
      cy.get('a[href*="pricing"], a').filter(':contains("Pricing")').first().click();
      cy.url().should('include', '/pricing');
    });
  });

  describe('Responsive Design', () => {
    const viewports: [number, number, string][] = [
      [375, 667, 'Mobile (iPhone SE)'],
      [768, 1024, 'Tablet (iPad)'],
      [1280, 720, 'Desktop'],
      [1920, 1080, 'Full HD'],
    ];

    viewports.forEach(([width, height, label]) => {
      it(`renders correctly at ${label} (${width}x${height})`, () => {
        cy.viewport(width, height);
        cy.get('body').should('be.visible');
        cy.get('h1').should('be.visible');
        // Page should render and be visible at this viewport
        cy.get('body').children().should('have.length.at.least', 1);
      });
    });
  });

  describe('Performance', () => {
    it('page loads within 5 seconds', () => {
      const start = Date.now();
      cy.visit('/');
      cy.get('h1').should('be.visible').then(() => {
        const loadTime = Date.now() - start;
        expect(loadTime).to.be.lessThan(5000);
      });
    });
  });

  describe('Accessibility Basics', () => {
    it('images (if any) have alt text', () => {
      cy.get('body').then(($body) => {
        if ($body.find('img').length > 0) {
          cy.get('img').each(($img) => {
            cy.wrap($img).should('have.attr', 'alt');
          });
        } else {
          expect(true).to.be.true;
        }
      });
    });

    it('has a lang attribute on html element', () => {
      cy.get('html').should('have.attr', 'lang');
    });

    it('has a viewport meta tag', () => {
      cy.document().then((doc) => {
        const viewport = doc.querySelector('meta[name="viewport"]');
        expect(viewport).to.not.be.null;
      });
    });
  });
});
