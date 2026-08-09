/**
 * @jest-environment node
 *
 * FND-005: requireAuth/requireRole/requirePermission/hasPermission and the
 * validateToken helper behind them (which trusted `decoded.role` straight off
 * the JWT claim) have been deleted from auth-middleware.ts — they had zero
 * live importers; every API route already authorizes through
 * '@/lib/auth/api-guard', which resolves role fresh from the DB. Coverage for
 * that guard lives in '@/lib/auth/__tests__'. What remains here is unrelated
 * to FND-005: `validateAPIKey` (FND-002) and the Redis-backed session
 * helpers.
 */

// Fake timers are needed for the session-expiry test below, which advances
// Date.now() past a session's TTL — unrelated to any interval/timer in the
// module itself (there is none; expiry is checked via Date.now() comparisons
// in redis-session-store.ts).
jest.useFakeTimers();

import {
  validateAPIKey,
  createSession,
  getSession,
  deleteSession,
  cleanupExpiredSessions,
} from "../auth-middleware";

afterAll(() => {
  jest.useRealTimers();
});

// ═══════════════════════════════════════════════════════════════════════════════
//  validateAPIKey
// ═══════════════════════════════════════════════════════════════════════════════
describe("Auth Middleware – validateAPIKey", () => {
  // FND-002 (TASK-AUTH-05): the AIML provider key is an OUTBOUND credential.
  // Presenting its value as an inbound request credential must NOT authenticate.
  it("should NOT authenticate the AIML provider key value", async () => {
    process.env.AIML_API_KEY = "test-api-key";
    const result = await validateAPIKey("test-api-key");
    expect(result.authenticated).toBe(false);
  });

  it("should fail with incorrect API key", async () => {
    const result = await validateAPIKey("wrong-key");
    expect(result.authenticated).toBe(false);
  });

  it("should fail with empty API key", async () => {
    const result = await validateAPIKey("");
    expect(result.authenticated).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  Session management
// ═══════════════════════════════════════════════════════════════════════════════
describe("Auth Middleware – sessions", () => {
  it("createSession should return a token string", async () => {
    const token = await createSession("user-1");
    expect(token).toBeDefined();
    expect(typeof token).toBe("string");
    expect(token.length).toBeGreaterThan(0);
  });

  it("getSession should retrieve a created session", async () => {
    const token = await createSession("user-1");
    const retrieved = await getSession(token);
    expect(retrieved).toBeDefined();
    expect(retrieved?.userId).toBe("user-1");
  });

  it("getSession should return null for unknown token", async () => {
    expect(await getSession("nonexistent-token")).toBeNull();
  });

  it("deleteSession should remove a session", async () => {
    const token = await createSession("user-1");
    await deleteSession(token);
    expect(await getSession(token)).toBeNull();
  });

  it("expired sessions are not returned by getSession", async () => {
    const token = await createSession("user-1");

    // Advance time past session expiry (default 24h). The Redis-backed store
    // reclaims via per-key TTL; the in-memory fallback drops on read.
    jest.advanceTimersByTime(25 * 60 * 60 * 1000);

    cleanupExpiredSessions();
    expect(await getSession(token)).toBeNull();
  });
});
