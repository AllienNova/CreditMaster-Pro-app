import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import FinancialDashboard from "../FinancialDashboard";

const mockUser = { id: "user-1", email: "test@test.com" };
jest.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: mockUser,
    loading: false,
  }),
}));

jest.mock("@/lib/financial/financial-service", () => ({
  FinancialDashboard: {},
}));

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

jest.mock("../PlaidLinkButton", () => ({
  __esModule: true,
  default: ({ onSuccess }: { onSuccess?: () => void; variant?: string }) => (
    <button data-testid="plaid-link-button" onClick={onSuccess}>
      Connect Bank
    </button>
  ),
}));

jest.mock("../AIInsightsPanel", () => ({
  __esModule: true,
  default: () => <div data-testid="ai-insights-panel" />,
}));

jest.mock("../HealthScoreCard", () => ({
  __esModule: true,
  default: () => <div data-testid="health-score-card" />,
}));

jest.mock("../BudgetStatusCard", () => ({
  __esModule: true,
  default: () => <div data-testid="budget-status-card" />,
}));

jest.mock("../AccountsSummaryCard", () => ({
  __esModule: true,
  default: () => <div data-testid="accounts-summary-card" />,
}));

jest.mock("../QuickActionsBar", () => ({
  __esModule: true,
  default: () => <div data-testid="quick-actions-bar" />,
}));

const mockDashboardData = {
  data: {
    accounts: [
      {
        id: "acc-1",
        itemId: "item-1",
        userId: "user-1",
        accountId: "acc-plaid-1",
        institutionId: "ins-1",
        institutionName: "Chase",
        accountName: "Checking",
        accountType: "depository",
        accountSubtype: "checking",
        mask: "1234",
        currentBalance: 5000,
        currency: "USD",
        lastSynced: "2026-01-01",
        createdAt: "2026-01-01",
      },
    ],
    netWorth: 50000,
    totalAssets: 80000,
    totalLiabilities: 30000,
    monthlyIncome: 6000,
    monthlyExpenses: 4000,
    cashFlow: 2000,
    savingsRate: 33.3,
    recentTransactions: [],
    spendingByCategory: [],
    monthlyTrend: [],
  },
};

describe("FinancialDashboard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders loading skeleton initially", () => {
    global.fetch = jest.fn(() => new Promise(() => {})) as jest.Mock;

    render(<FinancialDashboard />);
    expect(document.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("displays error state with Try Again button", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({ ok: false, status: 500 }),
    ) as jest.Mock;

    render(<FinancialDashboard />);

    await waitFor(() => {
      expect(
        screen.getByText("Error Loading Dashboard"),
      ).toBeInTheDocument();
    });

    expect(screen.getByText("Try Again")).toBeInTheDocument();
  });

  it("handles Try Again button click", async () => {
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

    render(<FinancialDashboard />);

    await waitFor(() => {
      expect(screen.getByText("Try Again")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Try Again"));

    await waitFor(() => {
      expect(screen.getByText("Financial Dashboard")).toBeInTheDocument();
    });
  });

  it("shows connect bank account when no accounts", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            data: {
              ...mockDashboardData.data,
              accounts: [],
            },
          }),
      }),
    ) as jest.Mock;

    render(<FinancialDashboard />);

    await waitFor(() => {
      expect(
        screen.getByText("Connect Your Bank Account"),
      ).toBeInTheDocument();
    });
  });

  it("displays full dashboard with data", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockDashboardData),
      }),
    ) as jest.Mock;

    render(<FinancialDashboard />);

    await waitFor(() => {
      expect(screen.getByText("Financial Dashboard")).toBeInTheDocument();
    });

    // Check child components are rendered
    expect(screen.getByTestId("health-score-card")).toBeInTheDocument();
    expect(screen.getByTestId("budget-status-card")).toBeInTheDocument();
    expect(screen.getByTestId("quick-actions-bar")).toBeInTheDocument();
    expect(screen.getByTestId("ai-insights-panel")).toBeInTheDocument();
    expect(screen.getByTestId("accounts-summary-card")).toBeInTheDocument();
  });

  it("displays stats cards", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockDashboardData),
      }),
    ) as jest.Mock;

    render(<FinancialDashboard />);

    await waitFor(() => {
      expect(screen.getByText("Financial Dashboard")).toBeInTheDocument();
    });

    expect(screen.getByText("Net Worth")).toBeInTheDocument();
    expect(screen.getByText("Monthly Income")).toBeInTheDocument();
    expect(screen.getByText("Monthly Expenses")).toBeInTheDocument();
  });

  it("returns null when dashboard is null", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: null }),
      }),
    ) as jest.Mock;

    const { container } = render(<FinancialDashboard />);

    await waitFor(() => {
      expect(
        document.querySelector(".animate-pulse"),
      ).not.toBeInTheDocument();
    });

    // Should render nothing when dashboard is null
    expect(container.innerHTML).toBe("");
  });
});
