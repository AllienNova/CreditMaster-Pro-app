/**
 * Education Library — real-catalogue wiring regression coverage.
 *
 * The page had no fetch. `mockCourses` shipped a `progress` field — 75, 30, 0,
 * 100, 50 — so every reader was told they were three-quarters through one
 * course and had finished another, under a button reading "Continue" that had
 * no onClick. Nothing records progress: there is no enrolment table and no
 * lesson store. The most important tests in this file are the ones asserting
 * that no percentage and no "Continue" survive.
 *
 * Meanwhile `marketplace_products` had a seeded education row all along
 * (migration 20251218000000:416), reachable at
 * GET /api/marketplace/products?category=education.
 *
 * ON MOCKING: MSW handler override, not `global.fetch` — `server.listen()`
 * runs in a beforeAll that fires after module evaluation, so a module-level
 * fetch reassignment gets overwritten.
 */

import fs from "fs";
import path from "path";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom";
import { rest } from "msw";

import { server } from "@/__tests__/mocks/server";
import EducationPage from "../page";

const PRODUCTS = "http://localhost/api/marketplace/products";

/** The seeded row, field for field (migration 20251218000000:416-427). */
const CREDIT_MASTERY = {
  id: "prod-edu-1",
  name: "Credit Mastery Course",
  description: "Complete credit education program with certification",
  category: "education",
  price: 199,
  priceType: "one_time",
  rating: 4.9,
  reviewCount: 287,
  features: {
    modules: 12,
    hours: 24,
    certificate: true,
    lifetime_access: true,
  },
};

function serve(products: unknown[] = [CREDIT_MASTERY]) {
  server.use(
    rest.get(PRODUCTS, (_req, res, ctx) =>
      res(ctx.json({ success: true, data: products })),
    ),
  );
}

afterEach(cleanup);

describe("Education — the real catalogue", () => {
  it("renders the seeded course", async () => {
    serve();

    render(<EducationPage />);

    expect(await screen.findByText("Credit Mastery Course")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Complete credit education program with certification",
      ),
    ).toBeInTheDocument();
  });

  it("shows the price with its cadence", async () => {
    serve();

    render(<EducationPage />);

    expect(await screen.findByText("$199.00")).toBeInTheDocument();
    expect(screen.getByText("one-time")).toBeInTheDocument();
  });

  it("shows the rating with its review count", async () => {
    serve();

    render(<EducationPage />);

    expect(await screen.findByText("4.9 from 287 reviews")).toBeInTheDocument();
  });

  it("lists the features the row declares", async () => {
    serve();

    render(<EducationPage />);

    expect(await screen.findByText("Modules: 12")).toBeInTheDocument();
    expect(screen.getByText("Hours: 24")).toBeInTheDocument();
    expect(screen.getByText("Certificate")).toBeInTheDocument();
    expect(screen.getByText("Lifetime access")).toBeInTheDocument();
  });

  it("says there are no ratings rather than printing 0.0", async () => {
    serve([{ ...CREDIT_MASTERY, rating: 0, reviewCount: 0 }]);

    render(<EducationPage />);

    expect(await screen.findByText("No ratings yet")).toBeInTheDocument();
  });

  it("renders a course whose features object is the column default", async () => {
    serve([{ id: "bare", name: "Bare Course", price: 10, features: {} }]);

    render(<EducationPage />);

    expect(await screen.findByText("Bare Course")).toBeInTheDocument();
  });

  it("requests the education category, not the whole catalogue", async () => {
    let lastUrl = "";
    server.use(
      rest.get(PRODUCTS, (req, res, ctx) => {
        lastUrl = req.url.search;
        return res(ctx.json({ success: true, data: [CREDIT_MASTERY] }));
      }),
    );

    render(<EducationPage />);
    await screen.findByText("Credit Mastery Course");

    expect(lastUrl).toContain("category=education");
  });
});

describe("Education — nothing claims the reader's progress", () => {
  it("shows no percentage anywhere", async () => {
    serve();

    render(<EducationPage />);
    await screen.findByText("Credit Mastery Course");

    // 75%, 30%, 100%, 50% were rendered to every visitor alike.
    expect(screen.queryByText(/\d+%/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Progress/i)).not.toBeInTheDocument();
  });

  it("offers no Continue or Review button, because nothing was started", async () => {
    serve();

    render(<EducationPage />);
    await screen.findByText("Credit Mastery Course");

    for (const label of [/^Continue$/, /^Review$/, /^Start Course$/]) {
      expect(screen.queryByRole("button", { name: label })).not.toBeInTheDocument();
    }
  });

  it("shows none of the invented course titles", async () => {
    serve();

    render(<EducationPage />);
    await screen.findByText("Credit Mastery Course");

    for (const title of [
      "Credit Score Fundamentals",
      "Understanding Your Credit Report",
    ]) {
      expect(screen.queryByText(title)).not.toBeInTheDocument();
    }
  });
});

describe("Education — the empty and failed states invent nothing", () => {
  it("says the catalogue is empty rather than showing a course", async () => {
    serve([]);

    render(<EducationPage />);

    expect(
      await screen.findByText("No courses in the catalogue yet"),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Credit Score Fundamentals/)).not.toBeInTheDocument();
  });

  it("says the catalogue is unavailable when the route fails", async () => {
    server.use(rest.get(PRODUCTS, (_req, res, ctx) => res(ctx.status(500))));

    render(<EducationPage />);

    expect(
      await screen.findByText(/The catalogue is unavailable/i),
    ).toBeInTheDocument();
  });

  it("says the catalogue is unreachable when the network drops", async () => {
    server.use(rest.get(PRODUCTS, (_req, res) => res.networkError("offline")));

    render(<EducationPage />);

    expect(
      await screen.findByText(/could not reach the education catalogue/i),
    ).toBeInTheDocument();
  });

  it("states plainly that Fynvita publishes no guides yet", async () => {
    serve();

    render(<EducationPage />);

    // The Articles tab used to fill this space with five invented pieces.
    expect(
      await screen.findByText(/have not published our own written guides yet/i),
    ).toBeInTheDocument();
  });
});

describe("Education — the constants are gone", () => {
  const raw = fs.readFileSync(
    path.join(process.cwd(), "src/app/marketplace/education/page.tsx"),
    "utf8",
  );
  const source = raw
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

  it.each(["mockCourses", "mockArticles"])(
    "no longer declares %s",
    (name) => {
      expect(source).not.toContain(name);
    },
  );

  it("holds no progress field", () => {
    expect(source).not.toContain("progress");
  });

  it("reads the live products route", () => {
    expect(source).toContain("/api/marketplace/products?category=education");
  });
});
