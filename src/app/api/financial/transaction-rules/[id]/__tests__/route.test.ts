/**
 * @jest-environment node
 */

/**
 * PATCH/DELETE /api/financial/transaction-rules/{id}.
 *
 * Without these the mobile screen's toggle and delete were local-only: a rule
 * flipped off looked disabled and was still active on the next load.
 */

import { NextRequest } from "next/server";

const mockUpdateRule = jest.fn();
const mockDeleteRule = jest.fn();
jest.mock("@/lib/financial/transaction-rules-service", () => ({
  transactionRulesService: {
    updateRule: (...a: unknown[]) => mockUpdateRule(...a),
    deleteRule: (...a: unknown[]) => mockDeleteRule(...a),
  },
}));

const AUTHED_USER = { id: "user-1", email: "a@b.c", role: "user" };
jest.mock("@/lib/auth/api-guard", () => ({
  withAuth:
    (handler: (req: unknown, user: unknown) => unknown) => (req: unknown) =>
      handler(req, AUTHED_USER),
}));

import { PATCH, DELETE } from "../route";

// A real NextRequest does not carry a body through this jest environment —
// see src/app/api/credit/analyze/__tests__/route.test.ts:32.
const req = (id: string, body?: unknown, throws = false) =>
  ({
    url: `http://localhost/api/financial/transaction-rules/${id}`,
    nextUrl: { pathname: `/api/financial/transaction-rules/${id}` },
    method: body === undefined ? "DELETE" : "PATCH",
    json: throws
      ? jest.fn().mockRejectedValue(new SyntaxError("bad"))
      : jest.fn().mockResolvedValue(body),
    headers: new Headers(),
  }) as unknown as NextRequest;

beforeEach(() => jest.clearAllMocks());

describe("PATCH /api/financial/transaction-rules/{id}", () => {
  it("updates the rule for the authenticated caller", async () => {
    mockUpdateRule.mockResolvedValue({ id: "r1", isActive: false });

    const res = await PATCH(req("r1", { isActive: false }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.rule.isActive).toBe(false);
    // userId FIRST, from the guard — a caller cannot reach another user's rule
    // by guessing an id.
    expect(mockUpdateRule).toHaveBeenCalledWith("user-1", "r1", {
      isActive: false,
    });
  });

  it("rejects an empty update instead of reporting a no-op as success", async () => {
    // Every field is optional, so {} parses. Without the refine it would write
    // nothing and answer 200.
    const res = await PATCH(req("r1", {}));
    expect(res.status).toBe(400);
    expect(mockUpdateRule).not.toHaveBeenCalled();
  });

  it("rejects an action the engine cannot execute", async () => {
    const res = await PATCH(
      req("r1", { actions: [{ type: "mark_reviewed", value: true }] }),
    );
    expect(res.status).toBe(400);
    expect(mockUpdateRule).not.toHaveBeenCalled();
  });

  it("rejects an unparseable body", async () => {
    const res = await PATCH(req("r1", {}, true));
    expect(res.status).toBe(400);
  });

  it("reports a failed write", async () => {
    mockUpdateRule.mockRejectedValue(new Error("boom"));
    const res = await PATCH(req("r1", { isActive: false }));
    expect(res.status).toBe(500);
  });
});

describe("DELETE /api/financial/transaction-rules/{id}", () => {
  it("deletes the rule for the authenticated caller", async () => {
    mockDeleteRule.mockResolvedValue(undefined);

    const res = await DELETE(req("r1"));

    expect(res.status).toBe(200);
    expect(mockDeleteRule).toHaveBeenCalledWith("user-1", "r1");
  });

  it("reports a failed delete rather than answering success", async () => {
    // The screen removes the row on success. Answering 200 over a failed
    // delete makes it vanish from the list and come back on reload.
    mockDeleteRule.mockRejectedValue(new Error("boom"));
    const res = await DELETE(req("r1"));
    expect(res.status).toBe(500);
  });
});
