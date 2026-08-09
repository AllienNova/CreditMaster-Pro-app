/**
 * Bill Calendar Page — real-data wiring regression coverage.
 *
 * The page used to render a hardcoded MOCK_BILLS array (Rent / Property
 * Management, Electric Bill, etc.) via local useState. It now fetches real
 * bills from GET /api/financial/bills (withPermission("financial:read"),
 * Bearer-authenticated) and maps them to the page's Bill shape. These tests
 * assert real bills render, honest empty/error states show, the former
 * MOCK_BILLS rows never appear, and the mock array is gone from source.
 */

import fs from "fs";
import path from "path";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom";

const mockGetSession = jest.fn();

jest.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: { getSession: (...args: unknown[]) => mockGetSession(...args) },
  }),
}));

import BillCalendarPage from "../page";

// Fully reassign global.fetch so the mock bypasses MSW's fetch interceptor
// (same pattern as src/app/settings/billing/__tests__/page.test.tsx).
const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

const FAKE_SESSION = {
  access_token: "test-access-token",
  user: { id: "user-1" },
};

const DAY_MS = 24 * 60 * 60 * 1000;

// A real Response (polyfilled in setupTests.ts) satisfies MSW's interceptor,
// which a hand-rolled plain object does not.
function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// API-shaped bills (dates are ISO strings, as they arrive over JSON).
function apiBills() {
  const future = new Date(Date.now() + 40 * DAY_MS).toISOString();
  const past = new Date(Date.now() - 10 * DAY_MS).toISOString();
  return [
    {
      id: "bill-1",
      userId: "user-1",
      merchantName: "Acme Power Co",
      category: "utilities",
      amount: 142.5,
      frequency: "monthly",
      nextDueDate: future,
      status: "active",
      isAutoPay: true,
      createdAt: future,
      updatedAt: future,
    },
    {
      id: "bill-2",
      userId: "user-1",
      // "mortgage" has no dedicated icon → exercises the fallback-icon path.
      merchantName: "Zenith Mortgage",
      category: "mortgage",
      amount: 1850,
      frequency: "monthly",
      nextDueDate: past,
      status: "active",
      isAutoPay: false,
      createdAt: past,
      updatedAt: past,
    },
  ];
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

describe("Bill Calendar Page — real /api/financial/bills wiring", () => {
  it("has no MOCK_BILLS array left in source", () => {
    const source = fs.readFileSync(
      path.join(__dirname, "..", "page.tsx"),
      "utf-8",
    );
    expect(source).not.toContain("MOCK_BILLS");
  });

  it("fetches the bills endpoint with a Bearer token", async () => {
    mockFetch.mockResolvedValue(jsonResponse({ bills: apiBills() }));

    render(<BillCalendarPage />);

    await waitFor(() => expect(mockFetch).toHaveBeenCalled());
    // The test env's fetch interceptor normalizes fetch(url, init) into a single
    // Request object, so inspect that rather than positional (url, init) args.
    const req = mockFetch.mock.calls[0][0] as {
      url: string;
      headers: { get: (name: string) => string | null };
    };
    expect(req.url).toContain("/api/financial/bills?activeOnly=true");
    expect(req.headers.get("Authorization")).toBe("Bearer test-access-token");
  });

  it("renders real bills on success (and none of the removed MOCK_BILLS rows)", async () => {
    mockFetch.mockResolvedValue(jsonResponse({ bills: apiBills() }));

    render(<BillCalendarPage />);

    // Real merchant names (mapped from merchantName) render in the sidebar.
    await waitFor(() => {
      expect(screen.getAllByText("Acme Power Co").length).toBeGreaterThan(0);
    });
    expect(screen.getAllByText("Zenith Mortgage").length).toBeGreaterThan(0);

    // The past-due bill was derived to "overdue" (API status is lifecycle,
    // not payment status) → the Overdue Bills alert renders.
    expect(screen.getByText("Overdue Bills")).toBeInTheDocument();

    // The empty state must not show when real bills exist.
    expect(screen.queryByText("No bills yet")).not.toBeInTheDocument();

    // The removed hardcoded mock rows must never appear.
    expect(screen.queryByText("Property Management")).not.toBeInTheDocument();
    expect(screen.queryByText("Electric Bill")).not.toBeInTheDocument();
    expect(screen.queryByText("ISP Provider")).not.toBeInTheDocument();
  });

  it("renders the empty state (no fabricated rows) when the API returns no bills", async () => {
    mockFetch.mockResolvedValue(jsonResponse({ bills: [] }));

    render(<BillCalendarPage />);

    await waitFor(() => {
      expect(screen.getByText("No bills yet")).toBeInTheDocument();
    });
    // An empty response is not an error.
    expect(
      screen.queryByText(/Couldn't load your bills/i),
    ).not.toBeInTheDocument();
    // No mock fallback.
    expect(screen.queryByText("Property Management")).not.toBeInTheDocument();
    expect(screen.queryByText("Electric Bill")).not.toBeInTheDocument();
  });

  it("renders an honest error state (no fabricated rows) when the API responds not-ok", async () => {
    mockFetch.mockResolvedValue(jsonResponse({ error: "boom" }, 500));

    render(<BillCalendarPage />);

    await waitFor(() => {
      expect(screen.getByText(/Couldn't load your bills/i)).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
    // Neither mock rows nor the empty state appear on error.
    expect(screen.queryByText("No bills yet")).not.toBeInTheDocument();
    expect(screen.queryByText("Property Management")).not.toBeInTheDocument();
    expect(screen.queryByText("Electric Bill")).not.toBeInTheDocument();
  });

  it("renders the error state when the fetch rejects (network failure)", async () => {
    mockFetch.mockRejectedValue(new Error("network down"));

    render(<BillCalendarPage />);

    await waitFor(() => {
      expect(screen.getByText(/Couldn't load your bills/i)).toBeInTheDocument();
    });
    expect(screen.queryByText("Property Management")).not.toBeInTheDocument();
  });

  it("shows a sign-in message and skips the fetch when there is no session", async () => {
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });

    render(<BillCalendarPage />);

    await waitFor(() => {
      expect(
        screen.getByText(/Sign in to view your bills/i),
      ).toBeInTheDocument();
    });
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
