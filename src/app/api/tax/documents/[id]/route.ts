/**
 * Single Tax Document API
 *
 * GET    /api/tax/documents/[id] — fetch one of the caller's own documents
 * DELETE /api/tax/documents/[id] — remove one of the caller's own documents
 *
 * Tax documents are W-2s, 1099s and their extracted contents. Both handlers use
 * the service-role client, which bypasses RLS entirely, so the
 * `.eq("user_id", ...)` below is the ONLY access control standing between a
 * guessed uuid and another user's income data.
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth, type AuthedUser } from "@/lib/auth/api-guard";
import { getServiceRoleClient } from "@/lib/supabase/service-role";

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * The document id from the path.
 *
 * withAuth does not forward Next's route `params` (api-guard.ts:156 takes the
 * request alone), so it is read from the pathname — the same approach
 * /api/disputes/[id] uses.
 */
function documentIdFrom(request: NextRequest): string {
  const segments = request.nextUrl.pathname.split("/").filter(Boolean);
  return segments[segments.length - 1] ?? "";
}

export const GET = withAuth(async (request: NextRequest, user: AuthedUser) => {
  const id = documentIdFrom(request);
  if (!UUID.test(id)) {
    return NextResponse.json({ error: "Invalid document id" }, { status: 400 });
  }

  try {
    // idor-audit: pk-owner-checked — SELECT filtered by both id and the
    // authenticated user_id; a row belonging to another user returns no rows.
    const { data, error } = await getServiceRoleClient()
      .from("tax_documents")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      console.error("Failed to load tax document:", error);
      return NextResponse.json(
        { error: "Failed to load document" },
        { status: 500 },
      );
    }
    if (!data) {
      // 404 covers both "no such document" and "not yours" — answering 403 for
      // the second confirms another user's document exists.
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Failed to load tax document:", error);
    return NextResponse.json(
      { error: "Failed to load document" },
      { status: 500 },
    );
  }
});

export const DELETE = withAuth(
  async (request: NextRequest, user: AuthedUser) => {
    const id = documentIdFrom(request);
    if (!UUID.test(id)) {
      return NextResponse.json(
        { error: "Invalid document id" },
        { status: 400 },
      );
    }

    try {
      // idor-audit: pk-owner-checked — DELETE filtered by both id and the
      // authenticated user_id. Without user_id a guessed uuid would destroy
      // another user's tax record.
      const supabase = getServiceRoleClient();

      const { data, error } = await supabase
        .from("tax_documents")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id)
        .select("id, storage_path")
        .maybeSingle();

      if (error) {
        console.error("Failed to delete tax document:", error);
        return NextResponse.json(
          { error: "Failed to delete document" },
          { status: 500 },
        );
      }
      if (!data) {
        // A delete that matched no row must not report success, or the UI
        // removes a document the server still holds.
        return NextResponse.json(
          { error: "Document not found" },
          { status: 404 },
        );
      }

      // The FILE, not just the row. The collection-level DELETE in
      // ../route.ts already does this; a row-only delete here would leave the
      // user's W-2 in the bucket after they deleted it, and would make the two
      // delete paths behave differently for the same action.
      if (data.storage_path) {
        const { error: storageError } = await supabase.storage
          .from("tax-documents")
          .remove([data.storage_path]);
        // The row is already gone, so this cannot be undone by failing the
        // request — but an orphaned tax document in storage must be visible
        // to an operator rather than silent.
        if (storageError) {
          console.error(
            "Tax document row deleted but its file remains:",
            data.storage_path,
            storageError,
          );
        }
      }

      // idor-audit: pk-owner-checked — INSERT writes `user_id` from the authenticated caller; there is no prior row to filter on
      await supabase.from("tax_audit_log").insert({
        user_id: user.id,
        action_type: "document_deleted",
        entity_type: "tax_document",
        entity_id: id,
      });

      return NextResponse.json({ success: true, data: { id: data.id } });
    } catch (error) {
      console.error("Failed to delete tax document:", error);
      return NextResponse.json(
        { error: "Failed to delete document" },
        { status: 500 },
      );
    }
  },
);
