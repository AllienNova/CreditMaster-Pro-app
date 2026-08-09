/**
 * Accountability Partners Service
 *
 * Connect with friends/family for mutual goal support:
 * - Partner invitations and connections
 * - Privacy-controlled progress sharing
 * - Goal collaboration
 * - Encouragement and nudges
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";

// ============================================================================
// TYPES
// ============================================================================

export type PartnershipStatus = "pending" | "active" | "declined" | "ended";
export type ShareLevel = "none" | "progress_only" | "detailed" | "full";
export type NudgeType =
  | "encouragement"
  | "reminder"
  | "celebration"
  | "check_in";

export interface Partnership {
  id: string;
  requesterId: string;
  partnerId: string;
  status: PartnershipStatus;

  requesterShareLevel: ShareLevel;
  partnerShareLevel: ShareLevel;
  sharedGoalIds: string[];

  totalNudgesSent: number;
  totalCelebrations: number;
  partnershipStartDate?: Date;

  createdAt: Date;
  updatedAt: Date;
}

export interface PartnerProfile {
  id: string;
  odisplayName: string;
  avatarUrl?: string;
  shareLevel: ShareLevel;
  progress?: SharedProgress;
  partnerSince?: Date;
  nudgesSent: number;
  nudgesReceived: number;
}

export interface SharedProgress {
  overallProgress?: number;
  goalsOnTrack?: number;
  goalsTotal?: number;
  currentStreak?: number;
  savingsProgress?: number;
  debtProgress?: number;
  budgetAdherence?: number;
  goalDetails?: SharedGoal[];
  recentMilestones?: Milestone[];
}

export interface SharedGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  progressPercent: number;
  targetDate?: Date;
  isOnTrack: boolean;
}

export interface Milestone {
  id: string;
  title: string;
  achievedAt: Date;
  xpEarned: number;
}

export interface Nudge {
  id: string;
  partnershipId: string;
  senderId: string;
  receiverId: string;
  type: NudgeType;
  message: string;
  isRead: boolean;
  createdAt: Date;
}

export interface PartnerInvitation {
  id: string;
  senderId: string;
  senderName: string;
  recipientEmail: string;
  recipientUserId?: string;
  message?: string;
  status: "pending" | "accepted" | "declined" | "expired";
  expiresAt: Date;
  createdAt: Date;
}

const NUDGE_TEMPLATES: Record<NudgeType, string[]> = {
  encouragement: [
    "You've got this! Keep pushing toward your goals! ",
    "I believe in you! Every small step counts! ",
    "You're doing amazing! Stay focused! ",
  ],
  reminder: [
    "Hey! Don't forget to log your transactions today! ",
    "Quick reminder to check on your budget! ",
    "Have you reviewed your goals this week? ",
  ],
  celebration: [
    "Congratulations on your achievement! ",
    "You did it! So proud of you! ",
    "Amazing milestone reached! Celebrate! ",
  ],
  check_in: [
    "How's your financial journey going? ",
    "Just checking in - everything on track? ",
    "Thinking of you! How are your goals? ",
  ],
};

// ============================================================================
// SERVICE
// ============================================================================

export class AccountabilityPartnersService {
  private readonly supabase: SupabaseClient;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  async sendInvitation(
    senderId: string,
    senderName: string,
    recipientEmail: string,
    message?: string,
  ): Promise<PartnerInvitation> {
    const { data: existingUser } = await this.supabase
      .from("profiles")
      .select("id")
      .eq("email", recipientEmail)
      .single();

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const invitation: PartnerInvitation = {
      id: crypto.randomUUID(),
      senderId,
      senderName,
      recipientEmail,
      recipientUserId: existingUser?.id,
      message,
      status: "pending",
      expiresAt,
      createdAt: now,
    };

    const { data, error } = await this.supabase
      .from("partner_invitations")
      .insert({
        id: invitation.id,
        sender_id: invitation.senderId,
        sender_name: invitation.senderName,
        recipient_email: invitation.recipientEmail,
        recipient_user_id: invitation.recipientUserId,
        message: invitation.message,
        status: invitation.status,
        expires_at: invitation.expiresAt.toISOString(),
        created_at: invitation.createdAt.toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return this.invitationFromDb(data);
  }

  async acceptInvitation(
    invitationId: string,
    userId: string,
  ): Promise<Partnership> {
    const { data: invitation } = await this.supabase
      .from("partner_invitations")
      .select("*")
      .eq("id", invitationId)
      .single();

    if (!invitation) throw new Error("Invitation not found");
    if (invitation.status !== "pending")
      throw new Error("Invitation is no longer valid");

    await this.supabase
      .from("partner_invitations")
      .update({ status: "accepted", recipient_user_id: userId })
      .eq("id", invitationId);

    return this.createPartnership(invitation.sender_id, userId);
  }

  async declineInvitation(invitationId: string): Promise<void> {
    await this.supabase
      .from("partner_invitations")
      .update({ status: "declined" })
      .eq("id", invitationId);
  }

  async getPendingInvitations(userId: string): Promise<PartnerInvitation[]> {
    const { data } = await this.supabase
      .from("partner_invitations")
      .select("*")
      .eq("recipient_user_id", userId)
      .eq("status", "pending")
      .gt("expires_at", new Date().toISOString());

    return (data || []).map(this.invitationFromDb);
  }

  private async createPartnership(
    requesterId: string,
    partnerId: string,
  ): Promise<Partnership> {
    const now = new Date();
    const partnership: Partnership = {
      id: crypto.randomUUID(),
      requesterId,
      partnerId,
      status: "active",
      requesterShareLevel: "progress_only",
      partnerShareLevel: "progress_only",
      sharedGoalIds: [],
      totalNudgesSent: 0,
      totalCelebrations: 0,
      partnershipStartDate: now,
      createdAt: now,
      updatedAt: now,
    };

    const { data, error } = await this.supabase
      .from("partnerships")
      .insert(this.partnershipToDb(partnership))
      .select()
      .single();

    if (error) throw error;
    return this.partnershipFromDb(data);
  }

  async getUserPartnerships(userId: string): Promise<Partnership[]> {
    const { data, error } = await this.supabase
      .from("partnerships")
      .select("*")
      .or(`requester_id.eq.${userId},partner_id.eq.${userId}`)
      .eq("status", "active");

    if (error) throw error;
    return (data || []).map(this.partnershipFromDb);
  }

  async updateShareLevel(
    partnershipId: string,
    userId: string,
    shareLevel: ShareLevel,
  ): Promise<Partnership> {
    const partnership = await this.getPartnership(partnershipId);
    if (!partnership) throw new Error("Partnership not found");

    const isRequester = partnership.requesterId === userId;
    const updateField = isRequester
      ? "requester_share_level"
      : "partner_share_level";

    const { data, error } = await this.supabase
      .from("partnerships")
      .update({
        [updateField]: shareLevel,
        updated_at: new Date().toISOString(),
      })
      .eq("id", partnershipId)
      .select()
      .single();

    if (error) throw error;
    return this.partnershipFromDb(data);
  }

  async getPartnership(partnershipId: string): Promise<Partnership | null> {
    const { data } = await this.supabase
      .from("partnerships")
      .select("*")
      .eq("id", partnershipId)
      .single();

    return data ? this.partnershipFromDb(data) : null;
  }

  async endPartnership(partnershipId: string): Promise<void> {
    await this.supabase
      .from("partnerships")
      .update({ status: "ended", updated_at: new Date().toISOString() })
      .eq("id", partnershipId);
  }

  async sendNudge(
    partnershipId: string,
    senderId: string,
    type: NudgeType,
    customMessage?: string,
  ): Promise<Nudge> {
    const partnership = await this.getPartnership(partnershipId);
    if (!partnership) throw new Error("Partnership not found");

    const receiverId =
      partnership.requesterId === senderId
        ? partnership.partnerId
        : partnership.requesterId;
    const templates = NUDGE_TEMPLATES[type];
    const message =
      customMessage || templates[Math.floor(Math.random() * templates.length)];

    const nudge: Nudge = {
      id: crypto.randomUUID(),
      partnershipId,
      senderId,
      receiverId,
      type,
      message,
      isRead: false,
      createdAt: new Date(),
    };

    const { data, error } = await this.supabase
      .from("partner_nudges")
      .insert({
        id: nudge.id,
        partnership_id: nudge.partnershipId,
        sender_id: nudge.senderId,
        receiver_id: nudge.receiverId,
        type: nudge.type,
        message: nudge.message,
        is_read: nudge.isRead,
        created_at: nudge.createdAt.toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return this.nudgeFromDb(data);
  }

  async getNudges(
    userId: string,
    unreadOnly: boolean = false,
  ): Promise<Nudge[]> {
    let query = this.supabase
      .from("partner_nudges")
      .select("*")
      .eq("receiver_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (unreadOnly) query = query.eq("is_read", false);

    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(this.nudgeFromDb);
  }

  async markNudgeAsRead(nudgeId: string): Promise<void> {
    await this.supabase
      .from("partner_nudges")
      .update({ is_read: true })
      .eq("id", nudgeId);
  }

  getNudgeTemplates(): typeof NUDGE_TEMPLATES {
    return NUDGE_TEMPLATES;
  }

  private partnershipToDb(p: Partnership): Record<string, unknown> {
    return {
      id: p.id,
      requester_id: p.requesterId,
      partner_id: p.partnerId,
      status: p.status,
      requester_share_level: p.requesterShareLevel,
      partner_share_level: p.partnerShareLevel,
      shared_goal_ids: p.sharedGoalIds,
      total_nudges_sent: p.totalNudgesSent,
      total_celebrations: p.totalCelebrations,
      partnership_start_date: p.partnershipStartDate?.toISOString(),
      created_at: p.createdAt.toISOString(),
      updated_at: p.updatedAt.toISOString(),
    };
  }

  private partnershipFromDb(data: Record<string, unknown>): Partnership {
    return {
      id: data.id as string,
      requesterId: data.requester_id as string,
      partnerId: data.partner_id as string,
      status: data.status as PartnershipStatus,
      requesterShareLevel: data.requester_share_level as ShareLevel,
      partnerShareLevel: data.partner_share_level as ShareLevel,
      sharedGoalIds: data.shared_goal_ids as string[],
      totalNudgesSent: data.total_nudges_sent as number,
      totalCelebrations: data.total_celebrations as number,
      partnershipStartDate: data.partnership_start_date
        ? new Date(data.partnership_start_date as string)
        : undefined,
      createdAt: new Date(data.created_at as string),
      updatedAt: new Date(data.updated_at as string),
    };
  }

  private invitationFromDb(data: Record<string, unknown>): PartnerInvitation {
    return {
      id: data.id as string,
      senderId: data.sender_id as string,
      senderName: data.sender_name as string,
      recipientEmail: data.recipient_email as string,
      recipientUserId: data.recipient_user_id as string | undefined,
      message: data.message as string | undefined,
      status: data.status as PartnerInvitation["status"],
      expiresAt: new Date(data.expires_at as string),
      createdAt: new Date(data.created_at as string),
    };
  }

  private nudgeFromDb(data: Record<string, unknown>): Nudge {
    return {
      id: data.id as string,
      partnershipId: data.partnership_id as string,
      senderId: data.sender_id as string,
      receiverId: data.receiver_id as string,
      type: data.type as NudgeType,
      message: data.message as string,
      isRead: data.is_read as boolean,
      createdAt: new Date(data.created_at as string),
    };
  }
}

let accountabilityPartnersServiceInstance: AccountabilityPartnersService | null =
  null;

export function getAccountabilityPartnersService(): AccountabilityPartnersService {
  if (!accountabilityPartnersServiceInstance) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    accountabilityPartnersServiceInstance = new AccountabilityPartnersService(
      supabaseUrl,
      supabaseKey,
    );
  }
  return accountabilityPartnersServiceInstance;
}
