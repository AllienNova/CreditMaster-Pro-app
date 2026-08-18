/**
 * Credit Mix — real-count wiring regression coverage.
 *
 * `accountTypes` was a useState initialiser asserting the reader had 2 credit
 * cards, 1 installment loan and no mortgage, and every recommendation on the
 * page followed from those counts. Invisible to audit:screen-data until the
 * useState detector landed (da4323a).
 *
 * The split this file pins down: `current` is COUNTED from the reader's own
 * tradelines, while `ideal` is our published guidance about a healthy mix —
 * the same for everyone, so it is catalogue and stays constant.
 *
 * ON MOCKING: MSW handler override, not `global.fetch`.
 */

import fs from "fs";
import path from "path";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { rest } from "msw";

import { server } from "@/__tests__/mocks/server";
import CreditMixPage from "../page";

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
    openedDate: "2020-01-01",
    ageMonths: 60,
    ...over,
  };
}

function serve(accounts: unknown[]) {
  server.use(rest.get(ACCOUNTS, (_req, res, ctx) => res(ctx.json({ accounts }))));
}

afterEach(cleanup);

describe("Credit mix — counts come from the reader's tradelines", () => {
  it("counts two credit cards as two", async () => {
    serve([account({ id: "a-1" }), account({ id: "a-2" })]);

    render(<CreditMixPage />);

    await waitFor(() =>
      expect(screen.getByText(/2 accounts/)).toBeInTheDocument(),
    );
  });

  it("counts a category the reader has none of as zero", async () => {
    serve([account()]);

    render(<CreditMixPage />);

    // One card, no mortgage. The old initialiser asserted the same shape by
    // hand; this one is counted.
    await waitFor(() =>
      expect(screen.getByText(/1 account\b/)).toBeInTheDocument(),
    );
    expect(screen.getAllByText(/0 accounts/).length).toBeGreaterThan(0);
  });

  it("matches account types regardless of case or spacing", async () => {
    serve([account({ accountType: "Credit Card" }), account({ id: "a-2", accountType: "AUTO-LOAN" })]);

    render(<CreditMixPage />);

    // Bureau feeds vary; both should land in their category, not "unmatched".
    await waitFor(() =>
      expect(screen.getAllByText(/1 account\b/).length).toBeGreaterThanOrEqual(2),
    );
  });

  it("keeps the ideal figures, which are guidance and not a claim", async () => {
    serve([account()]);

    render(<CreditMixPage />);

    await waitFor(() =>
      expect(screen.getByText(/Ideal: 3/)).toBeInTheDocument(),
    );
  });
});

describe("Credit mix — the counts are not hand-editable", () => {
  it("offers no increment or decrement control", async () => {
    serve([account()]);

    render(<CreditMixPage />);
    // "Credit Cards" also appears in the recommendations below, so wait on
    // the count line, which belongs to the category card.
    await screen.findByText(/1 account\b/);

    // Editing a counted figure would blend what the reader has with what they
    // might add, without marking which.
    const buttons = screen.queryAllByRole("button");
    const editors = buttons.filter((b) =>
      b.className.includes("w-8 h-8"),
    );
    expect(editors).toHaveLength(0);
  });
});

describe("Credit mix — empty is not the same as unreadable", () => {
  it("says no accounts were found rather than implying none exist", async () => {
    serve([]);

    render(<CreditMixPage />);

    expect(
      await screen.findByText("No accounts on your report yet"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/not because you have none of that kind/i),
    ).toBeInTheDocument();
  });

  it("says the accounts could not be loaded when the route fails", async () => {
    server.use(rest.get(ACCOUNTS, (_req, res, ctx) => res(ctx.status(500))));

    render(<CreditMixPage />);

    expect(
      await screen.findByText("Your accounts could not be loaded"),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("No accounts on your report yet"),
    ).not.toBeInTheDocument();
  });
});

describe("Credit mix — the source is clean", () => {
  const raw = fs.readFileSync(
    path.join(process.cwd(), "src/app/credit-builder/mix/page.tsx"),
    "utf8",
  );
  const source = raw
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

  it("seeds no counts into state", () => {
    expect(source).not.toContain("useState<AccountType[]>");
  });

  it("has no hand-edit path for a counted figure", () => {
    expect(source).not.toContain("updateAccountCount");
  });

  it("reads the shared accounts hook", () => {
    expect(source).toContain("useCreditAccounts");
  });
});
