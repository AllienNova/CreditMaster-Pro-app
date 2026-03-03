import { render, screen, waitFor } from "@testing-library/react";
import DebtPayoffPlanner from "../DebtPayoffPlanner";

const mockUser = { id: "user-1", email: "test@test.com" };
jest.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: mockUser,
    loading: false,
  }),
}));

const mockShowError = jest.fn();
const mockToast = { error: mockShowError, success: jest.fn() };
jest.mock("@/components/ui/Toast", () => ({
  useToast: () => mockToast,
}));

jest.mock("@/components/charts/AreaChart", () => ({
  __esModule: true,
  default: () => <div data-testid="area-chart" />,
}));

jest.mock("@/components/ui/Icon", () => ({
  Icon: ({ name }: { name: string }) => <span data-testid={`icon-${name}`} />,
}));

jest.mock("@/lib/financial/types/debt-payoff.types", () => ({}));

const mockDebtsResponse = {
  data: {
    debts: [
      {
        id: "debt-1",
        name: "Chase Visa",
        type: "credit_card",
        balance: 5000,
        interestRate: 22.99,
        minimumPayment: 100,
        dueDate: "2026-03-15",
      },
      {
        id: "debt-2",
        name: "Student Loan",
        type: "student_loan",
        balance: 25000,
        interestRate: 5.5,
        minimumPayment: 250,
        dueDate: "2026-03-01",
      },
    ],
    overview: {
      totalDebt: 30000,
      debtCount: 2,
      totalMinimumPayments: 350,
      highestRate: 22.99,
      lowestBalance: 5000,
      weightedAverageRate: 8.41,
    },
    insights: [
      {
        id: "insight-1",
        type: "tip",
        title: "Focus on high interest",
        description: "Pay off credit card first",
        priority: "high",
      },
    ],
  },
};

const mockStrategyResponse = {
  success: true,
  data: {
    strategies: [
      {
        method: "avalanche",
        totalMonths: 48,
        totalInterest: 8500,
        interestSaved: 3500,
        monthsSaved: 12,
        payoffDate: "2030-03-01",
        monthlyPayments: [],
        milestones: [
          {
            id: "m1",
            debtId: "debt-1",
            debtName: "Chase Visa",
            date: "2028-01-01",
            type: "payoff",
            amount: 5000,
          },
        ],
        timeline: [
          {
            month: 1,
            date: "2026-04-01",
            totalBalance: 29500,
            totalPaid: 500,
            totalInterest: 150,
            debtBalances: { "debt-1": 4700, "debt-2": 24800 },
            debtsPaidOff: [],
          },
          {
            month: 12,
            date: "2027-03-01",
            totalBalance: 24000,
            totalPaid: 6000,
            totalInterest: 1500,
            debtBalances: { "debt-1": 2000, "debt-2": 22000 },
            debtsPaidOff: [],
          },
        ],
        debtOrder: [
          {
            debtId: "debt-1",
            debtName: "Chase Visa",
            balance: 5000,
            interestRate: 22.99,
            payoffMonth: 24,
          },
          {
            debtId: "debt-2",
            debtName: "Student Loan",
            balance: 25000,
            interestRate: 5.5,
            payoffMonth: 48,
          },
        ],
      },
      {
        method: "snowball",
        totalMonths: 50,
        totalInterest: 9000,
        interestSaved: 3000,
        monthsSaved: 10,
        payoffDate: "2030-05-01",
        monthlyPayments: [],
        milestones: [],
        timeline: [
          {
            month: 1,
            date: "2026-04-01",
            totalBalance: 29500,
            totalPaid: 500,
            totalInterest: 150,
            debtBalances: { "debt-1": 4700, "debt-2": 24800 },
            debtsPaidOff: [],
          },
        ],
        debtOrder: [
          {
            debtId: "debt-1",
            debtName: "Chase Visa",
            balance: 5000,
            interestRate: 22.99,
            payoffMonth: 26,
          },
          {
            debtId: "debt-2",
            debtName: "Student Loan",
            balance: 25000,
            interestRate: 5.5,
            payoffMonth: 50,
          },
        ],
      },
    ],
  },
};

describe("DebtPayoffPlanner", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders loading skeleton initially", () => {
    global.fetch = jest.fn(() => new Promise(() => {})) as jest.Mock;

    render(<DebtPayoffPlanner />);
    expect(document.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("displays debt data after loading", async () => {
    global.fetch = jest.fn((url: string) => {
      if (typeof url === "string" && url.includes("debt-strategy")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockStrategyResponse),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockDebtsResponse),
      });
    }) as jest.Mock;

    render(<DebtPayoffPlanner />);

    await waitFor(() => {
      expect(screen.getByText("Total Debt")).toBeInTheDocument();
    });
  });

  it("displays summary cards with correct data", async () => {
    global.fetch = jest.fn((url: string) => {
      if (typeof url === "string" && url.includes("debt-strategy")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockStrategyResponse),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockDebtsResponse),
      });
    }) as jest.Mock;

    render(<DebtPayoffPlanner />);

    await waitFor(() => {
      expect(screen.getByText("Total Debt")).toBeInTheDocument();
    });

    expect(screen.getByText("Monthly Payments")).toBeInTheDocument();
    expect(screen.getByText("Payoff Date")).toBeInTheDocument();
    expect(screen.getByText("Interest Saved")).toBeInTheDocument();
  });

  it("shows no data message when data is null after error", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({ ok: false, status: 500 }),
    ) as jest.Mock;

    render(<DebtPayoffPlanner />);

    await waitFor(() => {
      expect(
        screen.getByText("No debt data available"),
      ).toBeInTheDocument();
    });
  });

  it("calls showError on fetch failure", async () => {
    global.fetch = jest.fn(() =>
      Promise.reject(new Error("Network error")),
    ) as jest.Mock;

    render(<DebtPayoffPlanner />);

    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalledWith("Failed to load debt data");
    });
  });

  it("displays tab navigation", async () => {
    global.fetch = jest.fn((url: string) => {
      if (typeof url === "string" && url.includes("debt-strategy")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockStrategyResponse),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockDebtsResponse),
      });
    }) as jest.Mock;

    render(<DebtPayoffPlanner />);

    await waitFor(() => {
      expect(screen.getByText("Total Debt")).toBeInTheDocument();
    });

    expect(screen.getByText("Overview")).toBeInTheDocument();
    expect(screen.getByText("My Debts")).toBeInTheDocument();
    expect(screen.getByText("Strategies")).toBeInTheDocument();
    expect(screen.getByText("Timeline")).toBeInTheDocument();
    expect(screen.getByText("Milestones")).toBeInTheDocument();
  });

  it("displays extra payment slider section", async () => {
    global.fetch = jest.fn((url: string) => {
      if (typeof url === "string" && url.includes("debt-strategy")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockStrategyResponse),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockDebtsResponse),
      });
    }) as jest.Mock;

    render(<DebtPayoffPlanner />);

    await waitFor(() => {
      expect(screen.getByText("Total Debt")).toBeInTheDocument();
    });

    expect(screen.getByText("Extra Monthly Payment")).toBeInTheDocument();
  });
});
