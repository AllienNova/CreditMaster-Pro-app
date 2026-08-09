/**
 * Shared Family & Friends Goals Service
 * Enable families and friends to be financially accountable together
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Types
export type MemberRole = "owner" | "admin" | "contributor";
export type GoalVisibility = "private" | "members_only" | "public";
export type ContributionFrequency =
  | "one_time"
  | "weekly"
  | "biweekly"
  | "monthly";
export type SharedGoalStatus =
  | "planning"
  | "active"
  | "paused"
  | "completed"
  | "cancelled";

export interface SharedGoal {
  id: string;
  name: string;
  description: string;
  emoji: string;
  targetAmount: number;
  currentAmount: number;
  currency: string;
  startDate: Date;
  targetDate: Date;
  visibility: GoalVisibility;
  status: SharedGoalStatus;
  members: SharedGoalMember[];
  progressPercent: number;
  totalContributions: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface SharedGoalMember {
  id: string;
  goalId: string;
  userId: string;
  displayName: string;
  avatarUrl?: string;
  relationship?: string;
  role: MemberRole;
  commitmentAmount?: number;
  commitmentFrequency?: ContributionFrequency;
  totalContributed: number;
  contributionCount: number;
  showContributionAmounts: boolean;
  isActive: boolean;
  joinedAt: Date;
}

export interface Contribution {
  id: string;
  goalId: string;
  memberId: string;
  memberName: string;
  amount: number;
  note?: string;
  createdAt: Date;
}

export interface GoalInvitation {
  id: string;
  goalId: string;
  goalName: string;
  inviterName: string;
  recipientEmail: string;
  role: MemberRole;
  personalMessage?: string;
  status: "pending" | "accepted" | "declined" | "expired";
  expiresAt: Date;
  createdAt: Date;
}

export interface GoalUpdate {
  id: string;
  goalId: string;
  authorName: string;
  type: "message" | "milestone" | "nudge" | "celebration" | "system";
  content: string;
  createdAt: Date;
}

export const RELATIONSHIP_TYPES = [
  { value: "spouse", label: "Spouse/Partner", emoji: "" },
  { value: "parent", label: "Parent", emoji: "‍‍" },
  { value: "sibling", label: "Sibling", emoji: "" },
  { value: "friend", label: "Friend", emoji: "" },
  { value: "roommate", label: "Roommate", emoji: "" },
  { value: "other", label: "Other", emoji: "" },
] as const;

export const SHARED_GOAL_TEMPLATES = [
  {
    id: "emergency_fund",
    name: "Family Emergency Fund",
    emoji: "",
    suggestedAmount: 10000,
  },
  {
    id: "house_down_payment",
    name: "House Down Payment",
    emoji: "",
    suggestedAmount: 50000,
  },
  { id: "wedding", name: "Wedding Fund", emoji: "", suggestedAmount: 25000 },
  {
    id: "vacation",
    name: "Group Vacation",
    emoji: "",
    suggestedAmount: 5000,
  },
  {
    id: "parents_gift",
    name: "Parents' Gift",
    emoji: "",
    suggestedAmount: 1500,
  },
  {
    id: "debt_payoff",
    name: "Joint Debt Payoff",
    emoji: "",
    suggestedAmount: 15000,
  },
  {
    id: "baby_fund",
    name: "Baby/Adoption Fund",
    emoji: "",
    suggestedAmount: 15000,
  },
  { id: "custom", name: "Custom Goal", emoji: "", suggestedAmount: 5000 },
];

export class SharedGoalsService {
  private readonly supabase: SupabaseClient;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  async createGoal(
    creatorId: string,
    creatorName: string,
    goal: Partial<SharedGoal>,
  ): Promise<SharedGoal> {
    const now = new Date();
    const newGoal = {
      id: crypto.randomUUID(),
      name: goal.name || "Shared Goal",
      description: goal.description || "",
      emoji: goal.emoji || "",
      target_amount: goal.targetAmount || 0,
      current_amount: 0,
      currency: "USD",
      start_date: now.toISOString(),
      target_date:
        goal.targetDate?.toISOString() ||
        new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      visibility: goal.visibility || "members_only",
      status: "active",
      total_contributions: 0,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    };

    const { data, error } = await this.supabase
      .from("shared_goals")
      .insert(newGoal)
      .select()
      .single();
    if (error) throw error;

    // Add creator as owner
    const { error: memberError } = await this.supabase
      .from("shared_goal_members")
      .insert({
        id: crypto.randomUUID(),
        goal_id: newGoal.id,
        user_id: creatorId,
        display_name: creatorName,
        role: "owner",
        total_contributed: 0,
        contribution_count: 0,
        show_contribution_amounts: true,
        is_active: true,
        joined_at: now.toISOString(),
      });
    if (memberError) throw memberError;

    return this.goalFromDb(data);
  }

  async getGoal(goalId: string): Promise<SharedGoal | null> {
    const { data, error } = await this.supabase
      .from("shared_goals")
      .select("*")
      .eq("id", goalId)
      .single();
    if (error && error.code !== "PGRST116") throw error;
    if (!data) return null;
    const goal = this.goalFromDb(data);
    goal.members = await this.getMembers(goalId);
    return goal;
  }

  async getUserGoals(userId: string): Promise<SharedGoal[]> {
    const { data: memberData, error: memberError } = await this.supabase
      .from("shared_goal_members")
      .select("goal_id")
      .eq("user_id", userId)
      .eq("is_active", true);
    if (memberError) throw memberError;
    if (!memberData?.length) return [];

    const { data, error } = await this.supabase
      .from("shared_goals")
      .select("*")
      .in(
        "id",
        memberData.map((m) => m.goal_id),
      );
    if (error) throw error;
    return (data || []).map(this.goalFromDb);
  }

  async getMembers(goalId: string): Promise<SharedGoalMember[]> {
    const { data, error } = await this.supabase
      .from("shared_goal_members")
      .select("*")
      .eq("goal_id", goalId)
      .eq("is_active", true);
    if (error) throw error;
    return (data || []).map(this.memberFromDb);
  }

  /**
   * A real query failure must never present the same way as "genuinely not
   * a member" — the latter is an expected authorization outcome, the former
   * is a system failure that should surface as one, not get relabeled into
   * a misleading "Not a member" error.
   */
  private async assertMember(goalId: string, userId: string): Promise<void> {
    const { data, error } = await this.supabase
      .from("shared_goal_members")
      .select("id")
      .eq("goal_id", goalId)
      .eq("user_id", userId)
      .eq("is_active", true)
      .single();
    if (error && error.code !== "PGRST116") throw error;
    if (!data) throw new Error("Not a member of this goal");
  }

  async inviteMember(
    goalId: string,
    userId: string,
    inviterName: string,
    email: string,
    role: MemberRole = "contributor",
  ): Promise<GoalInvitation> {
    await this.assertMember(goalId, userId);
    const goal = await this.getGoal(goalId);
    const inv = {
      id: crypto.randomUUID(),
      goal_id: goalId,
      goal_name: goal?.name || "",
      inviter_name: inviterName,
      recipient_email: email,
      role,
      status: "pending",
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      created_at: new Date().toISOString(),
    };
    const { data, error } = await this.supabase
      .from("shared_goal_invitations")
      .insert(inv)
      .select()
      .single();
    if (error) throw error;
    return this.invitationFromDb(data);
  }

  async acceptInvitation(
    invitationId: string,
    userId: string,
    displayName: string,
  ): Promise<void> {
    const { data: inv, error: invError } = await this.supabase
      .from("shared_goal_invitations")
      .select("*")
      .eq("id", invitationId)
      .single();
    if (invError && invError.code !== "PGRST116") throw invError;
    if (!inv || inv.status !== "pending") throw new Error("Invalid invitation");

    const { error: memberError } = await this.supabase
      .from("shared_goal_members")
      .insert({
        id: crypto.randomUUID(),
        goal_id: inv.goal_id,
        user_id: userId,
        display_name: displayName,
        role: inv.role,
        total_contributed: 0,
        contribution_count: 0,
        show_contribution_amounts: true,
        is_active: true,
        joined_at: new Date().toISOString(),
      });
    if (memberError) throw memberError;

    const { error: updateError } = await this.supabase
      .from("shared_goal_invitations")
      .update({ status: "accepted" })
      .eq("id", invitationId);
    if (updateError) throw updateError;
  }

  async recordContribution(
    goalId: string,
    userId: string,
    memberId: string,
    memberName: string,
    amount: number,
    note?: string,
  ): Promise<Contribution> {
    await this.assertMember(goalId, userId);
    const contrib = {
      id: crypto.randomUUID(),
      goal_id: goalId,
      member_id: memberId,
      member_name: memberName,
      amount,
      note,
      created_at: new Date().toISOString(),
    };
    const { data, error } = await this.supabase
      .from("shared_goal_contributions")
      .insert(contrib)
      .select()
      .single();
    if (error) throw error;

    // Update goal total
    const goal = await this.getGoal(goalId);
    if (goal) {
      await this.supabase
        .from("shared_goals")
        .update({
          current_amount: goal.currentAmount + amount,
          total_contributions: goal.totalContributions + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", goalId);
    }

    return this.contributionFromDb(data);
  }

  async postUpdate(
    goalId: string,
    userId: string,
    authorName: string,
    type: GoalUpdate["type"],
    content: string,
  ): Promise<void> {
    await this.assertMember(goalId, userId);
    const { error } = await this.supabase.from("shared_goal_updates").insert({
      id: crypto.randomUUID(),
      goal_id: goalId,
      author_name: authorName,
      type,
      content,
      created_at: new Date().toISOString(),
    });
    if (error) throw error;
  }

  async getUpdates(goalId: string, userId: string): Promise<GoalUpdate[]> {
    await this.assertMember(goalId, userId);
    const { data, error } = await this.supabase
      .from("shared_goal_updates")
      .select("*")
      .eq("goal_id", goalId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw error;
    return (data || []).map(this.updateFromDb);
  }

  async sendNudge(
    goalId: string,
    userId: string,
    senderName: string,
    message?: string,
  ): Promise<void> {
    await this.postUpdate(
      goalId,
      userId,
      senderName,
      "nudge",
      message || `${senderName} sent a friendly nudge! `,
    );
  }

  getTemplates() {
    return SHARED_GOAL_TEMPLATES;
  }
  getRelationshipTypes() {
    return RELATIONSHIP_TYPES;
  }

  private goalFromDb(d: Record<string, unknown>): SharedGoal {
    const target = d.target_amount as number;
    const current = d.current_amount as number;
    return {
      id: d.id as string,
      name: d.name as string,
      description: (d.description as string) || "",
      emoji: d.emoji as string,
      targetAmount: target,
      currentAmount: current,
      currency: d.currency as string,
      startDate: new Date(d.start_date as string),
      targetDate: new Date(d.target_date as string),
      visibility: d.visibility as GoalVisibility,
      status: d.status as SharedGoalStatus,
      members: [],
      progressPercent: target > 0 ? (current / target) * 100 : 0,
      totalContributions: d.total_contributions as number,
      createdAt: new Date(d.created_at as string),
      updatedAt: new Date(d.updated_at as string),
    };
  }

  private memberFromDb(d: Record<string, unknown>): SharedGoalMember {
    return {
      id: d.id as string,
      goalId: d.goal_id as string,
      userId: d.user_id as string,
      displayName: d.display_name as string,
      avatarUrl: d.avatar_url as string,
      relationship: d.relationship as string,
      role: d.role as MemberRole,
      commitmentAmount: d.commitment_amount as number,
      commitmentFrequency: d.commitment_frequency as ContributionFrequency,
      totalContributed: d.total_contributed as number,
      contributionCount: d.contribution_count as number,
      showContributionAmounts: d.show_contribution_amounts as boolean,
      isActive: d.is_active as boolean,
      joinedAt: new Date(d.joined_at as string),
    };
  }

  private invitationFromDb(d: Record<string, unknown>): GoalInvitation {
    return {
      id: d.id as string,
      goalId: d.goal_id as string,
      goalName: d.goal_name as string,
      inviterName: d.inviter_name as string,
      recipientEmail: d.recipient_email as string,
      role: d.role as MemberRole,
      personalMessage: d.personal_message as string,
      status: d.status as GoalInvitation["status"],
      expiresAt: new Date(d.expires_at as string),
      createdAt: new Date(d.created_at as string),
    };
  }

  private contributionFromDb(d: Record<string, unknown>): Contribution {
    return {
      id: d.id as string,
      goalId: d.goal_id as string,
      memberId: d.member_id as string,
      memberName: d.member_name as string,
      amount: d.amount as number,
      note: d.note as string,
      createdAt: new Date(d.created_at as string),
    };
  }

  private updateFromDb(d: Record<string, unknown>): GoalUpdate {
    return {
      id: d.id as string,
      goalId: d.goal_id as string,
      authorName: d.author_name as string,
      type: d.type as GoalUpdate["type"],
      content: d.content as string,
      createdAt: new Date(d.created_at as string),
    };
  }
}

let instance: SharedGoalsService | null = null;
export function getSharedGoalsService(): SharedGoalsService {
  if (!instance) {
    instance = new SharedGoalsService(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
  }
  return instance;
}
