/**
 * POST /api/financial/goals/[id]/contribute
 *
 * The route did not exist, so "add contribution" did nothing.
 *
 * The test that matters most is the ADDITION one. goalPlanner.updateGoalProgress
 * treats its third argument as an ABSOLUTE total (goal-planner.ts:192 computes
 * progress = newAmount / targetAmount), while the client sends a DELTA. Passing
 * the delta straight through would set a goal with $800 saved to $50 when the
 * user contributed $50 — erasing their progress and reporting success. If that
 * regresses, "adds the contribution to the existing total" fails.
 */

import { NextRequest } from "next/server";

const mockValidateFromHeaders = jest.fn();
const mockResolveRoleFromDb = jest.fn();
const mockMaybeSingle = jest.fn();
const mockEq = jest.fn();
const mockUpdateGoalProgress = jest.fn();

jest.mock("@/lib/auth/jwt-validation", () => ({
  jwtValidation: {
    validateFromHeaders: (...args: unknown[]) => mockValidateFromHeaders(...args),
  },
}));
jest.mock("@/lib/auth/resolve-role", () => ({
  resolveRoleFromDb: (...args: unknown[]) => mockResolveRoleFromDb(...args),
}));
jest.mock("@/lib/supabase/service-role", () => ({
  getServiceRoleClient: () => ({
    from: () => ({
      select: () => ({
        eq: (...a: unknown[]) => {
          mockEq(...a);
          return {
            eq: (...b: unknown[]) => {
              mockEq(...b);
              return { maybeSingle: () => mockMaybeSingle() };
            },
          };
        },
      }),
    }),
  }),
}));
jest.mock("@/lib/financial/goal-tracker", () => ({
  goalTracker: {
    updateGoalProgress: (...args: unknown[]) => mockUpdateGoalProgress(...args),
  },
}));

import { POST } from "../route";

const OWNER = "user-1";
const GOAL = "goal-123";

function req(body: unknown): NextRequest {
  const url = `http://localhost:3000/api/financial/goals/${GOAL}/contribute`;
  return {
    url,
    method: "POST",
    json: jest.fn().mockResolvedValue(body),
    headers: new Headers(),
    nextUrl: new URL(url),
  } as unknown as NextRequest;
}

describe("POST /api/financial/goals/[id]/contribute", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockValidateFromHeaders.mockResolvedValue({
      valid: true,
      user: { id: OWNER, email: "user@example.com" },
    });
    mockResolveRoleFromDb.mockResolvedValue("premium");
    mockMaybeSingle.mockResolvedValue({
      data: { current_amount: 800 },
      error: null,
    });
    mockUpdateGoalProgress.mockResolvedValue({ id: GOAL, currentAmount: 850 });
  });

  it("returns 401 when not authenticated", async () => {
    mockValidateFromHeaders.mockResolvedValue({ valid: false, user: null });
    expect((await POST(req({ amount: 50 }))).status).toBe(401);
  });

  describe("validation", () => {
    it.each<[unknown, string]>([
      [{}, "no amount"],
      [{ amount: 0 }, "zero"],
      [{ amount: -50 }, "negative"],
      [{ amount: "50" }, "string"],
      [{ amount: 10_000_001 }, "absurdly large"],
    ])("rejects %j — %s", async (body, _why) => {
      expect((await POST(req(body))).status).toBe(400);
      expect(mockUpdateGoalProgress).not.toHaveBeenCalled();
    });
  });

  it("scopes the goal read to the AUTHENTICATED user", async () => {
    await POST(req({ amount: 50 }));
    expect(mockEq).toHaveBeenCalledWith("user_id", OWNER);
    expect(mockEq).toHaveBeenCalledWith("id", GOAL);
  });

  it("returns 404 for a goal that is not the caller's", async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    expect((await POST(req({ amount: 50 }))).status).toBe(404);
    expect(mockUpdateGoalProgress).not.toHaveBeenCalled();
  });

  describe("the arithmetic", () => {
    it("ADDS the contribution to the existing total, never replaces it", async () => {
      // $800 saved + a $50 contribution = $850. Forwarding the delta would
      // call updateGoalProgress with 50 and wipe $800 of the user's progress.
      await POST(req({ amount: 50 }));
      expect(mockUpdateGoalProgress).toHaveBeenCalledWith(OWNER, GOAL, 850);
    });

    it("treats a goal with no progress yet as zero", async () => {
      mockMaybeSingle.mockResolvedValue({ data: { current_amount: null }, error: null });
      await POST(req({ amount: 50 }));
      expect(mockUpdateGoalProgress).toHaveBeenCalledWith(OWNER, GOAL, 50);
    });

    it("handles a numeric column arriving as a Postgres string", async () => {
      mockMaybeSingle.mockResolvedValue({ data: { current_amount: "800.50" }, error: null });
      await POST(req({ amount: 50 }));
      expect(mockUpdateGoalProgress).toHaveBeenCalledWith(OWNER, GOAL, 850.5);
    });

    it("reports the before and after so the caller can see it was added", async () => {
      const body = await (await POST(req({ amount: 50 }))).json();
      expect(body.contribution).toEqual({
        amount: 50,
        previousAmount: 800,
        newAmount: 850,
      });
    });
  });

  describe("failures", () => {
    it("returns 500 when the goal read fails", async () => {
      mockMaybeSingle.mockResolvedValue({ data: null, error: { message: "boom" } });
      expect((await POST(req({ amount: 50 }))).status).toBe(500);
    });

    it("returns 500, not success, when the update returns null", async () => {
      mockUpdateGoalProgress.mockResolvedValue(null);
      const res = await POST(req({ amount: 50 }));
      expect(res.status).toBe(500);
      expect((await res.json()).success).toBeUndefined();
    });
  });
});
