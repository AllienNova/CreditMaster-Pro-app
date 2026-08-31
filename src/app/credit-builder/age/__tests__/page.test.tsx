/**
 * Credit Age — real-tradeline wiring regression coverage.
 *
 * A useState initialiser named the reader's creditors and open dates, so the
 * average age, oldest and newest account, and every recommendation were
 * computed from a credit history nobody had read. Invisible to
 * audit:screen-data until the useState detector landed (da4323a).
 *
 * Two behaviours here are worth more than the wiring itself:
 *
 *   - an account with no opened_date has an UNKNOWN age and is excluded from
 *     the averages. Folding it in as 0 would drag every figure down with a
 *     number nobody recorded.
 *   - status comes from closed_date and is not editable. The old "Simulate
 *     Closure" button flipped it in local state, which over real tradelines
 *     would show an open account as closed.
 *
 * ON MOCKING: MSW handler override, not `global.fetch`.
 */

import fs from "fs";
import path from "path";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { rest } from "msw";

import { server } from "@/__tests__/mocks/server";
import CreditAgePage from "../page";

jest.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "u-1" }, loading: false }),
}));

const ACCOUNTS = "http://localhost/api/credit-repair/accounts";

function account(over: Record<string, unknown> = {}) {
  return {
    id: "a-1",
    creditorName: "Northgate Card",
    accountType: "credit_card",
    balance: 300,
    creditLimit: 2000,
    paymentStatus: "current",
    openedDate: "2016-01-01",
    closedDate: null,
    ageMonths: 120, // 10 years
    ...over,
  };
}

function serve(accounts: unknown[]) {
  server.use(rest.get(ACCOUNTS, (_req, res, ctx) => res(ctx.json({ accounts }))));
}

afterEach(cleanup);

describe("Credit age — the accounts are the reader's own", () => {
  it("renders the tradelines the route returned", async () => {
    serve([account()]);

    render(<CreditAgePage />);

    expect(await screen.findByText("Northgate Card")).toBeInTheDocument();
  });

  it("shows an account's age in years from ageMonths", async () => {
    serve([account({ ageMonths: 120 })]);

    render(<CreditAgePage />);

    // Appears on the account card AND in the summary tiles, which with one
    // account are all the same figure. Both are real.
    expect((await screen.findAllByText("10.0 yrs")).length).toBeGreaterThan(0);
  });

  it("derives closed status from closedDate", async () => {
    serve([account({ closedDate: "2024-06-01" })]);

    render(<CreditAgePage />);

    expect(await screen.findByText(/Account Closed/)).toBeInTheDocument();
  });
});

describe("Credit age — an unknown open date stays unknown", () => {
  it("shows Unknown rather than a zero age", async () => {
    serve([account({ openedDate: null, ageMonths: null })]);

    render(<CreditAgePage />);

    // The account card AND the summary tiles all say Unknown: with no dated
    // account there is no average to state, and 0.0 would assert one.
    expect((await screen.findAllByText("Unknown")).length).toBeGreaterThan(1);
    expect(screen.queryAllByText("0.0 yrs")).toHaveLength(0);
  });

  it("excludes it from the average rather than counting it as zero", async () => {
    serve([
      account({ id: "a-1", ageMonths: 120 }),
      account({ id: "a-2", creditorName: "Undated", openedDate: null, ageMonths: null }),
    ]);

    render(<CreditAgePage />);

    // Average of the ONE dated account is 10.0, not (10 + 0) / 2 = 5.0.
    await screen.findByText("Northgate Card");
    expect(screen.queryByText(/\b5\.0\b/)).not.toBeInTheDocument();
  });
});

describe("Credit age — nothing predicts a score, nothing edits status", () => {
  it("shows no closure-impact figure", async () => {
    serve([account()]);

    render(<CreditAgePage />);
    await screen.findByText("Northgate Card");

    expect(screen.queryByText("Impact if Closed")).not.toBeInTheDocument();
    expect(screen.queryByText(/-25 points/)).not.toBeInTheDocument();
  });

  it("offers no closure simulator", async () => {
    serve([account()]);

    render(<CreditAgePage />);
    await screen.findByText("Northgate Card");

    for (const label of [/Simulate Closure/i, /^Reopen$/]) {
      expect(
        screen.queryByRole("button", { name: label }),
      ).not.toBeInTheDocument();
    }
  });
});

describe("Credit age — empty is not the same as unreadable", () => {
  it("says no accounts were found", async () => {
    serve([]);

    render(<CreditAgePage />);

    expect(
      await screen.findByText("No accounts on your report yet"),
    ).toBeInTheDocument();
  });

  it("says the accounts could not be loaded when the route fails", async () => {
    server.use(rest.get(ACCOUNTS, (_req, res, ctx) => res(ctx.status(500))));

    render(<CreditAgePage />);

    expect(
      await screen.findByText("Your accounts could not be loaded"),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("No accounts on your report yet"),
    ).not.toBeInTheDocument();
  });

  it("reports the service being unreachable", async () => {
    server.use(rest.get(ACCOUNTS, (_req, res) => res.networkError("offline")));

    render(<CreditAgePage />);

    await waitFor(() =>
      expect(
        screen.getByText(/could not reach the credit-accounts service/i),
      ).toBeInTheDocument(),
    );
  });
});

describe("Credit age — the source is clean", () => {
  const raw = fs.readFileSync(
    path.join(process.cwd(), "src/app/credit-builder/age/page.tsx"),
    "utf8",
  );
  const source = raw
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

  it("seeds no accounts into state", () => {
    expect(source).not.toContain("useState<Account[]>");
  });

  it("carries no closure-impact field", () => {
    expect(source).not.toContain("impactIfClosed");
  });

  it("has no status toggle", () => {
    expect(source).not.toContain("toggleAccountStatus");
  });

  it("reads the shared accounts hook", () => {
    expect(source).toContain("useCreditAccounts");
  });
});
