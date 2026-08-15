/**
 * Fynvita Subscription Cancellation Service
 *
 * Provides AI-assisted subscription management and cancellation workflows.
 * Semi-automated approach: AI guides users with scripts, contact info, and templates.
 */

import { supabaseAdmin } from "@/lib/supabase/server";

// ============================================================================
// Types
// ============================================================================

export type SubscriptionStatus =
  | "active"
  | "paused"
  | "pending_cancellation"
  | "cancelled";
export type CancellationMethod =
  | "phone"
  | "email"
  | "website"
  | "chat"
  | "in_app";
export type CancellationOutcome =
  | "cancelled"
  | "retained"
  | "pending"
  | "failed";

export interface Subscription {
  id: string;
  userId: string;
  name: string;
  merchantName: string;
  amount: number;
  frequency: "weekly" | "monthly" | "quarterly" | "yearly";
  category: string;
  status: SubscriptionStatus;
  nextBillingDate: Date;
  detectedFromBillId?: string;
  logoUrl?: string;
  annualCost: number;
  cancellationStatus?: CancellationOutcome;
  cancelledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CancellationInfo {
  companyName: string;
  cancellationMethods: CancellationMethod[];
  phoneNumber?: string;
  email?: string;
  websiteUrl?: string;
  chatUrl?: string;
  difficulty: "easy" | "medium" | "hard";
  averageTime: string;
  tips: string[];
  retentionOffers: string[];
}

export interface CancellationScript {
  opening: string;
  reason: string;
  rebuttals: {
    offer: string;
    response: string;
  }[];
  closing: string;
  tips: string[];
}

export interface CancellationRequest {
  id: string;
  subscriptionId: string;
  userId: string;
  status: CancellationOutcome;
  method: CancellationMethod;
  aiScript?: string;
  instructions?: string[];
  contactInfo?: {
    phone?: string;
    email?: string;
    url?: string;
  };
  outcome?: CancellationOutcome;
  savingsAmount: number;
  createdAt: Date;
  completedAt?: Date;
  notes?: string;
}

export interface SubscriptionStats {
  totalMonthlySpend: number;
  totalAnnualSpend: number;
  activeCount: number;
  pendingCancellationCount: number;
  cancelledCount: number;
  potentialMonthlySavings: number;
  potentialAnnualSavings: number;
  categoryBreakdown: {
    category: string;
    count: number;
    monthlyTotal: number;
  }[];
}

export interface DetectedSubscription {
  merchantName: string;
  amount: number;
  frequency: "weekly" | "monthly" | "quarterly" | "yearly";
  lastChargeDate: Date;
  chargeCount: number;
  confidence: number;
  category: string;
  isKnownSubscription: boolean;
}

export interface SubscriptionInsight {
  type:
    | "unused"
    | "duplicate"
    | "price_increase"
    | "better_alternative"
    | "free_tier_available";
  subscriptionId: string;
  title: string;
  description: string;
  potentialSavings: number;
  recommendation: string;
  priority: "low" | "medium" | "high";
}

export interface SubscriptionTrend {
  period: string;
  totalSpend: number;
  subscriptionCount: number;
  newSubscriptions: number;
  cancelledSubscriptions: number;
}

// ============================================================================
// Constants
// ============================================================================

// Known subscription cancellation info database
const CANCELLATION_DATABASE: Record<string, CancellationInfo> = {
  netflix: {
    companyName: "Netflix",
    cancellationMethods: ["website", "in_app"],
    websiteUrl: "https://netflix.com/cancelplan",
    difficulty: "easy",
    averageTime: "2 minutes",
    tips: [
      "You can cancel anytime from your account settings",
      "Your access continues until the end of the billing period",
      "You can reactivate anytime without losing your profile",
    ],
    retentionOffers: [],
  },
  spotify: {
    companyName: "Spotify",
    cancellationMethods: ["website"],
    websiteUrl: "https://spotify.com/account",
    difficulty: "easy",
    averageTime: "2 minutes",
    tips: [
      "Go to Account > Subscription > Cancel Premium",
      "You'll keep Premium until your next billing date",
      "Your playlists and saved music will remain",
    ],
    retentionOffers: [],
  },
  hulu: {
    companyName: "Hulu",
    cancellationMethods: ["website"],
    websiteUrl: "https://secure.hulu.com/account",
    difficulty: "easy",
    averageTime: "3 minutes",
    tips: [
      "Cancel through Account > Manage Your Subscription",
      "Keep your account info - you can pause instead of cancel",
    ],
    retentionOffers: ["May offer discounted rate to stay"],
  },
  amazon_prime: {
    companyName: "Amazon Prime",
    cancellationMethods: ["website", "chat"],
    websiteUrl: "https://amazon.com/prime",
    chatUrl: "https://amazon.com/gp/help/customer/contact-us",
    difficulty: "medium",
    averageTime: "5 minutes",
    tips: [
      "Cancel via Account > Prime Membership",
      "They will try to keep you - stay firm",
      "You can get a partial refund if you haven't used benefits",
    ],
    retentionOffers: [
      "May offer 1-3 month extension",
      "May offer reduced rate",
    ],
  },
  gym_planet_fitness: {
    companyName: "Planet Fitness",
    cancellationMethods: ["in_app", "phone"],
    phoneNumber: "1-844-880-7180",
    difficulty: "hard",
    averageTime: "15-20 minutes",
    tips: [
      "Must cancel in person at home club OR via certified mail",
      "Some locations allow cancellation by phone",
      "Be prepared for retention attempts",
    ],
    retentionOffers: ["May offer to freeze membership instead"],
  },
  adobe_creative_cloud: {
    companyName: "Adobe Creative Cloud",
    cancellationMethods: ["website", "chat"],
    websiteUrl: "https://account.adobe.com/plans",
    chatUrl: "https://helpx.adobe.com/contact.html",
    difficulty: "medium",
    averageTime: "10 minutes",
    tips: [
      "Annual plans have early termination fee (50% of remaining)",
      "Chat support can sometimes waive the fee",
      "Consider switching to monthly plan first",
    ],
    retentionOffers: [
      "Often offers 2-3 months at reduced rate",
      "May waive cancellation fee",
    ],
  },
};

// Default cancellation script templates
const DEFAULT_SCRIPT_TEMPLATE = {
  opening: "Hi, I'm calling to cancel my {service} subscription.",
  reason:
    "I no longer need the service / I'm cutting back on expenses / I'm not using it enough to justify the cost.",
  rebuttals: [
    {
      offer: "What if we offered you a discount?",
      response:
        "I appreciate the offer, but I've made my decision and would like to proceed with the cancellation.",
    },
    {
      offer: "Can I put your account on pause instead?",
      response: "No thank you, I'd like to fully cancel the subscription.",
    },
    {
      offer: "Let me transfer you to our retention department.",
      response:
        "I understand, but please note I'm firm on my decision to cancel.",
    },
  ],
  closing:
    "Please confirm my subscription has been cancelled and send me a confirmation email.",
  tips: [
    "Be polite but firm",
    "Ask for a confirmation number",
    "Take note of the representative's name",
    "Request email confirmation of cancellation",
  ],
};

// ============================================================================
// Subscription Cancellation Service
// ============================================================================

class SubscriptionCancellationService {
  /**
   * Get all subscriptions for a user
   */
  async getSubscriptions(userId: string): Promise<Subscription[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = supabaseAdmin as any;

    const { data, error } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", userId)
      .order("next_billing_date", { ascending: true });

    if (error) {
      // SubscriptionCancellationService error: Error fetching subscriptions
      throw new Error("Failed to fetch subscriptions");
    }

    return (data || []).map(this.mapDbToSubscription);
  }

  /**
   * Get subscription statistics
   */
  async getSubscriptionStats(userId: string): Promise<SubscriptionStats> {
    const subscriptions = await this.getSubscriptions(userId);

    const activeSubscriptions = subscriptions.filter(
      (s) => s.status === "active",
    );
    const pendingCancellation = subscriptions.filter(
      (s) => s.status === "pending_cancellation",
    );
    const cancelled = subscriptions.filter((s) => s.status === "cancelled");

    // Calculate monthly spend
    const totalMonthlySpend = activeSubscriptions.reduce((sum, s) => {
      return sum + this.getMonthlyAmount(s.amount, s.frequency);
    }, 0);

    // Category breakdown
    const categoryMap = new Map<
      string,
      { count: number; monthlyTotal: number }
    >();
    for (const sub of activeSubscriptions) {
      const existing = categoryMap.get(sub.category) || {
        count: 0,
        monthlyTotal: 0,
      };
      categoryMap.set(sub.category, {
        count: existing.count + 1,
        monthlyTotal:
          existing.monthlyTotal +
          this.getMonthlyAmount(sub.amount, sub.frequency),
      });
    }

    const categoryBreakdown = Array.from(categoryMap.entries()).map(
      ([category, stats]) => ({
        category,
        count: stats.count,
        monthlyTotal: Math.round(stats.monthlyTotal * 100) / 100,
      }),
    );

    return {
      totalMonthlySpend: Math.round(totalMonthlySpend * 100) / 100,
      totalAnnualSpend: Math.round(totalMonthlySpend * 12 * 100) / 100,
      activeCount: activeSubscriptions.length,
      pendingCancellationCount: pendingCancellation.length,
      cancelledCount: cancelled.length,
      potentialMonthlySavings: Math.round(totalMonthlySpend * 0.3 * 100) / 100, // Estimate 30% can be saved
      potentialAnnualSavings:
        Math.round(totalMonthlySpend * 0.3 * 12 * 100) / 100,
      categoryBreakdown,
    };
  }

  /**
   * Get cancellation info for a subscription
   */
  getCancellationInfo(merchantName: string): CancellationInfo | null {
    const normalizedName = merchantName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "_");

    // Check exact match
    if (CANCELLATION_DATABASE[normalizedName]) {
      return CANCELLATION_DATABASE[normalizedName];
    }

    // Check partial matches
    for (const [key, info] of Object.entries(CANCELLATION_DATABASE)) {
      if (normalizedName.includes(key) || key.includes(normalizedName)) {
        return info;
      }
    }

    return null;
  }

  /**
   * Generate AI cancellation script
   */
  generateCancellationScript(
    serviceName: string,
    reason?: string,
  ): CancellationScript {
    const customReason = reason || DEFAULT_SCRIPT_TEMPLATE.reason;

    return {
      opening: DEFAULT_SCRIPT_TEMPLATE.opening.replace(
        "{service}",
        serviceName,
      ),
      reason: customReason,
      rebuttals: DEFAULT_SCRIPT_TEMPLATE.rebuttals,
      closing: DEFAULT_SCRIPT_TEMPLATE.closing,
      tips: DEFAULT_SCRIPT_TEMPLATE.tips,
    };
  }

  /**
   * Generate step-by-step cancellation instructions
   */
  generateCancellationInstructions(subscription: Subscription): {
    steps: string[];
    warnings: string[];
    tips: string[];
  } {
    const info = this.getCancellationInfo(subscription.merchantName);

    if (!info) {
      return {
        steps: [
          `Search for "${subscription.merchantName} cancel subscription" to find instructions`,
          'Log into your account and look for "Account Settings" or "Subscription"',
          'Look for a "Cancel" or "Manage Subscription" option',
          "Follow the prompts to complete cancellation",
          "Request and save a confirmation email or number",
        ],
        warnings: [
          "Make sure to cancel before your next billing date",
          "Some services may try to offer discounts to keep you",
        ],
        tips: [
          "Take screenshots of your cancellation confirmation",
          "Check your bank statement to verify no future charges",
        ],
      };
    }

    const steps: string[] = [];

    if (info.cancellationMethods.includes("website") && info.websiteUrl) {
      steps.push(`Go to ${info.websiteUrl}`);
      steps.push("Log into your account");
      steps.push("Navigate to Account Settings or Subscription");
      steps.push("Click Cancel or Manage Subscription");
      steps.push("Follow the prompts to confirm cancellation");
    } else if (info.cancellationMethods.includes("phone") && info.phoneNumber) {
      steps.push(`Call ${info.phoneNumber}`);
      steps.push("Tell them you want to cancel your subscription");
      steps.push("Be prepared for retention offers - stay firm");
      steps.push("Get a confirmation number before hanging up");
    } else if (info.cancellationMethods.includes("chat") && info.chatUrl) {
      steps.push(`Visit ${info.chatUrl}`);
      steps.push("Start a chat and request cancellation");
      steps.push("Save the chat transcript for your records");
    }

    steps.push("Request email confirmation of cancellation");
    steps.push("Save all confirmation details");

    return {
      steps,
      warnings:
        info.retentionOffers.length > 0
          ? [
              "This company may offer discounts to keep you - decide in advance if you want to stay",
            ]
          : [],
      tips: info.tips,
    };
  }

  /**
   * Create a cancellation request
   */
  async createCancellationRequest(
    userId: string,
    subscriptionId: string,
    method: CancellationMethod,
    reason?: string,
  ): Promise<CancellationRequest> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = supabaseAdmin as any;

    // Get subscription details
    const subscription = await this.getSubscription(userId, subscriptionId);
    if (!subscription) {
      throw new Error("Subscription not found");
    }

    // Generate AI script
    const script = this.generateCancellationScript(subscription.name, reason);
    const info = this.getCancellationInfo(subscription.merchantName);
    const instructions = this.generateCancellationInstructions(subscription);

    const { data, error } = await supabase
      // idor-audit: pk-owner-checked — INSERT writes `user_id` from the caller-supplied id; there is no prior row to filter on
      .from("cancellation_requests")
      .insert({
        subscription_id: subscriptionId,
        user_id: userId,
        status: "pending",
        method,
        ai_script: JSON.stringify(script),
        instructions: instructions.steps,
        contact_info: info
          ? {
              phone: info.phoneNumber,
              email: info.email,
              url: info.websiteUrl || info.chatUrl,
            }
          : null,
        savings_amount: this.calculateAnnualSavings(subscription),
      })
      .select()
      .single();

    if (error) {
      // SubscriptionCancellationService error: Error creating cancellation request
      throw new Error("Failed to create cancellation request");
    }

    // Update subscription status
    await supabase
      .from("subscriptions")
      .update({
        status: "pending_cancellation",
        updated_at: new Date().toISOString(),
      })
      .eq("id", subscriptionId)
      .eq("user_id", userId);

    return this.mapDbToCancellationRequest(data);
  }

  /**
   * Update cancellation request outcome
   */
  async updateCancellationOutcome(
    userId: string,
    requestId: string,
    outcome: CancellationOutcome,
    notes?: string,
  ): Promise<CancellationRequest> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = supabaseAdmin as any;

    const { data: request, error: fetchError } = await supabase
      .from("cancellation_requests")
      .select("subscription_id")
      .eq("id", requestId)
      .eq("user_id", userId)
      .single();

    if (fetchError) {
      throw new Error("Cancellation request not found");
    }

    const { data, error } = await supabase
      .from("cancellation_requests")
      .update({
        status: outcome,
        outcome,
        notes,
        completed_at: new Date().toISOString(),
      })
      .eq("id", requestId)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) {
      // SubscriptionCancellationService error: Error updating cancellation request
      throw new Error("Failed to update cancellation request");
    }

    // Update subscription status based on outcome
    const newStatus = outcome === "cancelled" ? "cancelled" : "active";
    await supabase
      .from("subscriptions")
      .update({
        status: newStatus,
        cancellation_status: outcome,
        cancelled_at: outcome === "cancelled" ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", request.subscription_id)
      .eq("user_id", userId);

    return this.mapDbToCancellationRequest(data);
  }

  /**
   * Get a single subscription
   */
  private async getSubscription(
    userId: string,
    subscriptionId: string,
  ): Promise<Subscription | null> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = supabaseAdmin as any;

    const { data, error } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("id", subscriptionId)
      .eq("user_id", userId)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw new Error("Failed to fetch subscription");
    }

    return this.mapDbToSubscription(data);
  }

  /**
   * Convert amount to monthly
   */
  private getMonthlyAmount(amount: number, frequency: string): number {
    switch (frequency) {
      case "weekly":
        return amount * 4.33;
      case "monthly":
        return amount;
      case "quarterly":
        return amount / 3;
      case "yearly":
        return amount / 12;
      default:
        return amount;
    }
  }

  /**
   * Calculate annual savings from cancelling
   */
  private calculateAnnualSavings(subscription: Subscription): number {
    return (
      Math.round(
        this.getMonthlyAmount(subscription.amount, subscription.frequency) *
          12 *
          100,
      ) / 100
    );
  }

  /**
   * Map database row to Subscription
   */
  private mapDbToSubscription(row: Record<string, unknown>): Subscription {
    return {
      id: row.id as string,
      userId: row.user_id as string,
      name: row.name as string,
      merchantName: row.merchant_name as string,
      amount: row.amount as number,
      frequency: row.frequency as Subscription["frequency"],
      category: row.category as string,
      status: row.status as SubscriptionStatus,
      nextBillingDate: new Date(row.next_billing_date as string),
      detectedFromBillId: row.detected_from_bill_id as string | undefined,
      logoUrl: row.logo_url as string | undefined,
      annualCost: row.annual_cost as number,
      cancellationStatus: row.cancellation_status as
        | CancellationOutcome
        | undefined,
      cancelledAt: row.cancelled_at
        ? new Date(row.cancelled_at as string)
        : undefined,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    };
  }

  /**
   * Map database row to CancellationRequest
   */
  private mapDbToCancellationRequest(
    row: Record<string, unknown>,
  ): CancellationRequest {
    return {
      id: row.id as string,
      subscriptionId: row.subscription_id as string,
      userId: row.user_id as string,
      status: row.status as CancellationOutcome,
      method: row.method as CancellationMethod,
      aiScript: row.ai_script as string | undefined,
      instructions: row.instructions as string[] | undefined,
      contactInfo: row.contact_info as
        | CancellationRequest["contactInfo"]
        | undefined,
      outcome: row.outcome as CancellationOutcome | undefined,
      savingsAmount: row.savings_amount as number,
      createdAt: new Date(row.created_at as string),
      completedAt: row.completed_at
        ? new Date(row.completed_at as string)
        : undefined,
      notes: row.notes as string | undefined,
    };
  }

  // ==========================================================================
  // SUBSCRIPTION DETECTION & TRACKING
  // ==========================================================================

  /**
   * Detect subscriptions from transaction history
   */
  async detectSubscriptionsFromTransactions(
    userId: string,
  ): Promise<DetectedSubscription[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = supabaseAdmin as any;

    // Fetch last 6 months of transactions
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const { data: transactions, error } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", userId)
      .gte("date", sixMonthsAgo.toISOString())
      .order("date", { ascending: false });

    if (error) {
      throw new Error("Failed to fetch transactions");
    }

    // Group by merchant and amount to find recurring patterns
    const merchantGroups = new Map<
      string,
      { amounts: number[]; dates: Date[]; category: string }
    >();

    for (const tx of transactions || []) {
      const key = `${tx.merchant_name}_${Math.abs(tx.amount).toFixed(2)}`;
      if (!merchantGroups.has(key)) {
        merchantGroups.set(key, {
          amounts: [],
          dates: [],
          category: tx.category || "other",
        });
      }
      const group = merchantGroups.get(key)!;
      group.amounts.push(Math.abs(tx.amount));
      group.dates.push(new Date(tx.date));
    }

    const detected: DetectedSubscription[] = [];

    for (const [key, group] of merchantGroups) {
      if (group.dates.length < 2) continue;

      // Check for recurring pattern
      const frequency = this.detectFrequency(group.dates);
      if (!frequency) continue;

      const merchantName = key.split("_")[0];
      const amount = group.amounts[0];
      const isKnown = this.isKnownSubscriptionMerchant(merchantName);

      detected.push({
        merchantName,
        amount,
        frequency,
        lastChargeDate: group.dates[0],
        chargeCount: group.dates.length,
        confidence: this.calculateDetectionConfidence(
          group.dates,
          frequency,
          isKnown,
        ),
        category: group.category,
        isKnownSubscription: isKnown,
      });
    }

    return detected.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Get subscription insights and recommendations
   */
  async getSubscriptionInsights(
    userId: string,
  ): Promise<SubscriptionInsight[]> {
    const subscriptions = await this.getSubscriptions(userId);
    const insights: SubscriptionInsight[] = [];

    // Check for potential duplicate services
    const categoryGroups = new Map<string, Subscription[]>();
    for (const sub of subscriptions) {
      if (!categoryGroups.has(sub.category)) {
        categoryGroups.set(sub.category, []);
      }
      categoryGroups.get(sub.category)!.push(sub);
    }

    for (const [category, subs] of categoryGroups) {
      if (
        subs.length > 1 &&
        ["streaming", "music", "cloud_storage"].includes(category)
      ) {
        const totalMonthly = subs.reduce(
          (sum, s) => sum + this.getMonthlyAmount(s.amount, s.frequency),
          0,
        );
        insights.push({
          type: "duplicate",
          subscriptionId: subs[0].id,
          title: `Multiple ${category} subscriptions detected`,
          description: `You have ${subs.length} ${category} subscriptions totaling $${totalMonthly.toFixed(2)}/month`,
          potentialSavings: totalMonthly * 0.5,
          recommendation: `Consider consolidating to one service to save up to $${(totalMonthly * 0.5).toFixed(2)}/month`,
          priority: totalMonthly > 30 ? "high" : "medium",
        });
      }
    }

    // Check for high-cost subscriptions with free alternatives
    const freeAlternatives: Record<string, { name: string; savings: number }> =
      {
        "Microsoft 365": { name: "Google Docs (free)", savings: 10 },
        "Adobe Creative Cloud": { name: "Canva Free / GIMP", savings: 55 },
        Dropbox: { name: "Google Drive (15GB free)", savings: 12 },
      };

    for (const sub of subscriptions) {
      const alternative = freeAlternatives[sub.name];
      if (alternative) {
        insights.push({
          type: "free_tier_available",
          subscriptionId: sub.id,
          title: `Free alternative available for ${sub.name}`,
          description: `${alternative.name} offers similar features at no cost`,
          potentialSavings: this.getMonthlyAmount(sub.amount, sub.frequency),
          recommendation: `Switch to ${alternative.name} to save $${this.getMonthlyAmount(sub.amount, sub.frequency).toFixed(2)}/month`,
          priority: "medium",
        });
      }
    }

    return insights.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  /**
   * Get subscription spending trends
   */
  async getSubscriptionTrends(
    userId: string,
    months: number = 6,
  ): Promise<SubscriptionTrend[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = supabaseAdmin as any;

    const trends: SubscriptionTrend[] = [];
    const now = new Date();

    for (let i = 0; i < months; i++) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

      const { data: subs } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", userId)
        .lte("created_at", monthEnd.toISOString());

      const activeInMonth = (subs || []).filter(
        (s: Record<string, unknown>) => {
          const createdAt = new Date(s.created_at as string);
          const cancelledAt = s.cancelled_at
            ? new Date(s.cancelled_at as string)
            : null;
          return (
            createdAt <= monthEnd && (!cancelledAt || cancelledAt > monthStart)
          );
        },
      );

      const newInMonth = (subs || []).filter((s: Record<string, unknown>) => {
        const createdAt = new Date(s.created_at as string);
        return createdAt >= monthStart && createdAt <= monthEnd;
      });

      const cancelledInMonth = (subs || []).filter(
        (s: Record<string, unknown>) => {
          const cancelledAt = s.cancelled_at
            ? new Date(s.cancelled_at as string)
            : null;
          return (
            cancelledAt && cancelledAt >= monthStart && cancelledAt <= monthEnd
          );
        },
      );

      const totalSpend = activeInMonth.reduce(
        (sum: number, s: Record<string, unknown>) =>
          sum +
          this.getMonthlyAmount(s.amount as number, s.frequency as string),
        0,
      );

      trends.push({
        period: monthStart.toLocaleDateString("en-US", {
          month: "short",
          year: "numeric",
        }),
        totalSpend: Math.round(totalSpend * 100) / 100,
        subscriptionCount: activeInMonth.length,
        newSubscriptions: newInMonth.length,
        cancelledSubscriptions: cancelledInMonth.length,
      });
    }

    return trends.reverse();
  }

  /**
   * Add a detected subscription to tracked subscriptions
   */
  async addDetectedSubscription(
    userId: string,
    detected: DetectedSubscription,
  ): Promise<Subscription> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = supabaseAdmin as any;

    const nextBillingDate = this.calculateNextBillingDate(
      detected.lastChargeDate,
      detected.frequency,
    );

    const { data, error } = await supabase
      // idor-audit: pk-owner-checked — INSERT writes `user_id` from the caller-supplied id; there is no prior row to filter on
      .from("subscriptions")
      .insert({
        user_id: userId,
        name: detected.merchantName,
        merchant_name: detected.merchantName,
        amount: detected.amount,
        frequency: detected.frequency,
        category: detected.category,
        status: "active",
        next_billing_date: nextBillingDate.toISOString(),
        annual_cost:
          this.getMonthlyAmount(detected.amount, detected.frequency) * 12,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to add subscription: ${error.message}`);
    }

    return this.mapDbToSubscription(data);
  }

  // ==========================================================================
  // PRIVATE DETECTION HELPERS
  // ==========================================================================

  private detectFrequency(
    dates: Date[],
  ): "weekly" | "monthly" | "quarterly" | "yearly" | null {
    if (dates.length < 2) return null;

    const sortedDates = [...dates].sort((a, b) => b.getTime() - a.getTime());
    const gaps: number[] = [];

    for (let i = 0; i < sortedDates.length - 1; i++) {
      const gap = Math.round(
        (sortedDates[i].getTime() - sortedDates[i + 1].getTime()) /
          (1000 * 60 * 60 * 24),
      );
      gaps.push(gap);
    }

    const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;

    if (avgGap >= 5 && avgGap <= 9) return "weekly";
    if (avgGap >= 25 && avgGap <= 35) return "monthly";
    if (avgGap >= 85 && avgGap <= 100) return "quarterly";
    if (avgGap >= 350 && avgGap <= 380) return "yearly";

    return null;
  }

  private calculateDetectionConfidence(
    dates: Date[],
    frequency: string,
    isKnown: boolean,
  ): number {
    let confidence = 50;

    // More occurrences = higher confidence
    confidence += Math.min(dates.length * 5, 25);

    // Known subscription merchants get a boost
    if (isKnown) confidence += 15;

    // Consistent intervals boost confidence
    if (dates.length >= 3) {
      const sortedDates = [...dates].sort((a, b) => b.getTime() - a.getTime());
      const gaps: number[] = [];
      for (let i = 0; i < sortedDates.length - 1; i++) {
        gaps.push(
          Math.round(
            (sortedDates[i].getTime() - sortedDates[i + 1].getTime()) /
              (1000 * 60 * 60 * 24),
          ),
        );
      }
      const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
      const variance =
        gaps.reduce((sum, gap) => sum + Math.abs(gap - avgGap), 0) /
        gaps.length;

      if (variance < 3) confidence += 10;
    }

    return Math.min(confidence, 95);
  }

  private isKnownSubscriptionMerchant(merchantName: string): boolean {
    const knownMerchants = [
      "netflix",
      "spotify",
      "hulu",
      "amazon prime",
      "disney+",
      "hbo max",
      "apple music",
      "youtube premium",
      "adobe",
      "microsoft",
      "dropbox",
      "google one",
      "icloud",
      "audible",
      "kindle unlimited",
      "paramount+",
      "peacock",
      "crunchyroll",
      "planet fitness",
      "la fitness",
      "gym",
    ];
    const normalized = merchantName.toLowerCase();
    return knownMerchants.some((m) => normalized.includes(m));
  }

  private calculateNextBillingDate(lastCharge: Date, frequency: string): Date {
    const next = new Date(lastCharge);
    switch (frequency) {
      case "weekly":
        next.setDate(next.getDate() + 7);
        break;
      case "monthly":
        next.setMonth(next.getMonth() + 1);
        break;
      case "quarterly":
        next.setMonth(next.getMonth() + 3);
        break;
      case "yearly":
        next.setFullYear(next.getFullYear() + 1);
        break;
    }
    return next;
  }
}

// Export singleton instance
export const subscriptionCancellationService =
  new SubscriptionCancellationService();
export default subscriptionCancellationService;
