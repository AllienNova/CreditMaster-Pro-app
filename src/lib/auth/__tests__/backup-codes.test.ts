/**
 * @jest-environment node
 */

const mockRpc = jest.fn();
const mockFrom = jest.fn();

jest.mock("@/lib/supabase/client", () => ({
  getSupabase: () => ({
    rpc: mockRpc,
    from: mockFrom,
  }),
}));

import { backupCodesService } from "../backup-codes";

describe("BackupCodesService.verifyBackupCode (FND-010)", () => {
  beforeEach(() => {
    mockRpc.mockReset();
    mockFrom.mockReset();
  });

  it("redeems a valid code via the atomic redeem_backup_code RPC", async () => {
    mockRpc.mockResolvedValue({ data: [{ redeemed: true }], error: null });

    const result = await backupCodesService.verifyBackupCode(
      "user-1",
      "ABCD1234",
    );

    expect(result.success).toBe(true);
    expect(mockRpc).toHaveBeenCalledWith(
      "redeem_backup_code",
      expect.objectContaining({ p_user_id: "user-1" }),
    );
    // Must NOT use a read-then-write query builder path.
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("rejects a code the atomic RPC reports as not redeemed", async () => {
    mockRpc.mockResolvedValue({ data: [{ redeemed: false }], error: null });

    const result = await backupCodesService.verifyBackupCode(
      "user-1",
      "ALREADYUSED",
    );

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it("for two concurrent redemptions of the same code, exactly one succeeds", async () => {
    // The atomic RPC serializes: first call wins, second sees it already used.
    mockRpc
      .mockResolvedValueOnce({ data: [{ redeemed: true }], error: null })
      .mockResolvedValueOnce({ data: [{ redeemed: false }], error: null });

    const [first, second] = await Promise.all([
      backupCodesService.verifyBackupCode("user-1", "RACECODE"),
      backupCodesService.verifyBackupCode("user-1", "RACECODE"),
    ]);

    const successes = [first, second].filter((r) => r.success);
    expect(successes).toHaveLength(1);
  });

  it("surfaces an RPC error as a failed result", async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: "db unavailable" },
    });

    const result = await backupCodesService.verifyBackupCode(
      "user-1",
      "ABCD1234",
    );

    expect(result.success).toBe(false);
  });
});
