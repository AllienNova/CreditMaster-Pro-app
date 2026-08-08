/**
 * Credit Inquiries Database Service
 *
 * Provides read operations for credit-report hard/soft inquiries.
 * Reads the real, RLS-protected `credit_inquiries` table (migration
 * `20250107_credit_bureau_tables.sql`) — the normalized per-inquiry rows,
 * NOT the denormalized `credit_reports.inquiries` JSONB blob (a twin-schema
 * drift from `20250204000000_credit_repair_schema.sql`).
 *
 * The `bureau` a user sees for an inquiry lives on the parent `credit_reports`
 * row (`credit_inquiries.report_id -> credit_reports.id`), so it is embedded
 * via the foreign-key relationship rather than fabricated.
 *
 * Features:
 * - User-scoped inquiry reads (`.eq("user_id", userId)` — defense-in-depth on
 *   top of RLS)
 * - Optional filtering by inquiry type (hard | soft)
 * - Bureau resolved from the parent credit report
 * - Aggregate statistics
 * - Full error handling
 */

import { getServiceRoleClient } from "@/lib/supabase/service-role";

const supabase = getServiceRoleClient();
import type { Bureau } from "./types";

// ============================================================================
// TYPES
// ============================================================================

export type InquiryType = "hard" | "soft";

/**
 * Credit Inquiry (application shape, camelCase).
 *
 * `bureau` is optional because it is embedded from the parent credit report;
 * if that row is unreadable (e.g. RLS on the embed, or a deleted report) the
 * bureau is reported as `undefined` rather than guessed.
 */
export interface CreditInquiry {
  id: string;
  userId: string;
  reportId: string;
  inquiryType: InquiryType;
  creditorName: string;
  inquiryDate: Date;
  bureau?: Bureau;
  isDisputed: boolean;
  disputeId?: string;
  createdAt: Date;
}

/**
 * Raw `credit_inquiries` row with the embedded parent-report bureau.
 *
 * PostgREST returns a many-to-one embed (`credit_reports`) as a single object,
 * but some client/query shapes surface it as a one-element array — both are
 * handled in `extractBureau`.
 */
interface CreditInquiryRow {
  id: string;
  user_id: string;
  report_id: string;
  inquiry_type: InquiryType;
  creditor_name: string;
  inquiry_date: string;
  is_disputed: boolean | null;
  dispute_id?: string | null;
  created_at: string;
  credit_reports?:
    | { bureau: Bureau | null }
    | Array<{ bureau: Bureau | null }>
    | null;
}

const INQUIRY_SELECT =
  "id, user_id, report_id, inquiry_type, creditor_name, inquiry_date, is_disputed, dispute_id, created_at, credit_reports(bureau)";

// ============================================================================
// CREDIT INQUIRY READ OPERATIONS
// ============================================================================

/**
 * Get all credit inquiries for a user.
 *
 * User scoping is enforced with an explicit `.eq("user_id", userId)` filter
 * (defense-in-depth alongside the table's RLS). Inquiries are returned newest
 * first. When `filters.type` is set, only that inquiry type is returned.
 */
export async function getInquiriesByUser(
  userId: string,
  filters?: {
    type?: InquiryType;
    limit?: number;
    offset?: number;
  },
): Promise<CreditInquiry[]> {
  try {
    let query = supabase
      .from("credit_inquiries")
      .select(INQUIRY_SELECT)
      .eq("user_id", userId)
      .order("inquiry_date", { ascending: false });

    if (filters?.type) {
      query = query.eq("inquiry_type", filters.type);
    }

    if (filters?.offset !== undefined) {
      const limitValue = filters.limit ?? 50;
      const rangeEnd = filters.offset + limitValue - 1;
      query = query.range(filters.offset, rangeEnd);
    } else if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;

    if (error) throw error;

    const rows = (data ?? []) as unknown as CreditInquiryRow[];
    return rows.map(mapInquiryFromDb);
  } catch (error) {
    // InquiriesDB error: Error getting inquiries by user
    throw new Error(`Failed to get inquiries: ${(error as Error).message}`);
  }
}

/**
 * Get aggregate inquiry statistics for a user.
 */
export async function getInquiryStats(userId: string): Promise<{
  total: number;
  hard: number;
  soft: number;
  disputed: number;
}> {
  try {
    const inquiries = await getInquiriesByUser(userId);

    return {
      total: inquiries.length,
      hard: inquiries.filter((i) => i.inquiryType === "hard").length,
      soft: inquiries.filter((i) => i.inquiryType === "soft").length,
      disputed: inquiries.filter((i) => i.isDisputed).length,
    };
  } catch (error) {
    // InquiriesDB error: Error getting inquiry stats
    throw new Error(
      `Failed to get inquiry stats: ${(error as Error).message}`,
    );
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Resolve the bureau from the embedded parent credit report, tolerating both
 * the object and single-element-array shapes PostgREST may return. Returns
 * `undefined` when the report is unreadable or the bureau is null — never a
 * fabricated value.
 */
function extractBureau(
  embedded: CreditInquiryRow["credit_reports"],
): Bureau | undefined {
  if (!embedded) return undefined;
  const report = Array.isArray(embedded) ? embedded[0] : embedded;
  return report?.bureau ?? undefined;
}

function mapInquiryFromDb(data: CreditInquiryRow): CreditInquiry {
  return {
    id: data.id,
    userId: data.user_id,
    reportId: data.report_id,
    inquiryType: data.inquiry_type,
    creditorName: data.creditor_name,
    inquiryDate: new Date(data.inquiry_date),
    bureau: extractBureau(data.credit_reports),
    isDisputed: data.is_disputed ?? false,
    disputeId: data.dispute_id ?? undefined,
    createdAt: new Date(data.created_at),
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export const inquiriesDbService = {
  getInquiriesByUser,
  getInquiryStats,
};

export default inquiriesDbService;
