/**
 * Content-Security-Policy helpers.
 *
 * Lives outside src/middleware.ts because Next treats that file specially and
 * an extra export there is a build-time risk for no benefit — the same trap
 * that broke a build when a constant was exported from a route module.
 */

/**
 * The `connect-src` entries for Supabase: the configured project's origin, and
 * the same origin over websocket for Realtime.
 *
 * Replaces a hardcoded `https://*.supabase.co wss://*.supabase.co`, which was
 * both too wide and too narrow. Too wide: that pattern permits every OTHER
 * tenant's project on supabase.co, so an injected script could exfiltrate to a
 * Supabase project the attacker controls and still satisfy the policy. Too
 * narrow: a self-hosted Supabase, or one behind a custom domain, is refused
 * outright — which is why a browser pointed at a local stack could not sign in.
 *
 * The app can only ever talk to the origin it is configured with, so allowing
 * exactly that origin is the tightest policy that still works.
 *
 * Exported so the policy can be asserted directly. A CSP is otherwise only
 * observable as a browser refusal, which is a slow and indirect way to learn
 * it is wrong.
 */
export function supabaseConnectSrc(
  url: string | undefined = process.env.NEXT_PUBLIC_SUPABASE_URL,
): string {
  // Only when the URL is absent or unparseable. A missing variable must not
  // silently produce a policy that blocks every request the app makes.
  const FALLBACK = "https://*.supabase.co wss://*.supabase.co";
  if (!url) return FALLBACK;
  try {
    const { origin, protocol, host } = new URL(url);
    const ws = protocol === "https:" ? `wss://${host}` : `ws://${host}`;
    return `${origin} ${ws}`;
  } catch {
    return FALLBACK;
  }
}
