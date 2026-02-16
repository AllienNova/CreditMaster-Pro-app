/**
 * AI API E2E Tests
 *
 * Tests AI-powered endpoints — chat, consensus, financial coaching.
 * All AI endpoints require authentication.
 */

describe('AI API — Auth Protection', () => {
  it('POST /api/ai/chat → requires authentication', () => {
    cy.request({
      method: 'POST',
      url: '/api/ai/chat',
      body: { message: 'Hello, what is my credit score?' },
      failOnStatusCode: false,
      timeout: 60000,
    }).then((resp) => {
      expect(resp.status).to.eq(401);
      expect(resp.body).to.have.property('error');
    });
  });

  it('POST /api/ai/consensus → requires authentication', () => {
    cy.request({
      method: 'POST',
      url: '/api/ai/consensus',
      body: { question: 'Should I refinance my mortgage?' },
      failOnStatusCode: false,
      timeout: 60000,
    }).then((resp) => {
      expect(resp.status).to.eq(401);
      expect(resp.body).to.have.property('error');
    });
  });

  it('POST /api/ai/financial-coach/debt-strategy → requires authentication', () => {
    cy.request({
      method: 'POST',
      url: '/api/ai/financial-coach/debt-strategy',
      body: {
        debts: [{ name: 'Credit Card', balance: 5000, rate: 19.99 }],
      },
      failOnStatusCode: false,
      timeout: 60000,
    }).then((resp) => {
      expect(resp.status).to.eq(401);
      expect(resp.body).to.have.property('error');
    });
  });
});

describe('AI API — Request Validation', () => {
  it('POST /api/ai/chat with empty body returns error', () => {
    cy.request({
      method: 'POST',
      url: '/api/ai/chat',
      body: {},
      failOnStatusCode: false,
      timeout: 60000,
    }).then((resp) => {
      // Should return 401 (auth first) or 400 (validation)
      expect(resp.status).to.be.oneOf([400, 401]);
    });
  });

  it('POST /api/ai/consensus with empty body returns error', () => {
    cy.request({
      method: 'POST',
      url: '/api/ai/consensus',
      body: {},
      failOnStatusCode: false,
      timeout: 60000,
    }).then((resp) => {
      expect(resp.status).to.be.oneOf([400, 401]);
    });
  });
});

describe('AI API — GET Returns Info or Auth Error', () => {
  it('GET /api/ai/chat → returns endpoint info or auth error', () => {
    cy.request({
      url: '/api/ai/chat',
      failOnStatusCode: false,
      timeout: 60000,
    }).then((resp) => {
      // AI routes may return 200 (endpoint info) or 401 (auth required)
      expect(resp.status).to.be.oneOf([200, 401]);
      expect(resp.body).to.be.an('object');
    });
  });

  it('GET /api/ai/consensus → returns endpoint info or auth error', () => {
    cy.request({
      url: '/api/ai/consensus',
      failOnStatusCode: false,
      timeout: 60000,
    }).then((resp) => {
      expect(resp.status).to.be.oneOf([200, 401]);
      expect(resp.body).to.be.an('object');
    });
  });
});
