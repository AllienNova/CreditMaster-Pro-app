import { render, screen, waitFor } from "@testing-library/react";
import AIFinancialCoach from "../AIFinancialCoach";

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

jest.mock("@/components/ui", () => ({
  Modal: ({
    isOpen,
    onClose,
    title,
    children,
  }: {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
  }) =>
    isOpen ? (
      <div data-testid="modal">
        <div data-testid="modal-title">{title}</div>
        <button onClick={onClose}>Close</button>
        {children}
      </div>
    ) : null,
}));

jest.mock("@/components/charts", () => ({
  AreaChartComponent: () => <div data-testid="area-chart" />,
  BarChartComponent: () => <div data-testid="bar-chart" />,
}));

const mockDashboardData = {
  snapshot: {
    healthScore: 72,
    healthGrade: "B",
    netWorth: 50000,
    totalDebt: 15000,
    monthlyIncome: 6000,
    monthlyExpenses: 4000,
    savingsRate: 33,
    emergencyFundMonths: 3,
  },
  babySteps: [
    {
      step: 1,
      title: "Build Emergency Fund",
      description: "Save $1,000 for emergencies",
      completed: true,
      progress: 100,
    },
    {
      step: 2,
      title: "Pay Off Debt",
      description: "Eliminate all non-mortgage debt",
      completed: false,
      progress: 40,
    },
  ],
  actionPlans: [
    {
      id: "plan-1",
      title: "Build Emergency Fund",
      description: "Save 3 months of expenses",
      priority: "high" as const,
      category: "savings",
      estimatedImpact: "High",
      timeframe: "3 months",
      steps: ["Set up auto-transfer", "Cut subscriptions"],
      completed: false,
    },
  ],
  recommendations: [
    {
      id: "rec-1",
      type: "tip" as const,
      title: "Great savings habit",
      description: "You saved 20% of income this month",
      impact: "Medium",
      action: "Keep it up",
      priority: 2,
    },
  ],
  criticalIssues: [],
  opportunities: ["Automate your savings to build wealth effortlessly"],
};

describe("AIFinancialCoach", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders loading skeleton initially", () => {
    global.fetch = jest.fn(() => new Promise(() => {})) as jest.Mock;

    render(<AIFinancialCoach />);
    expect(document.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("renders no data message when fetch fails", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({ ok: false, status: 500 }),
    ) as jest.Mock;

    render(<AIFinancialCoach />);

    await waitFor(() => {
      expect(mockError).toHaveBeenCalled();
    });
  });

  it("displays dashboard data after loading", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockDashboardData),
      }),
    ) as jest.Mock;

    render(<AIFinancialCoach />);

    await waitFor(() => {
      expect(
        screen.getByText("Welcome to Your AI Financial Coach"),
      ).toBeInTheDocument();
    });
  });

  it("displays health score", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockDashboardData),
      }),
    ) as jest.Mock;

    render(<AIFinancialCoach />);

    await waitFor(() => {
      expect(screen.getByText("72")).toBeInTheDocument();
    });
  });

  it("displays insights", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockDashboardData),
      }),
    ) as jest.Mock;

    render(<AIFinancialCoach />);

    await waitFor(() => {
      expect(screen.getByText("Great savings habit")).toBeInTheDocument();
    });
  });

  it("displays action plan with steps", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockDashboardData),
      }),
    ) as jest.Mock;

    render(<AIFinancialCoach />);

    await waitFor(() => {
      expect(
        screen.getAllByText("Build Emergency Fund").length,
      ).toBeGreaterThanOrEqual(1);
    });
  });

  it("displays opportunities", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockDashboardData),
      }),
    ) as jest.Mock;

    render(<AIFinancialCoach />);

    await waitFor(() => {
      expect(screen.getByText("Opportunities")).toBeInTheDocument();
    });

    expect(
      screen.getByText(
        "Automate your savings to build wealth effortlessly",
      ),
    ).toBeInTheDocument();
  });
});
