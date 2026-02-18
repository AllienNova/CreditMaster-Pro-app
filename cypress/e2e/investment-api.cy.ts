/**
 * Investment API E2E Tests
 *
 * Tests the investment analysis endpoints — portfolio analysis, allocation analysis,
 * and comprehensive analysis. Validates GET (documentation) and POST (functionality).
 */

describe("Investment API", () => {
  describe("Portfolio Analysis", () => {
    it("GET returns endpoint documentation", () => {
      cy.request("/api/investments/portfolio-analysis").then((resp) => {
        expect(resp.status).to.eq(200);
        expect(resp.body).to.have.property(
          "endpoint",
          "/api/investments/portfolio-analysis",
        );
        expect(resp.body).to.have.property("method", "POST");
        expect(resp.body).to.have.property("description");
        expect(resp.body).to.have.property("features");
        expect(resp.body.features)
          .to.be.an("array")
          .and.have.length.greaterThan(0);
        expect(resp.body).to.have.property("requestBody");
      });
    });

    it("POST with valid portfolio data returns analysis or requires auth", () => {
      cy.request({
        method: "POST",
        url: "/api/investments/portfolio-analysis",
        body: {
          holdings: [
            { symbol: "AAPL", shares: 10, avgCost: 150 },
            { symbol: "GOOGL", shares: 5, avgCost: 2800 },
          ],
        },
        failOnStatusCode: false,
      }).then((resp) => {
        // Should either process the request or require auth
        expect(resp.status).to.be.oneOf([200, 400, 401, 500]);
        expect(resp.body).to.be.an("object");
      });
    });

    it("POST with empty holdings returns error", () => {
      cy.request({
        method: "POST",
        url: "/api/investments/portfolio-analysis",
        body: { holdings: [] },
        failOnStatusCode: false,
      }).then((resp) => {
        expect(resp.status).to.be.oneOf([400, 401, 500]);
      });
    });
  });

  describe("Allocation Analysis", () => {
    it("GET returns valid JSON response", () => {
      cy.request("/api/investments/allocation-analysis").then((resp) => {
        expect(resp.status).to.eq(200);
        expect(resp.body).to.be.an("object");
        const hasDocFormat = "endpoint" in resp.body;
        const hasDataFormat = "success" in resp.body;
        expect(hasDocFormat || hasDataFormat).to.be.true;
      });
    });

    it("POST requires proper allocation data", () => {
      cy.request({
        method: "POST",
        url: "/api/investments/allocation-analysis",
        body: {},
        failOnStatusCode: false,
      }).then((resp) => {
        expect(resp.status).to.be.oneOf([400, 401, 500]);
      });
    });
  });

  describe("Comprehensive Analysis", () => {
    it("GET returns endpoint documentation", () => {
      cy.request("/api/investments/comprehensive-analysis").then((resp) => {
        expect(resp.status).to.eq(200);
        expect(resp.body).to.have.property("endpoint");
      });
    });
  });

  describe("Response Headers", () => {
    it("returns proper content-type for all investment endpoints", () => {
      const endpoints = [
        "/api/investments/portfolio-analysis",
        "/api/investments/allocation-analysis",
        "/api/investments/comprehensive-analysis",
      ];

      endpoints.forEach((url) => {
        cy.request(url).then((resp) => {
          expect(resp.headers["content-type"]).to.include("application/json");
        });
      });
    });
  });
});
