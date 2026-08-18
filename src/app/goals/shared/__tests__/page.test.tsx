/**
 * Shared goals — real-goal wiring regression coverage.
 *
 * The page had no fetch. MOCK_GOALS invented a "Dream Home Down Payment"
 * ($42,500 of $60,000) with named members and their contributions, including
 * "You, contributed $24,000". Hardcoded in the JSX below it — not even in a
 * constant, so audit:screen-data could not see it — sat "You have 1 pending
 * invitation: John invited you to 'Wedding Fund 2026'" with Accept and Decline.
 *
 * The centre of these tests is `showContributionAmounts`. Each real
 * SharedGoalMember carries that flag, and the mock ignored it and displayed
 * everybody's contributions. It is a privacy choice the model exists to
 * record, so it gets a test rather than a comment.
 *
 * ON MOCKING: MSW handler override, not `global.fetch`.
 */

import fs from "fs";
import path from "path";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { rest } from "msw";

import { server } from "@/__tests__/mocks/server";
import SharedGoalsPage from "../page";

const SHARED = "http://localhost/api/goals/shared";

function member(over: Record<string, unknown> = {}) {
  return {
    id: "m-1",
    displayName: "Ada",
    relationship: "partner",
    totalContributed: 1_200,
    showContributionAmounts: true,
    ...over,
  };
}

function goal(over: Record<string, unknown> = {}) {
  return {
    id: "g-1",
    name: "Kitchen renovation",
    description: "Saving together",
    targetAmount: 10_000,
    currentAmount: 4_000,
    currency: "USD",
    targetDate: new Date(Date.now() + 30 * 86_400_000).toISOString(),
    progressPercent: 40,
    members: [member()],
    ...over,
  };
}

function serve(goals: unknown[]) {
  server.use(
    rest.get(SHARED, (_req, res, ctx) =>
      res(ctx.json({ success: true, data: { goals, total: goals.length } })),
    ),
  );
}

afterEach(cleanup);

describe("Shared goals — real goals", () => {
  it("renders the goals the route returned", async () => {
    serve([goal()]);

    render(<SharedGoalsPage />);

    expect(await screen.findByText(/Kitchen renovation/)).toBeInTheDocument();
    expect(screen.getByText("Saving together")).toBeInTheDocument();
  });

  it("shows saved and target amounts from the data", async () => {
    serve([goal()]);

    render(<SharedGoalsPage />);

    expect(await screen.findAllByText("$4,000")).not.toHaveLength(0);
    expect(screen.getByText("of $10,000")).toBeInTheDocument();
  });

  it("derives days left from the real target date", async () => {
    serve([goal()]);

    render(<SharedGoalsPage />);

    expect(await screen.findByText("30 days left")).toBeInTheDocument();
  });

  it("shows no countdown when the goal has no target date", async () => {
    serve([goal({ targetDate: undefined })]);

    render(<SharedGoalsPage />);

    await screen.findByText(/Kitchen renovation/);
    expect(screen.queryByText(/days left/)).not.toBeInTheDocument();
  });

  it("computes progress when the route did not supply a percentage", async () => {
    serve([
      goal({ progressPercent: undefined, currentAmount: 2_500, targetAmount: 10_000 }),
    ]);

    render(<SharedGoalsPage />);

    expect(await screen.findByText("25% there")).toBeInTheDocument();
  });

  it("does not divide by zero on a goal with no target", async () => {
    serve([goal({ progressPercent: undefined, targetAmount: 0 })]);

    render(<SharedGoalsPage />);

    expect(await screen.findByText("0% there")).toBeInTheDocument();
  });
});

describe("Shared goals — contribution privacy is honoured", () => {
  it("shows an amount when the member opted to share it", async () => {
    serve([goal()]);

    render(<SharedGoalsPage />);
    await userEvent.click(await screen.findByText(/Kitchen renovation/));

    expect(screen.getByText("$1,200")).toBeInTheDocument();
  });

  it("HIDES the amount when the member did not", async () => {
    serve([
      goal({
        members: [
          member({
            id: "m-2",
            displayName: "Bo",
            totalContributed: 9_999,
            showContributionAmounts: false,
          }),
        ],
      }),
    ]);

    render(<SharedGoalsPage />);
    await userEvent.click(await screen.findByText(/Kitchen renovation/));

    // The mock displayed everybody's contributions unconditionally.
    expect(screen.getByText("Amount hidden")).toBeInTheDocument();
    expect(screen.queryByText("$9,999")).not.toBeInTheDocument();
  });

  it("says so when a goal has no other members", async () => {
    serve([goal({ members: [] })]);

    render(<SharedGoalsPage />);
    await userEvent.click(await screen.findByText(/Kitchen renovation/));

    expect(screen.getByText(/Nobody else has joined yet/i)).toBeInTheDocument();
  });
});

describe("Shared goals — absences read as absent", () => {
  it("says the user is in no shared goal rather than inventing one", async () => {
    serve([]);

    render(<SharedGoalsPage />);

    expect(
      await screen.findByText("You are not part of any shared goal"),
    ).toBeInTheDocument();
  });

  it("invents nothing when the route fails", async () => {
    server.use(rest.get(SHARED, (_req, res, ctx) => res(ctx.status(500))));

    render(<SharedGoalsPage />);

    expect(
      await screen.findByText(/Shared goals are unavailable/i),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Dream Home/)).not.toBeInTheDocument();
  });

  it("says the service is unreachable when the network drops", async () => {
    server.use(rest.get(SHARED, (_req, res) => res.networkError("offline")));

    render(<SharedGoalsPage />);

    expect(
      await screen.findByText(/could not reach the shared goals service/i),
    ).toBeInTheDocument();
  });
});

describe("Shared goals — the fabrication is gone", () => {
  const raw = fs.readFileSync(
    path.join(process.cwd(), "src/app/goals/shared/page.tsx"),
    "utf8",
  );
  const source = raw
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

  it("declares no MOCK_GOALS", () => {
    expect(source).not.toMatch(/const\s+MOCK_[A-Z_]+\s*[:=]/);
  });

  it("no longer hardcodes the pending invitation in JSX", async () => {
    // This one was invisible to audit:screen-data because it was inline JSX
    // rather than a module constant — see task #100.
    expect(source).not.toContain("Wedding Fund 2026");
    expect(source).not.toContain("pending invitation");

    serve([goal()]);
    render(<SharedGoalsPage />);
    await screen.findByText(/Kitchen renovation/);
    expect(screen.queryByText(/John invited you/)).not.toBeInTheDocument();
  });

  it("shows none of the fields the real SharedGoal lacks", () => {
    for (const field of [
      "milestones",
      "weeklyTarget",
      "lastWeekSaved",
      "recentActivity",
    ]) {
      expect(source).not.toContain(field);
    }
  });

  it("offers no create button that does nothing", async () => {
    // Four template cards were <button>s with no onClick under "Start a New
    // Shared Goal". The service has createGoal, but no POST route exists yet.
    expect(source).not.toContain("TEMPLATES");

    serve([goal()]);
    render(<SharedGoalsPage />);
    await screen.findByText(/Kitchen renovation/);
    expect(
      screen.queryByText(/Start a New Shared Goal/i),
    ).not.toBeInTheDocument();
  });

  it("reads the route that exposes the real service", () => {
    expect(source).toContain("/api/goals/shared");
  });
});
