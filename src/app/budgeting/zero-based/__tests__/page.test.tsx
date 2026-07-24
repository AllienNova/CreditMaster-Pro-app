/**
 * Zero-Based Budget Page — real-data wiring regression coverage.
 *
 * The page used to fabricate its budget client-side: a `setTimeout` fake delay
 * plus a hardcoded CATEGORY_TEMPLATES map whose 10 categories were filled from
 * local pool math (e.g. Housing = essentials-pool × 0.5). It now POSTs the
 * user's real income + priorities to /api/financial/budgets/generate/zero-based
 * (withPermission("financial:create_budgets"), Bearer-authenticated) and maps
 * the returned `data.budget.categories` to the wizard's view model. These tests
 * assert the real request is made, real categories + amounts render, honest
 * empty/error/sign-in states show, the former client-fabricated allocation
 * never appears, and the mock generation is gone from source.
 */

import fs from "fs";
import path from "path";
import {
  render,
  screen,
  waitFor,
  cleanup,
  fireEvent,
  act,
} from "@testing-library/react";
import "@testing-library/jest-dom";

// Collapse framer-motion so the wizard's step transitions are synchronous in
// jsdom (same approach as SubscriptionCancellationWizard.test.tsx).
jest.mock("framer-motion", () => {
  const actual = jest.requireActual("framer-motion");
  return {
    ...actual,
    AnimatePresence: ({ children }: { children: React.ReactNode }) => (
      <>{children}</>
    ),
    motion: {
      div: ({
        children,
        className,
        style,
      }: {
        children?: React.ReactNode;
        className?: string;
        style?: React.CSSProperties;
      }) => (
        <div className={className} style={style}>
          {children}
        </div>
      ),
    },
  };
});

const mockGetSession = jest.fn();

jest.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: { getSession: (...args: unknown[]) => mockGetSession(...args) },
  }),
}));

import ZeroBasedBudgetPage from "../page";

// Fully reassign global.fetch so the mock bypasses MSW's fetch interceptor
// (same pattern as src/app/budgeting/bills/__tests__/page.test.tsx).
const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

const FAKE_SESSION = {
  access_token: "test-access-token",
  user: { id: "user-1" },
};

// A real Response (polyfilled in setupTests.ts) satisfies MSW's interceptor,
// which a hand-rolled plain object does not.
function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// API-shaped SmartBudgetCategory[] (as they arrive over JSON). Amounts are
// deliberately distinct from what the removed client math would have produced
// for the default inputs (income 5000, 50/10/20/20) so the old fabrication is
// detectable by its absence — e.g. old Housing was 5000×0.5×0.5 = $1,250.
function apiCategories() {
  return [
    {
      id: "c1",
      budgetId: "",
      name: "housing",
      type: "ESSENTIAL",
      allocatedAmount: 1600,
      spentAmount: 0,
      remainingAmount: 1600,
      percentUsed: 0,
      alerts: [],
      rules: [],
    },
    {
      id: "c2",
      budgetId: "",
      name: "debt_payments",
      type: "DEBT",
      allocatedAmount: 700,
      spentAmount: 0,
      remainingAmount: 700,
      percentUsed: 0,
      alerts: [],
      rules: [],
    },
    {
      id: "c3",
      budgetId: "",
      name: "emergency_fund",
      type: "SAVINGS",
      allocatedAmount: 520,
      spentAmount: 0,
      remainingAmount: 520,
      percentUsed: 0,
      alerts: [],
      rules: [],
    },
    {
      id: "c4",
      budgetId: "",
      // A category with no dedicated icon → exercises the type-fallback icon.
      name: "personal_care",
      type: "DISCRETIONARY",
      allocatedAmount: 333,
      spentAmount: 0,
      remainingAmount: 333,
      percentUsed: 0,
      alerts: [],
      rules: [],
    },
  ];
}

function zeroBasedResponse(categories = apiCategories(), status = 201): Response {
  return jsonResponse(
    { success: true, data: { budget: { categories }, unallocated: 0 } },
    status,
  );
}

// Drive the wizard from the income step to the point where "Generate Budget" is
// clicked. Defaults (income 5000, priorities 50/10/20/20 → 100%) make the
// button enabled without extra input.
async function advanceToGenerate() {
  fireEvent.click(screen.getByRole("button", { name: /continue/i }));
  const generate = await screen.findByRole("button", {
    name: /generate budget/i,
  });
  // Wrap in async act so the async generateBudget chain (getSession → fetch →
  // json → setState) settles inside act, keeping the test warning-free.
  await act(async () => {
    fireEvent.click(generate);
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

describe("Zero-Based Budget Page — real /api/financial/budgets wiring", () => {
  it("has removed the client-side mock generation from source", () => {
    const source = fs.readFileSync(
      path.join(__dirname, "..", "page.tsx"),
      "utf-8",
    );
    // The fabrication fingerprints: the fake delay, the hardcoded template map,
    // and the client pool math.
    expect(source).not.toContain("setTimeout");
    expect(source).not.toContain("CATEGORY_TEMPLATES");
    expect(source).not.toContain("pools.essentials");
  });

  it("POSTs income + priorities to the zero-based endpoint with a Bearer token", async () => {
    mockFetch.mockResolvedValue(zeroBasedResponse());

    render(<ZeroBasedBudgetPage />);
    await advanceToGenerate();

    await waitFor(() => expect(mockFetch).toHaveBeenCalled());
    // The test env's fetch interceptor normalizes fetch(url, init) into a single
    // Request object, so inspect that rather than positional (url, init) args.
    const req = mockFetch.mock.calls[0][0] as {
      url: string;
      method: string;
      headers: { get: (name: string) => string | null };
      json: () => Promise<unknown>;
    };
    expect(req.url).toContain("/api/financial/budgets/generate/zero-based");
    expect(req.method).toBe("POST");
    expect(req.headers.get("Authorization")).toBe("Bearer test-access-token");
    expect(await req.json()).toEqual({
      monthlyIncome: 5000,
      priorities: { essentials: 50, debtPayoff: 10, savings: 20, lifestyle: 20 },
    });
  });

  it("renders the real categories + amounts (never the removed client fabrication)", async () => {
    mockFetch.mockResolvedValue(zeroBasedResponse());

    render(<ZeroBasedBudgetPage />);
    await advanceToGenerate();

    // The allocate step (only reachable after a successful real generation).
    await waitFor(() =>
      expect(screen.getByText("Fine-tune your allocations")).toBeInTheDocument(),
    );

    // Category display names are derived from the real category values.
    expect(screen.getByText("Housing")).toBeInTheDocument();
    expect(screen.getByText("Debt Payments")).toBeInTheDocument();
    expect(screen.getByText("Emergency Fund")).toBeInTheDocument();
    expect(screen.getByText("Personal Care")).toBeInTheDocument();

    // Real server amounts flow into the allocation inputs (not client math).
    expect((screen.getByLabelText("Housing allocation") as HTMLInputElement).value).toBe(
      "1600",
    );
    expect(
      (screen.getByLabelText("Debt Payments allocation") as HTMLInputElement).value,
    ).toBe("700");

    // The old client-fabricated Housing figure ($1,250 for the default inputs)
    // must never appear — proving the numbers come from the API.
    expect(screen.queryByDisplayValue("1250")).not.toBeInTheDocument();
    expect(screen.queryByText("$1,250")).not.toBeInTheDocument();
  });

  it("shows an honest empty state (no fabricated budget) when the API returns no categories", async () => {
    mockFetch.mockResolvedValue(zeroBasedResponse([]));

    render(<ZeroBasedBudgetPage />);
    await advanceToGenerate();

    await waitFor(() =>
      expect(
        screen.getByText(/We couldn't build a budget from those numbers/i),
      ).toBeInTheDocument(),
    );
    // It must not advance to the allocate step with an empty/fake budget.
    expect(
      screen.queryByText("Fine-tune your allocations"),
    ).not.toBeInTheDocument();
  });

  it("shows an honest error (no fabricated budget) when the API responds not-ok", async () => {
    mockFetch.mockResolvedValue(jsonResponse({ error: "boom" }, 500));

    render(<ZeroBasedBudgetPage />);
    await advanceToGenerate();

    await waitFor(() =>
      expect(screen.getByText(/Failed to generate budget/i)).toBeInTheDocument(),
    );
    expect(
      screen.queryByText("Fine-tune your allocations"),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Housing")).not.toBeInTheDocument();
  });

  it("shows an honest error when the fetch rejects (network failure)", async () => {
    mockFetch.mockRejectedValue(new Error("network down"));

    render(<ZeroBasedBudgetPage />);
    await advanceToGenerate();

    await waitFor(() =>
      expect(screen.getByText(/network down/i)).toBeInTheDocument(),
    );
    expect(
      screen.queryByText("Fine-tune your allocations"),
    ).not.toBeInTheDocument();
  });

  it("prompts sign-in and skips the fetch when there is no session", async () => {
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });

    render(<ZeroBasedBudgetPage />);
    await advanceToGenerate();

    await waitFor(() =>
      expect(
        screen.getByText(/Sign in to generate your budget/i),
      ).toBeInTheDocument(),
    );
    expect(mockFetch).not.toHaveBeenCalled();
    expect(
      screen.queryByText("Fine-tune your allocations"),
    ).not.toBeInTheDocument();
  });

  it("clears the error and returns to the income step when Back is clicked", async () => {
    mockFetch.mockResolvedValue(jsonResponse({ error: "boom" }, 500));

    render(<ZeroBasedBudgetPage />);
    await advanceToGenerate();
    await waitFor(() =>
      expect(screen.getByText(/Failed to generate budget/i)).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole("button", { name: /^back$/i }));

    // Back on the income step; the stale generate error is cleared.
    expect(screen.getByText("What's your monthly income?")).toBeInTheDocument();
    expect(
      screen.queryByText(/Failed to generate budget/i),
    ).not.toBeInTheDocument();
  });

  it("shows a generic error when the fetch rejects with a non-Error value", async () => {
    mockFetch.mockRejectedValue("kaboom");

    render(<ZeroBasedBudgetPage />);
    await advanceToGenerate();

    await waitFor(() =>
      expect(screen.getByText("Failed to generate budget.")).toBeInTheDocument(),
    );
  });

  it("maps an unknown category name/type through the defensive fallbacks", async () => {
    mockFetch.mockResolvedValue(
      zeroBasedResponse([
        {
          id: "cx",
          budgetId: "",
          name: "mystery_expense",
          type: "MYSTERY",
          allocatedAmount: 5000,
          spentAmount: 0,
          remainingAmount: 5000,
          percentUsed: 0,
          alerts: [],
          rules: [],
        },
      ]),
    );

    render(<ZeroBasedBudgetPage />);
    await advanceToGenerate();

    await waitFor(() =>
      expect(screen.getByText("Fine-tune your allocations")).toBeInTheDocument(),
    );
    // Unknown name → raw value used as the display name; unknown type → the
    // lifestyle bucket; no dedicated icon → the type-fallback icon.
    expect(screen.getByText("mystery_expense")).toBeInTheDocument();
    expect(
      (screen.getByLabelText("mystery_expense allocation") as HTMLInputElement)
        .value,
    ).toBe("5000");
  });
});
