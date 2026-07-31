/**
 * Tests for /api/privacy/consent (GDPR Art. 7)
 *
 * Coverage:
 * - Authentication (401) on both GET and POST
 * - IDOR closure: consent is always read/written for the authenticated user,
 *   never a client-supplied id
 * - Request validation (400)
 * - Honest failure: a failing service call surfaces as success:false, never
 *   success:true
 *
 * `getClientIp` is a pure function over `request.headers` — not mocked here,
 * it runs for real against the test request's `Headers` instance.
 */

import { NextRequest } from "next/server";

const mockValidateFromHeaders = jest.fn();
const mockResolveRoleFromDb = jest.fn();
const mockGetUserConsents = jest.fn();
const mockRecordConsent = jest.fn();

jest.mock("@/lib/auth/jwt-validation", () => ({
  jwtValidation: {
    validateFromHeaders: (...args: unknown[]) =>
      mockValidateFromHeaders(...args),
  },
}));
jest.mock("@/lib/auth/resolve-role", () => ({
  resolveRoleFromDb: (...args: unknown[]) => mockResolveRoleFromDb(...args),
}));
jest.mock("@/lib/compliance/gdpr-ccpa", () => ({
  consentService: {
    getUserConsents: (...args: unknown[]) => mockGetUserConsents(...args),
    recordConsent: (...args: unknown[]) => mockRecordConsent(...args),
  },
}));

import { GET, POST } from "../route";

const mockUser = { id: "user-123", email: "user@example.com" };

function createGetRequest(url: string): NextRequest {
  return {
    url,
    method: "GET",
    headers: new Headers(),
    nextUrl: new URL(url),
  } as unknown as NextRequest;
}

function createPostRequest(body?: unknown, jsonError?: Error): NextRequest {
  return {
    url: "http://localhost:3000/api/privacy/consent",
    method: "POST",
    json: jsonError
      ? jest.fn().mockRejectedValue(jsonError)
      : jest.fn().mockResolvedValue(body ?? {}),
    headers: new Headers(),
    nextUrl: new URL("http://localhost:3000/api/privacy/consent"),
  } as unknown as NextRequest;
}

const mockConsents = [
  {
    userId: mockUser.id,
    consentType: "marketing",
    granted: false,
    timestamp: new Date("2026-07-01T00:00:00Z"),
  },
];

describe("GET /api/privacy/consent", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockValidateFromHeaders.mockResolvedValue({ valid: true, user: mockUser });
    mockResolveRoleFromDb.mockResolvedValue("user");
    mockGetUserConsents.mockResolvedValue(mockConsents);
  });

  describe("negative-auth", () => {
    it("returns 401 when unauthenticated", async () => {
      mockValidateFromHeaders.mockResolvedValue({ valid: false, user: null });

      const res = await GET(createGetRequest("http://localhost:3000/api/privacy/consent"));

      expect(res.status).toBe(401);
      expect(mockGetUserConsents).not.toHaveBeenCalled();
    });
  });

  it("returns the authenticated caller's consent history", async () => {
    const res = await GET(createGetRequest("http://localhost:3000/api/privacy/consent"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.consents).toEqual(mockConsents);
    expect(mockGetUserConsents).toHaveBeenCalledWith(mockUser.id);
  });

  it("IDOR: ignores a client-supplied userId and always reads the authenticated caller's history", async () => {
    const res = await GET(
      createGetRequest(
        "http://localhost:3000/api/privacy/consent?userId=victim-user-id",
      ),
    );

    expect(res.status).toBe(200);
    expect(mockGetUserConsents).toHaveBeenCalledTimes(1);
    expect(mockGetUserConsents).toHaveBeenCalledWith(mockUser.id);
    expect(mockGetUserConsents).not.toHaveBeenCalledWith("victim-user-id");
  });

  it("honest failure: a failing read never reports success", async () => {
    mockGetUserConsents.mockRejectedValue(new Error("permission denied"));

    const res = await GET(createGetRequest("http://localhost:3000/api/privacy/consent"));
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.success).toBe(false);
    expect(body).not.toHaveProperty("success", true);
  });
});

describe("POST /api/privacy/consent", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockValidateFromHeaders.mockResolvedValue({ valid: true, user: mockUser });
    mockResolveRoleFromDb.mockResolvedValue("user");
    mockRecordConsent.mockResolvedValue(undefined);
  });

  describe("negative-auth", () => {
    it("returns 401 when unauthenticated", async () => {
      mockValidateFromHeaders.mockResolvedValue({ valid: false, user: null });

      const res = await POST(
        createPostRequest({ consentType: "marketing", granted: true }),
      );

      expect(res.status).toBe(401);
      expect(mockRecordConsent).not.toHaveBeenCalled();
    });
  });

  it("records consent for the authenticated user on the happy path", async () => {
    const res = await POST(
      createPostRequest({ consentType: "analytics", granted: true }),
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(mockRecordConsent).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: mockUser.id,
        consentType: "analytics",
        granted: true,
      }),
    );
  });

  it("IDOR: ignores a client-supplied userId and always records against the authenticated caller", async () => {
    await POST(
      createPostRequest({
        consentType: "data_sharing",
        granted: false,
        userId: "victim-user-id",
      }),
    );

    expect(mockRecordConsent).toHaveBeenCalledTimes(1);
    const recordedArg = mockRecordConsent.mock.calls[0][0];
    expect(recordedArg.userId).toBe(mockUser.id);
    expect(recordedArg.userId).not.toBe("victim-user-id");
  });

  it("rejects an invalid consentType", async () => {
    const res = await POST(
      createPostRequest({ consentType: "not-a-real-type", granted: true }),
    );

    expect(res.status).toBe(400);
    expect(mockRecordConsent).not.toHaveBeenCalled();
  });

  it("rejects a non-boolean granted value", async () => {
    const res = await POST(
      createPostRequest({ consentType: "marketing", granted: "yes" }),
    );

    expect(res.status).toBe(400);
    expect(mockRecordConsent).not.toHaveBeenCalled();
  });

  it("rejects invalid JSON bodies", async () => {
    const res = await POST(
      createPostRequest(undefined, new SyntaxError("Unexpected token")),
    );

    expect(res.status).toBe(400);
    expect(mockRecordConsent).not.toHaveBeenCalled();
  });

  it("honest failure: a failing write never reports success", async () => {
    mockRecordConsent.mockRejectedValue(new Error("insert failed"));

    const res = await POST(
      createPostRequest({ consentType: "ai_processing", granted: true }),
    );
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.success).toBe(false);
    expect(body).not.toHaveProperty("success", true);
  });
});
