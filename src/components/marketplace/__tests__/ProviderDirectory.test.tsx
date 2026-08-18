/**
 * ProviderDirectory — the shared directory behind /marketplace/attorneys and
 * /marketplace/coaching.
 *
 * Both pages previously listed invented people. The attorneys one is the
 * sharpest fabrication in this sweep, because it sends a reader somewhere:
 * "Sarah Mitchell, Mitchell Consumer Law, Los Angeles, CA — FCRA Violations —
 * 4.9 from 127 reviews — Free consultation". Someone with an error on their
 * credit report could have gone looking for her.
 *
 * Both were invisible to audit:screen-data because Prettier broke the chain
 * across lines (`mockAttorneys\n  .filter(`) and the detector required the dot
 * on the same line. So these tests are not a duplicate of the gate; for three
 * files they were the only thing that would have caught it.
 *
 * ON MOCKING: MSW handler override, not `global.fetch`.
 */

import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { rest } from "msw";

import { server } from "@/__tests__/mocks/server";
import ProviderDirectory, {
  type MarketplaceProvider,
} from "../ProviderDirectory";

const PROVIDERS = "http://localhost/api/marketplace/providers";

function provider(over: Partial<MarketplaceProvider> = {}): MarketplaceProvider {
  return {
    id: "p-1",
    name: "Consumer Rights Partners",
    description: "Consumer-law firm handling FCRA and FDCPA matters.",
    website: "https://example.test",
    rating: 4.5,
    reviewCount: 32,
    bbbRating: "A+",
    yearsInBusiness: 12,
    verified: true,
    category: "legal",
    ...over,
  };
}

function serve(data: unknown[] = [provider()]) {
  server.use(
    rest.get(PROVIDERS, (_req, res, ctx) =>
      res(ctx.json({ success: true, data })),
    ),
  );
}

function renderDirectory(extra: Record<string, unknown> = {}) {
  return render(
    <ProviderDirectory
      category="legal"
      title="Credit Attorneys"
      subtitle="Consumer-law firms listed in the marketplace"
      emptyTitle="No law firms are listed yet"
      emptyBody="When a consumer-law firm joins the marketplace it appears here."
      {...extra}
    />,
  );
}

afterEach(cleanup);

describe("ProviderDirectory — the real providers", () => {
  it("renders the firm the route returned", async () => {
    serve();

    renderDirectory();

    expect(
      await screen.findByText("Consumer Rights Partners"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Consumer-law firm handling FCRA and FDCPA matters."),
    ).toBeInTheDocument();
  });

  it("requests the category it was given", async () => {
    let search = "";
    server.use(
      rest.get(PROVIDERS, (req, res, ctx) => {
        search = req.url.search;
        return res(ctx.json({ success: true, data: [provider()] }));
      }),
    );

    renderDirectory({ category: "coaching" });
    await screen.findByText("Consumer Rights Partners");

    expect(search).toContain("category=coaching");
  });

  it("shows rating, BBB and years from the row", async () => {
    serve();

    renderDirectory();

    expect(await screen.findByText("4.5 from 32 reviews")).toBeInTheDocument();
    expect(screen.getByText("A+")).toBeInTheDocument();
    expect(screen.getByText("12 years")).toBeInTheDocument();
  });

  it("says there are no ratings rather than printing 0.0", async () => {
    serve([provider({ rating: 0, reviewCount: 0 })]);

    renderDirectory();

    expect(await screen.findByText("No ratings yet")).toBeInTheDocument();
    expect(screen.queryByText("0.0 from 0 reviews")).not.toBeInTheDocument();
  });

  it("omits BBB and years when the row does not carry them", async () => {
    serve([provider({ bbbRating: null, yearsInBusiness: null })]);

    renderDirectory();

    await screen.findByText("Consumer Rights Partners");
    expect(screen.queryByText("BBB")).not.toBeInTheDocument();
    expect(screen.queryByText("In business")).not.toBeInTheDocument();
  });

  it("links to the provider's own site when there is one", async () => {
    serve();

    renderDirectory();

    const link = await screen.findByRole("link", { name: "Visit their site" });
    expect(link).toHaveAttribute("href", "https://example.test");
    expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"));
  });

  it("shows no link when the row has no website", async () => {
    serve([provider({ website: null })]);

    renderDirectory();

    await screen.findByText("Consumer Rights Partners");
    expect(
      screen.queryByRole("link", { name: "Visit their site" }),
    ).not.toBeInTheDocument();
  });
});

describe("ProviderDirectory — verified is the real standing", () => {
  it("marks a verified provider", async () => {
    serve();

    renderDirectory();

    expect(await screen.findByText("Verified")).toBeInTheDocument();
  });

  it("does not mark an unverified one", async () => {
    serve([provider({ verified: false })]);

    renderDirectory();

    await screen.findByText("Consumer Rights Partners");
    expect(screen.queryByText("Verified")).not.toBeInTheDocument();
  });

  it("filters to verified only", async () => {
    serve([
      provider({ id: "a", name: "Checked Firm", verified: true }),
      provider({ id: "b", name: "Unchecked Firm", verified: false }),
    ]);

    renderDirectory();
    await screen.findByText("Unchecked Firm");

    await userEvent.click(screen.getByRole("checkbox"));

    expect(screen.getByText("Checked Firm")).toBeInTheDocument();
    expect(screen.queryByText("Unchecked Firm")).not.toBeInTheDocument();
  });

  it("distinguishes an empty directory from an empty verified filter", async () => {
    serve([provider({ verified: false })]);

    renderDirectory();
    await screen.findByText("Consumer Rights Partners");

    await userEvent.click(screen.getByRole("checkbox"));

    expect(screen.getByText("None are verified yet")).toBeInTheDocument();
    expect(
      screen.queryByText("No law firms are listed yet"),
    ).not.toBeInTheDocument();
  });
});

describe("ProviderDirectory — nothing invented survives", () => {
  it("names none of the invented attorneys", async () => {
    serve();

    renderDirectory();
    await screen.findByText("Consumer Rights Partners");

    for (const name of [
      "Sarah Mitchell",
      "James Rodriguez",
      "Mitchell Consumer Law",
    ]) {
      expect(screen.queryByText(name)).not.toBeInTheDocument();
    }
  });

  it("shows no consultation fee or specialty, columns that do not exist", async () => {
    serve();

    renderDirectory();
    await screen.findByText("Consumer Rights Partners");

    expect(screen.queryByText(/Free consultation/i)).not.toBeInTheDocument();
    expect(screen.queryByText("FCRA Violations")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("option", { name: /All Specialties/i }),
    ).not.toBeInTheDocument();
  });
});

describe("ProviderDirectory — empty, failed and editorial", () => {
  it("says nobody is listed rather than inventing someone", async () => {
    serve([]);

    renderDirectory();

    expect(
      await screen.findByText("No law firms are listed yet"),
    ).toBeInTheDocument();
  });

  it("says the directory is unavailable when the route fails", async () => {
    server.use(rest.get(PROVIDERS, (_req, res, ctx) => res(ctx.status(500))));

    renderDirectory();

    expect(
      await screen.findByText(/This directory is unavailable/i),
    ).toBeInTheDocument();
  });

  it("says the service is unreachable when the network drops", async () => {
    server.use(rest.get(PROVIDERS, (_req, res) => res.networkError("offline")));

    renderDirectory();

    await waitFor(() =>
      expect(
        screen.getByText(/could not reach the marketplace service/i),
      ).toBeInTheDocument(),
    );
  });

  it("keeps the editorial note even when nobody is listed", async () => {
    serve([]);

    renderDirectory({ note: <p>When to consult an attorney</p> });

    expect(
      await screen.findByText("When to consult an attorney"),
    ).toBeInTheDocument();
  });
});
