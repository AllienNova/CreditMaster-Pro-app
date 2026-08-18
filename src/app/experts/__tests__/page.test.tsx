/**
 * Experts directory — real-adviser wiring regression coverage.
 *
 * The page had no fetch. MOCK_EXPERTS invented credentialed professionals and
 * offered them for hire: "Dr. Sarah Mitchell — Certified Financial Planner |
 * Retirement Specialist, CFP and ChFC, 15 years, $200/hour, rated 4.9".
 *
 * Two things these tests exist to hold:
 *   1. The directory shows only what the service returns, and the service
 *      returns only status = "verified" experts.
 *   2. An UNVERIFIED credential is labelled unverified. That distinction is
 *      the whole safeguard — a mock adviser was "verified" merely by being
 *      typed into the file, and a credential badge is the thing a user would
 *      rely on when handing over their finances.
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
import ExpertsPage from "../page";

const EXPERTS = "http://localhost/api/experts";

function expert(over: Record<string, unknown> = {}) {
  return {
    id: "e-1",
    firstName: "Ada",
    lastName: "Nwosu",
    headline: "Fee-only planner",
    firmName: "Nwosu Advisory",
    bio: "Works with first-time investors.",
    certifications: [
      { name: "CFP", issuingBody: "CFP Board", isVerified: true },
    ],
    specialties: [{ id: "s-1", name: "Retirement Planning" }],
    yearsExperience: 12,
    hourlyRate: 180,
    currency: "USD",
    offersFreeConsult: true,
    freeConsultMinutes: 20,
    totalSessions: 64,
    averageRating: 4.6,
    reviewCount: 31,
    responseRate: 92,
    ...over,
  };
}

function serve(experts: unknown[]) {
  server.use(
    rest.get(EXPERTS, (_req, res, ctx) =>
      res(ctx.json({ success: true, data: { experts, total: experts.length } })),
    ),
  );
}

afterEach(cleanup);

describe("Experts — real advisers", () => {
  it("renders the adviser's name from firstName and lastName", async () => {
    serve([expert()]);

    render(<ExpertsPage />);

    expect(await screen.findByText("Ada Nwosu")).toBeInTheDocument();
    expect(screen.getByText("Fee-only planner")).toBeInTheDocument();
    expect(screen.getByText("Nwosu Advisory")).toBeInTheDocument();
  });

  it("shows the rate and free consultation the data carries", async () => {
    serve([expert()]);

    render(<ExpertsPage />);

    expect(await screen.findByText("$180")).toBeInTheDocument();
    expect(screen.getByText(/Free 20-min consult/i)).toBeInTheDocument();
  });

  it("shows rating, experience, sessions and response rate", async () => {
    serve([expert()]);

    render(<ExpertsPage />);

    expect(await screen.findByText("4.6")).toBeInTheDocument();
    expect(screen.getByText("(31)")).toBeInTheDocument();
    expect(screen.getByText(/12 years/)).toBeInTheDocument();
    expect(screen.getByText(/92% response rate/)).toBeInTheDocument();
  });

  it("omits a rating when nobody has reviewed the adviser", async () => {
    serve([expert({ averageRating: 0, reviewCount: 0 })]);

    render(<ExpertsPage />);

    await screen.findByText("Ada Nwosu");
    // A 0.0 rating badge would read as a bad adviser rather than a new one.
    expect(screen.queryByText("0.0")).not.toBeInTheDocument();
  });
});

describe("Experts — credentials are not laundered", () => {
  it("badges a verified certification", async () => {
    serve([expert()]);

    render(<ExpertsPage />);

    expect(await screen.findByText(/CFP/)).toBeInTheDocument();
    expect(screen.queryByText(/unverified/i)).not.toBeInTheDocument();
  });

  it("labels an UNVERIFIED certification as unverified", async () => {
    serve([
      expert({
        certifications: [
          { name: "ChFC", issuingBody: "The American College", isVerified: false },
        ],
      }),
    ]);

    render(<ExpertsPage />);

    // The safeguard: an unproven credential must not borrow a verified badge.
    expect(await screen.findByText(/ChFC \(unverified\)/)).toBeInTheDocument();
  });
});

describe("Experts — search and filters work on real data", () => {
  it("filters by name", async () => {
    serve([
      expert({ id: "a", firstName: "Ada", lastName: "Nwosu" }),
      expert({ id: "b", firstName: "Bo", lastName: "Lind", headline: "Tax" }),
    ]);

    render(<ExpertsPage />);
    await screen.findByText("Ada Nwosu");

    await userEvent.type(screen.getByLabelText("Search experts"), "Bo");

    expect(screen.getByText("Bo Lind")).toBeInTheDocument();
    expect(screen.queryByText("Ada Nwosu")).not.toBeInTheDocument();
  });

  it("offers only specialties that an adviser actually has", async () => {
    serve([expert({ specialties: [{ id: "s-9", name: "Estate Planning" }] })]);

    render(<ExpertsPage />);
    await screen.findByText("Ada Nwosu");

    // A chip with nobody behind it is a dead control.
    expect(
      screen.getByRole("button", { name: "Estate Planning" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Retirement Planning" }),
    ).not.toBeInTheDocument();
  });

  it("says so when a search matches nobody", async () => {
    serve([expert()]);

    render(<ExpertsPage />);
    await screen.findByText("Ada Nwosu");

    await userEvent.type(screen.getByLabelText("Search experts"), "zzzz");

    expect(screen.getByText(/No expert matches that search/i)).toBeInTheDocument();
  });
});

describe("Experts — absences read as absent", () => {
  it("says the directory is empty rather than inventing an adviser", async () => {
    serve([]);

    render(<ExpertsPage />);

    expect(
      await screen.findByText("No experts are available yet"),
    ).toBeInTheDocument();
    expect(screen.getByText(/once their credentials have been verified/i)).toBeInTheDocument();
  });

  it("invents nothing when the route fails", async () => {
    server.use(rest.get(EXPERTS, (_req, res, ctx) => res(ctx.status(500))));

    render(<ExpertsPage />);

    expect(
      await screen.findByText(/The directory is unavailable/i),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Sarah Mitchell/)).not.toBeInTheDocument();
  });

  it("says the directory is unreachable when the network drops", async () => {
    server.use(rest.get(EXPERTS, (_req, res) => res.networkError("offline")));

    render(<ExpertsPage />);

    expect(
      await screen.findByText(/could not reach the expert directory/i),
    ).toBeInTheDocument();
  });
});

describe("Experts — the invented advisers are gone", () => {
  const raw = fs.readFileSync(
    path.join(process.cwd(), "src/app/experts/page.tsx"),
    "utf8",
  );
  const source = raw
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

  it("declares no MOCK_EXPERTS", () => {
    expect(source).not.toMatch(/const\s+MOCK_[A-Z_]+\s*[:=]/);
  });

  it("names no invented adviser", () => {
    for (const name of ["Sarah Mitchell", "Certified Financial Planner |"]) {
      expect(source).not.toContain(name);
    }
  });

  it("shows none of the fields the real Expert lacks", () => {
    // ratingBreakdown, repeatClientRate, responseTime-as-prose and topReview
    // have no source in expert-sessions-service.ts.
    for (const field of [
      "ratingBreakdown",
      "repeatClientRate",
      "responseTime",
      "topReview",
    ]) {
      expect(source).not.toContain(field);
    }
  });

  it("reads the route that exposes the real service", () => {
    expect(source).toContain("/api/experts");
  });
});
