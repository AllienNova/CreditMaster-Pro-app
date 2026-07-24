/**
 * AccountsSummaryCard Component Tests
 *
 * Tests for the accounts summary with hide/show balance toggle.
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AccountsSummaryCard from "../AccountsSummaryCard";

// Mock the useAuth hook
jest.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "user-1", email: "test@example.com" },
    loading: false,
  }),
}));

// Mock next/link
jest.mock("next/link", () => {
  const MockLink = ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  );
  MockLink.displayName = "MockLink";
  return MockLink;
});

const mockAccountsData = {
  accounts: [
    {
      id: "acc-1",
      name: "Main Checking",
      type: "checking" as const,
      balance: 5000,
      institution: "Chase Bank",
      lastUpdated: "2026-02-20T00:00:00Z",
    },
    {
      id: "acc-2",
      name: "High Yield Savings",
      type: "savings" as const,
      balance: 15000,
      institution: "Ally Bank",
      lastUpdated: "2026-02-20T00:00:00Z",
    },
    {
      id: "acc-3",
      name: "Credit Card",
      type: "credit" as const,
      balance: -2000,
      institution: "Capital One",
      lastUpdated: "2026-02-20T00:00:00Z",
    },
  ],
  totalAssets: 20000,
  totalLiabilities: 2000,
  netWorth: 18000,
};

describe("AccountsSummaryCard", () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  it("renders loading state initially", () => {
    (global.fetch as jest.Mock).mockImplementation(
      () => new Promise(() => {}),
    );

    const { container } = render(<AccountsSummaryCard />);
    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("renders accounts data after fetch", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: mockAccountsData }),
    });

    render(<AccountsSummaryCard />);

    await waitFor(() => {
      expect(screen.getByText("Accounts Summary")).toBeInTheDocument();
    });

    expect(screen.getByText("Main Checking")).toBeInTheDocument();
    expect(screen.getByText("High Yield Savings")).toBeInTheDocument();
  });

  it("displays net worth summary section", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: mockAccountsData }),
    });

    render(<AccountsSummaryCard />);

    await waitFor(() => {
      expect(screen.getByText("Assets")).toBeInTheDocument();
    });

    expect(screen.getByText("Liabilities")).toBeInTheDocument();
    expect(screen.getByText("Net Worth")).toBeInTheDocument();
    expect(screen.getByText("$20,000")).toBeInTheDocument();
    expect(screen.getByText("$18,000")).toBeInTheDocument();
  });

  it("toggles balance visibility when Hide/Show button is clicked", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: mockAccountsData }),
    });

    render(<AccountsSummaryCard />);

    await waitFor(() => {
      expect(screen.getByText("Accounts Summary")).toBeInTheDocument();
    });

    // Balances should be visible initially
    expect(screen.getByText("$20,000")).toBeInTheDocument();

    // Click "Hide"
    fireEvent.click(screen.getByLabelText("Hide balances"));

    // Balances should now be hidden
    const hiddenTexts = screen.getAllByText("••••••");
    expect(hiddenTexts.length).toBeGreaterThan(0);
  });

  it("displays institution names for accounts", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: mockAccountsData }),
    });

    render(<AccountsSummaryCard />);

    await waitFor(() => {
      expect(screen.getByText("Chase Bank")).toBeInTheDocument();
    });

    expect(screen.getByText("Ally Bank")).toBeInTheDocument();
  });

  it("returns null when no accounts data", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: null }),
    });

    const { container } = render(<AccountsSummaryCard />);

    await waitFor(() => {
      expect(
        container.querySelector(".animate-pulse"),
      ).not.toBeInTheDocument();
    });

    expect(container.firstChild).toBeNull();
  });

  it("shows View All link when more than 4 accounts", async () => {
    const manyAccounts = {
      ...mockAccountsData,
      accounts: [
        ...mockAccountsData.accounts,
        {
          id: "acc-4",
          name: "Investment",
          type: "investment" as const,
          balance: 25000,
          institution: "Fidelity",
          lastUpdated: "2026-02-20T00:00:00Z",
        },
        {
          id: "acc-5",
          name: "Auto Loan",
          type: "loan" as const,
          balance: -12000,
          institution: "Wells Fargo",
          lastUpdated: "2026-02-20T00:00:00Z",
        },
      ],
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: manyAccounts }),
    });

    render(<AccountsSummaryCard />);

    await waitFor(() => {
      expect(
        screen.getByText(/View All 5 Accounts/),
      ).toBeInTheDocument();
    });
  });
});
