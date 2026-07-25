/**
 * Trading Journal Page — real-data wiring regression coverage.
 *
 * The page used to render hardcoded MOCK_TRADES / MOCK_STATS via local useState
 * plus a fabricated insights panel. It now reads the real trade list and
 * aggregate stats from the authed API:
 *   - GET /api/trading/journal                     → TradeEntry[]
 *   - GET /api/trading/journal/stats?action=stats  → TradeStats
 *
 * These tests assert real data renders, the removed mocks never appear, honest
 * loading / sign-in / error / empty states show, the outcome filter works on
 * real data, and both endpoints are fetched with the Bearer token.
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

import TradingJournalPage from "../page";

// Fully reassign global.fetch; MSW (onUnhandledRequest: "warn") bypasses these
// unhandled routes into this mock, passing a normalized Request per call.
const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

const FAKE_SESSION = {
  access_token: "test-access-token",
  user: { id: "user-1" },
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// Real fixtures — deliberately distinct from the removed mocks (AAPL/TSLA/NVDA/
// SPY/AMD; 47 trades, 58.5% win rate, 1.85 profit factor, "Breakout (68% win
// rate)", "Morning session") so a passing assertion proves real data rendered.
const STATS = {
  totalTrades: 12,
  winRate: 61.5,
  profitFactor: 2.1,
  totalProfitLoss: 3120.75,
  averageWin: 220.4,
  averageLoss: 88.6,
  largestWin: 900,
  largestLoss: -400,
  bestStrategy: "Breakout",
  expectancy: 42.5,
  averageHoldingTime: 5.3,
};

const TRADES = [
  {
    id: "tr-1",
    symbol: "ACME",
    direction: "long",
    entryDate: "2026-07-20T10:00:00Z",
    entryPrice: 150,
    exitPrice: 162,
    entryQuantity: 40,
    profitLoss: 480,
    outcome: "win",
    strategy: "Breakout",
    notes: "clean setup",
  },
  {
    id: "tr-2",
    symbol: "GLOBEX",
    direction: "short",
    entryDate: "2026-07-19T10:00:00Z",
    entryPrice: 80,
    exitPrice: 74,
    entryQuantity: 20,
    profitLoss: 120,
    outcome: "win",
    strategy: "Mean Reversion",
  },
  {
    id: "tr-3",
    symbol: "HOOLI",
    direction: "long",
    entryDate: "2026-07-18T10:00:00Z",
    entryPrice: 50,
    entryQuantity: 10,
    profitLoss: -60,
    outcome: "loss",
  },
  {
    id: "tr-4",
    symbol: "INITECH",
    direction: "long",
    entryDate: "2026-07-17T10:00:00Z",
    entryPrice: 30,
    entryQuantity: 5,
    outcome: "breakeven",
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
  stats?: unknown;
  trades?: unknown[];
  failLabel?: "stats" | "trades";
}

function installHandler(opts: HandlerOpts = {}) {
  mockFetch.mockImplementation(async (input: unknown, init?: RequestInit) => {
    const { url } = extract(input, init);
    // Stats URL contains the journal prefix, so match it first.
    if (url.includes("/api/trading/journal/stats")) {
      if (opts.failLabel === "stats")
        return jsonResponse({ error: "boom" }, 500);
      return jsonResponse({ success: true, data: opts.stats ?? STATS });
    }
    if (url.includes("/api/trading/journal")) {
      if (opts.failLabel === "trades")
        return jsonResponse({ error: "boom" }, 500);
      return jsonResponse({ success: true, data: opts.trades ?? TRADES });
    }
    return jsonResponse({ error: "not found" }, 404);
  });
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

describe("Trading Journal Page — real /api/trading/journal wiring", () => {
  it("has no MOCK_ trade/stats arrays left in source", () => {
    const source = fs.readFileSync(
      path.join(__dirname, "..", "page.tsx"),
      "utf-8",
    );
    expect(source).not.toContain("MOCK_TRADES");
    expect(source).not.toContain("MOCK_STATS");
  });

  it("shows a loading state while data is being fetched", () => {
    mockGetSession.mockReturnValue(new Promise(() => {}));
    installHandler();

    render(<TradingJournalPage />);

    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("prompts sign-in when there is no session", async () => {
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });
    installHandler();

    render(<TradingJournalPage />);

    await waitFor(() =>
      expect(
        screen.getByText("Sign in to view your trading journal"),
      ).toBeInTheDocument(),
    );
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("fetches both journal endpoints with a Bearer token", async () => {
    installHandler();

    render(<TradingJournalPage />);

    await waitFor(() => expect(screen.getByText("ACME")).toBeInTheDocument());

    const calls = mockFetch.mock.calls;
    const statsCall = calls.find(([i, init]) =>
      extract(i, init).url.includes("/api/trading/journal/stats"),
    );
    const tradesCall = calls.find(([i, init]) => {
      const u = extract(i, init).url;
      return u.includes("/api/trading/journal") && !u.includes("/stats");
    });
    expect(statsCall).toBeTruthy();
    expect(tradesCall).toBeTruthy();
    expect(authHeaderOf(statsCall![0], statsCall![1])).toBe(
      "Bearer test-access-token",
    );
    expect(authHeaderOf(tradesCall![0], tradesCall![1])).toBe(
      "Bearer test-access-token",
    );
  });

  it("renders real trades and stats (not the removed mocks)", async () => {
    installHandler();

    render(<TradingJournalPage />);

    await waitFor(() => expect(screen.getByText("ACME")).toBeInTheDocument());

    // Real trades (long + short, exit present/absent, PL +/-/undefined).
    expect(screen.getByText("GLOBEX")).toBeInTheDocument();
    expect(screen.getByText("HOOLI")).toBeInTheDocument();
    expect(screen.getByText("INITECH")).toBeInTheDocument();

    // Real stats.
    expect(screen.getByText("61.5%")).toBeInTheDocument();
    expect(screen.getByText("2.10")).toBeInTheDocument();
    expect(screen.getByText("+$3120.75")).toBeInTheDocument();
    expect(screen.getByText("12 trades")).toBeInTheDocument();

    // Real insights (from stat fields, not fabricated coaching).
    expect(screen.getByText("Expectancy / Trade")).toBeInTheDocument();
    expect(screen.getByText("+$42.50")).toBeInTheDocument();
    expect(screen.getByText("5.3 h")).toBeInTheDocument();

    // Removed mock values / fabricated insights must never appear.
    expect(screen.queryByText("TSLA")).not.toBeInTheDocument();
    expect(screen.queryByText("58.5%")).not.toBeInTheDocument();
    expect(screen.queryByText("47 trades")).not.toBeInTheDocument();
    expect(
      screen.queryByText("Breakout (68% win rate)"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Morning session/i),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Reduce position size after 2 losses/i),
    ).not.toBeInTheDocument();
  });

  it("filters the real trades by outcome", async () => {
    installHandler();

    render(<TradingJournalPage />);
    await waitFor(() => expect(screen.getByText("ACME")).toBeInTheDocument());

    // Filter to losses → only HOOLI remains.
    fireEvent.click(screen.getByRole("button", { name: "Loss" }));
    expect(screen.getByText("HOOLI")).toBeInTheDocument();
    expect(screen.queryByText("ACME")).not.toBeInTheDocument();
    expect(screen.queryByText("GLOBEX")).not.toBeInTheDocument();

    // Back to wins → ACME + GLOBEX, no HOOLI.
    fireEvent.click(screen.getByRole("button", { name: "Win" }));
    expect(screen.getByText("ACME")).toBeInTheDocument();
    expect(screen.getByText("GLOBEX")).toBeInTheDocument();
    expect(screen.queryByText("HOOLI")).not.toBeInTheDocument();
  });

  it("shows a filter-empty state when no trade matches the filter", async () => {
    installHandler({ trades: [TRADES[0]] }); // single win

    render(<TradingJournalPage />);
    await waitFor(() => expect(screen.getByText("ACME")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: "Loss" }));
    expect(
      screen.getByText("No trades match this filter"),
    ).toBeInTheDocument();
  });

  it("shows an empty state when there are no trades", async () => {
    installHandler({ trades: [] });

    render(<TradingJournalPage />);

    await waitFor(() =>
      expect(screen.getByText("No trades logged yet")).toBeInTheDocument(),
    );
    // Empty-state CTA opens the log-trade modal (header + CTA both read
    // "Log Trade"; the CTA is the last one).
    const logButtons = screen.getAllByRole("button", { name: "Log Trade" });
    fireEvent.click(logButtons[logButtons.length - 1]);
    expect(screen.getByText("Log New Trade")).toBeInTheDocument();
  });

  it("guards R:R and shows honest fallbacks when there is no data", async () => {
    installHandler({
      trades: [],
      stats: {
        totalTrades: 0,
        winRate: 0,
        profitFactor: 0.8,
        totalProfitLoss: 0,
        averageWin: 0,
        averageLoss: 0,
        largestWin: 0,
        largestLoss: 0,
        expectancy: 0,
        averageHoldingTime: 0,
      },
    });

    render(<TradingJournalPage />);
    await waitFor(() =>
      expect(screen.getByText("No trades logged yet")).toBeInTheDocument(),
    );

    // averageLoss === 0 → R:R renders an em-dash rather than Infinity.
    expect(screen.getByText("R:R —")).toBeInTheDocument();
    // Undefined bestStrategy → honest fallback, not a fabricated strategy.
    expect(screen.getByText("Not enough data yet")).toBeInTheDocument();
  });

  it("surfaces an error when the stats load fails, then retries", async () => {
    installHandler({ failLabel: "stats" });

    render(<TradingJournalPage />);
    await waitFor(() =>
      expect(
        screen.getByText(/Couldn't load your journal/i),
      ).toBeInTheDocument(),
    );
    expect(screen.getByText(/Failed to load stats \(500\)/)).toBeInTheDocument();

    installHandler();
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));

    await waitFor(() => expect(screen.getByText("ACME")).toBeInTheDocument());
  });

  it("surfaces an error when the trades load fails", async () => {
    installHandler({ failLabel: "trades" });

    render(<TradingJournalPage />);
    await waitFor(() =>
      expect(
        screen.getByText(/Failed to load trades \(500\)/),
      ).toBeInTheDocument(),
    );
  });

  it("opens and closes the log-trade modal", async () => {
    installHandler();

    render(<TradingJournalPage />);
    await waitFor(() => expect(screen.getByText("ACME")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: /log trade/i }));
    expect(screen.getByText("Log New Trade")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /close modal/i }));
    await waitFor(() =>
      expect(screen.queryByText("Log New Trade")).not.toBeInTheDocument(),
    );
  });
});
