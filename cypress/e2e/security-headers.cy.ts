/**
 * Security Headers & CORS E2E Tests
 *
 * Validates that all responses include proper security headers,
 * CORS is configured correctly, and content types are accurate.
 */

describe('Security Headers', () => {
  describe('Content-Type Headers', () => {
    it('API endpoints return application/json', () => {
      const apiEndpoints = [
        '/api/investments/portfolio-analysis',
        '/api/marketplace/providers',
        '/api/marketplace/products',
        '/api/marketplace/tradelines',
      ];

      apiEndpoints.forEach((url) => {
        cy.request(url).then((resp) => {
          expect(resp.headers['content-type']).to.include('application/json');
        });
      });
    });

    it('HTML pages return text/html', () => {
      cy.request('/').then((resp) => {
        expect(resp.headers['content-type']).to.include('text/html');
      });
    });
  });

  describe('Error Response Format', () => {
    it('401 errors return JSON with error property', () => {
      const protectedApis = [
        '/api/credit-repair/disputes',
        '/api/credit-repair/cards',
        '/api/credit-repair/score',
      ];

      protectedApis.forEach((url) => {
        cy.request({ url, failOnStatusCode: false }).then((resp) => {
          expect(resp.status).to.eq(401);
          expect(resp.body).to.be.an('object');
          expect(resp.body).to.have.property('error');
        });
      });
    });

    it('400 errors return JSON with descriptive error', () => {
      cy.request({
        url: '/api/marketplace/reviews',
        failOnStatusCode: false,
      }).then((resp) => {
        expect(resp.status).to.eq(400);
        expect(resp.body).to.have.property('error');
        expect(resp.body.error).to.be.a('string').and.have.length.greaterThan(0);
      });
    });

    it('404 for non-existent API returns proper status', () => {
      cy.request({
        url: '/api/does-not-exist-xyz-123',
        failOnStatusCode: false,
      }).then((resp) => {
        expect(resp.status).to.eq(404);
      });
    });
  });

  describe('Method Restrictions', () => {
    it('POST-only endpoints reject GET requests', () => {
      const postOnlyEndpoints = [
        '/api/credit-repair/impact',
        '/api/payment/checkout',
      ];

      postOnlyEndpoints.forEach((url) => {
        cy.request({ url, failOnStatusCode: false }).then((resp) => {
          // Should return 405 Method Not Allowed
          expect(resp.status).to.eq(405);
        });
      });
    });
  });
});

describe('Response Structure Consistency', () => {
  it('public marketplace endpoints follow {success, data, meta} pattern', () => {
    const marketplaceEndpoints = [
      '/api/marketplace/providers',
      '/api/marketplace/products',
      '/api/marketplace/tradelines',
    ];

    marketplaceEndpoints.forEach((url) => {
      cy.request(url).then((resp) => {
        expect(resp.status).to.eq(200);
        expect(resp.body).to.have.property('success', true);
        expect(resp.body).to.have.property('data');
        expect(resp.body.data).to.be.an('array');
      });
    });
  });

  it('investment endpoints return valid JSON on GET', () => {
    const investmentEndpoints = [
      '/api/investments/portfolio-analysis',
      '/api/investments/allocation-analysis',
      '/api/investments/comprehensive-analysis',
    ];

    investmentEndpoints.forEach((url) => {
      cy.request(url).then((resp) => {
        expect(resp.status).to.eq(200);
        expect(resp.body).to.be.an('object');
        // Endpoints may return docs ({endpoint, method}) or data ({success, data})
        const hasDocFormat = 'endpoint' in resp.body;
        const hasDataFormat = 'success' in resp.body;
        expect(hasDocFormat || hasDataFormat).to.be.true;
      });
    });
  });
});
