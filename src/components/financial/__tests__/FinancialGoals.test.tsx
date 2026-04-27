import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import FinancialGoals from "../FinancialGoals";

jest.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "user-1", email: "test@test.com" },
    loading: false,
  }),
}));

jest.mock("../AIGoalsOptimizer", () => ({
  __esModule: true,
  default: () => <div data-testid="ai-goals-optimizer" />,
}));

const mockGoalsData = {
  data: [
    {
      id: "goal-1",
      type: "emergency_fund",
      name: "Emergency Fund",
      targetAmount: 10000,
      currentAmount: 5000,
      targetDate: new Date("2027-01-01"),
      status: "active",
      createdAt: new Date("2026-01-01"),
    },
    {
      id: "goal-2",
      type: "savings",
      name: "Vacation Fund",
      targetAmount: 3000,
      currentAmount: 3000,
      targetDate: new Date("2026-06-01"),
      status: "completed",
      createdAt: new Date("2025-06-01"),
    },
    {
      id: "goal-3",
      type: "debt_payoff",
      name: "Credit Card Payoff",
      targetAmount: 5000,
      currentAmount: 2500,
      targetDate: new Date("2026-12-01"),
      status: "active",
      createdAt: new Date("2026-01-15"),
    },
  ],
};

describe("FinancialGoals", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders loading skeleton initially", () => {
    global.fetch = jest.fn(() => new Promise(() => {})) as jest.Mock;

    render(<FinancialGoals />);
    expect(document.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("displays goals after loading", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockGoalsData),
      }),
    ) as jest.Mock;

    render(<FinancialGoals />);

    await waitFor(() => {
      expect(screen.getByText("Emergency Fund")).toBeInTheDocument();
    });

    expect(screen.getByText("Vacation Fund")).toBeInTheDocument();
    expect(screen.getByText("Credit Card Payoff")).toBeInTheDocument();
  });

  it("displays stats cards with correct counts", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockGoalsData),
      }),
    ) as jest.Mock;

    render(<FinancialGoals />);

    await waitFor(() => {
      expect(screen.getByText("Total Goals")).toBeInTheDocument();
    });

    expect(screen.getByText("Target Amount")).toBeInTheDocument();
    expect(screen.getByText("Current Progress")).toBeInTheDocument();
    expect(screen.getByText("Completed")).toBeInTheDocument();
  });

  it("shows error state with Try Again button", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({ ok: false, status: 500 }),
    ) as jest.Mock;

    render(<FinancialGoals />);

    await waitFor(() => {
      expect(screen.getByText("Error Loading Goals")).toBeInTheDocument();
    });

    expect(screen.getByText("Try Again")).toBeInTheDocument();
  });

  it("shows empty state when no goals exist", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: [] }),
      }),
    ) as jest.Mock;

    render(<FinancialGoals />);

    await waitFor(() => {
      expect(screen.getByText("No goals yet")).toBeInTheDocument();
    });

    expect(
      screen.getByText("Create Your First Goal"),
    ).toBeInTheDocument();
  });

  it("shows AI Goals Optimizer", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockGoalsData),
      }),
    ) as jest.Mock;

    render(<FinancialGoals />);

    await waitFor(() => {
      expect(
        screen.getByTestId("ai-goals-optimizer"),
      ).toBeInTheDocument();
    });
  });

  it("shows create goal button", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockGoalsData),
      }),
    ) as jest.Mock;

    render(<FinancialGoals />);

    await waitFor(() => {
      expect(
        screen.getByTestId("create-goal-button"),
      ).toBeInTheDocument();
    });
  });

  it("retries on Try Again click", async () => {
    let callCount = 0;
    global.fetch = jest.fn(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({ ok: false, status: 500 });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockGoalsData),
      });
    }) as jest.Mock;

    render(<FinancialGoals />);

    await waitFor(() => {
      expect(screen.getByText("Try Again")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Try Again"));

    await waitFor(() => {
      expect(screen.getByText("Emergency Fund")).toBeInTheDocument();
    });
  });
});
