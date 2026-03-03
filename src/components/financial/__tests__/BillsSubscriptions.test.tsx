import { render, screen, waitFor } from "@testing-library/react";
import BillsSubscriptions from "../BillsSubscriptions";

const mockUser = { id: "user-1", email: "test@test.com" };
jest.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: mockUser,
    loading: false,
  }),
}));

const mockError = jest.fn();
const mockSuccess = jest.fn();
jest.mock("@/components/ui/Toast", () => ({
  useToast: () => ({ error: mockError, success: mockSuccess }),
}));

jest.mock("@/components/ui", () => ({
  Modal: ({
    isOpen,
    children,
  }: {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
  }) => (isOpen ? <div data-testid="modal">{children}</div> : null),
  ConfirmDialog: ({
    isOpen,
  }: {
    isOpen: boolean;
    onConfirm: () => void;
    onCancel: () => void;
    title: string;
    message: string;
  }) => (isOpen ? <div data-testid="confirm-dialog" /> : null),
}));

jest.mock("@/components/charts", () => ({
  PieChartComponent: () => <div data-testid="pie-chart" />,
  LineChartComponent: () => <div data-testid="line-chart" />,
  ChartContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="chart-container">{children}</div>
  ),
}));

jest.mock("@/lib/financial/types/bill.types", () => ({}));

jest.mock("../AIBillsOptimizer", () => ({
  __esModule: true,
  default: () => <div data-testid="ai-bills-optimizer" />,
}));

const mockBillsData = {
  bills: [
    {
      id: "bill-1",
      userId: "user-1",
      merchantName: "Internet Service",
      category: "internet" as const,
      amount: 100,
      frequency: "monthly" as const,
      nextDueDate: "2026-03-01",
      status: "active" as const,
      isAutoPay: true,
      createdAt: "2026-01-01",
      updatedAt: "2026-01-01",
    },
  ],
};

const mockSummaryData = {
  summary: {
    totalMonthly: 100,
    totalYearly: 1200,
    upcomingCount: 1,
    overdueCount: 0,
    subscriptionTotal: 0,
    billsTotal: 100,
  },
};

describe("BillsSubscriptions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders loading state initially", () => {
    global.fetch = jest.fn(() => new Promise(() => {})) as jest.Mock;

    render(<BillsSubscriptions />);
    expect(document.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("displays bills data after loading", async () => {
    global.fetch = jest.fn((url: string) => {
      if (typeof url === "string" && url.includes("summary")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockSummaryData),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockBillsData),
      });
    }) as jest.Mock;

    render(<BillsSubscriptions />);

    await waitFor(() => {
      expect(
        screen.getAllByText("Internet Service").length,
      ).toBeGreaterThanOrEqual(1);
    });
  });

  it("displays summary information", async () => {
    global.fetch = jest.fn((url: string) => {
      if (typeof url === "string" && url.includes("summary")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockSummaryData),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockBillsData),
      });
    }) as jest.Mock;

    render(<BillsSubscriptions />);

    await waitFor(() => {
      expect(
        screen.getAllByText("Internet Service").length,
      ).toBeGreaterThanOrEqual(1);
    });

    // Should show the AI Bills Optimizer
    expect(screen.getByTestId("ai-bills-optimizer")).toBeInTheDocument();
  });

  it("shows error UI when fetch fails", async () => {
    global.fetch = jest.fn(() =>
      Promise.reject(new Error("Network error")),
    ) as jest.Mock;

    render(<BillsSubscriptions />);

    await waitFor(() => {
      expect(screen.getByText("Error Loading Bills")).toBeInTheDocument();
    });

    expect(screen.getByText("Try Again")).toBeInTheDocument();
  });

  it("handles empty bills list", async () => {
    global.fetch = jest.fn((url: string) => {
      if (typeof url === "string" && url.includes("summary")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              summary: {
                totalMonthly: 0,
                totalYearly: 0,
                upcomingCount: 0,
                overdueCount: 0,
                subscriptionTotal: 0,
                billsTotal: 0,
              },
            }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ bills: [] }),
      });
    }) as jest.Mock;

    render(<BillsSubscriptions />);

    await waitFor(() => {
      expect(
        document.querySelector(".animate-pulse"),
      ).not.toBeInTheDocument();
    });
  });
});
