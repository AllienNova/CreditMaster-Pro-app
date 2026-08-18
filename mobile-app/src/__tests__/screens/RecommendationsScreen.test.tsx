/**
 * recommendations/index — real actions, and no "AI" claim.
 *
 * The screen rendered AI_RECOMMENDATIONS under the heading "AI Analysis
 * Complete". Two things were wrong beyond the invented list:
 *
 *   1. A local `Recommendation` interface SHADOWED the shared one with
 *      different fields — `category`, `impact`, `timeframe`, `action`, `route`
 *      against the shared `userId`, `type`, `potentialImpact`, `actionUrl`,
 *      `expiresAt`, `dismissed`. That is why an invented list typechecked:
 *      the local type described the fixture, so nothing could compare this
 *      screen to a route. audit:shadow-types now catches exactly this.
 *
 *   2. The fixed category chips were credit / debt / savings / protection.
 *      The service's categories are payment / utilization / age / mix /
 *      inquiry, so every chip would have filtered a real payload to nothing.
 *
 * The real source is GET /api/credit-builder/recommendations, derived from the
 * caller's own credit-builder score. It is NOT AI generated — every action
 * carries `aiGenerated: false`, and the service used to make a billable AI
 * call and discard the response.
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react-native";

const mockGetAll = jest.fn();
jest.mock("../../services/api/credit", () => ({
  creditBuilderRecommendationsApi: { getAll: (...a: unknown[]) => mockGetAll(...a) },
}));

// expo-router is mocked globally in jest.setup.js.

import RecommendationsScreen from "../../../app/recommendations/index";

/** Exactly CreditBuilderAction (credit-builder-service.ts:40-54). */
function action(over: Record<string, unknown> = {}) {
  return {
    id: "a1",
    type: "quick_win",
    category: "payment",
    title: "Set Up Autopay",
    description: "Enable automatic payments to never miss a due date",
    impact: "high",
    pointsImpact: 15,
    timeframe: "1 day",
    difficulty: "easy",
    completed: false,
    aiGenerated: false,
    ...over,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetAll.mockResolvedValue({
    success: true,
    data: {
      recommendations: [
        action(),
        action({
          id: "a2",
          category: "mix",
          title: "Diversify Your Credit Mix",
          impact: "medium",
          pointsImpact: 8,
          difficulty: "medium",
        }),
      ],
    },
  });
});

describe("recommendations/index", () => {
  it("fetches on mount instead of rendering a fixture", async () => {
    render(<RecommendationsScreen />);
    await waitFor(() => expect(mockGetAll).toHaveBeenCalled());
  });

  it("renders the real actions", async () => {
    render(<RecommendationsScreen />);
    expect(await screen.findByText("Set Up Autopay")).toBeTruthy();
    expect(screen.getByText("Diversify Your Credit Mix")).toBeTruthy();
  });

  it("no longer claims an AI analysis", async () => {
    // Every action carries aiGenerated: false, and the service discarded the
    // only AI call it ever made.
    render(<RecommendationsScreen />);
    await waitFor(() => expect(mockGetAll).toHaveBeenCalled());
    expect(screen.queryByText("AI Analysis Complete")).toBeNull();
    expect(screen.getByText("Based on your credit profile")).toBeTruthy();
  });

  it("sums pointsImpact, not the impact band", async () => {
    // `impact` is low/medium/high. The old screen summed a field it called
    // `impact` as if it were a number, which on a real payload renders
    // "+high pts" and sums to NaN.
    render(<RecommendationsScreen />);
    // Only the high-impact action counts: 15.
    expect(await screen.findByText("+15")).toBeTruthy();
    expect(screen.queryByText(/NaN/)).toBeNull();
    expect(screen.queryByText(/\+high/)).toBeNull();
  });

  describe("category chips", () => {
    it("offers the categories the payload actually uses", async () => {
      render(<RecommendationsScreen />);
      await screen.findByText("Set Up Autopay");
      expect(screen.getByTestId("category-chip-payment")).toBeTruthy();
      expect(screen.getByTestId("category-chip-mix")).toBeTruthy();
    });

    it("no longer offers chips that match nothing", async () => {
      // credit / debt / savings / protection are not categories this service
      // emits, so each one filtered a real payload to an empty list.
      render(<RecommendationsScreen />);
      await screen.findByText("Set Up Autopay");
      for (const dead of ["credit", "debt", "savings", "protection"]) {
        expect(screen.queryByTestId(`category-chip-${dead}`)).toBeNull();
      }
    });

    it("filters to the chosen category", async () => {
      render(<RecommendationsScreen />);
      await screen.findByText("Set Up Autopay");

      fireEvent.press(screen.getByTestId("category-chip-mix"));
      await waitFor(() => expect(screen.queryByText("Set Up Autopay")).toBeNull());
      expect(screen.getByText("Diversify Your Credit Mix")).toBeTruthy();
    });
  });

  describe("honest states", () => {
    it("distinguishes a failed read from having no recommendations", async () => {
      mockGetAll.mockResolvedValue({ success: false, error: { message: "boom" } });
      render(<RecommendationsScreen />);
      expect(
        await screen.findByText(/could not load your recommendations/i),
      ).toBeTruthy();
      expect(screen.queryByText(/No recommendations yet/i)).toBeNull();
    });

    it("retries on demand", async () => {
      mockGetAll.mockResolvedValueOnce({ success: false, error: { message: "boom" } });
      render(<RecommendationsScreen />);
      await screen.findByText(/could not load your recommendations/i);

      fireEvent.press(screen.getByText("Try again"));
      await waitFor(() => expect(mockGetAll).toHaveBeenCalledTimes(2));
      expect(await screen.findByText("Set Up Autopay")).toBeTruthy();
    });

    it("says so when there are none", async () => {
      mockGetAll.mockResolvedValue({ success: true, data: { recommendations: [] } });
      render(<RecommendationsScreen />);
      expect(await screen.findByText(/No recommendations yet/i)).toBeTruthy();
    });
  });
});
