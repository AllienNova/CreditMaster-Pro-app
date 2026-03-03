/**
 * HealthScoreCard Component Tests
 *
 * Tests for the financial health score display with trend and grade.
 */

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import HealthScoreCard from "../HealthScoreCard";

// Mock the useAuth hook
jest.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "user-1", email: "test@example.com" },
    loading: false,
  }),
}));

// Mock next/link
jest.mock("next/link", () => {
  return ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  );
});

const mockHealthScoreData = {
  overallScore: 85,
  grade: "B" as const,
  trend: "improving" as const,
  breakdown: {
    savings: { score: 90, status: "Excellent" },
    debt: { score: 75, status: "Good" },
    spending: { score: 80, status: "Good" },
    credit: { score: 88, status: "Good" },
    insurance: { score: 92, status: "Excellent" },
  },
  calculatedAt: "2026-02-20T00:00:00Z",
};

describe("HealthScoreCard", () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  it("renders loading state initially", () => {
    (global.fetch as jest.Mock).mockImplementation(
      () => new Promise(() => {}),
    );

    const { container } = render(<HealthScoreCard />);
    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("renders health score data after fetch", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: mockHealthScoreData }),
    });

    render(<HealthScoreCard />);

    await waitFor(() => {
      expect(screen.getByText("Financial Health Score")).toBeInTheDocument();
    });

    expect(screen.getByText("85")).toBeInTheDocument();
    expect(screen.getByText("Grade B")).toBeInTheDocument();
    expect(screen.getByText("Good")).toBeInTheDocument();
  });

  it("displays breakdown scores", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: mockHealthScoreData }),
    });

    render(<HealthScoreCard />);

    await waitFor(() => {
      expect(screen.getByText("savings")).toBeInTheDocument();
    });

    expect(screen.getByText("90")).toBeInTheDocument();
    expect(screen.getByText("75")).toBeInTheDocument();
    expect(screen.getByText("80")).toBeInTheDocument();
  });

  it("shows View Details link", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: mockHealthScoreData }),
    });

    render(<HealthScoreCard />);

    await waitFor(() => {
      const link = screen.getByText(/View Details/);
      expect(link.closest("a")).toHaveAttribute("href", "/financial/health");
    });
  });

  it("displays trend information", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: mockHealthScoreData }),
    });

    render(<HealthScoreCard />);

    await waitFor(() => {
      expect(screen.getByText("improving trend")).toBeInTheDocument();
    });
  });

  it("returns null when no health score data", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: null }),
    });

    const { container } = render(<HealthScoreCard />);

    await waitFor(() => {
      expect(
        container.querySelector(".animate-pulse"),
      ).not.toBeInTheDocument();
    });

    // Component returns null when no data
    expect(container.firstChild).toBeNull();
  });
});
