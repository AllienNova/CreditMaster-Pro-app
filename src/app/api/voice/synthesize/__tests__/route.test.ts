/**
 * Tests for /api/voice/synthesize
 *
 * Covers:
 *   - Negative-auth (TASK-AUTH-03f)
 *   - CMP-6 / FND-060: non-whitelisted TTS model must be rejected (400);
 *     a whitelisted model must pass through.
 */

import { NextRequest } from "next/server";

// ── top-level mock fns — lambda wrappers used in factories so resetMocks:true
// doesn't wipe factory-level delegation.
const mockValidateFromHeaders = jest.fn();
const mockResolveRoleFromDb = jest.fn();
const mockGenerateSpeech = jest.fn();

// next/server must be mocked before route import: the route uses
// `new NextResponse(buffer, ...)` which is not constructable in the jest environment.
// NextResponse.json is still needed for 400/500 paths.
const mockJsonStatic = jest.fn().mockImplementation(
  (data: unknown, init?: { status?: number }) => ({
    status: init?.status ?? 200,
    headers: new Headers(),
    json: jest.fn().mockResolvedValue(data),
  }),
);

jest.mock("next/server", () => {
  const actual = jest.requireActual("next/server");

  function MockNextResponse(
    _body: unknown,
    init?: { status?: number; headers?: Record<string, string> },
  ) {
    return {
      status: init?.status ?? 200,
      headers: new Headers(init?.headers),
    };
  }
  MockNextResponse.json = mockJsonStatic;

  return { ...actual, NextResponse: MockNextResponse };
});

jest.mock("@/lib/auth/jwt-validation", () => ({
  jwtValidation: {
    validateFromHeaders: (...args: unknown[]) =>
      mockValidateFromHeaders(...args),
  },
}));
jest.mock("@/lib/auth/resolve-role", () => ({
  resolveRoleFromDb: (...args: unknown[]) => mockResolveRoleFromDb(...args),
}));
jest.mock("@/lib/aiml-service", () => ({
  getAIMLService: () => ({
    generateSpeech: (...args: unknown[]) => mockGenerateSpeech(...args),
  }),
}));

import { GET, POST } from "../route";

function createMockRequest(
  method = "POST",
  body: Record<string, unknown> = {},
): NextRequest {
  const url = "http://localhost:3000/api/voice/synthesize";
  return {
    url,
    method,
    json: jest.fn().mockResolvedValue(body),
    formData: jest.fn().mockResolvedValue(new Map()),
    headers: new Headers(),
    nextUrl: new URL(url),
    signal: { addEventListener: jest.fn() },
  } as unknown as NextRequest;
}

const authedUser = { id: "user-1", email: "user@example.com" };

describe("/api/voice/synthesize", () => {
  beforeEach(() => {
    mockValidateFromHeaders.mockResolvedValue({ valid: true, user: authedUser });
    mockResolveRoleFromDb.mockResolvedValue("user");
    mockGenerateSpeech.mockResolvedValue(new ArrayBuffer(8));
    mockJsonStatic.mockImplementation(
      (data: unknown, init?: { status?: number }) => ({
        status: init?.status ?? 200,
        headers: new Headers(),
        json: jest.fn().mockResolvedValue(data),
      }),
    );
  });

  describe("negative-auth", () => {
    it("GET returns 401 when not authenticated", async () => {
      mockValidateFromHeaders.mockResolvedValue({ valid: false, user: null });
      const res = await GET(createMockRequest("GET"));
      expect(res.status).toBe(401);
    });

    it("POST returns 401 when not authenticated", async () => {
      mockValidateFromHeaders.mockResolvedValue({ valid: false, user: null });
      const res = await POST(createMockRequest("POST"));
      expect(res.status).toBe(401);
    });
  });

  describe("FND-060: TTS model whitelist", () => {
    it("rejects a non-whitelisted model with 400", async () => {
      const req = createMockRequest("POST", {
        text: "Hello world",
        model: "some-unknown-model",
        voice: "alloy",
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toMatch(/model/i);
      // the whitelist guard must reject before any TTS/billing work
      expect(mockGenerateSpeech).not.toHaveBeenCalled();
    });

    it("accepts the whitelisted model tts-1", async () => {
      const req = createMockRequest("POST", {
        text: "Hello world",
        model: "tts-1",
        voice: "alloy",
      });
      const res = await POST(req);
      expect(res.status).toBe(200);
    });

    it("accepts the whitelisted model tts-1-hd", async () => {
      const req = createMockRequest("POST", {
        text: "Hello world",
        model: "tts-1-hd",
        voice: "alloy",
      });
      const res = await POST(req);
      expect(res.status).toBe(200);
    });

    it("uses the default model tts-1-hd when no model is provided", async () => {
      const req = createMockRequest("POST", {
        text: "Hello world",
        voice: "alloy",
      });
      const res = await POST(req);
      expect(res.status).toBe(200);
      expect(mockGenerateSpeech).toHaveBeenCalledWith(
        "Hello world",
        "tts-1-hd",
        "alloy",
      );
    });
  });
});
