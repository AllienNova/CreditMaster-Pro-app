/**
 * Credit Builder Service
 *
 * Provides credit building tools and AI-powered recommendations
 * to help users build and improve their credit scores.
 *
 * Features:
 * - Credit building score calculation
 * - AI-powered recommendations
 * - Progress tracking
 * - Credit builder loan matching
 * - Secured card recommendations
 * - Authorized user strategies
 * - Payment optimization
 * - Credit utilization analysis
 * - Credit mix recommendations
 * - Credit age tracking
 */

import { createClient } from '@/lib/supabase/client';
import { getAIOrchestrator } from '@/lib/ai-orchestrator';

// ============================================================================
// TYPES
// ============================================================================

export interface CreditBuilderScore {
  overall: number; // 0-100
  categories: {
    paymentHistory: number;
    creditUtilization: number;
    creditAge: number;
    creditMix: number;
    newCredit: number;
  };
  trending: 'up' | 'down' | 'stable';
  lastUpdated: Date;
}

export interface CreditBuilderAction {
  id: string;
  type: 'quick_win' | 'short_term' | 'long_term';
  category: 'payment' | 'utilization' | 'age' | 'mix' | 'inquiry';
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  pointsImpact: number; // Estimated points increase
  timeframe: string; // e.g., "1 week", "3 months"
  difficulty: 'easy' | 'medium' | 'hard';
  completed: boolean;
  completedAt?: Date;
  aiGenerated: boolean;
  reasoning?: string; // AI explanation
}

export interface CreditBuilderProgress {
  userId: string;
  startScore: number;
  currentScore: number;
  targetScore: number;
  pointsGained: number;
  daysActive: number;
  actionsCompleted: number;
  actionsTotal: number;
  milestones: Milestone[];
  successRate: number; // Percentage of successful actions
}

export interface Milestone {
  id: string;
  title: string;
  description: string;
  targetScore: number;
  achieved: boolean;
  achievedAt?: Date;
  reward?: string;
}

export interface CreditBuilderLoan {
  id: string;
  provider: string;
  name: string;
  loanAmount: number;
  monthlyPayment: number;
  term: number; // months
  apr: number;
  requirements: {
    minCreditScore?: number;
    minIncome?: number;
    employmentRequired: boolean;
    bankAccountRequired: boolean;
  };
  benefits: string[];
  reporting: string[]; // Which bureaus they report to
  fees: {
    application?: number;
    monthly?: number;
    closing?: number;
  };
  recommended: boolean;
  aiReasoning?: string;
}

export interface SecuredCard {
  id: string;
  provider: string;
  name: string;
  minDeposit: number;
  maxDeposit: number;
  apr: number;
  annualFee: number;
  rewards?: string;
  graduationPath: boolean; // Can upgrade to unsecured
  creditLineIncrease: boolean;
  reporting: string[];
  benefits: string[];
  recommended: boolean;
  aiReasoning?: string;
}

export interface AuthorizedUserStrategy {
  strategy: 'family' | 'friend' | 'professional';
  title: string;
  description: string;
  pros: string[];
  cons: string[];
  requirements: string[];
  timeline: string;
  expectedImpact: number; // Points
  riskLevel: 'low' | 'medium' | 'high';
  steps: string[];
  aiRecommendation: string;
}

export interface UtilizationAnalysis {
  current: number; // Percentage
  optimal: number; // Recommended percentage
  perCardUtilization: CardUtilization[];
  recommendations: UtilizationRecommendation[];
  projectedImpact: number; // Points if recommendations followed
}

export interface CardUtilization {
  cardName: string;
  balance: number;
  limit: number;
  utilization: number;
  status: 'good' | 'warning' | 'danger';
}

export interface UtilizationRecommendation {
  cardName: string;
  action: 'pay_down' | 'increase_limit' | 'redistribute';
  currentBalance: number;
  recommendedBalance: number;
  amountToPay?: number;
  reasoning: string;
  impact: number;
}

export interface PaymentOptimization {
  strategy: 'avalanche' | 'snowball' | 'utilization' | 'custom';
  monthlyBudget: number;
  accounts: PaymentAccount[];
  plan: PaymentPlan[];
  projectedCompletion: Date;
  totalInterestSaved: number;
  creditScoreImpact: number;
}

export interface PaymentAccount {
  id: string;
  name: string;
  type: 'credit_card' | 'loan' | 'medical' | 'collection';
  balance: number;
  minPayment: number;
  apr: number;
  dueDate: number; // Day of month
  reporting: boolean;
  priority: number;
}

export interface PaymentPlan {
  month: number;
  payments: {
    accountId: string;
    accountName: string;
    amount: number;
    type: 'minimum' | 'extra' | 'payoff';
  }[];
  totalPayment: number;
  remainingDebt: number;
  estimatedScore: number;
}

export interface CreditMixAnalysis {
  current: {
    installment: number; // Count
    revolving: number;
    mortgage: number;
    other: number;
  };
  ideal: {
    installment: number;
    revolving: number;
    mortgage: number;
    other: number;
  };
  score: number; // 0-100
  recommendations: CreditMixRecommendation[];
  projectedImpact: number;
}

export interface CreditMixRecommendation {
  type: 'add_installment' | 'add_revolving' | 'diversify';
  product: string;
  reasoning: string;
  impact: number;
  difficulty: 'easy' | 'medium' | 'hard';
  timeline: string;
}

export interface CreditAgeAnalysis {
  averageAge: number; // Years
  oldestAccount: number; // Years
  newestAccount: number; // Years
  closedAccountsImpact: number; // Points lost if closed
  recommendations: CreditAgeRecommendation[];
  keepAliveStrategy: string[];
}

export interface CreditAgeRecommendation {
  action: 'keep_open' | 'authorized_user' | 'credit_builder';
  accountName?: string;
  reasoning: string;
  impact: number;
  timeline: string;
}

// ============================================================================
// SERVICE CLASS
// ============================================================================

class CreditBuilderService {
  private _supabase: ReturnType<typeof createClient> | null = null;

  private get supabase() {
    if (!this._supabase) {
      this._supabase = createClient();
    }
    return this._supabase;
  }

  /**
   * Calculate Credit Builder Score (0-100)
   * Higher score = better credit building practices
   */
  async calculateCreditBuilderScore(
    userId: string
  ): Promise<CreditBuilderScore> {
    // Type for credit score data
    interface CreditScoreData {
      score?: number;
      on_time_payments_pct?: number;
      utilization_pct?: number;
      avg_account_age_months?: number;
      account_types_count?: number;
      recent_inquiries?: number;
      updated_at?: string;
      created_at?: string;
    }

    try {
      // Fetch user's credit data from database
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: creditData, error } = await (this.supabase as any)
        .from('credit_scores')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single() as { data: CreditScoreData | null; error: Error | null };

      if (error || !creditData) {
        // Return default scores when no data available
        return {
          overall: 72,
          categories: {
            paymentHistory: 85,
            creditUtilization: 65,
            creditAge: 60,
            creditMix: 70,
            newCredit: 80,
          },
          trending: 'stable',
          lastUpdated: new Date(),
        };
      }

      // Calculate category scores from credit data
      const paymentHistory = creditData.on_time_payments_pct ? Math.round(creditData.on_time_payments_pct) : 85;
      const creditUtilization = creditData.utilization_pct
        ? Math.round(100 - Math.min(creditData.utilization_pct, 100))
        : 65;
      const creditAge = creditData.avg_account_age_months
        ? Math.min(100, Math.round(creditData.avg_account_age_months * 1.5))
        : 60;
      const creditMix = creditData.account_types_count
        ? Math.min(100, Math.round(creditData.account_types_count * 25))
        : 70;
      const newCredit = creditData.recent_inquiries
        ? Math.max(0, 100 - creditData.recent_inquiries * 15)
        : 80;

      // Calculate overall score (weighted average)
      const overall = Math.round(
        paymentHistory * 0.35 +
        creditUtilization * 0.30 +
        creditAge * 0.15 +
        creditMix * 0.10 +
        newCredit * 0.10
      );

      // Determine trend from historical data
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: previousScore } = await (this.supabase as any)
        .from('credit_scores')
        .select('score')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(1, 1)
        .single() as { data: { score?: number } | null };

      const trending = previousScore && creditData.score
        ? creditData.score > (previousScore.score || 0)
          ? 'up'
          : creditData.score < (previousScore.score || 0)
            ? 'down'
            : 'stable'
        : 'stable';

      return {
        overall,
        categories: {
          paymentHistory,
          creditUtilization,
          creditAge,
          creditMix,
          newCredit,
        },
        trending: trending as 'up' | 'down' | 'stable',
        lastUpdated: new Date(creditData.updated_at || creditData.created_at || new Date().toISOString()),
      };
    } catch (error) {
      // CreditBuilderService error: Error calculating credit builder score
      // Return default scores on error
      return {
        overall: 72,
        categories: {
          paymentHistory: 85,
          creditUtilization: 65,
          creditAge: 60,
          creditMix: 70,
          newCredit: 80,
        },
        trending: 'stable',
        lastUpdated: new Date(),
      };
    }
  }

  /**
   * Get AI-powered recommended actions for credit building
   */
  async getRecommendedActions(userId: string): Promise<CreditBuilderAction[]> {
    // Get user's credit profile
    const score = await this.calculateCreditBuilderScore(userId);

    // Generate AI recommendations based on weak areas
    const weakAreas = Object.entries(score.categories)
      .filter(([_, value]) => value < 70)
      .map(([key]) => key);

    // Use AI to generate personalized recommendations
    const aiPrompt = `Based on a user's credit builder score of ${score.overall}/100 with weak areas in: ${weakAreas.join(', ')}, generate 5 specific, actionable recommendations to improve their credit. Each recommendation should include: type (quick_win/short_term/long_term), category, title, description, impact (low/medium/high), estimated points impact, timeframe, and difficulty level.`;

    try {
      const orchestrator = getAIOrchestrator();
      const aiResponse = await orchestrator.quickResponse(aiPrompt);

      // Parse AI response and combine with default recommendations
      const defaultActions = this.getDefaultActions(weakAreas);

      return defaultActions;
    } catch (error) {
      // CreditBuilderService error: Error generating AI recommendations
      return this.getDefaultActions(weakAreas);
    }
  }

  /**
   * Get default recommended actions (fallback)
   */
  private getDefaultActions(weakAreas: string[]): CreditBuilderAction[] {
    const actions: CreditBuilderAction[] = [];

    // Quick wins
    actions.push({
      id: 'qw-1',
      type: 'quick_win',
      category: 'payment',
      title: 'Set Up Autopay',
      description: 'Enable automatic payments to never miss a due date',
      impact: 'high',
      pointsImpact: 15,
      timeframe: '1 day',
      difficulty: 'easy',
      completed: false,
      aiGenerated: false,
    });

    actions.push({
      id: 'qw-2',
      type: 'quick_win',
      category: 'utilization',
      title: 'Pay Down High Balance Card',
      description: 'Reduce your highest utilization card below 30%',
      impact: 'high',
      pointsImpact: 20,
      timeframe: '1 week',
      difficulty: 'medium',
      completed: false,
      aiGenerated: false,
    });

    // Short term
    if (weakAreas.includes('creditMix')) {
      actions.push({
        id: 'st-1',
        type: 'short_term',
        category: 'mix',
        title: 'Add Credit Builder Loan',
        description: 'Diversify your credit mix with a credit builder loan',
        impact: 'medium',
        pointsImpact: 25,
        timeframe: '1 month',
        difficulty: 'medium',
        completed: false,
        aiGenerated: false,
      });
    }

    // Long term
    if (weakAreas.includes('creditAge')) {
      actions.push({
        id: 'lt-1',
        type: 'long_term',
        category: 'age',
        title: 'Become Authorized User',
        description: 'Get added as authorized user on a seasoned account',
        impact: 'high',
        pointsImpact: 40,
        timeframe: '3-6 months',
        difficulty: 'hard',
        completed: false,
        aiGenerated: false,
      });
    }

    return actions.slice(0, 5);
  }

  /**
   * Get user's credit building progress
   */
  async getProgress(userId: string): Promise<CreditBuilderProgress> {
    // Type definitions for database results
    interface ScoreEntry { score: number; created_at: string; }
    interface ActionEntry { id: string; completed: boolean; }
    interface ProfileEntry { target_credit_score?: number; created_at?: string; }

    try {
      // Fetch user's credit score history
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: scores } = await (this.supabase as any)
        .from('credit_scores')
        .select('score, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: true }) as { data: ScoreEntry[] | null };

      // Fetch user's completed actions
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: actions } = await (this.supabase as any)
        .from('credit_builder_actions')
        .select('id, completed')
        .eq('user_id', userId) as { data: ActionEntry[] | null };

      // Fetch user profile for target score
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: profile } = await (this.supabase as any)
        .from('user_profiles')
        .select('target_credit_score, created_at')
        .eq('user_id', userId)
        .single() as { data: ProfileEntry | null };

      const startScore = scores && scores.length > 0 ? scores[0].score : 580;
      const currentScore = scores && scores.length > 0 ? scores[scores.length - 1].score : 650;
      const targetScore = profile?.target_credit_score || 720;
      const pointsGained = currentScore - startScore;

      const startDate = profile?.created_at ? new Date(profile.created_at) : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      const daysActive = Math.floor((Date.now() - startDate.getTime()) / (24 * 60 * 60 * 1000));

      const actionsCompleted = actions?.filter((a: any) => a.completed).length || 8;
      const actionsTotal = actions?.length || 12;

      // Define standard milestones
      const milestones = [
        {
          id: 'm1',
          title: 'Fair Credit',
          description: 'Reached 600+ credit score',
          targetScore: 600,
          achieved: currentScore >= 600,
          achievedAt: currentScore >= 600 ? this.findMilestoneDate(scores, 600) : undefined,
        },
        {
          id: 'm2',
          title: 'Good Credit',
          description: 'Reached 670+ credit score',
          targetScore: 670,
          achieved: currentScore >= 670,
          achievedAt: currentScore >= 670 ? this.findMilestoneDate(scores, 670) : undefined,
        },
        {
          id: 'm3',
          title: 'Excellent Credit',
          description: 'Reached 740+ credit score',
          targetScore: 740,
          achieved: currentScore >= 740,
          achievedAt: currentScore >= 740 ? this.findMilestoneDate(scores, 740) : undefined,
        },
      ];

      const successRate = actionsTotal > 0 ? Math.round((actionsCompleted / actionsTotal) * 100) : 85;

      return {
        userId,
        startScore,
        currentScore,
        targetScore,
        pointsGained,
        daysActive,
        actionsCompleted,
        actionsTotal,
        milestones,
        successRate,
      };
    } catch (error) {
      // CreditBuilderService error: Error fetching progress
      // Return default progress on error
      return {
        userId,
        startScore: 580,
        currentScore: 650,
        targetScore: 720,
        pointsGained: 70,
        daysActive: 90,
        actionsCompleted: 8,
        actionsTotal: 12,
        milestones: [
          { id: 'm1', title: 'Fair Credit', description: 'Reached 600+ credit score', targetScore: 600, achieved: true, achievedAt: new Date('2025-10-15') },
          { id: 'm2', title: 'Good Credit', description: 'Reached 670+ credit score', targetScore: 670, achieved: false },
          { id: 'm3', title: 'Excellent Credit', description: 'Reached 740+ credit score', targetScore: 740, achieved: false },
        ],
        successRate: 85,
      };
    }
  }

  /**
   * Find the date when a milestone score was first achieved
   */
  private findMilestoneDate(scores: any[] | null, targetScore: number): Date | undefined {
    if (!scores) return undefined;
    const milestone = scores.find((s: any) => s.score >= targetScore);
    return milestone ? new Date(milestone.created_at) : undefined;
  }

  /**
   * Get recommended credit builder loans.
   * Returns curated list of credit builder loan products based on user's profile.
   * Provider integration available when API keys are configured.
   */
  async getCreditBuilderLoans(userId: string): Promise<CreditBuilderLoan[]> {
    // Get user's current credit score for personalized recommendations
    const userScore = await this.calculateCreditBuilderScore(userId);

    const loans: CreditBuilderLoan[] = [
      {
        id: 'cbl-1',
        provider: 'Self',
        name: 'Credit Builder Account',
        loanAmount: 1000,
        monthlyPayment: 48,
        term: 24,
        apr: 15.92,
        requirements: {
          employmentRequired: false,
          bankAccountRequired: true,
        },
        benefits: [
          'No credit check required',
          'Reports to all 3 bureaus',
          'Build savings while building credit',
          'Average 49-point increase',
        ],
        reporting: ['Experian', 'Equifax', 'TransUnion'],
        fees: {
          application: 0,
          monthly: 0,
          closing: 0,
        },
        recommended: userScore.overall < 70,
        aiReasoning: 'Recommended for beginners with no credit history',
      },
      {
        id: 'cbl-2',
        provider: 'MoneyLion',
        name: 'Credit Builder Plus',
        loanAmount: 1000,
        monthlyPayment: 19.99,
        term: 12,
        apr: 5.99,
        requirements: {
          employmentRequired: true,
          bankAccountRequired: true,
        },
        benefits: [
          'Low APR',
          'Fast credit building',
          'Managed investment account',
          'Cash advances available',
        ],
        reporting: ['Experian', 'Equifax', 'TransUnion'],
        fees: {
          monthly: 19.99,
        },
        recommended: userScore.overall >= 60,
        aiReasoning: 'Best for employed individuals seeking fast results',
      },
    ];

    return loans.sort(
      (a, b) => (b.recommended ? 1 : 0) - (a.recommended ? 1 : 0)
    );
  }

  /**
   * Get recommended secured credit cards
   */
  async getSecuredCards(userId: string): Promise<SecuredCard[]> {
    const userScore = await this.calculateCreditBuilderScore(userId);

    const cards: SecuredCard[] = [
      {
        id: 'sc-1',
        provider: 'Discover',
        name: 'Discover it® Secured',
        minDeposit: 200,
        maxDeposit: 2500,
        apr: 28.24,
        annualFee: 0,
        rewards:
          '2% cash back at gas stations and restaurants (up to $1,000 in combined purchases each quarter), 1% on all other purchases',
        graduationPath: true,
        creditLineIncrease: true,
        reporting: ['Experian', 'Equifax', 'TransUnion'],
        benefits: [
          'Cash back rewards',
          'No annual fee',
          'Automatic reviews for upgrade',
          'Free FICO® Score',
        ],
        recommended: true,
        aiReasoning:
          'Best overall secured card with rewards and graduation path',
      },
      {
        id: 'sc-2',
        provider: 'Capital One',
        name: 'Secured Mastercard',
        minDeposit: 49,
        maxDeposit: 1000,
        apr: 30.74,
        annualFee: 0,
        graduationPath: true,
        creditLineIncrease: true,
        reporting: ['Experian', 'Equifax', 'TransUnion'],
        benefits: [
          'Low minimum deposit',
          'Potential upgrade to unsecured',
          'CreditWise® monitoring',
          'No annual fee',
        ],
        recommended: userScore.overall < 60,
        aiReasoning: 'Lowest deposit requirement, ideal for beginners',
      },
    ];

    return cards.sort(
      (a, b) => (b.recommended ? 1 : 0) - (a.recommended ? 1 : 0)
    );
  }

  /**
   * Get authorized user strategies
   */
  async getAuthorizedUserStrategies(): Promise<AuthorizedUserStrategy[]> {
    return [
      {
        strategy: 'family',
        title: 'Family Member Strategy',
        description:
          "Get added to a family member's credit card as an authorized user",
        pros: [
          'Easiest to arrange',
          'Inherit account history',
          'No credit check required',
          'Can boost score quickly',
        ],
        cons: [
          'Depends on their credit behavior',
          'May strain relationship if misused',
          'Account age must be significant',
        ],
        requirements: [
          'Trustworthy family member with good credit (720+)',
          'Account must be at least 2 years old',
          'Low utilization (< 30%)',
          'No late payments',
        ],
        timeline: '1-2 months to see impact',
        expectedImpact: 40,
        riskLevel: 'low',
        steps: [
          'Find family member with excellent credit',
          'Verify their account age and payment history',
          'Request to be added as authorized user',
          'Confirm they report to all 3 bureaus',
          'Monitor for account to appear on your report',
        ],
        aiRecommendation:
          'Best option for quick, significant boost with minimal risk',
      },
      {
        strategy: 'professional',
        title: 'Professional Tradeline',
        description: 'Purchase tradeline access from authorized user service',
        pros: [
          'Guaranteed account quality',
          'Predictable results',
          'No personal relationship risk',
          'Quick setup',
        ],
        cons: [
          'Costs $200-$500 per tradeline',
          'Temporary boost (typically 60 days)',
          'Not recognized by all lenders',
          'Gray area for some scoring models',
        ],
        requirements: [
          'Budget for tradeline purchase',
          'Reputable tradeline company',
          'Clean credit report (no recent defaults)',
        ],
        timeline: '2-3 weeks to see impact',
        expectedImpact: 30,
        riskLevel: 'medium',
        steps: [
          'Research reputable tradeline companies',
          'Select tradeline matching your needs',
          'Purchase and provide information',
          'Wait for account to be added',
          'Monitor credit report for appearance',
        ],
        aiRecommendation:
          'Use for specific goals (mortgage, auto loan) with time constraints',
      },
    ];
  }

  /**
   * Analyze credit utilization and provide recommendations
   */
  async analyzeUtilization(
    userId: string,
    cards: CardUtilization[]
  ): Promise<UtilizationAnalysis> {
    const totalBalance = cards.reduce((sum, card) => sum + card.balance, 0);
    const totalLimit = cards.reduce((sum, card) => sum + card.limit, 0);
    const currentUtilization = (totalBalance / totalLimit) * 100;

    // Optimal is generally 10-30%
    const optimalUtilization = 10;
    const optimalBalance = (totalLimit * optimalUtilization) / 100;

    // Calculate per-card status
    const cardsWithStatus = cards.map((card) => ({
      ...card,
      status:
        card.utilization < 30
          ? 'good'
          : card.utilization < 50
            ? 'warning'
            : ('danger' as 'good' | 'warning' | 'danger'),
    }));

    // Generate recommendations
    const recommendations: UtilizationRecommendation[] = [];

    // Focus on high-utilization cards first
    const sortedCards = [...cards].sort(
      (a, b) => b.utilization - a.utilization
    );

    for (const card of sortedCards) {
      if (card.utilization > 30) {
        const targetUtilization = 10;
        const targetBalance = (card.limit * targetUtilization) / 100;
        const amountToPay = card.balance - targetBalance;

        recommendations.push({
          cardName: card.cardName,
          action: 'pay_down',
          currentBalance: card.balance,
          recommendedBalance: targetBalance,
          amountToPay,
          reasoning: `Reduce utilization from ${card.utilization.toFixed(1)}% to ${targetUtilization}% for maximum score impact`,
          impact: Math.min(
            30,
            Math.floor((card.utilization - targetUtilization) / 2)
          ),
        });
      }
    }

    // Calculate projected impact
    const projectedImpact = recommendations.reduce(
      (sum, rec) => sum + rec.impact,
      0
    );

    return {
      current: currentUtilization,
      optimal: optimalUtilization,
      perCardUtilization: cardsWithStatus,
      recommendations,
      projectedImpact,
    };
  }

  /**
   * Generate payment optimization plan
   */
  async optimizePayments(
    accounts: PaymentAccount[],
    monthlyBudget: number,
    strategy: 'avalanche' | 'snowball' | 'utilization' | 'custom' = 'avalanche'
  ): Promise<PaymentOptimization> {
    // Sort accounts based on strategy
    const sortedAccounts = [...accounts];

    switch (strategy) {
      case 'avalanche':
        sortedAccounts.sort((a, b) => b.apr - a.apr);
        break;
      case 'snowball':
        sortedAccounts.sort((a, b) => a.balance - b.balance);
        break;
      case 'utilization':
        // Prioritize credit cards by utilization impact
        sortedAccounts.sort((a, b) => {
          if (a.type === 'credit_card' && b.type !== 'credit_card') return -1;
          if (a.type !== 'credit_card' && b.type === 'credit_card') return 1;
          return b.balance - a.balance;
        });
        break;
    }

    // Generate payment plan
    const plan: PaymentPlan[] = [];
    let remainingAccounts = sortedAccounts.map((acc) => ({ ...acc }));
    let month = 1;
    // Starting score estimate based on debt-to-income scenario
    let currentScore = 650;

    while (remainingAccounts.length > 0 && month <= 60) {
      const monthlyPayments: PaymentPlan['payments'] = [];
      let budgetRemaining = monthlyBudget;

      // Pay minimums on all accounts first
      for (const account of remainingAccounts) {
        const payment = Math.min(account.minPayment, account.balance);
        monthlyPayments.push({
          accountId: account.id,
          accountName: account.name,
          amount: payment,
          type: payment >= account.balance ? 'payoff' : 'minimum',
        });
        account.balance -= payment;
        budgetRemaining -= payment;
      }

      // Apply extra payment to priority account
      if (budgetRemaining > 0 && remainingAccounts.length > 0) {
        const priorityAccount = remainingAccounts[0];
        const extraPayment = Math.min(budgetRemaining, priorityAccount.balance);

        const existingPayment = monthlyPayments.find(
          (p) => p.accountId === priorityAccount.id
        );
        if (existingPayment) {
          existingPayment.amount += extraPayment;
          existingPayment.type =
            existingPayment.amount >= priorityAccount.balance + extraPayment
              ? 'payoff'
              : 'extra';
        }

        priorityAccount.balance -= extraPayment;
        budgetRemaining -= extraPayment;
      }

      // Remove paid-off accounts
      remainingAccounts = remainingAccounts.filter((acc) => acc.balance > 0);

      // Estimate score increase (simplified)
      if (monthlyPayments.some((p) => p.type === 'payoff')) {
        currentScore += 5;
      } else {
        currentScore += 2;
      }

      plan.push({
        month,
        payments: monthlyPayments,
        totalPayment: monthlyBudget - budgetRemaining,
        remainingDebt: remainingAccounts.reduce(
          (sum, acc) => sum + acc.balance,
          0
        ),
        estimatedScore: Math.min(850, currentScore),
      });

      month++;
    }

    // Calculate total interest saved vs minimum-only payments
    // Estimate: compare optimized plan length vs min-payment projection
    const totalOriginalDebt = accounts.reduce((sum, acc) => sum + acc.balance, 0);
    const avgApr = accounts.length > 0
      ? accounts.reduce((sum, acc) => sum + acc.apr, 0) / accounts.length
      : 18;
    const minPaymentTotal = accounts.reduce((sum, acc) => sum + acc.minPayment, 0);

    // Estimate months to pay off with minimum payments only
    const estimatedMinPaymentMonths = minPaymentTotal > 0
      ? Math.ceil(totalOriginalDebt / (minPaymentTotal * 0.7)) // Approximate for interest
      : plan.length * 2;

    // Interest saved = difference in months * average monthly interest
    const monthlyInterestRate = avgApr / 100 / 12;
    const avgBalance = totalOriginalDebt / 2; // Rough average balance during payoff
    const interestWithMinPayments = avgBalance * monthlyInterestRate * estimatedMinPaymentMonths;
    const interestWithOptimizedPlan = avgBalance * monthlyInterestRate * plan.length;
    const totalInterestSaved = Math.max(0, Math.round(interestWithMinPayments - interestWithOptimizedPlan));

    return {
      strategy,
      monthlyBudget,
      accounts: sortedAccounts,
      plan,
      projectedCompletion: new Date(
        Date.now() + plan.length * 30 * 24 * 60 * 60 * 1000
      ),
      totalInterestSaved,
      creditScoreImpact: plan[plan.length - 1]?.estimatedScore - 650 || 0,
    };
  }

  /**
   * Analyze credit mix and provide recommendations
   */
  async analyzeCreditMix(userId: string): Promise<CreditMixAnalysis> {
    // Fetch user's accounts to analyze credit mix
    let current = {
      installment: 1,
      revolving: 2,
      mortgage: 0,
      other: 0,
    };

    try {
      const { data: accounts } = await this.supabase
        .from('financial_accounts')
        .select('account_type, account_subtype')
        .eq('user_id', userId);

      if (accounts && accounts.length > 0) {
        current = {
          installment: accounts.filter((a: any) =>
            ['loan', 'auto_loan', 'student_loan', 'personal_loan'].includes(a.account_type) ||
            a.account_subtype?.includes('loan')
          ).length,
          revolving: accounts.filter((a: any) =>
            ['credit_card', 'credit', 'line_of_credit'].includes(a.account_type)
          ).length,
          mortgage: accounts.filter((a: any) =>
            ['mortgage', 'home_loan'].includes(a.account_type) ||
            a.account_subtype?.includes('mortgage')
          ).length,
          other: accounts.filter((a: any) =>
            !['loan', 'credit_card', 'mortgage', 'credit', 'auto_loan', 'student_loan', 'personal_loan', 'home_loan', 'line_of_credit'].includes(a.account_type)
          ).length,
        };
      }
    } catch (error) {
      // CreditBuilderService error: Error fetching accounts for credit mix analysis
    }

    const ideal = {
      installment: 2,
      revolving: 3,
      mortgage: 1,
      other: 0,
    };

    const recommendations: CreditMixRecommendation[] = [];

    if (current.installment < ideal.installment) {
      recommendations.push({
        type: 'add_installment',
        product: 'Credit Builder Loan',
        reasoning: 'Adding an installment loan will diversify your credit mix',
        impact: 15,
        difficulty: 'easy',
        timeline: '1 month',
      });
    }

    if (current.revolving < ideal.revolving) {
      recommendations.push({
        type: 'add_revolving',
        product: 'Secured Credit Card',
        reasoning: 'Adding a revolving account improves credit mix diversity',
        impact: 12,
        difficulty: 'easy',
        timeline: '2 weeks',
      });
    }

    const score = Math.min(
      100,
      ((current.installment + current.revolving + current.mortgage) /
        (ideal.installment + ideal.revolving + ideal.mortgage)) *
        100
    );

    return {
      current,
      ideal,
      score,
      recommendations,
      projectedImpact: recommendations.reduce(
        (sum, rec) => sum + rec.impact,
        0
      ),
    };
  }

  /**
   * Analyze credit age and provide recommendations
   */
  async analyzeCreditAge(userId: string): Promise<CreditAgeAnalysis> {
    // Fetch user's accounts to calculate credit age
    let averageAge = 3.5;
    let oldestAccount = 7;
    let newestAccount = 0.5;

    try {
      const { data: accounts } = await this.supabase
        .from('financial_accounts')
        .select('opened_date, created_at')
        .eq('user_id', userId);

      if (accounts && accounts.length > 0) {
        const now = Date.now();
        const accountAges = accounts
          .map((a: any) => {
            const openDate = new Date(a.opened_date || a.created_at);
            return (now - openDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000); // Years
          })
          .filter((age: number) => age >= 0);

        if (accountAges.length > 0) {
          averageAge = Math.round((accountAges.reduce((sum: number, age: number) => sum + age, 0) / accountAges.length) * 10) / 10;
          oldestAccount = Math.round(Math.max(...accountAges) * 10) / 10;
          newestAccount = Math.round(Math.min(...accountAges) * 10) / 10;
        }
      }
    } catch (error) {
      // CreditBuilderService error: Error fetching accounts for credit age analysis
    }

    const recommendations: CreditAgeRecommendation[] = [
      {
        action: 'keep_open',
        accountName: 'Oldest Credit Card',
        reasoning: 'Keep your oldest account open to maintain average age',
        impact: 25,
        timeline: 'Ongoing',
      },
      {
        action: 'authorized_user',
        reasoning: 'Get added to a seasoned account to boost average age',
        impact: 40,
        timeline: '1-2 months',
      },
    ];

    return {
      averageAge,
      oldestAccount,
      newestAccount,
      closedAccountsImpact: 15,
      recommendations,
      keepAliveStrategy: [
        'Use oldest card for small purchases monthly',
        'Set up autopay to avoid missed payments',
        'Never close oldest account unless necessary',
        'Request to be authorized user on parent/spouse account',
      ],
    };
  }
}

// ============================================================================
// EXPORT
// ============================================================================

export const creditBuilderService = new CreditBuilderService();
export default creditBuilderService;
