import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import SpendingAnalysis from "../SpendingAnalysis";

const mockUser = { id: "user-1", email: "test@test.com" };
jest.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: mockUser,
    loading: false,
  }),
}));

jest.mock("@/components/charts", () => ({
  PieChartComponent: () => <div data-testid="pie-chart" />,
  LineChartComponent: () => <div data-testid="line-chart" />,
  BarChartComponent: () => <div data-testid="bar-chart" />,
  AreaChartComponent: () => <div data-testid="area-chart" />,
  ChartContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="chart-container">{children}</div>
  ),
}));

jest.mock("../AISpendingInsights", () => ({
  __esModule: true,
  default: () => <div data-testid="ai-spending-insights" />,
}));

const mockSpendingData = {
  data: {
    totalSpending: 4500,
    averageDaily: 150,
    averageTransaction: 45,
    transactionCount: 100,
    byCategory: [
      { category: "Food and Drink", amount: 800, percentage: 17.8, transactionCount: 30 },
      { category: "Shopping", amount: 1200, percentage: 26.7, transactionCount: 25 },
      { category: "Transportation", amount: 500, percentage: 11.1, transactionCount: 20 },
    ],
    byMonth: [
      { month: "Jan", amount: 4200 },
      { month: "Feb", amount: 4500 },
    ],
    topMerchants: [
      { name: "Amazon", amount: 500, transactionCount: 10 },
      { name: "Walmart", amount: 300, transactionCount: 8 },
    ],
    insights: [
      "Your spending increased by 7% this month",
      "Shopping is your largest category",
    ],
    income: 6000,
    cashFlow: 1500,
  },
};

describe("SpendingAnalysis", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders loading skeleton initially", () => {
    global.fetch = jest.fn(() => new Promise(() => {})) as jest.Mock;

    render(<SpendingAnalysis />);
    expect(document.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("displays spending data after loading", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockSpendingData),
      }),
    ) as jest.Mock;

    render(<SpendingAnalysis />);

    await waitFor(() => {
      expect(
        screen.getByTestId("ai-spending-insights"),
      ).toBeInTheDocument();
    });
  });

  it("shows error state with Try Again button", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({ ok: false, status: 500 }),
    ) as jest.Mock;

    render(<SpendingAnalysis />);

    await waitFor(() => {
      expect(screen.getByText("Error Loading Data")).toBeInTheDocument();
    });

    expect(screen.getByText("Try Again")).toBeInTheDocument();
  });

  it("displays tab buttons", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockSpendingData),
      }),
    ) as jest.Mock;

    render(<SpendingAnalysis />);

    await waitFor(() => {
      expect(screen.getByText("Spending Analysis")).toBeInTheDocument();
    });

    expect(screen.getAllByText("Cash Flow").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Forecast")).toBeInTheDocument();
  });

  it("displays date range selector", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockSpendingData),
      }),
    ) as jest.Mock;

    render(<SpendingAnalysis />);

    await waitFor(() => {
      expect(screen.getByText("Time Period")).toBeInTheDocument();
    });

    expect(screen.getByText("30 Days")).toBeInTheDocument();
    expect(screen.getByText("3 Months")).toBeInTheDocument();
    expect(screen.getByText("6 Months")).toBeInTheDocument();
    expect(screen.getByText("1 Year")).toBeInTheDocument();
  });

  it("shows AI Spending Insights component", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockSpendingData),
      }),
    ) as jest.Mock;

    render(<SpendingAnalysis />);

    await waitFor(() => {
      expect(
        screen.getByTestId("ai-spending-insights"),
      ).toBeInTheDocument();
    });
  });

  it("retries on Try Again click", async () => {
    let callCount = 0;
    global.fetch = jest.fn(() => {
      callCount++;
      if (callCount <= 3) {
        // First 3 calls are the initial fetch (spending + cashflow + forecast)
        return Promise.resolve({ ok: false, status: 500 });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockSpendingData),
      });
    }) as jest.Mock;

    render(<SpendingAnalysis />);

    await waitFor(() => {
      expect(screen.getByText("Try Again")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Try Again"));

    await waitFor(() => {
      expect(
        screen.getByTestId("ai-spending-insights"),
      ).toBeInTheDocument();
    });
  });

  it("shows export button", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockSpendingData),
      }),
    ) as jest.Mock;

    render(<SpendingAnalysis />);

    await waitFor(() => {
      expect(screen.getByText("Export")).toBeInTheDocument();
    });
  });
});
