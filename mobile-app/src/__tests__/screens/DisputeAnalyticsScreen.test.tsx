/**
 * summarizeDisputes, and analytics/disputes — real-data wiring.
 *
 * The screen showed three fixtures with no request: 24 disputes of which 18
 * successful, "Late Payments 8, 87% success", and six months of bars. Every
 * user saw the same imagined history — including users who had never filed a
 * dispute, who were shown a 75% success rate they had no part in.
 *
 * Two claims worth holding, both about refusing to state a rate over nothing:
 *
 *  1. A type with no DECIDED dispute has a null rate, not 0. Zero reads as
 *     "we tried and failed"; the truth is "still open".
 *  2. A resolved dispute is only a WIN if its outcome says so. A dispute can
 *     be resolved with the item VERIFIED, which is a loss — counting status
 *     alone would overcount successes.
 */

import React from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
} from "@testing-library/react-native";
import { summarizeDisputes } from "../../services/api/disputes";
import type { Dispute } from "../../services/api/types";

const mockGetAll = jest.fn();

jest.mock("../../services/api/disputes", () => {
  const actual = jest.requireActual("../../services/api/disputes");
  return {
    ...actual,
    disputeApi: { getAll: (...a: unknown[]) => mockGetAll(...a) },
  };
});

// expo-router is mocked globally in jest.setup.js.

import DisputeAnalyticsScreen from "../../../app/analytics/disputes";

function dispute(over: Partial<Dispute> = {}): Dispute {
  return {
    id: "d1",
    userId: "u1",
    bureau: "experian",
    status: "resolved",
    itemType: "Late Payment",
    creditorName: "Chase",
    disputeReason: "not mine",
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-10T00:00:00.000Z",
    resolvedAt: "2026-07-10T00:00:00.000Z",
    outcome: "removed",
    ...over,
  };
}

function ok(items: Dispute[]) {
  return { success: true, data: { items, total: items.length } };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetAll.mockResolvedValue(ok([dispute()]));
});

describe("summarizeDisputes", () => {
  it("returns zeroes and empty lists for no disputes", () => {
    expect(summarizeDisputes([])).toEqual({
      stats: { total: 0, successful: 0, pending: 0, rejected: 0 },
      byType: [],
      monthly: [],
    });
  });

  describe("what counts as a success", () => {
    it.each(["removed", "updated"] as const)(
      "counts a resolved dispute with outcome %s",
      (outcome) => {
        expect(
          summarizeDisputes([dispute({ outcome })]).stats.successful,
        ).toBe(1);
      },
    );

    it("does NOT count a resolved dispute the bureau verified", () => {
      // Resolved-and-verified means the item stayed. Counting status alone
      // would call that a win.
      expect(
        summarizeDisputes([dispute({ outcome: "verified" })]).stats.successful,
      ).toBe(0);
    });

    it("counts a resolved dispute with no outcome recorded", () => {
      // The status is the only signal available; "resolved" is what it means.
      expect(
        summarizeDisputes([dispute({ outcome: undefined })]).stats.successful,
      ).toBe(1);
    });

    it("does not count an unresolved dispute however it is outcome-tagged", () => {
      expect(
        summarizeDisputes([dispute({ status: "sent", outcome: "removed" })])
          .stats.successful,
      ).toBe(0);
    });
  });

  it("counts every open status as pending", () => {
    const open = summarizeDisputes([
      dispute({ id: "a", status: "draft" }),
      dispute({ id: "b", status: "sent" }),
      dispute({ id: "c", status: "under_review" }),
      dispute({ id: "d", status: "rejected" }),
    ]);
    expect(open.stats.pending).toBe(3);
    expect(open.stats.rejected).toBe(1);
  });

  describe("success rate by type", () => {
    it("is null when nothing of that type has been decided", () => {
      // 0% would read as "we tried and failed".
      const [row] = summarizeDisputes([
        dispute({ status: "sent", resolvedAt: undefined }),
      ]).byType;
      expect(row.successRate).toBeNull();
      expect(row.count).toBe(1);
      expect(row.resolved).toBe(0);
    });

    it("is over DECIDED disputes, not over all of them", () => {
      // One won, one rejected, one still open -> 50%, not 33%.
      const [row] = summarizeDisputes([
        dispute({ id: "a", outcome: "removed" }),
        dispute({ id: "b", status: "rejected", outcome: undefined }),
        dispute({ id: "c", status: "sent", resolvedAt: undefined }),
      ]).byType;
      expect(row.successRate).toBe(50);
      expect(row.resolved).toBe(2);
      expect(row.count).toBe(3);
    });

    it("groups an untyped dispute rather than dropping it", () => {
      // Dropping it would make the type counts fail to sum to the total.
      const result = summarizeDisputes([dispute({ itemType: "" })]);
      expect(result.byType).toHaveLength(1);
      expect(result.byType[0].type).toBe("Uncategorised");
      expect(result.byType[0].count).toBe(result.stats.total);
    });

    it("orders by how many of each type there are", () => {
      const result = summarizeDisputes([
        dispute({ id: "a", itemType: "Collection" }),
        dispute({ id: "b", itemType: "Late Payment" }),
        dispute({ id: "c", itemType: "Late Payment" }),
      ]);
      expect(result.byType.map((r) => r.type)).toEqual([
        "Late Payment",
        "Collection",
      ]);
    });
  });

  describe("monthly activity", () => {
    it("uses the months that contain activity, not a fixed window", () => {
      // The fixture hardcoded Jul..Dec, so a user who filed one dispute in
      // March still saw six months of bars.
      const result = summarizeDisputes([
        dispute({
          id: "a",
          createdAt: "2026-03-02T00:00:00.000Z",
          resolvedAt: undefined,
          status: "sent",
        }),
      ]);
      expect(result.monthly).toEqual([{ month: "Mar 2026", filed: 1, resolved: 0 }]);
    });

    it("buckets by UTC, not by the device's timezone", () => {
      // toLocaleDateString defaults to the device zone. A dispute created at
      // 2026-06-01T00:00:00Z bucketed locally reads as "May 2026" for every
      // user west of UTC — the whole of the Americas — so the same dispute
      // would appear in different months depending on where the phone is.
      const result = summarizeDisputes([
        dispute({
          createdAt: "2026-06-01T00:00:00.000Z",
          resolvedAt: undefined,
          status: "sent",
        }),
      ]);
      expect(result.monthly[0].month).toBe("Jun 2026");
    });

    it("counts a dispute in BOTH the month filed and the month resolved", () => {
      const result = summarizeDisputes([
        dispute({
          createdAt: "2026-06-01T00:00:00.000Z",
          resolvedAt: "2026-08-01T00:00:00.000Z",
        }),
      ]);
      expect(result.monthly).toEqual([
        { month: "Jun 2026", filed: 1, resolved: 0 },
        { month: "Aug 2026", filed: 0, resolved: 1 },
      ]);
    });

    it("ignores an unparseable date instead of bucketing it wrongly", () => {
      const result = summarizeDisputes([
        dispute({ createdAt: "not-a-date", resolvedAt: undefined, status: "sent" }),
      ]);
      expect(result.monthly).toEqual([]);
      // Still counted in the totals — it is a real dispute.
      expect(result.stats.total).toBe(1);
    });
  });
});

describe("analytics/disputes", () => {
  it("fetches on mount instead of rendering fixtures", async () => {
    render(<DisputeAnalyticsScreen />);
    await waitFor(() => expect(mockGetAll).toHaveBeenCalled());
  });

  it("never shows the invented history again", async () => {
    render(<DisputeAnalyticsScreen />);
    await waitFor(() => expect(mockGetAll).toHaveBeenCalled());
    expect(screen.queryByText("24")).toBeNull();
    expect(screen.queryByText("Late Payments")).toBeNull();
  });

  it("shows a dash, not 0% or NaN, for a user who has filed nothing", async () => {
    // The old expression divided by a fixture that was always 24, so the NaN
    // a real new user produces was never reachable.
    mockGetAll.mockResolvedValue(ok([]));
    render(<DisputeAnalyticsScreen />);

    expect(await screen.findByText("—")).toBeTruthy();
    expect(screen.queryByText("NaN%")).toBeNull();
    expect(
      screen.getByText(/have not filed any disputes yet/i),
    ).toBeTruthy();
  });

  it("shows the real counts", async () => {
    mockGetAll.mockResolvedValue(
      ok([
        dispute({ id: "a", outcome: "removed" }),
        dispute({ id: "b", status: "sent", resolvedAt: undefined }),
      ]),
    );
    render(<DisputeAnalyticsScreen />);
    expect(await screen.findByText("50%")).toBeTruthy();
  });

  it("shows how many of a type were DECIDED beside the count", async () => {
    // So a 100% over one decided dispute does not read as a track record.
    mockGetAll.mockResolvedValue(ok([dispute()]));
    render(<DisputeAnalyticsScreen />);
    expect(await screen.findByText(/1 dispute · 1 decided/)).toBeTruthy();
  });

  it("distinguishes a failed read from having no disputes, and retries", async () => {
    mockGetAll.mockResolvedValue({ success: false, error: { message: "boom" } });
    render(<DisputeAnalyticsScreen />);

    expect(
      await screen.findByText(/could not load your dispute history/i),
    ).toBeTruthy();
    expect(screen.queryByText(/have not filed any disputes yet/i)).toBeNull();

    mockGetAll.mockResolvedValue(ok([dispute()]));
    fireEvent.press(screen.getByText("Try again"));
    await waitFor(() => expect(mockGetAll).toHaveBeenCalledTimes(2));
  });
});
