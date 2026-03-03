import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import CashFlowAnalysis from "../CashFlowAnalysis";

const mockUser = { id: "user-1", email: "test@test.com" };
jest.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: mockUser,
    loading: false,
  }),
}));

const mockDashboardData = {
  data: {
    monthlyIncome: 5000,
    monthlyExpenses: 3500,
    cashFlow: 1500,
    savingsRate: 30,
    monthlyTrend: [
      { month: "Jan", income: 5000, expenses: 3500 },
      { month: "Feb", income: 5200, expenses: 3600 },
    ],
  },
};

describe("CashFlowAnalysis", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders loading skeleton initially", () => {
    global.fetch = jest.fn(() => new Promise(() => {})) as jest.Mock;

    render(<CashFlowAnalysis />);
    expect(document.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("renders error state with Try Again when fetch fails", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({ ok: false, status: 500 }),
    ) as jest.Mock;

    render(<CashFlowAnalysis />);

    await waitFor(() => {
      expect(screen.getByText("Try Again")).toBeInTheDocument();
    });
  });

  it("displays cash flow data after loading", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockDashboardData),
      }),
    ) as jest.Mock;

    render(<CashFlowAnalysis />);

    await waitFor(() => {
      expect(screen.getByText("Monthly Income")).toBeInTheDocument();
    });
  });

  it("displays income, expenses, net cash flow stats", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockDashboardData),
      }),
    ) as jest.Mock;

    render(<CashFlowAnalysis />);

    await waitFor(() => {
      expect(screen.getByText("Monthly Income")).toBeInTheDocument();
    });

    // Stats cards should be present
    expect(screen.getByText("Monthly Income")).toBeInTheDocument();
    expect(screen.getByText("Monthly Expenses")).toBeInTheDocument();
  });

  it("displays financial health score", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockDashboardData),
      }),
    ) as jest.Mock;

    render(<CashFlowAnalysis />);

    await waitFor(() => {
      expect(
        screen.getByText("Financial Health Score"),
      ).toBeInTheDocument();
    });
  });

  it("handles Try Again button on error", async () => {
    let callCount = 0;
    global.fetch = jest.fn(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({ ok: false, status: 500 });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockDashboardData),
      });
    }) as jest.Mock;

    render(<CashFlowAnalysis />);

    await waitFor(() => {
      expect(screen.getByText("Try Again")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Try Again"));

    await waitFor(() => {
      expect(screen.getByText("Monthly Income")).toBeInTheDocument();
    });
  });

  it("displays insights section", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockDashboardData),
      }),
    ) as jest.Mock;

    render(<CashFlowAnalysis />);

    await waitFor(() => {
      expect(screen.getByText("Monthly Income")).toBeInTheDocument();
    });

    // Component generates insights from savingsRate >= 20 (excellent)
    expect(
      screen.getByText(
        "Excellent savings rate! You're building wealth effectively.",
      ),
    ).toBeInTheDocument();
  });
});
