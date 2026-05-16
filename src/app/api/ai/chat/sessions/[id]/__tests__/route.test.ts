/**
 * Negative-auth tests for /api/ai/chat/sessions/[id] (TASK-AUTH-03f)
 */

import { NextRequest } from "next/server";

const mockValidateFromHeaders = jest.fn();
const mockResolveRoleFromDb = jest.fn();

jest.mock("@/lib/auth/jwt-validation", () => ({
  jwtValidation: {
    validateFromHeaders: (...args: unknown[]) =>
      mockValidateFromHeaders(...args),
  },
}));
jest.mock("@/lib/auth/resolve-role", () => ({
  resolveRoleFromDb: (...args: unknown[]) => mockResolveRoleFromDb(...args),
}));
jest.mock("@/lib/ai/chat-db-service", () => ({
  chatDbService: {
    getSession: jest.fn(),
    listMessages: jest.fn(),
    updateSession: jest.fn(),
    deleteSession: jest.fn(),
  },
}));

import { GET, PUT, DELETE } from "../route";

function createMockRequest(method = "GET"): NextRequest {
  const url = "http://localhost:3000/api/ai/chat/sessions/session-123";
  return {
    url,
    method,
    json: jest.fn().mockResolvedValue({}),
    headers: new Headers(),
    nextUrl: new URL(url),
  } as unknown as NextRequest;
}

describe("negative-auth – /api/ai/chat/sessions/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockValidateFromHeaders.mockResolvedValue({ valid: false, user: null });
  });

  it("GET returns 401 when the request is not authenticated", async () => {
    const res = await GET(createMockRequest("GET"));
    expect(res.status).toBe(401);
  });

  it("PUT returns 401 when the request is not authenticated", async () => {
    const res = await PUT(createMockRequest("PUT"));
    expect(res.status).toBe(401);
  });

  it("DELETE returns 401 when the request is not authenticated", async () => {
    const res = await DELETE(createMockRequest("DELETE"));
    expect(res.status).toBe(401);
  });
});
