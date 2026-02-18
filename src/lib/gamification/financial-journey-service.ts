/**
 * Financial Journey Map Service
 *
 * Visual roadmap showing user's progress from current state to financial goals:
 * - Waypoints representing milestones
 * - Progress tracking
 * - Unlockable achievements
 * - Personalized journey paths
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";

// ============================================================================
// TYPES
// ============================================================================

export type JourneyPhase =
  | "foundation"
  | "stability"
  | "growth"
  | "wealth_building"
  | "financial_freedom";

export type WaypointType = "milestone" | "goal" | "achievement" | "checkpoint";

export type WaypointStatus = "locked" | "current" | "completed" | "skipped";

export interface FinancialJourney {
  id: string;
  userId: string;
  journeyName: string;

  // Current progress
  currentPhase: JourneyPhase;
  overallProgress: number; // 0-100
  totalWaypoints: number;
  completedWaypoints: number;

  // Journey details
  waypoints: Waypoint[];
  startDate: Date;
  projectedCompletionDate?: Date;

  // Metadata
  lastUpdated: Date;
  createdAt: Date;
}

export interface Waypoint {
  id: string;
  order: number;
  type: WaypointType;
  status: WaypointStatus;

  // Display
  title: string;
  description: string;
  icon: string;
  phase: JourneyPhase;

  // Requirements
  requirements: WaypointRequirement[];

  // Rewards
  xpReward: number;
  badgeId?: string;
  unlocks?: string[];

  // Progress
  progressPercent: number;
  completedAt?: Date;
}

export interface WaypointRequirement {
  type:
    | "credit_score"
    | "savings"
    | "debt_paid"
    | "net_worth"
    | "budget_streak"
    | "investment"
    | "custom";
  targetValue: number;
  currentValue: number;
  unit?: string;
  description: string;
}

export interface JourneyTemplate {
  id: string;
  name: string;
  description: string;
  targetAudience: string;
  phases: JourneyPhaseConfig[];
  estimatedDuration: string;
}

export interface JourneyPhaseConfig {
  phase: JourneyPhase;
  title: string;
  description: string;
  milestones: MilestoneTemplate[];
}

export interface MilestoneTemplate {
  title: string;
  description: string;
  icon: string;
  requirements: Omit<WaypointRequirement, "currentValue">[];
  xpReward: number;
  badgeId?: string;
}

// ============================================================================
// JOURNEY TEMPLATES
// ============================================================================

const JOURNEY_TEMPLATES: JourneyTemplate[] = [
  {
    id: "debt-free-journey",
    name: "Debt-Free Journey",
    description: "Eliminate debt and build a strong financial foundation",
    targetAudience: "Users with significant debt looking to become debt-free",
    estimatedDuration: "2-5 years",
    phases: [
      {
        phase: "foundation",
        title: "Emergency Fund",
        description: "Build your financial safety net",
        milestones: [
          {
            title: "Starter Emergency Fund",
            description: "Save your first $1,000 for emergencies",
            icon: "shield",
            requirements: [
              {
                type: "savings",
                targetValue: 1000,
                description: "Save $1,000",
              },
            ],
            xpReward: 500,
            badgeId: "emergency-starter",
          },
          {
            title: "Budget Master",
            description: "Stick to your budget for 30 days",
            icon: "calculator",
            requirements: [
              {
                type: "budget_streak",
                targetValue: 30,
                description: "30-day budget streak",
              },
            ],
            xpReward: 300,
          },
        ],
      },
      {
        phase: "stability",
        title: "Debt Snowball",
        description: "Eliminate your debts one by one",
        milestones: [
          {
            title: "First Debt Paid",
            description: "Pay off your first debt completely",
            icon: "scissors",
            requirements: [
              {
                type: "debt_paid",
                targetValue: 1,
                unit: "accounts",
                description: "Pay off 1 debt",
              },
            ],
            xpReward: 750,
            badgeId: "debt-slayer",
          },
          {
            title: "Halfway There",
            description: "Pay off 50% of your total debt",
            icon: "chart-bar",
            requirements: [
              {
                type: "debt_paid",
                targetValue: 50,
                unit: "percent",
                description: "50% debt paid",
              },
            ],
            xpReward: 1000,
          },
          {
            title: "Debt Free!",
            description: "Eliminate all consumer debt",
            icon: "star",
            requirements: [
              {
                type: "debt_paid",
                targetValue: 100,
                unit: "percent",
                description: "100% debt paid",
              },
            ],
            xpReward: 2000,
            badgeId: "debt-free",
          },
        ],
      },
      {
        phase: "growth",
        title: "Full Emergency Fund",
        description: "Build 3-6 months of expenses",
        milestones: [
          {
            title: "3-Month Fund",
            description: "Save 3 months of expenses",
            icon: "wallet",
            requirements: [
              {
                type: "savings",
                targetValue: 10000,
                description: "3 months expenses",
              },
            ],
            xpReward: 1500,
            badgeId: "fully-funded",
          },
        ],
      },
      {
        phase: "wealth_building",
        title: "Invest for Future",
        description: "Start building long-term wealth",
        milestones: [
          {
            title: "First Investment",
            description: "Start investing for retirement",
            icon: "trending-up",
            requirements: [
              {
                type: "investment",
                targetValue: 1000,
                description: "Invest $1,000",
              },
            ],
            xpReward: 1000,
            badgeId: "investor",
          },
        ],
      },
    ],
  },
  {
    id: "credit-builder-journey",
    name: "Credit Builder Journey",
    description: "Build excellent credit from scratch or recover from setbacks",
    targetAudience: "Users looking to build or rebuild their credit",
    estimatedDuration: "1-3 years",
    phases: [
      {
        phase: "foundation",
        title: "Credit Basics",
        description: "Establish your credit foundation",
        milestones: [
          {
            title: "First Credit Account",
            description: "Open your first credit account",
            icon: "credit-card",
            requirements: [
              {
                type: "custom",
                targetValue: 1,
                description: "Open credit account",
              },
            ],
            xpReward: 300,
          },
          {
            title: "Score 600+",
            description: "Reach a credit score of 600",
            icon: "chart-bar",
            requirements: [
              {
                type: "credit_score",
                targetValue: 600,
                description: "Credit score 600+",
              },
            ],
            xpReward: 500,
            badgeId: "score-600",
          },
        ],
      },
      {
        phase: "stability",
        title: "Building History",
        description: "Build a positive payment history",
        milestones: [
          {
            title: "6-Month History",
            description: "6 months of on-time payments",
            icon: "clock",
            requirements: [
              {
                type: "custom",
                targetValue: 6,
                description: "6 months on-time",
              },
            ],
            xpReward: 600,
          },
          {
            title: "Score 700+",
            description: 'Reach the "good" credit tier',
            icon: "sparkles",
            requirements: [
              {
                type: "credit_score",
                targetValue: 700,
                description: "Credit score 700+",
              },
            ],
            xpReward: 1000,
            badgeId: "700-club",
          },
        ],
      },
      {
        phase: "growth",
        title: "Credit Optimization",
        description: "Optimize your credit profile",
        milestones: [
          {
            title: "Score 750+",
            description: "Reach excellent credit",
            icon: "trending-up",
            requirements: [
              {
                type: "credit_score",
                targetValue: 750,
                description: "Credit score 750+",
              },
            ],
            xpReward: 1500,
            badgeId: "750-club",
          },
          {
            title: "Score 800+",
            description: "Join the elite 800+ club",
            icon: "star",
            requirements: [
              {
                type: "credit_score",
                targetValue: 800,
                description: "Credit score 800+",
              },
            ],
            xpReward: 2500,
            badgeId: "800-club",
          },
        ],
      },
    ],
  },
  {
    id: "wealth-builder-journey",
    name: "Wealth Builder Journey",
    description: "Build lasting wealth and achieve financial freedom",
    targetAudience: "Users ready to grow their net worth",
    estimatedDuration: "5-20 years",
    phases: [
      {
        phase: "foundation",
        title: "Financial Foundation",
        description: "Establish your wealth-building base",
        milestones: [
          {
            title: "Positive Net Worth",
            description: "Assets exceed liabilities",
            icon: "scale",
            requirements: [
              {
                type: "net_worth",
                targetValue: 1,
                description: "Positive net worth",
              },
            ],
            xpReward: 500,
          },
          {
            title: "$10K Net Worth",
            description: "Reach your first $10,000",
            icon: "wallet",
            requirements: [
              {
                type: "net_worth",
                targetValue: 10000,
                description: "$10K net worth",
              },
            ],
            xpReward: 750,
            badgeId: "first-10k",
          },
        ],
      },
      {
        phase: "growth",
        title: "Growing Wealth",
        description: "Accelerate your wealth accumulation",
        milestones: [
          {
            title: "$50K Net Worth",
            description: "Reach $50,000 net worth",
            icon: "banknotes",
            requirements: [
              {
                type: "net_worth",
                targetValue: 50000,
                description: "$50K net worth",
              },
            ],
            xpReward: 1500,
            badgeId: "fifty-k",
          },
          {
            title: "$100K Net Worth",
            description: "Join the six-figure club",
            icon: "trending-up",
            requirements: [
              {
                type: "net_worth",
                targetValue: 100000,
                description: "$100K net worth",
              },
            ],
            xpReward: 2500,
            badgeId: "100k-club",
          },
        ],
      },
      {
        phase: "wealth_building",
        title: "Wealth Acceleration",
        description: "Compound growth takes over",
        milestones: [
          {
            title: "$250K Net Worth",
            description: "Quarter-millionaire status",
            icon: "chart-bar",
            requirements: [
              {
                type: "net_worth",
                targetValue: 250000,
                description: "$250K net worth",
              },
            ],
            xpReward: 3500,
          },
          {
            title: "$500K Net Worth",
            description: "Half-millionaire achieved",
            icon: "sparkles",
            requirements: [
              {
                type: "net_worth",
                targetValue: 500000,
                description: "$500K net worth",
              },
            ],
            xpReward: 5000,
            badgeId: "half-millionaire",
          },
        ],
      },
      {
        phase: "financial_freedom",
        title: "Financial Freedom",
        description: "Work becomes optional",
        milestones: [
          {
            title: "Millionaire",
            description: "Reach $1,000,000 net worth",
            icon: "star",
            requirements: [
              {
                type: "net_worth",
                targetValue: 1000000,
                description: "$1M net worth",
              },
            ],
            xpReward: 10000,
            badgeId: "millionaire",
          },
        ],
      },
    ],
  },
];

// ============================================================================
// SERVICE
// ============================================================================

export class FinancialJourneyService {
  private readonly supabase: SupabaseClient;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  // ==========================================================================
  // JOURNEY MANAGEMENT
  // ==========================================================================

  async createJourney(
    userId: string,
    templateId: string,
  ): Promise<FinancialJourney> {
    const template = JOURNEY_TEMPLATES.find((t) => t.id === templateId);
    if (!template) throw new Error("Journey template not found");

    const waypoints = this.generateWaypointsFromTemplate(template);
    const now = new Date();

    const journey: FinancialJourney = {
      id: crypto.randomUUID(),
      userId,
      journeyName: template.name,
      currentPhase: "foundation",
      overallProgress: 0,
      totalWaypoints: waypoints.length,
      completedWaypoints: 0,
      waypoints,
      startDate: now,
      lastUpdated: now,
      createdAt: now,
    };

    const { data, error } = await this.supabase
      .from("financial_journeys")
      .insert(this.toDbFormat(journey))
      .select()
      .single();

    if (error) throw error;
    return this.fromDbFormat(data);
  }

  private generateWaypointsFromTemplate(template: JourneyTemplate): Waypoint[] {
    const waypoints: Waypoint[] = [];
    let order = 0;

    for (const phase of template.phases) {
      for (const milestone of phase.milestones) {
        waypoints.push({
          id: crypto.randomUUID(),
          order: order++,
          type: "milestone",
          status: order === 1 ? "current" : "locked",
          title: milestone.title,
          description: milestone.description,
          icon: milestone.icon,
          phase: phase.phase,
          requirements: milestone.requirements.map((r) => ({
            ...r,
            currentValue: 0,
          })),
          xpReward: milestone.xpReward,
          badgeId: milestone.badgeId,
          progressPercent: 0,
        });
      }
    }

    return waypoints;
  }

  async getUserJourney(userId: string): Promise<FinancialJourney | null> {
    const { data } = await this.supabase
      .from("financial_journeys")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    return data ? this.fromDbFormat(data) : null;
  }

  async updateProgress(
    journeyId: string,
    waypointId: string,
    requirementUpdates: { type: string; currentValue: number }[],
  ): Promise<FinancialJourney> {
    const journey = await this.getJourneyById(journeyId);
    if (!journey) throw new Error("Journey not found");

    const waypointIndex = journey.waypoints.findIndex(
      (w) => w.id === waypointId,
    );
    if (waypointIndex === -1) throw new Error("Waypoint not found");

    const waypoint = journey.waypoints[waypointIndex];

    // Update requirement progress
    for (const update of requirementUpdates) {
      const req = waypoint.requirements.find((r) => r.type === update.type);
      if (req) {
        req.currentValue = update.currentValue;
      }
    }

    // Calculate waypoint progress
    const totalProgress = waypoint.requirements.reduce((sum, req) => {
      const progress = Math.min(
        100,
        (req.currentValue / req.targetValue) * 100,
      );
      return sum + progress;
    }, 0);
    waypoint.progressPercent = totalProgress / waypoint.requirements.length;

    // Check if waypoint is completed
    const isCompleted = waypoint.requirements.every(
      (r) => r.currentValue >= r.targetValue,
    );
    if (isCompleted && waypoint.status !== "completed") {
      waypoint.status = "completed";
      waypoint.completedAt = new Date();
      journey.completedWaypoints++;

      // Unlock next waypoint
      if (waypointIndex + 1 < journey.waypoints.length) {
        journey.waypoints[waypointIndex + 1].status = "current";
      }

      // Update current phase
      const completedPhases = new Set(
        journey.waypoints
          .filter((w) => w.status === "completed")
          .map((w) => w.phase),
      );
      const phases: JourneyPhase[] = [
        "foundation",
        "stability",
        "growth",
        "wealth_building",
        "financial_freedom",
      ];
      for (const phase of phases) {
        if (!completedPhases.has(phase)) {
          journey.currentPhase = phase;
          break;
        }
      }
    }

    // Update overall progress
    journey.overallProgress =
      (journey.completedWaypoints / journey.totalWaypoints) * 100;

    return this.saveJourney(journey);
  }

  private async getJourneyById(
    journeyId: string,
  ): Promise<FinancialJourney | null> {
    const { data } = await this.supabase
      .from("financial_journeys")
      .select("*")
      .eq("id", journeyId)
      .single();

    return data ? this.fromDbFormat(data) : null;
  }

  private async saveJourney(
    journey: FinancialJourney,
  ): Promise<FinancialJourney> {
    journey.lastUpdated = new Date();

    const { data, error } = await this.supabase
      .from("financial_journeys")
      .update(this.toDbFormat(journey))
      .eq("id", journey.id)
      .select()
      .single();

    if (error) throw error;
    return this.fromDbFormat(data);
  }

  // ==========================================================================
  // TEMPLATES
  // ==========================================================================

  getAvailableTemplates(): JourneyTemplate[] {
    return JOURNEY_TEMPLATES;
  }

  getTemplateById(templateId: string): JourneyTemplate | undefined {
    return JOURNEY_TEMPLATES.find((t) => t.id === templateId);
  }

  // ==========================================================================
  // ANALYTICS
  // ==========================================================================

  async getJourneyStats(userId: string): Promise<{
    currentStreak: number;
    longestStreak: number;
    waypointsCompleted: number;
    totalXpEarned: number;
    daysOnJourney: number;
    projectedCompletion?: Date;
  }> {
    const journey = await this.getUserJourney(userId);
    if (!journey) {
      return {
        currentStreak: 0,
        longestStreak: 0,
        waypointsCompleted: 0,
        totalXpEarned: 0,
        daysOnJourney: 0,
      };
    }

    const completedWaypoints = journey.waypoints.filter(
      (w) => w.status === "completed",
    );
    const totalXpEarned = completedWaypoints.reduce(
      (sum, w) => sum + w.xpReward,
      0,
    );
    const daysOnJourney = Math.ceil(
      (Date.now() - journey.startDate.getTime()) / (24 * 60 * 60 * 1000),
    );

    // Calculate projected completion based on average completion rate
    let projectedCompletion: Date | undefined;
    if (journey.completedWaypoints > 0) {
      const avgDaysPerWaypoint = daysOnJourney / journey.completedWaypoints;
      const remainingWaypoints =
        journey.totalWaypoints - journey.completedWaypoints;
      const daysRemaining = avgDaysPerWaypoint * remainingWaypoints;
      projectedCompletion = new Date(
        Date.now() + daysRemaining * 24 * 60 * 60 * 1000,
      );
    }

    return {
      currentStreak: 0, // Would need streak tracking implementation
      longestStreak: 0,
      waypointsCompleted: journey.completedWaypoints,
      totalXpEarned,
      daysOnJourney,
      projectedCompletion,
    };
  }

  // ==========================================================================
  // HELPERS
  // ==========================================================================

  private toDbFormat(journey: FinancialJourney): Record<string, unknown> {
    return {
      id: journey.id,
      user_id: journey.userId,
      journey_name: journey.journeyName,
      current_phase: journey.currentPhase,
      overall_progress: journey.overallProgress,
      total_waypoints: journey.totalWaypoints,
      completed_waypoints: journey.completedWaypoints,
      waypoints: journey.waypoints.map((w) => ({
        ...w,
        completed_at: w.completedAt?.toISOString(),
      })),
      start_date: journey.startDate.toISOString(),
      projected_completion_date: journey.projectedCompletionDate?.toISOString(),
      last_updated: journey.lastUpdated.toISOString(),
      created_at: journey.createdAt.toISOString(),
    };
  }

  private fromDbFormat(data: Record<string, unknown>): FinancialJourney {
    const waypoints = (data.waypoints as Array<Record<string, unknown>>).map(
      (w) => ({
        id: w.id as string,
        order: w.order as number,
        type: w.type as WaypointType,
        status: w.status as WaypointStatus,
        title: w.title as string,
        description: w.description as string,
        icon: w.icon as string,
        phase: w.phase as JourneyPhase,
        requirements: w.requirements as WaypointRequirement[],
        xpReward: w.xpReward as number,
        badgeId: w.badgeId as string | undefined,
        unlocks: w.unlocks as string[] | undefined,
        progressPercent: w.progressPercent as number,
        completedAt: w.completed_at
          ? new Date(w.completed_at as string)
          : undefined,
      }),
    );

    return {
      id: data.id as string,
      userId: data.user_id as string,
      journeyName: data.journey_name as string,
      currentPhase: data.current_phase as JourneyPhase,
      overallProgress: data.overall_progress as number,
      totalWaypoints: data.total_waypoints as number,
      completedWaypoints: data.completed_waypoints as number,
      waypoints,
      startDate: new Date(data.start_date as string),
      projectedCompletionDate: data.projected_completion_date
        ? new Date(data.projected_completion_date as string)
        : undefined,
      lastUpdated: new Date(data.last_updated as string),
      createdAt: new Date(data.created_at as string),
    };
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

let financialJourneyServiceInstance: FinancialJourneyService | null = null;

export function getFinancialJourneyService(): FinancialJourneyService {
  if (!financialJourneyServiceInstance) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    financialJourneyServiceInstance = new FinancialJourneyService(
      supabaseUrl,
      supabaseKey,
    );
  }
  return financialJourneyServiceInstance;
}
