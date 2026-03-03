import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import BillNegotiationAssistant from "../BillNegotiationAssistant";

// BillNegotiationAssistant does NOT use useAuth directly
const mockError = jest.fn();
const mockSuccess = jest.fn();
const mockToast = { error: mockError, success: mockSuccess };
jest.mock("@/components/ui/Toast", () => ({
  useToast: () => mockToast,
}));

jest.mock("@/lib/financial/types/bill-negotiation.types", () => ({}));

const mockSummaryData = {
  summary: {
    totalSavings: 1250.5,
    monthlySavings: 104.2,
    successRate: 75,
    completedNegotiations: 3,
    activeNegotiations: 2,
    topOpportunities: [
      {
        billId: "bill-1",
        merchantName: "Internet Service",
        category: "internet" as const,
        currentAmount: 120,
        potentialSavings: 30,
        confidence: 80,
        reason: "Mention competitor pricing",
        suggestedApproach: "rate_reduction" as const,
      },
    ],
  },
  insights: [
    {
      id: "insight-1",
      type: "opportunity" as const,
      title: "New opportunity",
      description: "Your internet rate is above market average",
      priority: "high" as const,
      actionUrl: "/negotiate",
    },
  ],
};

const mockActiveData = {
  negotiations: [],
};

describe("BillNegotiationAssistant", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders loading spinner initially", () => {
    global.fetch = jest.fn(() => new Promise(() => {})) as jest.Mock;

    render(<BillNegotiationAssistant />);
    expect(document.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("displays summary cards after loading", async () => {
    global.fetch = jest.fn((url: string) => {
      if (typeof url === "string" && url.includes("view=active")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockActiveData),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockSummaryData),
      });
    }) as jest.Mock;

    render(<BillNegotiationAssistant />);

    await waitFor(() => {
      expect(screen.getByText("Total Savings")).toBeInTheDocument();
    });

    expect(screen.getByText("$1250.50")).toBeInTheDocument();
    expect(screen.getByText("Monthly Savings")).toBeInTheDocument();
    expect(screen.getByText("$104.20")).toBeInTheDocument();
    expect(screen.getByText("Success Rate")).toBeInTheDocument();
    expect(screen.getByText("75%")).toBeInTheDocument();
  });

  it("displays tabs", async () => {
    global.fetch = jest.fn((url: string) => {
      if (typeof url === "string" && url.includes("view=active")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockActiveData),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockSummaryData),
      });
    }) as jest.Mock;

    render(<BillNegotiationAssistant />);

    await waitFor(() => {
      expect(screen.getByText("Total Savings")).toBeInTheDocument();
    });

    // Check tab buttons exist (component renders lowercase with CSS capitalize)
    expect(screen.getByText("overview")).toBeInTheDocument();
    expect(screen.getByText("opportunities")).toBeInTheDocument();
  });

  it("handles fetch error gracefully", async () => {
    global.fetch = jest.fn(() =>
      Promise.reject(new Error("Network error")),
    ) as jest.Mock;

    render(<BillNegotiationAssistant />);

    await waitFor(() => {
      expect(mockError).toHaveBeenCalledWith(
        "Failed to load negotiation data",
      );
    });
  });

  it("renders summary data with zero values when summary is missing", async () => {
    global.fetch = jest.fn((url: string) => {
      if (typeof url === "string" && url.includes("view=active")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockActiveData),
        });
      }
      return Promise.resolve({
        ok: false,
        status: 500,
      });
    }) as jest.Mock;

    render(<BillNegotiationAssistant />);

    await waitFor(() => {
      expect(
        document.querySelector(".animate-spin"),
      ).not.toBeInTheDocument();
    });

    // Should still render with fallback zeros (multiple cards may show $0.00)
    expect(screen.getAllByText("$0.00").length).toBeGreaterThanOrEqual(1);
  });

  it("switches between tabs", async () => {
    global.fetch = jest.fn((url: string) => {
      if (typeof url === "string" && url.includes("view=active")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockActiveData),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockSummaryData),
      });
    }) as jest.Mock;

    render(<BillNegotiationAssistant />);

    await waitFor(() => {
      expect(screen.getByText("Total Savings")).toBeInTheDocument();
    });

    // Click "opportunities" tab (component renders lowercase with CSS capitalize)
    fireEvent.click(screen.getByText("opportunities"));

    // Should show opportunities content
    await waitFor(() => {
      expect(screen.getByText("Internet Service")).toBeInTheDocument();
    });
  });
});
