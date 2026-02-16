/**
 * Credit Repair API E2E Tests
 *
 * Tests the credit repair API endpoints — disputes, cards, negotiate,
 * goodwill, reports, score, impact, quick-wins. All require authentication.
 */

describe('Credit Repair API — Auth Protection', () => {
  const getEndpoints = [
    { url: '/api/credit-repair/disputes', label: 'Disputes' },
    { url: '/api/credit-repair/cards', label: 'Cards' },
    { url: '/api/credit-repair/negotiate', label: 'Negotiate' },
    { url: '/api/credit-repair/goodwill', label: 'Goodwill' },
    { url: '/api/credit-repair/reports', label: 'Reports' },
    { url: '/api/credit-repair/score', label: 'Score' },
    { url: '/api/credit-repair/quick-wins', label: 'Quick Wins' },
  ];

  getEndpoints.forEach(({ url, label }) => {
    it(`${label} GET → returns 401 without auth`, () => {
      cy.request({ url, failOnStatusCode: false }).then((resp) => {
        expect(resp.status).to.eq(401);
        expect(resp.body).to.have.property('error');
        expect(resp.body.error).to.be.a('string');
      });
    });
  });
});

describe('Credit Repair API — Method Enforcement', () => {
  it('Impact endpoint only accepts POST', () => {
    cy.request({
      url: '/api/credit-repair/impact',
      failOnStatusCode: false,
    }).then((resp) => {
      expect(resp.status).to.eq(405);
    });
  });

  it('Impact POST requires authentication', () => {
    cy.request({
      method: 'POST',
      url: '/api/credit-repair/impact',
      body: { action: 'pay_debt', amount: 1000 },
      failOnStatusCode: false,
    }).then((resp) => {
      expect(resp.status).to.be.oneOf([401, 400]);
    });
  });
});

describe('Credit Repair API — Dynamic Routes', () => {
  it('Dispute by ID requires authentication', () => {
    cy.request({
      url: '/api/credit-repair/disputes/test-dispute-123',
      failOnStatusCode: false,
    }).then((resp) => {
      expect(resp.status).to.be.oneOf([401, 404]);
    });
  });

  it('Card by ID requires authentication', () => {
    cy.request({
      url: '/api/credit-repair/cards/test-card-123',
      failOnStatusCode: false,
    }).then((resp) => {
      expect(resp.status).to.be.oneOf([401, 404]);
    });
  });

  it('Negotiate by ID requires authentication', () => {
    cy.request({
      url: '/api/credit-repair/negotiate/test-negotiation-123',
      failOnStatusCode: false,
    }).then((resp) => {
      expect(resp.status).to.be.oneOf([401, 404]);
    });
  });

  it('Goodwill by ID requires authentication', () => {
    cy.request({
      url: '/api/credit-repair/goodwill/test-goodwill-123',
      failOnStatusCode: false,
    }).then((resp) => {
      expect(resp.status).to.be.oneOf([401, 404]);
    });
  });

  it('Report by ID requires authentication', () => {
    cy.request({
      url: '/api/credit-repair/reports/test-report-123',
      failOnStatusCode: false,
    }).then((resp) => {
      expect(resp.status).to.be.oneOf([401, 404]);
    });
  });
});

describe('Credit Repair API — Response Format', () => {
  it('401 responses include consistent error shape', () => {
    cy.request({
      url: '/api/credit-repair/disputes',
      failOnStatusCode: false,
    }).then((resp) => {
      expect(resp.status).to.eq(401);
      expect(resp.headers['content-type']).to.include('application/json');
      expect(resp.body).to.be.an('object');
      expect(resp.body.error).to.be.a('string');
    });
  });
});
