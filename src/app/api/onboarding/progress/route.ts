/**
 * Onboarding Progress API
 *
 * Handles saving and retrieving user onboarding progress for auto-save functionality
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth, type AuthedUser } from "@/lib/auth/api-guard";
import { createClient } from "@/lib/supabase/server";

export interface OnboardingProgress {
  id?: string;
  user_id?: string;
  current_step: number;
  completed_steps: number[];
  form_data: Record<string, any>;
  last_updated?: string;
  completed_at?: string | null;
  created_at?: string;
}

/**
 * GET /api/onboarding/progress
 * Retrieve user's onboarding progress
 */
export const GET = withAuth(
  async (_request: NextRequest, user: AuthedUser) => {
  try {
    const supabase = await createClient();

    // Fetch onboarding progress
    const { data, error } = await supabase
      .from("onboarding_progress")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (error) {
      // If no progress found, return default
      if (error.code === "PGRST116") {
        return NextResponse.json({
          current_step: 1,
          completed_steps: [],
          form_data: {},
          last_updated: new Date().toISOString(),
        });
      }

      // OnboardingProgressAPI error: Error fetching onboarding progress
      return NextResponse.json(
        { error: "Failed to fetch progress" },
        { status: 500 },
      );
    }

    return NextResponse.json(data);
  } catch (_error) {
    // OnboardingProgressAPI error: GET error
    void _error;
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
},
);

/**
 * POST /api/onboarding/progress
 * Save or update user's onboarding progress
 */
export const POST = withAuth(async (request: NextRequest, user: AuthedUser) => {
  try {
    const supabase = await createClient();

    // Parse request body
    const body = await request.json();
    const { current_step, completed_steps, form_data } = body;

    // Validate input
    if (
      typeof current_step !== "number" ||
      current_step < 1 ||
      current_step > 5
    ) {
      return NextResponse.json(
        { error: "Invalid current_step. Must be between 1 and 5" },
        { status: 400 },
      );
    }

    if (!Array.isArray(completed_steps)) {
      return NextResponse.json(
        { error: "Invalid completed_steps. Must be an array" },
        { status: 400 },
      );
    }

    if (typeof form_data !== "object" || form_data === null) {
      return NextResponse.json(
        { error: "Invalid form_data. Must be an object" },
        { status: 400 },
      );
    }

    // Upsert progress (insert or update)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- onboarding_progress table not in generated Supabase types
    const { data, error } = await (supabase as any)
      .from("onboarding_progress")
      .upsert(
        {
          user_id: user.id,
          current_step,
          completed_steps,
          form_data,
          last_updated: new Date().toISOString(),
        },
        {
          onConflict: "user_id",
        },
      )
      .select()
      .single();

    if (error) {
      // OnboardingProgressAPI error: Error saving onboarding progress
      return NextResponse.json(
        { error: "Failed to save progress" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (_error) {
    // OnboardingProgressAPI error: POST error
    void _error;
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
});
