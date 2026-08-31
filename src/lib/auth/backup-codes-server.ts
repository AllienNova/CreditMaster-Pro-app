/**
 * Backup codes — SERVER ONLY.
 *
 * Replaces the browser-side `backup-codes.ts`, which could not work: the
 * `backup_codes` table has RLS enabled with zero policies, and the redemption
 * RPC is granted to `service_role` alone. The migration that created both says
 * the RPC "is only invoked from server-side service code"; the caller was the
 * browser. Design intent and implementation had diverged.
 *
 * Three properties this module exists to hold, none of which the browser
 * version had:
 *
 *   1. The SERVER generates the codes, so their entropy is not client-supplied.
 *   2. Codes are >=128-bit (was `randomBytes(4)` — 32 bits, brute-forceable in
 *      seconds against an endpoint with no rate limit).
 *   3. Codes are stored under a per-code scrypt salt (was unsalted single-round
 *      SHA-256, which is GPU-cheap to reverse if the table leaks).
 *
 * See docs/specs/adr/0012-mfa-enforcement-and-backup-code-recovery.md.
 */

import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { getServiceRoleClient } from "@/lib/supabase/service-role";

/**
 * Hard stop if this module is ever pulled into a client bundle. The `server-only`
 * package is the idiomatic guard, but it is not a dependency of this project and
 * adding one to an auth path unasked is not a trade worth making for a check
 * three lines of code cover.
 *
 * This matters because the module it replaces WAS browser-side, so the mistake
 * has already been made once here: a `"use client"` component importing this
 * would ship service-role credentials to the browser.
 */
if (typeof window !== "undefined") {
  throw new Error(
    "backup-codes-server is server-only and must never be imported into client code",
  );
}

const scrypt = promisify(scryptCb) as (
  password: string,
  salt: Buffer,
  keylen: number,
) => Promise<Buffer>;

/** 16 bytes = 128 bits. The previous value was 4. */
const CODE_BYTES = 16;
const CODE_COUNT = 10;
const KEY_LENGTH = 32;
const SALT_BYTES = 16;

/**
 * Crockford base32 without I, L, O, U — these codes get read off a screen and
 * typed back in, often from a printout, and those four are the characters
 * people transcribe wrongly.
 */
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

export interface GeneratedCodes {
  codes: string[];
  generatedAt: string;
}

function encode(buf: Buffer): string {
  let out = "";
  for (const byte of buf) out += ALPHABET[byte % ALPHABET.length];
  // Grouped for legibility: XXXXX-XXXXX-XXXXX-X
  return (out.match(/.{1,5}/g) ?? []).join("-");
}

/** `scrypt$salt$hash`, both hex. Self-describing so the format can migrate. */
async function hashCode(code: string, salt?: Buffer): Promise<string> {
  const s = salt ?? randomBytes(SALT_BYTES);
  const derived = await scrypt(code, s, KEY_LENGTH);
  return `scrypt$${s.toString("hex")}$${derived.toString("hex")}`;
}

/**
 * Constant-time verify against a stored `scrypt$salt$hash`.
 *
 * Returns false rather than throwing on a malformed stored value: a corrupt row
 * must not take down redemption for the user's other nine codes.
 */
async function verifyCode(code: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;

  try {
    const salt = Buffer.from(parts[1], "hex");
    const expected = Buffer.from(parts[2], "hex");
    const derived = await scrypt(code, salt, expected.length);
    return timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

/** Normalise user input: strip grouping and case before comparing. */
function normalise(input: string): string {
  return input.replace(/[\s-]/g, "").toUpperCase();
}

/**
 * Replace the user's backup codes and return the plaintext EXACTLY ONCE.
 *
 * Caller must have already established that the user is at aal2 (or has no
 * enrolled factor). Enforcing that here would put an authorization decision in
 * a crypto module; it belongs in the route guard, and the route enforces it.
 */
export async function generateBackupCodes(
  userId: string,
): Promise<GeneratedCodes> {
  const supabase = getServiceRoleClient();

  const codes = Array.from({ length: CODE_COUNT }, () =>
    encode(randomBytes(CODE_BYTES)),
  );
  const rows = await Promise.all(
    codes.map(async (code) => ({
      user_id: userId,
      code: await hashCode(normalise(code)),
      used: false,
    })),
  );

  // Regeneration invalidates the previous set — that is the documented
  // behaviour of every backup-code system, and it is what makes regeneration a
  // usable response to "I think my codes leaked".
  const { error: delError } = await supabase
    .from("backup_codes")
    .delete()
    .eq("user_id", userId);
  if (delError) throw delError;

  const { error } = await supabase.from("backup_codes").insert(rows);
  if (error) throw error;

  return { codes, generatedAt: new Date().toISOString() };
}

export async function countUnusedCodes(userId: string): Promise<number> {
  const supabase = getServiceRoleClient();
  const { count, error } = await supabase
    .from("backup_codes")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("used", false);

  if (error) throw error;
  return count ?? 0;
}

/**
 * Redeem one code. Single-use, atomic, and deliberately uninformative.
 *
 * The candidate rows are scanned and EVERY one is verified even after a match,
 * so the work done does not depend on which code was submitted or whether it
 * matched at all. That is not a real constant-time guarantee — scrypt timing
 * varies, and the network dominates — but it removes the trivially observable
 * "returned early on the first row" signal.
 */
export async function redeemBackupCode(
  userId: string,
  submitted: string,
): Promise<boolean> {
  const supabase = getServiceRoleClient();
  const candidate = normalise(submitted);

  const { data, error } = await supabase
    .from("backup_codes")
    .select("id, code")
    .eq("user_id", userId)
    .eq("used", false);

  if (error) throw error;

  let matchedId: string | null = null;
  for (const row of data ?? []) {
    const ok = await verifyCode(candidate, row.code as string);
    if (ok && matchedId === null) matchedId = row.id as string;
  }

  if (matchedId === null) return false;

  // The row lock, not the check above, is what makes this single-use: two
  // concurrent redemptions of the same code both reach here, and exactly one
  // wins the FOR UPDATE (FND-010).
  const { data: result, error: rpcError } = await supabase.rpc(
    "redeem_backup_code_by_id",
    { p_user_id: userId, p_code_id: matchedId },
  );
  if (rpcError) throw rpcError;

  const row = Array.isArray(result) ? result[0] : result;
  return (row as { redeemed?: boolean } | null)?.redeemed === true;
}

export const __testing = { hashCode, verifyCode, normalise, encode };
