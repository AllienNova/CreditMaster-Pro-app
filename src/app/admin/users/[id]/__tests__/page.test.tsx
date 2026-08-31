/**
 * Admin member detail — real-data wiring regression coverage.
 *
 * `useParams()` was called and its result never read, so every ID in the URL
 * produced the same invented person: John Doe, +1 (555) 123-4567, credit score
 * 720 (+45), three disputes, three $79 payments. An admin doing support looked
 * at a stranger's history under the member's name, beside buttons reading
 * "Send Email" and "Suspend User" — which did nothing, the only reason this
 * never ended with the wrong account suspended.
 *
 * The tests that matter most: the page must request the ID from the URL, and
 * a section that FAILED to load must not read as a section with nothing in it.
 *
 * ON MOCKING: MSW handler override, not `global.fetch`.
 */

import fs from "fs";
import path from "path";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom";
import { rest } from "msw";

import { server } from "@/__tests__/mocks/server";
import AdminUserDetailPage from "../page";

const USER_ID = "11111111-2222-3333-4444-555555555555";

jest.mock("next/navigation", () => ({
  useParams: () => ({ id: "11111111-2222-3333-4444-555555555555" }),
}));

const DETAIL = "http://localhost/api/admin/users/:id";

function payload(over: Record<string, unknown> = {}) {
  return {
    user: {
      id: USER_ID,
      full_name: "Ada Lovelace",
      email: "ada@fynvita.test",
      subscription_tier: "pro",
      subscription_status: "active",
      stripe_customer_id: "cus_123",
      created_at: "2026-02-01T00:00:00.000Z",
      last_sign_in_at: "2026-08-17T00:00:00.000Z",
    },
    subscriptions: [
      {
        id: "sub-1",
        status: "active",
        stripe_price_id: "price_pro",
        plan_name: "Pro",
        monthly_list_price: 99.99,
        current_period_end: "2026-09-01T00:00:00.000Z",
        cancel_at_period_end: false,
      },
    ],
    disputes: [
      {
        id: "d-1",
        bureau: "experian",
        status: "under_review",
        item_type: "Late Payment",
        outcome: null,
        created_at: "2026-07-04T00:00:00.000Z",
      },
    ],
    payments: [
      {
        id: "p-1",
        amount: 99.99,
        currency: "usd",
        status: "paid",
        paid_at: "2026-08-01T00:00:00.000Z",
      },
    ],
    unavailable: [],
    ...over,
  };
}

function serve(body: Record<string, unknown> | null, status = 200) {
  server.use(
    rest.get(DETAIL, (_req, res, ctx) =>
      status === 200 && body
        ? res(ctx.json(body))
        : res(ctx.status(status), ctx.json({ error: "failed" })),
    ),
  );
}

afterEach(cleanup);

describe("Admin member detail — the member in the URL", () => {
  it("requests the ID from the route params", async () => {
    let requestedPath = "";
    server.use(
      rest.get(DETAIL, (req, res, ctx) => {
        requestedPath = req.url.pathname;
        return res(ctx.json(payload()));
      }),
    );

    render(<AdminUserDetailPage />);
    await screen.findByText("Ada Lovelace");

    expect(requestedPath).toBe(`/api/admin/users/${USER_ID}`);
  });

  it("renders the returned member, not a fixed one", async () => {
    serve(payload());

    render(<AdminUserDetailPage />);

    expect(await screen.findByText("Ada Lovelace")).toBeInTheDocument();
    expect(screen.getByText("ada@fynvita.test")).toBeInTheDocument();
    expect(screen.queryByText("John Doe")).not.toBeInTheDocument();
  });

  it("shows tier, member-since and last sign-in from the row", async () => {
    serve(payload());

    render(<AdminUserDetailPage />);

    expect(await screen.findByText("pro")).toBeInTheDocument();
    expect(screen.getByText("Feb 1, 2026")).toBeInTheDocument();
    expect(screen.getByText("Aug 17, 2026")).toBeInTheDocument();
  });

  it("says a member has never signed in rather than inventing a last login", async () => {
    serve(payload({ user: { ...payload().user, last_sign_in_at: null } }));

    render(<AdminUserDetailPage />);

    expect(await screen.findByText("Never signed in")).toBeInTheDocument();
    expect(screen.queryByText(/2 hours ago/)).not.toBeInTheDocument();
  });

  it("says when there is no name on file", async () => {
    serve(payload({ user: { ...payload().user, full_name: null } }));

    render(<AdminUserDetailPage />);

    expect(await screen.findByText("No name on file")).toBeInTheDocument();
  });
});

describe("Admin member detail — real subscriptions, payments and disputes", () => {
  it("renders the subscription with its list price and renewal", async () => {
    serve(payload());

    render(<AdminUserDetailPage />);

    expect(await screen.findByText("Pro")).toBeInTheDocument();
    expect(
      screen.getByText(/\$99\.99\/month at list price/),
    ).toBeInTheDocument();
    expect(screen.getByText(/renews Sep 1, 2026/)).toBeInTheDocument();
  });

  it("names an unmapped price ID instead of guessing a plan", async () => {
    serve(
      payload({
        subscriptions: [
          {
            id: "sub-2",
            status: "active",
            stripe_price_id: "price_legacy_2019",
            plan_name: null,
            monthly_list_price: null,
            current_period_end: null,
            cancel_at_period_end: false,
          },
        ],
      }),
    );

    render(<AdminUserDetailPage />);

    expect(await screen.findByText("price_legacy_2019")).toBeInTheDocument();
    expect(
      screen.getByText("Price ID not in the plan catalogue"),
    ).toBeInTheDocument();
  });

  it("renders the payment amount the route converted from cents", async () => {
    serve(payload());

    render(<AdminUserDetailPage />);

    expect(await screen.findByText("$99.99")).toBeInTheDocument();
    expect(screen.getByText("Aug 1, 2026")).toBeInTheDocument();
  });

  it("renders the dispute metadata", async () => {
    serve(payload());

    render(<AdminUserDetailPage />);

    expect(await screen.findByText("Late Payment")).toBeInTheDocument();
    expect(screen.getByText(/experian/)).toBeInTheDocument();
    expect(screen.getByText("under review")).toBeInTheDocument();
  });
});

describe("Admin member detail — empty is not the same as unreadable", () => {
  it("says a member has no disputes when the query succeeded and found none", async () => {
    serve(payload({ disputes: [] }));

    render(<AdminUserDetailPage />);

    expect(
      await screen.findByText("No disputes filed by this member."),
    ).toBeInTheDocument();
  });

  it("says a section could not be loaded when the query failed", async () => {
    serve(payload({ disputes: [], unavailable: ["disputes"] }));

    render(<AdminUserDetailPage />);

    expect(
      await screen.findByText(/could not load this section/i),
    ).toBeInTheDocument();
    // The distinction is the whole point of the `unavailable` list.
    expect(
      screen.queryByText("No disputes filed by this member."),
    ).not.toBeInTheDocument();
  });

  it("says last sign-in could not be read when auth failed", async () => {
    serve(payload({ unavailable: ["auth"] }));

    render(<AdminUserDetailPage />);

    expect(await screen.findByText("Could not be read")).toBeInTheDocument();
  });
});

describe("Admin member detail — failure states", () => {
  it("says there is no such user on a 404", async () => {
    serve(null, 404);

    render(<AdminUserDetailPage />);

    expect(await screen.findByText("No user with that ID.")).toBeInTheDocument();
    expect(screen.queryByText("John Doe")).not.toBeInTheDocument();
  });

  it("says the member could not be shown on a 500", async () => {
    serve(null, 500);

    render(<AdminUserDetailPage />);

    expect(
      await screen.findByText("This member could not be shown"),
    ).toBeInTheDocument();
  });

  it("says the service is unreachable when the network drops", async () => {
    server.use(rest.get(DETAIL, (_req, res) => res.networkError("offline")));

    render(<AdminUserDetailPage />);

    expect(
      await screen.findByText(/could not reach the admin service/i),
    ).toBeInTheDocument();
  });
});

describe("Admin member detail — nothing invented, nothing pretending to act", () => {
  it("shows no credit score and no point change", async () => {
    serve(payload());

    render(<AdminUserDetailPage />);
    await screen.findByText("Ada Lovelace");

    expect(screen.queryByText("720")).not.toBeInTheDocument();
    expect(screen.queryByText(/\+45/)).not.toBeInTheDocument();
    expect(screen.queryByText("Credit Score")).not.toBeInTheDocument();
  });

  it("offers no Suspend User or Send Email button", async () => {
    serve(payload());

    render(<AdminUserDetailPage />);
    await screen.findByText("Ada Lovelace");

    for (const label of [/Suspend User/i, /Send Email/i]) {
      expect(
        screen.queryByRole("button", { name: label }),
      ).not.toBeInTheDocument();
    }
  });

  it("shows no phone number, a column profiles does not have", async () => {
    serve(payload());

    render(<AdminUserDetailPage />);
    await screen.findByText("Ada Lovelace");

    expect(screen.queryByText(/\(555\) 123-4567/)).not.toBeInTheDocument();
  });

  it("says why the credit score and dispute letters are absent", async () => {
    serve(payload());

    render(<AdminUserDetailPage />);

    expect(
      await screen.findByText(/whether support may read a member/i),
    ).toBeInTheDocument();
  });
});

describe("Admin member detail — the constant is gone", () => {
  const raw = fs.readFileSync(
    path.join(process.cwd(), "src/app/admin/users/[id]/page.tsx"),
    "utf8",
  );
  const source = raw
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

  it("no longer declares mockUser", () => {
    expect(source).not.toContain("mockUser");
  });

  it("holds none of the invented details", () => {
    for (const literal of ["John Doe", "555) 123-4567", "creditScore", "D001"]) {
      expect(source).not.toContain(literal);
    }
  });

  it("reads the live detail route with the URL id", () => {
    expect(source).toContain("/api/admin/users/");
    expect(source).toContain("useParams");
  });
});
