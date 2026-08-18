/**
 * dispute/templates — contract reconciliation.
 *
 * The server and the mobile app disagreed about what a template IS. The route
 * serves `{ id, name, category, description, successRate, template, variables }`
 * (src/lib/disputes/dispute-service.ts:23-31); the mobile type declared
 * `{ id, name, category, scenario, successRate, tone, letterText,
 *    requiredDocuments, placeholders, bestPractices }`.
 *
 * Four names overlap out of ten. The screen rendered `tone`, `scenario` and
 * `requiredDocuments` — none of which the server sends — and only worked
 * because a LOCAL_TEMPLATES fixture supplied them. A successful fetch replaced
 * those rich entries with sparser real ones and rendered undefined.
 *
 * The fixture is gone (the server owns this catalogue) and the payload is now
 * mapped rather than cast.
 */

import React from "react";
import { render, screen, waitFor } from "@testing-library/react-native";

const mockGetTemplates = jest.fn();
jest.mock("../../services/api/disputes", () => {
  const actual = jest.requireActual("../../services/api/disputes");
  return {
    disputeResourcesApi: {
      getTemplates: (...a: unknown[]) => mockGetTemplates(...a),
    },
    // The real mapper — the point of these tests is the mapping.
    mapWebDisputeTemplate: actual.mapWebDisputeTemplate,
  };
});

// expo-router is mocked globally in jest.setup.js.

import TemplatesScreen from "../../../app/dispute/templates";

/** Exactly what the route sends — no scenario, no tone, no letterText. */
const WEB_TEMPLATE = {
  id: "late-payment-goodwill",
  name: "Late Payment Goodwill Letter",
  category: "late_payment",
  description: "Request removal of a late payment given a good history",
  successRate: 65,
  template: "Dear {{CREDITOR}}, I am writing to request...",
  variables: ["CREDITOR", "ACCOUNT_NUMBER"],
};

beforeEach(() => {
  jest.clearAllMocks();
  mockGetTemplates.mockResolvedValue({
    success: true,
    data: { templates: [WEB_TEMPLATE] },
  });
});

describe("dispute/templates", () => {
  it("fetches on mount", async () => {
    render(<TemplatesScreen />);
    await waitFor(() => expect(mockGetTemplates).toHaveBeenCalled());
  });

  it("renders the server's template", async () => {
    render(<TemplatesScreen />);
    expect(await screen.findByText("Late Payment Goodwill Letter")).toBeTruthy();
  });

  it("maps description onto scenario, which is what the screen shows", async () => {
    // Two names for the same idea: what this letter is for. Without the
    // mapping the screen rendered undefined here.
    render(<TemplatesScreen />);
    // Rendered in more than one place on the card; the count is not the
    // point, the mapping is.
    await waitFor(() =>
      expect(
        screen.getAllByText(
          "Request removal of a late payment given a good history",
        ).length,
      ).toBeGreaterThan(0),
    );
  });

  it("omits the tone badge when the server sends no tone", async () => {
    // DISPUTE_TEMPLATES says nothing about a letter's voice. The badge used to
    // render an empty coloured pill on every real template.
    render(<TemplatesScreen />);
    await waitFor(() => expect(mockGetTemplates).toHaveBeenCalled());
    for (const tone of ["formal", "humble", "assertive", "legal"]) {
      expect(screen.queryByText(tone)).toBeNull();
    }
  });

  it("never shows the deleted local catalogue again", async () => {
    // LOCAL_TEMPLATES was a second, already-drifted copy of the same letters.
    mockGetTemplates.mockResolvedValue({
      success: true,
      data: { templates: [] },
    });
    render(<TemplatesScreen />);
    await waitFor(() => expect(mockGetTemplates).toHaveBeenCalled());
    expect(screen.queryByText("Late Payment Goodwill Letter")).toBeNull();
  });

  describe("honest states", () => {
    it("says so when the read fails, rather than showing built-in letters", async () => {
      mockGetTemplates.mockResolvedValue({
        success: false,
        error: { message: "boom" },
      });
      render(<TemplatesScreen />);
      expect(
        await screen.findByText(/could not load dispute templates/i),
      ).toBeTruthy();
    });

    it("says so when the call throws", async () => {
      mockGetTemplates.mockRejectedValue(new Error("network"));
      render(<TemplatesScreen />);
      expect(
        await screen.findByText(/could not load dispute templates/i),
      ).toBeTruthy();
    });
  });
});
