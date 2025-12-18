/**
 * Credit Repair Database Service
 * Handles database operations for credit reports and related data
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/types';

type CreditReportRow = Database['public']['Tables']['credit_reports']['Row'];
type CreditReportInsert = Database['public']['Tables']['credit_reports']['Insert'];

// Create a typed Supabase client for credit repair operations
function getTypedSupabase() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export interface CreditReport {
  id: string;
  userId: string;
  bureau: 'experian' | 'equifax' | 'transunion';
  reportDate: Date;
  score: number;
  reportData: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaginationOptions {
  limit: number;
  offset: number;
}

/**
 * Credit Reports database operations
 */
const creditReports = {
  /**
   * Get all credit reports for a user
   */
  async getCreditReportsByUser(
    userId: string,
    options: PaginationOptions = { limit: 50, offset: 0 }
  ): Promise<CreditReport[]> {
    const supabase = getTypedSupabase();
    const { data, error } = await supabase
      .from('credit_reports')
      .select('*')
      .eq('user_id', userId)
      .order('report_date', { ascending: false })
      .range(options.offset, options.offset + options.limit - 1);

    if (error) throw error;
    return (data || []).map(mapToCreditReport);
  },

  /**
   * Get credit reports by bureau
   */
  async getCreditReportsByBureau(
    userId: string,
    bureau: string,
    options: PaginationOptions = { limit: 50, offset: 0 }
  ): Promise<CreditReport[]> {
    const supabase = getTypedSupabase();
    const { data, error } = await supabase
      .from('credit_reports')
      .select('*')
      .eq('user_id', userId)
      .eq('bureau', bureau as CreditReportRow['bureau'])
      .order('report_date', { ascending: false })
      .range(options.offset, options.offset + options.limit - 1);

    if (error) throw error;
    return (data || []).map(mapToCreditReport);
  },

  /**
   * Get latest credit report for a user
   */
  async getLatestCreditReport(userId: string): Promise<CreditReport | null> {
    const supabase = getTypedSupabase();
    const { data, error } = await supabase
      .from('credit_reports')
      .select('*')
      .eq('user_id', userId)
      .order('report_date', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data ? mapToCreditReport(data) : null;
  },

  /**
   * Create a new credit report
   */
  async createCreditReport(
    userId: string,
    data: {
      bureau: string;
      reportDate: string;
      score: number;
      reportData?: Record<string, unknown>;
    }
  ): Promise<CreditReport> {
    const supabase = getTypedSupabase();
    const insertData = {
      user_id: userId,
      bureau: data.bureau,
      report_date: data.reportDate,
      score: data.score,
      report_data: data.reportData || {},
    };

    // Use type assertion to work around TypeScript cache issues
    const { data: report, error } = await (supabase
      .from('credit_reports') as ReturnType<typeof supabase.from>)
      .insert(insertData as CreditReportInsert)
      .select()
      .single();

    if (error) throw error;
    return mapToCreditReport(report as CreditReportRow);
  },
};

function mapToCreditReport(row: CreditReportRow): CreditReport {
  return {
    id: row.id,
    userId: row.user_id,
    bureau: row.bureau,
    reportDate: new Date(row.report_date),
    score: row.score,
    reportData: (row.report_data as Record<string, unknown>) || {},
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export const db = {
  creditReports,
};

export default db;

