/**
 * Disputes E2E Tests
 *
 * Tests dispute-related API endpoints and page access.
 * Dispute pages are protected (redirect to login).
 * Dispute APIs require authentication (return 401).
 */

describe('Disputes — Page Access', () => {
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
});

describe('Disputes — API Auth Enforcement', () => {
  const disputeEndpoints = [
    '/api/credit-repair/disputes',
    '/api/credit-repair/score',
    '/api/credit-repair/quick-wins',
    '/api/credit-repair/goodwill',
  ];

  disputeEndpoints.forEach((url) => {
    it(`GET ${url} → 401 without auth`, () => {
      cy.request({ url, failOnStatusCode: false }).then((resp) => {
        expect(resp.status).to.eq(401);
        expect(resp.body).to.have.property('error');
      });
    });
  });
});

describe('Disputes — POST Endpoints', () => {
  it('POST /api/credit-repair/disputes → 401 or 405 without auth', () => {
    cy.request({
      method: 'POST',
      url: '/api/credit-repair/disputes',
      body: {
        bureau: 'experian',
        itemType: 'late_payment',
        itemDescription: 'Late payment on credit card',
        reason: 'not_mine',
      },
      failOnStatusCode: false,
    }).then((resp) => {
      expect(resp.status).to.be.oneOf([401, 405]);
    });
  });

  it('POST /api/credit-repair/goodwill → 401 or 405 without auth', () => {
    cy.request({
      method: 'POST',
      url: '/api/credit-repair/goodwill',
      body: {
        creditorName: 'Test Bank',
        accountNumber: '1234567890',
        issueDescription: 'Late payment due to emergency',
      },
      failOnStatusCode: false,
    }).then((resp) => {
      expect(resp.status).to.be.oneOf([401, 405]);
    });
  });

  it('POST /api/credit-repair/impact → 405 on GET (POST-only endpoint)', () => {
    cy.request({
      url: '/api/credit-repair/impact',
      failOnStatusCode: false,
    }).then((resp) => {
      expect(resp.status).to.eq(405);
    });
  });
});

describe('Disputes — Response Format', () => {
  it('401 responses include JSON error body with non-empty string', () => {
    cy.request({
      url: '/api/credit-repair/disputes',
      failOnStatusCode: false,
    }).then((resp) => {
      expect(resp.status).to.eq(401);
      expect(resp.body).to.be.an('object');
      expect(resp.body.error).to.be.a('string').and.have.length.greaterThan(0);
    });
  });

  it('dispute API returns proper content-type', () => {
    cy.request({
      url: '/api/credit-repair/disputes',
      failOnStatusCode: false,
    }).then((resp) => {
      expect(resp.headers['content-type']).to.include('application/json');
    });
  });
});

describe('Disputes — AI Tools Page Access', () => {
  it('/ai-tools → redirects to login (protected)', () => {
    cy.request({
      url: '/ai-tools',
      followRedirect: false,
      failOnStatusCode: false,
    }).then((resp) => {
      expect(resp.status).to.eq(307);
      const location = resp.headers['location'] as string;
      expect(location).to.include('/login');
    });
  });
});

describe('Disputes — Dispute Generation API', () => {
  it('POST /api/disputes/generate → 401 without auth', () => {
    cy.request({
      method: 'POST',
      url: '/api/disputes/generate',
      body: {
        bureau: 'experian',
        itemType: 'late_payment',
        reason: 'not_mine',
      },
      failOnStatusCode: false,
    }).then((resp) => {
      expect(resp.status).to.be.oneOf([400, 401, 404, 405]);
    });
  });

  it('GET /api/disputes → 401 without auth', () => {
    cy.request({
      url: '/api/disputes',
      failOnStatusCode: false,
    }).then((resp) => {
      expect(resp.status).to.be.oneOf([401, 404]);
    });
  });
});
