/**
 * User Workflow E2E Tests
 *
 * Tests core user journeys — landing page access, public page navigation,
 * protected route enforcement, and API availability.
 */

describe("User Workflow — Landing Page", () => {
  it("landing page loads successfully (200)", () => {
    cy.request({
      url: "/",
      followRedirect: false,
      failOnStatusCode: false,
    }).then((resp) => {
      expect(resp.status).to.eq(200);
    });
  });

  it("landing page renders visible content", () => {
    cy.visit("/");
    cy.get("body").should("be.visible");
    cy.get("body").children().should("have.length.greaterThan", 0);
  });

  it("landing page has navigation links", () => {
    cy.visit("/");
    cy.get("a").should("have.length.at.least", 1);
  });
});

describe("User Workflow — Public Pages Accessible", () => {
  const publicPages = [
    { path: "/", name: "Landing", expected: [200] },
    { path: "/login", name: "Login", expected: [200, 307] },
    { path: "/pricing", name: "Pricing", expected: [200] },
    { path: "/credit/factors", name: "Credit Factors", expected: [200] },
  ];

  publicPages.forEach(({ path, name, expected }) => {
    it(`${name} page (${path}) → ${expected.join(" or ")}`, () => {
      cy.request({
        url: path,
        followRedirect: false,
        failOnStatusCode: false,
      }).then((resp) => {
        expect(resp.status).to.be.oneOf(expected);
      });
    });
  });
});

describe("User Workflow — Protected Routes Redirect", () => {
  const protectedRoutes = [
    "/dashboard",
    "/ai-tools",
    "/admin",
    "/settings",
    "/credit",
    "/investments",
    "/credit/disputes",
    "/credit/monitoring",
    "/credit/builder",
  ];

  protectedRoutes.forEach((route) => {
    it(`${route} → 307 redirect to /login`, () => {
      cy.request({
        url: route,
        followRedirect: false,
        failOnStatusCode: false,
      }).then((resp) => {
        expect(resp.status).to.eq(307);
        const location = resp.headers["location"] as string;
        expect(location).to.include("/login");
      });
    });
  });
});

describe("User Workflow — Login Page", () => {
  it("login page loads and has interactive elements", () => {
    cy.visit("/login");
    cy.get("body").should("be.visible");
    cy.get("input, button, a").should("have.length.at.least", 1);
  });

  it("login page returns 200 or 307", () => {
    cy.request({
      url: "/login",
      followRedirect: false,
      failOnStatusCode: false,
    }).then((resp) => {
      expect(resp.status).to.be.oneOf([200, 307]);
    });
  });
});

describe("User Workflow — Pricing Page Content", () => {
  it("pricing page displays tier names", () => {
    cy.visit("/pricing");
    cy.contains(/free/i).should("exist");
    cy.contains(/standard/i).should("exist");
    cy.contains(/pro/i).should("exist");
  });

  it("pricing page has actionable buttons or links", () => {
    cy.visit("/pricing");
    cy.get("a, button").should("have.length.at.least", 2);
  });
});

describe("User Workflow — API Availability", () => {
  it("credit repair API is reachable (returns 401 without auth)", () => {
    cy.request({
      url: "/api/credit-repair/disputes",
      failOnStatusCode: false,
    }).then((resp) => {
      expect(resp.status).to.eq(401);
      expect(resp.body).to.have.property("error");
    });
  });

  it("AI chat API is reachable (returns 401 without auth)", () => {
    cy.request({
      method: "POST",
      url: "/api/ai/chat",
      body: { message: "test" },
      failOnStatusCode: false,
      timeout: 60000,
    }).then((resp) => {
      expect(resp.status).to.eq(401);
      expect(resp.body).to.have.property("error");
    });
  });

  it("investment API is reachable (returns 200 with docs)", () => {
    cy.request({
      url: "/api/investments/portfolio-analysis",
      failOnStatusCode: false,
    }).then((resp) => {
      expect(resp.status).to.eq(200);
      expect(resp.body).to.be.an("object");
    });
  });
});
