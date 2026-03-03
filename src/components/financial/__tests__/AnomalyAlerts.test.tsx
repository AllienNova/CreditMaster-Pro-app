/**
 * AnomalyAlerts Component Tests
 *
 * Tests for the spending anomaly detection alerts with filtering.
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AnomalyAlerts from "../AnomalyAlerts";

jest.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "user-1", email: "test@test.com" },
  }),
}));

const mockAnomalies = [
  {
    id: "a-1",
    type: "unusual_amount",
    severity: "high",
    category: "food_dining",
    merchant: "Fancy Restaurant",
    amount: 250,
    expectedAmount: 50,
    deviation: 4.0,
    confidence: 0.92,
    explanation: "This transaction is 5x your usual spending at restaurants.",
    suggestions: ["Set a dining budget", "Track restaurant visits"],
    detectedAt: "2026-02-20T10:00:00Z",
  },
  {
    id: "a-2",
    type: "unusual_frequency",
    severity: "critical",
    category: "shopping",
    merchant: "Online Store",
    amount: 100,
    expectedAmount: 30,
    deviation: 2.3,
    confidence: 0.88,
    explanation: "Multiple purchases detected in a short period.",
    suggestions: ["Review recent purchases"],
    detectedAt: "2026-02-19T10:00:00Z",
  },
  {
    id: "a-3",
    type: "unusual_merchant",
    severity: "low",
    category: "entertainment",
    merchant: "New Service",
    amount: 15,
    expectedAmount: 0,
    deviation: 1.0,
    confidence: 0.75,
    explanation: "First-time transaction with this merchant.",
    suggestions: ["Verify this charge"],
    detectedAt: "2026-02-18T10:00:00Z",
  },
];

describe("AnomalyAlerts", () => {
  beforeEach(() => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: mockAnomalies }),
      }),
    ) as jest.Mock;
  });

  it("renders loading state initially", () => {
    global.fetch = jest.fn(() => new Promise(() => {})) as jest.Mock;
    const { container } = render(<AnomalyAlerts />);
    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("displays anomaly detection header after loading", async () => {
    render(<AnomalyAlerts />);
    await waitFor(() => {
      expect(screen.getByText("Anomaly Detection")).toBeInTheDocument();
    });
  });

  it("displays anomaly count badge", async () => {
    render(<AnomalyAlerts />);
    await waitFor(() => {
      expect(screen.getByText("3")).toBeInTheDocument();
    });
  });

  it("displays anomaly details", async () => {
    render(<AnomalyAlerts />);
    await waitFor(() => {
      expect(screen.getByText("Unusual Amount")).toBeInTheDocument();
      expect(screen.getByText(/Fancy Restaurant/)).toBeInTheDocument();
      expect(screen.getByText("$250")).toBeInTheDocument();
    });
  });

  it("filters anomalies by severity", async () => {
    render(<AnomalyAlerts />);

    await waitFor(() => {
      expect(screen.getByText("Anomaly Detection")).toBeInTheDocument();
    });

    const criticalBtn = screen.getByText("Critical");
    fireEvent.click(criticalBtn);

    await waitFor(() => {
      expect(screen.getByText("Unusual Frequency")).toBeInTheDocument();
      expect(screen.queryByText("Unusual Amount")).not.toBeInTheDocument();
    });
  });

  it("shows all anomalies when All filter is selected", async () => {
    render(<AnomalyAlerts />);

    await waitFor(() => {
      expect(screen.getByText("Anomaly Detection")).toBeInTheDocument();
    });

    const allBtn = screen.getByText("All");
    fireEvent.click(allBtn);

    await waitFor(() => {
      expect(screen.getByText("Unusual Amount")).toBeInTheDocument();
      expect(screen.getByText("Unusual Frequency")).toBeInTheDocument();
      expect(screen.getByText("New Merchant")).toBeInTheDocument();
    });
  });

  it("shows No Anomalies Detected when list is empty", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: [] }),
      }),
    ) as jest.Mock;

    render(<AnomalyAlerts />);

    await waitFor(() => {
      expect(screen.getByText("No Anomalies Detected")).toBeInTheDocument();
      expect(
        screen.getByText("Your spending patterns look normal"),
      ).toBeInTheDocument();
    });
  });

  it("displays suggestions for anomalies", async () => {
    render(<AnomalyAlerts />);
    await waitFor(() => {
      expect(screen.getByText("Set a dining budget")).toBeInTheDocument();
    });
  });
});
