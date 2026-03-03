import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import DebtManagement from "../DebtManagement";

const mockUser = { id: "user-1", email: "test@test.com" };
jest.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: mockUser,
    loading: false,
  }),
}));

jest.mock("@/lib/financial/plaid-service", () => ({
  PlaidAccount: {},
}));

// Component does data.data.filter(...) so data.data must be a flat array of PlaidAccount objects
const mockAccountsData = {
  data: [
    {
      id: "acc-1",
      itemId: "item-1",
      userId: "user-1",
      accountId: "acc-plaid-1",
      institutionId: "ins-1",
      institutionName: "Chase",
      accountName: "Credit Card",
      accountType: "credit",
      accountSubtype: "credit card",
      mask: "1234",
      currentBalance: -3000,
      currency: "USD",
      lastSynced: "2026-01-01",
      createdAt: "2026-01-01",
    },
    {
      id: "acc-2",
      itemId: "item-2",
      userId: "user-1",
      accountId: "acc-plaid-2",
      institutionId: "ins-2",
      institutionName: "Navient",
      accountName: "Student Loan",
      accountType: "loan",
      accountSubtype: "student",
      mask: "5678",
      currentBalance: -25000,
      currency: "USD",
      lastSynced: "2026-01-01",
      createdAt: "2026-01-01",
    },
    {
      id: "acc-3",
      itemId: "item-3",
      userId: "user-1",
      accountId: "acc-plaid-3",
      institutionId: "ins-1",
      institutionName: "Chase",
      accountName: "Checking Account",
      accountType: "depository",
      accountSubtype: "checking",
      mask: "9012",
      currentBalance: 5000,
      currency: "USD",
      lastSynced: "2026-01-01",
      createdAt: "2026-01-01",
    },
  ],
};

describe("DebtManagement", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders loading skeleton initially", () => {
    global.fetch = jest.fn(() => new Promise(() => {})) as jest.Mock;

    render(<DebtManagement />);
    expect(document.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("displays debt accounts after loading", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockAccountsData),
      }),
    ) as jest.Mock;

    render(<DebtManagement />);

    await waitFor(() => {
      expect(screen.getByText("Total Debt")).toBeInTheDocument();
    });

    // Should show credit and loan accounts only (not depository)
    expect(screen.getByText("Credit Card")).toBeInTheDocument();
    expect(screen.getByText("Student Loan")).toBeInTheDocument();
  });

  it("shows 'No Debts Found' when no debt accounts exist", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            data: [
              {
                id: "acc-3",
                itemId: "item-3",
                userId: "user-1",
                accountId: "acc-plaid-3",
                institutionId: "ins-1",
                institutionName: "Chase",
                accountName: "Checking Account",
                accountType: "depository",
                accountSubtype: "checking",
                mask: "9012",
                currentBalance: 5000,
                currency: "USD",
                lastSynced: "2026-01-01",
                createdAt: "2026-01-01",
              },
            ],
          }),
      }),
    ) as jest.Mock;

    render(<DebtManagement />);

    await waitFor(() => {
      expect(screen.getByText("No Debts Found!")).toBeInTheDocument();
    });
  });

  it("displays strategy selector", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockAccountsData),
      }),
    ) as jest.Mock;

    render(<DebtManagement />);

    await waitFor(() => {
      expect(screen.getByText("Total Debt")).toBeInTheDocument();
    });

    // Should have a strategy selector
    const select = screen.getByRole("combobox");
    expect(select).toBeInTheDocument();
  });

  it("switches between snowball and avalanche strategies", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockAccountsData),
      }),
    ) as jest.Mock;

    render(<DebtManagement />);

    await waitFor(() => {
      expect(screen.getByText("Total Debt")).toBeInTheDocument();
    });

    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "avalanche" } });

    expect(select).toHaveValue("avalanche");
  });

  it("displays extra payment input", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockAccountsData),
      }),
    ) as jest.Mock;

    render(<DebtManagement />);

    await waitFor(() => {
      expect(screen.getByText("Total Debt")).toBeInTheDocument();
    });

    // Should have an extra payment input
    const input = screen.getByRole("spinbutton");
    expect(input).toBeInTheDocument();
  });
});
