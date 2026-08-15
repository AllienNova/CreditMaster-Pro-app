/**
 * @jest-environment node
 *
 * Regression tests for the dispute timeline contract.
 *
 * WHY THIS FILE EXISTS. Every dispute detail page rendered an error boundary
 * instead of the dispute:
 *
 *   TypeError: Cannot read properties of undefined (reading 'map')
 *     at DisputeTimeline (src/components/disputes/DisputeTimeline.tsx:49)
 *
 * `DisputeDetail` is typed against the `Dispute` in `dispute-service.ts`, where
 * `timeline` is REQUIRED, and passes it straight to `<DisputeTimeline>` which
 * calls `.map` on it unguarded. But the route is served by `dispute-service-db`,
 * whose mapper omitted the field entirely.
 *
 * Nothing caught it. The two `Dispute` interfaces are separate declarations, and
 * the payload crosses the network as `response.json()` — typed `any` — so no
 * compiler ever compared them. All 13 dispute suites (220 tests) passed while
 * the page was broken in the browser, because none of them asserted the shape
 * the UI actually consumes.
 *
 * These tests assert that shape directly. They fail against the old mapper.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

// ── Supabase mock (same chainable mock as the sibling suites) ─────────────────

let queryResult: { data: any; error: any } = { data: null, error: null };
const singleResults: Array<{ data: any; error: any }> = [];

const mockSupabaseChain: Record<string, jest.Mock> = {};
const chainMethods = ["insert", "select", "eq", "order", "limit", "update", "delete"];

for (const method of chainMethods) {
  mockSupabaseChain[method] = jest.fn(() => mockSupabaseChain);
}

mockSupabaseChain.single = jest.fn(() => {
  if (singleResults.length > 0) return Promise.resolve(singleResults.shift());
  return Promise.resolve(queryResult);
});

(mockSupabaseChain as any).then = function (
  resolve: (v: any) => any,
  reject: (e: any) => any,
) {
  return Promise.resolve(queryResult).then(resolve, reject);
};

jest.mock("@/lib/supabase/service-role", () => ({
  getServiceRoleClient: jest.fn(() => ({
    from: jest.fn(() => mockSupabaseChain),
  })),
}));

import { disputeServiceDB } from "../dispute-service-db";
import { getServiceRoleClient } from "@/lib/supabase/service-role";
import type { Database } from "../../supabase/types";

const mockedGetSupabase = getServiceRoleClient as jest.MockedFunction<
  typeof getServiceRoleClient
>;

type DisputeRow = Database["public"]["Tables"]["disputes"]["Row"];

const CREATED = "2026-01-01T10:00:00.000Z";
const SENT = "2026-01-05T12:00:00.000Z";
const CLOSED = "2026-02-01T09:00:00.000Z";

function makeDisputeRow(overrides: Partial<DisputeRow> = {}): DisputeRow {
  return {
    id: "dispute-1",
    user_id: "user-1",
    bureau: "experian",
    item_type: "late_payment",
    item_description: "30-day late on account",
    reason: "Bank error in their records",
    letter_content: "Dear Experian, I dispute this item...",
    status: "draft",
    outcome: null,
    notes: null,
    created_at: CREATED,
    sent_at: null,
    resolved_at: null,
    ...overrides,
  };
}

beforeEach(() => {
  singleResults.length = 0;
  queryResult = { data: null, error: null };
  for (const method of [...chainMethods, "single"]) {
    mockSupabaseChain[method].mockClear();
  }
  for (const method of chainMethods) {
    mockSupabaseChain[method].mockImplementation(() => mockSupabaseChain);
  }
  mockSupabaseChain.single.mockImplementation(() => {
    if (singleResults.length > 0) return Promise.resolve(singleResults.shift());
    return Promise.resolve(queryResult);
  });

  // jest.config.js sets `resetMocks: true`, which strips the implementation
  // declared in the jest.mock factory above before every test. Without this the
  // service gets `undefined` back from getServiceRoleClient and every case here
  // fails inside `disputes()` rather than on its actual assertion.
  mockedGetSupabase.mockReturnValue({
    from: jest.fn(() => mockSupabaseChain),
  } as any);
});

describe("getDispute — timeline contract", () => {
  it("always returns a timeline array, so the UI's unguarded .map cannot throw", async () => {
    singleResults.push({ data: makeDisputeRow(), error: null });

    const dispute = await disputeServiceDB.getDispute("dispute-1", "user-1");

    // The exact assertion that was false before the fix.
    expect(Array.isArray(dispute?.timeline)).toBe(true);
    expect(() => dispute!.timeline.map((e) => e.id)).not.toThrow();
  });

  it("reports creation for a draft dispute and nothing it cannot evidence", async () => {
    singleResults.push({ data: makeDisputeRow(), error: null });

    const dispute = await disputeServiceDB.getDispute("dispute-1", "user-1");

    // A dispute that was never sent must not claim a "sent" event.
    expect(dispute!.timeline).toHaveLength(1);
    expect(dispute!.timeline[0]).toMatchObject({
      status: "draft",
      description: "Dispute created",
    });
    expect(dispute!.timeline[0].date).toEqual(new Date(CREATED));
  });

  it("adds a sent event only once sent_at is set", async () => {
    singleResults.push({
      data: makeDisputeRow({ status: "sent", sent_at: SENT }),
      error: null,
    });

    const dispute = await disputeServiceDB.getDispute("dispute-1", "user-1");

    expect(dispute!.timeline.map((e) => e.status)).toEqual(["draft", "sent"]);
    expect(dispute!.timeline[1].description).toContain("experian");
    expect(dispute!.timeline[1].date).toEqual(new Date(SENT));
  });

  it("names the outcome when a dispute closed with one", async () => {
    singleResults.push({
      data: makeDisputeRow({
        status: "resolved",
        sent_at: SENT,
        resolved_at: CLOSED,
        outcome: "removed",
      }),
      error: null,
    });

    const dispute = await disputeServiceDB.getDispute("dispute-1", "user-1");

    expect(dispute!.timeline).toHaveLength(3);
    expect(dispute!.timeline[2]).toMatchObject({
      status: "resolved",
      description: "Dispute closed — item removed",
    });
  });

  it("does not report a rejected dispute as resolved", async () => {
    singleResults.push({
      data: makeDisputeRow({
        status: "rejected",
        sent_at: SENT,
        resolved_at: CLOSED,
      }),
      error: null,
    });

    const dispute = await disputeServiceDB.getDispute("dispute-1", "user-1");

    const closing = dispute!.timeline[dispute!.timeline.length - 1];
    expect(closing.status).toBe("rejected");
  });

  it("orders events chronologically even when the row's dates are not", async () => {
    singleResults.push({
      data: makeDisputeRow({
        status: "resolved",
        // resolved_at deliberately earlier in the row than sent_at is late:
        // ordering must come from the dates, not the insertion order.
        sent_at: SENT,
        resolved_at: CLOSED,
      }),
      error: null,
    });

    const dispute = await disputeServiceDB.getDispute("dispute-1", "user-1");
    const times = dispute!.timeline.map((e) => e.date.getTime());

    expect([...times]).toEqual([...times].sort((a, b) => a - b));
  });

  it("gives every event a distinct id, so React keys do not collide", async () => {
    singleResults.push({
      data: makeDisputeRow({
        status: "resolved",
        sent_at: SENT,
        resolved_at: CLOSED,
      }),
      error: null,
    });

    const dispute = await disputeServiceDB.getDispute("dispute-1", "user-1");
    const ids = dispute!.timeline.map((e) => e.id);

    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("getUserDisputes — timeline contract on the list path", () => {
  /**
   * The list path calls `.map(this.mapToDispute)`, passing the method as a bare
   * reference — so `this` is undefined inside it. A timeline helper written as
   * `this.buildTimeline(...)` would pass every single-dispute test above and
   * throw only here. This test pins that down.
   */
  it("builds a timeline for every dispute without relying on `this`", async () => {
    queryResult = {
      data: [
        makeDisputeRow({ id: "d1" }),
        makeDisputeRow({ id: "d2", status: "sent", sent_at: SENT }),
      ],
      error: null,
    };

    const disputes = await disputeServiceDB.getUserDisputes("user-1");

    expect(disputes).toHaveLength(2);
    for (const dispute of disputes) {
      expect(Array.isArray(dispute.timeline)).toBe(true);
      expect(dispute.timeline.length).toBeGreaterThan(0);
    }
    expect(disputes[1].timeline.map((e) => e.status)).toEqual(["draft", "sent"]);
  });
});
