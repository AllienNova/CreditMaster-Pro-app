import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import AISpendingInsights from "../AISpendingInsights";

const mockUser = { id: "user-1", email: "test@test.com" };
jest.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: mockUser }),
}));

const mockError = jest.fn();
const mockSuccess = jest.fn();
const mockToast = { error: mockError, success: mockSuccess };
jest.mock("@/components/ui/Toast", () => ({
  useToast: () => mockToast,
}));

const mockData = {
  data: {
    anomalies: [
      {
        id: "anomaly-1",
        type: "unusual_large" as const,
        severity: "high" as const,
        description: "Unusually large purchase at Electronics Store",
        amount: 500,
        expectedAmount: 100,
        category: "Shopping",
        merchant: "BestBuy",
        date: "2026-02-15",
        actionable: true,
      },
    ],
    categoryInsights: [
      {
        category: "Food & Dining",
        currentSpending: 600,
        averageSpending: 450,
        trend: "increasing" as const,
        percentChange: 33.3,
        recommendation: "Consider meal prepping",
        potentialSavings: 150,
      },
    ],
    reductionRecommendations: [
      {
        id: "red-1",
        title: "Reduce dining out",
        description: "Switch to home cooking 3 days a week",
        category: "Food & Dining",
        currentAmount: 600,
        targetAmount: 400,
        monthlySavings: 200,
        difficulty: "easy" as const,
        impact: "high" as const,
      },
    ],
    totalPotentialSavings: 350,
    anomalyScore: 45,
  },
};

describe("AISpendingInsights", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders loading skeleton initially", () => {
    global.fetch = jest.fn(() => new Promise(() => {})) as jest.Mock;

    render(<AISpendingInsights />);
    expect(document.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("renders null when data is null", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({ ok: false, status: 500 }),
    ) as jest.Mock;

    const { container } = render(<AISpendingInsights />);

    await waitFor(() => {
      expect(container.innerHTML).toBe("");
    });
  });

  it("displays anomaly score and savings after loading", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockData),
      }),
    ) as jest.Mock;

    render(<AISpendingInsights />);

    await waitFor(() => {
      expect(
        screen.getByText("AI Spending Intelligence"),
      ).toBeInTheDocument();
    });

    expect(screen.getByText("45/100")).toBeInTheDocument();
    expect(screen.getByText("$350")).toBeInTheDocument();
  });

  it("displays detected anomalies", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockData),
      }),
    ) as jest.Mock;

    render(<AISpendingInsights />);

    await waitFor(() => {
      expect(screen.getByText("Anomalies Detected")).toBeInTheDocument();
    });

    expect(
      screen.getByText("Unusually large purchase at Electronics Store"),
    ).toBeInTheDocument();
    expect(screen.getByText("high severity")).toBeInTheDocument();
  });

  it("displays category insights", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockData),
      }),
    ) as jest.Mock;

    render(<AISpendingInsights />);

    await waitFor(() => {
      expect(screen.getByText("Category Trends")).toBeInTheDocument();
    });

    expect(screen.getByText("Food & Dining")).toBeInTheDocument();
    expect(screen.getByText("+33.3%")).toBeInTheDocument();
  });

  it("displays reduction recommendations", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockData),
      }),
    ) as jest.Mock;

    render(<AISpendingInsights />);

    await waitFor(() => {
      expect(
        screen.getByText("Smart Reduction Recommendations"),
      ).toBeInTheDocument();
    });

    expect(screen.getByText("Reduce dining out")).toBeInTheDocument();
    expect(screen.getByText("high impact")).toBeInTheDocument();
  });

  it("toggles collapse/expand", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockData),
      }),
    ) as jest.Mock;

    render(<AISpendingInsights />);

    await waitFor(() => {
      expect(
        screen.getByText("AI Spending Intelligence"),
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Collapse"));
    expect(
      screen.queryByText("Anomalies Detected"),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByText("Expand"));
    expect(screen.getByText("Anomalies Detected")).toBeInTheDocument();
  });

  it("calls toast.error when fetch fails", async () => {
    global.fetch = jest.fn(() =>
      Promise.reject(new Error("Network error")),
    ) as jest.Mock;

    render(<AISpendingInsights />);

    await waitFor(() => {
      expect(mockError).toHaveBeenCalledWith(
        "Failed to load AI insights",
        "Please try again later",
      );
    });
  });
});
