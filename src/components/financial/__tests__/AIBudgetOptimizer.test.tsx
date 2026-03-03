import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import AIBudgetOptimizer from "../AIBudgetOptimizer";

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

const mockApiData = {
  data: [
    {
      id: "rec-1",
      category: "Food & Dining",
      currentAmount: 500,
      suggestedAmount: 400,
      reason: "Spending is above average for your income",
      potentialSavings: 100,
      impact: "high" as const,
    },
    {
      id: "rec-2",
      category: "Entertainment",
      currentAmount: 200,
      suggestedAmount: 150,
      reason: "Can be reduced without significant lifestyle impact",
      impact: "medium" as const,
    },
  ],
};

describe("AIBudgetOptimizer", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders loading skeleton initially", () => {
    global.fetch = jest.fn(() => new Promise(() => {})) as jest.Mock;

    render(<AIBudgetOptimizer />);
    expect(document.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("renders null when no recommendations", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: [] }),
      }),
    ) as jest.Mock;

    const { container } = render(<AIBudgetOptimizer />);

    await waitFor(() => {
      expect(container.innerHTML).toBe("");
    });
  });

  it("displays budget recommendations after loading", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockApiData),
      }),
    ) as jest.Mock;

    render(<AIBudgetOptimizer />);

    await waitFor(() => {
      expect(screen.getByText("AI Budget Optimizer")).toBeInTheDocument();
    });

    expect(screen.getAllByText("Food & Dining").length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getByText("Spending is above average for your income"),
    ).toBeInTheDocument();
  });

  it("displays optimization score and savings", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockApiData),
      }),
    ) as jest.Mock;

    render(<AIBudgetOptimizer />);

    await waitFor(() => {
      expect(screen.getByText("Optimization Score")).toBeInTheDocument();
    });

    expect(screen.getByText("Potential Monthly Savings")).toBeInTheDocument();
  });

  it("displays spending predictions", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockApiData),
      }),
    ) as jest.Mock;

    render(<AIBudgetOptimizer />);

    await waitFor(() => {
      expect(screen.getByText("Next Month Predictions")).toBeInTheDocument();
    });

    expect(screen.getByText("Transportation")).toBeInTheDocument();
    expect(screen.getByText("Shopping")).toBeInTheDocument();
  });

  it("handles Apply button click", async () => {
    let fetchCallCount = 0;
    global.fetch = jest.fn(() => {
      fetchCallCount++;
      if (fetchCallCount === 1) {
        // Initial load
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockApiData),
        });
      }
      // Apply recommendation POST
      if (fetchCallCount === 2) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        });
      }
      // Refresh after apply
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockApiData),
      });
    }) as jest.Mock;

    render(<AIBudgetOptimizer />);

    await waitFor(() => {
      expect(screen.getAllByText("Food & Dining").length).toBeGreaterThanOrEqual(1);
    });

    const applyButtons = screen.getAllByText("Apply");
    fireEvent.click(applyButtons[0]);

    await waitFor(() => {
      expect(mockSuccess).toHaveBeenCalledWith(
        "Budget updated!",
        "Food & Dining budget optimized",
      );
    });
  });

  it("toggles collapse/expand", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockApiData),
      }),
    ) as jest.Mock;

    render(<AIBudgetOptimizer />);

    await waitFor(() => {
      expect(screen.getByText("AI Budget Optimizer")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Collapse"));
    expect(screen.queryByText("Food & Dining")).not.toBeInTheDocument();

    fireEvent.click(screen.getByText("Expand"));
    expect(screen.getAllByText("Food & Dining").length).toBeGreaterThanOrEqual(1);
  });

  it("calls toast.error when fetch fails", async () => {
    global.fetch = jest.fn(() =>
      Promise.reject(new Error("Network error")),
    ) as jest.Mock;

    render(<AIBudgetOptimizer />);

    await waitFor(() => {
      expect(mockError).toHaveBeenCalledWith(
        "Failed to load AI recommendations",
        "Please try again later",
      );
    });
  });
});
