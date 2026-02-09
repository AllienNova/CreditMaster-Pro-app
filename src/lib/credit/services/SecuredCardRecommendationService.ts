/**
 * Secured Card Recommendation Service
 *
 * Provides personalized secured credit card recommendations based on:
 * - User's credit profile and goals
 * - Card features and benefits
 * - Approval likelihood
 * - Path to unsecured card
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ============================================================================
// TYPES
// ============================================================================

export type CardIssuer =
  | 'discover'
  | 'capital_one'
  | 'chase'
  | 'bank_of_america'
  | 'citi'
  | 'wells_fargo'
  | 'opensky'
  | 'chime'
  | 'self'
  | 'other';

export type CreditBuildingGoal =
  | 'first_credit'
  | 'rebuild_credit'
  | 'increase_score'
  | 'graduation_path'
  | 'maximize_rewards';

export interface SecuredCard {
  id: string;
  name: string;
  issuer: CardIssuer;
  annualFee: number;
  depositMin: number;
  depositMax: number;
  creditLineMin: number;
  creditLineMax: number;
  apr: { min: number; max: number };
  rewardsRate?: number;
  rewardsType?: string;
  graduationEligible: boolean;
  graduationTimeMonths?: number;
  reportsToBureaus: ('equifax' | 'experian' | 'transunion')[];
  noCreditCheckRequired: boolean;
  features: string[];
  pros: string[];
  cons: string[];
  bestFor: CreditBuildingGoal[];
  applicationUrl: string;
  imageUrl?: string;
  rating: number;
}

export interface UserCreditProfile {
  userId: string;
  creditScore?: number;
  hasCreditHistory: boolean;
  hasNegativeItems: boolean;
  negativeItemTypes?: string[];
  bankruptcyOnRecord: boolean;
  monthsSinceNegativeItem?: number;
  currentCreditCards: number;
  availableDeposit: number;
  primaryGoal: CreditBuildingGoal;
  monthlyIncome?: number;
}

export interface CardRecommendation {
  card: SecuredCard;
  matchScore: number;
  approvalLikelihood: 'high' | 'medium' | 'low';
  reasons: string[];
  warnings?: string[];
  estimatedGraduationDate?: Date;
  projectedScoreImpact: number;
}

export interface RecommendationResult {
  topRecommendation: CardRecommendation;
  alternatives: CardRecommendation[];
  tips: string[];
  nextSteps: string[];
}

// ============================================================================
// SECURED CARD DATABASE
// ============================================================================

const SECURED_CARDS: SecuredCard[] = [
  {
    id: 'discover-it-secured',
    name: 'Discover it® Secured Credit Card',
    issuer: 'discover',
    annualFee: 0,
    depositMin: 200,
    depositMax: 2500,
    creditLineMin: 200,
    creditLineMax: 2500,
    apr: { min: 28.24, max: 28.24 },
    rewardsRate: 2,
    rewardsType: '2% at gas stations and restaurants, 1% all else',
    graduationEligible: true,
    graduationTimeMonths: 8,
    reportsToBureaus: ['equifax', 'experian', 'transunion'],
    noCreditCheckRequired: false,
    features: [
      'Cashback Match first year',
      'Free FICO score',
      'No foreign transaction fees',
      'Automatic reviews for graduation',
    ],
    pros: [
      'Best rewards for a secured card',
      'No annual fee',
      'Quick graduation potential',
      'Cashback Match doubles rewards year 1',
    ],
    cons: ['Requires credit check', 'Not ideal for very bad credit'],
    bestFor: ['rebuild_credit', 'maximize_rewards', 'graduation_path'],
    applicationUrl: 'https://www.discover.com/credit-cards/secured/',
    rating: 4.8,
  },
  {
    id: 'capital-one-quicksilver-secured',
    name: 'Capital One Quicksilver Secured',
    issuer: 'capital_one',
    annualFee: 0,
    depositMin: 200,
    depositMax: 1000,
    creditLineMin: 200,
    creditLineMax: 1000,
    apr: { min: 30.74, max: 30.74 },
    rewardsRate: 1.5,
    rewardsType: '1.5% unlimited cashback',
    graduationEligible: true,
    graduationTimeMonths: 6,
    reportsToBureaus: ['equifax', 'experian', 'transunion'],
    noCreditCheckRequired: false,
    features: [
      'Automatic credit line reviews',
      'CreditWise monitoring',
      'No foreign transaction fees',
    ],
    pros: [
      'Good rewards rate',
      'Fast graduation possible',
      'Deposit may be partially refundable',
    ],
    cons: ['Higher APR', 'Lower maximum credit line'],
    bestFor: ['rebuild_credit', 'graduation_path'],
    applicationUrl:
      'https://www.capitalone.com/credit-cards/quicksilver-secured/',
    rating: 4.5,
  },
  {
    id: 'opensky-secured',
    name: 'OpenSky® Secured Visa® Credit Card',
    issuer: 'opensky',
    annualFee: 35,
    depositMin: 200,
    depositMax: 3000,
    creditLineMin: 200,
    creditLineMax: 3000,
    apr: { min: 22.64, max: 22.64 },
    graduationEligible: false,
    reportsToBureaus: ['equifax', 'experian', 'transunion'],
    noCreditCheckRequired: true,
    features: [
      'No credit check required',
      'No bank account required',
      'Reports to all 3 bureaus',
    ],
    pros: [
      'No credit check - guaranteed approval',
      'No bank account needed',
      'Higher credit line available',
    ],
    cons: ['Annual fee', 'No rewards', 'No graduation path'],
    bestFor: ['first_credit', 'rebuild_credit'],
    applicationUrl: 'https://www.opensky.com/',
    rating: 4.0,
  },
  {
    id: 'chime-credit-builder',
    name: 'Chime Credit Builder Visa',
    issuer: 'chime',
    annualFee: 0,
    depositMin: 0,
    depositMax: 10000,
    creditLineMin: 0,
    creditLineMax: 10000,
    apr: { min: 0, max: 0 },
    graduationEligible: false,
    reportsToBureaus: ['equifax', 'experian', 'transunion'],
    noCreditCheckRequired: true,
    features: [
      'No credit check',
      'No interest charges',
      'No minimum deposit',
      'Move money anytime',
    ],
    pros: [
      'No credit check',
      'No fees at all',
      'No interest',
      'Flexible deposits',
    ],
    cons: [
      'Requires Chime checking account',
      'No rewards',
      'Not a traditional credit card',
    ],
    bestFor: ['first_credit', 'rebuild_credit'],
    applicationUrl: 'https://www.chime.com/credit-builder/',
    rating: 4.3,
  },
  {
    id: 'self-credit-builder',
    name: 'Self Credit Builder Card',
    issuer: 'self',
    annualFee: 25,
    depositMin: 100,
    depositMax: 3000,
    creditLineMin: 100,
    creditLineMax: 3000,
    apr: { min: 29.74, max: 29.74 },
    graduationEligible: false,
    reportsToBureaus: ['equifax', 'experian', 'transunion'],
    noCreditCheckRequired: true,
    features: [
      'Builds savings while building credit',
      'No credit check',
      'Progress tracking app',
    ],
    pros: [
      'Unique savings approach',
      'No credit check',
      'Educational resources',
    ],
    cons: ['Annual fee', 'Requires Self account', 'Complex structure'],
    bestFor: ['first_credit'],
    applicationUrl: 'https://www.self.inc/',
    rating: 4.1,
  },
  {
    id: 'citi-secured',
    name: 'Citi® Secured Mastercard®',
    issuer: 'citi',
    annualFee: 0,
    depositMin: 200,
    depositMax: 2500,
    creditLineMin: 200,
    creditLineMax: 2500,
    apr: { min: 26.49, max: 26.49 },
    graduationEligible: true,
    graduationTimeMonths: 18,
    reportsToBureaus: ['equifax', 'experian', 'transunion'],
    noCreditCheckRequired: false,
    features: [
      'Flexible payment due date',
      'Access to Citi benefits',
      '24/7 customer service',
    ],
    pros: ['No annual fee', 'Established bank', 'Access to Citi ecosystem'],
    cons: ['No rewards', 'Longer graduation timeline'],
    bestFor: ['rebuild_credit', 'graduation_path'],
    applicationUrl: 'https://www.citi.com/credit-cards/citi-secured-mastercard',
    rating: 4.2,
  },
];

// ============================================================================
// RECOMMENDATION SERVICE
// ============================================================================

export class SecuredCardRecommendationService {
  private supabase: SupabaseClient;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  // ==========================================================================
  // RECOMMENDATION ENGINE
  // ==========================================================================

  async getRecommendations(
    profile: UserCreditProfile
  ): Promise<RecommendationResult> {
    // Score all cards against the user's profile
    const scoredCards = SECURED_CARDS.map((card) =>
      this.scoreCard(card, profile)
    );

    // Sort by match score
    scoredCards.sort((a, b) => b.matchScore - a.matchScore);

    // Generate tips based on profile
    const tips = this.generateTips(profile);
    const nextSteps = this.generateNextSteps(profile, scoredCards[0]);

    return {
      topRecommendation: scoredCards[0],
      alternatives: scoredCards.slice(1, 4),
      tips,
      nextSteps,
    };
  }

  private scoreCard(
    card: SecuredCard,
    profile: UserCreditProfile
  ): CardRecommendation {
    let score = 0;
    const reasons: string[] = [];
    const warnings: string[] = [];

    // Goal alignment (40 points max)
    if (card.bestFor.includes(profile.primaryGoal)) {
      score += 40;
      reasons.push(
        `Excellent match for your goal: ${this.formatGoal(profile.primaryGoal)}`
      );
    } else {
      score += 15;
    }

    // Deposit affordability (20 points max)
    if (profile.availableDeposit >= card.depositMin) {
      score += 20;
      if (profile.availableDeposit >= card.depositMax) {
        reasons.push(
          'You can maximize the credit line with your available deposit'
        );
      }
    } else {
      score -= 30;
      warnings.push(`Requires minimum $${card.depositMin} deposit`);
    }

    // Credit check consideration (15 points max)
    if (card.noCreditCheckRequired) {
      if (profile.hasNegativeItems || profile.bankruptcyOnRecord) {
        score += 15;
        reasons.push('No credit check - high approval likelihood');
      } else {
        score += 10;
      }
    } else if (profile.bankruptcyOnRecord) {
      score -= 20;
      warnings.push('Credit check required - bankruptcy may affect approval');
    }

    // Graduation potential (15 points max)
    if (card.graduationEligible && profile.primaryGoal === 'graduation_path') {
      score += 15;
      reasons.push(
        `Can graduate to unsecured card in ~${card.graduationTimeMonths} months`
      );
    }

    // Rewards (10 points max)
    if (card.rewardsRate && profile.primaryGoal === 'maximize_rewards') {
      score += 10;
      reasons.push(`Earns ${card.rewardsType}`);
    }

    // Annual fee consideration
    if (card.annualFee === 0) {
      score += 5;
      reasons.push('No annual fee');
    } else {
      if (
        profile.primaryGoal !== 'first_credit' &&
        !card.noCreditCheckRequired
      ) {
        score -= 5;
        warnings.push(`$${card.annualFee} annual fee`);
      }
    }

    // Reports to all bureaus
    if (card.reportsToBureaus.length === 3) {
      score += 5;
      reasons.push('Reports to all 3 credit bureaus');
    }

    // Determine approval likelihood
    let approvalLikelihood: 'high' | 'medium' | 'low' = 'medium';
    if (card.noCreditCheckRequired) {
      approvalLikelihood = 'high';
    } else if (profile.bankruptcyOnRecord) {
      approvalLikelihood = 'low';
    } else if (profile.creditScore && profile.creditScore >= 580) {
      approvalLikelihood = 'high';
    } else if (profile.hasNegativeItems) {
      approvalLikelihood = 'low';
    }

    // Calculate estimated graduation date
    let estimatedGraduationDate: Date | undefined;
    if (card.graduationEligible && card.graduationTimeMonths) {
      estimatedGraduationDate = new Date();
      estimatedGraduationDate.setMonth(
        estimatedGraduationDate.getMonth() + card.graduationTimeMonths
      );
    }

    // Estimate score impact
    const projectedScoreImpact = this.estimateScoreImpact(profile, card);

    return {
      card,
      matchScore: Math.max(0, Math.min(100, score)),
      approvalLikelihood,
      reasons,
      warnings: warnings.length > 0 ? warnings : undefined,
      estimatedGraduationDate,
      projectedScoreImpact,
    };
  }

  private estimateScoreImpact(
    profile: UserCreditProfile,
    card: SecuredCard
  ): number {
    let impact = 0;

    // New account impact
    if (!profile.hasCreditHistory) {
      impact += 30; // First credit account has big impact
    } else {
      impact += 10; // Additional account
    }

    // Utilization improvement potential
    if (profile.currentCreditCards === 0) {
      impact += 20;
    }

    // Bureau reporting
    impact += card.reportsToBureaus.length * 3;

    // Time factor (assuming 6 months of good behavior)
    impact += 15;

    return Math.min(impact, 100);
  }

  // ==========================================================================
  // TIPS & GUIDANCE
  // ==========================================================================

  private generateTips(profile: UserCreditProfile): string[] {
    const tips: string[] = [];

    tips.push('Keep your utilization below 30% of your credit limit');
    tips.push('Set up autopay to never miss a payment');

    if (!profile.hasCreditHistory) {
      tips.push(
        'Even small purchases build credit history - use your card regularly'
      );
      tips.push(
        "Consider becoming an authorized user on a family member's account"
      );
    }

    if (profile.hasNegativeItems) {
      tips.push('Focus on making all payments on time going forward');
      tips.push('Consider disputing any inaccurate negative items');
    }

    if (profile.primaryGoal === 'graduation_path') {
      tips.push('Use your card for at least one small purchase monthly');
      tips.push('Pay your balance in full each month to avoid interest');
    }

    tips.push('Request credit limit increases after 6 months of good behavior');

    return tips.slice(0, 5);
  }

  private generateNextSteps(
    profile: UserCreditProfile,
    topRec: CardRecommendation
  ): string[] {
    const steps: string[] = [];

    steps.push(`1. Review the ${topRec.card.name} details and terms`);

    if (!topRec.card.noCreditCheckRequired) {
      steps.push(
        "2. Check if you're pre-qualified (soft inquiry) if available"
      );
    }

    steps.push(
      `3. Prepare your security deposit ($${topRec.card.depositMin}-$${topRec.card.depositMax})`
    );
    steps.push('4. Gather required documents (ID, SSN, income info)');
    steps.push('5. Apply online - takes about 10 minutes');

    if (topRec.approvalLikelihood === 'high') {
      steps.push('6. Most applicants receive instant approval');
    }

    return steps;
  }

  private formatGoal(goal: CreditBuildingGoal): string {
    const labels: Record<CreditBuildingGoal, string> = {
      first_credit: 'Building first credit history',
      rebuild_credit: 'Rebuilding credit',
      increase_score: 'Increasing credit score',
      graduation_path: 'Path to unsecured card',
      maximize_rewards: 'Maximizing rewards',
    };
    return labels[goal];
  }

  // ==========================================================================
  // USER PROFILE MANAGEMENT
  // ==========================================================================

  async getUserProfile(userId: string): Promise<UserCreditProfile | null> {
    const { data } = await this.supabase
      .from('user_credit_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (!data) return null;

    return {
      userId: data.user_id,
      creditScore: data.credit_score,
      hasCreditHistory: data.has_credit_history,
      hasNegativeItems: data.has_negative_items,
      negativeItemTypes: data.negative_item_types,
      bankruptcyOnRecord: data.bankruptcy_on_record,
      monthsSinceNegativeItem: data.months_since_negative_item,
      currentCreditCards: data.current_credit_cards,
      availableDeposit: data.available_deposit,
      primaryGoal: data.primary_goal,
      monthlyIncome: data.monthly_income,
    };
  }

  async saveUserProfile(profile: UserCreditProfile): Promise<void> {
    await this.supabase.from('user_credit_profiles').upsert({
      user_id: profile.userId,
      credit_score: profile.creditScore,
      has_credit_history: profile.hasCreditHistory,
      has_negative_items: profile.hasNegativeItems,
      negative_item_types: profile.negativeItemTypes,
      bankruptcy_on_record: profile.bankruptcyOnRecord,
      months_since_negative_item: profile.monthsSinceNegativeItem,
      current_credit_cards: profile.currentCreditCards,
      available_deposit: profile.availableDeposit,
      primary_goal: profile.primaryGoal,
      monthly_income: profile.monthlyIncome,
      updated_at: new Date().toISOString(),
    });
  }

  // ==========================================================================
  // CARD CATALOG
  // ==========================================================================

  getAllCards(): SecuredCard[] {
    return SECURED_CARDS;
  }

  getCardById(cardId: string): SecuredCard | undefined {
    return SECURED_CARDS.find((c) => c.id === cardId);
  }

  getCardsByIssuer(issuer: CardIssuer): SecuredCard[] {
    return SECURED_CARDS.filter((c) => c.issuer === issuer);
  }

  getCardsNoCreditCheckRequired(): SecuredCard[] {
    return SECURED_CARDS.filter((c) => c.noCreditCheckRequired);
  }

  getCardsWithRewards(): SecuredCard[] {
    return SECURED_CARDS.filter((c) => c.rewardsRate && c.rewardsRate > 0);
  }

  getGraduationEligibleCards(): SecuredCard[] {
    return SECURED_CARDS.filter((c) => c.graduationEligible);
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

let securedCardServiceInstance: SecuredCardRecommendationService | null = null;

export function getSecuredCardRecommendationService(): SecuredCardRecommendationService {
  if (!securedCardServiceInstance) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    securedCardServiceInstance = new SecuredCardRecommendationService(
      supabaseUrl,
      supabaseKey
    );
  }
  return securedCardServiceInstance;
}
