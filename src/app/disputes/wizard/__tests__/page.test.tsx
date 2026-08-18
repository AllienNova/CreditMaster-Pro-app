/**
 * Dispute Wizard — real-item wiring regression coverage.
 *
 * The wizard was pre-populated with items supposedly on the reader's credit
 * report, held in a useState initialiser with no request in the file:
 *
 *   "Capital One - Late payment March 2023"
 *   "ABC Collections - Medical debt $450"
 *   "XYZ Lender - Unauthorized inquiry Oct 2024"
 *   "Chase - Incorrect balance reported"
 *
 * A reader could tick those and file. Filing a dispute over an entry that is
 * not on your report is a real action with real consequences, which makes this
 * the highest-harm item the useState detector surfaced (da4323a).
 *
 * The distinction the last group tests — an empty list is NOT the same fact as
 * a failed load — matters more here than on a read-only screen: "nothing to
 * dispute" is itself advice.
 *
 * ON MOCKING: MSW handler override, not `global.fetch`.
 */

import fs from "fs";
import path from "path";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
// Static, not a dynamic import inside the helper: importing user-event at
// TEST time registers its own afterEach, and jest rejects a hook defined
// inside a running test ("Hooks cannot be defined inside tests").
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { rest } from "msw";

import { server } from "@/__tests__/mocks/server";
import DisputeWizardPage from "../page";

const ITEMS = "http://localhost/api/credit-repair/disputable-items";

function item(over: Record<string, unknown> = {}) {
  return {
    id: "i-1",
    accountName: "Northgate Bank",
    status: "charge_off",
    balance: 940,
    type: "account",
    ...over,
  };
}

function serve(items: unknown[]) {
  server.use(rest.get(ITEMS, (_req, res, ctx) => res(ctx.json({ items }))));
}

/**
 * The wizard opens on bureau selection, and there are TWO steps before items:
 * select-bureau -> select-type -> select-items (page.tsx:121). Each choice
 * calls nextStep() itself; there is no separate Next control.
 */
async function goToItems() {
  await userEvent.click(await screen.findByText("Experian"));
  await userEvent.click(await screen.findByText("Not My Account"));
  await screen.findByText("Select Items to Dispute");
}

afterEach(cleanup);

describe("Dispute wizard — the items are the reader's own", () => {
  it("requests the disputable-items route", async () => {
    let called = false;
    server.use(
      rest.get(ITEMS, (_req, res, ctx) => {
        called = true;
        return res(ctx.json({ items: [item()] }));
      }),
    );

    render(<DisputeWizardPage />);

    await waitFor(() => expect(called).toBe(true));
  });

  it("lists none of the invented entries", async () => {
    serve([item()]);

    render(<DisputeWizardPage />);
    await goToItems();

    for (const invented of [
      /Capital One - Late payment March 2023/,
      /ABC Collections/,
      /XYZ Lender/,
      /Chase - Incorrect balance reported/,
    ]) {
      expect(screen.queryByText(invented)).not.toBeInTheDocument();
    }
  });

  it("describes a real item from the fields the route returns", async () => {
    serve([item()]);

    render(<DisputeWizardPage />);
    await goToItems();

    expect(
      await screen.findByText(/Northgate Bank — charge_off — \$940/),
    ).toBeInTheDocument();
  });

  it("omits a balance the route reported as null, rather than printing $0", async () => {
    serve([
      item({ id: "i-2", accountName: "Some Lender", status: "hard", balance: null, type: "inquiry" }),
    ]);

    render(<DisputeWizardPage />);
    await goToItems();

    expect(await screen.findByText("Some Lender — hard")).toBeInTheDocument();
    expect(screen.queryByText(/\$0/)).not.toBeInTheDocument();
  });
});

describe("Dispute wizard — empty is not the same as unreadable", () => {
  it("says nothing is disputable when the route returned none", async () => {
    serve([]);

    render(<DisputeWizardPage />);
    await goToItems();

    expect(
      await screen.findByText("Nothing on your report is disputable right now"),
    ).toBeInTheDocument();
  });

  it("says the items could not be loaded when the route fails", async () => {
    server.use(rest.get(ITEMS, (_req, res, ctx) => res(ctx.status(503))));

    render(<DisputeWizardPage />);
    await goToItems();

    expect(
      await screen.findByText("Your report items could not be loaded"),
    ).toBeInTheDocument();
    // Must NOT claim there is nothing to dispute — that is advice.
    expect(
      screen.queryByText("Nothing on your report is disputable right now"),
    ).not.toBeInTheDocument();
  });

  it("says the service is unreachable when the network drops", async () => {
    server.use(rest.get(ITEMS, (_req, res) => res.networkError("offline")));

    render(<DisputeWizardPage />);
    await goToItems();

    expect(
      await screen.findByText(/could not reach the credit-report service/i),
    ).toBeInTheDocument();
  });
});

describe("Dispute wizard — the source is clean", () => {
  const raw = fs.readFileSync(
    path.join(process.cwd(), "src/app/disputes/wizard/page.tsx"),
    "utf8",
  );
  const source = raw
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

  it("seeds no items into state", () => {
    expect(source).toContain("useState<DisputeItem[]>([])");
  });

  it("names none of the invented creditors", () => {
    for (const name of ["Capital One", "ABC Collections", "XYZ Lender"]) {
      expect(source).not.toContain(name);
    }
  });

  it("reads the live disputable-items route", () => {
    expect(source).toContain("/api/credit-repair/disputable-items");
  });
});
