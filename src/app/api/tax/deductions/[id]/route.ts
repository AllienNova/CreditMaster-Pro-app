/**
 * Single Tax Deduction API
 *
 * PATCH  /api/tax/deductions/[id] — amend one of the caller's own deductions
 * DELETE /api/tax/deductions/[id] — remove one
 *
 * Both address a row by an id from the URL against the service-role client,
 * which bypasses RLS. The `.eq("user_id", ...)` alongside the id filter is the
 * only thing preventing a guessed uuid from editing or destroying another
 * user's tax record.
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth, type AuthedUser } from "@/lib/auth/api-guard";
import { getServiceRoleClient } from "@/lib/supabase/service-role";
import { DEDUCTION_CATEGORIES } from "@/lib/tax/deduction-categories";

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const CATEGORY_IDS = DEDUCTION_CATEGORIES.map((c) => c.id) as string[];
const MAX_AMOUNT = 100_000_000;

/** withAuth does not forward Next's route params; read the id from the path. */
function deductionIdFrom(request: NextRequest): string {
  const segments = request.nextUrl.pathname.split("/").filter(Boolean);
  return segments[segments.length - 1] ?? "";
}

interface DeductionRow {
  id: string;
  category: string;
  name: string;
  amount: string | number;
  deduction_date: string;
  document_id: string | null;
  is_verified: boolean;
  notes: string | null;
}

/** NUMERIC arrives as a string; the client declares `amount: number`. */
function toDeduction(row: DeductionRow) {
  return {
    id: row.id,
    category: row.category,
    name: row.name,
    amount: Number(row.amount),
    date: row.deduction_date,
    documentId: row.document_id ?? undefined,
    isVerified: row.is_verified,
    notes: row.notes ?? undefined,
  };
}

export const PATCH = withAuth(
  async (request: NextRequest, user: AuthedUser) => {
    const id = deductionIdFrom(request);
    if (!UUID.test(id)) {
      return NextResponse.json(
        { error: "Invalid deduction id" },
        { status: 400 },
      );
    }

    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json(
        { error: "Request body must be JSON" },
        { status: 400 },
      );
    }

    // Build the update from an ALLOWLIST. Spreading the body would let a
    // caller set user_id (moving the row to another account) or is_verified
    // (marking their own entry reviewed).
    const update: Record<string, unknown> = {};

    if (body.name !== undefined) {
      if (typeof body.name !== "string" || !body.name) {
        return NextResponse.json(
          { error: "name must be a non-empty string" },
          { status: 400 },
        );
      }
      update.name = body.name;
    }
    if (body.category !== undefined) {
      if (typeof body.category !== "string" || !CATEGORY_IDS.includes(body.category)) {
        return NextResponse.json(
          { error: `category must be one of: ${CATEGORY_IDS.join(", ")}` },
          { status: 400 },
        );
      }
      update.category = body.category;
    }
    if (body.amount !== undefined) {
      const amount = body.amount;
      if (
        typeof amount !== "number" ||
        !Number.isFinite(amount) ||
        amount < 0 ||
        amount > MAX_AMOUNT
      ) {
        return NextResponse.json(
          { error: `amount must be a number between 0 and ${MAX_AMOUNT}` },
          { status: 400 },
        );
      }
      update.amount = amount;
    }
    if (body.date !== undefined) {
      const date = body.date;
      if (
        typeof date !== "string" ||
        !/^\d{4}-\d{2}-\d{2}/.test(date) ||
        Number.isNaN(Date.parse(date))
      ) {
        return NextResponse.json(
          { error: "date must be an ISO date" },
          { status: 400 },
        );
      }
      update.deduction_date = date;
    }
    if (body.notes !== undefined) {
      update.notes = body.notes === null ? null : String(body.notes);
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json(
        { error: "No updatable fields supplied" },
        { status: 400 },
      );
    }

    // An amended deduction is no longer the one that was reviewed. Silently
    // keeping is_verified would let someone get an entry approved and then
    // change the amount underneath the approval.
    update.is_verified = false;
    update.updated_at = new Date().toISOString();

    try {
      // idor-audit: pk-owner-checked — UPDATE filtered by both id and the
      // authenticated user_id.
      const { data, error } = await getServiceRoleClient()
        .from("tax_deductions")
        .update(update)
        .eq("id", id)
        .eq("user_id", user.id)
        .select("*")
        .maybeSingle();

      if (error) {
        console.error("Failed to update tax deduction:", error);
        return NextResponse.json(
          { error: "Failed to update deduction" },
          { status: 500 },
        );
      }
      if (!data) {
        return NextResponse.json(
          { error: "Deduction not found" },
          { status: 404 },
        );
      }

      return NextResponse.json({
        success: true,
        data: toDeduction(data as DeductionRow),
      });
    } catch (error) {
      console.error("Failed to update tax deduction:", error);
      return NextResponse.json(
        { error: "Failed to update deduction" },
        { status: 500 },
      );
    }
  },
);

export const DELETE = withAuth(
  async (request: NextRequest, user: AuthedUser) => {
    const id = deductionIdFrom(request);
    if (!UUID.test(id)) {
      return NextResponse.json(
        { error: "Invalid deduction id" },
        { status: 400 },
      );
    }

    try {
      // idor-audit: pk-owner-checked — DELETE filtered by both id and the
      // authenticated user_id.
      const { data, error } = await getServiceRoleClient()
        .from("tax_deductions")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id)
        .select("id")
        .maybeSingle();

      if (error) {
        console.error("Failed to delete tax deduction:", error);
        return NextResponse.json(
          { error: "Failed to delete deduction" },
          { status: 500 },
        );
      }
      if (!data) {
        // 404 for both "no such row" and "not yours" — a 403 would confirm
        // another user's deduction exists.
        return NextResponse.json(
          { error: "Deduction not found" },
          { status: 404 },
        );
      }

      return NextResponse.json({ success: true, data: { id: data.id } });
    } catch (error) {
      console.error("Failed to delete tax deduction:", error);
      return NextResponse.json(
        { error: "Failed to delete deduction" },
        { status: 500 },
      );
    }
  },
);
