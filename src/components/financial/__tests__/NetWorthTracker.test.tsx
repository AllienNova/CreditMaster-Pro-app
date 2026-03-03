import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import NetWorthTracker from "../NetWorthTracker";

jest.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "user-1", email: "test@test.com" },
    loading: false,
  }),
}));

const mockShowSuccess = jest.fn();
const mockShowError = jest.fn();
jest.mock("@/components/ui/Toast", () => ({
  useToast: () => ({ success: mockShowSuccess, error: mockShowError }),
}));

jest.mock("@/components/charts/AreaChart", () => ({
  __esModule: true,
  default: () => <div data-testid="area-chart" />,
}));

jest.mock("@/components/charts/PieChart", () => ({
  __esModule: true,
  default: () => <div data-testid="pie-chart" />,
}));

jest.mock("@/components/ui/Icon", () => ({
  Icon: ({ name }: { name: string }) => <span data-testid={`icon-${name}`} />,
}));

const mockDashboardData = {
  data: {
    netWorth: 75000,
    totalAssets: 120000,
    totalLiabilities: 45000,
    accounts: [
      { id: "acc-1", name: "Checking", type: "depository", balance: 5000 },
    ],
    monthlyIncome: 6000,
    monthlyExpenses: 4000,
    monthlyChange: 5.2,
    savingsRate: 33.3,
    transactions: [],
    budgets: [],
  },
};

describe("NetWorthTracker", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders loading skeleton initially", () => {
    global.fetch = jest.fn(() => new Promise(() => {})) as jest.Mock;

    render(<NetWorthTracker />);
    expect(document.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("displays net worth data after loading", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockDashboardData),
      }),
    ) as jest.Mock;

    render(<NetWorthTracker />);

    await waitFor(() => {
      expect(screen.getByText("Net Worth")).toBeInTheDocument();
    });
  });

  it("displays summary cards", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockDashboardData),
      }),
    ) as jest.Mock;

    render(<NetWorthTracker />);

    await waitFor(() => {
      expect(screen.getByText("Net Worth")).toBeInTheDocument();
    });

    expect(screen.getByText("Total Assets")).toBeInTheDocument();
    expect(screen.getByText("Total Liabilities")).toBeInTheDocument();
  });

  it("displays tab navigation", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockDashboardData),
      }),
    ) as jest.Mock;

    render(<NetWorthTracker />);

    await waitFor(() => {
      expect(screen.getByText("Net Worth")).toBeInTheDocument();
    });

    expect(screen.getByText("Overview")).toBeInTheDocument();
    expect(screen.getByText("Assets")).toBeInTheDocument();
    expect(screen.getByText("Liabilities")).toBeInTheDocument();
    expect(screen.getByText("History")).toBeInTheDocument();
  });

  it("calls showError on fetch failure", async () => {
    global.fetch = jest.fn(() =>
      Promise.reject(new Error("Network error")),
    ) as jest.Mock;

    render(<NetWorthTracker />);

    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalledWith(
        "Failed to load net worth data",
      );
    });
  });

  it("returns null when data is null after error", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({ ok: false, status: 500 }),
    ) as jest.Mock;

    const { container } = render(<NetWorthTracker />);

    await waitFor(() => {
      expect(
        document.querySelector(".animate-pulse"),
      ).not.toBeInTheDocument();
    });

    // Returns null when data is null (after error)
    expect(container.innerHTML).toBe("");
  });

  it("switches tabs when clicked", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockDashboardData),
      }),
    ) as jest.Mock;

    render(<NetWorthTracker />);

    await waitFor(() => {
      expect(screen.getByText("Net Worth")).toBeInTheDocument();
    });

    // Click Assets tab
    fireEvent.click(screen.getByText("Assets"));

    // Assets tab content should be visible
    await waitFor(() => {
      expect(screen.getByText("Checking Account")).toBeInTheDocument();
    });
  });
});
