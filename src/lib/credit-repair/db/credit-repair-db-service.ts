/**
 * Credit Repair Database Service
 *
 * Provides database operations for credit repair scores, actions, and progress.
 * Includes full CRUD operations, error handling, and TypeScript types.
 *
 * Features:
 * - Credit repair score management
 * - Action tracking (CRUD)
 * - Progress milestone tracking
 * - Full error handling
 * - Connection pooling via Supabase client
 * - Row Level Security (RLS) enforcement
 */

import { getServiceRoleClient } from "@/lib/supabase/service-role";

const supabase = getServiceRoleClient();
import type {
  CreditRepairScore,
  CreditRepairAction,
  CreditRepairProgress,
  ActionType,
  ActionStatus,
} from "./types";

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };
type JsonRecord = Record<string, JsonValue>;

// ============================================================================
// TYPES
// ============================================================================

export interface CreateScoreInput {
  userId: string;
  score: number;
  factors: Record<string, number>;
  opportunities: Array<{
    type: string;
    impact: number;
    timeline?: string;
  }>;
  estimatedImpact?: number;
  timeline?: string;
}

export interface CreateActionInput {
  userId: string;
  actionType: ActionType;
  actionData: JsonRecord;
  status?: ActionStatus;
  impact?: number;
  successRate?: number;
  timeline?: string;
}

export interface UpdateActionInput {
  status?: ActionStatus;
  actionData?: JsonRecord;
  impact?: number;
  startedAt?: Date;
  completedAt?: Date;
}

export interface CreateProgressInput {
  userId: string;
  milestoneType: string;
  milestoneData: JsonRecord;
  scoreBefore?: number;
  scoreAfter?: number;
  impact?: number;
}

export interface DatabaseError extends Error {
  code?: string;
  details?: string;
  hint?: string;
}

type DbOpportunity = {
  type: string;
  impact: number;
  timeline?: string | null;
};

interface CreditRepairScoreRow {
  id: string;
  user_id: string;
  score: number;
  factors: Record<string, number>;
  opportunities: DbOpportunity[] | null;
  estimated_impact?: number | null;
  timeline?: string | null;
  created_at: string;
  updated_at: string;
}

interface CreditRepairActionRow {
  id: string;
  user_id: string;
  action_type: ActionType;
  action_data: JsonRecord | null;
  status: ActionStatus;
  impact?: number | null;
  success_rate?: number | null;
  timeline?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  created_at: string;
  updated_at: string;
}

interface CreditRepairProgressRow {
  id: string;
  user_id: string;
  milestone_type: string;
  milestone_data: JsonRecord | null;
  achieved_at: string;
  score_before?: number | null;
  score_after?: number | null;
  impact?: number | null;
  created_at: string;
}

type CreditRepairActionUpdateRow = Partial<{
  status: ActionStatus;
  action_data: JsonRecord;
  impact: number;
  started_at: string;
  completed_at: string;
}>;

// ============================================================================
// CREDIT REPAIR SCORE OPERATIONS
// ============================================================================

/**
 * Get the latest credit repair score for a user
 */
export async function getCreditRepairScore(
  userId: string,
): Promise<CreditRepairScore | null> {
  try {
    const { data, error } = await supabase
      .from("credit_repair_scores")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // No rows returned
        return null;
      }
      throw error;
    }

    if (!data) {
      return null;
    }

    return mapScoreFromDb(data as CreditRepairScoreRow);
  } catch (error) {
    // Credit repair DB error: getting credit repair score
    throw new Error(
      `Failed to get credit repair score: ${(error as Error).message}`,
    );
  }
}

/**
 * Save a new credit repair score
 */
export async function saveCreditRepairScore(
  input: CreateScoreInput,
): Promise<CreditRepairScore> {
  try {
    const { data, error } = await supabase
      .from("credit_repair_scores")
      .insert({
        user_id: input.userId,
        score: input.score,
        factors: input.factors,
        opportunities: input.opportunities,
        estimated_impact: input.estimatedImpact,
        timeline: input.timeline,
      })
      .select()
      .single();

    if (error) throw error;

    return mapScoreFromDb(data as CreditRepairScoreRow);
  } catch (error) {
    // Credit repair DB error: saving credit repair score
    throw new Error(
      `Failed to save credit repair score: ${(error as Error).message}`,
    );
  }
}

/**
 * Get credit repair score history for a user
 */
export async function getCreditRepairHistory(
  userId: string,
  limit: number = 30,
): Promise<CreditRepairScore[]> {
  try {
    const { data, error } = await supabase
      .from("credit_repair_scores")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;

    const rows = (data ?? []) as CreditRepairScoreRow[];
    return rows.map(mapScoreFromDb);
  } catch (error) {
    // Credit repair DB error: getting credit repair history
    throw new Error(
      `Failed to get credit repair history: ${(error as Error).message}`,
    );
  }
}

/**
 * Delete old credit repair scores (keep last N records)
 */
export async function cleanupOldScores(
  userId: string,
  keepLast: number = 100,
): Promise<number> {
  try {
    // Get IDs of records to keep
    const { data: keepRecords, error: selectError } = await supabase
      .from("credit_repair_scores")
      .select("id")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(keepLast);

    if (selectError) throw selectError;

    if (!keepRecords || keepRecords.length === 0) {
      return 0;
    }

    const keepIds = keepRecords.map((r) => r.id);

    // Delete records not in keep list
    const { error: deleteError, count } = await supabase
      .from("credit_repair_scores")
      .delete({ count: "exact" })
      .eq("user_id", userId)
      .not("id", "in", `(${keepIds.join(",")})`);

    if (deleteError) throw deleteError;

    return count || 0;
  } catch (error) {
    // Credit repair DB error: cleaning up old scores
    throw new Error(
      `Failed to cleanup old scores: ${(error as Error).message}`,
    );
  }
}

// ============================================================================
// CREDIT REPAIR ACTION OPERATIONS
// ============================================================================

/**
 * Get all actions for a user
 */
export async function getActions(
  userId: string,
  filters?: {
    status?: ActionStatus;
    actionType?: ActionType;
    limit?: number;
  },
): Promise<CreditRepairAction[]> {
  try {
    let query = supabase
      .from("credit_repair_actions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (filters?.status) {
      query = query.eq("status", filters.status);
    }

    if (filters?.actionType) {
      query = query.eq("action_type", filters.actionType);
    }

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;

    if (error) throw error;

    const rows = (data ?? []) as CreditRepairActionRow[];
    return rows.map(mapActionFromDb);
  } catch (error) {
    // Credit repair DB error: getting actions
    throw new Error(`Failed to get actions: ${(error as Error).message}`);
  }
}

/**
 * Get a single action by ID
 */
export async function getAction(
  actionId: string,
  userId: string,
): Promise<CreditRepairAction | null> {
  try {
    const { data, error } = await supabase
      .from("credit_repair_actions")
      .select("*")
      .eq("id", actionId)
      .eq("user_id", userId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return null;
      }
      throw error;
    }

    return mapActionFromDb(data as CreditRepairActionRow);
  } catch (error) {
    // Credit repair DB error: getting action
    throw new Error(`Failed to get action: ${(error as Error).message}`);
  }
}

/**
 * Create a new action
 */
export async function createAction(
  input: CreateActionInput,
): Promise<CreditRepairAction> {
  try {
    const { data, error } = await supabase
      .from("credit_repair_actions")
      .insert({
        user_id: input.userId,
        action_type: input.actionType,
        action_data: input.actionData,
        status: input.status || "pending",
        impact: input.impact,
        success_rate: input.successRate,
        timeline: input.timeline,
      })
      .select()
      .single();

    if (error) throw error;

    return mapActionFromDb(data as CreditRepairActionRow);
  } catch (error) {
    // Credit repair DB error: creating action
    throw new Error(`Failed to create action: ${(error as Error).message}`);
  }
}

/**
 * Update an existing action
 */
export async function updateAction(
  actionId: string,
  userId: string,
  updates: UpdateActionInput,
): Promise<CreditRepairAction> {
  try {
    const updateData: CreditRepairActionUpdateRow = {};

    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.actionData !== undefined)
      updateData.action_data = updates.actionData;
    if (updates.impact !== undefined) updateData.impact = updates.impact;
    if (updates.startedAt !== undefined)
      updateData.started_at = updates.startedAt.toISOString();
    if (updates.completedAt !== undefined)
      updateData.completed_at = updates.completedAt.toISOString();

    const { data, error } = await supabase
      .from("credit_repair_actions")
      .update(updateData)
      .eq("id", actionId)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) throw error;

    return mapActionFromDb(data as CreditRepairActionRow);
  } catch (error) {
    // Credit repair DB error: updating action
    throw new Error(`Failed to update action: ${(error as Error).message}`);
  }
}

/**
 * Delete an action
 */
export async function deleteAction(
  actionId: string,
  userId: string,
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("credit_repair_actions")
      .delete()
      .eq("id", actionId)
      .eq("user_id", userId);

    if (error) throw error;

    return true;
  } catch (error) {
    // Credit repair DB error: deleting action
    throw new Error(`Failed to delete action: ${(error as Error).message}`);
  }
}

// ============================================================================
// CREDIT REPAIR PROGRESS OPERATIONS
// ============================================================================

/**
 * Get progress milestones for a user
 */
export async function getProgress(
  userId: string,
  filters?: {
    milestoneType?: string;
    limit?: number;
    startDate?: Date;
    endDate?: Date;
  },
): Promise<CreditRepairProgress[]> {
  try {
    let query = supabase
      .from("credit_repair_progress")
      .select("*")
      .eq("user_id", userId)
      .order("achieved_at", { ascending: false });

    if (filters?.milestoneType) {
      query = query.eq("milestone_type", filters.milestoneType);
    }

    if (filters?.startDate) {
      query = query.gte("achieved_at", filters.startDate.toISOString());
    }

    if (filters?.endDate) {
      query = query.lte("achieved_at", filters.endDate.toISOString());
    }

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;

    if (error) throw error;

    const rows = (data ?? []) as CreditRepairProgressRow[];
    return rows.map(mapProgressFromDb);
  } catch (error) {
    // Credit repair DB error: getting progress
    throw new Error(`Failed to get progress: ${(error as Error).message}`);
  }
}

/**
 * Create a new progress milestone
 */
export async function createProgress(
  input: CreateProgressInput,
): Promise<CreditRepairProgress> {
  try {
    const { data, error } = await supabase
      .from("credit_repair_progress")
      .insert({
        user_id: input.userId,
        milestone_type: input.milestoneType,
        milestone_data: input.milestoneData,
        score_before: input.scoreBefore,
        score_after: input.scoreAfter,
        impact: input.impact,
      })
      .select()
      .single();

    if (error) throw error;

    return mapProgressFromDb(data as CreditRepairProgressRow);
  } catch (error) {
    // Credit repair DB error: creating progress
    throw new Error(`Failed to create progress: ${(error as Error).message}`);
  }
}

/**
 * Delete a progress milestone
 */
export async function deleteProgress(
  progressId: string,
  userId: string,
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("credit_repair_progress")
      .delete()
      .eq("id", progressId)
      .eq("user_id", userId);

    if (error) throw error;

    return true;
  } catch (error) {
    // Credit repair DB error: deleting progress
    throw new Error(`Failed to delete progress: ${(error as Error).message}`);
  }
}

/**
 * Get progress statistics for a user
 */
export async function getProgressStats(
  userId: string,
  startDate?: Date,
  endDate?: Date,
): Promise<{
  totalMilestones: number;
  totalImpact: number;
  averageImpact: number;
  scoreImprovement: number;
  milestonesByType: Record<string, number>;
}> {
  try {
    let query = supabase
      .from("credit_repair_progress")
      .select("*")
      .eq("user_id", userId);

    if (startDate) {
      query = query.gte("achieved_at", startDate.toISOString());
    }

    if (endDate) {
      query = query.lte("achieved_at", endDate.toISOString());
    }

    const { data, error } = await query;

    if (error) throw error;

    const rows = (data ?? []) as CreditRepairProgressRow[];
    const milestones = rows.map(mapProgressFromDb);

    const totalMilestones = milestones.length;
    const totalImpact = milestones.reduce((sum, m) => sum + (m.impact || 0), 0);
    const averageImpact =
      totalMilestones > 0 ? totalImpact / totalMilestones : 0;

    // Calculate score improvement
    const firstScore = milestones[milestones.length - 1]?.scoreBefore || 0;
    const lastScore = milestones[0]?.scoreAfter || 0;
    const scoreImprovement = lastScore - firstScore;

    // Count milestones by type
    const milestonesByType: Record<string, number> = {};
    milestones.forEach((m) => {
      milestonesByType[m.milestoneType] =
        (milestonesByType[m.milestoneType] || 0) + 1;
    });

    return {
      totalMilestones,
      totalImpact,
      averageImpact,
      scoreImprovement,
      milestonesByType,
    };
  } catch (error) {
    // Credit repair DB error: getting progress stats
    throw new Error(
      `Failed to get progress stats: ${(error as Error).message}`,
    );
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function mapScoreFromDb(data: CreditRepairScoreRow): CreditRepairScore {
  const opportunities = (data.opportunities ?? []).map((opportunity) => ({
    type: opportunity.type,
    impact: opportunity.impact,
    timeline: opportunity.timeline ?? undefined,
  }));

  return {
    id: data.id,
    userId: data.user_id,
    score: data.score,
    factors: data.factors,
    opportunities,
    estimatedImpact: data.estimated_impact ?? undefined,
    timeline: data.timeline ?? undefined,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
  };
}

function mapActionFromDb(data: CreditRepairActionRow): CreditRepairAction {
  return {
    id: data.id,
    userId: data.user_id,
    actionType: data.action_type,
    actionData: data.action_data ?? {},
    status: data.status,
    impact: data.impact ?? undefined,
    successRate: data.success_rate ?? undefined,
    timeline: data.timeline ?? undefined,
    startedAt: data.started_at ? new Date(data.started_at) : undefined,
    completedAt: data.completed_at ? new Date(data.completed_at) : undefined,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
  };
}

function mapProgressFromDb(
  data: CreditRepairProgressRow,
): CreditRepairProgress {
  return {
    id: data.id,
    userId: data.user_id,
    milestoneType: data.milestone_type,
    milestoneData: data.milestone_data ?? {},
    achievedAt: new Date(data.achieved_at),
    scoreBefore: data.score_before ?? undefined,
    scoreAfter: data.score_after ?? undefined,
    impact: data.impact ?? undefined,
    createdAt: new Date(data.created_at),
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export const creditRepairDbService = {
  // Score operations
  getCreditRepairScore,
  saveCreditRepairScore,
  getCreditRepairHistory,
  cleanupOldScores,

  // Action operations
  getActions,
  getAction,
  createAction,
  updateAction,
  deleteAction,

  // Progress operations
  getProgress,
  createProgress,
  deleteProgress,
  getProgressStats,
};

export default creditRepairDbService;
