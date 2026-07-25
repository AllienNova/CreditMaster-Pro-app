/**
 * Paper Trading Page — real-data wiring regression coverage.
 *
 * The page used to render hardcoded MOCK_ACCOUNT / MOCK_POSITIONS / MOCK_ORDERS
 * via local useState and simulate order placement / reset in-memory. It now
 * reads the real paper-trading account, positions, open orders, performance and
 * trade history from the authed API (Bearer token), and mutates through the
 * real endpoints (create account, place/cancel order, close position, reset).
 *
 * These tests assert real data renders, the removed MOCK_* values never appear,
 * honest loading / sign-in / create-account / error states show, and each
 * mutation hits its real endpoint with the Bearer token.
 */

import fs from "fs";
import path from "path";
import {
  render,
  screen,
  waitFor,
  cleanup,
  fireEvent,
} from "@testing-library/react";
import "@testing-library/jest-dom";

const mockGetSession = jest.fn();

jest.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: { getSession: (...args: unknown[]) => mockGetSession(...args) },
  }),
}));

import PaperTradingPage from "../page";

// Fully reassign global.fetch; MSW (onUnhandledRequest: "warn") bypasses these
// unhandled routes into this mock, passing a normalized Request per call — same
// pattern as src/app/budgeting/subscriptions/__tests__/page.test.tsx.
const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

const FAKE_SESSION = {
  access_token: "test-access-token",
  user: { id: "user-1" },
};

// A real Response (node-fetch, polyfilled in setupTests.ts) satisfies MSW's
// interceptor, which a hand-rolled plain object does not.
function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// Real fixtures — deliberately distinct from the removed mocks (AAPL / MSFT /
// NVDA, $85,432.50 cash, 65% win rate, "3.5 days") so a passing assertion
// proves real API data rendered, not a leftover mock.
const ACCOUNT = {
  id: "acc-1",
  name: "Paper Trading Account",
  initialBalance: 100000,
  cashBalance: 91234.56,
  portfolioValue: 12765.44,
  totalValue: 104000,
};

const POSITIONS = [
  {
    id: "pos-1",
    symbol: "ACME",
    quantity: 40,
    avgEntryPrice: 150,
    currentPrice: 165,
    marketValue: 6600,
    unrealizedPL: 600,
    unrealizedPLPercent: 10,
    side: "long",
  },
  {
    id: "pos-2",
    symbol: "GLOBEX",
    quantity: -20,
    avgEntryPrice: 80,
    currentPrice: 90,
    marketValue: 1800,
    unrealizedPL: -200,
    unrealizedPLPercent: -12.5,
    side: "short",
  },
];

const ORDERS = [
  {
    id: "ord-1",
    symbol: "INITECH",
    side: "buy",
    type: "limit",
    quantity: 10,
    status: "pending",
    limitPrice: 42.5,
    createdAt: "2026-07-20T10:00:00Z",
  },
  {
    id: "ord-2",
    symbol: "UMBRELLA",
    side: "sell",
    type: "market",
    quantity: 5,
    status: "pending",
    createdAt: "2026-07-20T11:00:00Z",
  },
  // Filled order — must be excluded from the "Open Orders" tab.
  {
    id: "ord-3",
    symbol: "STARK",
    side: "buy",
    type: "market",
    quantity: 3,
    status: "filled",
    filledAvgPrice: 100,
    createdAt: "2026-07-19T09:00:00Z",
  },
];

const PERFORMANCE = {
  netPL: 4000,
  netPLPercent: 4,
  winRate: 57,
  totalTrades: 7,
  avgWin: 320.5,
  avgLoss: 110.25,
  profitFactor: 1.85,
};

const TRADES = [
  {
    id: "t-1",
    symbol: "HOOLI",
    side: "buy",
    quantity: 10,
    price: 50,
    executedAt: "2026-07-18T14:00:00Z",
  },
  {
    id: "t-2",
    symbol: "PIED",
    side: "sell",
    quantity: 10,
    price: 60,
    realizedPL: 100,
    executedAt: "2026-07-19T14:00:00Z",
  },
  {
    id: "t-3",
    symbol: "WAYNE",
    side: "sell",
    quantity: 5,
    price: 40,
    realizedPL: -30,
    executedAt: "2026-07-20T14:00:00Z",
  },
];

function extract(
  input: unknown,
  init?: RequestInit,
): { url: string; method: string } {
  if (typeof input === "string") {
    return { url: input, method: (init?.method as string) || "GET" };
  }
  const r = input as { url?: string; method?: string };
  return { url: r.url ?? "", method: r.method ?? "GET" };
}

function authHeaderOf(input: unknown, init?: RequestInit): string | null {
  if (input && typeof input !== "string") {
    const h = (input as { headers?: { get?: (n: string) => string | null } })
      .headers;
    if (h?.get) return h.get("Authorization");
  }
  const hi = init?.headers as Record<string, string> | undefined;
  return hi?.Authorization ?? null;
}

interface HandlerOpts {
  accountExists?: boolean;
  performance?: unknown;
  positions?: unknown[];
  orders?: unknown[];
  trades?: unknown[];
  failLabel?: "account" | "positions" | "orders" | "performance" | "trades";
  failMutation?: boolean;
}

/** Install a URL-routing fetch mock that returns a fresh Response per call. */
function installHandler(opts: HandlerOpts = {}) {
  const state = { accountExists: opts.accountExists ?? true };
  mockFetch.mockImplementation(async (input: unknown, init?: RequestInit) => {
    const { url, method } = extract(input, init);

    if (url.includes("/api/trading/paper/reset")) {
      if (opts.failMutation) return jsonResponse({ error: "boom" }, 500);
      return jsonResponse({ success: true, data: ACCOUNT });
    }
    if (url.includes("/api/trading/paper/positions")) {
      if (opts.failLabel === "positions")
        return jsonResponse({ error: "boom" }, 500);
      return jsonResponse({ success: true, data: opts.positions ?? POSITIONS });
    }
    if (url.includes("/api/trading/paper/orders")) {
      if (method === "POST" || method === "DELETE") {
        if (opts.failMutation)
          return jsonResponse({ error: "Insufficient buying power" }, 400);
        return jsonResponse(
          { success: true, data: {} },
          method === "POST" ? 201 : 200,
        );
      }
      if (opts.failLabel === "orders")
        return jsonResponse({ error: "boom" }, 500);
      return jsonResponse({ success: true, data: opts.orders ?? ORDERS });
    }
    if (url.includes("/api/trading/paper/performance")) {
      if (opts.failLabel === "performance")
        return jsonResponse({ error: "boom" }, 500);
      if (url.includes("action=trades")) {
        if (opts.failLabel === "trades")
          return jsonResponse({ error: "boom" }, 500);
        return jsonResponse({ success: true, data: opts.trades ?? TRADES });
      }
      return jsonResponse({
        success: true,
        data: opts.performance ?? PERFORMANCE,
      });
    }
    // Account (generic prefix — checked last).
    if (url.includes("/api/trading/paper")) {
      if (method === "POST") {
        if (opts.failMutation) return jsonResponse({ error: "boom" }, 500);
        state.accountExists = true;
        return jsonResponse({ success: true, data: ACCOUNT }, 201);
      }
      if (opts.failLabel === "account")
        return jsonResponse({ error: "boom" }, 500);
      return jsonResponse({
        success: true,
        data: state.accountExists ? ACCOUNT : null,
      });
    }
    return jsonResponse({ error: "not found" }, 404);
  });
  return state;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockFetch.mockReset();
  mockGetSession.mockResolvedValue({
    data: { session: FAKE_SESSION },
    error: null,
  });
});

afterEach(() => {
  cleanup();
});

describe("Paper Trading Page — real /api/trading/paper wiring", () => {
  it("has no MOCK_ account/position/order arrays left in source", () => {
    const source = fs.readFileSync(
      path.join(__dirname, "..", "page.tsx"),
      "utf-8",
    );
    expect(source).not.toContain("MOCK_ACCOUNT");
    expect(source).not.toContain("MOCK_POSITIONS");
    expect(source).not.toContain("MOCK_ORDERS");
  });

  it("shows a loading state while the account is being fetched", () => {
    // Session never resolves → the page stays in its loading state.
    mockGetSession.mockReturnValue(new Promise(() => {}));
    installHandler();

    render(<PaperTradingPage />);

    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("prompts sign-in when there is no session", async () => {
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });
    installHandler();

    render(<PaperTradingPage />);

    await waitFor(() =>
      expect(
        screen.getByText("Sign in to access paper trading"),
      ).toBeInTheDocument(),
    );
    // No real fetch should fire without a session.
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("fetches the account with a Bearer token", async () => {
    installHandler();

    render(<PaperTradingPage />);

    await waitFor(() => expect(mockFetch).toHaveBeenCalled());
    const [input, init] = mockFetch.mock.calls[0];
    expect(extract(input, init).url).toContain("/api/trading/paper");
    expect(authHeaderOf(input, init)).toBe("Bearer test-access-token");
  });

  it("offers to create an account when none exists, then loads it on create", async () => {
    installHandler({ accountExists: false });

    render(<PaperTradingPage />);

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /create paper account/i }),
      ).toBeInTheDocument(),
    );

    fireEvent.click(
      screen.getByRole("button", { name: /create paper account/i }),
    );

    // After the POST + reload, the full account view renders.
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: "Paper Trading" }),
      ).toBeInTheDocument(),
    );
    // A POST to create the account was issued.
    const postedCreate = mockFetch.mock.calls.some(([input, init]) => {
      const { url, method } = extract(input, init);
      return (
        method === "POST" &&
        url.includes("/api/trading/paper") &&
        !url.includes("/orders") &&
        !url.includes("/reset")
      );
    });
    expect(postedCreate).toBe(true);
  });

  it("renders real account, positions and performance (not the removed mocks)", async () => {
    installHandler();

    render(<PaperTradingPage />);

    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: "Paper Trading" }),
      ).toBeInTheDocument(),
    );

    // Real account figures.
    expect(screen.getByText("$104,000.00")).toBeInTheDocument();
    expect(screen.getByText("$91,234.56")).toBeInTheDocument();
    expect(screen.getByText("$12,765.44")).toBeInTheDocument();

    // Real positions (long + short branches).
    expect(screen.getByText("ACME")).toBeInTheDocument();
    expect(screen.getByText("GLOBEX")).toBeInTheDocument();
    expect(screen.getByText("LONG")).toBeInTheDocument();
    expect(screen.getByText("SHORT")).toBeInTheDocument();

    // Real performance summary + quick stats.
    expect(screen.getByText("57%")).toBeInTheDocument();
    expect(screen.getByText("7")).toBeInTheDocument();
    expect(screen.getByText("1.85")).toBeInTheDocument();
    expect(screen.getByText("$320.50")).toBeInTheDocument();
    expect(screen.getByText("$110.25")).toBeInTheDocument();

    // Removed MOCK_* values must never appear.
    expect(screen.queryByText("MSFT")).not.toBeInTheDocument();
    expect(screen.queryByText("$85,432.50")).not.toBeInTheDocument();
    expect(screen.queryByText("3.5 days")).not.toBeInTheDocument();
    expect(screen.queryByText("65%")).not.toBeInTheDocument();
  });

  it("shows only open orders (filtered) with the Bearer-fetched data", async () => {
    installHandler();

    render(<PaperTradingPage />);
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: "Paper Trading" }),
      ).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole("button", { name: /open orders/i }));

    // Pending limit order (with price) + pending market order (→ "Market").
    expect(screen.getByText("INITECH")).toBeInTheDocument();
    expect(screen.getByText("UMBRELLA")).toBeInTheDocument();
    expect(screen.getByText(/10 shares @/)).toHaveTextContent("$42.50");
    expect(screen.getByText(/5 shares @ Market/)).toBeInTheDocument();
    // Filled order is excluded from Open Orders.
    expect(screen.queryByText("STARK")).not.toBeInTheDocument();
  });

  it("renders real trade history from the trades endpoint", async () => {
    installHandler();

    render(<PaperTradingPage />);
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: "Paper Trading" }),
      ).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole("button", { name: /trade history/i }));

    expect(screen.getByText("HOOLI")).toBeInTheDocument();
    expect(screen.getByText("PIED")).toBeInTheDocument();
    expect(screen.getByText("WAYNE")).toBeInTheDocument();
    // Realized P&L branches: positive, negative, and undefined (→ em-dash).
    expect(screen.getByText("$100.00")).toBeInTheDocument();
    expect(screen.getByText("-$30.00")).toBeInTheDocument();
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
  });

  it("renders a red net P&L and em-dash profit factor when losing with no factor", async () => {
    installHandler({
      performance: {
        netPL: -1500,
        netPLPercent: -1.5,
        winRate: 0,
        totalTrades: 0,
        avgWin: 0,
        avgLoss: 0,
        profitFactor: null,
      },
    });

    render(<PaperTradingPage />);
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: "Paper Trading" }),
      ).toBeInTheDocument(),
    );

    // Negative net P&L renders in both the stat card and the summary.
    expect(screen.getAllByText(/-\$1,500\.00/).length).toBeGreaterThan(0);
    // Null profit factor renders as an em-dash rather than a fabricated number.
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("surfaces an error when the account load fails, then retries", async () => {
    installHandler({ failLabel: "account" });

    render(<PaperTradingPage />);
    await waitFor(() =>
      expect(
        screen.getByText(/Couldn't load paper trading/i),
      ).toBeInTheDocument(),
    );
    expect(screen.getByText(/Failed to load account \(500\)/)).toBeInTheDocument();

    // Recover: swap in a healthy handler and retry.
    installHandler();
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));

    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: "Paper Trading" }),
      ).toBeInTheDocument(),
    );
  });

  it("places an order through the real orders endpoint", async () => {
    installHandler();

    render(<PaperTradingPage />);
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: "Paper Trading" }),
      ).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole("button", { name: /new order/i }));

    fireEvent.change(screen.getByLabelText("Symbol"), {
      target: { value: "acme" },
    });
    const form = screen.getByLabelText("Symbol").closest("form");
    fireEvent.submit(form as HTMLFormElement);

    await waitFor(() => {
      const posted = mockFetch.mock.calls.some(([input, init]) => {
        const { url, method } = extract(input, init);
        return method === "POST" && url.includes("/api/trading/paper/orders");
      });
      expect(posted).toBe(true);
    });
  });

  it("surfaces a placement error without a mock fallback", async () => {
    installHandler({ failMutation: true });

    render(<PaperTradingPage />);
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: "Paper Trading" }),
      ).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole("button", { name: /new order/i }));
    fireEvent.change(screen.getByLabelText("Symbol"), {
      target: { value: "acme" },
    });
    fireEvent.submit(
      screen.getByLabelText("Symbol").closest("form") as HTMLFormElement,
    );

    await waitFor(() =>
      expect(screen.getByText("Insufficient buying power")).toBeInTheDocument(),
    );
  });

  it("resets the account through the real reset endpoint", async () => {
    installHandler();

    render(<PaperTradingPage />);
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: "Paper Trading" }),
      ).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole("button", { name: /reset account/i }));

    await waitFor(() => {
      const reset = mockFetch.mock.calls.some(([input, init]) => {
        const { url, method } = extract(input, init);
        return method === "POST" && url.includes("/api/trading/paper/reset");
      });
      expect(reset).toBe(true);
    });
  });

  it("cancels an open order through the real DELETE endpoint", async () => {
    installHandler();

    render(<PaperTradingPage />);
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: "Paper Trading" }),
      ).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole("button", { name: /open orders/i }));
    fireEvent.click(
      screen.getAllByRole("button", { name: /cancel order/i })[0],
    );

    await waitFor(() => {
      const deleted = mockFetch.mock.calls.some(([input, init]) => {
        const { url, method } = extract(input, init);
        return (
          method === "DELETE" &&
          url.includes("/api/trading/paper/orders") &&
          url.includes("id=")
        );
      });
      expect(deleted).toBe(true);
    });
  });

  it("closes a position through the real orders endpoint", async () => {
    installHandler();

    render(<PaperTradingPage />);
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: "Paper Trading" }),
      ).toBeInTheDocument(),
    );

    fireEvent.click(screen.getAllByRole("button", { name: "Close" })[0]);

    await waitFor(() => {
      const closed = mockFetch.mock.calls.some(([input, init]) => {
        const { url, method } = extract(input, init);
        return method === "POST" && url.includes("/api/trading/paper/orders");
      });
      expect(closed).toBe(true);
    });
  });

  it("closes a short position with an opposing order", async () => {
    installHandler();

    render(<PaperTradingPage />);
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: "Paper Trading" }),
      ).toBeInTheDocument(),
    );

    // The second position (GLOBEX) is short → exercises the buy-to-cover branch.
    fireEvent.click(screen.getAllByRole("button", { name: "Close" })[1]);

    await waitFor(() => {
      const closed = mockFetch.mock.calls.some(([input, init]) => {
        const { url, method } = extract(input, init);
        return method === "POST" && url.includes("/api/trading/paper/orders");
      });
      expect(closed).toBe(true);
    });
  });

  it("renders honest empty states across all three tabs", async () => {
    installHandler({ positions: [], orders: [], trades: [] });

    render(<PaperTradingPage />);
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: "Paper Trading" }),
      ).toBeInTheDocument(),
    );

    // Positions tab empty state (default tab).
    expect(screen.getByText("No Open Positions")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /open orders/i }));
    expect(screen.getByText("No Open Orders")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /trade history/i }));
    expect(
      screen.getByText(/executed trades will appear here/i),
    ).toBeInTheDocument();
  });

  it("supports a limit sell order and the limit-price field", async () => {
    installHandler();

    render(<PaperTradingPage />);
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: "Paper Trading" }),
      ).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole("button", { name: /new order/i }));

    // Switch side → sell, type → limit (reveals the limit-price input).
    fireEvent.click(screen.getByRole("button", { name: "Sell" }));
    fireEvent.click(screen.getByRole("button", { name: "Limit" }));

    fireEvent.change(screen.getByLabelText("Symbol"), {
      target: { value: "acme" },
    });
    fireEvent.change(screen.getByLabelText("Quantity"), {
      target: { value: "7" },
    });
    const limitInput = screen.getByLabelText("Limit Price");
    fireEvent.change(limitInput, { target: { value: "155.25" } });

    fireEvent.submit(
      screen.getByLabelText("Symbol").closest("form") as HTMLFormElement,
    );

    await waitFor(() => {
      const posted = mockFetch.mock.calls.some(([input, init]) => {
        const { url, method } = extract(input, init);
        return method === "POST" && url.includes("/api/trading/paper/orders");
      });
      expect(posted).toBe(true);
    });
  });

  it("dismisses the order modal via the cancel and close controls", async () => {
    installHandler();

    render(<PaperTradingPage />);
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: "Paper Trading" }),
      ).toBeInTheDocument(),
    );

    // Open, then dismiss with the Cancel button.
    fireEvent.click(screen.getByRole("button", { name: /new order/i }));
    expect(screen.getByText("Place Paper Order")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() =>
      expect(screen.queryByText("Place Paper Order")).not.toBeInTheDocument(),
    );

    // Open again, then dismiss with the X (Close modal) button.
    fireEvent.click(screen.getByRole("button", { name: /new order/i }));
    fireEvent.click(screen.getByRole("button", { name: /close modal/i }));
    await waitFor(() =>
      expect(screen.queryByText("Place Paper Order")).not.toBeInTheDocument(),
    );
  });

  it("shows a session-expired message when the token is lost at order time", async () => {
    // Session present for the initial load (one getSession call), gone by the
    // time the order submits (the next getSession call returns null).
    mockGetSession
      .mockResolvedValueOnce({ data: { session: FAKE_SESSION }, error: null })
      .mockResolvedValue({ data: { session: null }, error: null });
    installHandler();

    render(<PaperTradingPage />);
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: "Paper Trading" }),
      ).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole("button", { name: /new order/i }));
    fireEvent.change(screen.getByLabelText("Symbol"), {
      target: { value: "acme" },
    });
    fireEvent.submit(
      screen.getByLabelText("Symbol").closest("form") as HTMLFormElement,
    );

    await waitFor(() =>
      expect(screen.getByText(/session has expired/i)).toBeInTheDocument(),
    );
  });

  it("surfaces an error when a sub-resource (positions) fails to load", async () => {
    installHandler({ failLabel: "positions" });

    render(<PaperTradingPage />);

    await waitFor(() =>
      expect(
        screen.getByText(/Failed to load positions \(500\)/),
      ).toBeInTheDocument(),
    );
  });

  it("surfaces an error when canceling an order fails", async () => {
    installHandler({ failMutation: true });

    render(<PaperTradingPage />);
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: "Paper Trading" }),
      ).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole("button", { name: /open orders/i }));
    fireEvent.click(
      screen.getAllByRole("button", { name: /cancel order/i })[0],
    );

    await waitFor(() =>
      expect(
        screen.getByText(/Failed to cancel order \(400\)/),
      ).toBeInTheDocument(),
    );
  });

  it("surfaces an error when closing a position fails", async () => {
    installHandler({ failMutation: true });

    render(<PaperTradingPage />);
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: "Paper Trading" }),
      ).toBeInTheDocument(),
    );

    fireEvent.click(screen.getAllByRole("button", { name: "Close" })[0]);

    await waitFor(() =>
      expect(
        screen.getByText(/Failed to close position \(400\)/),
      ).toBeInTheDocument(),
    );
  });

  it("surfaces an error when resetting the account fails", async () => {
    installHandler({ failMutation: true });

    render(<PaperTradingPage />);
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: "Paper Trading" }),
      ).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole("button", { name: /reset account/i }));

    await waitFor(() =>
      expect(
        screen.getByText(/Failed to reset account \(500\)/),
      ).toBeInTheDocument(),
    );
  });

  it("surfaces an error when creating the account fails", async () => {
    installHandler({ accountExists: false, failMutation: true });

    render(<PaperTradingPage />);
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /create paper account/i }),
      ).toBeInTheDocument(),
    );

    fireEvent.click(
      screen.getByRole("button", { name: /create paper account/i }),
    );

    await waitFor(() =>
      expect(
        screen.getByText(/Failed to create account \(500\)/),
      ).toBeInTheDocument(),
    );
  });
});
