/**
 * @jest-environment node
 */

import { RedisSessionStore, SessionRecord } from "../redis-session-store";

function makeSession(userId: string): SessionRecord {
  const now = Date.now();
  return {
    userId,
    token: `tok-${userId}`,
    createdAt: now,
    lastActivity: now,
    expiresAt: now + 24 * 60 * 60 * 1000,
  };
}

describe("RedisSessionStore (FND-007)", () => {
  it("persists a session across a simulated process restart", async () => {
    const writer = new RedisSessionStore();
    const session = makeSession("user-1");
    await writer.set(session.token, session);

    // Simulate a process restart: a brand-new store instance must still
    // see the session a prior instance wrote.
    const readerAfterRestart = new RedisSessionStore();
    const retrieved = await readerAfterRestart.get(session.token);

    expect(retrieved).not.toBeNull();
    expect(retrieved?.userId).toBe("user-1");
  });

  it("returns null for an unknown token", async () => {
    const store = new RedisSessionStore();
    expect(await store.get("does-not-exist")).toBeNull();
  });

  it("deletes a session", async () => {
    const store = new RedisSessionStore();
    const session = makeSession("user-2");
    await store.set(session.token, session);
    await store.delete(session.token);
    expect(await store.get(session.token)).toBeNull();
  });

  it("treats an expired session as absent", async () => {
    const store = new RedisSessionStore();
    const session = makeSession("user-3");
    session.expiresAt = Date.now() - 1000;
    await store.set(session.token, session);
    expect(await store.get(session.token)).toBeNull();
  });
});
