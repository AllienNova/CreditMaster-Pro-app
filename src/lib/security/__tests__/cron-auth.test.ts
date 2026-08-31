/**
 * @jest-environment node
 *
 * The cron gate must fail CLOSED.
 *
 * Found by an independent second-opinion review (DeepSeek V4 Pro) of the Wave 7
 * remediation diff. Every cron route compared the incoming header against a
 * template literal:
 *
 *     timingSafeEqual(authHeader, `Bearer ${process.env.CRON_SECRET}`)
 *
 * When CRON_SECRET is unset that template evaluates to the literal string
 * "Bearer undefined". The timing-safe wrapper length-guards and never throws,
 * so a request carrying exactly that header compares equal and authenticates.
 * Nothing in the repo enforced the variable's presence — scripts/check-env.js
 * did not list it — so a single missing production env var opened all five
 * routes to anyone who guessed the four-word string.
 *
 * /api/cron/dispute-followups was worse still: it guarded with
 * `CRON_SECRET && !timingSafeEqual(...)`, so an unset secret made the whole
 * condition false and the route rejected nobody at all — no header required.
 *
 * The blast radius is cross-user mutation: deleting sessions for every user,
 * flipping dispute statuses, sending reminder emails, writing snapshot rows.
 * It also undermined the IDOR ratchet, whose cross-user exemptions on these
 * routes are justified by comments reading "the route is gated by CRON_SECRET".
 * Those exemptions are only sound if the gate actually holds.
 *
 * These tests pin the fail-closed behaviour in both directions.
 */

import { verifyCronRequest } from "../cron-auth";

const ORIGINAL = process.env.CRON_SECRET;

function requestWith(authorization?: string): Request {
  const headers = new Headers();
  if (authorization !== undefined) headers.set("authorization", authorization);
  return new Request("https://example.com/api/cron/anything", { headers });
}

afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.CRON_SECRET;
  else process.env.CRON_SECRET = ORIGINAL;
});

describe("verifyCronRequest — fails closed when the secret is absent", () => {
  it("rejects every request when CRON_SECRET is unset", () => {
    delete process.env.CRON_SECRET;
    expect(verifyCronRequest(requestWith("Bearer anything"))).toBe(false);
  });

  it("rejects the literal 'Bearer undefined' — the exact string the template produced", () => {
    delete process.env.CRON_SECRET;
    expect(verifyCronRequest(requestWith("Bearer undefined"))).toBe(false);
  });

  it("rejects when CRON_SECRET is set but empty", () => {
    process.env.CRON_SECRET = "";
    expect(verifyCronRequest(requestWith("Bearer "))).toBe(false);
  });

  it("rejects a request with no authorization header at all", () => {
    delete process.env.CRON_SECRET;
    expect(verifyCronRequest(requestWith())).toBe(false);
  });
});

describe("verifyCronRequest — still authenticates a correctly configured caller", () => {
  const SECRET = "s3cr3t-cron-value-not-a-real-secret";

  beforeEach(() => {
    process.env.CRON_SECRET = SECRET;
  });

  it("accepts the matching bearer token", () => {
    expect(verifyCronRequest(requestWith(`Bearer ${SECRET}`))).toBe(true);
  });

  it("rejects a wrong secret of the same length", () => {
    const wrong = "X".repeat(SECRET.length);
    expect(verifyCronRequest(requestWith(`Bearer ${wrong}`))).toBe(false);
  });

  it("rejects a wrong secret of a different length", () => {
    expect(verifyCronRequest(requestWith("Bearer short"))).toBe(false);
  });

  it("rejects a missing authorization header", () => {
    expect(verifyCronRequest(requestWith())).toBe(false);
  });

  it("rejects the bare secret without the Bearer scheme", () => {
    expect(verifyCronRequest(requestWith(SECRET))).toBe(false);
  });

  it("rejects 'Bearer undefined' when a real secret IS configured", () => {
    expect(verifyCronRequest(requestWith("Bearer undefined"))).toBe(false);
  });
});
