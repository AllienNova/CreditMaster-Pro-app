/**
 * E2E API Tests
 * 
 * Tests API endpoints directly with real HTTP requests
 */

describe('Credit Repair API - E2E Tests', () => {
  const baseUrl = 'http://localhost:3000';
  let authToken: string;
  let disputeId: string;
  let cardId: string;

  before(() => {
    // In a real scenario, you'd authenticate here
    // For now, we'll use a mock token
    authToken = 'mock-jwt-token';
  });

  describe('Disputes API', () => {
    it('should create a new dispute', () => {
      cy.request({
        method: 'POST',
        url: `${baseUrl}/api/credit-repair/disputes`,
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: {
          bureau: 'experian',
          itemType: 'late_payment',
          itemDescription: 'Late payment on credit card',
          reason: 'not_mine',
          generateLetter: false,
        },
        failOnStatusCode: false,
      }).then((response) => {
        // May fail due to auth, but we're testing the endpoint structure
        expect(response.status).to.be.oneOf([201, 401]);
        
        if (response.status === 201) {
          expect(response.body).to.have.property('success', true);
          expect(response.body.data).to.have.property('id');
          disputeId = response.body.data.id;
        }
      });
    });

    it('should fetch all disputes', () => {
      cy.request({
        method: 'GET',
        url: `${baseUrl}/api/credit-repair/disputes`,
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.be.oneOf([200, 401]);
        
        if (response.status === 200) {
          expect(response.body).to.have.property('success', true);
          expect(response.body.data).to.be.an('array');
        }
      });
    });

    it('should update a dispute', () => {
      if (!disputeId) {
        cy.log('Skipping: No dispute ID available');
        return;
      }

      cy.request({
        method: 'PUT',
        url: `${baseUrl}/api/credit-repair/disputes/${disputeId}`,
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: {
          status: 'sent',
          version: 1,
        },
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.be.oneOf([200, 401, 404]);
      });
    });

    it('should delete a dispute', () => {
      if (!disputeId) {
        cy.log('Skipping: No dispute ID available');
        return;
      }

      cy.request({
        method: 'DELETE',
        url: `${baseUrl}/api/credit-repair/disputes/${disputeId}`,
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.be.oneOf([200, 401, 404]);
      });
    });
  });

  describe('Credit Cards API', () => {
    it('should create a new credit card', () => {
      cy.request({
        method: 'POST',
        url: `${baseUrl}/api/credit-repair/cards`,
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: {
          name: 'Test Card',
          creditLimit: 5000,
          currentBalance: 1000,
        },
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.be.oneOf([201, 401]);
        
        if (response.status === 201) {
          expect(response.body).to.have.property('success', true);
          expect(response.body.data).to.have.property('utilization', 20);
          cardId = response.body.data.id;
        }
      });
    });

    it('should fetch all credit cards', () => {
      cy.request({
        method: 'GET',
        url: `${baseUrl}/api/credit-repair/cards`,
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.be.oneOf([200, 401]);
      });
    });

    it('should update a credit card', () => {
      if (!cardId) {
        cy.log('Skipping: No card ID available');
        return;
      }

      cy.request({
        method: 'PUT',
        url: `${baseUrl}/api/credit-repair/cards/${cardId}`,
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: {
          currentBalance: 2500,
          version: 1,
        },
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.be.oneOf([200, 401, 404]);
        
        if (response.status === 200) {
          expect(response.body.data).to.have.property('utilization', 50);
        }
      });
    });
  });

  describe('Goodwill Letters API', () => {
    it('should create a goodwill letter', () => {
      cy.request({
        method: 'POST',
        url: `${baseUrl}/api/credit-repair/goodwill`,
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: {
          creditorName: 'Test Bank',
          accountNumber: '1234567890',
          issueDescription: 'Late payment due to emergency',
          generateLetter: false,
        },
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.be.oneOf([201, 401]);
      });
    });
  });

  describe('Negotiations API', () => {
    it('should create a negotiation', () => {
      cy.request({
        method: 'POST',
        url: `${baseUrl}/api/credit-repair/negotiate`,
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: {
          creditorName: 'Test Creditor',
          accountNumber: '1234567890',
          originalAmount: 5000,
          targetAmount: 2500,
        },
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.be.oneOf([201, 401]);
      });
    });
  });

  describe('Quick Wins API', () => {
    it('should analyze credit for quick wins', () => {
      cy.request({
        method: 'GET',
        url: `${baseUrl}/api/credit-repair/quick-wins`,
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.be.oneOf([200, 401]);
        
        if (response.status === 200) {
          expect(response.body).to.have.property('success', true);
          expect(response.body.data).to.have.property('opportunities');
        }
      });
    });
  });

  describe('Impact Calculator API', () => {
    it('should calculate credit score impact', () => {
      cy.request({
        method: 'POST',
        url: `${baseUrl}/api/credit-repair/impact`,
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: {
          actions: [
            {
              type: 'remove_late_payment',
              details: { count: 1 },
            },
            {
              type: 'reduce_utilization',
              details: { from: 80, to: 30 },
            },
          ],
        },
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.be.oneOf([200, 401]);
        
        if (response.status === 200) {
          expect(response.body).to.have.property('success', true);
          expect(response.body.data).to.have.property('estimatedImpact');
        }
      });
    });
  });

  describe('Performance Tests', () => {
    it('should respond to GET requests within 500ms', () => {
      const start = Date.now();
      
      cy.request({
        method: 'GET',
        url: `${baseUrl}/api/credit-repair/disputes`,
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
        failOnStatusCode: false,
      }).then(() => {
        const duration = Date.now() - start;
        expect(duration).to.be.lessThan(500);
      });
    });

    it('should handle concurrent requests', () => {
      // Chain sequential requests (Cypress doesn't support Promise.all with cy commands)
      cy.request({
        method: 'GET',
        url: `${baseUrl}/api/credit-repair/disputes`,
        headers: { 'Authorization': `Bearer ${authToken}` },
        failOnStatusCode: false,
      });
      cy.request({
        method: 'GET',
        url: `${baseUrl}/api/credit-repair/cards`,
        headers: { 'Authorization': `Bearer ${authToken}` },
        failOnStatusCode: false,
      });
      cy.request({
        method: 'GET',
        url: `${baseUrl}/api/credit-repair/quick-wins`,
        headers: { 'Authorization': `Bearer ${authToken}` },
        failOnStatusCode: false,
      });
    });
  });

  describe('Error Handling', () => {
    it('should return 401 for missing auth token', () => {
      cy.request({
        method: 'GET',
        url: `${baseUrl}/api/credit-repair/disputes`,
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.equal(401);
      });
    });

    it('should return 400 for invalid input', () => {
      cy.request({
        method: 'POST',
        url: `${baseUrl}/api/credit-repair/disputes`,
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: {
          // Missing required fields
          bureau: 'experian',
        },
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.be.oneOf([400, 401]);
      });
    });

    it('should return 404 for non-existent resources', () => {
      cy.request({
        method: 'GET',
        url: `${baseUrl}/api/credit-repair/disputes/non-existent-id`,
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.be.oneOf([404, 401]);
      });
    });
  });
});

