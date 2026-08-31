/**
 * POST /api/ai/nudges — ownership.
 *
 * THE DEFECT. The handler was `async (request, _user)` — the authenticated user
 * was destructured and never used — and it passed the caller's nudgeId straight
 * to an engine whose update filtered on `.eq("id", nudgeId)` alone:
 *
 *     await this.supabase.from("nudge_history")
 *       .update({ action_taken: action, action_at: ..., context: { feedback } })
 *       .eq("id", nudgeId);            // no user_id
 *
 * So any authenticated user could stamp action_taken — and arbitrary feedback
 * text into the context jsonb — on ANY other user's nudge_history row, given
 * only its uuid. markNudgeAsOpened had the same shape, which additionally
 * removes a victim's unread nudge from getUnreadNudges.
 *
 * Both engine methods now take the owner's id and filter on it, and this route
 * passes user.id. recordNudgeResponse reports whether a row matched, because a
 * Postgres UPDATE that matches nothing is not an error and answering
 * { success: true } would tell the user their response was saved when it was
 * not — the mobile hook has already removed the nudge from the list by then.
 */

import { NextRequest } from "next/server";

const mockValidateFromHeaders = jest.fn();
const mockResolveRoleFromDb = jest.fn();
const mockRecordNudgeResponse = jest.fn();
const mockMarkNudgeAsOpened = jest.fn();

jest.mock("@/lib/auth/jwt-validation", () => ({
  jwtValidation: {
    validateFromHeaders: (...args: unknown[]) =>
      mockValidateFromHeaders(...args),
  },
}));
jest.mock("@/lib/auth/resolve-role", () => ({
  resolveRoleFromDb: (...args: unknown[]) => mockResolveRoleFromDb(...args),
}));
jest.mock("@/lib/ai-personalization", () => ({
  getNudgeEngine: () => ({
    recordNudgeResponse: (...a: unknown[]) => mockRecordNudgeResponse(...a),
    markNudgeAsOpened: (...a: unknown[]) => mockMarkNudgeAsOpened(...a),
  }),
}));

import { POST } from "../route";

const OWNER = "user-1";
const NUDGE = "nudge-123";

function req(body: unknown): NextRequest {
  const url = "http://localhost:3000/api/ai/nudges";
  return {
    url,
    method: "POST",
    json: jest.fn().mockResolvedValue(body),
    headers: new Headers(),
    nextUrl: new URL(url),
  } as unknown as NextRequest;
}

describe("POST /api/ai/nudges", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockValidateFromHeaders.mockResolvedValue({
      valid: true,
      user: { id: OWNER, email: "user@example.com" },
    });
    mockResolveRoleFromDb.mockResolvedValue("user");
    mockRecordNudgeResponse.mockResolvedValue(true);
    mockMarkNudgeAsOpened.mockResolvedValue(undefined);
  });

  it("returns 401 when not authenticated", async () => {
    mockValidateFromHeaders.mockResolvedValue({ valid: false, user: null });
    expect(
      (await POST(req({ nudgeId: NUDGE, action: "accepted" }))).status,
    ).toBe(401);
  });

  describe("ownership", () => {
    it("passes the AUTHENTICATED user id to the engine", async () => {
      await POST(req({ nudgeId: NUDGE, action: "accepted" }));
      expect(mockRecordNudgeResponse).toHaveBeenCalledWith(
        OWNER,
        NUDGE,
        "accepted",
        undefined,
      );
    });

    it("marks it opened as the same user, never unscoped", async () => {
      await POST(req({ nudgeId: NUDGE, action: "accepted" }));
      expect(mockMarkNudgeAsOpened).toHaveBeenCalledWith(OWNER, NUDGE);
    });

    it("ignores a userId supplied in the body", async () => {
      await POST(
        req({ nudgeId: NUDGE, action: "accepted", userId: "somebody-else" }),
      );
      expect(mockRecordNudgeResponse).toHaveBeenCalledWith(
        OWNER,
        NUDGE,
        "accepted",
        undefined,
      );
    });

    describe("when the nudge is not the caller's", () => {
      beforeEach(() => mockRecordNudgeResponse.mockResolvedValue(false));

      it("returns 404, not 403, so uuids cannot be probed", async () => {
        const res = await POST(req({ nudgeId: NUDGE, action: "accepted" }));
        expect(res.status).toBe(404);
      });

      it("does NOT report success for a response it did not record", async () => {
        const body = await (
          await POST(req({ nudgeId: NUDGE, action: "accepted" }))
        ).json();
        expect(body.success).toBeUndefined();
      });

      it("does not mark someone else's nudge as opened", async () => {
        await POST(req({ nudgeId: NUDGE, action: "accepted" }));
        expect(mockMarkNudgeAsOpened).not.toHaveBeenCalled();
      });
    });
  });

  describe("validation", () => {
    it.each([
      [{}, "nothing"],
      [{ nudgeId: NUDGE }, "no action"],
      [{ action: "accepted" }, "no nudgeId"],
      [{ nudgeId: 42, action: "accepted" }, "a non-string nudgeId"],
      [{ nudgeId: "", action: "accepted" }, "an empty nudgeId"],
    ])("rejects %j — %s", async (body, _why) => {
      expect((await POST(req(body))).status).toBe(400);
      expect(mockRecordNudgeResponse).not.toHaveBeenCalled();
    });

    it.each(["accepted", "dismissed", "snoozed", "ignored"])(
      "accepts the action %s",
      async (action) => {
        expect((await POST(req({ nudgeId: NUDGE, action }))).status).toBe(200);
      },
    );

    it("rejects an action outside the allowed set", async () => {
      const res = await POST(req({ nudgeId: NUDGE, action: "exploded" }));
      expect(res.status).toBe(400);
      expect(mockRecordNudgeResponse).not.toHaveBeenCalled();
    });

    it("rejects feedback that is not a string", async () => {
      const res = await POST(
        req({ nudgeId: NUDGE, action: "accepted", feedback: { a: 1 } }),
      );
      expect(res.status).toBe(400);
    });

    it("rejects feedback too large for a note on a nudge", async () => {
      // It lands in a jsonb column, so it is bounded rather than
      // caller-sized.
      const res = await POST(
        req({
          nudgeId: NUDGE,
          action: "accepted",
          feedback: "x".repeat(1001),
        }),
      );
      expect(res.status).toBe(400);
      expect(mockRecordNudgeResponse).not.toHaveBeenCalled();
    });

    it("passes feedback through when it is present and sane", async () => {
      await POST(
        req({ nudgeId: NUDGE, action: "dismissed", feedback: "Not for me" }),
      );
      expect(mockRecordNudgeResponse).toHaveBeenCalledWith(
        OWNER,
        NUDGE,
        "dismissed",
        "Not for me",
      );
    });

    it("returns 400 for an unparseable body rather than a 500", async () => {
      const bad = req({});
      (bad.json as jest.Mock).mockRejectedValue(new SyntaxError("bad json"));
      expect((await POST(bad)).status).toBe(400);
    });
  });

  it("returns 500 when the write fails, and no success flag", async () => {
    mockRecordNudgeResponse.mockRejectedValue(new Error("connection reset"));
    const res = await POST(req({ nudgeId: NUDGE, action: "accepted" }));
    expect(res.status).toBe(500);
    expect((await res.json()).success).toBeUndefined();
  });
});
