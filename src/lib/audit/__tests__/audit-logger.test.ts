/**
 * audit-logger — persistence contract (M0 live-bug fix).
 *
 * This module had NO test coverage, which is how it shipped writing five
 * columns that do not exist on `audit_logs` (actor_id, target_id, target_type,
 * plus details/success/error_message) while SWALLOWING the resulting insert
 * error. Security audit logging was failing silently.
 *
 * These tests pin the two properties that failure violated:
 *   1. the row is written with the CANONICAL column names, including the
 *      NOT NULL `resource_type`;
 *   2. a failed insert is SURFACED, never swallowed — while still not
 *      throwing, so an audit outage cannot take down the caller.
 */

import { logAuditEvent } from "../audit-logger";

const mockInsert = jest.fn();

jest.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    from: () => ({ insert: (row: unknown) => mockInsert(row) }),
  }),
}));

const BASE_EVENT = {
  action: "user.delete" as const,
  actorId: "11111111-1111-1111-1111-111111111111",
  actorEmail: "admin@example.com",
  actorRole: "admin",
  targetId: "22222222-2222-2222-2222-222222222222",
  targetType: "user",
  details: { reason: "abuse" },
  ipAddress: "203.0.113.7",
  userAgent: "jest",
  success: true,
};

let errorSpy: jest.SpyInstance;

beforeEach(() => {
  jest.clearAllMocks();
  mockInsert.mockResolvedValue({ error: null });
  errorSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  errorSpy.mockRestore();
});

describe("logAuditEvent", () => {
  it("writes the canonical audit_logs columns", async () => {
    await logAuditEvent(BASE_EVENT);

    expect(mockInsert).toHaveBeenCalledTimes(1);
    const row = mockInsert.mock.calls[0][0] as Record<string, unknown>;

    expect(row).toMatchObject({
      action: "user.delete",
      user_id: BASE_EVENT.actorId,
      resource_id: BASE_EVENT.targetId,
      resource_type: "user",
      actor_email: "admin@example.com",
      actor_role: "admin",
      success: true,
    });
  });

  it("never writes the invented column names that did not exist on the table", async () => {
    await logAuditEvent(BASE_EVENT);
    const row = mockInsert.mock.calls[0][0] as Record<string, unknown>;

    expect(row).not.toHaveProperty("actor_id");
    expect(row).not.toHaveProperty("target_id");
    expect(row).not.toHaveProperty("target_type");
  });

  it("always supplies the NOT NULL resource_type, even when targetType is absent", async () => {
    await logAuditEvent({ ...BASE_EVENT, targetType: undefined });
    const row = mockInsert.mock.calls[0][0] as Record<string, unknown>;

    expect(row.resource_type).toBe("unspecified");
    expect(row.resource_type).not.toBeNull();
  });

  it("SURFACES a failed insert instead of swallowing it", async () => {
    mockInsert.mockResolvedValue({
      error: { code: "42703", message: 'column "actor_id" does not exist' },
    });

    await logAuditEvent(BASE_EVENT);

    expect(errorSpy).toHaveBeenCalledWith(
      "[audit-logger] failed to persist audit event",
      expect.objectContaining({ code: "42703", action: "user.delete" }),
    );
  });

  it("surfaces an unexpected throw without propagating it to the caller", async () => {
    mockInsert.mockRejectedValue(new Error("connection reset"));

    // Must not reject: an audit outage cannot take down the operation it audits.
    await expect(logAuditEvent(BASE_EVENT)).resolves.toBeUndefined();
    expect(errorSpy).toHaveBeenCalledWith(
      "[audit-logger] unexpected error persisting audit event",
      expect.objectContaining({ error: "connection reset" }),
    );
  });
});
