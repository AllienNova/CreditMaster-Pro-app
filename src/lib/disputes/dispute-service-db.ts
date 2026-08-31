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

import { getServiceRoleClient } from "@/lib/supabase/service-role";
import type { Database } from "../supabase/types";

// Type helpers for Supabase operations
type DisputeRow = Database["public"]["Tables"]["disputes"]["Row"];
type DisputeInsert = Database["public"]["Tables"]["disputes"]["Insert"];
type DisputeUpdate = Database["public"]["Tables"]["disputes"]["Update"];

// Helper to get typed table reference
const disputes = () => getServiceRoleClient().from("disputes");

export type DisputeStatus =
  | "draft"
  | "sent"
  | "under_review"
  | "resolved"
  | "rejected";

export type DisputeOutcome = "removed" | "updated" | "verified";

export type Bureau = "experian" | "equifax" | "transunion";

/**
 * One dated step in a dispute's life.
 *
 * Structurally identical to `DisputeTimelineEvent` in `dispute-service.ts`, so
 * a dispute returned by THIS service satisfies the type the dispute UI is
 * written against. See the note on `Dispute.timeline` below.
 */
export interface DisputeTimelineEvent {
  id: string;
  date: Date;
  status: DisputeStatus;
  description: string;
  automated: boolean;
}

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
  notes: string | null;
  /**
   * REQUIRED, not optional — deliberately.
   *
   * `DisputeDetail` is typed against the `Dispute` in `dispute-service.ts`,
   * where `timeline` is required, and renders `<DisputeTimeline timeline={...}>`
   * which calls `.map` on it unguarded. This service is what actually backs
   * `/api/disputes/[id]`, and it used to drop the field entirely — so every
   * dispute detail page threw "Cannot read properties of undefined (reading
   * 'map')" and rendered an error boundary instead of the dispute.
   *
   * Nothing caught it: the two `Dispute` interfaces are separate declarations,
   * and the payload crosses the network as `response.json()` (`any`), so no
   * compiler ever compared them. Making the field required here means the
   * mapper cannot silently omit it again.
   */
  timeline: DisputeTimelineEvent[];
}

export interface DisputeStats {
  total: number;
  active: number;
  resolved: number;
  successRate: number;
  averageResolutionDays: number;
}

/**
 * Derive a dispute's timeline from the timestamps the row already carries.
 *
 * There is no dispute-events table — checked against the live schema, the only
 * dispute-ish tables are `disputes`, `bureau_disputes` and
 * `dispute_template_usage`. So the timeline is not stored; it is reconstructed
 * from the dated columns, and every event below corresponds to a real non-null
 * timestamp. Nothing is invented: a dispute that was never sent produces no
 * "sent" event.
 *
 * Deliberately a module-scope function, NOT a method. `mapToDispute` is passed
 * as a bare reference in `.map(this.mapToDispute)` (getUserDisputes), so `this`
 * is undefined inside it — a `this.buildTimeline(...)` call would throw on
 * every list query while working fine on single fetches.
 */
function buildTimeline(row: DisputeRow): DisputeTimelineEvent[] {
  const events: DisputeTimelineEvent[] = [
    {
      id: `${row.id}-created`,
      date: new Date(row.created_at),
      status: "draft",
      description: "Dispute created",
      automated: false,
    },
  ];

  if (row.sent_at) {
    events.push({
      id: `${row.id}-sent`,
      date: new Date(row.sent_at),
      status: "sent",
      description: `Dispute letter sent to ${row.bureau}`,
      automated: false,
    });
  }

  if (row.resolved_at) {
    events.push({
      id: `${row.id}-resolved`,
      date: new Date(row.resolved_at),
      // `rejected` is a terminal state too; report the row's own status rather
      // than assuming every closed dispute was resolved in the user's favour.
      status: row.status === "rejected" ? "rejected" : "resolved",
      description: row.outcome
        ? `Dispute closed — item ${row.outcome}`
        : "Dispute closed",
      automated: false,
    });
  }

  // `automated` is false throughout because no column records whether a step
  // was machine-driven. False here means "not recorded as automated", not a
  // claim that a human did it.
  return events.sort((a, b) => a.date.getTime() - b.date.getTime());
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

    const { data, error } = await (disputes() as ReturnType<typeof disputes>)
      .update(updateData as DisputeUpdate)
      .eq("id", disputeId)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to send dispute: ${error.message}`);
    }

    return this.mapToDispute(data as DisputeRow);
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

    const { data, error } = await (disputes() as ReturnType<typeof disputes>)
      .update(updates as DisputeUpdate)
      .eq("id", disputeId)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update dispute status: ${error.message}`);
    }

    return this.mapToDispute(data as DisputeRow);
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

    const { data, error } = await (disputes() as ReturnType<typeof disputes>)
      .update(updateData as DisputeUpdate)
      .eq("id", disputeId)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to resolve dispute: ${error.message}`);
    }

    return this.mapToDispute(data as DisputeRow);
  }

  /**
   * Add a note to a dispute — scoped to userId (IDOR defence).
   * Reads the current notes (user-scoped, so ownership is verified), appends
   * the new note with a double-newline separator, then writes back.
   * Notes are separated by double newlines.
   */
  async addNote(
    disputeId: string,
    userId: string,
    note: string,
  ): Promise<Dispute> {
    // Read current state — this also enforces ownership (returns null for wrong user).
    const existing = await this.getDispute(disputeId, userId);
    if (!existing) {
      throw new Error("Dispute not found");
    }

    const appended = existing.notes
      ? `${existing.notes}\n\n${note}`
      : note;

    const updateData: DisputeUpdate = { notes: appended };

    const { data, error } = await (disputes() as ReturnType<typeof disputes>)
      .update(updateData)
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
      notes: row.notes,
      timeline: buildTimeline(row),
    };
  }
}

// Export singleton instance
export const disputeServiceDB = new DisputeServiceDB();
export default disputeServiceDB;
