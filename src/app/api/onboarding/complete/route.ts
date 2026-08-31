/**
 * POST /api/onboarding/complete
 *
 * Marks the signed-in user's onboarding as finished.
 *
 * This exists because the mobile client was writing profiles.onboarding_completed
 * itself, and could not: the `authenticated` role has no grant on public.profiles,
 * so every one of those writes returned 42501 and the wizard could never record
 * that it had been completed (task #65). The web equivalent is the
 * complete_onboarding() function shipped in migration 20260107000000, which
 * updates onboarding_progress AND profiles in one statement — reused here rather
 * than reimplemented, so the two tables cannot drift apart.
 *
 * The user id comes from withAuth, never from the request body: a caller must not
 * be able to complete somebody else's onboarding.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { withAuth, type AuthedUser } from "@/lib/auth/api-guard";

export const POST = withAuth(
  async (_request: NextRequest, user: AuthedUser) => {
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
      );

      // SECURITY DEFINER; sets completed_at + current_step + completed_steps on
      // onboarding_progress and onboarding_completed on profiles.
      const { error } = await supabase.rpc("complete_onboarding", {
        p_user_id: user.id,
      });

      if (error) throw error;

      return NextResponse.json({ success: true, onboarding_completed: true });
    } catch (error) {
      console.error("Onboarding completion error:", error);
      // Reported honestly rather than answered 200 — the caller uses this to
      // decide whether to tell the user their setup was saved.
      return NextResponse.json(
        { error: "Failed to complete onboarding" },
        { status: 500 },
      );
    }
  },
);
