/**
 * Onboarding Progress API
 *
 * Saves and restores a user's position in the onboarding wizard so a closed app
 * or a dropped session resumes where they left off instead of at step 1.
 *
 * Reads and writes with the service-role client, scoped to the JWT-verified
 * user.id. It previously used the cookie-scoped `createClient()`, which works
 * for the browser but leaves a bearer-token caller — every mobile client — as
 * the `anon` role, which holds no GRANT on this table. Both verbs answered
 * HTTP 500 (`42501 permission denied for table onboarding_progress`) and wrote
 * nothing. Because 42501 is not PGRST116, the "no progress yet" branch never
 * fired, so the failure never even degraded gracefully.
 *
 * Service-role bypasses RLS, so the `.eq("user_id", user.id)` filter on the read
 * and the server-set `user_id` on the write are the whole ownership boundary.
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth, type AuthedUser } from "@/lib/auth/api-guard";
import { getServiceRoleClient } from "@/lib/supabase/service-role";

/** The wizard has five steps; the table CHECKs current_step BETWEEN 1 AND 5. */
const FIRST_STEP = 1;
const LAST_STEP = 5;

/**
 * A wizard's worth of answers is a few hundred bytes. The cap is here because
 * form_data is unvalidated client JSON landing in a jsonb column.
 */
const MAX_FORM_DATA_BYTES = 64 * 1024;

export interface OnboardingProgress {
  id?: string;
  user_id?: string;
  current_step: number;
  completed_steps: number[];
  form_data: Record<string, unknown>;
  last_updated?: string;
  completed_at?: string | null;
  created_at?: string;
}

function isStep(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= FIRST_STEP &&
    value <= LAST_STEP
  );
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * GET /api/onboarding/progress
 * Return the caller's saved progress, or the starting position if they have none.
 */
export const GET = withAuth(async (_request: NextRequest, user: AuthedUser) => {
  try {
    const supabase = getServiceRoleClient();

    // idor-audit: pk-owner-checked — scoped to the JWT-verified caller, which
    // is the only ownership boundary once service-role has bypassed RLS.
    const { data, error } = await supabase
      .from("onboarding_progress")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      // Must not become "you have not started yet": that silently restarts a
      // half-finished onboarding from step 1.
      console.error("Failed to read onboarding progress:", error);
      return NextResponse.json(
        { error: "Failed to fetch progress" },
        { status: 500 },
      );
    }

    if (!data) {
      return NextResponse.json({
        current_step: FIRST_STEP,
        completed_steps: [],
        form_data: {},
        last_updated: new Date().toISOString(),
      });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Unexpected error reading onboarding progress:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
});

/**
 * POST /api/onboarding/progress
 * Save the caller's position. Upserts on user_id, so a resave overwrites.
 */
export const POST = withAuth(async (request: NextRequest, user: AuthedUser) => {
  try {
    const body = await request.json();
    const { current_step, completed_steps, form_data } = body ?? {};

    if (!isStep(current_step)) {
      return NextResponse.json(
        {
          error: `Invalid current_step. Must be an integer between ${FIRST_STEP} and ${LAST_STEP}`,
        },
        { status: 400 },
      );
    }

    // completed_steps is an INT4[] column: a string member reaches Postgres as
    // `invalid input syntax for type integer` and surfaces as an opaque 500, so
    // the membership check has to happen here.
    if (
      !Array.isArray(completed_steps) ||
      completed_steps.length > LAST_STEP ||
      !completed_steps.every(isStep)
    ) {
      return NextResponse.json(
        {
          error: `Invalid completed_steps. Must be an array of at most ${LAST_STEP} integers between ${FIRST_STEP} and ${LAST_STEP}`,
        },
        { status: 400 },
      );
    }

    if (!isPlainObject(form_data)) {
      return NextResponse.json(
        { error: "Invalid form_data. Must be an object" },
        { status: 400 },
      );
    }

    if (JSON.stringify(form_data).length > MAX_FORM_DATA_BYTES) {
      return NextResponse.json(
        { error: "form_data is too large" },
        { status: 413 },
      );
    }

    const supabase = getServiceRoleClient();

    // idor-audit: pk-owner-checked — user_id comes from the verified token, so a
    // body carrying someone else's user_id cannot overwrite their progress.
    const { data, error } = await supabase
      .from("onboarding_progress")
      .upsert(
        {
          user_id: user.id,
          current_step,
          completed_steps,
          form_data,
          last_updated: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      )
      .select()
      .single();

    if (error) {
      console.error("Failed to save onboarding progress:", error);
      return NextResponse.json(
        { error: "Failed to save progress" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Unexpected error saving onboarding progress:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
});
