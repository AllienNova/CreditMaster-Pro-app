/**
 * The Supabase entry in the CSP `connect-src` directive.
 *
 * A CSP is normally only observable as a browser refusal, which is a slow and
 * indirect way to learn it is wrong — and it went wrong in both directions at
 * once. It read `https://*.supabase.co wss://*.supabase.co`, which permits
 * every OTHER tenant's project on supabase.co (an injected script could
 * exfiltrate to an attacker's Supabase and satisfy the policy), while refusing
 * any Supabase that is self-hosted or behind a custom domain.
 *
 * Found by trying to sign in to a production build against a local stack:
 *
 *   Connecting to 'http://127.0.0.1:54321/auth/v1/token?grant_type=password'
 *   violates the following Content Security Policy directive: "connect-src…"
 */

import { supabaseConnectSrc } from "../csp";

describe("supabaseConnectSrc", () => {
  it("allows exactly the configured project, not every project on supabase.co", () => {
    const src = supabaseConnectSrc("https://abcdefgh.supabase.co");
    expect(src).toBe("https://abcdefgh.supabase.co wss://abcdefgh.supabase.co");
    // The whole point: another tenant's project must not match.
    expect(src).not.toContain("*");
  });

  it("allows a local stack when that is what the app is configured with", () => {
    expect(supabaseConnectSrc("http://127.0.0.1:54321")).toBe(
      "http://127.0.0.1:54321 ws://127.0.0.1:54321",
    );
  });

  it("allows a self-hosted Supabase behind a custom domain", () => {
    expect(supabaseConnectSrc("https://db.example.com")).toBe(
      "https://db.example.com wss://db.example.com",
    );
  });

  it("uses ws:// for http and wss:// for https", () => {
    expect(supabaseConnectSrc("http://localhost:54321")).toContain(
      "ws://localhost:54321",
    );
    expect(supabaseConnectSrc("https://x.supabase.co")).toContain(
      "wss://x.supabase.co",
    );
  });

  it("drops any path, since connect-src matches origins", () => {
    expect(supabaseConnectSrc("https://x.supabase.co/rest/v1/")).toBe(
      "https://x.supabase.co wss://x.supabase.co",
    );
  });

  it("keeps a non-default port, which is the whole of a local setup", () => {
    expect(supabaseConnectSrc("http://127.0.0.1:54321")).toContain(":54321");
  });

  it.each([
    ["empty", ""],
    ["not a URL", "not-a-url"],
  ])("falls back to the wildcard when the URL is %s", (_d, url) => {
    // A missing variable must not produce a policy that blocks every request
    // the app makes — that would take the whole app down rather than one call.
    expect(supabaseConnectSrc(url)).toBe(
      "https://*.supabase.co wss://*.supabase.co",
    );
  });

  it("falls back to the wildcard when the env var is unset", () => {
    // Passing `undefined` does NOT test this: it is the default-parameter
    // value, so the function reads the environment anyway. The absent case has
    // to be created by removing the variable.
    const saved = process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    try {
      expect(supabaseConnectSrc()).toBe(
        "https://*.supabase.co wss://*.supabase.co",
      );
    } finally {
      if (saved === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      else process.env.NEXT_PUBLIC_SUPABASE_URL = saved;
    }
  });

  it("reads the environment when called with no argument", () => {
    const saved = process.env.NEXT_PUBLIC_SUPABASE_URL;
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://from-env.supabase.co";
    try {
      expect(supabaseConnectSrc()).toBe(
        "https://from-env.supabase.co wss://from-env.supabase.co",
      );
    } finally {
      if (saved === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      else process.env.NEXT_PUBLIC_SUPABASE_URL = saved;
    }
  });
});
