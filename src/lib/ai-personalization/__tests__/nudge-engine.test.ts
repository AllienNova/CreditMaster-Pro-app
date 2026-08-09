/**
 * Nudge Engine Tests
 *
 * Regression coverage for the user_devices phantom-table removal
 * (docs/qa/phantom-table-inventory.md — sendPushNotification queried a
 * "user_devices" table that was never migrated, wrapped in a try/catch that
 * never fired because postgrest-js resolves {error} rather than throwing).
 * No test file existed for this module before this change.
 */

const mockFrom = jest.fn();

function createMockChain(result: { data?: unknown; error?: unknown } = {}) {
  const resolved = { data: result.data ?? null, error: result.error ?? null };
  const chain: Record<string, unknown> = {};
  const methods = ["select", "insert", "update", "eq", "gte", "is", "order", "limit"];
  methods.forEach((m) => {
    chain[m] = jest.fn(() => chain);
  });
  chain.single = jest.fn(() => Promise.resolve(resolved));
  chain.then = (
    resolve: (v: typeof resolved) => unknown,
    reject?: (r: unknown) => unknown,
  ) => Promise.resolve(resolved).then(resolve, reject);
  return chain;
}

jest.mock("@supabase/supabase-js", () => ({
  createClient: () => ({ from: mockFrom }),
}));

import { NudgeEngine } from "../nudge-engine";
import type { NudgeRequest } from "../types";

describe("NudgeEngine.sendNudge — push channel (user_devices — regression)", () => {
  let engine: NudgeEngine;
  let consoleWarnSpy: jest.SpyInstance;

  beforeEach(() => {
    engine = new NudgeEngine("https://example.supabase.co", "test-key");
    // jest.config.js sets restoreMocks: true, which fully detaches a
    // jest.spyOn before every test — must be re-created fresh here.
    consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation();
    mockFrom.mockImplementation((table: string) => {
      if (table === "nudge_history") {
        return createMockChain({
          data: {
            id: "nudge-1",
            user_id: "user-1",
            nudge_type: "reminder",
            title: "t",
            message: "m",
            channel: "push",
            sent_at: new Date().toISOString(),
          },
        });
      }
      return createMockChain();
    });
  });

  const request: NudgeRequest = {
    userId: "user-1",
    nudgeType: "reminder",
    title: "Bill due soon",
    message: "Your bill is due in 3 days",
    channel: "push",
  };

  it("does not query a device-token table and logs honestly instead of silently no-oping", async () => {
    await engine.sendNudge(request);

    expect(mockFrom).not.toHaveBeenCalledWith("user_devices");
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      "Push notification channel is not implemented",
      expect.objectContaining({ userId: "user-1", nudgeType: "reminder" }),
    );
  });

  it("still records the nudge in nudge_history even though push delivery is not implemented", async () => {
    const result = await engine.sendNudge(request);

    expect(result.id).toBe("nudge-1");
    expect(mockFrom).toHaveBeenCalledWith("nudge_history");
  });
});
