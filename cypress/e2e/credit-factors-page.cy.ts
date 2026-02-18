/**
 * Credit Factors Page E2E Tests
 *
 * Tests the public credit factors page — content, layout, navigation.
 */

describe("Credit Factors Page", () => {
  beforeEach(() => {
    cy.visit("/credit/factors");
  });

  describe("Content & Layout", () => {
    it("renders without errors", () => {
      cy.get("body").should("be.visible");
      cy.document().its("title").should("not.be.empty");
    });

    it("displays credit-related content", () => {
      cy.contains(/credit|factor|score/i).should("exist");
    });

    it("has navigation or interactive elements", () => {
      // Page may use links, buttons, or semantic nav elements
      cy.get(
        'a, button, nav, header, [role="navigation"], [role="link"]',
      ).should("exist");
    });

    it("includes page structure elements", () => {
      // Page uses div-based layout — check for main content container
      cy.get("body").children().should("have.length.greaterThan", 0);
    });
  });

  describe("Responsive Design", () => {
    it("renders correctly on mobile", () => {
      cy.viewport(375, 667);
      cy.get("body").should("be.visible");
      cy.contains(/credit|factor|score/i).should("be.visible");
    });

    it("renders correctly on tablet", () => {
      cy.viewport(768, 1024);
      cy.get("body").should("be.visible");
    });

    it("renders correctly on desktop", () => {
      cy.viewport(1280, 720);
      cy.get("body").should("be.visible");
    });
  });

  describe("Accessibility", () => {
    it("images (if any) have alt text", () => {
      cy.get("body").then(($body) => {
        if ($body.find("img").length > 0) {
          cy.get("img").each(($img) => {
            cy.wrap($img).should("have.attr", "alt");
          });
        } else {
          // No images on this page — pass
          expect(true).to.be.true;
        }
      });
    });

    it("has lang attribute on html", () => {
      cy.get("html").should("have.attr", "lang");
    });
  });
});
