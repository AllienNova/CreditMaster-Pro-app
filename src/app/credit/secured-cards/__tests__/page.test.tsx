/**
 * Secured Card Finder — real-catalogue wiring regression coverage.
 *
 * The page had no fetch at all. `MOCK_RECOMMENDATIONS` gave each card a
 * `matchScore`, an `approvalLikelihood` of high/medium/low and a
 * `projectedScoreImpact` — statements about the reader's own approval odds and
 * future credit score, computed by nothing. It also carried a second copy of
 * the card terms, disagreeing with the copy in credit-builder-service.ts about
 * the same real products.
 *
 * These tests assert the cards come from GET /api/credit-builder/secured-cards,
 * that the invented personalisation cannot return, and that the two controls
 * which did nothing are gone.
 *
 * ON MOCKING: MSW handler override, not `global.fetch` — server.listen() runs
 * in a beforeAll that fires after this module is evaluated.
 */

import fs from "fs";
import path from "path";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom";
import { rest } from "msw";

import { server } from "@/__tests__/mocks/server";
import SecuredCardsPage from "../page";

const URL = "http://localhost/api/credit-builder/secured-cards";

/** A SecuredCard as credit-builder-service.ts:104 defines it. */
function card(over: Record<string, unknown> = {}) {
  return {
    id: "sc-1",
    provider: "Discover",
    name: "Discover it® Secured",
    minDeposit: 200,
    maxDeposit: 2500,
    apr: 28.24,
    annualFee: 0,
    rewards: "2% cash back at gas stations and restaurants",
    graduationPath: true,
    creditLineIncrease: true,
    reporting: ["Experian", "Equifax", "TransUnion"],
    benefits: ["No annual fee", "Free FICO® Score"],
    recommended: true,
    aiReasoning: "Best overall secured card with rewards and graduation path",
    ...over,
  };
}

function serveCards(cards: unknown[]) {
  server.use(
    rest.get(URL, (_req, res, ctx) => res(ctx.json({ success: true, cards }))),
  );
}

afterEach(cleanup);

describe("Secured cards — real catalogue", () => {
  it("renders cards from the route", async () => {
    serveCards([card()]);

    render(<SecuredCardsPage />);

    expect(await screen.findByText("Discover it® Secured")).toBeInTheDocument();
    expect(screen.getByText("Discover")).toBeInTheDocument();
  });

  it("shows the terms it was given, including the APR", async () => {
    serveCards([card()]);

    render(<SecuredCardsPage />);

    expect(await screen.findByText("28.24%")).toBeInTheDocument();
    expect(screen.getByText("$200–$2,500")).toBeInTheDocument();
    expect(screen.getByText("None")).toBeInTheDocument(); // annualFee 0
  });

  it("lists the bureaus the card reports to", async () => {
    serveCards([card()]);

    render(<SecuredCardsPage />);

    expect(await screen.findByText("Experian")).toBeInTheDocument();
    expect(screen.getByText("Equifax")).toBeInTheDocument();
    expect(screen.getByText("TransUnion")).toBeInTheDocument();
  });

  it("frames the reason as ours, not as analysis of this user", async () => {
    serveCards([card()]);

    render(<SecuredCardsPage />);

    expect(await screen.findByText("Why we list it")).toBeInTheDocument();
    // aiReasoning is a fixed string per card; nothing may call it AI analysis.
    expect(screen.queryByText(/AI analysis/i)).not.toBeInTheDocument();
  });

  it("badges a recommended card as our pick, not as a match", async () => {
    serveCards([card({ recommended: true })]);

    render(<SecuredCardsPage />);

    expect(await screen.findByText("Our pick")).toBeInTheDocument();
    expect(screen.queryByText(/match/i)).not.toBeInTheDocument();
  });

  it("omits the badge when the route did not recommend the card", async () => {
    serveCards([card({ recommended: false })]);

    render(<SecuredCardsPage />);

    await screen.findByText("Discover it® Secured");
    expect(screen.queryByText("Our pick")).not.toBeInTheDocument();
  });

  it("tells the user the terms can change and to confirm with the issuer", async () => {
    serveCards([card()]);

    render(<SecuredCardsPage />);

    expect(
      await screen.findByText(/Confirm the current terms with the card issuer/i),
    ).toBeInTheDocument();
  });
});

describe("Secured cards — failure invents nothing", () => {
  it("shows an unavailable message and no cards when the route fails", async () => {
    server.use(
      rest.get(URL, (_req, res, ctx) =>
        res(ctx.status(500), ctx.json({ error: "boom" })),
      ),
    );

    render(<SecuredCardsPage />);

    expect(
      await screen.findByText(/Card options are unavailable/i),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Discover/)).not.toBeInTheDocument();
  });

  it("says the service is unreachable when the network drops", async () => {
    server.use(rest.get(URL, (_req, res) => res.networkError("offline")));

    render(<SecuredCardsPage />);

    expect(
      await screen.findByText(/could not reach the card service/i),
    ).toBeInTheDocument();
  });

  it("says so when the catalogue is empty", async () => {
    serveCards([]);

    render(<SecuredCardsPage />);

    expect(await screen.findByText("No card options yet")).toBeInTheDocument();
  });
});

describe("Secured cards — the invented personalisation is gone", () => {
  const raw = fs.readFileSync(
    path.join(process.cwd(), "src/app/credit/secured-cards/page.tsx"),
    "utf8",
  );
  // Comments stripped: the page header names what it removed, on purpose.
  const source = raw
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

  it.each([
    "matchScore",
    "approvalLikelihood",
    "projectedScoreImpact",
    "MOCK_RECOMMENDATIONS",
  ])("no longer references %s", (name) => {
    expect(source).not.toContain(name);
  });

  it("renders no approval-likelihood or score-impact claim", async () => {
    serveCards([card()]);

    render(<SecuredCardsPage />);
    await screen.findByText("Discover it® Secured");

    expect(screen.queryByText(/approval/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/\+\d+\s*points/i)).not.toBeInTheDocument();
  });

  it("has dropped the two controls that did nothing", () => {
    // selectedGoal only coloured its own chip; depositAmount only displayed
    // its own value. Neither filtered, sorted, or was sent anywhere.
    expect(source).not.toContain("selectedGoal");
    expect(source).not.toContain("depositAmount");
  });

  it("reads the route rather than holding its own catalogue", () => {
    expect(source).toContain("/api/credit-builder/secured-cards");
  });
});
