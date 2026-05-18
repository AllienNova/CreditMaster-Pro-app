/**
 * Tests for /api/ai/chat
 *
 * Covers:
 *   - Negative-auth (TASK-AUTH-03f)
 *   - CMP-6 / FND-059: client-supplied `model` must NOT be forwarded to the AI;
 *     the server selects the model via ModelRouter.
 */

import { NextRequest } from "next/server";

// ── top-level mock fns — must be defined before jest.mock factories ────────────
// Lambda wrappers are used in factories so resetMocks:true doesn't wipe the
// factory-level delegation (the arrow function itself is not a jest mock).
const mockValidateFromHeaders = jest.fn();
const mockResolveRoleFromDb = jest.fn();
const mockModelRouterComplete = jest.fn();
const mockCheckSufficientCredits = jest.fn();
const mockDeductCredits = jest.fn();

jest.mock("@/lib/auth/jwt-validation", () => ({
  jwtValidation: {
    validateFromHeaders: (...args: unknown[]) =>
      mockValidateFromHeaders(...args),
  },
}));
jest.mock("@/lib/auth/resolve-role", () => ({
  resolveRoleFromDb: (...args: unknown[]) => mockResolveRoleFromDb(...args),
}));
jest.mock("@/lib/model-router", () => ({
  getModelRouter: () => ({ complete: (...args: unknown[]) => mockModelRouterComplete(...args) }),
  TaskType: { GENERAL_CHAT: "general_chat" },
  resetModelRouter: jest.fn(),
}));
jest.mock("@/lib/credits", () => ({
  creditService: {
    checkSufficientCredits: (...args: unknown[]) => mockCheckSufficientCredits(...args),
    deductCredits: (...args: unknown[]) => mockDeductCredits(...args),
  },
  CREDIT_COSTS: { chat_message: 1 },
}));

import { GET, POST } from "../route";

function createMockRequest(
  method = "POST",
  body: Record<string, unknown> = {},
): NextRequest {
  const url = "http://localhost:3000/api/ai/chat";
  return {
    url,
    method,
    json: jest.fn().mockResolvedValue(body),
    headers: new Headers(),
    nextUrl: new URL(url),
  } as unknown as NextRequest;
}

const authedUser = { id: "user-1", email: "user@example.com" };

describe("/api/ai/chat", () => {
  beforeEach(() => {
    mockValidateFromHeaders.mockResolvedValue({ valid: true, user: authedUser });
    mockResolveRoleFromDb.mockResolvedValue("user");
    mockCheckSufficientCredits.mockResolvedValue(true);
    mockDeductCredits.mockResolvedValue(undefined);
    mockModelRouterComplete.mockResolvedValue({
      choices: [{ message: { content: "Hello!" } }],
      model: "openai/gpt-4o",
      usage: { total_tokens: 10 },
    });
  });

  describe("negative-auth", () => {
    it("GET returns 401 when the request is not authenticated", async () => {
      mockValidateFromHeaders.mockResolvedValue({ valid: false, user: null });
      const res = await GET(createMockRequest("GET"));
      expect(res.status).toBe(401);
    });

    it("POST returns 401 when the request is not authenticated", async () => {
      mockValidateFromHeaders.mockResolvedValue({ valid: false, user: null });
      const res = await POST(createMockRequest("POST"));
      expect(res.status).toBe(401);
    });
  });

  describe("FND-059: server-side model selection", () => {
    it("returns 400 when messages is missing", async () => {
      const res = await POST(createMockRequest("POST", {}));
      expect(res.status).toBe(400);
    });

    it("ignores a client-supplied model and routes via ModelRouter", async () => {
      const req = createMockRequest("POST", {
        model: "some-client-chosen-model",
        messages: [{ role: "user", content: "Hello" }],
      });

      const res = await POST(req);
      expect(res.status).toBe(200);

      // ModelRouter.complete must have been called — not a direct aiml.chat with the client model
      expect(mockModelRouterComplete).toHaveBeenCalledTimes(1);
      const [taskType, messages] = mockModelRouterComplete.mock.calls[0];
      expect(taskType).toBe("general_chat");
      expect(messages).toEqual([{ role: "user", content: "Hello" }]);
    });

    it("succeeds without a client model field — server always selects", async () => {
      const req = createMockRequest("POST", {
        messages: [{ role: "user", content: "No model sent" }],
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      expect(mockModelRouterComplete).toHaveBeenCalledTimes(1);
    });

    it("returns 402 when credits are insufficient", async () => {
      mockCheckSufficientCredits.mockResolvedValue(false);
      const req = createMockRequest("POST", {
        messages: [{ role: "user", content: "Hello" }],
      });
      const res = await POST(req);
      expect(res.status).toBe(402);
    });
  });
});
