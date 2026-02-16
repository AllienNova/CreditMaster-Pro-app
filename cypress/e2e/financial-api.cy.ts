/**
 * Financial API E2E Tests
 *
 * Tests financial management endpoints — budgets, spending, bills, goals, savings.
 * All financial endpoints require authentication.
 */

describe('Financial API — Auth Required', () => {
  const authProtectedEndpoints = [
    { url: '/api/financial/budgets', label: 'Budgets' },
    { url: '/api/financial/spending', label: 'Spending' },
    { url: '/api/financial/bills', label: 'Bills' },
    { url: '/api/financial/goals', label: 'Goals' },
    { url: '/api/financial/savings', label: 'Savings' },
  ];

  authProtectedEndpoints.forEach(({ url, label }) => {
    it(`${label} GET → requires authentication (401)`, () => {
      cy.request({
        url,
        failOnStatusCode: false,
      }).then((resp) => {
        // Should return 401 or 404 (not yet implemented)
        expect(resp.status).to.be.oneOf([401, 404]);
        if (resp.status === 401) {
          expect(resp.body).to.have.property('error');
        }
      });
    });
  });

  it('Budgets POST → requires authentication', () => {
    cy.request({
      method: 'POST',
      url: '/api/financial/budgets',
      body: {
        name: 'Groceries',
        amount: 500,
        category: 'food',
        period: 'monthly',
      },
      failOnStatusCode: false,
    }).then((resp) => {
      expect(resp.status).to.be.oneOf([401, 404, 405]);
    });
  });
});

describe('Analytics API', () => {
  it('GET /api/analytics → requires authentication', () => {
    cy.request({
      url: '/api/analytics',
      failOnStatusCode: false,
    }).then((resp) => {
      expect(resp.status).to.be.oneOf([401, 404]);
    });
  });
});

describe('Onboarding API', () => {
  it('GET /api/onboarding/progress → requires authentication', () => {
    cy.request({
      url: '/api/onboarding/progress',
      failOnStatusCode: false,
    }).then((resp) => {
      expect(resp.status).to.eq(401);
      expect(resp.body).to.have.property('error');
    });
  });
});
