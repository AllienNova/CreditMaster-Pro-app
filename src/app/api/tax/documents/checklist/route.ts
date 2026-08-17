/**
 * Tax Document Checklist API
 *
 * GET /api/tax/documents/checklist[?year=YYYY]
 * Which tax documents the caller still needs for the year, and which have
 * already been uploaded.
 *
 * WHY IT READS THE PROFILE. A fixed "here is every tax form" list would tell a
 * W-2 employee with no investments that they are missing a 1099-B and a K-1,
 * which is both wrong and alarming. What is REQUIRED depends on the income the
 * user actually has, so the requirement set is derived from their tax profile
 * and only the rest is offered as optional.
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth, type AuthedUser } from "@/lib/auth/api-guard";
import { createClient } from "@/lib/supabase/server";
import { getServiceRoleClient } from "@/lib/supabase/service-role";
import { fetchTaxProfile } from "@/lib/tax/tax-profile-repository";

interface ChecklistItem {
  type: string;
  label: string;
  received: boolean;
}

/** Human labels for the document types the processor recognises. */
const LABELS: Record<string, string> = {
  w2: "W-2 (wages)",
  "1099_int": "1099-INT (interest income)",
  "1099_div": "1099-DIV (dividends)",
  "1099_b": "1099-B (investment sales)",
  "1099_nec": "1099-NEC (self-employment income)",
  "1099_misc": "1099-MISC (other income)",
  "1099_r": "1099-R (retirement distributions)",
  "1099_g": "1099-G (government payments)",
  "1099_ssa": "1099-SSA (social security)",
  k1: "K-1 (partnership / S-corp)",
  "1098": "1098 (mortgage interest)",
  "1098_e": "1098-E (student loan interest)",
  "1098_t": "1098-T (tuition)",
  "5498": "5498 (IRA contributions)",
  charitable_receipt: "Charitable donation receipts",
  medical_receipt: "Medical expense receipts",
  property_tax: "Property tax statement",
};

const ALL_TYPES = Object.keys(LABELS);

export const GET = withAuth(async (request: NextRequest, user: AuthedUser) => {
  const raw = request.nextUrl.searchParams.get("year");
  let year = new Date().getFullYear();
  if (raw !== null) {
    const parsed = Number(raw);
    if (!Number.isInteger(parsed)) {
      return NextResponse.json(
        { error: "year must be a four-digit year" },
        { status: 400 },
      );
    }
    year = parsed;
  }

  try {
    const supabase = await createClient();
    const profile = await fetchTaxProfile(user.id, year);

    // idor-audit: pk-owner-checked — SELECT filtered by the authenticated
    // user_id; a checklist must reflect this caller's own uploads only.
    const { data: documents, error } = await getServiceRoleClient()
      .from("tax_documents")
      .select("document_type")
      .eq("user_id", user.id)
      .eq("tax_year", year);

    if (error) {
      // A read failure must not render as "you have uploaded nothing" — that
      // would tell someone to re-upload documents they already hold.
      console.error("Failed to read tax documents for checklist:", error);
      return NextResponse.json(
        { error: "Failed to build document checklist" },
        { status: 500 },
      );
    }

    const received = new Set(
      (documents ?? []).map((d: { document_type: string }) => d.document_type),
    );

    // Required is derived from the profile's actual income sources. With no
    // profile the honest answer is that nothing is known to be required yet,
    // rather than inventing a requirement set from a default filer.
    const requiredTypes: string[] = [];
    if (profile) {
      if (profile.w2Income > 0) requiredTypes.push("w2");
      if (profile.interestIncome > 0) requiredTypes.push("1099_int");
      if (profile.dividendIncome > 0) requiredTypes.push("1099_div");
      if (
        profile.capitalGainsShortTerm > 0 ||
        profile.capitalGainsLongTerm > 0
      ) {
        requiredTypes.push("1099_b");
      }
      if (profile.selfEmploymentIncome > 0) requiredTypes.push("1099_nec");
      if (profile.retirementIncome > 0) requiredTypes.push("1099_r");
    }

    const toItem = (type: string): ChecklistItem => ({
      type,
      label: LABELS[type] ?? type,
      received: received.has(type),
    });

    return NextResponse.json({
      success: true,
      data: {
        required: requiredTypes.map(toItem),
        optional: ALL_TYPES.filter((t) => !requiredTypes.includes(t)).map(
          toItem,
        ),
        year,
        profileMissing: !profile,
      },
    });
  } catch (error) {
    console.error("Failed to build document checklist:", error);
    return NextResponse.json(
      { error: "Failed to build document checklist" },
      { status: 500 },
    );
  }
});
