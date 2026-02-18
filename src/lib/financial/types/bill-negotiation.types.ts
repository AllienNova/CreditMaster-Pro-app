// ============================================================================
// BILL NEGOTIATION TYPES
// ============================================================================

import type { BillCategory } from "./bill.types";

export type NegotiationStatus =
  | "not_started"
  | "researching"
  | "in_progress"
  | "awaiting_response"
  | "completed"
  | "declined"
  | "cancelled";

export type NegotiationType =
  | "rate_reduction"
  | "fee_waiver"
  | "plan_change"
  | "cancellation"
  | "price_match"
  | "loyalty_discount"
  | "bundle_discount";

export type NegotiationOutcome =
  | "success"
  | "partial_success"
  | "rejected"
  | "pending"
  | "no_response";

export interface BillNegotiation {
  id: string;
  userId: string;
  billId: string;
  merchantName: string;
  category: BillCategory;
  currentAmount: number;
  targetAmount: number;
  negotiationType: NegotiationType;
  status: NegotiationStatus;
  outcome?: NegotiationOutcome;
  actualSavings?: number;
  scripts?: NegotiationScripts;
  talkingPoints?: string[];
  comparisonData?: BillComparisonData;
  notes?: string;
  contactInfo?: MerchantContactInfo;
  attemptHistory: NegotiationAttempt[];
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

export interface NegotiationScripts {
  phoneScript: string;
  emailScript: string;
  chatScript: string;
  retentionScript: string;
}

export interface NegotiationAttempt {
  id: string;
  date: Date;
  method: "phone" | "email" | "chat" | "in_person";
  contactName?: string;
  outcome: NegotiationOutcome;
  offeredAmount?: number;
  notes?: string;
  followUpDate?: Date;
}

export interface BillComparisonData {
  averageMarketRate: number;
  lowestCompetitorRate: number;
  competitors: CompetitorRate[];
  savingsPotential: number;
  marketPosition: "below_average" | "average" | "above_average";
}

export interface CompetitorRate {
  provider: string;
  rate: number;
  features: string[];
  promotionalRate?: number;
  promotionalPeriod?: string;
}

export interface MerchantContactInfo {
  phone?: string;
  email?: string;
  chatUrl?: string;
  retentionDepartment?: string;
  bestTimeToCall?: string;
  tips?: string[];
}

export interface NegotiationInsight {
  type: "tip" | "warning" | "opportunity" | "success_story";
  title: string;
  description: string;
  category?: BillCategory;
  potentialSavings?: number;
}

export interface NegotiationSummary {
  totalNegotiations: number;
  activeNegotiations: number;
  completedNegotiations: number;
  successRate: number;
  totalSavings: number;
  monthlySavings: number;
  annualSavings: number;
  topOpportunities: NegotiationOpportunity[];
  recentSuccesses: BillNegotiation[];
}

export interface NegotiationOpportunity {
  billId: string;
  merchantName: string;
  category: BillCategory;
  currentAmount: number;
  potentialSavings: number;
  confidence: number;
  reason: string;
  suggestedApproach: NegotiationType;
}

export interface NegotiationCreateInput {
  billId: string;
  negotiationType: NegotiationType;
  targetAmount?: number;
  notes?: string;
  generateScripts?: boolean;
}

export interface NegotiationUpdateInput {
  status?: NegotiationStatus;
  outcome?: NegotiationOutcome;
  actualSavings?: number;
  notes?: string;
  targetAmount?: number;
}

export interface NegotiationAttemptInput {
  method: "phone" | "email" | "chat" | "in_person";
  contactName?: string;
  outcome: NegotiationOutcome;
  offeredAmount?: number;
  notes?: string;
  followUpDate?: Date;
}

// Market data for bill comparisons
export interface MarketRateData {
  category: BillCategory;
  service: string;
  averageRate: number;
  minRate: number;
  maxRate: number;
  providers: CompetitorRate[];
  lastUpdated: Date;
}

// ============================================================================
// ADDITIONAL TYPES FOR PHASE 2.4
// ============================================================================

export type BillType =
  | "telecom"
  | "utilities"
  | "insurance"
  | "subscription"
  | "internet"
  | "cable"
  | "mobile"
  | "electricity"
  | "gas"
  | "water"
  | "home_insurance"
  | "auto_insurance"
  | "streaming";

export type NegotiationDifficulty = "easy" | "moderate" | "difficult";

export interface NegotiableBill {
  id: string;
  userId: string;
  billType: BillType;
  provider: string;
  serviceName: string;
  currentAmount: number;
  billingFrequency: "monthly" | "quarterly" | "annually";
  contractEndDate?: Date;
  isUnderContract: boolean;

  // Negotiation potential
  negotiationPotential: number; // 0-100 score
  estimatedSavings: number;
  difficulty: NegotiationDifficulty;

  // Bill details
  accountNumber?: string;
  serviceAddress?: string;
  planDetails?: string;

  // Negotiation tracking
  status: NegotiationStatus;
  lastNegotiationDate?: Date;
  negotiationCount: number;
  totalSavingsAchieved: number;

  // Metadata
  detectedAt: Date;
  lastUpdated: Date;
}

export interface MarketAnalysis {
  billType: BillType;
  provider: string;
  location?: string;

  // Current market data
  averageMarketRate: number;
  competitorRates: CompetitorRate[];
  userCurrentRate: number;

  // Analysis
  savingsPotential: number;
  savingsPercentage: number;
  marketPosition:
    | "below_average"
    | "average"
    | "above_average"
    | "significantly_above";

  // Leverage points
  leveragePoints: LeveragePoint[];
  competitiveAdvantages: string[];

  // Recommendations
  recommendedAction: "negotiate" | "switch" | "stay" | "research_more";
  confidenceScore: number; // 0-100

  // Metadata
  dataSource: string;
  lastUpdated: Date;
  expiresAt: Date;
}

export interface LeveragePoint {
  type:
    | "loyalty"
    | "competitor_pricing"
    | "market_rate"
    | "contract_end"
    | "payment_history"
    | "bundle_opportunity";
  description: string;
  strength: "weak" | "moderate" | "strong";
  talkingPoint: string;
}

export interface NegotiationScript {
  billId: string;
  provider: string;
  billType: BillType;

  // Script structure
  opening: string;
  mainPoints: NegotiationPoint[];
  counterarguments: Counterargument[];
  fallbackOptions: FallbackOption[];
  closing: string;

  // Strategy
  strategy: "aggressive" | "balanced" | "conservative";
  targetSavings: number;
  minimumAcceptableSavings: number;

  // User profile factors
  userTenure?: number; // months
  paymentHistory: "excellent" | "good" | "fair" | "poor";
  loyaltyScore: number; // 0-100

  // AI metadata
  aiModel: string;
  confidence: number; // 0-100
  generatedAt: Date;
  expiresAt: Date;
}

export interface NegotiationPoint {
  id: string;
  order: number;
  point: string;
  supportingData?: string;
  expectedResponse?: string;
  priority: "high" | "medium" | "low";
}

export interface Counterargument {
  objection: string;
  response: string;
  alternativeApproach?: string;
}

export interface FallbackOption {
  option: string;
  description: string;
  estimatedSavings: number;
  likelihood: "high" | "medium" | "low";
}

export interface NegotiationHistory {
  billId: string;
  provider: string;
  billType: BillType;
  attempts: NegotiationAttempt[];
  totalSavings: number;
  successRate: number;
  lastAttemptDate: Date;
}

export interface SavingsEstimate {
  userId: string;
  totalPotentialSavings: number;
  monthlyPotentialSavings: number;
  annualPotentialSavings: number;
  billCount: number;
  highPotentialBills: NegotiableBill[];
  confidenceScore: number;
  generatedAt: Date;
}

export interface UserProfile {
  userId: string;
  tenure?: number; // months with provider
  paymentHistory: "excellent" | "good" | "fair" | "poor";
  loyaltyScore: number; // 0-100
  previousNegotiations: number;
  successRate: number;
}

export interface NegotiationOutcomeData {
  billId: string;
  userId: string;
  negotiationDate: Date;
  success: boolean;
  savingsAchieved: number;
  newMonthlyRate?: number;
  previousMonthlyRate: number;
  method: "phone" | "email" | "chat" | "in_person";
  duration?: number;
  representative?: string;
  notes?: string;
  requiresFollowup?: boolean;
  followupDate?: Date;
  followupReason?: string;
  recordedAt: Date;
}
