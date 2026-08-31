/**
 * Admin Subscription Management — real-data wiring regression coverage.
 *
 * The page had no fetch. It told the operator — the person deciding what to
 * build and what to charge — that Fynvita ran $487,230 MRR, $5.8M ARR, $59.12
 * ARPU and 2.3% churn, with a plan breakdown of 8,234 paying users and four
 * named subscribers. Fynvita has no live users. The churn panel was bare JSX
 * numbers (156, $12,324, 45%), which is the fabrication class the
 * audit:screen-data gate cannot see at all.
 *
 * The tests that matter most here are the arithmetic ones: MRR must be the sum
 * of the plan list prices of the ACTIVE rows, and an active row whose price ID
 * is not in the catalogue must be excluded and counted, never treated as $0.
 * Silently pricing an unknown plan at zero is the same class of bug as FND-018.
 *
 * ON MOCKING: MSW handler override, not `global.fetch`.
 */

import fs from "fs";
import path from "path";
import { render, screen, cleanup, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import { rest } from "msw";

import { server } from "@/__tests__/mocks/server";
import AdminSubscriptionsPage from "../page";

const SUBSCRIPTIONS = "http://localhost/api/admin/subscriptions";

function sub(over: Record<string, unknown> = {}) {
  return {
    id: "sub-1",
    user_email: "member@fynvita.test",
    status: "active",
    created_at: "2026-08-01T00:00:00.000Z",
    cancel_at_period_end: false,
    current_period_end: "2026-09-01T00:00:00.000Z",
    stripe_price_id: "price_standard",
    tier: "standard",
    plan_name: "Standard",
    monthly_list_price: 29.99,
    ...over,
  };
}

function serve(subscriptions: unknown[]) {
  server.use(
    rest.get(SUBSCRIPTIONS, (_req, res, ctx) =>
      res(ctx.json({ subscriptions, total: subscriptions.length })),
    ),
  );
}

afterEach(cleanup);

describe("Admin subscriptions — MRR is arithmetic on real rows", () => {
  it("sums the list price of the active rows", async () => {
    serve([
      sub({ id: "a" }),
      sub({ id: "b" }),
      sub({ id: "c", plan_name: "Pro", monthly_list_price: 99.99 }),
    ]);

    render(<AdminSubscriptionsPage />);

    // 29.99 + 29.99 + 99.99
    expect(await screen.findByText("$159.97")).toBeInTheDocument();
  });

  it("counts a trialing row as active", async () => {
    serve([sub({ id: "a", status: "trialing" })]);

    render(<AdminSubscriptionsPage />);

    expect(await screen.findByText("$29.99")).toBeInTheDocument();
  });

  it("excludes a canceled row from MRR", async () => {
    serve([sub({ id: "a" }), sub({ id: "b", status: "canceled" })]);

    render(<AdminSubscriptionsPage />);

    expect(await screen.findByText("$29.99")).toBeInTheDocument();
  });

  it("excludes an unpriced active row and says how many it excluded", async () => {
    serve([
      sub({ id: "a" }),
      sub({
        id: "b",
        stripe_price_id: "price_legacy_2019",
        tier: null,
        plan_name: null,
        monthly_list_price: null,
      }),
    ]);

    render(<AdminSubscriptionsPage />);

    // Not $29.99 + $0. The unknown row is named, not priced at nothing.
    expect(await screen.findByText("$29.99")).toBeInTheDocument();
    expect(
      screen.getByText(/1 active row on an unrecognised price ID is excluded/i),
    ).toBeInTheDocument();
  });

  it("shows $0.00 when nothing is active, rather than a number from nowhere", async () => {
    serve([sub({ id: "a", status: "canceled" })]);

    render(<AdminSubscriptionsPage />);

    expect(await screen.findByText("$0.00")).toBeInTheDocument();
  });

  it("labels MRR as list price, not as money collected", async () => {
    serve([sub()]);

    render(<AdminSubscriptionsPage />);

    expect(await screen.findByText("MRR at list price")).toBeInTheDocument();
    expect(screen.getByText(/Not money collected/i)).toBeInTheDocument();
  });
});

describe("Admin subscriptions — counts come from the rows", () => {
  it("counts every row and the active subset separately", async () => {
    serve([
      sub({ id: "a" }),
      sub({ id: "b", status: "canceled" }),
      sub({ id: "c", status: "past_due" }),
    ]);

    render(<AdminSubscriptionsPage />);

    const total = await screen.findByText("Subscriptions");
    expect(
      within(total.parentElement as HTMLElement).getByText("3"),
    ).toBeInTheDocument();

    const active = screen.getByText("Active or trialing");
    expect(
      within(active.parentElement as HTMLElement).getByText("1"),
    ).toBeInTheDocument();
  });

  it("groups by plan name and totals the list price per plan", async () => {
    serve([sub({ id: "a" }), sub({ id: "b" })]);

    render(<AdminSubscriptionsPage />);

    expect(await screen.findByText("Standard")).toBeInTheDocument();
    expect(
      screen.getByText("$59.98/month at list price"),
    ).toBeInTheDocument();
  });

  it("keeps an unmapped price ID as its own group rather than folding it into a plan", async () => {
    serve([
      sub({
        id: "b",
        stripe_price_id: "price_legacy_2019",
        plan_name: null,
        monthly_list_price: null,
      }),
    ]);

    render(<AdminSubscriptionsPage />);

    expect(await screen.findByText("price_legacy_2019")).toBeInTheDocument();
    expect(
      screen.getByText("Price ID not in the plan catalogue"),
    ).toBeInTheDocument();
  });

  it("lists the real subscriber rows", async () => {
    serve([sub({ user_email: "someone@fynvita.test" })]);

    render(<AdminSubscriptionsPage />);

    expect(
      await screen.findByText("someone@fynvita.test"),
    ).toBeInTheDocument();
    expect(screen.getByText(/started Aug 1, 2026/)).toBeInTheDocument();
  });

  it("flags a row set to cancel at period end", async () => {
    serve([sub({ cancel_at_period_end: true })]);

    render(<AdminSubscriptionsPage />);

    expect(
      await screen.findByText("cancels at period end"),
    ).toBeInTheDocument();
  });
});

describe("Admin subscriptions — nothing invented survives", () => {
  it("shows none of the fabricated headline figures", async () => {
    serve([sub()]);

    render(<AdminSubscriptionsPage />);
    await screen.findByText("MRR at list price");

    for (const figure of [
      "$487,230",
      "$5.8M",
      "$59.12",
      "2.3%",
      "$12,324",
      "156",
      "45%",
    ]) {
      expect(screen.queryByText(figure)).not.toBeInTheDocument();
    }
  });

  it("shows no month-over-month movement, having one point in time", async () => {
    serve([sub()]);

    render(<AdminSubscriptionsPage />);
    await screen.findByText("MRR at list price");

    expect(screen.queryByText(/from last month/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^\+\d+%$/)).not.toBeInTheDocument();
  });

  it("names none of the invented subscribers or plan tiers", async () => {
    serve([sub()]);

    render(<AdminSubscriptionsPage />);
    await screen.findByText("MRR at list price");

    for (const invented of [
      "john@example.com",
      "alice@example.com",
      "Basic ($29)",
      "Enterprise ($199)",
    ]) {
      expect(screen.queryByText(invented)).not.toBeInTheDocument();
    }
  });

  it("offers no Export Report button, because it had no onClick", async () => {
    serve([sub()]);

    render(<AdminSubscriptionsPage />);
    await screen.findByText("MRR at list price");

    expect(
      screen.queryByRole("button", { name: /Export Report/i }),
    ).not.toBeInTheDocument();
  });

  it("says why churn and ARPU are absent instead of dropping them silently", async () => {
    serve([sub()]);

    render(<AdminSubscriptionsPage />);

    expect(
      await screen.findByText(/a trend needs two points in time/i),
    ).toBeInTheDocument();
  });
});

describe("Admin subscriptions — empty and failed states", () => {
  it("says there are none rather than showing a business", async () => {
    serve([]);

    render(<AdminSubscriptionsPage />);

    expect(
      await screen.findByText(/No subscriptions on the platform yet/i),
    ).toBeInTheDocument();
    expect(screen.queryByText("$487,230")).not.toBeInTheDocument();
  });

  it("says data is unavailable when the route fails", async () => {
    server.use(
      rest.get(SUBSCRIPTIONS, (_req, res, ctx) => res(ctx.status(500))),
    );

    render(<AdminSubscriptionsPage />);

    expect(
      await screen.findByText(/Subscription data is unavailable/i),
    ).toBeInTheDocument();
  });

  it("says the service is unreachable when the network drops", async () => {
    server.use(
      rest.get(SUBSCRIPTIONS, (_req, res) => res.networkError("offline")),
    );

    render(<AdminSubscriptionsPage />);

    expect(
      await screen.findByText(/could not reach the subscriptions service/i),
    ).toBeInTheDocument();
  });
});

describe("Admin subscriptions — the constants are gone", () => {
  const raw = fs.readFileSync(
    path.join(process.cwd(), "src/app/admin/subscriptions/page.tsx"),
    "utf8",
  );
  const source = raw
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

  it.each(["planBreakdown", "recentSubscriptions"])(
    "no longer declares %s",
    (name) => {
      expect(source).not.toContain(name);
    },
  );

  it("holds none of the invented figures", () => {
    for (const literal of [
      "487,230",
      "5.8M",
      "59.12",
      "12,324",
      "example.com",
    ]) {
      expect(source).not.toContain(literal);
    }
  });

  it("reads the live admin route", () => {
    expect(source).toContain("/api/admin/subscriptions");
  });
});
