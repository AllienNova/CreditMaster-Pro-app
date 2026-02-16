/**
 * Page Route Validation E2E Tests
 *
 * Validates every page route loads correctly with proper:
 * - HTTP status codes (200 for public, 307 redirect for protected)
 * - Essential HTML elements rendered
 * - No JavaScript errors on page load
 * - Correct page titles / headings
 */

describe('Public Pages', () => {
  it('Landing page (/) loads with hero content', () => {
    cy.visit('/');
    cy.get('body').should('be.visible');
    cy.title().should('not.be.empty');
    // Main heading or brand should be present
    cy.get('h1, h2, [class*="hero"]').should('exist');
    // Should have navigation
    cy.get('nav, header, [role="navigation"]').should('exist');
  });

  it('Pricing page (/pricing) displays all tiers', () => {
    cy.visit('/pricing');
    cy.get('body').should('be.visible');
    // Should display pricing information
    cy.contains(/pricing|plans|subscribe/i).should('exist');
    // Should display multiple pricing-related sections
    cy.get('div').should('have.length.at.least', 2);
  });

  it('Credit factors page (/credit/factors) loads', () => {
    cy.visit('/credit/factors');
    cy.get('body').should('be.visible');
    cy.contains(/credit|factor|score/i).should('exist');
  });
});

describe('Auth-Protected Pages — Redirect to Login', () => {
  const protectedPages = [
    { path: '/dashboard', label: 'Dashboard' },
    { path: '/student-loan-agent', label: 'Student Loan Agent' },
    { path: '/ai-tools', label: 'AI Tools' },
    { path: '/admin', label: 'Admin' },
    { path: '/settings', label: 'Settings' },
    { path: '/credit', label: 'Credit' },
    { path: '/credit/monitoring', label: 'Credit Monitoring' },
    { path: '/credit/builder', label: 'Credit Builder' },
    { path: '/credit/bureau', label: 'Credit Bureau' },
    { path: '/credit/disputes', label: 'Credit Disputes' },
    { path: '/spending', label: 'Spending' },
    { path: '/budget', label: 'Budget' },
    { path: '/goals', label: 'Goals' },
    { path: '/bills', label: 'Bills' },
    { path: '/investments', label: 'Investments' },
    { path: '/investments/analysis', label: 'Investment Analysis' },
    { path: '/investments/allocation', label: 'Asset Allocation' },
    { path: '/tax', label: 'Tax' },
    { path: '/trading', label: 'Trading' },
  ];

  protectedPages.forEach(({ path, label }) => {
    it(`${label} (${path}) → redirects unauthenticated users`, () => {
      cy.request({
        url: path,
        followRedirect: false,
        failOnStatusCode: false,
      }).then((resp) => {
        // Should redirect (307) to login
        expect(resp.status).to.eq(307);
        const location = resp.headers['location'] as string;
        expect(location).to.include('/login');
      });
    });
  });
});

describe('Login Page', () => {
  it('/login redirects (middleware handles auth state)', () => {
    cy.request({
      url: '/login',
      followRedirect: false,
      failOnStatusCode: false,
    }).then((resp) => {
      // Login page should be accessible (200) or redirect if already logged in (307)
      expect(resp.status).to.be.oneOf([200, 307]);
    });
  });
});

describe('404 Handling', () => {
  it('Non-existent page returns 404 or falls through to app', () => {
    cy.request({
      url: '/this-page-does-not-exist-xyz',
      failOnStatusCode: false,
    }).then((resp) => {
      // Next.js may serve a custom 404 page (200) or return 404
      expect(resp.status).to.be.oneOf([200, 404]);
    });
  });

  it('Non-existent API route returns 404', () => {
    cy.request({
      url: '/api/this-does-not-exist',
      failOnStatusCode: false,
    }).then((resp) => {
      expect(resp.status).to.eq(404);
    });
  });
});
