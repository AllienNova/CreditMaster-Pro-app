/**
 * Smart Alerts — real-notification wiring regression coverage.
 *
 * The page opened on a critical fraud alert shown to every user: "Suspicious
 * Activity Detected — Unusual transaction pattern detected on your credit card
 * ending in 4532", $847.99, "Unknown Merchant", location "Foreign", stamped
 * `Date.now() - 30 * 60 * 1000` so it was permanently thirty minutes old. A
 * pulsing red banner told them it required immediate attention.
 *
 * Fynvita has no fraud detection. NotificationType has eleven members and not
 * one is a fraud or bill-due alert, so the page depicted a product that does
 * not exist, in the register most likely to make someone call their bank.
 *
 * These tests assert the real notifications render, the mutations reach the
 * server (the old handlers only set local state, so "Mark All Read" survived
 * until the next refresh), and none of the invented copy can come back.
 *
 * ON MOCKING: MSW handler override, not `global.fetch`. server.listen() runs in
 * a beforeAll that fires after this module is evaluated, so a module-level
 * fetch reassignment is overwritten and answers nothing.
 */

import fs from "fs";
import path from "path";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { rest } from "msw";

import { server } from "@/__tests__/mocks/server";
import ProactiveAlertsPage from "../page";

const URL = "http://localhost/api/notifications";

function notification(over: Record<string, unknown> = {}) {
  return {
    id: "n-1",
    type: "dispute_update",
    title: "Experian responded to your dispute",
    message: "The bureau has updated the status of dispute #4410.",
    read: false,
    createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    data: {},
    ...over,
  };
}

function serveList(notifications: unknown[]) {
  server.use(
    rest.get(URL, (_req, res, ctx) =>
      res(
        ctx.json({
          notifications,
          unreadCount: notifications.filter(
            (n) => !(n as { read: boolean }).read,
          ).length,
        }),
      ),
    ),
  );
}

afterEach(cleanup);

describe("Smart Alerts — real notifications", () => {
  it("renders the user's own notifications", async () => {
    serveList([notification()]);

    render(<ProactiveAlertsPage />);

    expect(
      await screen.findByText("Experian responded to your dispute"),
    ).toBeInTheDocument();
    expect(screen.getByText(/updated the status of dispute/i)).toBeInTheDocument();
    expect(screen.getByText("Dispute update")).toBeInTheDocument();
  });

  it("counts unread from the list rather than asserting a number", async () => {
    serveList([
      notification({ id: "a", read: false }),
      notification({ id: "b", read: true, title: "Payment received" }),
    ]);

    render(<ProactiveAlertsPage />);

    expect(await screen.findByText("1 new")).toBeInTheDocument();
  });

  it("filters to unread", async () => {
    serveList([
      notification({ id: "a", read: false, title: "Unread one" }),
      notification({ id: "b", read: true, title: "Read one" }),
    ]);

    render(<ProactiveAlertsPage />);
    expect(await screen.findByText("Read one")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "unread" }));

    expect(screen.getByText("Unread one")).toBeInTheDocument();
    expect(screen.queryByText("Read one")).not.toBeInTheDocument();
  });

  it("says so when there is nothing, rather than filling the space", async () => {
    serveList([]);

    render(<ProactiveAlertsPage />);

    expect(await screen.findByText("No alerts")).toBeInTheDocument();
    expect(screen.getByText(/will show up here/i)).toBeInTheDocument();
  });
});

describe("Smart Alerts — mutations reach the server", () => {
  it("PATCHes mark_read for one notification", async () => {
    serveList([notification()]);
    let body: Record<string, unknown> | null = null;
    server.use(
      rest.patch(URL, async (req, res, ctx) => {
        body = await req.json();
        return res(ctx.json({ success: true }));
      }),
    );

    render(<ProactiveAlertsPage />);
    await screen.findByText("Experian responded to your dispute");
    await userEvent.click(screen.getByRole("button", { name: /mark as read/i }));

    await waitFor(() =>
      expect(body).toEqual({ action: "mark_read", notificationId: "n-1" }),
    );
  });

  it("PATCHes mark_all_read", async () => {
    serveList([notification()]);
    let body: Record<string, unknown> | null = null;
    server.use(
      rest.patch(URL, async (req, res, ctx) => {
        body = await req.json();
        return res(ctx.json({ count: 1 }));
      }),
    );

    render(<ProactiveAlertsPage />);
    await screen.findByText("Experian responded to your dispute");
    await userEvent.click(
      screen.getByRole("button", { name: /mark all read/i }),
    );

    await waitFor(() => expect(body).toEqual({ action: "mark_all_read" }));
  });

  it("DELETEs the notification when dismissed", async () => {
    serveList([notification()]);
    let deletedId: string | null = null;
    server.use(
      rest.delete(URL, (req, res, ctx) => {
        deletedId = req.url.searchParams.get("notificationId");
        return res(ctx.json({ success: true }));
      }),
    );

    render(<ProactiveAlertsPage />);
    await screen.findByText("Experian responded to your dispute");
    await userEvent.click(screen.getByRole("button", { name: /dismiss/i }));

    await waitFor(() => expect(deletedId).toBe("n-1"));
  });
});

describe("Smart Alerts — failure invents nothing", () => {
  it("says the service is unreachable when the network drops", async () => {
    server.use(rest.get(URL, (_req, res) => res.networkError("offline")));

    render(<ProactiveAlertsPage />);

    expect(
      await screen.findByText(/could not reach the alerts service/i),
    ).toBeInTheDocument();
  });

  it("shows an unavailable message and no alerts when the list fails", async () => {
    server.use(
      rest.get(URL, (_req, res, ctx) =>
        res(ctx.status(500), ctx.json({ error: "boom" })),
      ),
    );

    render(<ProactiveAlertsPage />);

    expect(
      await screen.findByText(/Alerts are unavailable/i),
    ).toBeInTheDocument();
    expect(screen.queryByText(/4532/)).not.toBeInTheDocument();
  });
});

describe("Smart Alerts — the fabricated alerts are gone", () => {
  const raw = fs.readFileSync(
    path.join(process.cwd(), "src/app/insights/alerts/page.tsx"),
    "utf8",
  );

  /*
   * Comments stripped before the substring checks. The page's own header
   * quotes the copy it removed — "ending in 4532", "$847.99" — because a
   * deletion that does not say what it deleted invites the next person to put
   * it back. Checking the raw file would fail on that documentation and push
   * toward writing a vaguer comment, which is the wrong trade.
   */
  const source = raw
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

  it.each([
    "4532",
    "847.99",
    "Unknown Merchant",
    "Suspicious Activity Detected",
    "142.5",
    "Electric Company",
  ])("no longer contains %s", (literal) => {
    expect(source).not.toContain(literal);
  });

  it("declares no MOCK_ constants", () => {
    expect(source).not.toMatch(/const\s+MOCK_[A-Z_]+\s*[:=]/);
  });

  it("shows no priority, because nothing assigns one", async () => {
    // priority is absent from the Notification type, the service, and the
    // notifications table. A severity badge would be invented.
    serveList([notification()]);
    render(<ProactiveAlertsPage />);
    await screen.findByText("Experian responded to your dispute");

    for (const word of ["critical", "high", "medium", "low"]) {
      expect(
        screen.queryByText(new RegExp(`^${word}$`, "i")),
      ).not.toBeInTheDocument();
    }
    expect(source).not.toContain("fraud_suspected");
  });
});
