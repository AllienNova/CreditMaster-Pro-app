// ============================================================================
// BILL NEGOTIATION TYPES
// ============================================================================

import type { BillCategory } from './bill.types';

export type NegotiationStatus =
  | 'not_started'
  | 'researching'
  | 'in_progress'
  | 'awaiting_response'
  | 'completed'
  | 'declined'
  | 'cancelled';

export type NegotiationType =
  | 'rate_reduction'
  | 'fee_waiver'
  | 'plan_change'
  | 'cancellation'
  | 'price_match'
  | 'loyalty_discount'
  | 'bundle_discount';

export type NegotiationOutcome =
  | 'success'
  | 'partial_success'
  | 'rejected'
  | 'pending'
  | 'no_response';

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
  method: 'phone' | 'email' | 'chat' | 'in_person';
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
  marketPosition: 'below_average' | 'average' | 'above_average';
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
  type: 'tip' | 'warning' | 'opportunity' | 'success_story';
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
  method: 'phone' | 'email' | 'chat' | 'in_person';
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

