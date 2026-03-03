/**
 * AIBudgetRecommendations Component Tests
 *
 * Tests for the AI-generated budget suggestions with apply action.
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AIBudgetRecommendations from "../AIBudgetRecommendations";

// Mock the useAuth hook
jest.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "user-1", email: "test@example.com" },
    loading: false,
  }),
}));

const mockRecommendations = [
  {
    category: "food_dining",
    currentBudget: 500,
    suggestedBudget: 400,
    reason: "Spending trend decreasing",
    impact: "medium" as const,
    confidence: 0.85,
  },
  {
    category: "entertainment",
    currentBudget: 200,
    suggestedBudget: 150,
    reason: "Seasonal adjustment",
    impact: "low" as const,
    confidence: 0.72,
  },
];

describe("AIBudgetRecommendations", () => {
  const defaultProps = {
    onApply: jest.fn(() => Promise.resolve()),
    period: "monthly",
  };

  beforeEach(() => {
    global.fetch = jest.fn();
    defaultProps.onApply = jest.fn(() => Promise.resolve());
  });

  it("renders loading state initially", () => {
    (global.fetch as jest.Mock).mockImplementation(
      () => new Promise(() => {}),
    );

    const { container } = render(
      <AIBudgetRecommendations {...defaultProps} />,
    );
    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("renders recommendations after fetch", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: mockRecommendations }),
    });

    render(<AIBudgetRecommendations {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText("AI Recommendations")).toBeInTheDocument();
    });

    expect(screen.getByText("food dining")).toBeInTheDocument();
    expect(screen.getByText("Spending trend decreasing")).toBeInTheDocument();
  });

  it("displays current and suggested budgets", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: mockRecommendations }),
    });

    render(<AIBudgetRecommendations {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText("$500")).toBeInTheDocument();
    });

    expect(screen.getByText("$400")).toBeInTheDocument();
  });

  it("displays impact badges", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: mockRecommendations }),
    });

    render(<AIBudgetRecommendations {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText("medium")).toBeInTheDocument();
    });

    expect(screen.getByText("low")).toBeInTheDocument();
  });

  it("shows Apply button when recommendations exist", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: mockRecommendations }),
    });

    render(<AIBudgetRecommendations {...defaultProps} />);

    await waitFor(() => {
      expect(
        screen.getByText("Apply AI Recommendations"),
      ).toBeInTheDocument();
    });
  });

  it("calls onApply when Apply button is clicked", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: mockRecommendations }),
    });

    render(<AIBudgetRecommendations {...defaultProps} />);

    await waitFor(() => {
      expect(
        screen.getByText("Apply AI Recommendations"),
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Apply AI Recommendations"));

    await waitFor(() => {
      expect(defaultProps.onApply).toHaveBeenCalledTimes(1);
    });
  });

  it("shows empty state when no recommendations", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: [] }),
    });

    render(<AIBudgetRecommendations {...defaultProps} />);

    await waitFor(() => {
      expect(
        screen.getByText("No recommendations available"),
      ).toBeInTheDocument();
    });

    expect(screen.getByText("Your budget looks good!")).toBeInTheDocument();
  });

  it("displays confidence percentages", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: mockRecommendations }),
    });

    render(<AIBudgetRecommendations {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText("Confidence: 85%")).toBeInTheDocument();
    });

    expect(screen.getByText("Confidence: 72%")).toBeInTheDocument();
  });
});
