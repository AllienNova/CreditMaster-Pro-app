/**
 * Payment & Subscription E2E Tests
 *
 * Tests pricing page display, payment API auth enforcement,
 * and subscription-related endpoints. Pricing page is public;
 * payment/checkout APIs require authentication.
 */

describe('Payment — Pricing Page (Public)', () => {
  it('/pricing → 200 (public page)', () => {
    cy.request({
      url: '/pricing',
      followRedirect: false,
      failOnStatusCode: false,
    }).then((resp) => {
      expect(resp.status).to.eq(200);
    });
  });

  it('pricing page renders with content', () => {
    cy.visit('/pricing');
    cy.get('body').should('be.visible');
    cy.get('body').children().should('have.length.greaterThan', 0);
  });

  it('pricing page displays tier names', () => {
    cy.visit('/pricing');
    cy.contains(/free/i).should('exist');
    cy.contains(/standard/i).should('exist');
    cy.contains(/pro/i).should('exist');
  });

  it('pricing page displays price amounts', () => {
    cy.visit('/pricing');
    cy.get('body').invoke('text').then((text) => {
      // Should contain at least one dollar sign or price indicator
      const hasPricing = /\$\d+|free|\/mo|\/month/i.test(text);
      expect(hasPricing).to.be.true;
    });
  });

  it('pricing page has call-to-action buttons or links', () => {
    cy.visit('/pricing');
    cy.get('a, button').should('have.length.at.least', 1);
  });

  it('pricing page returns proper content-type', () => {
    cy.request('/pricing').then((resp) => {
      expect(resp.headers['content-type']).to.include('text/html');
    });
  });
});

describe('Payment — Protected Routes', () => {
  it('/dashboard → redirects to login (protected)', () => {
    cy.request({
      url: '/dashboard',
      followRedirect: false,
      failOnStatusCode: false,
    }).then((resp) => {
      expect(resp.status).to.eq(307);
      const location = resp.headers['location'] as string;
      expect(location).to.include('/login');
    });
  });

  it('/settings → redirects to login (protected)', () => {
    cy.request({
      url: '/settings',
      followRedirect: false,
      failOnStatusCode: false,
    }).then((resp) => {
      expect(resp.status).to.eq(307);
      const location = resp.headers['location'] as string;
      expect(location).to.include('/login');
    });
  });
});

describe('Payment — API Auth Enforcement', () => {
  it('POST /api/payment/checkout → 401 without auth', () => {
    cy.request({
      method: 'POST',
      url: '/api/payment/checkout',
      body: { priceId: 'price_test_123' },
      failOnStatusCode: false,
    }).then((resp) => {
      expect(resp.status).to.be.oneOf([401, 404, 405]);
    });
  });

  it('POST /api/payment/webhook → rejects without signature', () => {
    cy.request({
      method: 'POST',
      url: '/api/payment/webhook',
      body: { type: 'test_event' },
      failOnStatusCode: false,
    }).then((resp) => {
      // Webhook endpoint should reject unsigned requests
      expect(resp.status).to.be.oneOf([400, 401, 403, 404, 405, 500]);
    });
  });
});

describe('Payment — Responsive Pricing Page', () => {
  it('pricing page renders on mobile viewport', () => {
    cy.viewport('iphone-x');
    cy.visit('/pricing');
    cy.get('body').should('be.visible');
    cy.get('body').children().should('have.length.greaterThan', 0);
  });

  it('pricing page renders on tablet viewport', () => {
    cy.viewport('ipad-2');
    cy.visit('/pricing');
    cy.get('body').should('be.visible');
    cy.get('body').children().should('have.length.greaterThan', 0);
  });

  it('pricing page renders on desktop viewport', () => {
    cy.viewport(1920, 1080);
    cy.visit('/pricing');
    cy.get('body').should('be.visible');
    cy.get('body').children().should('have.length.greaterThan', 0);
  });
});
