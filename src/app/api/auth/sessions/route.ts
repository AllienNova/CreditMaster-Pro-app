/**
 * Active session management — list and revoke.
 *
 * WHY THIS ROUTE EXISTS. `SessionManagement.tsx` is a client component that
 * imported `sessionService` directly, which queries `public.sessions` through
 * the BROWSER anon client. `sessions` grants `authenticated` no table
 * privilege, so every one of those requests came back
 *
 *   403 GET http://127.0.0.1:54321/rest/v1/sessions?select=*&user_id=eq.…
 *
 * and /settings/security could neither list sessions nor revoke them. Session
 * revocation is a security control, so "the page renders" was hiding a control
 * that did not work at all.
 *
 * The missing grant is deliberate (see
 * supabase/migrations/20260731000009_financial_accounts_revoke_authenticated.sql):
 * a role with no grant fails loudly instead of silently returning zero rows.
 * The fix is therefore NOT to grant the browser access to the table — it is to
 * stop reading the table from the browser. Reads and deletes happen here, under
 * the service role, scoped to the authenticated caller.
 *
 * The service role BYPASSES RLS, so `user.id` from the auth guard — never a
 * client-supplied id — is the only thing preventing one user from listing or
 * revoking another user's sessions.
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth, type AuthedUser } from "@/lib/auth/api-guard";
import { getServiceRoleClient } from "@/lib/supabase/service-role";
import type { Session } from "@/lib/auth/session-service";

/* eslint-disable @typescript-eslint/no-explicit-any */
// `sessions` is not modelled in the generated Database types (see G-022 —
// types.ts drifts from the live schema), which degrades the query builder.
const sessions = () => getServiceRoleClient().from("sessions") as any;

/**
 * `public.sessions` stores only: id, user_id, token_hash, user_agent,
 * ip_address, last_activity, expires_at, created_at.
 *
 * The `Session` type the UI renders also promises deviceName / deviceType /
 * browser / os, and none of those are columns. They are DERIVED from the stored
 * user_agent rather than defaulted to "Unknown": this screen exists so a user
 * can spot a session they do not recognise and revoke it, and a list of five
 * identical "Unknown device" rows makes that impossible. Nothing is invented —
 * an absent or unrecognised user_agent yields "Unknown", not a plausible guess.
 */
function describeUserAgent(ua: string | null | undefined): {
  deviceName: string;
  deviceType: Session["deviceType"];
  browser: string;
  os: string;
} {
  if (!ua) {
    return {
      deviceName: "Unknown device",
      deviceType: "unknown",
      browser: "Unknown",
      os: "Unknown",
    };
  }

  const os =
    /Windows/i.test(ua) ? "Windows"
    : /iPhone|iPad|iPod/i.test(ua) ? "iOS"
    : /Mac OS X|Macintosh/i.test(ua) ? "macOS"
    : /Android/i.test(ua) ? "Android"
    : /Linux/i.test(ua) ? "Linux"
    : "Unknown";

  // Order matters: Edge and Chrome both carry "Chrome", Safari appears in
  // nearly every UA string, so the most specific token must win.
  const browser =
    /Edg\//i.test(ua) ? "Edge"
    : /OPR\/|Opera/i.test(ua) ? "Opera"
    : /Firefox\//i.test(ua) ? "Firefox"
    : /Chrome\//i.test(ua) ? "Chrome"
    : /Safari\//i.test(ua) ? "Safari"
    : "Unknown";

  const deviceType: Session["deviceType"] =
    /iPad|Tablet/i.test(ua) ? "tablet"
    : /Mobi|iPhone|Android.*Mobile/i.test(ua) ? "mobile"
    : os === "Unknown" ? "unknown"
    : "desktop";

  const deviceName =
    browser === "Unknown" && os === "Unknown"
      ? "Unknown device"
      : `${browser} on ${os}`;

  return { deviceName, deviceType, browser, os };
}

/** Maps a DB row to the `Session` shape the settings UI already renders. */
function mapRow(row: any, currentSessionId?: string): Session {
  const agent = describeUserAgent(row.user_agent);
  return {
    id: row.id,
    userId: row.user_id,
    deviceName: agent.deviceName,
    deviceType: agent.deviceType,
    browser: agent.browser,
    os: agent.os,
    ipAddress: row.ip_address ?? "",
    // No `location` column exists and none is derived — an IP is not a location
    // without a geo lookup this route does not perform.
    location: undefined,
    createdAt: new Date(row.created_at),
    // `last_activity`, NOT `last_active_at` — the latter does not exist on
    // public.sessions and previously made PostgREST reject the whole query.
    lastActiveAt: new Date(row.last_activity ?? row.created_at),
    expiresAt: new Date(row.expires_at),
    isCurrent: currentSessionId ? row.id === currentSessionId : false,
  };
}

/** GET /api/auth/sessions — the caller's own unexpired sessions. */
export const GET = withAuth(async (request: NextRequest, user: AuthedUser) => {
  try {
    const currentSessionId =
      request.nextUrl.searchParams.get("currentSessionId") ?? undefined;

    const { data, error } = await sessions()
      .select("*")
      .eq("user_id", user.id)
      .gt("expires_at", new Date().toISOString())
      .order("last_activity", { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: "Failed to load sessions" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      data: (data ?? []).map((row: any) => mapRow(row, currentSessionId)),
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to load sessions" },
      { status: 500 },
    );
  }
});

/**
 * DELETE /api/auth/sessions?sessionId=<id>  — revoke one session
 * DELETE /api/auth/sessions?allExcept=<id>  — revoke every OTHER session
 *
 * Both delete paths carry `.eq("user_id", user.id)`. A caller passing someone
 * else's sessionId deletes nothing rather than deleting their session.
 */
export const DELETE = withAuth(
  async (request: NextRequest, user: AuthedUser) => {
    try {
      const sessionId = request.nextUrl.searchParams.get("sessionId");
      const allExcept = request.nextUrl.searchParams.get("allExcept");

      if (!sessionId && !allExcept) {
        return NextResponse.json(
          { error: "Either sessionId or allExcept is required" },
          { status: 400 },
        );
      }

      const query = allExcept
        ? sessions().delete().eq("user_id", user.id).neq("id", allExcept)
        : sessions().delete().eq("user_id", user.id).eq("id", sessionId);

      const { error } = await query;

      if (error) {
        return NextResponse.json(
          { error: "Failed to revoke session" },
          { status: 500 },
        );
      }

      return NextResponse.json({ success: true });
    } catch {
      return NextResponse.json(
        { error: "Failed to revoke session" },
        { status: 500 },
      );
    }
  },
);
