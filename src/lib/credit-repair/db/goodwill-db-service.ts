/**
 * Goodwill Letters Database Service
 * 
 * Provides database operations for goodwill letter requests.
 * Includes full CRUD operations, error handling, and TypeScript types.
 * 
 * Features:
 * - Goodwill letter CRUD operations
 * - Status tracking
 * - Creditor filtering
 * - Success rate tracking
 * - Full error handling
 */

import { supabase } from '@/lib/supabase';

// ============================================================================
// TYPES
// ============================================================================

export interface GoodwillLetter {
  id: string;
  userId: string;
  creditorName: string;
  accountNumber?: string;
  latePaymentDate: Date;
  reason: string;
  letterContent: string;
  status: 'draft' | 'sent' | 'response_received' | 'approved' | 'denied';
  sentAt?: Date;
  responseReceivedAt?: Date;
  outcome?: 'removed' | 'denied' | 'pending';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateGoodwillLetterInput {
  userId: string;
  creditorName: string;
  accountNumber?: string;
  latePaymentDate: Date;
  reason: string;
  letterContent: string;
  status?: 'draft' | 'sent' | 'response_received' | 'approved' | 'denied';
  notes?: string;
}

export interface UpdateGoodwillLetterInput {
  creditorName?: string;
  accountNumber?: string;
  latePaymentDate?: Date;
  reason?: string;
  letterContent?: string;
  status?: 'draft' | 'sent' | 'response_received' | 'approved' | 'denied';
  sentAt?: Date;
  responseReceivedAt?: Date;
  outcome?: 'removed' | 'denied' | 'pending';
  notes?: string;
}

interface GoodwillLetterRow {
  id: string;
  user_id: string;
  creditor_name: string;
  account_number?: string | null;
  late_payment_date: string;
  reason: string;
  letter_content: string;
  status: 'draft' | 'sent' | 'response_received' | 'approved' | 'denied';
  sent_at?: string | null;
  response_received_at?: string | null;
  outcome?: 'removed' | 'denied' | 'pending' | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

type GoodwillLetterUpdateRow = Partial<{
  creditor_name: string;
  account_number: string;
  late_payment_date: string;
  reason: string;
  letter_content: string;
  status: 'draft' | 'sent' | 'response_received' | 'approved' | 'denied';
  sent_at: string;
  response_received_at: string;
  outcome: 'removed' | 'denied' | 'pending';
  notes: string;
}>;

// ============================================================================
// GOODWILL LETTER CRUD OPERATIONS
// ============================================================================

/**
 * Create a new goodwill letter
 */
export async function createGoodwillLetter(
  input: CreateGoodwillLetterInput
): Promise<GoodwillLetter> {
  try {
    const { data, error } = await supabase
      .from('goodwill_letters')
      .insert({
        user_id: input.userId,
        creditor_name: input.creditorName,
        account_number: input.accountNumber,
        late_payment_date: input.latePaymentDate.toISOString().split('T')[0],
        reason: input.reason,
        letter_content: input.letterContent,
        status: input.status || 'draft',
        notes: input.notes,
      })
      .select()
      .single();

    if (error) throw error;

    return mapGoodwillLetterFromDb(data as GoodwillLetterRow);
  } catch (error) {
    // GoodwillDB error: Error creating goodwill letter
    throw new Error(`Failed to create goodwill letter: ${(error as Error).message}`);
  }
}

/**
 * Get a single goodwill letter by ID
 */
export async function getGoodwillLetter(
  letterId: string,
  userId: string
): Promise<GoodwillLetter | null> {
  try {
    const { data, error } = await supabase
      .from('goodwill_letters')
      .select('*')
      .eq('id', letterId)
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw error;
    }

    return data ? mapGoodwillLetterFromDb(data as GoodwillLetterRow) : null;
  } catch (error) {
    // GoodwillDB error: Error getting goodwill letter
    throw new Error(`Failed to get goodwill letter: ${(error as Error).message}`);
  }
}

/**
 * Get all goodwill letters for a user
 */
export async function getGoodwillLettersByUser(
  userId: string,
  filters?: {
    status?: string;
    creditorName?: string;
    limit?: number;
    offset?: number;
  }
): Promise<{ letters: GoodwillLetter[]; total: number }> {
  try {
    let query = supabase
      .from('goodwill_letters')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.creditorName) {
      query = query.ilike('creditor_name', `%${filters.creditorName}%`);
    }

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    if (filters?.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
    }

    const { data, error, count } = await query;

    if (error) throw error;

    const rows = (data ?? []) as GoodwillLetterRow[];

    return {
      letters: rows.map(mapGoodwillLetterFromDb),
      total: count || 0,
    };
  } catch (error) {
    // GoodwillDB error: Error getting goodwill letters by user
    throw new Error(`Failed to get goodwill letters: ${(error as Error).message}`);
  }
}

/**
 * Get goodwill letters by status
 */
export async function getGoodwillLettersByStatus(
  userId: string,
  status: string,
  limit?: number
): Promise<GoodwillLetter[]> {
  try {
    let query = supabase
      .from('goodwill_letters')
      .select('*')
      .eq('user_id', userId)
      .eq('status', status)
      .order('created_at', { ascending: false });

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) throw error;

    const rows = (data ?? []) as GoodwillLetterRow[];
    return rows.map(mapGoodwillLetterFromDb);
  } catch (error) {
    // GoodwillDB error: Error getting goodwill letters by status
    throw new Error(`Failed to get goodwill letters by status: ${(error as Error).message}`);
  }
}

/**
 * Update a goodwill letter
 */
export async function updateGoodwillLetter(
  letterId: string,
  userId: string,
  updates: UpdateGoodwillLetterInput
): Promise<GoodwillLetter> {
  try {
    const updateData: GoodwillLetterUpdateRow = {};

    if (updates.creditorName !== undefined) updateData.creditor_name = updates.creditorName;
    if (updates.accountNumber !== undefined) updateData.account_number = updates.accountNumber;
    if (updates.latePaymentDate !== undefined) updateData.late_payment_date = updates.latePaymentDate.toISOString().split('T')[0];
    if (updates.reason !== undefined) updateData.reason = updates.reason;
    if (updates.letterContent !== undefined) updateData.letter_content = updates.letterContent;
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.sentAt !== undefined) updateData.sent_at = updates.sentAt.toISOString();
    if (updates.responseReceivedAt !== undefined) updateData.response_received_at = updates.responseReceivedAt.toISOString();
    if (updates.outcome !== undefined) updateData.outcome = updates.outcome;
    if (updates.notes !== undefined) updateData.notes = updates.notes;

    const { data, error } = await supabase
      .from('goodwill_letters')
      .update(updateData)
      .eq('id', letterId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;

    return mapGoodwillLetterFromDb(data as GoodwillLetterRow);
  } catch (error) {
    // GoodwillDB error: Error updating goodwill letter
    throw new Error(`Failed to update goodwill letter: ${(error as Error).message}`);
  }
}

/**
 * Delete a goodwill letter
 */
export async function deleteGoodwillLetter(
  letterId: string,
  userId: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('goodwill_letters')
      .delete()
      .eq('id', letterId)
      .eq('user_id', userId);

    if (error) throw error;

    return true;
  } catch (error) {
    // GoodwillDB error: Error deleting goodwill letter
    throw new Error(`Failed to delete goodwill letter: ${(error as Error).message}`);
  }
}

/**
 * Get goodwill letter statistics
 */
export async function getGoodwillLetterStats(
  userId: string
): Promise<{
  total: number;
  byStatus: Record<string, number>;
  successRate: number;
}> {
  try {
    const { data, error } = await supabase
      .from('goodwill_letters')
      .select('*')
      .eq('user_id', userId);

    if (error) throw error;

    const letters = ((data ?? []) as GoodwillLetterRow[]).map(mapGoodwillLetterFromDb);

    const total = letters.length;

    // Count by status
    const byStatus: Record<string, number> = {};
    for (const letter of letters) {
      byStatus[letter.status] = (byStatus[letter.status] || 0) + 1;
    }

    // Calculate success rate
    const responded = letters.filter((l) => l.status === 'approved' || l.status === 'denied');
    const approved = letters.filter((l) => l.status === 'approved');
    const successRate = responded.length > 0 ? (approved.length / responded.length) * 100 : 0;

    return {
      total,
      byStatus,
      successRate,
    };
  } catch (error) {
    // GoodwillDB error: Error getting goodwill letter stats
    throw new Error(`Failed to get goodwill letter stats: ${(error as Error).message}`);
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function mapGoodwillLetterFromDb(data: GoodwillLetterRow): GoodwillLetter {
  return {
    id: data.id,
    userId: data.user_id,
    creditorName: data.creditor_name,
    accountNumber: data.account_number ?? undefined,
    latePaymentDate: new Date(data.late_payment_date),
    reason: data.reason,
    letterContent: data.letter_content,
    status: data.status,
    sentAt: data.sent_at ? new Date(data.sent_at) : undefined,
    responseReceivedAt: data.response_received_at ? new Date(data.response_received_at) : undefined,
    outcome: data.outcome ?? undefined,
    notes: data.notes ?? undefined,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export const goodwillDbService = {
  createGoodwillLetter,
  getGoodwillLetter,
  getGoodwillLettersByUser,
  getGoodwillLettersByStatus,
  updateGoodwillLetter,
  deleteGoodwillLetter,
  getGoodwillLetterStats,
};

export default goodwillDbService;
