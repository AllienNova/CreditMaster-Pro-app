/**
 * PATCH /api/chat/financial/sessions/[id] — renaming a chat session.
 *
 * This handler did not exist. useUpdateChatSession (use-chat-queries.ts:311)
 * has always sent a PATCH here and Next.js has always answered 405, so a
 * session could never be renamed. Found by the verb check added to
 * audit:web-api, not by any test — nothing exercised the write path.
 */

import { NextRequest } from "next/server";

const mockValidateFromHeaders = jest.fn();
const mockResolveRoleFromDb = jest.fn();
const mockSingle = jest.fn();
const mockUpdateSession = jest.fn();

jest.mock("@/lib/auth/jwt-validation", () => ({
  jwtValidation: {
    validateFromHeaders: (...args: unknown[]) => mockValidateFromHeaders(...args),
  },
}));
jest.mock("@/lib/auth/resolve-role", () => ({
  resolveRoleFromDb: (...args: unknown[]) => mockResolveRoleFromDb(...args),
}));
jest.mock("@/lib/supabase/server", () => ({
  supabaseAdmin: {
    from: () => ({
      select: () => ({
        eq: () => ({ single: (...args: unknown[]) => mockSingle(...args) }),
      }),
    }),
  },
}));
jest.mock("@/lib/ai/financial-chat-engine", () => ({
  FinancialChatEngine: jest.fn(),
}));

import { PATCH } from "../route";
import { FinancialChatEngine } from "@/lib/ai/financial-chat-engine";

// jest.config sets resetMocks: true, which clears mock IMPLEMENTATIONS between
// tests — so the constructor's behaviour has to be re-attached in beforeEach,
// not declared once in the factory above.
const MockedEngine = FinancialChatEngine as jest.MockedClass<
  typeof FinancialChatEngine
>;

const SESSION = "11111111-1111-1111-1111-111111111111";
const OWNER = "user-1";

function req(body: unknown, sessionId = SESSION): NextRequest {
  const url = `http://localhost:3000/api/chat/financial/sessions/${sessionId}`;
  return {
    url,
    method: "PATCH",
    json: jest.fn().mockResolvedValue(body),
    headers: new Headers(),
    nextUrl: new URL(url),
  } as unknown as NextRequest;
}

describe("PATCH /api/chat/financial/sessions/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    MockedEngine.mockImplementation(
      () =>
        ({
          updateSession: (...args: unknown[]) => mockUpdateSession(...args),
        }) as unknown as FinancialChatEngine,
    );
    mockValidateFromHeaders.mockResolvedValue({
      valid: true,
      user: { id: OWNER, email: "user@example.com" },
    });
    mockResolveRoleFromDb.mockResolvedValue("user");
    mockSingle.mockResolvedValue({ data: { user_id: OWNER }, error: null });
    mockUpdateSession.mockResolvedValue({
      id: SESSION,
      userId: OWNER,
      title: "Renamed",
      createdAt: new Date("2026-08-17T09:00:00Z"),
      updatedAt: new Date("2026-08-17T10:00:00Z"),
    });
  });

  it("returns 401 when not authenticated", async () => {
    mockValidateFromHeaders.mockResolvedValue({ valid: false, user: null });
    expect((await PATCH(req({ title: "x" }))).status).toBe(401);
  });

  describe("input validation", () => {
    it("rejects a session id that is not a UUID", async () => {
      expect((await PATCH(req({ title: "x" }, "nope"))).status).toBe(400);
    });

    it.each<[unknown, string]>([
      [{}, "no title"],
      [{ title: "" }, "empty"],
      [{ title: "   " }, "whitespace only"],
      [{ title: 7 }, "not a string"],
      [{ title: null }, "null"],
    ])("rejects %j — %s", async (body, _why) => {
      expect((await PATCH(req(body))).status).toBe(400);
    });

    it("rejects a title over 200 characters", async () => {
      const res = await PATCH(req({ title: "x".repeat(201) }));
      expect(res.status).toBe(400);
      expect(mockUpdateSession).not.toHaveBeenCalled();
    });

    it("accepts a title exactly at the limit", async () => {
      expect((await PATCH(req({ title: "x".repeat(200) }))).status).toBe(200);
    });
  });

  describe("ownership", () => {
    it("returns 404 when the session does not exist", async () => {
      mockSingle.mockResolvedValue({ data: null, error: { message: "none" } });
      expect((await PATCH(req({ title: "x" }))).status).toBe(404);
    });

    it("returns 403 for someone else's session", async () => {
      mockSingle.mockResolvedValue({ data: { user_id: "other" }, error: null });
      expect((await PATCH(req({ title: "x" }))).status).toBe(403);
    });

    it("does NOT write when the caller does not own the session", async () => {
      mockSingle.mockResolvedValue({ data: { user_id: "other" }, error: null });
      await PATCH(req({ title: "hijacked" }));
      expect(mockUpdateSession).not.toHaveBeenCalled();
    });
  });

  describe("renaming", () => {
    it("returns 200 and the updated session", async () => {
      const res = await PATCH(req({ title: "Renamed" }));
      expect(res.status).toBe(200);
      expect((await res.json()).title).toBe("Renamed");
    });

    it("trims the title", async () => {
      await PATCH(req({ title: "  Renamed  " }));
      expect(mockUpdateSession).toHaveBeenCalledWith(SESSION, {
        title: "Renamed",
      });
    });

    it("passes ONLY the title through — metadata from the body is ignored", async () => {
      // updateSession spreads whatever it receives straight into the row, so
      // accepting metadata from the request would let a caller write arbitrary
      // JSON into a session. Renaming is all this endpoint grants.
      await PATCH(
        req({ title: "Renamed", metadata: { injected: true }, user_id: "other" }),
      );
      expect(mockUpdateSession).toHaveBeenCalledWith(SESSION, {
        title: "Renamed",
      });
    });

    it("returns 500 when the engine throws", async () => {
      mockUpdateSession.mockRejectedValue(new Error("db down"));
      expect((await PATCH(req({ title: "x" }))).status).toBe(500);
    });
  });
});
