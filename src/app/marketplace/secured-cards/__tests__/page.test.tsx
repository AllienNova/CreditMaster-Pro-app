/**
 * Secured Card Comparison — real-data wiring regression coverage.
 *
 * The page had no fetch. `mockCards` quoted terms for real, named products —
 * "Discover it® Secured, $0 annual fee, $200–$2,500 deposit, 28.24% APR" —
 * with ratings nobody assigned, above a banner reading "Based on your profile,
 * we recommend the Discover it® Secured". No profile was read.
 *
 * THE GATE NEVER SAW IT. `mockCards` reached the JSX through an alias
 * (`filteredCards = mockCards.filter().sort()`), so it never appeared as
 * `mockCards.map(` and audit:screen-data reported the file in no run at all.
 * These tests are what stands in for the gate here — task #108 tracks teaching
 * the detector to follow aliases.
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
import SecuredCardsPage from "../page";

const CARDS = "http://localhost/api/credit-builder/secured-cards";

function card(over: Record<string, unknown> = {}) {
  return {
    id: "c-1",
    provider: "Partner Bank",
    name: "Builder Secured Card",
    minDeposit: 200,
    maxDeposit: 3000,
    apr: 24.5,
    annualFee: 0,
    rewards: "1% back on everything",
    graduationPath: true,
    creditLineIncrease: true,
    reporting: ["Experian", "Equifax", "TransUnion"],
    benefits: ["No annual fee"],
    recommended: false,
    ...over,
  };
}

function serve(cards: unknown[] = [card()]) {
  server.use(rest.get(CARDS, (_req, res, ctx) => res(ctx.json({ cards }))));
}

afterEach(cleanup);

describe("Secured cards — the real catalogue", () => {
  it("renders the card the route returned", async () => {
    serve();

    render(<SecuredCardsPage />);

    expect(await screen.findByText("Builder Secured Card")).toBeInTheDocument();
    expect(screen.getByText("Partner Bank")).toBeInTheDocument();
  });

  it("shows the terms from the row", async () => {
    serve();

    render(<SecuredCardsPage />);

    expect(await screen.findByText("None")).toBeInTheDocument();
    expect(screen.getByText("$200 – $3,000")).toBeInTheDocument();
    expect(screen.getByText("24.5%")).toBeInTheDocument();
  });

  it("prints a real annual fee rather than None", async () => {
    serve([card({ annualFee: 39 })]);

    render(<SecuredCardsPage />);

    expect(await screen.findByText("$39")).toBeInTheDocument();
  });

  it("names the bureaus the card reports to", async () => {
    serve();

    render(<SecuredCardsPage />);

    expect(
      await screen.findByText("Reports to Experian, Equifax, TransUnion"),
    ).toBeInTheDocument();
  });

  it("sorts by the chosen term", async () => {
    serve([
      card({ id: "a", name: "Higher fee", annualFee: 49 }),
      card({ id: "b", name: "Lower fee", annualFee: 0 }),
    ]);

    render(<SecuredCardsPage />);
    await screen.findByText("Lower fee");

    const headings = screen.getAllByRole("heading", { level: 2 });
    expect(headings[0]).toHaveTextContent("Lower fee");
  });

  it("filters to no-annual-fee cards", async () => {
    serve([
      card({ id: "a", name: "Has a fee", annualFee: 49 }),
      card({ id: "b", name: "Free card", annualFee: 0 }),
    ]);

    render(<SecuredCardsPage />);
    await screen.findByText("Has a fee");

    await userEvent.click(screen.getByRole("checkbox"));

    expect(screen.getByText("Free card")).toBeInTheDocument();
    expect(screen.queryByText("Has a fee")).not.toBeInTheDocument();
  });
});

describe("Secured cards — the suggestion comes from the service", () => {
  it("names the recommended card and gives the service's reason", async () => {
    serve([
      card({
        recommended: true,
        aiReasoning: "It reports to all three bureaus and has no annual fee.",
      }),
    ]);

    render(<SecuredCardsPage />);

    expect(
      await screen.findByText("Suggested for you: Builder Secured Card"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "It reports to all three bureaus and has no annual fee.",
      ),
    ).toBeInTheDocument();
  });

  it("shows no suggestion when the service recommends nothing", async () => {
    serve();

    render(<SecuredCardsPage />);
    await screen.findByText("Builder Secured Card");

    expect(screen.queryByText(/Suggested for you/)).not.toBeInTheDocument();
  });
});

describe("Secured cards — nothing invented survives", () => {
  it("quotes none of the hardcoded products or their terms", async () => {
    serve();

    render(<SecuredCardsPage />);
    await screen.findByText("Builder Secured Card");

    for (const literal of [
      /Discover it/,
      /Capital One Platinum Secured/,
      /28\.24%/,
      /2% cash back on gas/,
    ]) {
      expect(screen.queryByText(literal)).not.toBeInTheDocument();
    }
  });

  it("shows no star rating, a field the real card does not have", async () => {
    serve();

    render(<SecuredCardsPage />);
    await screen.findByText("Builder Secured Card");

    expect(screen.queryByText("4.8")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("option", { name: /Highest Rated/i }),
    ).not.toBeInTheDocument();
  });

  it("offers no Apply Now or Details button, since neither did anything", async () => {
    serve();

    render(<SecuredCardsPage />);
    await screen.findByText("Builder Secured Card");

    for (const label of [/Apply Now/i, /^Details$/]) {
      expect(
        screen.queryByRole("button", { name: label }),
      ).not.toBeInTheDocument();
    }
  });
});

describe("Secured cards — empty and failed states", () => {
  it("says there is nothing to compare rather than showing sample terms", async () => {
    serve([]);

    render(<SecuredCardsPage />);

    expect(
      await screen.findByText("No secured cards to compare yet"),
    ).toBeInTheDocument();
    expect(screen.getByText(/not something to show you a sample of/i)).toBeInTheDocument();
  });

  it("distinguishes an empty catalogue from an empty filter", async () => {
    serve([card({ annualFee: 49 })]);

    render(<SecuredCardsPage />);
    await screen.findByText("Builder Secured Card");

    await userEvent.click(screen.getByRole("checkbox"));

    expect(screen.getByText("No cards match that filter")).toBeInTheDocument();
  });

  it("says card options are unavailable when the route fails", async () => {
    server.use(rest.get(CARDS, (_req, res, ctx) => res(ctx.status(500))));

    render(<SecuredCardsPage />);

    expect(
      await screen.findByText(/Card options are unavailable/i),
    ).toBeInTheDocument();
  });

  it("says the service is unreachable when the network drops", async () => {
    server.use(rest.get(CARDS, (_req, res) => res.networkError("offline")));

    render(<SecuredCardsPage />);

    expect(
      await screen.findByText(/could not reach the card service/i),
    ).toBeInTheDocument();
  });
});

describe("Secured cards — the constant is gone", () => {
  const raw = fs.readFileSync(
    path.join(process.cwd(), "src/app/marketplace/secured-cards/page.tsx"),
    "utf8",
  );
  const source = raw
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

  it("no longer declares mockCards", () => {
    expect(source).not.toContain("mockCards");
  });

  it("names no card issuer and quotes no APR", () => {
    for (const literal of ["Discover", "Capital One", "28.24", "OpenSky"]) {
      expect(source).not.toContain(literal);
    }
  });

  it("reads the live secured-cards route", () => {
    expect(source).toContain("/api/credit-builder/secured-cards");
  });
});
