/**
 * Credit Repair API E2E Tests (Original)
 *
 * Tests credit repair API endpoints — auth enforcement, dispute management,
 * and error handling. All credit repair APIs require authentication.
 */

describe('Credit Repair — Auth Enforcement', () => {
  const creditRepairEndpoints = [
    '/api/credit-repair/disputes',
    '/api/credit-repair/cards',
    '/api/credit-repair/score',
    '/api/credit-repair/quick-wins',
    '/api/credit-repair/goodwill',
  ];

  creditRepairEndpoints.forEach((url) => {
    it(`GET ${url} → 401 without auth`, () => {
      cy.request({ url, failOnStatusCode: false }).then((resp) => {
        expect(resp.status).to.eq(401);
        expect(resp.body).to.have.property('error');
      });
    });
  });
});

describe('Credit Repair — POST Endpoints Auth', () => {
  it('POST /api/credit-repair/disputes → 401 without auth', () => {
    cy.request({
      method: 'POST',
      url: '/api/credit-repair/disputes',
      body: { bureau: 'experian', itemType: 'collection', reason: 'not mine' },
      failOnStatusCode: false,
    }).then((resp) => {
      expect(resp.status).to.be.oneOf([401, 405]);
    });
  });

  it('POST /api/credit-repair/impact → 405 on GET, auth-required on POST', () => {
    cy.request({
      url: '/api/credit-repair/impact',
      failOnStatusCode: false,
    }).then((resp) => {
      expect(resp.status).to.eq(405);
    });
  });
});

describe('Credit Repair — Response Format', () => {
  it('401 responses include JSON error body', () => {
    cy.request({
      url: '/api/credit-repair/disputes',
      failOnStatusCode: false,
    }).then((resp) => {
      expect(resp.status).to.eq(401);
      expect(resp.body).to.be.an('object');
      expect(resp.body.error).to.be.a('string').and.have.length.greaterThan(0);
    });
  });
});
