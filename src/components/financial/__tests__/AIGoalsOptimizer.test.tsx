import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import AIGoalsOptimizer from "../AIGoalsOptimizer";

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
    autoSaveEnabled: true,
    autoSaveRules: [
      {
        id: "rule-1",
        name: "Round Up Savings",
        type: "round_up" as const,
        amount: 1,
        linkedGoalId: "goal-1",
        linkedGoalName: "Emergency Fund",
        isActive: true,
        estimatedMonthlySavings: 45,
      },
    ],
    totalAutoSavings: 45,
    optimizations: [
      {
        goalId: "goal-1",
        goalName: "Emergency Fund",
        currentContribution: 200,
        recommendedContribution: 350,
        projectedCompletion: "2027-06-01",
        optimizedCompletion: "2026-12-01",
        monthsSaved: 6,
        confidence: 85,
      },
    ],
    achievementPredictions: [
      {
        goalId: "goal-1",
        goalName: "Emergency Fund",
        probability: 90,
        projectedDate: "2027-06-01",
        riskFactors: ["Irregular income months"],
      },
    ],
  },
};

describe("AIGoalsOptimizer", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders loading skeleton initially", () => {
    global.fetch = jest.fn(() => new Promise(() => {})) as jest.Mock;

    render(<AIGoalsOptimizer />);
    expect(document.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("renders null when data is null", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({ ok: false, status: 500 }),
    ) as jest.Mock;

    const { container } = render(<AIGoalsOptimizer />);

    await waitFor(() => {
      expect(container.innerHTML).toBe("");
    });
  });

  it("displays optimizer data after loading", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockData),
      }),
    ) as jest.Mock;

    render(<AIGoalsOptimizer />);

    await waitFor(() => {
      expect(screen.getByText("AI Goals Optimizer")).toBeInTheDocument();
    });

    expect(screen.getAllByText("$45").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Actively saving")).toBeInTheDocument();
  });

  it("displays auto-save rules", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockData),
      }),
    ) as jest.Mock;

    render(<AIGoalsOptimizer />);

    await waitFor(() => {
      expect(screen.getByText("Round Up Savings")).toBeInTheDocument();
    });
  });

  it("displays goal optimizations", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockData),
      }),
    ) as jest.Mock;

    render(<AIGoalsOptimizer />);

    await waitFor(() => {
      expect(
        screen.getByText("Goal Optimization Recommendations"),
      ).toBeInTheDocument();
    });

    expect(screen.getByText("Achieve 6 months faster!")).toBeInTheDocument();
    expect(screen.getByText("85% confidence")).toBeInTheDocument();
  });

  it("displays achievement predictions", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockData),
      }),
    ) as jest.Mock;

    render(<AIGoalsOptimizer />);

    await waitFor(() => {
      expect(
        screen.getByText("Achievement Predictions"),
      ).toBeInTheDocument();
    });

    expect(screen.getByText("90%")).toBeInTheDocument();
    expect(
      screen.getByText("Risk: Irregular income months"),
    ).toBeInTheDocument();
  });

  it("toggles collapse/expand", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockData),
      }),
    ) as jest.Mock;

    render(<AIGoalsOptimizer />);

    await waitFor(() => {
      expect(screen.getByText("AI Goals Optimizer")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Collapse"));
    expect(
      screen.queryByText("Round Up Savings"),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByText("Expand"));
    expect(screen.getByText("Round Up Savings")).toBeInTheDocument();
  });

  it("calls toast.error when fetch fails", async () => {
    global.fetch = jest.fn(() =>
      Promise.reject(new Error("Network error")),
    ) as jest.Mock;

    render(<AIGoalsOptimizer />);

    await waitFor(() => {
      expect(mockError).toHaveBeenCalledWith(
        "Failed to load AI recommendations",
        "Please try again later",
      );
    });
  });
});
