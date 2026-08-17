/**
 * POST /api/chat/financial/sessions/[id]/messages
 *
 * This handler did not exist. The client has always POSTed here and Next.js has
 * always answered 405, so sending a message in the financial chat never worked
 * while reading history did — which is why every screen still rendered.
 *
 * Kept separate from route.test.ts because POST needs a Supabase mock that
 * supports both `.single()` (the ownership read) and `.order().limit()` (the
 * read-back), and widening the existing mock risks the negative-auth suite it
 * was written for.
 */

import { NextRequest } from "next/server";

const mockValidateFromHeaders = jest.fn();
const mockResolveRoleFromDb = jest.fn();
const mockSingle = jest.fn();
const mockLimit = jest.fn();
const mockSendMessage = jest.fn();

jest.mock("@/lib/auth/jwt-validation", () => ({
  jwtValidation: {
    validateFromHeaders: (...args: unknown[]) => mockValidateFromHeaders(...args),
  },
}));
jest.mock("@/lib/auth/resolve-role", () => ({
  resolveRoleFromDb: (...args: unknown[]) => mockResolveRoleFromDb(...args),
}));
// supabaseAdmin, NOT createClient. The handler used the cookie-scoped client and
// therefore 404'd every real session for a bearer-token caller; see the route's
// assertSessionOwned comment.
jest.mock("@/lib/supabase/server", () => ({
  supabaseAdmin: {
    from: () => ({
      select: () => ({
        eq: () => ({
          single: (...args: unknown[]) => mockSingle(...args),
          order: () => ({ limit: () => mockLimit() }),
        }),
      }),
    }),
  },
}));
jest.mock("@/lib/ai/financial-chat-engine", () => ({
  FinancialChatEngine: jest.fn(),
}));

import { POST } from "../route";
import { FinancialChatEngine } from "@/lib/ai/financial-chat-engine";

/**
 * jest.config sets `resetMocks: true`, which clears mock IMPLEMENTATIONS before
 * every test — not just call history. A `mockImplementation` attached at module
 * level is therefore gone by the time any test runs, and `new
 * FinancialChatEngine()` yields an object with no methods:
 *
 *     TypeError: chatEngine.sendMessage is not a function
 *
 * The sibling route.test.ts gets away with the module-level form only because
 * every one of its cases returns 401 or 403 before touching the engine. So the
 * constructor's behaviour is (re)attached in beforeEach, below.
 */
const MockedEngine = FinancialChatEngine as jest.MockedClass<
  typeof FinancialChatEngine
>;

const SESSION = "11111111-1111-1111-1111-111111111111";
const OWNER = "user-1";

function req(body: unknown, sessionId = SESSION): NextRequest {
  const url = `http://localhost:3000/api/chat/financial/sessions/${sessionId}/messages`;
  return {
    url,
    method: "POST",
    json: jest.fn().mockResolvedValue(body),
    headers: new Headers(),
    nextUrl: new URL(url),
  } as unknown as NextRequest;
}

const userRow = {
  id: "m-user",
  session_id: SESSION,
  role: "user",
  content: "How much did I spend on food?",
  timestamp: "2026-08-17T10:00:00.000Z",
  metadata: null,
};
const assistantRow = {
  id: "m-assistant",
  session_id: SESSION,
  role: "assistant",
  content: "You spent $412 on food last month.",
  timestamp: "2026-08-17T10:00:01.000Z",
  metadata: { intentType: "spending_query" },
};

describe("POST /api/chat/financial/sessions/[id]/messages", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    MockedEngine.mockImplementation(
      () =>
        ({
          sendMessage: (...args: unknown[]) => mockSendMessage(...args),
        }) as unknown as FinancialChatEngine,
    );
    mockValidateFromHeaders.mockResolvedValue({
      valid: true,
      user: { id: OWNER, email: "user@example.com" },
    });
    mockResolveRoleFromDb.mockResolvedValue("user");
    mockSingle.mockResolvedValue({ data: { user_id: OWNER }, error: null });
    mockSendMessage.mockResolvedValue({
      message: assistantRow.content,
      intent: { type: "spending_query", confidence: 0.9 },
      suggestedActions: [],
      educationalContent: null,
      metadata: { disclaimer: "Not financial advice." },
    });
    // Most recent first, which is how the route queries.
    mockLimit.mockResolvedValue({ data: [assistantRow, userRow], error: null });
  });

  it("returns 401 when not authenticated", async () => {
    mockValidateFromHeaders.mockResolvedValue({ valid: false, user: null });
    expect((await POST(req({ content: "hi" }))).status).toBe(401);
  });

  describe("input validation", () => {
    it("rejects a session id that is not a UUID", async () => {
      const res = await POST(req({ content: "hi" }, "not-a-uuid"));
      expect(res.status).toBe(400);
    });

    it.each<[unknown, string]>([
      [{}, "no content"],
      [{ content: "" }, "empty string"],
      [{ content: "   " }, "whitespace only"],
      [{ content: 42 }, "not a string"],
      [{ content: null }, "null"],
    ])("rejects %j — %s", async (body, _why) => {
      expect((await POST(req(body))).status).toBe(400);
    });

    it("rejects content over the 4000-character limit", async () => {
      const res = await POST(req({ content: "x".repeat(4001) }));
      expect(res.status).toBe(400);
      expect(mockSendMessage).not.toHaveBeenCalled();
    });

    it("accepts content exactly at the limit", async () => {
      expect((await POST(req({ content: "x".repeat(4000) }))).status).toBe(201);
    });
  });

  describe("ownership", () => {
    it("returns 404 when the session does not exist", async () => {
      mockSingle.mockResolvedValue({ data: null, error: { message: "none" } });
      expect((await POST(req({ content: "hi" }))).status).toBe(404);
    });

    it("returns 403 for someone else's session", async () => {
      mockSingle.mockResolvedValue({ data: { user_id: "other" }, error: null });
      expect((await POST(req({ content: "hi" }))).status).toBe(403);
    });

    it("does NOT run the engine for a session the caller does not own", async () => {
      // sendMessage writes rows and bills a model call. Ordering the ownership
      // check before it is the whole point, so assert it rather than assume it.
      mockSingle.mockResolvedValue({ data: { user_id: "other" }, error: null });
      await POST(req({ content: "hi" }));
      expect(mockSendMessage).not.toHaveBeenCalled();
    });

    it("does NOT run the engine when validation fails", async () => {
      await POST(req({ content: "" }));
      expect(mockSendMessage).not.toHaveBeenCalled();
    });
  });

  describe("happy path", () => {
    it("returns 201 with both persisted messages", async () => {
      const res = await POST(req({ content: userRow.content }));
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.userMessage.id).toBe("m-user");
      expect(body.assistantMessage.id).toBe("m-assistant");
      expect(body.assistantMessage.content).toBe(assistantRow.content);
    });

    it("identifies the two messages by ROLE, not by array position", async () => {
      // Two rows written in the same millisecond have no guaranteed order under
      // `timestamp`, so position is not a safe way to tell them apart.
      mockLimit.mockResolvedValue({ data: [userRow, assistantRow], error: null });
      const body = await (await POST(req({ content: "hi" }))).json();
      expect(body.userMessage.id).toBe("m-user");
      expect(body.assistantMessage.id).toBe("m-assistant");
    });

    it("trims the content before sending it to the engine", async () => {
      await POST(req({ content: "  hello  " }));
      expect(mockSendMessage).toHaveBeenCalledWith(SESSION, "hello");
    });

    it("carries the financial disclaimer through to the client", async () => {
      const body = await (await POST(req({ content: "hi" }))).json();
      expect(body.disclaimer).toBe("Not financial advice.");
    });

    it("maps snake_case columns to the camelCase shape the hook reads", async () => {
      const body = await (await POST(req({ content: "hi" }))).json();
      expect(body.userMessage.sessionId).toBe(SESSION);
      expect(body.userMessage).not.toHaveProperty("session_id");
    });
  });

  describe("when the read-back fails after a successful send", () => {
    // The message WAS sent and answered; only re-reading the rows failed.
    // Reporting "failed to send" would be false and would invite the user to
    // send again, duplicating the turn.
    beforeEach(() => {
      mockLimit.mockResolvedValue({ data: null, error: { message: "boom" } });
    });

    it("does not report failure", async () => {
      const res = await POST(req({ content: "hi" }));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.sent).toBe(true);
      expect(body.error).toBeUndefined();
    });

    it("still returns the reply text and says the history needs refreshing", async () => {
      const body = await (await POST(req({ content: "hi" }))).json();
      expect(body.reply).toBe(assistantRow.content);
      expect(body.warning).toMatch(/refresh/i);
    });
  });

  it("returns 500 when the engine itself throws", async () => {
    mockSendMessage.mockRejectedValue(new Error("model down"));
    expect((await POST(req({ content: "hi" }))).status).toBe(500);
  });
});
