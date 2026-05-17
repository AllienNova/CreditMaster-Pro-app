/**
 * Smoke test for PortfolioAnalyticsPage default export.
 * Covers the changed import line (import { RiskGauge } from "./risk-gauge")
 * and the initial loading branch of the page component.
 */

import React from "react";
import { render, screen } from "@testing-library/react";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), prefetch: jest.fn() }),
  usePathname: () => "/investments/analytics",
}));

// Prevent chart components from throwing in jsdom
jest.mock("@/components/charts", () => ({
  PieChartComponent: () => null,
  HeatmapComponent: () => null,
  BarChartComponent: () => null,
}));

// Stub fetch so useEffect network calls don't throw
global.fetch = jest.fn().mockResolvedValue({
  ok: false,
  json: async () => ({}),
} as Response);

// Import AFTER mocks
import PortfolioAnalyticsPage from "../page";

describe("PortfolioAnalyticsPage (smoke)", () => {
  it("renders the page heading without crashing", () => {
    render(<PortfolioAnalyticsPage />);
    expect(screen.getByText("Portfolio Analytics")).toBeInTheDocument();
  });
});
