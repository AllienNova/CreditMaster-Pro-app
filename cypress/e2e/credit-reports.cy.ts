/**
 * Credit Reports E2E Tests
 *
 * Tests credit report related pages and APIs.
 * Protected pages redirect to login; APIs return 401 without auth.
 */

describe('Credit Reports — Page Access', () => {
  it('/credit → redirects to login (protected)', () => {
    cy.request({
      url: '/credit',
      followRedirect: false,
      failOnStatusCode: false,
    }).then((resp) => {
      expect(resp.status).to.eq(307);
      const location = resp.headers['location'] as string;
      expect(location).to.include('/login');
    });
  });

  it('/credit/monitoring → redirects to login (protected)', () => {
    cy.request({
      url: '/credit/monitoring',
      followRedirect: false,
      failOnStatusCode: false,
    }).then((resp) => {
      expect(resp.status).to.eq(307);
      const location = resp.headers['location'] as string;
      expect(location).to.include('/login');
    });
  });

  it('/credit/builder → redirects to login (protected)', () => {
    cy.request({
      url: '/credit/builder',
      followRedirect: false,
      failOnStatusCode: false,
    }).then((resp) => {
      expect(resp.status).to.eq(307);
      const location = resp.headers['location'] as string;
      expect(location).to.include('/login');
    });
  });

  it('/credit/disputes → redirects to login (protected)', () => {
    cy.request({
      url: '/credit/disputes',
      followRedirect: false,
      failOnStatusCode: false,
    }).then((resp) => {
      expect(resp.status).to.eq(307);
      const location = resp.headers['location'] as string;
      expect(location).to.include('/login');
    });
  });

  it('/credit/factors → public page (200)', () => {
    cy.request({
      url: '/credit/factors',
      followRedirect: false,
      failOnStatusCode: false,
    }).then((resp) => {
      expect(resp.status).to.eq(200);
    });
  });
});

describe('Credit Reports — API Auth', () => {
  it('GET /api/credit-repair/score → 401 without auth', () => {
    cy.request({
      url: '/api/credit-repair/score',
      failOnStatusCode: false,
    }).then((resp) => {
      expect(resp.status).to.eq(401);
      expect(resp.body).to.have.property('error');
    });
  });

  it('GET /api/credit-repair/disputes → 401 without auth', () => {
    cy.request({
      url: '/api/credit-repair/disputes',
      failOnStatusCode: false,
    }).then((resp) => {
      expect(resp.status).to.eq(401);
      expect(resp.body).to.have.property('error');
    });
  });
});
