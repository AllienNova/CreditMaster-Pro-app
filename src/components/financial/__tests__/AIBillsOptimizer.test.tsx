import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import AIBillsOptimizer from "../AIBillsOptimizer";

// Mock useAuth - arrow function wrapper survives resetMocks
const mockUser = { id: "user-1", email: "test@test.com" };
jest.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: mockUser }),
}));

// Mock useToast
const mockError = jest.fn();
const mockSuccess = jest.fn();
const mockToast = { error: mockError, success: mockSuccess };
jest.mock("@/components/ui/Toast", () => ({
  useToast: () => mockToast,
}));

// Mock next/link
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

const mockData = {
  data: {
    negotiationOpportunities: [
      {
        id: "opp-1",
        billName: "Internet Service",
        category: "Utilities",
        currentAmount: 100,
        estimatedSavings: 25,
        savingsPercentage: 25,
        difficulty: "easy" as const,
        successProbability: 80,
        bestTimeToCall: "Tuesday morning",
        tips: ["Mention competitor pricing", "Ask for loyalty discount"],
      },
    ],
    subscriptionOptimizations: [
      {
        id: "sub-1",
        name: "Streaming Service",
        amount: 15,
        frequency: "month",
        lastUsed: "2 days ago",
        usageScore: 40,
        recommendation: "downgrade" as const,
        alternativeSuggestion: "Switch to basic plan",
        potentialSavings: 7,
      },
    ],
    dueDateOptimizations: [
      {
        billName: "Electric Bill",
        currentDueDate: 5,
        recommendedDueDate: 20,
        reason: "Aligns with paycheck",
        benefit: "Better cash flow management",
      },
    ],
    totalPotentialSavings: 32,
    optimizationScore: 72,
  },
};

describe("AIBillsOptimizer", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders loading skeleton initially", () => {
    global.fetch = jest.fn(
      () => new Promise(() => {}), // never resolves
    ) as jest.Mock;

    render(<AIBillsOptimizer />);
    expect(document.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("renders null when data is null after fetch error", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({ ok: false, status: 500 }),
    ) as jest.Mock;

    const { container } = render(<AIBillsOptimizer />);

    await waitFor(() => {
      expect(container.innerHTML).toBe("");
    });
  });

  it("displays optimization score and savings when data loads", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockData),
      }),
    ) as jest.Mock;

    render(<AIBillsOptimizer />);

    await waitFor(() => {
      expect(screen.getByText("AI Bills Optimizer")).toBeInTheDocument();
    });

    expect(screen.getByText("72/100")).toBeInTheDocument();
    expect(screen.getByText("$32")).toBeInTheDocument();
  });

  it("displays negotiation opportunities", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockData),
      }),
    ) as jest.Mock;

    render(<AIBillsOptimizer />);

    await waitFor(() => {
      expect(screen.getByText("Internet Service")).toBeInTheDocument();
    });

    expect(screen.getByText("easy")).toBeInTheDocument();
    expect(screen.getByText("$25/mo")).toBeInTheDocument();
    expect(screen.getByText("80%")).toBeInTheDocument();
    expect(
      screen.getByText("Mention competitor pricing"),
    ).toBeInTheDocument();
  });

  it("displays subscription optimizations", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockData),
      }),
    ) as jest.Mock;

    render(<AIBillsOptimizer />);

    await waitFor(() => {
      expect(screen.getByText("Streaming Service")).toBeInTheDocument();
    });

    expect(screen.getByText("downgrade")).toBeInTheDocument();
    expect(screen.getByText("Switch to basic plan")).toBeInTheDocument();
  });

  it("displays due date optimizations", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockData),
      }),
    ) as jest.Mock;

    render(<AIBillsOptimizer />);

    await waitFor(() => {
      expect(screen.getByText("Electric Bill")).toBeInTheDocument();
    });

    expect(screen.getByText("Aligns with paycheck")).toBeInTheDocument();
  });

  it("toggles collapse/expand", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockData),
      }),
    ) as jest.Mock;

    render(<AIBillsOptimizer />);

    await waitFor(() => {
      expect(screen.getByText("AI Bills Optimizer")).toBeInTheDocument();
    });

    const collapseBtn = screen.getByText("Collapse");
    fireEvent.click(collapseBtn);

    expect(screen.queryByText("Internet Service")).not.toBeInTheDocument();
    expect(screen.getByText("Expand")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Expand"));
    expect(screen.getByText("Internet Service")).toBeInTheDocument();
  });

  it("calls toast.error when fetch fails", async () => {
    global.fetch = jest.fn(() =>
      Promise.reject(new Error("Network error")),
    ) as jest.Mock;

    render(<AIBillsOptimizer />);

    await waitFor(() => {
      expect(mockError).toHaveBeenCalledWith(
        "Failed to load AI recommendations",
        "Please try again later",
      );
    });
  });
});
