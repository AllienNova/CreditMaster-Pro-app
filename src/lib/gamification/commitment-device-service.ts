/**
 * Commitment Device Service
 *
 * User-defined consequences for missed goals:
 * - Charity donations on missed goals
 * - Public accountability commitments
 * - Stake-based goal contracts
 * - Accountability partner notifications
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";

// ============================================================================
// TYPES
// ============================================================================

export type CommitmentType =
  | "charity_donation"
  | "public_post"
  | "accountability_notify"
  | "self_penalty";
export type CommitmentStatus = "active" | "completed" | "failed" | "cancelled";
export type CheckInFrequency = "daily" | "weekly" | "biweekly" | "monthly";

export interface CommitmentContract {
  id: string;
  userId: string;
  goalId: string;
  goalName: string;
  goalTarget: number;
  goalUnit: string;

  // Commitment details
  type: CommitmentType;
  status: CommitmentStatus;

  // Stake
  stakeAmount?: number;
  charityId?: string;
  charityName?: string;

  // Accountability
  accountabilityPartnerIds: string[];
  isPublic: boolean;
  publicMessage?: string;

  // Timeline
  startDate: Date;
  endDate: Date;
  checkInFrequency: CheckInFrequency;

  // Progress
  currentProgress: number;
  checkIns: CheckIn[];

  // Outcome
  wasSuccessful?: boolean;
  consequenceExecuted?: boolean;
  consequenceExecutedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

export interface CheckIn {
  id: string;
  contractId: string;
  date: Date;
  progress: number;
  note?: string;
  verified: boolean;
  verifiedBy?: "self" | "partner" | "auto";
}

export interface Charity {
  id: string;
  name: string;
  description: string;
  category: string;
  logoUrl?: string;
  website: string;
  isVerified: boolean;
}

export interface CommitmentTemplate {
  id: string;
  name: string;
  description: string;
  type: CommitmentType;
  suggestedStake?: number;
  suggestedDuration: number;
  tips: string[];
}

export interface CommitmentStats {
  totalCommitments: number;
  activeCommitments: number;
  completedCommitments: number;
  failedCommitments: number;
  successRate: number;
  totalStaked: number;
  totalDonated: number;
  currentStreak: number;
}

// ============================================================================
// CHARITIES DATABASE
// ============================================================================

const CHARITIES: Charity[] = [
  {
    id: "habitat",
    name: "Habitat for Humanity",
    description: "Building homes and hope for families in need",
    category: "Housing",
    website: "https://habitat.org",
    isVerified: true,
  },
  {
    id: "feedingamerica",
    name: "Feeding America",
    description: "Nationwide network of food banks fighting hunger",
    category: "Hunger",
    website: "https://feedingamerica.org",
    isVerified: true,
  },
  {
    id: "stjude",
    name: "St. Jude Children's Hospital",
    description: "Leading research and treatment for childhood cancer",
    category: "Health",
    website: "https://stjude.org",
    isVerified: true,
  },
  {
    id: "redcross",
    name: "American Red Cross",
    description: "Disaster relief and emergency assistance",
    category: "Emergency",
    website: "https://redcross.org",
    isVerified: true,
  },
  {
    id: "wwf",
    name: "World Wildlife Fund",
    description: "Conservation and endangered species protection",
    category: "Environment",
    website: "https://worldwildlife.org",
    isVerified: true,
  },
];

// ============================================================================
// TEMPLATES
// ============================================================================

const COMMITMENT_TEMPLATES: CommitmentTemplate[] = [
  {
    id: "charity-stake",
    name: "Charity Donation Stake",
    description: "Donate to charity if you miss your goal",
    type: "charity_donation",
    suggestedStake: 50,
    suggestedDuration: 30,
    tips: [
      "Choose a charity you care about",
      "Set a stake amount that motivates but doesnt stress you",
      "Tell friends about your commitment for extra motivation",
    ],
  },
  {
    id: "public-accountability",
    name: "Public Accountability",
    description: "Share your commitment publicly for social motivation",
    type: "public_post",
    suggestedDuration: 30,
    tips: [
      "Be specific about your goal",
      "Share your why to inspire others",
      "Post regular updates on your progress",
    ],
  },
  {
    id: "partner-check-in",
    name: "Partner Check-In",
    description: "Have an accountability partner verify your progress",
    type: "accountability_notify",
    suggestedDuration: 21,
    tips: [
      "Choose a partner who will be honest with you",
      "Set clear expectations upfront",
      "Check in regularly, not just at the end",
    ],
  },
];

// ============================================================================
// SERVICE
// ============================================================================

export class CommitmentDeviceService {
  private readonly supabase: SupabaseClient;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  // ==========================================================================
  // CONTRACTS
  // ==========================================================================

  async createContract(
    contract: Omit<
      CommitmentContract,
      "id" | "checkIns" | "status" | "createdAt" | "updatedAt"
    >,
  ): Promise<CommitmentContract> {
    const now = new Date();
    const newContract: CommitmentContract = {
      ...contract,
      id: crypto.randomUUID(),
      status: "active",
      checkIns: [],
      createdAt: now,
      updatedAt: now,
    };

    const { data, error } = await this.supabase
      .from("commitment_contracts")
      .insert(this.contractToDb(newContract))
      .select()
      .single();

    if (error) throw error;
    return this.contractFromDb(data);
  }

  async getContract(
    contractId: string,
    userId: string,
  ): Promise<CommitmentContract | null> {
    const { data } = await this.supabase
      .from("commitment_contracts")
      .select("*")
      .eq("id", contractId)
      .eq("user_id", userId)
      .single();

    if (!data) return null;

    const contract = this.contractFromDb(data);
    contract.checkIns = await this.getCheckIns(contractId, userId);
    return contract;
  }

  async getUserContracts(
    userId: string,
    status?: CommitmentStatus,
  ): Promise<CommitmentContract[]> {
    let query = this.supabase
      .from("commitment_contracts")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (status) query = query.eq("status", status);

    const { data, error } = await query;
    if (error) throw error;

    const contracts = (data || []).map(this.contractFromDb);
    for (const contract of contracts) {
      contract.checkIns = await this.getCheckIns(contract.id, userId);
    }
    return contracts;
  }

  async cancelContract(contractId: string, userId: string): Promise<void> {
    await this.supabase
      .from("commitment_contracts")
      .update({ status: "cancelled", updated_at: new Date().toISOString() })
      .eq("id", contractId)
      .eq("user_id", userId);
  }

  // ==========================================================================
  // CHECK-INS
  // ==========================================================================

  async recordCheckIn(
    contractId: string,
    userId: string,
    progress: number,
    note?: string,
  ): Promise<CheckIn> {
    const contract = await this.getContract(contractId, userId);
    if (!contract) throw new Error("Contract not found");
    if (contract.status !== "active") throw new Error("Contract is not active");

    const checkIn: CheckIn = {
      id: crypto.randomUUID(),
      contractId,
      date: new Date(),
      progress,
      note,
      verified: true,
      verifiedBy: "self",
    };

    const { data, error } = await this.supabase
      .from("commitment_check_ins")
      .insert({
        id: checkIn.id,
        contract_id: checkIn.contractId,
        date: checkIn.date.toISOString(),
        progress: checkIn.progress,
        note: checkIn.note,
        verified: checkIn.verified,
        verified_by: checkIn.verifiedBy,
      })
      .select()
      .single();

    if (error) throw error;

    // Update contract progress
    await this.supabase
      .from("commitment_contracts")
      .update({
        current_progress: progress,
        updated_at: new Date().toISOString(),
      })
      .eq("id", contractId)
      .eq("user_id", userId);

    return this.checkInFromDb(data);
  }

  async getCheckIns(contractId: string, userId: string): Promise<CheckIn[]> {
    // Verify the contract belongs to the caller before returning its check-ins
    const contract = await this.supabase
      .from("commitment_contracts")
      .select("id")
      .eq("id", contractId)
      .eq("user_id", userId)
      .single();

    if (!contract.data) return [];

    const { data, error } = await this.supabase
      .from("commitment_check_ins")
      .select("*")
      .eq("contract_id", contractId)
      .order("date", { ascending: true });

    if (error) throw error;
    return (data || []).map(this.checkInFromDb);
  }

  // ==========================================================================
  // EVALUATION
  // ==========================================================================

  async evaluateContract(
    contractId: string,
    userId: string,
  ): Promise<{ success: boolean; consequenceRequired: boolean }> {
    const contract = await this.getContract(contractId, userId);
    if (!contract) throw new Error("Contract not found");

    const now = new Date();
    if (now < contract.endDate) {
      return { success: false, consequenceRequired: false };
    }

    const success = contract.currentProgress >= contract.goalTarget;

    await this.supabase
      .from("commitment_contracts")
      .update({
        status: success ? "completed" : "failed",
        was_successful: success,
        updated_at: now.toISOString(),
      })
      .eq("id", contractId)
      .eq("user_id", userId);

    if (
      !success &&
      contract.type === "charity_donation" &&
      contract.stakeAmount
    ) {
      await this.executeConsequence(contract);
    }

    return { success, consequenceRequired: !success };
  }

  private async executeConsequence(
    contract: CommitmentContract,
  ): Promise<void> {
    // In production, this would integrate with payment processing
    // For now, just record that the consequence was executed
    await this.supabase
      .from("commitment_contracts")
      .update({
        consequence_executed: true,
        consequence_executed_at: new Date().toISOString(),
      })
      .eq("id", contract.id);

    // Record the donation
    if (contract.type === "charity_donation" && contract.stakeAmount) {
      await this.supabase.from("commitment_donations").insert({
        id: crypto.randomUUID(),
        contract_id: contract.id,
        user_id: contract.userId,
        charity_id: contract.charityId,
        amount: contract.stakeAmount,
        created_at: new Date().toISOString(),
      });
    }
  }

  // ==========================================================================
  // STATS
  // ==========================================================================

  async getUserStats(userId: string): Promise<CommitmentStats> {
    const contracts = await this.getUserContracts(userId);

    const completed = contracts.filter((c) => c.status === "completed");
    const failed = contracts.filter((c) => c.status === "failed");
    const active = contracts.filter((c) => c.status === "active");

    const totalStaked = contracts.reduce(
      (sum, c) => sum + (c.stakeAmount || 0),
      0,
    );
    const totalDonated = failed.reduce(
      (sum, c) => sum + (c.stakeAmount || 0),
      0,
    );

    // Calculate streak
    const sortedCompleted = completed
      .filter((c) => c.wasSuccessful)
      .sort((a, b) => b.endDate.getTime() - a.endDate.getTime());

    let streak = 0;
    for (const contract of sortedCompleted) {
      if (contract.wasSuccessful) streak++;
      else break;
    }

    return {
      totalCommitments: contracts.length,
      activeCommitments: active.length,
      completedCommitments: completed.length,
      failedCommitments: failed.length,
      successRate:
        contracts.length > 0
          ? (completed.filter((c) => c.wasSuccessful).length /
              (completed.length + failed.length)) *
            100
          : 0,
      totalStaked,
      totalDonated,
      currentStreak: streak,
    };
  }

  // ==========================================================================
  // CHARITIES & TEMPLATES
  // ==========================================================================

  getCharities(): Charity[] {
    return CHARITIES;
  }

  getCharityById(charityId: string): Charity | undefined {
    return CHARITIES.find((c) => c.id === charityId);
  }

  getTemplates(): CommitmentTemplate[] {
    return COMMITMENT_TEMPLATES;
  }

  getTemplateById(templateId: string): CommitmentTemplate | undefined {
    return COMMITMENT_TEMPLATES.find((t) => t.id === templateId);
  }

  // ==========================================================================
  // HELPERS
  // ==========================================================================

  private contractToDb(contract: CommitmentContract): Record<string, unknown> {
    return {
      id: contract.id,
      user_id: contract.userId,
      goal_id: contract.goalId,
      goal_name: contract.goalName,
      goal_target: contract.goalTarget,
      goal_unit: contract.goalUnit,
      type: contract.type,
      status: contract.status,
      stake_amount: contract.stakeAmount,
      charity_id: contract.charityId,
      charity_name: contract.charityName,
      accountability_partner_ids: contract.accountabilityPartnerIds,
      is_public: contract.isPublic,
      public_message: contract.publicMessage,
      start_date: contract.startDate.toISOString(),
      end_date: contract.endDate.toISOString(),
      check_in_frequency: contract.checkInFrequency,
      current_progress: contract.currentProgress,
      was_successful: contract.wasSuccessful,
      consequence_executed: contract.consequenceExecuted,
      consequence_executed_at: contract.consequenceExecutedAt?.toISOString(),
      created_at: contract.createdAt.toISOString(),
      updated_at: contract.updatedAt.toISOString(),
    };
  }

  private contractFromDb(data: Record<string, unknown>): CommitmentContract {
    return {
      id: data.id as string,
      userId: data.user_id as string,
      goalId: data.goal_id as string,
      goalName: data.goal_name as string,
      goalTarget: data.goal_target as number,
      goalUnit: data.goal_unit as string,
      type: data.type as CommitmentType,
      status: data.status as CommitmentStatus,
      stakeAmount: data.stake_amount as number | undefined,
      charityId: data.charity_id as string | undefined,
      charityName: data.charity_name as string | undefined,
      accountabilityPartnerIds: data.accountability_partner_ids as string[],
      isPublic: data.is_public as boolean,
      publicMessage: data.public_message as string | undefined,
      startDate: new Date(data.start_date as string),
      endDate: new Date(data.end_date as string),
      checkInFrequency: data.check_in_frequency as CheckInFrequency,
      currentProgress: data.current_progress as number,
      checkIns: [],
      wasSuccessful: data.was_successful as boolean | undefined,
      consequenceExecuted: data.consequence_executed as boolean | undefined,
      consequenceExecutedAt: data.consequence_executed_at
        ? new Date(data.consequence_executed_at as string)
        : undefined,
      createdAt: new Date(data.created_at as string),
      updatedAt: new Date(data.updated_at as string),
    };
  }

  private checkInFromDb(data: Record<string, unknown>): CheckIn {
    return {
      id: data.id as string,
      contractId: data.contract_id as string,
      date: new Date(data.date as string),
      progress: data.progress as number,
      note: data.note as string | undefined,
      verified: data.verified as boolean,
      verifiedBy: data.verified_by as CheckIn["verifiedBy"],
    };
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

let commitmentDeviceServiceInstance: CommitmentDeviceService | null = null;

export function getCommitmentDeviceService(): CommitmentDeviceService {
  if (!commitmentDeviceServiceInstance) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    commitmentDeviceServiceInstance = new CommitmentDeviceService(
      supabaseUrl,
      supabaseKey,
    );
  }
  return commitmentDeviceServiceInstance;
}
