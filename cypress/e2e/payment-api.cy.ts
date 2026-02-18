/**
 * Payment & Admin API E2E Tests
 *
 * Tests payment checkout and admin endpoints — both require authentication
 * and have strict method enforcement.
 */

describe("Payment API", () => {
  it("GET /api/payment/checkout → returns 405 (POST only)", () => {
    cy.request({
      url: "/api/payment/checkout",
      failOnStatusCode: false,
    }).then((resp) => {
      expect(resp.status).to.eq(405);
    });
  });

  it("POST /api/payment/checkout without auth → returns 401 or error", () => {
    cy.request({
      method: "POST",
      url: "/api/payment/checkout",
      body: { priceId: "price_test_123" },
      failOnStatusCode: false,
    }).then((resp) => {
      expect(resp.status).to.be.oneOf([400, 401, 500]);
      expect(resp.body).to.be.an("object");
    });
  });

  it("POST /api/payment/checkout with empty body → returns error", () => {
    cy.request({
      method: "POST",
      url: "/api/payment/checkout",
      body: {},
      failOnStatusCode: false,
    }).then((resp) => {
      expect(resp.status).to.be.oneOf([400, 401, 500]);
    });
  });
});

describe("Notifications API", () => {
  it("GET /api/notifications without userId → returns 400", () => {
    cy.request({
      url: "/api/notifications",
      failOnStatusCode: false,
    }).then((resp) => {
      expect(resp.status).to.eq(400);
      expect(resp.body).to.have.property("error");
    });
  });

  it("GET /api/notifications with userId → returns 401 or data", () => {
    cy.request({
      url: "/api/notifications?userId=test-user",
      failOnStatusCode: false,
    }).then((resp) => {
      expect(resp.status).to.be.oneOf([200, 401]);
    });
  });
});

describe("Admin API", () => {
  it("GET /api/admin/users → requires authentication", () => {
    cy.request({
      url: "/api/admin/users",
      failOnStatusCode: false,
    }).then((resp) => {
      expect(resp.status).to.be.oneOf([401, 405]);
    });
  });

  it("POST /api/admin/users → returns 405 (GET only) or 401", () => {
    cy.request({
      method: "POST",
      url: "/api/admin/users",
      body: { email: "test@test.com" },
      failOnStatusCode: false,
    }).then((resp) => {
      expect(resp.status).to.be.oneOf([401, 405]);
    });
  });
});
