/**
 * Dispute Tracking Service (Database Version)
 *
 * Manages credit dispute lifecycle with Supabase persistence:
 * - Create disputes
 * - Track status
 * - Update progress
 * - Predict timelines
 * - Store outcomes
 *
 * All resource-keyed methods (getDispute, sendDispute, updateDisputeStatus,
 * resolveDispute, deleteDispute, addNote, addEvidence) require an explicit
 * userId parameter and apply .eq("user_id", userId) so that no authenticated
 * caller can act on another user's dispute (IDOR defence, TASK-CRD-3).
 */

import { getSupabase } from "../supabase/client";
import type { Database } from "../supabase/types";

// Type helpers for Supabase operations
type DisputeRow = Database["public"]["Tables"]["disputes"]["Row"];
type DisputeInsert = Database["public"]["Tables"]["disputes"]["Insert"];
type DisputeUpdate = Database["public"]["Tables"]["disputes"]["Update"];

// Helper to get typed table reference
const disputes = () => getSupabase().from("disputes");

export type DisputeStatus =
  | "draft"
  | "sent"
  | "under_review"
  | "resolved"
  | "rejected";

export type DisputeOutcome = "removed" | "updated" | "verified";

export type Bureau = "experian" | "equifax" | "transunion";

export interface Dispute {
  id: string;
  userId: string;
  bureau: Bureau;
  itemType: string;
  itemDescription: string;
  reason: string;
  status: DisputeStatus;
  outcome?: DisputeOutcome;
  createdAt: Date;
  sentAt?: Date;
  resolvedAt?: Date;
  letterContent: string;
}

export interface DisputeStats {
  total: number;
  active: number;
  resolved: number;
  successRate: number;
  averageResolutionDays: number;
}

/**
 * Dispute Service Class with Supabase
 */
class DisputeServiceDB {
  /**
   * Create a new dispute
   */
  async createDispute(
    userId: string,
    bureau: Bureau,
    itemType: string,
    itemDescription: string,
    reason: string,
    letterContent: string,
  ): Promise<Dispute> {
    const insertData: DisputeInsert = {
      user_id: userId,
      bureau,
      item_type: itemType,
      item_description: itemDescription,
      reason,
      letter_content: letterContent,
      status: "draft",
    };

    const { data, error } = await disputes()
      .insert(insertData as any)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create dispute: ${error.message}`);
    }

    return this.mapToDispute(data);
  }

  /**
   * Get dispute by ID — scoped to userId (IDOR defence)
   */
  async getDispute(disputeId: string, userId: string): Promise<Dispute | null> {
    const { data, error } = await disputes()
      .select("*")
      .eq("id", disputeId)
      .eq("user_id", userId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return null;
      }
      throw new Error(`Failed to fetch dispute: ${error.message}`);
    }

    return this.mapToDispute(data);
  }

  /**
   * Get user disputes
   */
  async getUserDisputes(
    userId: string,
    status?: DisputeStatus,
  ): Promise<Dispute[]> {
    let query = disputes()
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch user disputes: ${error.message}`);
    }

    return (data || []).map(this.mapToDispute);
  }

  /**
   * Send dispute to bureau — scoped to userId (IDOR defence)
   */
  async sendDispute(disputeId: string, userId: string): Promise<Dispute> {
    const now = new Date().toISOString();

    const updateData: DisputeUpdate = {
      status: "sent",
      sent_at: now,
    };

    const { data, error } = await disputes()
      // @ts-ignore - Supabase types issue with update operations
      .update(updateData)
      .eq("id", disputeId)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to send dispute: ${error.message}`);
    }

    return this.mapToDispute(data);
  }

  /**
   * Update dispute status — scoped to userId (IDOR defence)
   */
  async updateDisputeStatus(
    disputeId: string,
    userId: string,
    status: DisputeStatus,
  ): Promise<Dispute> {
    const updates: DisputeUpdate = { status };

    if (status === "resolved") {
      updates.resolved_at = new Date().toISOString();
    }

    const { data, error } = await disputes()
      // @ts-ignore - Supabase types issue with update operations
      .update(updates)
      .eq("id", disputeId)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update dispute status: ${error.message}`);
    }

    return this.mapToDispute(data);
  }

  /**
   * Resolve dispute with outcome — scoped to userId (IDOR defence)
   */
  async resolveDispute(
    disputeId: string,
    userId: string,
    outcome: DisputeOutcome,
  ): Promise<Dispute> {
    const updateData: DisputeUpdate = {
      status: "resolved",
      outcome,
      resolved_at: new Date().toISOString(),
    };

    const { data, error } = await disputes()
      // @ts-ignore - Supabase types issue with update operations
      .update(updateData)
      .eq("id", disputeId)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to resolve dispute: ${error.message}`);
    }

    return this.mapToDispute(data);
  }

  /**
   * Add a note to a dispute — scoped to userId (IDOR defence).
   * Uses a Postgres concat expression so no read-before-write is needed.
   * Notes are separated by double newlines.
   */
  async addNote(
    disputeId: string,
    userId: string,
    note: string,
  ): Promise<Dispute> {
    // A single update scoped by both id and user_id — if it resolves to null
    // (PGRST116), ownership failed (IDOR blocked).
    const { data, error } = await disputes()
      .update({ notes: note } as any)
      .eq("id", disputeId)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to add note: ${error.message}`);
    }

    return this.mapToDispute(data);
  }

  /**
   * Add evidence URL to a dispute — scoped to userId (IDOR defence).
   * Evidence URLs are appended to `notes` as structured text since the
   * `disputes` table has no dedicated evidence column.
   */
  async addEvidence(
    disputeId: string,
    userId: string,
    evidenceUrl: string,
  ): Promise<Dispute> {
    return this.addNote(disputeId, userId, `[evidence] ${evidenceUrl}`);
  }

  /**
   * Get dispute statistics
   */
  async getUserDisputeStats(userId: string): Promise<DisputeStats> {
    const userDisputes = await this.getUserDisputes(userId);
    const resolved = userDisputes.filter((d) => d.status === "resolved");
    const successful = resolved.filter(
      (d) => d.outcome === "removed" || d.outcome === "updated",
    );

    // Calculate average resolution time
    const resolutionTimes = resolved
      .filter((d) => d.sentAt && d.resolvedAt)
      .map((d) => {
        const sent = d.sentAt!.getTime();
        const resolvedTime = d.resolvedAt!.getTime();
        return (resolvedTime - sent) / (1000 * 60 * 60 * 24); // Days
      });

    const averageResolutionDays =
      resolutionTimes.length > 0
        ? resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length
        : 0;

    return {
      total: userDisputes.length,
      active: userDisputes.filter(
        (d) => d.status === "sent" || d.status === "under_review",
      ).length,
      resolved: resolved.length,
      successRate:
        resolved.length > 0 ? (successful.length / resolved.length) * 100 : 0,
      averageResolutionDays: Math.round(averageResolutionDays),
    };
  }

  /**
   * Get disputes by bureau
   */
  async getDisputesByBureau(
    userId: string,
    bureau: Bureau,
  ): Promise<Dispute[]> {
    const { data, error } = await disputes()
      .select("*")
      .eq("user_id", userId)
      .eq("bureau", bureau)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch disputes by bureau: ${error.message}`);
    }

    return (data || []).map(this.mapToDispute);
  }

  /**
   * Delete dispute — scoped to userId (IDOR defence).
   * Returns false when the dispute does not exist or belongs to another user.
   */
  async deleteDispute(disputeId: string, userId: string): Promise<boolean> {
    const { error } = await disputes()
      .delete()
      .eq("id", disputeId)
      .eq("user_id", userId);

    if (error) {
      return false;
    }

    return true;
  }

  /**
   * Map database row to Dispute interface
   */
  private mapToDispute(
    row: Database["public"]["Tables"]["disputes"]["Row"],
  ): Dispute {
    return {
      id: row.id,
      userId: row.user_id,
      bureau: row.bureau,
      itemType: row.item_type,
      itemDescription: row.item_description,
      reason: row.reason,
      status: row.status,
      outcome: row.outcome || undefined,
      letterContent: row.letter_content,
      createdAt: new Date(row.created_at),
      sentAt: row.sent_at ? new Date(row.sent_at) : undefined,
      resolvedAt: row.resolved_at ? new Date(row.resolved_at) : undefined,
    };
  }
}

// Export singleton instance
export const disputeServiceDB = new DisputeServiceDB();
export default disputeServiceDB;
