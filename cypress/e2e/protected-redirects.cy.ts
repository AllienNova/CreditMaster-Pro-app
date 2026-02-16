/**
 * Protected Page Redirect E2E Tests
 *
 * Validates that ALL auth-protected pages correctly redirect
 * unauthenticated users to /login with a 307 status code.
 * This is a critical security test — no protected page should
 * leak content without authentication.
 */

describe('Protected Pages — Full Redirect Verification', () => {
  const protectedPages = [
    // Core app pages
    { path: '/dashboard', label: 'Dashboard' },
    { path: '/student-loan-agent', label: 'Student Loan Agent' },
    { path: '/ai-tools', label: 'AI Tools' },
    { path: '/admin', label: 'Admin' },
    { path: '/settings', label: 'Settings' },

    // Credit module
    { path: '/credit', label: 'Credit Hub' },
    { path: '/credit/monitoring', label: 'Credit Monitoring' },
    { path: '/credit/builder', label: 'Credit Builder' },
    { path: '/credit/bureau', label: 'Credit Bureau' },
    { path: '/credit/disputes', label: 'Credit Disputes' },

    // Financial management
    { path: '/spending', label: 'Spending' },
    { path: '/budget', label: 'Budget' },
    { path: '/goals', label: 'Goals' },
    { path: '/bills', label: 'Bills' },

    // Investment & trading
    { path: '/investments', label: 'Investments' },
    { path: '/investments/analysis', label: 'Investment Analysis' },
    { path: '/investments/allocation', label: 'Asset Allocation' },
    { path: '/trading', label: 'Trading' },

    // Tax
    { path: '/tax', label: 'Tax' },
  ];

  protectedPages.forEach(({ path, label }) => {
    it(`${label} (${path}) → 307 redirect to /login`, () => {
      cy.request({
        url: path,
        followRedirect: false,
        failOnStatusCode: false,
      }).then((resp) => {
        expect(resp.status).to.eq(307);
        const location = resp.headers['location'] as string;
        expect(location).to.include('/login');
      });
    });
  });
});

describe('Public Pages — No Redirect', () => {
  const publicPages = [
    { path: '/', label: 'Landing Page' },
    { path: '/pricing', label: 'Pricing' },
    { path: '/credit/factors', label: 'Credit Factors' },
  ];

  publicPages.forEach(({ path, label }) => {
    it(`${label} (${path}) → returns 200`, () => {
      cy.request({
        url: path,
        followRedirect: false,
        failOnStatusCode: false,
      }).then((resp) => {
        expect(resp.status).to.eq(200);
      });
    });
  });
});

describe('Login Page Accessibility', () => {
  it('/login → accessible (200 or redirect if already auth)', () => {
    cy.request({
      url: '/login',
      followRedirect: false,
      failOnStatusCode: false,
    }).then((resp) => {
      expect(resp.status).to.be.oneOf([200, 307]);
    });
  });
});
