/**
 * Verify a Tax Document's Extraction
 *
 * POST /api/tax/documents/[id]/verify
 * Confirms that the values extracted from a W-2 / 1099 are correct, optionally
 * recording manual corrections.
 *
 * WHY THE CORRECTIONS MATTER. Extracted figures feed the tax engine. A user
 * confirming "yes, box 1 really is $84,320" is the step that turns an OCR
 * guess into a number worth calculating from, so the verification is recorded
 * against the verifying user and timestamped rather than being a bare boolean.
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth, type AuthedUser } from "@/lib/auth/api-guard";
import { getServiceRoleClient } from "@/lib/supabase/service-role";

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Path is /api/tax/documents/{id}/verify — the id is second from the end. */
function documentIdFrom(request: NextRequest): string {
  const segments = request.nextUrl.pathname.split("/").filter(Boolean);
  return segments[segments.length - 2] ?? "";
}

export const POST = withAuth(async (request: NextRequest, user: AuthedUser) => {
  const id = documentIdFrom(request);
  if (!UUID.test(id)) {
    return NextResponse.json({ error: "Invalid document id" }, { status: 400 });
  }

  let corrections: Record<string, unknown> | undefined;
  try {
    const body = (await request.json()) as {
      corrections?: Record<string, unknown>;
    };
    corrections = body?.corrections;
  } catch {
    // A verification with no corrections is the common case ("the extraction
    // was right"), so an absent or unparseable body is not an error.
    corrections = undefined;
  }

  if (
    corrections !== undefined &&
    (typeof corrections !== "object" || Array.isArray(corrections))
  ) {
    return NextResponse.json(
      { error: "corrections must be an object" },
      { status: 400 },
    );
  }

  const update: Record<string, unknown> = {
    is_verified: true,
    // The verifier is the AUTHENTICATED user, never a value from the body.
    verified_by: user.id,
    verified_at: new Date().toISOString(),
    requires_review: false,
    updated_at: new Date().toISOString(),
  };
  if (corrections) update.manual_corrections = corrections;

  try {
    // idor-audit: pk-owner-checked — UPDATE filtered by both id and the
    // authenticated user_id, so a guessed uuid cannot mark another user's
    // document verified.
    const { data, error } = await getServiceRoleClient()
      .from("tax_documents")
      .update(update)
      .eq("id", id)
      .eq("user_id", user.id)
      .select("*")
      .maybeSingle();

    if (error) {
      console.error("Failed to verify tax document:", error);
      return NextResponse.json(
        { error: "Failed to verify document" },
        { status: 500 },
      );
    }
    if (!data) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Failed to verify tax document:", error);
    return NextResponse.json(
      { error: "Failed to verify document" },
      { status: 500 },
    );
  }
});
