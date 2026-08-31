/**
 * Payment Optimizer — real-debt wiring regression coverage.
 *
 * The page computed a real-looking plan from invented inputs, which is the
 * most convincing kind of wrong:
 *
 *   - the debts lived in a useState INITIALISER ("Chase Freedom $3,500 at
 *     18.99%", "Capital One $2,800", a $5,000 loan), so every reader saw a
 *     payoff plan for $11,300 they did not owe. That shape is invisible to
 *     audit:screen-data (#100), so these tests are the only guard on it.
 *   - the planner started everyone at 650 and added 3 points a month, then
 *     rendered "+N Score Increase".
 *   - "Interest Saved $1,250" was a literal with the comment "Simplified
 *     calculation".
 *   - the Strategy Comparison table asserted per-strategy interest and score
 *     outcomes for debts nobody had read.
 *
 * ON MOCKING: MSW handler override, not `global.fetch`.
 */

import fs from "fs";
import path from "path";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { rest } from "msw";

import { server } from "@/__tests__/mocks/server";
import PaymentOptimizerPage from "../page";

jest.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "u-1" }, loading: false }),
}));

const DEBTS = "http://localhost/api/credit-builder/debts";

function debt(over: Record<string, unknown> = {}) {
  return {
    id: "d-1",
    name: "Store Card",
    type: "credit_card",
    balance: 1200,
    minimumPayment: 40,
    interestRate: 21.5,
    dueDate: 12,
    ...over,
  };
}

function serve(debts: unknown[]) {
  server.use(
    rest.get(DEBTS, (_req, res, ctx) =>
      res(ctx.json({ success: true, debts })),
    ),
  );
}

afterEach(cleanup);

describe("Payment optimizer — the debts are the reader's own", () => {
  it("renders the debts the route returned", async () => {
    serve([debt(), debt({ id: "d-2", name: "Car Loan", balance: 4000 })]);

    render(<PaymentOptimizerPage />);

    expect(await screen.findByText("Store Card")).toBeInTheDocument();
    expect(screen.getByText("Car Loan")).toBeInTheDocument();
  });

  it("totals only those debts", async () => {
    serve([debt({ balance: 1200 }), debt({ id: "d-2", balance: 800 })]);

    render(<PaymentOptimizerPage />);

    // $2,000, not the $11,300 of invented balances.
    expect(await screen.findByText("$2,000")).toBeInTheDocument();
    expect(screen.queryByText("$11,300")).not.toBeInTheDocument();
  });

  it("names none of the invented creditors", async () => {
    serve([debt()]);

    render(<PaymentOptimizerPage />);
    await screen.findByText("Store Card");

    for (const name of ["Chase Freedom", "Capital One", "Personal Loan"]) {
      expect(screen.queryByText(name)).not.toBeInTheDocument();
    }
  });

  it("says there are no debts rather than showing an example plan", async () => {
    serve([]);

    render(<PaymentOptimizerPage />);

    expect(
      await screen.findByText("No debts on your account yet"),
    ).toBeInTheDocument();
    expect(screen.queryByText("Chase Freedom")).not.toBeInTheDocument();
  });

  it("says the debts could not be loaded when the route fails", async () => {
    server.use(rest.get(DEBTS, (_req, res, ctx) => res(ctx.status(500))));

    render(<PaymentOptimizerPage />);

    expect(
      await screen.findByText("Your debts could not be loaded"),
    ).toBeInTheDocument();
  });

  it("says the service is unreachable when the network drops", async () => {
    server.use(rest.get(DEBTS, (_req, res) => res.networkError("offline")));

    render(<PaymentOptimizerPage />);

    await waitFor(() =>
      expect(
        screen.getByText(/could not reach the debts service/i),
      ).toBeInTheDocument(),
    );
  });
});

describe("Payment optimizer — no score is predicted", () => {
  it("shows no score-increase tile", async () => {
    serve([debt()]);

    render(<PaymentOptimizerPage />);
    await screen.findByText("Store Card");

    expect(screen.queryByText("Score Increase")).not.toBeInTheDocument();
    expect(screen.queryByText(/^\+\d+$/)).not.toBeInTheDocument();
  });

  it("shows no projected score in the plan", async () => {
    serve([debt()]);

    render(<PaymentOptimizerPage />);
    await screen.findByText("Store Card");

    // The projection started every reader at 650.
    expect(screen.queryByText("650")).not.toBeInTheDocument();
  });
});

describe("Payment optimizer — no interest figure is invented", () => {
  it("shows no Interest Saved tile", async () => {
    serve([debt()]);

    render(<PaymentOptimizerPage />);
    await screen.findByText("Store Card");

    expect(screen.queryByText("Interest Saved")).not.toBeInTheDocument();
    expect(screen.queryByText("$1250")).not.toBeInTheDocument();
  });

  it("shows the reader's own budget instead", async () => {
    serve([debt()]);

    render(<PaymentOptimizerPage />);

    // Appears as the summary tile label and beside the budget control.
    expect(
      (await screen.findAllByText("Monthly Budget")).length,
    ).toBeGreaterThan(0);
  });
});

describe("Payment optimizer — the comparison is computed", () => {
  it("compares strategies on payoff months only", async () => {
    serve([debt()]);

    render(<PaymentOptimizerPage />);
    await screen.findByText("Store Card");

    // Summary tile AND comparison-table header — both are real.
    expect(screen.getAllByText("Months to Payoff").length).toBeGreaterThan(0);
    // The columns that asserted outcomes for debts nobody read.
    expect(screen.queryByText("Interest Paid")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("columnheader", { name: /Score Increase/i }),
    ).not.toBeInTheDocument();
  });

  it("quotes none of the hardcoded comparison figures", async () => {
    serve([debt()]);

    render(<PaymentOptimizerPage />);
    await screen.findByText("Store Card");

    for (const figure of ["$1,250", "$1,425", "$1,350", "+45 points"]) {
      expect(screen.queryByText(figure)).not.toBeInTheDocument();
    }
  });
});

describe("Payment optimizer — the source is clean", () => {
  const raw = fs.readFileSync(
    path.join(process.cwd(), "src/app/credit-builder/payments/page.tsx"),
    "utf8",
  );
  const source = raw
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

  it("holds no hardcoded creditor", () => {
    for (const name of ["Chase Freedom", "Capital One"]) {
      expect(source).not.toContain(name);
    }
  });

  it("holds no score projection", () => {
    expect(source).not.toContain("currentScore");
    expect(source).not.toContain("650");
  });

  it("holds no hardcoded interest figure", () => {
    expect(source).not.toContain("totalInterestSaved");
  });

  it("reads the live debts route", () => {
    expect(source).toContain("/api/credit-builder/debts");
  });
});
