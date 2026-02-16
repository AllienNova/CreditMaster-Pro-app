/**
 * Authentication E2E Tests
 *
 * Tests authentication flows — login page display, protected route redirects,
 * public page access. Tests that require a real authenticated session are
 * skipped unless TEST_USER_EMAIL and TEST_USER_PASSWORD env vars are set.
 */

describe('Authentication — Login Page', () => {
  it('should display login page at /login', () => {
    cy.visit('/login');
    cy.get('body').should('be.visible');
    // Login page should have email and password inputs or auth UI
    cy.get('input, button, a').should('have.length.at.least', 1);
  });

  it('/login returns 200 or redirects if already authenticated', () => {
    cy.request({
      url: '/login',
      followRedirect: false,
      failOnStatusCode: false,
    }).then((resp) => {
      expect(resp.status).to.be.oneOf([200, 307]);
    });
  });
});

describe('Authentication — Protected Routes Redirect', () => {
  const protectedRoutes = [
    '/dashboard',
    '/ai-tools',
    '/admin',
    '/settings',
    '/credit',
    '/investments',
  ];

  protectedRoutes.forEach((route) => {
    it(`${route} → redirects unauthenticated users to /login`, () => {
      cy.request({
        url: route,
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

describe('Authentication — Public Pages Accessible', () => {
  it('Landing page (/) is public', () => {
    cy.request({
      url: '/',
      followRedirect: false,
      failOnStatusCode: false,
    }).then((resp) => {
      expect(resp.status).to.eq(200);
    });
  });

  it('Pricing page (/pricing) is public', () => {
    cy.request({
      url: '/pricing',
      followRedirect: false,
      failOnStatusCode: false,
    }).then((resp) => {
      expect(resp.status).to.eq(200);
    });
  });

  it('Credit factors page (/credit/factors) is public', () => {
    cy.request({
      url: '/credit/factors',
      followRedirect: false,
      failOnStatusCode: false,
    }).then((resp) => {
      expect(resp.status).to.eq(200);
    });
  });
});

describe('Authentication — API Auth Enforcement', () => {
  it('Protected API returns 401 without auth token', () => {
    cy.request({
      url: '/api/credit-repair/disputes',
      failOnStatusCode: false,
    }).then((resp) => {
      expect(resp.status).to.eq(401);
      expect(resp.body).to.have.property('error');
    });
  });

  it('AI API returns 401 without auth token', () => {
    cy.request({
      method: 'POST',
      url: '/api/ai/chat',
      body: { message: 'test' },
      failOnStatusCode: false,
      timeout: 60000,
    }).then((resp) => {
      expect(resp.status).to.eq(401);
      expect(resp.body).to.have.property('error');
    });
  });
});
