/**
 * Credit Reports Database Service
 * 
 * Provides database operations for credit report management.
 * Includes full CRUD operations, bureau filtering, and TypeScript types.
 * 
 * Features:
 * - Credit report CRUD operations
 * - Bureau filtering (Experian, Equifax, TransUnion)
 * - Score tracking over time
 * - Account, inquiry, and collection tracking
 * - Full error handling
 */

import { getSupabase } from '@/lib/supabase/client';

const supabase = getSupabase();
import type { Bureau, CreditReport } from './types';

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };
type JsonRecord = Record<string, JsonValue>;

// ============================================================================
// TYPES
// ============================================================================

export interface CreateCreditReportInput {
  userId: string;
  reportData: JsonRecord;
  bureau: Bureau;
  reportDate: Date;
  score?: number;
  accounts?: JsonRecord[];
  inquiries?: JsonRecord[];
  collections?: JsonRecord[];
  publicRecords?: JsonRecord[];
}

export interface UpdateCreditReportInput {
  reportData?: JsonRecord;
  bureau?: Bureau;
  reportDate?: Date;
  score?: number;
  accounts?: JsonRecord[];
  inquiries?: JsonRecord[];
  collections?: JsonRecord[];
  publicRecords?: JsonRecord[];
}

interface CreditReportRow {
  id: string;
  user_id: string;
  report_data: JsonRecord;
  bureau: Bureau;
  report_date: string;
  score?: number | null;
  accounts?: JsonRecord[] | null;
  inquiries?: JsonRecord[] | null;
  collections?: JsonRecord[] | null;
  public_records?: JsonRecord[] | null;
  created_at: string;
  updated_at: string;
}

type CreditScoreHistoryRow = {
  report_date: string;
  score: number;
  bureau: Bureau;
};

type CreditReportUpdateRow = Partial<{
  report_data: JsonRecord;
  bureau: Bureau;
  report_date: string;
  score: number;
  accounts: JsonRecord[];
  inquiries: JsonRecord[];
  collections: JsonRecord[];
  public_records: JsonRecord[];
}>;

// ============================================================================
// CREDIT REPORT CRUD OPERATIONS
// ============================================================================

/**
 * Create a new credit report
 */
export async function createCreditReport(
  input: CreateCreditReportInput
): Promise<CreditReport> {
  try {
    const { data, error } = await supabase
      .from('credit_reports')
      .insert({
        user_id: input.userId,
        report_data: input.reportData,
        bureau: input.bureau,
        report_date: input.reportDate.toISOString().split('T')[0],
        score: input.score,
        accounts: input.accounts,
        inquiries: input.inquiries,
        collections: input.collections,
        public_records: input.publicRecords,
      })
      .select()
      .single();

    if (error) throw error;

    return mapCreditReportFromDb(data as CreditReportRow);
  } catch (error) {
    // CreditReportsDB error: Error creating credit report
    throw new Error(`Failed to create credit report: ${(error as Error).message}`);
  }
}

/**
 * Get a single credit report by ID
 */
export async function getCreditReport(
  reportId: string,
  userId: string
): Promise<CreditReport | null> {
  try {
    const { data, error } = await supabase
      .from('credit_reports')
      .select('*')
      .eq('id', reportId)
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw error;
    }

    return data ? mapCreditReportFromDb(data as CreditReportRow) : null;
  } catch (error) {
    // CreditReportsDB error: Error getting credit report
    throw new Error(`Failed to get credit report: ${(error as Error).message}`);
  }
}

/**
 * Get all credit reports for a user
 */
export async function getCreditReportsByUser(
  userId: string,
  filters?: {
    bureau?: Bureau;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }
): Promise<CreditReport[]> {
  try {
    let query = supabase
      .from('credit_reports')
      .select('*')
      .eq('user_id', userId)
      .order('report_date', { ascending: false });

    if (filters?.bureau) {
      query = query.eq('bureau', filters.bureau);
    }

    if (filters?.startDate) {
      query = query.gte('report_date', filters.startDate.toISOString().split('T')[0]);
    }

    if (filters?.endDate) {
      query = query.lte('report_date', filters.endDate.toISOString().split('T')[0]);
    }

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;

    if (error) throw error;

    const rows = (data ?? []) as CreditReportRow[];
    return rows.map(mapCreditReportFromDb);
  } catch (error) {
    // CreditReportsDB error: Error getting credit reports by user
    throw new Error(`Failed to get credit reports: ${(error as Error).message}`);
  }
}

/**
 * Get latest credit report for a bureau
 */
export async function getLatestCreditReport(
  userId: string,
  bureau: Bureau
): Promise<CreditReport | null> {
  try {
    const { data, error } = await supabase
      .from('credit_reports')
      .select('*')
      .eq('user_id', userId)
      .eq('bureau', bureau)
      .order('report_date', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw error;
    }

    return mapCreditReportFromDb(data as CreditReportRow);
  } catch (error) {
    // CreditReportsDB error: Error getting latest credit report
    throw new Error(`Failed to get latest credit report: ${(error as Error).message}`);
  }
}

/**
 * Get credit reports by bureau
 */
export async function getCreditReportsByBureau(
  userId: string,
  bureau: Bureau,
  limit?: number
): Promise<CreditReport[]> {
  try {
    let query = supabase
      .from('credit_reports')
      .select('*')
      .eq('user_id', userId)
      .eq('bureau', bureau)
      .order('report_date', { ascending: false });

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) throw error;

    const rows = (data ?? []) as CreditReportRow[];
    return rows.map(mapCreditReportFromDb);
  } catch (error) {
    // CreditReportsDB error: Error getting credit reports by bureau
    throw new Error(`Failed to get credit reports by bureau: ${(error as Error).message}`);
  }
}

/**
 * Update a credit report
 */
export async function updateCreditReport(
  reportId: string,
  userId: string,
  updates: UpdateCreditReportInput
): Promise<CreditReport> {
  try {
    const updateData: CreditReportUpdateRow = {};

    if (updates.reportData !== undefined) updateData.report_data = updates.reportData;
    if (updates.bureau !== undefined) updateData.bureau = updates.bureau;
    if (updates.reportDate !== undefined) updateData.report_date = updates.reportDate.toISOString().split('T')[0];
    if (updates.score !== undefined) updateData.score = updates.score;
    if (updates.accounts !== undefined) updateData.accounts = updates.accounts;
    if (updates.inquiries !== undefined) updateData.inquiries = updates.inquiries;
    if (updates.collections !== undefined) updateData.collections = updates.collections;
    if (updates.publicRecords !== undefined) updateData.public_records = updates.publicRecords;

    const { data, error } = await supabase
      .from('credit_reports')
      .update(updateData)
      .eq('id', reportId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;

    return mapCreditReportFromDb(data as CreditReportRow);
  } catch (error) {
    // CreditReportsDB error: Error updating credit report
    throw new Error(`Failed to update credit report: ${(error as Error).message}`);
  }
}

/**
 * Delete a credit report
 */
export async function deleteCreditReport(
  reportId: string,
  userId: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('credit_reports')
      .delete()
      .eq('id', reportId)
      .eq('user_id', userId);

    if (error) throw error;

    return true;
  } catch (error) {
    // CreditReportsDB error: Error deleting credit report
    throw new Error(`Failed to delete credit report: ${(error as Error).message}`);
  }
}

/**
 * Get credit score history
 */
export async function getCreditScoreHistory(
  userId: string,
  bureau?: Bureau,
  limit?: number
): Promise<Array<{ date: Date; score: number; bureau: Bureau }>> {
  try {
    let query = supabase
      .from('credit_reports')
      .select('report_date, score, bureau')
      .eq('user_id', userId)
      .not('score', 'is', null)
      .order('report_date', { ascending: true });

    if (bureau) {
      query = query.eq('bureau', bureau);
    }

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) throw error;

    const rows = (data ?? []) as CreditScoreHistoryRow[];

    return rows.map((item) => ({
      date: new Date(item.report_date),
      score: item.score,
      bureau: item.bureau,
    }));
  } catch (error) {
    // CreditReportsDB error: Error getting credit score history
    throw new Error(`Failed to get credit score history: ${(error as Error).message}`);
  }
}

/**
 * Get credit report statistics
 */
export async function getCreditReportStats(
  userId: string
): Promise<{
  totalReports: number;
  byBureau: Record<Bureau, number>;
  latestScores: Record<Bureau, number | null>;
  averageScore: number;
  scoreChange: number;
}> {
  try {
    const reports = await getCreditReportsByUser(userId);

    const totalReports = reports.length;

    // Count by bureau
    const byBureau: Record<string, number> = {};
    for (const report of reports) {
      byBureau[report.bureau] = (byBureau[report.bureau] || 0) + 1;
    }

    // Get latest scores by bureau
    const latestScores: Record<string, number | null> = {};
    for (const bureau of ['experian', 'equifax', 'transunion'] as Bureau[]) {
      const latest = await getLatestCreditReport(userId, bureau);
      latestScores[bureau] = latest?.score || null;
    }

    // Calculate average score
    const scoresWithValues = Object.values(latestScores).filter((s) => s !== null) as number[];
    const averageScore = scoresWithValues.length > 0
      ? scoresWithValues.reduce((sum, s) => sum + s, 0) / scoresWithValues.length
      : 0;

    // Calculate score change (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const oldReports = await getCreditReportsByUser(userId, {
      endDate: thirtyDaysAgo,
      limit: 3,
    });
    const oldScores = oldReports.filter((r) => r.score).map((r) => r.score!);
    const oldAverageScore = oldScores.length > 0
      ? oldScores.reduce((sum, s) => sum + s, 0) / oldScores.length
      : 0;
    const scoreChange = averageScore - oldAverageScore;

    return {
      totalReports,
      byBureau: byBureau as Record<Bureau, number>,
      latestScores: latestScores as Record<Bureau, number | null>,
      averageScore,
      scoreChange,
    };
  } catch (error) {
    // CreditReportsDB error: Error getting credit report stats
    throw new Error(`Failed to get credit report stats: ${(error as Error).message}`);
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function mapCreditReportFromDb(data: CreditReportRow): CreditReport {
  return {
    id: data.id,
    userId: data.user_id,
    reportData: data.report_data,
    bureau: data.bureau,
    reportDate: new Date(data.report_date),
    score: data.score ?? undefined,
    accounts: data.accounts ?? undefined,
    inquiries: data.inquiries ?? undefined,
    collections: data.collections ?? undefined,
    publicRecords: data.public_records ?? undefined,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export const creditReportsDbService = {
  createCreditReport,
  getCreditReport,
  getCreditReportsByUser,
  getLatestCreditReport,
  getCreditReportsByBureau,
  updateCreditReport,
  deleteCreditReport,
  getCreditScoreHistory,
  getCreditReportStats,
};

export default creditReportsDbService;
