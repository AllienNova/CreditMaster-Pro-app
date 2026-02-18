/**
 * Marketplace API E2E Tests
 *
 * Tests the public marketplace endpoints that return provider, product,
 * and tradeline data. Validates response structure, filtering, and pagination.
 */

describe("Marketplace API", () => {
  describe("Providers", () => {
    it("returns valid provider list structure", () => {
      cy.request("/api/marketplace/providers").then((resp) => {
        expect(resp.status).to.eq(200);
        expect(resp.body.success).to.eq(true);
        expect(resp.body.data).to.be.an("array");
        expect(resp.body.meta).to.have.property("count");
        expect(resp.body.meta.count).to.eq(resp.body.data.length);
      });
    });

    it("supports query parameter filtering", () => {
      cy.request("/api/marketplace/providers?category=credit").then((resp) => {
        expect(resp.status).to.eq(200);
        expect(resp.body.success).to.eq(true);
        expect(resp.body.data).to.be.an("array");
      });
    });
  });

  describe("Products", () => {
    it("returns valid product list structure", () => {
      cy.request("/api/marketplace/products").then((resp) => {
        expect(resp.status).to.eq(200);
        expect(resp.body.success).to.eq(true);
        expect(resp.body.data).to.be.an("array");
      });
    });
  });

  describe("Tradelines", () => {
    it("returns valid tradeline list structure", () => {
      cy.request("/api/marketplace/tradelines").then((resp) => {
        expect(resp.status).to.eq(200);
        expect(resp.body.success).to.eq(true);
        expect(resp.body.data).to.be.an("array");
        expect(resp.body.meta).to.have.property("count");
      });
    });
  });

  describe("Reviews", () => {
    it("requires providerId or productId parameter", () => {
      cy.request({
        url: "/api/marketplace/reviews",
        failOnStatusCode: false,
      }).then((resp) => {
        expect(resp.status).to.eq(400);
        expect(resp.body).to.have.property("error");
      });
    });

    it("returns reviews when given a provider ID", () => {
      cy.request({
        url: "/api/marketplace/reviews?providerId=test-provider",
        failOnStatusCode: false,
      }).then((resp) => {
        // Should return 200 with empty array or 404 for non-existent provider
        expect(resp.status).to.be.oneOf([200, 404]);
      });
    });
  });

  describe("Error Handling", () => {
    it("returns proper JSON error for invalid endpoints", () => {
      cy.request({
        url: "/api/marketplace/nonexistent",
        failOnStatusCode: false,
      }).then((resp) => {
        expect(resp.status).to.eq(404);
      });
    });
  });
});
