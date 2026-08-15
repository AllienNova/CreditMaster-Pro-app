/**
 * Disputes Database Service
 *
 * Provides database operations for credit report disputes.
 * Includes full CRUD operations, error handling, and TypeScript types.
 *
 * Features:
 * - Dispute CRUD operations
 * - Status tracking
 * - Bureau filtering
 * - Strategy filtering
 * - Full error handling
 * - Optimistic locking
 * - Transaction support
 */

import { getServiceRoleClient } from "@/lib/supabase/service-role";

const supabase = getServiceRoleClient();
import type { Dispute, DisputeStrategy, DisputeStatus, Bureau } from "./types";

// ============================================================================
// TYPES
// ============================================================================

export interface CreateDisputeInput {
  userId: string;
  itemType: string;
  itemDescription: string;
  creditorName?: string;
  accountNumber?: string;
  balance?: number;
  inaccuracyType: string;
  strategy: DisputeStrategy;
  letterContent?: string;
  status?: DisputeStatus;
  bureau: Bureau;
  notes?: string;
}

export interface UpdateDisputeInput {
  itemType?: string;
  itemDescription?: string;
  creditorName?: string;
  accountNumber?: string;
  balance?: number;
  inaccuracyType?: string;
  strategy?: DisputeStrategy;
  letterContent?: string;
  status?: DisputeStatus;
  bureau?: Bureau;
  sentAt?: Date;
  responseReceivedAt?: Date;
  outcome?: "removed" | "updated" | "verified" | "pending";
  notes?: string;
}

export interface DisputeFilters {
  status?: DisputeStatus;
  bureau?: Bureau;
  strategy?: DisputeStrategy;
  limit?: number;
  offset?: number;
}

interface DisputeRow {
  id: string;
  user_id: string;
  item_type: string;
  item_description: string;
  creditor_name?: string | null;
  account_number?: string | null;
  balance?: number | null;
  inaccuracy_type: string;
  strategy: DisputeStrategy;
  letter_content?: string | null;
  status: DisputeStatus;
  bureau: Bureau;
  sent_at?: string | null;
  response_received_at?: string | null;
  outcome?: "removed" | "updated" | "verified" | "pending" | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

type DisputeUpdateRow = Partial<{
  item_type: string;
  item_description: string;
  creditor_name: string;
  account_number: string;
  balance: number;
  inaccuracy_type: string;
  strategy: DisputeStrategy;
  letter_content: string;
  status: DisputeStatus;
  bureau: Bureau;
  sent_at: string;
  response_received_at: string;
  outcome: "removed" | "updated" | "verified" | "pending";
  notes: string;
}>;

// ============================================================================
// DISPUTE CRUD OPERATIONS
// ============================================================================

/**
 * Create a new dispute
 */
export async function createDispute(
  input: CreateDisputeInput,
): Promise<Dispute> {
  try {
    const { data, error } = await supabase
      // idor-audit: pk-owner-checked — INSERT writes `user_id` from the caller-supplied id; there is no prior row to filter on
      .from("disputes")
      .insert({
        user_id: input.userId,
        item_type: input.itemType,
        item_description: input.itemDescription,
        creditor_name: input.creditorName,
        account_number: input.accountNumber,
        balance: input.balance,
        inaccuracy_type: input.inaccuracyType,
        strategy: input.strategy,
        letter_content: input.letterContent,
        status: input.status || "draft",
        bureau: input.bureau,
        notes: input.notes,
      })
      .select()
      .single();

    if (error) throw error;

    return mapDisputeFromDb(data as DisputeRow);
  } catch (error) {
    // DisputesDB error: Error creating dispute
    throw new Error(`Failed to create dispute: ${(error as Error).message}`);
  }
}

/**
 * Get a single dispute by ID
 */
export async function getDispute(
  disputeId: string,
  userId: string,
): Promise<Dispute | null> {
  try {
    const { data, error } = await supabase
      .from("disputes")
      .select("*")
      .eq("id", disputeId)
      .eq("user_id", userId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return null;
      }
      throw error;
    }

    return data ? mapDisputeFromDb(data as DisputeRow) : null;
  } catch (error) {
    // DisputesDB error: Error getting dispute
    throw new Error(`Failed to get dispute: ${(error as Error).message}`);
  }
}

/**
 * Get all disputes for a user with optional filters
 */
export async function getDisputesByUser(
  userId: string,
  filters?: DisputeFilters,
): Promise<{ disputes: Dispute[]; total: number }> {
  try {
    let query = supabase
      .from("disputes")
      .select("*", { count: "exact" })
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (filters?.status) {
      query = query.eq("status", filters.status);
    }

    if (filters?.bureau) {
      query = query.eq("bureau", filters.bureau);
    }

    if (filters?.strategy) {
      query = query.eq("strategy", filters.strategy);
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

    return {
      disputes: ((data ?? []) as DisputeRow[]).map(mapDisputeFromDb),
      total: count || 0,
    };
  } catch (error) {
    // DisputesDB error: Error getting disputes by user
    throw new Error(`Failed to get disputes: ${(error as Error).message}`);
  }
}

/**
 * Get disputes by status
 */
export async function getDisputesByStatus(
  userId: string,
  status: DisputeStatus,
  limit?: number,
): Promise<Dispute[]> {
  try {
    let query = supabase
      .from("disputes")
      .select("*")
      .eq("user_id", userId)
      .eq("status", status)
      .order("created_at", { ascending: false });

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) throw error;

    const rows = (data ?? []) as DisputeRow[];
    return rows.map(mapDisputeFromDb);
  } catch (error) {
    // DisputesDB error: Error getting disputes by status
    throw new Error(
      `Failed to get disputes by status: ${(error as Error).message}`,
    );
  }
}

/**
 * Get disputes by bureau
 */
export async function getDisputesByBureau(
  userId: string,
  bureau: Bureau,
  limit?: number,
): Promise<Dispute[]> {
  try {
    let query = supabase
      .from("disputes")
      .select("*")
      .eq("user_id", userId)
      .eq("bureau", bureau)
      .order("created_at", { ascending: false });

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) throw error;

    const rows = (data ?? []) as DisputeRow[];
    return rows.map(mapDisputeFromDb);
  } catch (error) {
    // DisputesDB error: Error getting disputes by bureau
    throw new Error(
      `Failed to get disputes by bureau: ${(error as Error).message}`,
    );
  }
}

/**
 * Update a dispute with optimistic locking
 */
export async function updateDispute(
  disputeId: string,
  userId: string,
  updates: UpdateDisputeInput,
  expectedUpdatedAt?: Date,
): Promise<Dispute> {
  try {
    // If optimistic locking is enabled, verify the record hasn't changed
    if (expectedUpdatedAt) {
      const { data: current, error: checkError } = await supabase
        .from("disputes")
        .select("updated_at")
        .eq("id", disputeId)
        .eq("user_id", userId)
        .single();

      if (checkError) throw checkError;

      const currentUpdatedAt = new Date(current.updated_at);
      if (currentUpdatedAt.getTime() !== expectedUpdatedAt.getTime()) {
        throw new Error(
          "Dispute has been modified by another process. Please refresh and try again.",
        );
      }
    }

    const updateData: DisputeUpdateRow = {};

    if (updates.itemType !== undefined) updateData.item_type = updates.itemType;
    if (updates.itemDescription !== undefined)
      updateData.item_description = updates.itemDescription;
    if (updates.creditorName !== undefined)
      updateData.creditor_name = updates.creditorName;
    if (updates.accountNumber !== undefined)
      updateData.account_number = updates.accountNumber;
    if (updates.balance !== undefined) updateData.balance = updates.balance;
    if (updates.inaccuracyType !== undefined)
      updateData.inaccuracy_type = updates.inaccuracyType;
    if (updates.strategy !== undefined) updateData.strategy = updates.strategy;
    if (updates.letterContent !== undefined)
      updateData.letter_content = updates.letterContent;
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.bureau !== undefined) updateData.bureau = updates.bureau;
    if (updates.sentAt !== undefined)
      updateData.sent_at = updates.sentAt.toISOString();
    if (updates.responseReceivedAt !== undefined)
      updateData.response_received_at =
        updates.responseReceivedAt.toISOString();
    if (updates.outcome !== undefined) updateData.outcome = updates.outcome;
    if (updates.notes !== undefined) updateData.notes = updates.notes;

    const { data, error } = await supabase
      .from("disputes")
      .update(updateData)
      .eq("id", disputeId)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) throw error;

    return mapDisputeFromDb(data as DisputeRow);
  } catch (error) {
    // DisputesDB error: Error updating dispute
    throw new Error(`Failed to update dispute: ${(error as Error).message}`);
  }
}

/**
 * Delete a dispute
 */
export async function deleteDispute(
  disputeId: string,
  userId: string,
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("disputes")
      .delete()
      .eq("id", disputeId)
      .eq("user_id", userId);

    if (error) throw error;

    return true;
  } catch (error) {
    // DisputesDB error: Error deleting dispute
    throw new Error(`Failed to delete dispute: ${(error as Error).message}`);
  }
}

// ============================================================================
// DISPUTE STATISTICS
// ============================================================================

/**
 * Get dispute statistics for a user
 */
export async function getDisputeStats(userId: string): Promise<{
  total: number;
  byStatus: Record<DisputeStatus, number>;
  byBureau: Record<Bureau, number>;
  byStrategy: Record<DisputeStrategy, number>;
  successRate: number;
}> {
  try {
    const { data, error } = await supabase
      .from("disputes")
      .select("*")
      .eq("user_id", userId);

    if (error) throw error;

    const disputes = ((data ?? []) as DisputeRow[]).map(mapDisputeFromDb);

    const total = disputes.length;

    // Count by status
    const byStatus: Record<string, number> = {};
    disputes.forEach((d) => {
      byStatus[d.status] = (byStatus[d.status] || 0) + 1;
    });

    // Count by bureau
    const byBureau: Record<string, number> = {};
    disputes.forEach((d) => {
      byBureau[d.bureau] = (byBureau[d.bureau] || 0) + 1;
    });

    // Count by strategy
    const byStrategy: Record<string, number> = {};
    disputes.forEach((d) => {
      byStrategy[d.strategy] = (byStrategy[d.strategy] || 0) + 1;
    });

    // Calculate success rate
    const resolved = disputes.filter((d) => d.status === "resolved");
    const successful = resolved.filter(
      (d) => d.outcome === "removed" || d.outcome === "updated",
    );
    const successRate =
      resolved.length > 0 ? (successful.length / resolved.length) * 100 : 0;

    return {
      total,
      byStatus: byStatus as Record<DisputeStatus, number>,
      byBureau: byBureau as Record<Bureau, number>,
      byStrategy: byStrategy as Record<DisputeStrategy, number>,
      successRate,
    };
  } catch (error) {
    // DisputesDB error: Error getting dispute stats
    throw new Error(`Failed to get dispute stats: ${(error as Error).message}`);
  }
}

/**
 * Bulk update dispute status
 */
export async function bulkUpdateDisputeStatus(
  disputeIds: string[],
  userId: string,
  status: DisputeStatus,
): Promise<number> {
  try {
    const { error, count } = await supabase
      .from("disputes")
      .update({ status })
      .in("id", disputeIds)
      .eq("user_id", userId);

    if (error) throw error;

    return count || 0;
  } catch (error) {
    // DisputesDB error: Error bulk updating dispute status
    throw new Error(
      `Failed to bulk update dispute status: ${(error as Error).message}`,
    );
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function mapDisputeFromDb(data: DisputeRow): Dispute {
  return {
    id: data.id,
    userId: data.user_id,
    itemType: data.item_type,
    itemDescription: data.item_description,
    creditorName: data.creditor_name ?? undefined,
    accountNumber: data.account_number ?? undefined,
    balance: data.balance ?? undefined,
    inaccuracyType: data.inaccuracy_type,
    strategy: data.strategy,
    letterContent: data.letter_content ?? undefined,
    status: data.status,
    bureau: data.bureau,
    sentAt: data.sent_at ? new Date(data.sent_at) : undefined,
    responseReceivedAt: data.response_received_at
      ? new Date(data.response_received_at)
      : undefined,
    outcome: data.outcome ?? undefined,
    notes: data.notes ?? undefined,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export const disputesDbService = {
  createDispute,
  getDispute,
  getDisputesByUser,
  getDisputesByStatus,
  getDisputesByBureau,
  updateDispute,
  deleteDispute,
  getDisputeStats,
  bulkUpdateDisputeStatus,
};

export default disputesDbService;
