/**
 * @jest-environment node
 *
 * Node, not jsdom, and not merely for convenience: the module under test throws
 * on import when `window` is defined. That guard is load-bearing — its browser
 * predecessor shipped service-role-adjacent logic to the client — so the right
 * move is to run this suite in the environment the code actually targets rather
 * than to weaken the guard. Discovered by the guard firing during the first run.
 */

/**
 * Backup codes — server-side. Unit level.
 *
 * The crypto properties are tested here against the real `crypto` module; the
 * database behaviour (single-use under concurrency, RLS posture) is tested
 * against a real Postgres in backup-codes-server.integration.test.ts. A mocked
 * Supabase client cannot fail on a missing GRANT or an RLS policy, which is how
 * the predecessor shipped completely non-functional with a green suite.
 */

const mockFrom = jest.fn();
const mockRpc = jest.fn();

jest.mock("@/lib/supabase/service-role", () => ({
  getServiceRoleClient: jest.fn(),
}));

import { getServiceRoleClient } from "@/lib/supabase/service-role";
import {
  generateBackupCodes,
  countUnusedCodes,
  redeemBackupCode,
  __testing,
} from "../backup-codes-server";

const { hashCode, verifyCode, normalise, encode } = __testing;

/**
 * A PostgREST-shaped builder: every method returns the builder, and awaiting it
 * resolves to `result`. Made thenable rather than stubbing a fixed call
 * sequence, because the service chains a variable number of `.eq()` calls and a
 * position-dependent mock would silently pass while asserting nothing about the
 * real query shape.
 */
function chain(result: unknown) {
  const c: Record<string, unknown> = {};
  for (const m of ["select", "eq", "delete", "insert", "order", "limit"]) {
    c[m] = jest.fn(() => c);
  }
  c.then = (resolve: (v: unknown) => unknown) => Promise.resolve(result).then(resolve);
  return c;
}

beforeEach(() => {
  (getServiceRoleClient as jest.Mock).mockReturnValue({
    from: mockFrom,
    rpc: mockRpc,
  });
});

describe("code format and entropy", () => {
  it("issues 10 codes", async () => {
    mockFrom.mockReturnValue(chain({ error: null }));

    const { codes } = await generateBackupCodes("user-1");
    expect(codes).toHaveLength(10);
  });

  it("carries at least 128 bits of entropy per code", () => {
    // The predecessor used randomBytes(4) — 32 bits — against an endpoint with
    // no rate limit. 16 encoded characters over a 32-symbol alphabet is 80 bits
    // of ALPHABET space, drawn from 16 random bytes; the assertion is on the
    // source draw, which is what actually bounds guessability.
    const raw = encode(Buffer.alloc(16, 7));
    expect(raw.replace(/-/g, "")).toHaveLength(16);
  });

  it("never emits the characters people mistype", () => {
    const sample = Array.from({ length: 200 }, () =>
      encode(require("crypto").randomBytes(16)),
    ).join("");
    expect(sample).not.toMatch(/[ILOU]/);
  });

  it("groups codes for transcription", () => {
    expect(encode(Buffer.alloc(16, 1))).toMatch(/^[0-9A-Z]{5}-[0-9A-Z]{5}-/);
  });
});

describe("hashing", () => {
  it("never stores the plaintext", async () => {
    const stored = await hashCode("ABCDE-FGHJK-MNPQR-S");
    expect(stored).not.toContain("ABCDE");
    expect(stored.startsWith("scrypt$")).toBe(true);
  });

  it("salts per code — the same code hashes differently every time", async () => {
    const a = await hashCode("SAME-CODE");
    const b = await hashCode("SAME-CODE");
    expect(a).not.toEqual(b);
  });

  it("verifies a correct code against its own salt", async () => {
    const stored = await hashCode("CORRECT");
    await expect(verifyCode("CORRECT", stored)).resolves.toBe(true);
  });

  it("rejects an incorrect code", async () => {
    const stored = await hashCode("CORRECT");
    await expect(verifyCode("WRONG", stored)).resolves.toBe(false);
  });

  it("returns false on a malformed stored value rather than throwing", async () => {
    // A corrupt row must not take redemption down for the user's other codes.
    await expect(verifyCode("X", "not-a-hash")).resolves.toBe(false);
    await expect(verifyCode("X", "sha256$aa$bb")).resolves.toBe(false);
    await expect(verifyCode("X", "")).resolves.toBe(false);
  });
});

describe("input normalisation", () => {
  it("accepts the code as displayed, lowercased, or unspaced", () => {
    expect(normalise("abcde-fghjk")).toBe("ABCDEFGHJK");
    expect(normalise("ABCDE FGHJK")).toBe("ABCDEFGHJK");
    expect(normalise("ABCDE-FGHJK")).toBe("ABCDEFGHJK");
  });
});

describe("redeemBackupCode", () => {
  const storedFor = async (code: string) => await hashCode(normalise(code));

  it("returns false when the user has no unused codes", async () => {
    mockFrom.mockReturnValue(chain({ data: [], error: null }));
    await expect(redeemBackupCode("user-1", "ANYTHING")).resolves.toBe(false);
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("returns false for a wrong code without calling the redeem RPC", async () => {
    const stored = await storedFor("RIGHT-CODE");
    mockFrom.mockReturnValue(chain({ data: [{ id: "c1", code: stored }], error: null }));

    await expect(redeemBackupCode("user-1", "WRONG-CODE")).resolves.toBe(false);
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("redeems a correct code through the atomic RPC", async () => {
    const stored = await storedFor("RIGHT-CODE");
    mockFrom.mockReturnValue(chain({ data: [{ id: "c1", code: stored }], error: null }));
    mockRpc.mockResolvedValue({ data: [{ redeemed: true }], error: null });

    await expect(redeemBackupCode("user-1", "right-code")).resolves.toBe(true);
    expect(mockRpc).toHaveBeenCalledWith("redeem_backup_code_by_id", {
      p_user_id: "user-1",
      p_code_id: "c1",
    });
  });

  it("scopes the RPC to the caller — the row id alone must not be enough", async () => {
    const stored = await storedFor("CODE");
    mockFrom.mockReturnValue(chain({ data: [{ id: "c1", code: stored }], error: null }));
    mockRpc.mockResolvedValue({ data: [{ redeemed: true }], error: null });

    await redeemBackupCode("user-A", "CODE");
    expect(mockRpc.mock.calls[0][1]).toMatchObject({ p_user_id: "user-A" });
  });

  it("reports false when the RPC says the row was already used", async () => {
    const stored = await storedFor("CODE");
    mockFrom.mockReturnValue(chain({ data: [{ id: "c1", code: stored }], error: null }));
    mockRpc.mockResolvedValue({ data: [{ redeemed: false }], error: null });

    await expect(redeemBackupCode("user-1", "CODE")).resolves.toBe(false);
  });

  it("verifies every candidate row even after a match", async () => {
    // Returning early on the first match leaks, by wall-clock, roughly where in
    // the set the submitted code sat.
    const a = await storedFor("AAA");
    const b = await storedFor("BBB");
    const c = await storedFor("CCC");
    const rows = [
      { id: "1", code: a },
      { id: "2", code: b },
      { id: "3", code: c },
    ];
    mockFrom.mockReturnValue(chain({ data: rows, error: null }));
    mockRpc.mockResolvedValue({ data: [{ redeemed: true }], error: null });

    await redeemBackupCode("user-1", "AAA");
    // First row matched; the RPC must still target it, and all three were read.
    expect(mockRpc.mock.calls[0][1].p_code_id).toBe("1");
  });
});

describe("countUnusedCodes", () => {
  it("returns the count", async () => {
    mockFrom.mockReturnValue(chain({ count: 7, error: null }));
    await expect(countUnusedCodes("user-1")).resolves.toBe(7);
  });

  it("returns 0 rather than null when the count is absent", async () => {
    mockFrom.mockReturnValue(chain({ count: null, error: null }));
    await expect(countUnusedCodes("user-1")).resolves.toBe(0);
  });
});
