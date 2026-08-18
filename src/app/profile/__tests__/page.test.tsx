/**
 * Profile — real-identity wiring regression coverage.
 *
 * The page showed every user the same person: "John Doe",
 * "john@example.com", "(555) 123-4567", initials "JD", "Premium Member",
 * "Member since January 2024", a credit score of 720, 12 items removed, a 78%
 * success rate, an achievement earned Nov 15 2024, and a "Dispute resolved —
 * Late payment removed from Experian" two hours ago.
 *
 * The identity was a `useState` object literal, which is why audit:screen-data
 * missed it — that gate inspects module-level arrays. It caught the two arrays
 * on this page and missed the person.
 *
 * "Save" only flipped `isEditing`; no request was ever sent.
 *
 * ON MOCKING: MSW handler override, not `global.fetch`.
 */

import fs from "fs";
import path from "path";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { rest } from "msw";

import { server } from "@/__tests__/mocks/server";
import ProfilePage from "../page";

const PROFILE = "http://localhost/api/profile";
const ACTIVITY = "http://localhost/api/activity";
const ACHIEVEMENTS = "http://localhost/api/gamification/achievements";

function serve({
  profile = {
    full_name: "Ada Lovelace",
    email: "ada@example.org",
    phone: "+44 20 7946 0000",
    created_at: "2026-02-01T00:00:00.000Z",
    subscription: { plan: "Pro" },
  },
  stats = {
    creditScore: 688,
    totalDisputes: 5,
    resolvedDisputes: 3,
    successRate: 60,
  },
  activities = [
    {
      id: "a-1",
      title: "Document uploaded",
      message: "Your ID was received.",
      createdAt: new Date(Date.now() - 7200_000).toISOString(),
    },
  ],
  achievements = [
    {
      id: "ua-1",
      status: "completed",
      completedAt: "2026-05-10T00:00:00.000Z",
      achievement: {
        name: "First dispute",
        description: "Filed your first dispute",
        icon: "flag",
        tier: "bronze",
      },
    },
  ],
}: Record<string, unknown> = {}) {
  server.use(
    rest.get(PROFILE, (_req, res, ctx) => res(ctx.json({ profile, stats }))),
    rest.get(ACTIVITY, (_req, res, ctx) => res(ctx.json({ activities }))),
    rest.get(ACHIEVEMENTS, (_req, res, ctx) =>
      res(ctx.json({ success: true, data: { achievements } })),
    ),
  );
}

afterEach(cleanup);

describe("Profile — the real person", () => {
  it("shows the account's own name and email", async () => {
    serve();

    render(<ProfilePage />);

    /*
     * Twice, legitimately: the header heading and the "Full Name" field in
     * Personal Information. Asserting the heading by role pins the one that
     * matters and tolerates the other.
     */
    expect(
      await screen.findByRole("heading", { name: "Ada Lovelace", level: 1 }),
    ).toBeInTheDocument();
    // Same duplication for the email: header, and the Email field below.
    expect(screen.getAllByText("ada@example.org")).toHaveLength(2);
  });

  it("derives the avatar initials from the real name", async () => {
    serve();

    render(<ProfilePage />);

    expect(await screen.findByText("AL")).toBeInTheDocument();
    expect(screen.queryByText("JD")).not.toBeInTheDocument();
  });

  it("falls back to the email initial when there is no name", async () => {
    serve({
      profile: { full_name: null, email: "zoe@example.org", created_at: null },
    });

    render(<ProfilePage />);

    expect(await screen.findByText("Z")).toBeInTheDocument();
  });

  it("shows the plan and join month it was given", async () => {
    serve();

    render(<ProfilePage />);

    expect(await screen.findByText("Pro Member")).toBeInTheDocument();
    expect(screen.getByText(/Member since February 2026/i)).toBeInTheDocument();
  });

  it("shows stats from the route, labelled as resolved not removed", async () => {
    serve();

    render(<ProfilePage />);

    expect(await screen.findByText("688")).toBeInTheDocument();
    expect(screen.getByText("Disputes Resolved")).toBeInTheDocument();
    expect(screen.getByText("60%")).toBeInTheDocument();
    expect(screen.queryByText(/Items Removed/i)).not.toBeInTheDocument();
  });

  it("renders real activity and real achievements", async () => {
    serve();

    render(<ProfilePage />);

    expect(await screen.findByText("Document uploaded")).toBeInTheDocument();
    expect(screen.getByText("First dispute")).toBeInTheDocument();
  });
});

describe("Profile — Save actually saves", () => {
  it("PATCHes the edited fields and re-reads", async () => {
    serve();
    let sent: Record<string, unknown> | null = null;
    server.use(
      rest.patch(PROFILE, async (req, res, ctx) => {
        sent = await req.json();
        return res(ctx.json({ profile: {} }));
      }),
    );

    render(<ProfilePage />);
    await screen.findAllByText("Ada Lovelace");

    await userEvent.click(screen.getByRole("button", { name: "Edit" }));
    const name = screen.getByLabelText("Full Name");
    await userEvent.clear(name);
    await userEvent.type(name, "Ada B Lovelace");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() =>
      expect(sent).toEqual({
        full_name: "Ada B Lovelace",
        phone: "+44 20 7946 0000",
      }),
    );
  });

  it("says so when the save fails", async () => {
    serve();
    server.use(rest.patch(PROFILE, (_req, res, ctx) => res(ctx.status(500))));

    render(<ProfilePage />);
    await screen.findAllByText("Ada Lovelace");

    await userEvent.click(screen.getByRole("button", { name: "Edit" }));
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(
      await screen.findByText(/could not save your changes/i),
    ).toBeInTheDocument();
  });
});

describe("Profile — absences read as absent", () => {
  it("invents no identity when the profile call fails", async () => {
    server.use(
      rest.get(PROFILE, (_req, res, ctx) => res(ctx.status(500))),
      rest.get(ACTIVITY, (_req, res, ctx) => res(ctx.json({ activities: [] }))),
      rest.get(ACHIEVEMENTS, (_req, res, ctx) =>
        res(ctx.json({ success: true, data: { achievements: [] } })),
      ),
    );

    render(<ProfilePage />);

    expect(
      await screen.findByText(/Your profile is unavailable/i),
    ).toBeInTheDocument();
    for (const value of ["John Doe", "john@example.com", "JD", "720", "78%"]) {
      expect(screen.queryByText(value)).not.toBeInTheDocument();
    }
  });

  it("shows dashes rather than numbers when stats are missing", async () => {
    serve({ stats: {} });

    render(<ProfilePage />);

    expect(await screen.findAllByText("—")).toHaveLength(3);
  });

  it("says the feed and achievements are empty rather than filling them", async () => {
    serve({ activities: [], achievements: [] });

    render(<ProfilePage />);

    expect(
      await screen.findByText(/Nothing has happened on your account yet/i),
    ).toBeInTheDocument();
    expect(screen.getByText("No achievements yet.")).toBeInTheDocument();
  });
});

describe("Profile — the fabrication is gone from source", () => {
  const raw = fs.readFileSync(
    path.join(process.cwd(), "src/app/profile/page.tsx"),
    "utf8",
  );
  const source = raw
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

  it.each([
    "John Doe",
    "john@example.com",
    "(555) 123-4567",
    "activityHistory",
  ])("no longer contains %s", (literal) => {
    expect(source).not.toContain(literal);
  });

  it("holds no hardcoded stats", () => {
    for (const literal of ['"720"', ">720<", ">12<", '"78%"']) {
      expect(source).not.toContain(literal);
    }
  });

  it("reads all four routes", () => {
    expect(source).toContain('fetch("/api/profile")');
    expect(source).toContain('fetch("/api/activity")');
    expect(source).toContain("/api/gamification/achievements");
    expect(source).toContain('method: "PATCH"');
  });
});
