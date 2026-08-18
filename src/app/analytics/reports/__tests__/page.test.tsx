/**
 * Reports — fabrication-removal regression coverage.
 *
 * The page had no fetch. It dated every report type with a `lastGenerated`, so
 * all six read as documents the visitor had already produced; showed a "Weekly
 * Score Update" schedule they had never set up, marked active; and listed
 * downloads they had never taken, with format and size. Every date was Dec
 * 2024, so it was also twenty months stale by the time anyone read it.
 *
 * There is no generated-reports table, no report-schedules table and no
 * download history in any migration, and POST /api/analytics/reports composes
 * the all-zeros AnalyticsEngine stub (task #99), so generation would hand the
 * user a PDF of zeros with their name on it.
 *
 * These tests keep the catalogue and keep the claims out.
 */

import fs from "fs";
import path from "path";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom";

import ReportsPage from "../page";

const raw = fs.readFileSync(
  path.join(process.cwd(), "src/app/analytics/reports/page.tsx"),
  "utf8",
);
// Comments stripped: the header quotes what it removed, on purpose.
const source = raw
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/^\s*\/\/.*$/gm, "");

afterEach(cleanup);

describe("Reports — the catalogue survives", () => {
  it("lists the report types", () => {
    render(<ReportsPage />);

    expect(screen.getByText("Credit Score Summary")).toBeInTheDocument();
    expect(screen.getByText("Dispute Progress Report")).toBeInTheDocument();
    expect(screen.getByText("Account History Report")).toBeInTheDocument();
  });

  it("frames them as planned, not as documents already produced", () => {
    render(<ReportsPage />);

    expect(screen.getByText("Planned reports")).toBeInTheDocument();
    expect(
      screen.getByText(/not documents you already have/i),
    ).toBeInTheDocument();
  });
});

describe("Reports — no invented history", () => {
  it("dates no report as already generated", () => {
    render(<ReportsPage />);

    expect(screen.queryByText(/last generated/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Dec 1, 2024/)).not.toBeInTheDocument();
    expect(source).not.toContain("lastGenerated");
  });

  it("shows no schedule the user never set up", () => {
    render(<ReportsPage />);

    expect(screen.queryByText(/Weekly Score Update/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/next run/i)).not.toBeInTheDocument();
    expect(source).not.toContain("scheduledReports");
  });

  it("shows no download the user never took", () => {
    render(<ReportsPage />);

    /*
     * Asserted against the fabricated artefacts, not the word "download" —
     * the page's own disclaimer says there is "nothing to download", and a
     * bare /download/i matches that. Honest copy naturally names the thing it
     * is disclaiming, so the assertion has to be narrower than the topic.
     */
    expect(screen.queryByText(/245 KB/i)).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Credit Score Summary - Dec 2024/i),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("PDF")).not.toBeInTheDocument();
    expect(source).not.toContain("recentDownloads");
  });

  it("says plainly that reports cannot be generated yet", () => {
    render(<ReportsPage />);

    expect(
      screen.getByText(/Reports cannot be generated yet/i),
    ).toBeInTheDocument();
  });

  it("offers no button that would produce a document of zeros", () => {
    render(<ReportsPage />);

    // POST /api/analytics/reports composes AnalyticsEngine's all-zeros stubs.
    // A PDF looks authoritative in a way a screen does not, so no button until
    // the engine is real (task #99).
    expect(
      screen.queryByRole("button", { name: /generate|download|schedule/i }),
    ).not.toBeInTheDocument();
    expect(source).not.toContain("/api/analytics");
  });
});

describe("Reports — the feature has no storage", () => {
  it("has no report tables to wire to", () => {
    const dir = path.join(process.cwd(), "supabase/migrations");
    const found = fs
      .readdirSync(dir)
      .some((f) =>
        /generated_reports|report_schedules|scheduled_reports|report_downloads/.test(
          fs.readFileSync(path.join(dir, f), "utf8"),
        ),
      );
    // If this fails, storage landed and this page should be wired to it
    // rather than left on the not-available panel.
    expect(found).toBe(false);
  });
});
