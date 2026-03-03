import { render, screen, waitFor } from "@testing-library/react";
import BudgetManagement from "../BudgetManagement";

const mockUser = { id: "user-1", email: "test@test.com" };
jest.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: mockUser,
    loading: false,
  }),
}));

const mockError = jest.fn();
const mockSuccess = jest.fn();
jest.mock("@/components/ui", () => ({
  Modal: ({
    isOpen,
    children,
    title,
  }: {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
  }) =>
    isOpen ? (
      <div data-testid="modal">
        <div>{title}</div>
        {children}
      </div>
    ) : null,
  ConfirmDialog: ({
    isOpen,
  }: {
    isOpen: boolean;
    onConfirm: () => void;
    onCancel: () => void;
    title: string;
    message: string;
  }) => (isOpen ? <div data-testid="confirm-dialog" /> : null),
  useToast: () => ({ error: mockError, success: mockSuccess }),
}));

jest.mock("@/components/charts", () => ({
  DonutChartComponent: () => <div data-testid="donut-chart" />,
  BarChartComponent: () => <div data-testid="bar-chart" />,
  ChartContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="chart-container">{children}</div>
  ),
}));

jest.mock("../AIBudgetOptimizer", () => ({
  __esModule: true,
  default: () => <div data-testid="ai-budget-optimizer" />,
}));

const mockBudgetData = {
  data: {
    budgets: [
      {
        id: "budget-1",
        name: "Food & Dining Budget",
        category: "Food & Dining",
        amount: 500,
        spent: 350,
        period: "monthly" as const,
        startDate: "2026-01-01",
        endDate: "2026-01-31",
        alertThreshold: 80,
        isActive: true,
        rolloverEnabled: false,
        rolloverAmount: 0,
      },
      {
        id: "budget-2",
        name: "Entertainment Budget",
        category: "Entertainment",
        amount: 200,
        spent: 220,
        period: "monthly" as const,
        startDate: "2026-01-01",
        endDate: "2026-01-31",
        alertThreshold: 80,
        isActive: true,
        rolloverEnabled: false,
        rolloverAmount: 0,
      },
    ],
    summary: {
      totalBudgeted: 700,
      totalSpent: 570,
      totalRemaining: 130,
      budgetCount: 2,
      overBudgetCount: 1,
      nearLimitCount: 0,
    },
  },
};

describe("BudgetManagement", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders loading skeleton initially", () => {
    global.fetch = jest.fn(() => new Promise(() => {})) as jest.Mock;

    render(<BudgetManagement />);
    expect(document.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("displays budget data after loading", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockBudgetData),
      }),
    ) as jest.Mock;

    render(<BudgetManagement />);

    await waitFor(() => {
      expect(
        screen.getByText("Food & Dining Budget"),
      ).toBeInTheDocument();
    });

    expect(
      screen.getByText("Entertainment Budget"),
    ).toBeInTheDocument();
  });

  it("shows AI Budget Optimizer", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockBudgetData),
      }),
    ) as jest.Mock;

    render(<BudgetManagement />);

    await waitFor(() => {
      expect(
        screen.getByTestId("ai-budget-optimizer"),
      ).toBeInTheDocument();
    });
  });

  it("shows error state when fetch fails", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({ ok: false, status: 500 }),
    ) as jest.Mock;

    render(<BudgetManagement />);

    await waitFor(() => {
      expect(screen.getByText("Try Again")).toBeInTheDocument();
    });
  });

  it("handles empty budget list", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            data: {
              budgets: [],
              summary: {
                totalBudgeted: 0,
                totalSpent: 0,
                totalRemaining: 0,
                budgetCount: 0,
                overBudgetCount: 0,
                nearLimitCount: 0,
              },
            },
          }),
      }),
    ) as jest.Mock;

    render(<BudgetManagement />);

    await waitFor(() => {
      expect(
        document.querySelector(".animate-pulse"),
      ).not.toBeInTheDocument();
    });
  });

  it("shows loading skeleton when user is null", () => {
    // Override the useAuth mock for this test
    jest.spyOn(
      require("@/hooks/useAuth"),
      "useAuth",
    ).mockReturnValue({ user: null, loading: false });

    global.fetch = jest.fn(() => new Promise(() => {})) as jest.Mock;

    render(<BudgetManagement />);

    // When user is null, fetchBudgets never runs so loading stays true,
    // and the component renders the loading skeleton before reaching the
    // "not authenticated" check.
    expect(document.querySelector(".animate-pulse")).toBeInTheDocument();
  });
});
