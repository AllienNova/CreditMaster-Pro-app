/**
 * Credit Cards Database Service
 * 
 * Provides database operations for credit card management.
 * Includes full CRUD operations, utilization calculations, and TypeScript types.
 * 
 * Features:
 * - Credit card CRUD operations
 * - Utilization tracking (auto-calculated)
 * - Payment history
 * - Statement date management
 * - Full error handling
 */

import { getSupabase } from '@/lib/supabase/client';

const supabase = getSupabase();

// ============================================================================
// TYPES
// ============================================================================

export interface CreditCard {
  id: string;
  userId: string;
  cardName: string;
  lastFourDigits?: string;
  currentBalance: number;
  creditLimit: number;
  utilization: number; // Auto-calculated by database
  statementDate: number; // Day of month (1-31)
  dueDate: number; // Day of month (1-31)
  lastPaymentDate?: Date;
  lastPaymentAmount?: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCreditCardInput {
  userId: string;
  cardName: string;
  lastFourDigits?: string;
  currentBalance: number;
  creditLimit: number;
  statementDate: number;
  dueDate: number;
  lastPaymentDate?: Date;
  lastPaymentAmount?: number;
  notes?: string;
}

export interface UpdateCreditCardInput {
  cardName?: string;
  lastFourDigits?: string;
  currentBalance?: number;
  creditLimit?: number;
  statementDate?: number;
  dueDate?: number;
  lastPaymentDate?: Date;
  lastPaymentAmount?: number;
  notes?: string;
}

interface CreditCardRow {
  id: string;
  user_id: string;
  card_name: string;
  last_four_digits?: string | null;
  current_balance: number;
  credit_limit: number;
  utilization: number;
  statement_date: number;
  due_date: number;
  last_payment_date?: string | null;
  last_payment_amount?: number | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

type CreditCardUpdateRow = Partial<{
  card_name: string;
  last_four_digits?: string | null;
  current_balance: number;
  credit_limit: number;
  statement_date: number;
  due_date: number;
  last_payment_date: string;
  last_payment_amount: number;
  notes: string | null;
}>;

// ============================================================================
// CREDIT CARD CRUD OPERATIONS
// ============================================================================

/**
 * Create a new credit card
 */
export async function createCreditCard(
  input: CreateCreditCardInput
): Promise<CreditCard> {
  try {
    const { data, error } = await supabase
      .from('credit_cards')
      .insert({
        user_id: input.userId,
        card_name: input.cardName,
        last_four_digits: input.lastFourDigits,
        current_balance: input.currentBalance,
        credit_limit: input.creditLimit,
        statement_date: input.statementDate,
        due_date: input.dueDate,
        last_payment_date: input.lastPaymentDate?.toISOString().split('T')[0],
        last_payment_amount: input.lastPaymentAmount,
        notes: input.notes,
      })
      .select()
      .single();

    if (error) throw error;

    return mapCreditCardFromDb(data);
  } catch (error) {
    // CreditCardsDB error: Error creating credit card
    throw new Error(`Failed to create credit card: ${(error as Error).message}`);
  }
}

/**
 * Get a single credit card by ID
 */
export async function getCreditCard(
  cardId: string,
  userId: string
): Promise<CreditCard | null> {
  try {
    const { data, error } = await supabase
      .from('credit_cards')
      .select('*')
      .eq('id', cardId)
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw error;
    }

    return mapCreditCardFromDb(data);
  } catch (error) {
    // CreditCardsDB error: Error getting credit card
    throw new Error(`Failed to get credit card: ${(error as Error).message}`);
  }
}

/**
 * Get all credit cards for a user
 */
export async function getCreditCardsByUser(
  userId: string,
  filters?: {
    minUtilization?: number;
    maxUtilization?: number;
    limit?: number;
    offset?: number;
  }
): Promise<CreditCard[]> {
  try {
    let query = supabase
      .from('credit_cards')
      .select('*')
      .eq('user_id', userId)
      .order('utilization', { ascending: false });

    if (filters?.minUtilization !== undefined) {
      query = query.gte('utilization', filters.minUtilization);
    }

    if (filters?.maxUtilization !== undefined) {
      query = query.lte('utilization', filters.maxUtilization);
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

    return (data || []).map(mapCreditCardFromDb);
  } catch (error) {
    // CreditCardsDB error: Error getting credit cards by user
    throw new Error(`Failed to get credit cards: ${(error as Error).message}`);
  }
}

/**
 * Update a credit card
 */
export async function updateCreditCard(
  cardId: string,
  userId: string,
  updates: UpdateCreditCardInput
): Promise<CreditCard> {
  try {
    const updateData: CreditCardUpdateRow = {};

    if (updates.cardName !== undefined) updateData.card_name = updates.cardName;
    if (updates.lastFourDigits !== undefined) updateData.last_four_digits = updates.lastFourDigits;
    if (updates.currentBalance !== undefined) updateData.current_balance = updates.currentBalance;
    if (updates.creditLimit !== undefined) updateData.credit_limit = updates.creditLimit;
    if (updates.statementDate !== undefined) updateData.statement_date = updates.statementDate;
    if (updates.dueDate !== undefined) updateData.due_date = updates.dueDate;
    if (updates.lastPaymentDate !== undefined) updateData.last_payment_date = updates.lastPaymentDate.toISOString().split('T')[0];
    if (updates.lastPaymentAmount !== undefined) updateData.last_payment_amount = updates.lastPaymentAmount;
    if (updates.notes !== undefined) updateData.notes = updates.notes;

    const { data, error } = await supabase
      .from('credit_cards')
      .update(updateData)
      .eq('id', cardId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;

    return mapCreditCardFromDb(data);
  } catch (error) {
    // CreditCardsDB error: Error updating credit card
    throw new Error(`Failed to update credit card: ${(error as Error).message}`);
  }
}

/**
 * Delete a credit card
 */
export async function deleteCreditCard(
  cardId: string,
  userId: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('credit_cards')
      .delete()
      .eq('id', cardId)
      .eq('user_id', userId);

    if (error) throw error;

    return true;
  } catch (error) {
    // CreditCardsDB error: Error deleting credit card
    throw new Error(`Failed to delete credit card: ${(error as Error).message}`);
  }
}

/**
 * Record a payment on a credit card
 */
export async function recordPayment(
  cardId: string,
  userId: string,
  paymentAmount: number,
  paymentDate: Date
): Promise<CreditCard> {
  try {
    // Get current card
    const card = await getCreditCard(cardId, userId);
    if (!card) {
      throw new Error('Credit card not found');
    }

    // Calculate new balance
    const newBalance = Math.max(0, card.currentBalance - paymentAmount);

    // Update card
    return await updateCreditCard(cardId, userId, {
      currentBalance: newBalance,
      lastPaymentDate: paymentDate,
      lastPaymentAmount: paymentAmount,
    });
  } catch (error) {
    // CreditCardsDB error: Error recording payment
    throw new Error(`Failed to record payment: ${(error as Error).message}`);
  }
}

/**
 * Get credit card statistics
 */
export async function getCreditCardStats(
  userId: string
): Promise<{
  totalCards: number;
  totalBalance: number;
  totalCreditLimit: number;
  overallUtilization: number;
  averageUtilization: number;
  highUtilizationCards: number;
}> {
  try {
    const cards = await getCreditCardsByUser(userId);

    const totalCards = cards.length;
    const totalBalance = cards.reduce((sum, c) => sum + c.currentBalance, 0);
    const totalCreditLimit = cards.reduce((sum, c) => sum + c.creditLimit, 0);
    const overallUtilization = totalCreditLimit > 0 ? (totalBalance / totalCreditLimit) * 100 : 0;
    const averageUtilization = totalCards > 0 
      ? cards.reduce((sum, c) => sum + c.utilization, 0) / totalCards 
      : 0;
    const highUtilizationCards = cards.filter((c) => c.utilization > 30).length;

    return {
      totalCards,
      totalBalance,
      totalCreditLimit,
      overallUtilization,
      averageUtilization,
      highUtilizationCards,
    };
  } catch (error) {
    // CreditCardsDB error: Error getting credit card stats
    throw new Error(`Failed to get credit card stats: ${(error as Error).message}`);
  }
}

/**
 * Calculate total utilization across all cards
 */
export async function calculateTotalUtilization(userId: string): Promise<number> {
  try {
    const cards = await getCreditCardsByUser(userId);
    const totalBalance = cards.reduce((sum, card) => sum + card.currentBalance, 0);
    const totalCreditLimit = cards.reduce((sum, card) => sum + card.creditLimit, 0);

    if (totalCreditLimit === 0) {
      return 0;
    }

    const utilization = (totalBalance / totalCreditLimit) * 100;
    return Number(utilization.toFixed(2));
  } catch (error) {
    // CreditCardsDB error: Error calculating total utilization
    throw new Error(`Failed to calculate total utilization: ${(error as Error).message}`);
  }
}

/**
 * Get cards that need payment before statement date
 */
export async function getCardsNeedingPayment(
  userId: string,
  daysAhead: number = 7
): Promise<CreditCard[]> {
  try {
    const cards = await getCreditCardsByUser(userId);
    const today = new Date();
    const currentDay = today.getDate();

    return cards.filter((card) => {
      // Calculate days until statement date
      let daysUntilStatement = card.statementDate - currentDay;
      if (daysUntilStatement < 0) {
        daysUntilStatement += 30; // Approximate month length
      }

      // Return cards with statement date within daysAhead and utilization > 10%
      return daysUntilStatement <= daysAhead && card.utilization > 10;
    });
  } catch (error) {
    // CreditCardsDB error: Error getting cards needing payment
    throw new Error(`Failed to get cards needing payment: ${(error as Error).message}`);
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function mapCreditCardFromDb(data: CreditCardRow): CreditCard {
  return {
    id: data.id,
    userId: data.user_id,
    cardName: data.card_name,
    lastFourDigits: data.last_four_digits ?? undefined,
    currentBalance: data.current_balance,
    creditLimit: data.credit_limit,
    utilization: data.utilization,
    statementDate: data.statement_date,
    dueDate: data.due_date,
    lastPaymentDate: data.last_payment_date ? new Date(data.last_payment_date) : undefined,
    lastPaymentAmount: data.last_payment_amount ?? undefined,
    notes: data.notes ?? undefined,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export const creditCardsDbService = {
  createCreditCard,
  getCreditCard,
  getCreditCardsByUser,
  updateCreditCard,
  deleteCreditCard,
  recordPayment,
  getCreditCardStats,
  calculateTotalUtilization,
  getCardsNeedingPayment,
};

export default creditCardsDbService;
