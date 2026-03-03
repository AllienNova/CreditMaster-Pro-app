import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import ActionPlanManager from "../ActionPlanManager";

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

const mockRecommendations = {
  recommendations: [
    {
      id: "plan-1",
      title: "Build Emergency Fund",
      description: "Save 3 months of expenses",
      priority: "high",
      category: "savings",
      impact: "High",
      timeframe: "3 months",
      steps: ["Open savings account", "Set up auto-transfer"],
    },
    {
      id: "plan-2",
      title: "Pay Off Credit Card",
      description: "Eliminate high-interest debt",
      priority: "critical",
      category: "debt",
      impact: "Very High",
      timeframe: "6 months",
      steps: ["List all debts", "Create payment plan"],
    },
  ],
};

describe("ActionPlanManager", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders loading skeleton initially", () => {
    global.fetch = jest.fn(() => new Promise(() => {})) as jest.Mock;

    render(<ActionPlanManager />);
    expect(document.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("displays action plans after loading", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockRecommendations),
      }),
    ) as jest.Mock;

    render(<ActionPlanManager />);

    await waitFor(() => {
      expect(
        screen.getByText("Build Emergency Fund"),
      ).toBeInTheDocument();
    });

    expect(
      screen.getByText("Pay Off Credit Card"),
    ).toBeInTheDocument();
  });

  it("displays filter tabs with correct counts", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockRecommendations),
      }),
    ) as jest.Mock;

    render(<ActionPlanManager />);

    await waitFor(() => {
      expect(screen.getByText("All Plans (2)")).toBeInTheDocument();
    });

    expect(screen.getByText("Active (2)")).toBeInTheDocument();
    expect(screen.getByText("Completed (0)")).toBeInTheDocument();
  });

  it("shows empty state for completed filter", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockRecommendations),
      }),
    ) as jest.Mock;

    render(<ActionPlanManager />);

    await waitFor(() => {
      expect(screen.getByText("All Plans (2)")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Completed (0)"));

    expect(screen.getByText("No action plans")).toBeInTheDocument();
    expect(screen.getByText("No completed plans yet")).toBeInTheDocument();
  });

  it("opens plan detail modal on click", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockRecommendations),
      }),
    ) as jest.Mock;

    render(<ActionPlanManager />);

    await waitFor(() => {
      expect(
        screen.getByText("Build Emergency Fund"),
      ).toBeInTheDocument();
    });

    // Click on the plan card
    fireEvent.click(screen.getByText("Build Emergency Fund"));

    await waitFor(() => {
      expect(screen.getByTestId("modal")).toBeInTheDocument();
    });

    // Steps are rendered as "{idx + 1}. {step.description}" in the same span
    expect(screen.getByText("1. Open savings account")).toBeInTheDocument();
    expect(screen.getByText("2. Set up auto-transfer")).toBeInTheDocument();
  });

  it("shows empty state when no recommendations returned", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ recommendations: [] }),
      }),
    ) as jest.Mock;

    render(<ActionPlanManager />);

    await waitFor(() => {
      expect(screen.getByText("No action plans")).toBeInTheDocument();
    });
  });

  it("shows error toast when fetch fails", async () => {
    global.fetch = jest.fn(() =>
      Promise.reject(new Error("Network error")),
    ) as jest.Mock;

    render(<ActionPlanManager />);

    await waitFor(() => {
      expect(mockError).toHaveBeenCalledWith(
        "Failed to load action plans",
        "Please try again later",
      );
    });
  });

  it("switches between all/active/completed filters", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockRecommendations),
      }),
    ) as jest.Mock;

    render(<ActionPlanManager />);

    await waitFor(() => {
      expect(screen.getByText("All Plans (2)")).toBeInTheDocument();
    });

    // Default filter is "active" - both plans show since none are completed
    expect(screen.getByText("Build Emergency Fund")).toBeInTheDocument();
    expect(screen.getByText("Pay Off Credit Card")).toBeInTheDocument();

    // Switch to "completed" - no plans should show
    fireEvent.click(screen.getByText("Completed (0)"));
    expect(screen.getByText("No action plans")).toBeInTheDocument();

    // Switch to "all" - both plans should show again
    fireEvent.click(screen.getByText("All Plans (2)"));
    expect(screen.getByText("Build Emergency Fund")).toBeInTheDocument();
  });
});
