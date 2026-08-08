/**
 * @jest-environment node
 *
 * IDOR regression tests for notification-service-db.ts
 *
 * Verifies that markAsRead and deleteNotification filter by BOTH notification id
 * AND user_id, so user A cannot read/delete a notification owned by user B.
 *
 * Covers FND-046 / TASK-IDR-04.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

// --- Mocks ---

jest.mock("resend", () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: { send: jest.fn().mockResolvedValue({}) },
  })),
}));

jest.mock("@/lib/supabase/service-role", () => ({
  getServiceRoleClient: jest.fn(),
}));

// --- Import under test (after mocks) ---

import { notificationServiceDB } from "../notification-service-db";
import { getServiceRoleClient } from "@/lib/supabase/service-role";

const mockGetSupabase = getServiceRoleClient as jest.Mock;

// --- Chain factory ---
// Produces a chainable Supabase-style query builder.
// The eqCalls array records every .eq(col, val) call in order so tests can
// assert on the exact filter set.
function createChain(terminalResult: any) {
  const eqCalls: Array<[string, string]> = [];
  const chain: any = {};

  chain.then = (resolve: (v: any) => any, reject?: (e: any) => any) =>
    Promise.resolve(terminalResult).then(resolve, reject);

  chain.eq = jest.fn((col: string, val: string) => {
    eqCalls.push([col, val]);
    return chain;
  });
  chain.update = jest.fn(() => chain);
  chain.delete = jest.fn(() => chain);
  chain.insert = jest.fn(() => chain);
  chain.select = jest.fn(() => chain);
  chain.single = jest.fn(() => chain);
  chain.order = jest.fn(() => chain);
  chain.limit = jest.fn(() => chain);

  chain._eqCalls = eqCalls;
  return chain;
}

// --- Helpers ---

function setupSupabase(terminalResult: any) {
  let lastChain: any;
  mockGetSupabase.mockImplementation(() => ({
    from: jest.fn(() => {
      lastChain = createChain(terminalResult);
      return lastChain;
    }),
  }));
  return { getLastChain: () => lastChain };
}

// --- IDOR tests ---

describe("NotificationServiceDB — idor ownership filter", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // markAsRead ----------------------------------------------------------------

  describe("markAsRead — idor cross-user filter", () => {
    it("filters by BOTH id AND user_id so user A cannot mark user B notification read", async () => {
      const { getLastChain } = setupSupabase({ error: null });

      await notificationServiceDB.markAsRead("notif-owned-by-B", "user-A");

      const chain = getLastChain();
      const eqCalls: Array<[string, string]> = chain._eqCalls;

      // Must carry BOTH filters
      expect(eqCalls).toContainEqual(["id", "notif-owned-by-B"]);
      expect(eqCalls).toContainEqual(["user_id", "user-A"]);
    });

    it("owner calling markAsRead with their own userId succeeds", async () => {
      const { getLastChain } = setupSupabase({ error: null });

      const result = await notificationServiceDB.markAsRead(
        "notif-1",
        "owner-user",
      );

      const chain = getLastChain();
      const eqCalls: Array<[string, string]> = chain._eqCalls;

      expect(eqCalls).toContainEqual(["id", "notif-1"]);
      expect(eqCalls).toContainEqual(["user_id", "owner-user"]);
      expect(result).toBe(true);
    });

    it("returns false when Supabase returns an error (idor call with bad ownership silently fails)", async () => {
      setupSupabase({ error: { message: "No rows affected" } });

      // Simulate: notif belongs to user-B, user-A tries to mark it read.
      // With the user_id filter, Supabase returns 0 rows affected (or an error
      // if RLS is active). The service must return false, not true.
      const result = await notificationServiceDB.markAsRead(
        "notif-owned-by-B",
        "user-A",
      );

      expect(result).toBe(false);
    });
  });

  // deleteNotification --------------------------------------------------------

  describe("deleteNotification — idor cross-user filter", () => {
    it("filters by BOTH id AND user_id so user A cannot delete user B notification", async () => {
      const { getLastChain } = setupSupabase({ error: null });

      await notificationServiceDB.deleteNotification(
        "notif-owned-by-B",
        "user-A",
      );

      const chain = getLastChain();
      const eqCalls: Array<[string, string]> = chain._eqCalls;

      expect(eqCalls).toContainEqual(["id", "notif-owned-by-B"]);
      expect(eqCalls).toContainEqual(["user_id", "user-A"]);
    });

    it("owner calling deleteNotification with their own userId succeeds", async () => {
      const { getLastChain } = setupSupabase({ error: null });

      const result = await notificationServiceDB.deleteNotification(
        "notif-1",
        "owner-user",
      );

      const chain = getLastChain();
      const eqCalls: Array<[string, string]> = chain._eqCalls;

      expect(eqCalls).toContainEqual(["id", "notif-1"]);
      expect(eqCalls).toContainEqual(["user_id", "owner-user"]);
      expect(result).toBe(true);
    });

    it("returns false when Supabase returns an error (idor call with bad ownership silently fails)", async () => {
      setupSupabase({ error: { message: "No rows affected" } });

      const result = await notificationServiceDB.deleteNotification(
        "notif-owned-by-B",
        "user-A",
      );

      expect(result).toBe(false);
    });
  });
});
