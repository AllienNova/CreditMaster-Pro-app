/**
 * Dispute Tracking Service (Database Version)
 *
 * Manages credit dispute lifecycle with Supabase persistence:
 * - Create disputes
 * - Track status
 * - Update progress
 * - Predict timelines
 * - Store outcomes
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
      // DisputeServiceDB error: Failed to create dispute
      throw new Error(`Failed to create dispute: ${error.message}`);
    }

    return this.mapToDispute(data);
  }

  /**
   * Get dispute by ID
   */
  async getDispute(disputeId: string): Promise<Dispute | null> {
    const { data, error } = await disputes()
      .select("*")
      .eq("id", disputeId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // Not found
        return null;
      }
      // DisputeServiceDB error: Failed to fetch dispute
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
      // DisputeServiceDB error: Failed to fetch user disputes
      throw new Error(`Failed to fetch user disputes: ${error.message}`);
    }

    return (data || []).map(this.mapToDispute);
  }

  /**
   * Send dispute to bureau
   */
  async sendDispute(disputeId: string): Promise<Dispute> {
    const now = new Date().toISOString();

    const updateData: DisputeUpdate = {
      status: "sent",
      sent_at: now,
    };

    const query = disputes();
    const { data, error } = await query
      // @ts-ignore - Supabase types issue with update operations
      .update(updateData)
      .eq("id", disputeId)
      .select()
      .single();

    if (error) {
      // DisputeServiceDB error: Failed to send dispute
      throw new Error(`Failed to send dispute: ${error.message}`);
    }

    return this.mapToDispute(data);
  }

  /**
   * Update dispute status
   */
  async updateDisputeStatus(
    disputeId: string,
    status: DisputeStatus,
  ): Promise<Dispute> {
    const updates: DisputeUpdate = { status };

    if (status === "resolved") {
      updates.resolved_at = new Date().toISOString();
    }

    const query2 = disputes();
    const { data, error } = await query2
      // @ts-ignore - Supabase types issue with update operations
      .update(updates)
      .eq("id", disputeId)
      .select()
      .single();

    if (error) {
      // DisputeServiceDB error: Failed to update dispute status
      throw new Error(`Failed to update dispute status: ${error.message}`);
    }

    return this.mapToDispute(data);
  }

  /**
   * Resolve dispute with outcome
   */
  async resolveDispute(
    disputeId: string,
    outcome: DisputeOutcome,
  ): Promise<Dispute> {
    const updateData: DisputeUpdate = {
      status: "resolved",
      outcome,
      resolved_at: new Date().toISOString(),
    };

    const query3 = disputes();
    const { data, error } = await query3
      // @ts-ignore - Supabase types issue with update operations
      .update(updateData)
      .eq("id", disputeId)
      .select()
      .single();

    if (error) {
      // DisputeServiceDB error: Failed to resolve dispute
      throw new Error(`Failed to resolve dispute: ${error.message}`);
    }

    return this.mapToDispute(data);
  }

  /**
   * Get dispute statistics
   */
  async getUserDisputeStats(userId: string): Promise<DisputeStats> {
    const disputes = await this.getUserDisputes(userId);
    const resolved = disputes.filter((d) => d.status === "resolved");
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
      total: disputes.length,
      active: disputes.filter(
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
      // DisputeServiceDB error: Failed to fetch disputes by bureau
      throw new Error(`Failed to fetch disputes by bureau: ${error.message}`);
    }

    return (data || []).map(this.mapToDispute);
  }

  /**
   * Delete dispute
   */
  async deleteDispute(disputeId: string): Promise<boolean> {
    const { error } = await disputes().delete().eq("id", disputeId);

    if (error) {
      // DisputeServiceDB error: Failed to delete dispute
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
