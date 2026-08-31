/**
 * AlertsPanel — real-persistence wiring regression coverage.
 *
 * The panel is mounted in InvestmentDashboard and called getPriceAlertService(),
 * which kept alerts in an in-memory Map persisted to `localStorage`
 * (PriceAlertService.ts:92,491). Meanwhile `investment_alerts` exists on the
 * live database and /api/investments/alerts serves GET/POST/DELETE behind
 * withAuth, scoped by user_id — with no caller at all.
 *
 * So a user's price alerts never left their browser: gone on another device,
 * gone when site data is cleared.
 *
 * The migration that created the table (20260731000032) recorded the opposite
 * conclusion — "route.ts is the only real caller" — having checked that
 * PriceAlertService's "investment_alerts" string was a localStorage key rather
 * than a table. True, but it meant the route had NO caller while the UI wrote
 * to localStorage. The table was created for an endpoint nobody called.
 *
 * TWO CLAIMS ARE REMOVED HERE RATHER THAN WIRED, because nothing can source
 * them:
 *
 *   - the notifications tab. No cron evaluates investment_alerts (the four in
 *     vercel.json are dispute-status, reminders, session-cleanup and
 *     financial-snapshots), so no alert ever fires. A notifications tab
 *     promises delivery that does not exist.
 *   - "Triggered: <date>" and the "N Today" stat. `investment_alerts` has no
 *     triggered_at column, so there is no time to print.
 *
 * Identity is the server's: the panel no longer takes a userId to scope by —
 * withAuth decides whose alerts these are.
 *
 * ON MOCKING: MSW handler override, not `global.fetch`.
 */

import fs from "fs";
import path from "path";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { rest } from "msw";

import { server } from "@/__tests__/mocks/server";
import { AlertsPanel, ALERTS_PAGE_SIZE } from "../AlertsPanel";

const ALERTS = "http://localhost/api/investments/alerts";

function alert(over: Record<string, unknown> = {}) {
  return {
    id: "al-1",
    symbol: "AAPL",
    type: "price_above",
    status: "active",
    priority: "high",
    condition: { targetPrice: 240.5, direction: "above" },
    message: null,
    repeat_enabled: false,
    cooldown_minutes: 0,
    expires_at: null,
    created_at: "2026-08-01T12:00:00.000Z",
    ...over,
  };
}

function serve(alerts: unknown[]) {
  server.use(rest.get(ALERTS, (_req, res, ctx) => res(ctx.json({ alerts }))));
}

function open() {
  return render(<AlertsPanel isOpen onClose={() => {}} />);
}

afterEach(cleanup);

describe("Alerts panel — the alerts are the server's", () => {
  it("requests the alerts route when opened", async () => {
    let called = false;
    server.use(
      rest.get(ALERTS, (_req, res, ctx) => {
        called = true;
        return res(ctx.json({ alerts: [] }));
      }),
    );

    open();

    await waitFor(() => expect(called).toBe(true));
  });

  it("renders an alert the route returned", async () => {
    serve([alert()]);

    open();

    expect(await screen.findByText("AAPL")).toBeInTheDocument();
    expect(screen.getByText("Above $240.50")).toBeInTheDocument();
  });

  it("asks the route for one symbol when scoped to it", async () => {
    let query: string | null = null;
    server.use(
      rest.get(ALERTS, (req, res, ctx) => {
        query = req.url.searchParams.get("symbol");
        return res(ctx.json({ alerts: [alert({ symbol: "MSFT" })] }));
      }),
    );

    render(<AlertsPanel isOpen onClose={() => {}} symbol="MSFT" />);

    await screen.findByText("MSFT");
    expect(query).toBe("MSFT");
  });

  it("counts the stats from the alerts the route returned", async () => {
    serve([alert(), alert({ id: "al-2", status: "expired" })]);

    open();

    // 1 active of the 2 returned — counted, not asserted.
    expect(await screen.findByText("● 1 Active")).toBeInTheDocument();
    expect(screen.getByText("2 shown")).toBeInTheDocument();
  });
});

describe("Alerts panel — creating an alert reaches the server", () => {
  it("posts the form to the alerts route", async () => {
    let body: Record<string, unknown> | null = null;
    serve([]);
    server.use(
      rest.post(ALERTS, async (req, res, ctx) => {
        body = await req.json();
        return res(ctx.status(201), ctx.json({ alert: alert({ id: "new" }) }));
      }),
    );

    open();
    await userEvent.click(await screen.findByRole("button", { name: "create" }));
    await userEvent.type(screen.getByLabelText("Symbol"), "TSLA");
    await userEvent.clear(screen.getByLabelText("Target Price"));
    await userEvent.type(screen.getByLabelText("Target Price"), "300");
    await userEvent.click(screen.getByRole("button", { name: "Create Alert" }));

    await waitFor(() => expect(body).not.toBeNull());
    expect(body).toMatchObject({
      symbol: "TSLA",
      type: "price_above",
      condition: { targetPrice: 300, direction: "above" },
    });
    // The server owns identity; the client must not name the user.
    expect(body).not.toHaveProperty("userId");
  });

  it("reports a create that the server rejected instead of showing it as saved", async () => {
    serve([]);
    server.use(
      rest.post(ALERTS, (_req, res, ctx) =>
        res(ctx.status(500), ctx.json({ error: "Failed to create alert" })),
      ),
    );

    open();
    await userEvent.click(await screen.findByRole("button", { name: "create" }));
    await userEvent.type(screen.getByLabelText("Symbol"), "TSLA");
    await userEvent.clear(screen.getByLabelText("Target Price"));
    await userEvent.type(screen.getByLabelText("Target Price"), "300");
    await userEvent.click(screen.getByRole("button", { name: "Create Alert" }));

    expect(await screen.findByText(/could not be saved/i)).toBeInTheDocument();
  });
});

describe("Alerts panel — removing and pausing reach the server", () => {
  it("deletes through the route, by id", async () => {
    let deletedId: string | null = null;
    serve([alert()]);
    server.use(
      rest.delete(ALERTS, (req, res, ctx) => {
        deletedId = req.url.searchParams.get("id");
        return res(ctx.json({ success: true }));
      }),
    );

    open();
    await userEvent.click(
      await screen.findByRole("button", { name: /delete alert/i }),
    );

    await waitFor(() => expect(deletedId).toBe("al-1"));
  });

  it("pauses through the route rather than in local state", async () => {
    let patched: Record<string, unknown> | null = null;
    serve([alert()]);
    server.use(
      rest.patch(ALERTS, async (req, res, ctx) => {
        patched = await req.json();
        return res(ctx.json({ alert: alert({ status: "disabled" }) }));
      }),
    );

    open();
    await userEvent.click(
      await screen.findByRole("button", { name: /pause alert/i }),
    );

    await waitFor(() =>
      expect(patched).toMatchObject({ id: "al-1", status: "disabled" }),
    );
  });
});

/**
 * Pausing moved an alert out of the active list and into history, which
 * carried no controls — so a paused alert could not be resumed or deleted from
 * any screen. Harmless while pause lived in localStorage; a trapdoor once it
 * persists server-side.
 */
describe("Alerts panel — a paused alert can be brought back", () => {
  it("resumes a disabled alert through the route", async () => {
    let patched: Record<string, unknown> | null = null;
    serve([alert({ status: "disabled" })]);
    server.use(
      rest.patch(ALERTS, async (req, res, ctx) => {
        patched = await req.json();
        return res(ctx.json({ alert: alert({ status: "active" }) }));
      }),
    );

    open();
    await userEvent.click(await screen.findByRole("button", { name: "history" }));
    await userEvent.click(screen.getByRole("button", { name: /resume alert/i }));

    await waitFor(() =>
      expect(patched).toMatchObject({ id: "al-1", status: "active" }),
    );
  });

  it("deletes a disabled alert through the route", async () => {
    let deletedId: string | null = null;
    serve([alert({ status: "disabled" })]);
    server.use(
      rest.delete(ALERTS, (req, res, ctx) => {
        deletedId = req.url.searchParams.get("id");
        return res(ctx.json({ success: true }));
      }),
    );

    open();
    await userEvent.click(await screen.findByRole("button", { name: "history" }));
    await userEvent.click(screen.getByRole("button", { name: /delete alert/i }));

    await waitFor(() => expect(deletedId).toBe("al-1"));
  });
});

describe("Alerts panel — a failed action does not erase the list", () => {
  it("keeps the alerts on screen when a delete fails", async () => {
    serve([alert()]);
    server.use(rest.delete(ALERTS, (_req, res, ctx) => res(ctx.status(500))));

    open();
    await userEvent.click(
      await screen.findByRole("button", { name: /delete alert/i }),
    );

    // The failure is about one request, not about the account. Replacing the
    // list with the error would read as "your alerts are gone".
    expect(
      await screen.findByText(/could not be deleted/i),
    ).toBeInTheDocument();
    expect(screen.getByText("AAPL")).toBeInTheDocument();
  });
});

/**
 * GET caps at `limit` rows and there is no pagination, so the number on screen
 * is a page, not a total. Calling it "Total" asserts a count nobody counted.
 */
describe("Alerts panel — the count does not overstate", () => {
  it("labels the number as shown rather than total", async () => {
    serve([alert(), alert({ id: "al-2", status: "expired" })]);

    open();

    expect(await screen.findByText("2 shown")).toBeInTheDocument();
    expect(screen.queryByText(/\bTotal\b/)).not.toBeInTheDocument();
  });

  it("says more may exist when the page came back full", async () => {
    serve(
      Array.from({ length: ALERTS_PAGE_SIZE }, (_v, i) =>
        alert({ id: `al-${i}` }),
      ),
    );

    open();

    expect(await screen.findByText(/more not shown/i)).toBeInTheDocument();
  });

  it("says nothing about more when the page came back short", async () => {
    serve([alert()]);

    open();

    await screen.findByText("1 shown");
    expect(screen.queryByText(/more not shown/i)).not.toBeInTheDocument();
  });
});

describe("Alerts panel — empty is not the same as unreadable", () => {
  it("says there are no alerts when the route returned none", async () => {
    serve([]);

    open();

    expect(await screen.findByText("No active alerts")).toBeInTheDocument();
  });

  it("says the alerts could not be loaded when the route fails", async () => {
    server.use(rest.get(ALERTS, (_req, res, ctx) => res(ctx.status(500))));

    open();

    expect(
      await screen.findByText("Your alerts could not be loaded"),
    ).toBeInTheDocument();
    // "No active alerts" would be a claim about the account, not the request.
    expect(screen.queryByText("No active alerts")).not.toBeInTheDocument();
  });

  it("says the service is unreachable when the network drops", async () => {
    server.use(rest.get(ALERTS, (_req, res) => res.networkError("offline")));

    open();

    expect(
      await screen.findByText(/could not reach the alerts service/i),
    ).toBeInTheDocument();
  });
});

describe("Alerts panel — it promises only what runs", () => {
  it("offers no notifications tab, because nothing evaluates alerts", async () => {
    serve([alert()]);

    open();
    await screen.findByText("AAPL");

    expect(
      screen.queryByRole("button", { name: "notifications" }),
    ).not.toBeInTheDocument();
  });

  it("states that saved alerts are not yet monitored", async () => {
    serve([alert()]);

    open();

    expect(await screen.findByText(/not monitored yet/i)).toBeInTheDocument();
  });

  it("prints no trigger time, which no column holds", async () => {
    serve([alert({ status: "triggered" })]);

    open();
    await userEvent.click(await screen.findByRole("button", { name: "history" }));

    expect(screen.queryByText(/^Triggered: /)).not.toBeInTheDocument();
  });
});

describe("Alerts panel — the source is clean", () => {
  const raw = fs.readFileSync(
    path.join(process.cwd(), "src/components/investments/alerts/AlertsPanel.tsx"),
    "utf8",
  );
  const source = raw
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

  it("does not read the localStorage-backed service", () => {
    expect(source).not.toContain("getPriceAlertService");
    expect(source).not.toContain("localStorage");
  });

  it("reads the live alerts route", () => {
    expect(source).toContain("/api/investments/alerts");
  });

  it("takes no userId to scope by — the server decides", () => {
    expect(source).not.toContain("userId");
  });

  it("carries no triggeredToday stat, which has no column", () => {
    expect(source).not.toContain("triggeredToday");
  });
});
