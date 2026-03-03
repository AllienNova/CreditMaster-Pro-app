import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import SavingsAutomation from "../SavingsAutomation";

jest.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "user-1", email: "test@test.com" },
    loading: false,
  }),
}));

const mockToastError = jest.fn();
const mockToastSuccess = jest.fn();
jest.mock("@/components/ui/Toast", () => ({
  useToast: () => ({ error: mockToastError, success: mockToastSuccess }),
}));

jest.mock("@/lib/financial/types/savings.types", () => ({}));

const mockSavingsData = {
  data: {
    summary: {
      totalSaved: 12500,
      totalSavedThisMonth: 850,
      roundUpSavings: 125,
      activeRules: 3,
      savingsRate: 25,
      projectedMonthlySavings: 900,
      projectedYearlySavings: 10800,
      goalsOnTrack: 2,
      goalsBehind: 1,
    },
    rules: [
      {
        id: "rule-1",
        name: "Round-Up Savings",
        type: "round_up",
        isActive: true,
        amount: 0,
        frequency: "per_transaction",
        targetGoalId: "goal-1",
        totalSaved: 125,
        lastTriggered: "2026-02-20",
      },
      {
        id: "rule-2",
        name: "Weekly Fixed",
        type: "fixed",
        isActive: true,
        amount: 100,
        frequency: "weekly",
        targetGoalId: "goal-1",
        totalSaved: 400,
        lastTriggered: "2026-02-18",
      },
    ],
    goals: [
      {
        id: "goal-1",
        name: "Emergency Fund",
        category: "emergency_fund",
        targetAmount: 15000,
        currentAmount: 8500,
        targetDate: "2027-01-01",
        status: "active",
        priority: "high",
        monthlyContribution: 500,
      },
    ],
    insights: [
      {
        id: "insight-1",
        type: "tip",
        title: "Increase round-ups",
        description: "Consider 2x round-ups",
        priority: "medium",
      },
    ],
    recommendations: [
      {
        id: "rec-1",
        type: "increase_savings",
        title: "Boost your savings",
        description: "You can save $200 more",
        estimatedImpact: 200,
        difficulty: "easy",
      },
    ],
  },
};

describe("SavingsAutomation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders loading skeleton initially", () => {
    global.fetch = jest.fn(() => new Promise(() => {})) as jest.Mock;

    render(<SavingsAutomation />);
    expect(document.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("displays savings data after loading", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockSavingsData),
      }),
    ) as jest.Mock;

    render(<SavingsAutomation />);

    await waitFor(() => {
      expect(screen.getByText("Total Auto-Saved")).toBeInTheDocument();
    });
  });

  it("displays summary cards", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockSavingsData),
      }),
    ) as jest.Mock;

    render(<SavingsAutomation />);

    await waitFor(() => {
      expect(screen.getByText("Total Auto-Saved")).toBeInTheDocument();
    });

    expect(screen.getByText("This Month")).toBeInTheDocument();
    expect(screen.getByText("Round-Up Savings")).toBeInTheDocument();
  });

  it("shows error toast when fetch fails", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({ ok: false, status: 500 }),
    ) as jest.Mock;

    render(<SavingsAutomation />);

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith(
        "Failed to load savings data",
      );
    });
  });

  it("returns null when data is null", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({ ok: false, status: 500 }),
    ) as jest.Mock;

    const { container } = render(<SavingsAutomation />);

    await waitFor(() => {
      expect(
        document.querySelector(".animate-pulse"),
      ).not.toBeInTheDocument();
    });

    expect(container.innerHTML).toBe("");
  });

  it("displays tab navigation", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockSavingsData),
      }),
    ) as jest.Mock;

    render(<SavingsAutomation />);

    await waitFor(() => {
      expect(screen.getByText("Total Auto-Saved")).toBeInTheDocument();
    });

    expect(screen.getByText("Overview")).toBeInTheDocument();
    expect(screen.getByText("Rules")).toBeInTheDocument();
    expect(screen.getByText("Goals")).toBeInTheDocument();
  });

  it("displays active rules count in summary", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockSavingsData),
      }),
    ) as jest.Mock;

    render(<SavingsAutomation />);

    await waitFor(() => {
      expect(screen.getByText("Total Auto-Saved")).toBeInTheDocument();
    });

    expect(screen.getByText("3 active rules")).toBeInTheDocument();
  });
});
