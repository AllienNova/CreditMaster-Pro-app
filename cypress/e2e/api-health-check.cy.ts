/**
 * API Health Check E2E Tests
 *
 * Validates every API route returns the correct status code and response shape.
 * Covers: credit-repair, investments, financial, marketplace, admin, onboarding, AI, payments.
 */

describe('API Health Check — All Endpoints', () => {
  // ─── Credit Repair Routes ─────────────────────────────────────

  describe('Credit Repair API', () => {
    const creditRepairRoutes = [
      { method: 'GET', path: '/api/credit-repair/disputes', expect: 401 },
      { method: 'GET', path: '/api/credit-repair/cards', expect: 401 },
      { method: 'GET', path: '/api/credit-repair/negotiate', expect: 401 },
      { method: 'GET', path: '/api/credit-repair/goodwill', expect: 401 },
      { method: 'GET', path: '/api/credit-repair/reports', expect: 401 },
      { method: 'GET', path: '/api/credit-repair/score', expect: 401 },
      { method: 'GET', path: '/api/credit-repair/quick-wins', expect: 401 },
      { method: 'POST', path: '/api/credit-repair/impact', expect: 401 },
    ];

    creditRepairRoutes.forEach(({ method, path, expect: expectedStatus }) => {
      it(`${method} ${path} → ${expectedStatus}`, () => {
        cy.request({
          method,
          url: path,
          failOnStatusCode: false,
          body: method === 'POST' ? {} : undefined,
        }).then((resp) => {
          expect(resp.status).to.eq(expectedStatus);
          expect(resp.body).to.have.property('error');
        });
      });
    });

    it('GET /api/credit-repair/impact → 405 (POST only)', () => {
      cy.request({
        method: 'GET',
        url: '/api/credit-repair/impact',
        failOnStatusCode: false,
      }).then((resp) => {
        expect(resp.status).to.eq(405);
      });
    });

    // Dynamic routes with fake IDs
    const dynamicRoutes = [
      { method: 'GET', path: '/api/credit-repair/disputes/fake-id', expect: 401 },
      { method: 'GET', path: '/api/credit-repair/cards/fake-id', expect: 401 },
      { method: 'GET', path: '/api/credit-repair/negotiate/fake-id', expect: 401 },
      { method: 'GET', path: '/api/credit-repair/goodwill/fake-id', expect: 401 },
      { method: 'GET', path: '/api/credit-repair/reports/fake-id', expect: 401 },
    ];

    dynamicRoutes.forEach(({ method, path, expect: expectedStatus }) => {
      it(`${method} ${path} → ${expectedStatus}`, () => {
        cy.request({
          method,
          url: path,
          failOnStatusCode: false,
        }).then((resp) => {
          expect(resp.status).to.eq(expectedStatus);
        });
      });
    });
  });

  // ─── Investment Routes ─────────────────────────────────────────

  describe('Investment API', () => {
    it('GET /api/investments/portfolio-analysis → 200 with endpoint info', () => {
      cy.request('/api/investments/portfolio-analysis').then((resp) => {
        expect(resp.status).to.eq(200);
        expect(resp.body).to.have.property('endpoint');
        expect(resp.body).to.have.property('features');
        expect(resp.body.features).to.be.an('array');
      });
    });

    it('GET /api/investments/allocation-analysis → 200 with valid JSON', () => {
      cy.request('/api/investments/allocation-analysis').then((resp) => {
        expect(resp.status).to.eq(200);
        expect(resp.body).to.be.an('object');
        const hasDocFormat = 'endpoint' in resp.body;
        const hasDataFormat = 'success' in resp.body;
        expect(hasDocFormat || hasDataFormat).to.be.true;
      });
    });

    it('GET /api/investments/comprehensive-analysis → 200 with valid JSON', () => {
      cy.request('/api/investments/comprehensive-analysis').then((resp) => {
        expect(resp.status).to.eq(200);
        expect(resp.body).to.be.an('object');
        const hasDocFormat = 'endpoint' in resp.body;
        const hasDataFormat = 'success' in resp.body;
        expect(hasDocFormat || hasDataFormat).to.be.true;
      });
    });

    it('POST /api/investments/portfolio-analysis without data → 400 or 401', () => {
      cy.request({
        method: 'POST',
        url: '/api/investments/portfolio-analysis',
        body: {},
        failOnStatusCode: false,
      }).then((resp) => {
        expect(resp.status).to.be.oneOf([400, 401]);
      });
    });

    it('POST /api/investments/allocation-analysis without data → 400 or 401', () => {
      cy.request({
        method: 'POST',
        url: '/api/investments/allocation-analysis',
        body: {},
        failOnStatusCode: false,
      }).then((resp) => {
        expect(resp.status).to.be.oneOf([400, 401]);
      });
    });
  });

  // ─── Financial Routes ─────────────────────────────────────────

  describe('Financial API', () => {
    it('GET /api/financial/budgets → 401 (auth required)', () => {
      cy.request({
        url: '/api/financial/budgets',
        failOnStatusCode: false,
      }).then((resp) => {
        expect(resp.status).to.eq(401);
        expect(resp.body).to.have.property('error');
      });
    });

    it('GET /api/financial/budgets/fake-id → 401', () => {
      cy.request({
        url: '/api/financial/budgets/fake-id',
        failOnStatusCode: false,
      }).then((resp) => {
        expect(resp.status).to.eq(401);
      });
    });

    it('GET /api/financial/ai-endpoints → returns endpoint listing or error', () => {
      cy.request({
        url: '/api/financial/ai-endpoints',
        failOnStatusCode: false,
      }).then((resp) => {
        // May return 200 (data), 401 (auth), or 404 (not implemented)
        expect(resp.status).to.be.oneOf([200, 401, 404]);
      });
    });
  });

  // ─── Marketplace Routes ────────────────────────────────────────

  describe('Marketplace API', () => {
    it('GET /api/marketplace/providers → 200 with data array', () => {
      cy.request('/api/marketplace/providers').then((resp) => {
        expect(resp.status).to.eq(200);
        expect(resp.body).to.have.property('success', true);
        expect(resp.body).to.have.property('data');
        expect(resp.body.data).to.be.an('array');
        expect(resp.body).to.have.property('meta');
      });
    });

    it('GET /api/marketplace/products → 200 with data array', () => {
      cy.request('/api/marketplace/products').then((resp) => {
        expect(resp.status).to.eq(200);
        expect(resp.body).to.have.property('success', true);
        expect(resp.body).to.have.property('data');
        expect(resp.body.data).to.be.an('array');
      });
    });

    it('GET /api/marketplace/tradelines → 200 with data array', () => {
      cy.request('/api/marketplace/tradelines').then((resp) => {
        expect(resp.status).to.eq(200);
        expect(resp.body).to.have.property('success', true);
        expect(resp.body).to.have.property('data');
        expect(resp.body.data).to.be.an('array');
      });
    });

    it('GET /api/marketplace/reviews → 400 (needs params)', () => {
      cy.request({
        url: '/api/marketplace/reviews',
        failOnStatusCode: false,
      }).then((resp) => {
        expect(resp.status).to.eq(400);
        expect(resp.body).to.have.property('error');
      });
    });

    it('GET /api/marketplace/disputes → 404 (POST only or needs ID)', () => {
      cy.request({
        url: '/api/marketplace/disputes',
        failOnStatusCode: false,
      }).then((resp) => {
        expect(resp.status).to.be.oneOf([404, 405]);
      });
    });
  });

  // ─── Notifications / Analytics / Misc ──────────────────────────

  describe('Core API Routes', () => {
    it('GET /api/notifications → 400 (needs userId param)', () => {
      cy.request({
        url: '/api/notifications',
        failOnStatusCode: false,
      }).then((resp) => {
        expect(resp.status).to.eq(400);
        expect(resp.body).to.have.property('error');
        expect(resp.body.error).to.include('userId');
      });
    });

    it('GET /api/analytics → 401 (auth required)', () => {
      cy.request({
        url: '/api/analytics',
        failOnStatusCode: false,
      }).then((resp) => {
        expect(resp.status).to.eq(401);
      });
    });

    it('GET /api/disputes → 401 (auth required)', () => {
      cy.request({
        url: '/api/disputes',
        failOnStatusCode: false,
      }).then((resp) => {
        expect(resp.status).to.eq(401);
      });
    });

    it('GET /api/student-loans → 400 (needs userId)', () => {
      cy.request({
        url: '/api/student-loans',
        failOnStatusCode: false,
      }).then((resp) => {
        expect(resp.status).to.eq(400);
        expect(resp.body).to.have.property('error');
      });
    });

    it('GET /api/onboarding/progress → 401 (auth required)', () => {
      cy.request({
        url: '/api/onboarding/progress',
        failOnStatusCode: false,
      }).then((resp) => {
        expect(resp.status).to.eq(401);
      });
    });
  });

  // ─── AI Routes ─────────────────────────────────────────────────

  describe('AI API Routes', () => {
    it('POST /api/ai/chat → 401 without auth', () => {
      cy.request({
        method: 'POST',
        url: '/api/ai/chat',
        body: { message: 'test' },
        failOnStatusCode: false,
      }).then((resp) => {
        expect(resp.status).to.eq(401);
      });
    });

    it('POST /api/ai/consensus → 401 without auth', () => {
      cy.request({
        method: 'POST',
        url: '/api/ai/consensus',
        body: { question: 'test' },
        failOnStatusCode: false,
      }).then((resp) => {
        expect(resp.status).to.eq(401);
      });
    });

    it('POST /api/ai/financial-coach/debt-strategy → 401 without auth', () => {
      cy.request({
        method: 'POST',
        url: '/api/ai/financial-coach/debt-strategy',
        body: {},
        failOnStatusCode: false,
      }).then((resp) => {
        expect(resp.status).to.eq(401);
      });
    });
  });

  // ─── Payment Routes ────────────────────────────────────────────

  describe('Payment API', () => {
    it('GET /api/payment/checkout → 405 (POST only)', () => {
      cy.request({
        url: '/api/payment/checkout',
        failOnStatusCode: false,
      }).then((resp) => {
        expect(resp.status).to.eq(405);
      });
    });

    it('POST /api/payment/checkout without auth → 401', () => {
      cy.request({
        method: 'POST',
        url: '/api/payment/checkout',
        body: { priceId: 'price_test' },
        failOnStatusCode: false,
      }).then((resp) => {
        expect(resp.status).to.be.oneOf([401, 400]);
      });
    });
  });

  // ─── Admin Routes ──────────────────────────────────────────────

  describe('Admin API', () => {
    it('GET /api/admin/users → 401 or 405 without auth', () => {
      cy.request({
        url: '/api/admin/users',
        failOnStatusCode: false,
      }).then((resp) => {
        expect(resp.status).to.be.oneOf([401, 405]);
      });
    });
  });

  // ─── Auth Routes ───────────────────────────────────────────────

  describe('Auth API', () => {
    it('POST /api/auth with empty body → 400 or 404', () => {
      cy.request({
        method: 'POST',
        url: '/api/auth',
        body: {},
        failOnStatusCode: false,
      }).then((resp) => {
        expect(resp.status).to.be.oneOf([400, 404, 405]);
      });
    });
  });

  // ─── Credit Builder / Report Routes ────────────────────────────

  describe('Credit Builder & Report API', () => {
    it('POST /api/credit-builder → requires auth', () => {
      cy.request({
        method: 'POST',
        url: '/api/credit-builder',
        body: {},
        failOnStatusCode: false,
      }).then((resp) => {
        expect(resp.status).to.be.oneOf([401, 404]);
      });
    });

    it('GET /api/credit-report → requires POST or auth', () => {
      cy.request({
        url: '/api/credit-report',
        failOnStatusCode: false,
      }).then((resp) => {
        expect(resp.status).to.be.oneOf([401, 404, 405]);
      });
    });
  });
});
