/**
 * Dispute Follow-up Service Tests
 *
 * Regression coverage for the email_logs silent-swallow fix
 * (docs/qa/phantom-table-inventory.md — email_logs was queried with no
 * backing migration and no error check at all). No test file existed for
 * this module before this change.
 */

const mockFrom = jest.fn();
const mockSend = jest.fn();

// Builds a chainable + thenable mock query builder, matching how the real
// postgrest-js FilterBuilder resolves regardless of which method call is
// last in the chain (some call sites here end in `.single()`, others are
// awaited directly after `.in()`/`.order()`/`.update()`/`.insert()`).
function createMockChain(result: { data?: unknown; error?: unknown } = {}) {
  const resolved = { data: result.data ?? null, error: result.error ?? null };
  const chain: Record<string, unknown> = {};
  const methods = ["select", "insert", "update", "eq", "in", "order"];
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

// A plain constructor function, NOT jest.fn().mockImplementation(...) — the
// latter is itself a jest.fn(), which jest.config.js's global
// `resetMocks: true` wipes back to a no-op before every test (the same
// class of gotcha as createClient() needing its implementation re-applied
// per test). A plain function is untouched by resetMocks.
jest.mock("resend", () => ({
  Resend: function MockResend() {
    return { emails: { send: mockSend } };
  },
}));

import { processFollowups } from "../dispute-followups";

const TEN_DAYS_AGO = new Date(
  Date.now() - 10 * 24 * 60 * 60 * 1000,
).toISOString();

function makeDispute(overrides: Record<string, unknown> = {}) {
  return {
    id: "dispute-1",
    user_id: "user-1",
    status: "pending",
    bureau: "experian",
    item_type: "late_payment",
    created_at: TEN_DAYS_AGO,
    last_followup_at: undefined,
    ...overrides,
  };
}

const USER = { id: "user-1", email: "user@example.com", full_name: "Jane Doe" };

describe("processFollowups (email_logs table — regression)", () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    mockSend.mockResolvedValue({ data: { id: "email-1" }, error: null });
    // jest.config.js sets restoreMocks: true, which fully detaches a
    // jest.spyOn before every test — must be re-created fresh here.
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
  });

  it("sends the email and returns [] processed when no disputes need a follow-up", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "disputes") return createMockChain({ data: [] });
      return createMockChain();
    });

    const stats = await processFollowups();

    expect(stats).toEqual({ processed: 0, sent: 0, errors: 0 });
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("sends the email, logs it, and updates last_followup_at on the happy path", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "disputes") {
        return createMockChain({ data: [makeDispute()] });
      }
      if (table === "profiles") return createMockChain({ data: USER });
      if (table === "email_logs") return createMockChain({ error: null });
      return createMockChain();
    });

    const stats = await processFollowups();

    expect(stats).toEqual({ processed: 1, sent: 1, errors: 0 });
    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(mockFrom).toHaveBeenCalledWith("email_logs");
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it("logs the email_logs failure instead of discarding it, but the follow-up still counts as sent — the email itself was already delivered", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "disputes") {
        return createMockChain({ data: [makeDispute()] });
      }
      if (table === "profiles") return createMockChain({ data: USER });
      if (table === "email_logs") {
        return createMockChain({
          error: { message: "relation email_logs does not exist" },
        });
      }
      return createMockChain();
    });

    const stats = await processFollowups();

    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(stats).toEqual({ processed: 1, sent: 1, errors: 0 });
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Failed to record email_logs entry for dispute followup",
      expect.objectContaining({
        userId: "user-1",
        disputeId: "dispute-1",
        error: "relation email_logs does not exist",
      }),
    );
  });
});
