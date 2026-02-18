/**
 * Negotiations Database Service
 *
 * Provides database operations for pay-for-delete negotiations.
 * Includes full CRUD operations, error handling, and TypeScript types.
 *
 * Features:
 * - Negotiation CRUD operations
 * - Status tracking
 * - Settlement calculations
 * - Script management
 * - Full error handling
 */

import { getSupabase } from "@/lib/supabase/client";

const supabase = getSupabase();

// ============================================================================
// TYPES
// ============================================================================

export interface Negotiation {
  id: string;
  userId: string;
  collectionAgency: string;
  originalCreditor?: string;
  accountNumber?: string;
  originalBalance: number;
  currentBalance: number;
  settlementPercentage?: number;
  settlementAmount?: number;
  scripts?: Record<string, string>;
  status:
    | "pending"
    | "negotiating"
    | "agreed"
    | "paid"
    | "completed"
    | "failed";
  agreedAt?: Date;
  paidAt?: Date;
  deletionConfirmedAt?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateNegotiationInput {
  userId: string;
  collectionAgency: string;
  originalCreditor?: string;
  accountNumber?: string;
  originalBalance: number;
  currentBalance: number;
  settlementPercentage?: number;
  settlementAmount?: number;
  scripts?: Record<string, string>;
  status?:
    | "pending"
    | "negotiating"
    | "agreed"
    | "paid"
    | "completed"
    | "failed";
  notes?: string;
}

export interface UpdateNegotiationInput {
  collectionAgency?: string;
  originalCreditor?: string;
  accountNumber?: string;
  originalBalance?: number;
  currentBalance?: number;
  settlementPercentage?: number;
  settlementAmount?: number;
  scripts?: Record<string, string>;
  status?:
    | "pending"
    | "negotiating"
    | "agreed"
    | "paid"
    | "completed"
    | "failed";
  agreedAt?: Date;
  paidAt?: Date;
  deletionConfirmedAt?: Date;
  notes?: string;
}

interface NegotiationRow {
  id: string;
  user_id: string;
  collection_agency: string;
  original_creditor?: string | null;
  account_number?: string | null;
  original_balance: number;
  current_balance: number;
  settlement_percentage?: number | null;
  settlement_amount?: number | null;
  scripts?: Record<string, string> | null;
  status:
    | "pending"
    | "negotiating"
    | "agreed"
    | "paid"
    | "completed"
    | "failed";
  agreed_at?: string | null;
  paid_at?: string | null;
  deletion_confirmed_at?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

type NegotiationUpdateRow = Partial<{
  collection_agency: string;
  original_creditor: string;
  account_number: string;
  original_balance: number;
  current_balance: number;
  settlement_percentage: number;
  settlement_amount: number;
  scripts: Record<string, string>;
  status:
    | "pending"
    | "negotiating"
    | "agreed"
    | "paid"
    | "completed"
    | "failed";
  agreed_at: string;
  paid_at: string;
  deletion_confirmed_at: string;
  notes: string;
}>;

// ============================================================================
// NEGOTIATION CRUD OPERATIONS
// ============================================================================

/**
 * Create a new negotiation
 */
export async function createNegotiation(
  input: CreateNegotiationInput,
): Promise<Negotiation> {
  try {
    const { data, error } = await supabase
      .from("negotiations")
      .insert({
        user_id: input.userId,
        collection_agency: input.collectionAgency,
        original_creditor: input.originalCreditor,
        account_number: input.accountNumber,
        original_balance: input.originalBalance,
        current_balance: input.currentBalance,
        settlement_percentage: input.settlementPercentage,
        settlement_amount: input.settlementAmount,
        scripts: input.scripts,
        status: input.status || "pending",
        notes: input.notes,
      })
      .select()
      .single();

    if (error) throw error;

    return mapNegotiationFromDb(data as NegotiationRow);
  } catch (error) {
    // NegotiationsDB error: Error creating negotiation
    throw new Error(
      `Failed to create negotiation: ${(error as Error).message}`,
    );
  }
}

/**
 * Get a single negotiation by ID
 */
export async function getNegotiation(
  negotiationId: string,
  userId: string,
): Promise<Negotiation | null> {
  try {
    const { data, error } = await supabase
      .from("negotiations")
      .select("*")
      .eq("id", negotiationId)
      .eq("user_id", userId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return null;
      }
      throw error;
    }

    return data ? mapNegotiationFromDb(data as NegotiationRow) : null;
  } catch (error) {
    // NegotiationsDB error: Error getting negotiation
    throw new Error(`Failed to get negotiation: ${(error as Error).message}`);
  }
}

/**
 * Get all negotiations for a user
 */
export async function getNegotiationsByUser(
  userId: string,
  filters?: {
    status?: string;
    collectionAgency?: string;
    limit?: number;
    offset?: number;
  },
): Promise<{ negotiations: Negotiation[]; total: number }> {
  try {
    let query = supabase
      .from("negotiations")
      .select("*", { count: "exact" })
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (filters?.status) {
      query = query.eq("status", filters.status);
    }

    if (filters?.collectionAgency) {
      query = query.ilike("collection_agency", `%${filters.collectionAgency}%`);
    }

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    if (filters?.offset) {
      query = query.range(
        filters.offset,
        filters.offset + (filters.limit || 10) - 1,
      );
    }

    const { data, error, count } = await query;

    if (error) throw error;

    const rows = (data ?? []) as NegotiationRow[];

    return {
      negotiations: rows.map(mapNegotiationFromDb),
      total: count || 0,
    };
  } catch (error) {
    // NegotiationsDB error: Error getting negotiations by user
    throw new Error(`Failed to get negotiations: ${(error as Error).message}`);
  }
}

/**
 * Get negotiations by status
 */
export async function getNegotiationsByStatus(
  userId: string,
  status: string,
  limit?: number,
): Promise<Negotiation[]> {
  try {
    let query = supabase
      .from("negotiations")
      .select("*")
      .eq("user_id", userId)
      .eq("status", status)
      .order("created_at", { ascending: false });

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) throw error;

    const rows = (data ?? []) as NegotiationRow[];
    return rows.map(mapNegotiationFromDb);
  } catch (error) {
    // NegotiationsDB error: Error getting negotiations by status
    throw new Error(
      `Failed to get negotiations by status: ${(error as Error).message}`,
    );
  }
}

/**
 * Update a negotiation
 */
export async function updateNegotiation(
  negotiationId: string,
  userId: string,
  updates: UpdateNegotiationInput,
): Promise<Negotiation> {
  try {
    const updateData: NegotiationUpdateRow = {};

    if (updates.collectionAgency !== undefined)
      updateData.collection_agency = updates.collectionAgency;
    if (updates.originalCreditor !== undefined)
      updateData.original_creditor = updates.originalCreditor;
    if (updates.accountNumber !== undefined)
      updateData.account_number = updates.accountNumber;
    if (updates.originalBalance !== undefined)
      updateData.original_balance = updates.originalBalance;
    if (updates.currentBalance !== undefined)
      updateData.current_balance = updates.currentBalance;
    if (updates.settlementPercentage !== undefined)
      updateData.settlement_percentage = updates.settlementPercentage;
    if (updates.settlementAmount !== undefined)
      updateData.settlement_amount = updates.settlementAmount;
    if (updates.scripts !== undefined) updateData.scripts = updates.scripts;
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.agreedAt !== undefined)
      updateData.agreed_at = updates.agreedAt.toISOString();
    if (updates.paidAt !== undefined)
      updateData.paid_at = updates.paidAt.toISOString();
    if (updates.deletionConfirmedAt !== undefined)
      updateData.deletion_confirmed_at =
        updates.deletionConfirmedAt.toISOString();
    if (updates.notes !== undefined) updateData.notes = updates.notes;

    const { data, error } = await supabase
      .from("negotiations")
      .update(updateData)
      .eq("id", negotiationId)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) throw error;

    return mapNegotiationFromDb(data as NegotiationRow);
  } catch (error) {
    // NegotiationsDB error: Error updating negotiation
    throw new Error(
      `Failed to update negotiation: ${(error as Error).message}`,
    );
  }
}

/**
 * Delete a negotiation
 */
export async function deleteNegotiation(
  negotiationId: string,
  userId: string,
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("negotiations")
      .delete()
      .eq("id", negotiationId)
      .eq("user_id", userId);

    if (error) throw error;

    return true;
  } catch (error) {
    // NegotiationsDB error: Error deleting negotiation
    throw new Error(
      `Failed to delete negotiation: ${(error as Error).message}`,
    );
  }
}

/**
 * Get negotiation statistics
 */
export async function getNegotiationStats(userId: string): Promise<{
  total: number;
  byStatus: Record<string, number>;
  totalOriginalBalance: number;
  totalSettlementAmount: number;
  averageSavings: number;
  successRate: number;
}> {
  try {
    const { data, error } = await supabase
      .from("negotiations")
      .select("*")
      .eq("user_id", userId);

    if (error) throw error;

    const negotiations = ((data ?? []) as NegotiationRow[]).map(
      mapNegotiationFromDb,
    );

    const total = negotiations.length;

    // Count by status
    const byStatus: Record<string, number> = {};
    for (const negotiation of negotiations) {
      byStatus[negotiation.status] = (byStatus[negotiation.status] || 0) + 1;
    }

    // Calculate financial stats
    const totalOriginalBalance = negotiations.reduce(
      (sum, n) => sum + n.originalBalance,
      0,
    );
    const totalSettlementAmount = negotiations
      .filter((n) => n.settlementAmount)
      .reduce((sum, n) => sum + (n.settlementAmount || 0), 0);
    const averageSavings =
      totalOriginalBalance > 0
        ? ((totalOriginalBalance - totalSettlementAmount) /
            totalOriginalBalance) *
          100
        : 0;

    // Calculate success rate
    const completed = negotiations.filter(
      (n) => n.status === "completed" || n.status === "failed",
    );
    const successful = negotiations.filter((n) => n.status === "completed");
    const successRate =
      completed.length > 0 ? (successful.length / completed.length) * 100 : 0;

    return {
      total,
      byStatus,
      totalOriginalBalance,
      totalSettlementAmount,
      averageSavings,
      successRate,
    };
  } catch (error) {
    // NegotiationsDB error: Error getting negotiation stats
    throw new Error(
      `Failed to get negotiation stats: ${(error as Error).message}`,
    );
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function mapNegotiationFromDb(data: NegotiationRow): Negotiation {
  return {
    id: data.id,
    userId: data.user_id,
    collectionAgency: data.collection_agency,
    originalCreditor: data.original_creditor ?? undefined,
    accountNumber: data.account_number ?? undefined,
    originalBalance: data.original_balance,
    currentBalance: data.current_balance,
    settlementPercentage: data.settlement_percentage ?? undefined,
    settlementAmount: data.settlement_amount ?? undefined,
    scripts: data.scripts ?? undefined,
    status: data.status,
    agreedAt: data.agreed_at ? new Date(data.agreed_at) : undefined,
    paidAt: data.paid_at ? new Date(data.paid_at) : undefined,
    deletionConfirmedAt: data.deletion_confirmed_at
      ? new Date(data.deletion_confirmed_at)
      : undefined,
    notes: data.notes ?? undefined,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export const negotiationsDbService = {
  createNegotiation,
  getNegotiation,
  getNegotiationsByUser,
  getNegotiationsByStatus,
  updateNegotiation,
  deleteNegotiation,
  getNegotiationStats,
};

export default negotiationsDbService;
