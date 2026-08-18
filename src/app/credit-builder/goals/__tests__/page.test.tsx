/**
 * Credit Goals — fabrication-removal regression coverage.
 *
 * The page gave every visitor a goal already in flight ("Reach Good Credit
 * (670+)", 590 -> 635, 56% complete) dated 2025-06-01, over a year past, so it
 * also read as overdue. Beside it sat `const currentScore = 635; // Mock
 * current score`.
 *
 * "Create goal" was theatre twice over: it passed a hardcoded "user_1" into
 * goalTrackerService, and that service touches no database at all — no
 * `supabase`, no `from(` — so a goal the user created vanished on reload.
 *
 * There is nowhere to store one. No credit_goals table exists in any
 * migration, no credit-goals route exists, and financial_goals cannot hold a
 * score goal: target_amount is DECIMAL NOT NULL CHECK (> 0).
 *
 * These tests assert the invented goal and score are gone, that the real
 * bureau scores render, and that nothing offers to save a goal.
 */

import fs from "fs";
import path from "path";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom";
import { rest } from "msw";

import { server } from "@/__tests__/mocks/server";
import GoalsPage from "../page";

const URL = "http://localhost/api/credit-monitoring/scores";

function serveScores(data: unknown) {
  server.use(
    rest.get(URL, (_req, res, ctx) => res(ctx.json({ success: true, data }))),
  );
}

afterEach(cleanup);

describe("Credit Goals — the real score", () => {
  it("renders each bureau score the account actually has", async () => {
    serveScores({
      experian: { score: 702 },
      equifax: { score: 695 },
      transunion: { score: 688 },
    });

    render(<GoalsPage />);

    expect(await screen.findByText("702")).toBeInTheDocument();
    expect(screen.getByText("695")).toBeInTheDocument();
    expect(screen.getByText("688")).toBeInTheDocument();
    expect(screen.getByText("Experian")).toBeInTheDocument();
  });

  it("shows only the bureaus that reported", async () => {
    serveScores({ experian: { score: 702 } });

    render(<GoalsPage />);

    expect(await screen.findByText("702")).toBeInTheDocument();
    expect(screen.queryByText("Equifax")).not.toBeInTheDocument();
    expect(screen.queryByText("TransUnion")).not.toBeInTheDocument();
  });

  it("says it has no score rather than showing one", async () => {
    serveScores({});

    render(<GoalsPage />);

    expect(
      await screen.findByText(/We do not have a score for you yet/i),
    ).toBeInTheDocument();
    expect(screen.queryByText("635")).not.toBeInTheDocument();
  });

  it("invents nothing when the score call fails", async () => {
    server.use(
      rest.get(URL, (_req, res, ctx) =>
        res(ctx.status(500), ctx.json({ error: "boom" })),
      ),
    );

    render(<GoalsPage />);

    expect(
      await screen.findByText(/Your score is unavailable/i),
    ).toBeInTheDocument();
    expect(screen.queryByText("635")).not.toBeInTheDocument();
  });

  it("says the service is unreachable when the network drops", async () => {
    server.use(rest.get(URL, (_req, res) => res.networkError("offline")));

    render(<GoalsPage />);

    expect(
      await screen.findByText(/could not reach the credit score service/i),
    ).toBeInTheDocument();
  });
});

describe("Credit Goals — no invented goal, no fake save", () => {
  it("shows no goal in flight and no progress against one", async () => {
    serveScores({ experian: { score: 702 } });

    render(<GoalsPage />);
    await screen.findByText("702");

    /*
     * "Reach Good Credit (670+)" is NOT asserted against: it is a real
     * GOAL_TEMPLATES title and belongs on the page as guidance. What was
     * invented is the goal IN FLIGHT — a progress figure, a countdown, and a
     * score it started from. Those are the markers to check.
     */
    expect(screen.queryByText("Active Goals")).not.toBeInTheDocument();
    expect(screen.queryByText(/56%/)).not.toBeInTheDocument();
    expect(screen.queryByText(/days remaining/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/590/)).not.toBeInTheDocument();
    expect(screen.queryByText(/635/)).not.toBeInTheDocument();
  });

  it("says plainly that a goal cannot be saved", async () => {
    serveScores({ experian: { score: 702 } });

    render(<GoalsPage />);

    expect(
      await screen.findByText(/Saving a goal is not available yet/i),
    ).toBeInTheDocument();
  });

  it("offers no control that pretends to create a goal", async () => {
    serveScores({ experian: { score: 702 } });

    render(<GoalsPage />);
    await screen.findByText("702");

    expect(
      screen.queryByRole("button", { name: /create|new goal|set goal/i }),
    ).not.toBeInTheDocument();
  });

  it("still shows the templates as guidance", async () => {
    serveScores({ experian: { score: 702 } });

    render(<GoalsPage />);

    expect(
      await screen.findByText("Goals people commonly set"),
    ).toBeInTheDocument();
    expect(screen.getByText("Reach Fair Credit (580+)")).toBeInTheDocument();
  });
});

describe("Credit Goals — source", () => {
  const raw = fs.readFileSync(
    path.join(process.cwd(), "src/app/credit-builder/goals/page.tsx"),
    "utf8",
  );
  // Comments stripped: the header names what it removed, on purpose.
  const source = raw
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

  it("declares no MOCK_ constants", () => {
    expect(source).not.toMatch(/const\s+MOCK_[A-Z_]+\s*[:=]/);
  });

  it("holds no hardcoded score and no hardcoded user id", () => {
    expect(source).not.toContain("635");
    expect(source).not.toContain("user_1");
  });

  it("does not call the in-memory goal creator", () => {
    expect(source).not.toContain("createGoalFromTemplate");
  });

  it("reads the bureau score route, not the 0-100 builder score", () => {
    // /api/credit-builder/score returns CreditBuilderScore.overall, 0-100.
    // Rendering it where the UI reads a bureau score would be a units error.
    expect(source).toContain("/api/credit-monitoring/scores");
    expect(source).not.toContain("/api/credit-builder/score");
  });

  it("has no credit_goals table to wire to", () => {
    const migrations = path.join(process.cwd(), "supabase/migrations");
    const hasTable = fs
      .readdirSync(migrations)
      .some((f) =>
        /credit_goals/.test(fs.readFileSync(path.join(migrations, f), "utf8")),
      );
    // If this fails, the table landed and this page should be wired to it
    // rather than left on the not-available panel.
    expect(hasTable).toBe(false);
  });
});
