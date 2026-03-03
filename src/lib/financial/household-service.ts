/**
 * Household Financial Collaboration Service
 *
 * Provides family/household financial collaboration:
 * - Household creation and member invitation
 * - Shared budget with per-member visibility
 * - Joint goal tracking with contribution attribution
 * - Privacy controls (individual vs shared data)
 * - Household optimization recommendations
 *
 * @module HouseholdService
 */

// ── Types ────────────────────────────────────────────────────────────────────

export type HouseholdRole = "owner" | "admin" | "member" | "viewer";

export type InvitationStatus = "pending" | "accepted" | "declined" | "expired";

export type VisibilityLevel = "private" | "household" | "public";

export interface Household {
  id: string;
  name: string;
  ownerId: string;
  members: HouseholdMember[];
  createdAt: Date;
  updatedAt: Date;
  settings: HouseholdSettings;
}

export interface HouseholdMember {
  userId: string;
  displayName: string;
  email: string;
  role: HouseholdRole;
  joinedAt: Date;
  privacySettings: MemberPrivacySettings;
}

export interface MemberPrivacySettings {
  shareIncome: boolean;
  shareSpending: boolean;
  shareSavings: boolean;
  shareDebts: boolean;
  shareCreditScore: boolean;
  shareInvestments: boolean;
}

export interface HouseholdSettings {
  defaultVisibility: VisibilityLevel;
  requireApprovalForLargePurchases: boolean;
  largePurchaseThreshold: number;
  sharedCurrency: string;
}

export interface HouseholdInvitation {
  id: string;
  householdId: string;
  inviterUserId: string;
  inviteeEmail: string;
  role: HouseholdRole;
  status: InvitationStatus;
  createdAt: Date;
  expiresAt: Date;
  respondedAt?: Date;
}

export interface SharedBudget {
  id: string;
  householdId: string;
  name: string;
  category: string;
  monthlyLimit: number;
  spent: number;
  remaining: number;
  contributions: BudgetContribution[];
  period: string; // YYYY-MM
}

export interface BudgetContribution {
  memberId: string;
  memberName: string;
  amount: number;
  percentage: number;
}

export interface JointGoal {
  id: string;
  householdId: string;
  name: string;
  description: string;
  targetAmount: number;
  currentAmount: number;
  contributions: GoalContribution[];
  deadline?: Date;
  createdAt: Date;
  status: "active" | "completed" | "paused" | "cancelled";
}

export interface GoalContribution {
  memberId: string;
  memberName: string;
  amount: number;
  date: Date;
  note?: string;
}

export interface HouseholdSummary {
  householdId: string;
  totalIncome: number;
  totalSpending: number;
  totalSavings: number;
  memberSummaries: MemberFinancialSummary[];
  sharedBudgets: SharedBudget[];
  jointGoals: JointGoal[];
}

export interface MemberFinancialSummary {
  memberId: string;
  memberName: string;
  role: HouseholdRole;
  income?: number;
  spending?: number;
  savings?: number;
  visible: boolean;
}

// ── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_PRIVACY: MemberPrivacySettings = {
  shareIncome: false,
  shareSpending: true,
  shareSavings: false,
  shareDebts: false,
  shareCreditScore: false,
  shareInvestments: false,
};

const DEFAULT_SETTINGS: HouseholdSettings = {
  defaultVisibility: "household",
  requireApprovalForLargePurchases: false,
  largePurchaseThreshold: 500,
  sharedCurrency: "USD",
};

const INVITATION_EXPIRY_DAYS = 7;

// ── Helpers ──────────────────────────────────────────────────────────────────

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ── Service ──────────────────────────────────────────────────────────────────

class HouseholdService {
  private readonly households: Map<string, Household> = new Map();
  private readonly invitations: Map<string, HouseholdInvitation> = new Map();
  private readonly sharedBudgets: Map<string, SharedBudget[]> = new Map();
  private readonly jointGoals: Map<string, JointGoal[]> = new Map();
  private readonly memberFinancials: Map<string, { income: number; spending: number; savings: number }> = new Map();

  // ── Household CRUD ─────────────────────────────────────────────────────

  createHousehold(
    ownerId: string,
    name: string,
    ownerName: string,
    ownerEmail: string,
    settings?: Partial<HouseholdSettings>,
  ): Household {
    const household: Household = {
      id: generateId("hh"),
      name,
      ownerId,
      members: [
        {
          userId: ownerId,
          displayName: ownerName,
          email: ownerEmail,
          role: "owner",
          joinedAt: new Date(),
          privacySettings: { ...DEFAULT_PRIVACY },
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
      settings: { ...DEFAULT_SETTINGS, ...settings },
    };

    this.households.set(household.id, household);
    return household;
  }

  getHousehold(householdId: string): Household | null {
    return this.households.get(householdId) ?? null;
  }

  getHouseholdsByUser(userId: string): Household[] {
    const result: Household[] = [];
    for (const household of this.households.values()) {
      if (household.members.some((m) => m.userId === userId)) {
        result.push(household);
      }
    }
    return result;
  }

  updateHouseholdSettings(
    householdId: string,
    requesterId: string,
    settings: Partial<HouseholdSettings>,
  ): Household | null {
    const household = this.households.get(householdId);
    if (!household) return null;

    const requester = household.members.find((m) => m.userId === requesterId);
    if (!requester || (requester.role !== "owner" && requester.role !== "admin")) {
      return null; // unauthorized
    }

    household.settings = { ...household.settings, ...settings };
    household.updatedAt = new Date();
    return household;
  }

  // ── Invitations ────────────────────────────────────────────────────────

  inviteMember(
    householdId: string,
    inviterUserId: string,
    inviteeEmail: string,
    role: HouseholdRole = "member",
  ): HouseholdInvitation | null {
    const household = this.households.get(householdId);
    if (!household) return null;

    const inviter = household.members.find((m) => m.userId === inviterUserId);
    if (!inviter || inviter.role === "viewer") return null; // viewers can't invite

    // Check for duplicate email
    if (household.members.some((m) => m.email === inviteeEmail)) return null;

    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setDate(expiresAt.getDate() + INVITATION_EXPIRY_DAYS);

    const invitation: HouseholdInvitation = {
      id: generateId("inv"),
      householdId,
      inviterUserId,
      inviteeEmail,
      role,
      status: "pending",
      createdAt: now,
      expiresAt,
    };

    this.invitations.set(invitation.id, invitation);
    return invitation;
  }

  acceptInvitation(
    invitationId: string,
    userId: string,
    displayName: string,
  ): Household | null {
    const invitation = this.invitations.get(invitationId);
    if (!invitation || invitation.status !== "pending") return null;

    // Check expiry
    if (new Date() > invitation.expiresAt) {
      invitation.status = "expired";
      return null;
    }

    const household = this.households.get(invitation.householdId);
    if (!household) return null;

    // Add member
    household.members.push({
      userId,
      displayName,
      email: invitation.inviteeEmail,
      role: invitation.role,
      joinedAt: new Date(),
      privacySettings: { ...DEFAULT_PRIVACY },
    });

    invitation.status = "accepted";
    invitation.respondedAt = new Date();
    household.updatedAt = new Date();

    return household;
  }

  declineInvitation(invitationId: string): boolean {
    const invitation = this.invitations.get(invitationId);
    if (!invitation || invitation.status !== "pending") return false;

    invitation.status = "declined";
    invitation.respondedAt = new Date();
    return true;
  }

  getInvitations(householdId: string): HouseholdInvitation[] {
    const result: HouseholdInvitation[] = [];
    for (const inv of this.invitations.values()) {
      if (inv.householdId === householdId) {
        result.push(inv);
      }
    }
    return result;
  }

  // ── Member Management ──────────────────────────────────────────────────

  removeMember(
    householdId: string,
    requesterId: string,
    targetUserId: string,
  ): boolean {
    const household = this.households.get(householdId);
    if (!household) return false;

    const requester = household.members.find((m) => m.userId === requesterId);
    if (!requester || requester.role === "viewer" || requester.role === "member") {
      return false; // only owner/admin can remove
    }

    // Can't remove the owner
    if (targetUserId === household.ownerId) return false;

    const idx = household.members.findIndex((m) => m.userId === targetUserId);
    if (idx === -1) return false;

    household.members.splice(idx, 1);
    household.updatedAt = new Date();
    return true;
  }

  updateMemberPrivacy(
    householdId: string,
    userId: string,
    privacy: Partial<MemberPrivacySettings>,
  ): HouseholdMember | null {
    const household = this.households.get(householdId);
    if (!household) return null;

    const member = household.members.find((m) => m.userId === userId);
    if (!member) return null;

    member.privacySettings = { ...member.privacySettings, ...privacy };
    household.updatedAt = new Date();
    return member;
  }

  updateMemberRole(
    householdId: string,
    requesterId: string,
    targetUserId: string,
    newRole: HouseholdRole,
  ): boolean {
    const household = this.households.get(householdId);
    if (!household) return false;

    // Only owner can change roles
    if (requesterId !== household.ownerId) return false;
    // Can't change owner's own role
    if (targetUserId === household.ownerId) return false;

    const member = household.members.find((m) => m.userId === targetUserId);
    if (!member) return false;

    member.role = newRole;
    household.updatedAt = new Date();
    return true;
  }

  // ── Shared Budgets ─────────────────────────────────────────────────────

  createSharedBudget(
    householdId: string,
    name: string,
    category: string,
    monthlyLimit: number,
    period?: string,
  ): SharedBudget | null {
    if (!this.households.has(householdId)) return null;

    const budget: SharedBudget = {
      id: generateId("sb"),
      householdId,
      name,
      category,
      monthlyLimit,
      spent: 0,
      remaining: monthlyLimit,
      contributions: [],
      period: period ?? new Date().toISOString().slice(0, 7),
    };

    const budgets = this.sharedBudgets.get(householdId) ?? [];
    budgets.push(budget);
    this.sharedBudgets.set(householdId, budgets);
    return budget;
  }

  addBudgetExpense(
    householdId: string,
    budgetId: string,
    memberId: string,
    memberName: string,
    amount: number,
  ): SharedBudget | null {
    const budgets = this.sharedBudgets.get(householdId);
    if (!budgets) return null;

    const budget = budgets.find((b) => b.id === budgetId);
    if (!budget) return null;

    budget.spent += amount;
    budget.remaining = Math.max(0, budget.monthlyLimit - budget.spent);

    // Update or add contribution
    const existing = budget.contributions.find((c) => c.memberId === memberId);
    if (existing) {
      existing.amount += amount;
    } else {
      budget.contributions.push({
        memberId,
        memberName,
        amount,
        percentage: 0,
      });
    }

    // Recalculate percentages
    const total = budget.contributions.reduce((s, c) => s + c.amount, 0);
    for (const c of budget.contributions) {
      c.percentage = total > 0 ? Math.round((c.amount / total) * 100) : 0;
    }

    return budget;
  }

  getSharedBudgets(householdId: string): SharedBudget[] {
    return this.sharedBudgets.get(householdId) ?? [];
  }

  // ── Joint Goals ────────────────────────────────────────────────────────

  createJointGoal(
    householdId: string,
    name: string,
    description: string,
    targetAmount: number,
    deadline?: Date,
  ): JointGoal | null {
    if (!this.households.has(householdId)) return null;

    const goal: JointGoal = {
      id: generateId("jg"),
      householdId,
      name,
      description,
      targetAmount,
      currentAmount: 0,
      contributions: [],
      deadline,
      createdAt: new Date(),
      status: "active",
    };

    const goals = this.jointGoals.get(householdId) ?? [];
    goals.push(goal);
    this.jointGoals.set(householdId, goals);
    return goal;
  }

  contributeToGoal(
    householdId: string,
    goalId: string,
    memberId: string,
    memberName: string,
    amount: number,
    note?: string,
  ): JointGoal | null {
    const goals = this.jointGoals.get(householdId);
    if (!goals) return null;

    const goal = goals.find((g) => g.id === goalId);
    if (!goal || goal.status !== "active") return null;

    goal.contributions.push({
      memberId,
      memberName,
      amount,
      date: new Date(),
      note,
    });

    goal.currentAmount += amount;

    // Auto-complete if target reached
    if (goal.currentAmount >= goal.targetAmount) {
      goal.status = "completed";
    }

    return goal;
  }

  getJointGoals(householdId: string): JointGoal[] {
    return this.jointGoals.get(householdId) ?? [];
  }

  updateGoalStatus(
    householdId: string,
    goalId: string,
    status: "active" | "paused" | "cancelled",
  ): boolean {
    const goals = this.jointGoals.get(householdId);
    if (!goals) return false;

    const goal = goals.find((g) => g.id === goalId);
    if (!goal) return false;

    goal.status = status;
    return true;
  }

  // ── Financial Summary ──────────────────────────────────────────────────

  setMemberFinancials(
    userId: string,
    financials: { income: number; spending: number; savings: number },
  ): void {
    this.memberFinancials.set(userId, financials);
  }

  getHouseholdSummary(
    householdId: string,
    requesterId: string,
  ): HouseholdSummary | null {
    const household = this.households.get(householdId);
    if (!household) return null;

    let totalIncome = 0;
    let totalSpending = 0;
    let totalSavings = 0;
    const memberSummaries: MemberFinancialSummary[] = [];

    for (const member of household.members) {
      const financials = this.memberFinancials.get(member.userId);
      const isRequester = member.userId === requesterId;

      // Determine what the requester can see
      const canSeeIncome = isRequester || member.privacySettings.shareIncome;
      const canSeeSpending = isRequester || member.privacySettings.shareSpending;
      const canSeeSavings = isRequester || member.privacySettings.shareSavings;

      const summary: MemberFinancialSummary = {
        memberId: member.userId,
        memberName: member.displayName,
        role: member.role,
        income: canSeeIncome ? financials?.income : undefined,
        spending: canSeeSpending ? financials?.spending : undefined,
        savings: canSeeSavings ? financials?.savings : undefined,
        visible: isRequester || Object.values(member.privacySettings).some(Boolean),
      };

      if (financials) {
        if (canSeeIncome) totalIncome += financials.income;
        if (canSeeSpending) totalSpending += financials.spending;
        if (canSeeSavings) totalSavings += financials.savings;
      }

      memberSummaries.push(summary);
    }

    return {
      householdId,
      totalIncome,
      totalSpending,
      totalSavings,
      memberSummaries,
      sharedBudgets: this.getSharedBudgets(householdId),
      jointGoals: this.getJointGoals(householdId),
    };
  }
}

// ── Export Singleton ─────────────────────────────────────────────────────────

export const householdService = new HouseholdService();
export default householdService;
