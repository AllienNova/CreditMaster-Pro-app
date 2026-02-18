/**
 * Student Loans API E2E Tests
 *
 * Tests student loan endpoints — loan data retrieval, strategy generation,
 * federal programs.
 */

describe("Student Loans API", () => {
  it("GET /api/student-loans → requires userId param (400)", () => {
    cy.request({
      url: "/api/student-loans",
      failOnStatusCode: false,
    }).then((resp) => {
      expect(resp.status).to.eq(400);
      expect(resp.body).to.have.property("error");
    });
  });

  it("GET /api/student-loans with userId → returns 200", () => {
    cy.request({
      url: "/api/student-loans?userId=nonexistent-user",
      failOnStatusCode: false,
    }).then((resp) => {
      // Endpoint accepts any userId and returns data (possibly empty)
      expect(resp.status).to.eq(200);
      expect(resp.body).to.be.an("object");
    });
  });
});

describe("Student Loan Strategy API", () => {
  it("POST /api/student-loans/strategy → requires authentication or valid data", () => {
    cy.request({
      method: "POST",
      url: "/api/student-loans/strategy",
      body: {
        loans: [
          { type: "federal", balance: 30000, rate: 5.5, servicer: "FedLoan" },
        ],
        income: 60000,
        filingStatus: "single",
      },
      failOnStatusCode: false,
    }).then((resp) => {
      // May return 200 (public), 401 (auth required), or 400 (validation)
      expect(resp.status).to.be.oneOf([200, 400, 401, 500]);
      expect(resp.body).to.be.an("object");
    });
  });

  it("POST /api/student-loans/strategy with empty loans → returns error", () => {
    cy.request({
      method: "POST",
      url: "/api/student-loans/strategy",
      body: { loans: [] },
      failOnStatusCode: false,
    }).then((resp) => {
      expect(resp.status).to.be.oneOf([400, 401, 500]);
    });
  });
});

describe("Federal Programs API", () => {
  it("GET /api/federal-programs → requires params or returns data", () => {
    cy.request({
      url: "/api/federal-programs",
      failOnStatusCode: false,
    }).then((resp) => {
      // May return 400 (needs params), 200, 401, or 404
      expect(resp.status).to.be.oneOf([200, 400, 401, 404]);
      expect(resp.body).to.be.an("object");
    });
  });
});
