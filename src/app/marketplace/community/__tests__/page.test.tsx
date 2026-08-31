/**
 * Community — real-challenge wiring regression coverage.
 *
 * The page had no fetch. `mockStories` published three credit-score
 * testimonials from members who do not exist — 520→720, 580→750, 490→680 —
 * on a page belonging to a credit-education company. That is the most
 * consequential fabrication in this sweep: it misrepresents what the product
 * achieves to a prospective customer.
 *
 * The tests that matter most are therefore the negative ones. No score pair,
 * no invented author, no engagement count may appear — and the source itself
 * must not carry them, because a testimonial that survives only in a constant
 * is one render away from being published again.
 *
 * ON MOCKING: MSW handler override, not `global.fetch`.
 */

import fs from "fs";
import path from "path";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { rest } from "msw";

import { server } from "@/__tests__/mocks/server";
import CommunityPage from "../page";

const CHALLENGES = "http://localhost/api/gamification/challenges";
const JOIN = "http://localhost/api/gamification/challenges/:id/join";

function challenge(over: Record<string, unknown> = {}) {
  return {
    id: "c-1",
    name: "No-spend November",
    description: "Skip discretionary spending for 30 days.",
    type: "no_spend",
    status: "active",
    startDate: "2026-08-01T00:00:00.000Z",
    endDate: "2026-08-31T00:00:00.000Z",
    goalValue: 30,
    goalUnit: "days",
    participants: 12,
    xpReward: 500,
    userJoined: false,
    ...over,
  };
}

function serve(challenges: unknown[] = [challenge()]) {
  server.use(
    rest.get(CHALLENGES, (_req, res, ctx) => res(ctx.json({ challenges }))),
  );
}

afterEach(cleanup);

describe("Community — the real challenges", () => {
  it("renders a live challenge with its goal and participants", async () => {
    serve();

    render(<CommunityPage />);

    expect(await screen.findByText("No-spend November")).toBeInTheDocument();
    expect(screen.getByText("30 days")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("500")).toBeInTheDocument();
  });

  it("labels the challenge type readably", async () => {
    serve();

    render(<CommunityPage />);

    expect(await screen.findByText("No-spend")).toBeInTheDocument();
  });

  it("requests active challenges", async () => {
    let search = "";
    server.use(
      rest.get(CHALLENGES, (req, res, ctx) => {
        search = req.url.search;
        return res(ctx.json({ challenges: [challenge()] }));
      }),
    );

    render(<CommunityPage />);
    await screen.findByText("No-spend November");

    expect(search).toContain("status=active");
  });

  it("omits a field the challenge does not carry rather than printing a blank", async () => {
    serve([
      challenge({ goalValue: null, goalUnit: null, xpReward: 0, endDate: null }),
    ]);

    render(<CommunityPage />);

    await screen.findByText("No-spend November");
    expect(screen.queryByText("Goal")).not.toBeInTheDocument();
    expect(screen.queryByText("XP")).not.toBeInTheDocument();
    expect(screen.queryByText("Ends")).not.toBeInTheDocument();
  });

  it("says the reader has joined, with their own progress", async () => {
    serve([challenge({ userJoined: true, userProgress: 7 })]);

    render(<CommunityPage />);

    expect(await screen.findByText(/You have joined/)).toBeInTheDocument();
    expect(screen.getByText(/7 so far/)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Join challenge/ }),
    ).not.toBeInTheDocument();
  });
});

describe("Community — joining actually joins", () => {
  it("posts to the join route and reloads", async () => {
    let joinedPath = "";
    let joinedMethod = "";
    let reads = 0;
    server.use(
      rest.get(CHALLENGES, (_req, res, ctx) => {
        reads += 1;
        return res(
          ctx.json({ challenges: [challenge({ userJoined: reads > 1 })] }),
        );
      }),
      rest.post(JOIN, (req, res, ctx) => {
        joinedPath = req.url.pathname;
        joinedMethod = req.method;
        return res(ctx.status(201), ctx.json({ participant: { id: "p-1" } }));
      }),
    );

    render(<CommunityPage />);
    await userEvent.click(
      await screen.findByRole("button", { name: "Join challenge" }),
    );

    await waitFor(() => expect(joinedPath).toContain("/c-1/join"));
    expect(joinedMethod).toBe("POST");
    expect(await screen.findByText(/You have joined/)).toBeInTheDocument();
  });

  it("shows the route's own reason when joining is refused", async () => {
    serve();
    server.use(
      rest.post(JOIN, (_req, res, ctx) =>
        res(
          ctx.status(409),
          ctx.json({ error: "You have already joined this challenge" }),
        ),
      ),
    );

    render(<CommunityPage />);
    await userEvent.click(
      await screen.findByRole("button", { name: "Join challenge" }),
    );

    expect(
      await screen.findByText("You have already joined this challenge"),
    ).toBeInTheDocument();
  });

  it("reports a network failure rather than showing the member as joined", async () => {
    serve();
    server.use(rest.post(JOIN, (_req, res) => res.networkError("offline")));

    render(<CommunityPage />);
    await userEvent.click(
      await screen.findByRole("button", { name: "Join challenge" }),
    );

    expect(
      await screen.findByText(/could not reach the community service/i),
    ).toBeInTheDocument();
    expect(screen.queryByText(/You have joined/)).not.toBeInTheDocument();
  });
});

describe("Community — the invented members are gone", () => {
  it("publishes no score testimonial", async () => {
    serve();

    render(<CommunityPage />);
    await screen.findByText("No-spend November");

    for (const score of ["520", "720", "580", "750", "490", "680"]) {
      expect(screen.queryByText(score)).not.toBeInTheDocument();
    }
  });

  it("names none of the invented members", async () => {
    serve();

    render(<CommunityPage />);
    await screen.findByText("No-spend November");

    for (const author of [
      "CreditWarrior",
      "DebtFreeJourney",
      "NewBeginnings",
      "NewToCredit",
    ]) {
      expect(screen.queryByText(author)).not.toBeInTheDocument();
    }
  });

  it("shows no forum thread and no engagement count", async () => {
    serve();

    render(<CommunityPage />);
    await screen.findByText("No-spend November");

    expect(
      screen.queryByText(/How I removed 5 collections/),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("245")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /New Post/i }),
    ).not.toBeInTheDocument();
  });

  it("says plainly that there is no board and no member stories", async () => {
    serve();

    render(<CommunityPage />);

    expect(
      await screen.findByText(/no discussion board yet/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/we will not write them/i)).toBeInTheDocument();
  });
});

describe("Community — empty and failed states", () => {
  it("says nothing is running rather than inventing a challenge", async () => {
    serve([]);

    render(<CommunityPage />);

    expect(
      await screen.findByText("No challenges are running right now"),
    ).toBeInTheDocument();
  });

  it("says challenges are unavailable when the route fails", async () => {
    server.use(rest.get(CHALLENGES, (_req, res, ctx) => res(ctx.status(500))));

    render(<CommunityPage />);

    expect(
      await screen.findByText(/Challenges are unavailable/i),
    ).toBeInTheDocument();
  });

  it("says the service is unreachable when the network drops", async () => {
    server.use(rest.get(CHALLENGES, (_req, res) => res.networkError("offline")));

    render(<CommunityPage />);

    expect(
      await screen.findByText(/could not reach the community service/i),
    ).toBeInTheDocument();
  });
});

describe("Community — the constants are gone from the source", () => {
  const raw = fs.readFileSync(
    path.join(process.cwd(), "src/app/marketplace/community/page.tsx"),
    "utf8",
  );
  const source = raw
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

  it.each(["mockPosts", "mockStories"])("no longer declares %s", (name) => {
    expect(source).not.toContain(name);
  });

  it("carries no scoreBefore/scoreAfter testimonial shape at all", () => {
    // A testimonial surviving in a constant is one render from republication.
    expect(source).not.toContain("scoreBefore");
    expect(source).not.toContain("scoreAfter");
    expect(source).not.toContain("SuccessStory");
  });

  it("reads the live challenges route", () => {
    expect(source).toContain("/api/gamification/challenges");
  });
});
