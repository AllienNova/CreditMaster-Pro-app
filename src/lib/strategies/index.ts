/**
 * Strategy Registry
 * 
 * Central registry for all 28 advanced credit repair strategies
 * imported from the original AgenticCreditRepair-app build.
 * 
 * These strategies are used by the Student Loan AI Engine for
 * intelligent strategy selection and recommendation.
 */

import { Strategy } from '@/types/student-loan';

// All 28 Advanced Credit Repair Strategies
export const ADVANCED_STRATEGIES: Strategy[] = [
  // Tier 1: High-Impact Strategies (80%+ Success Rate)
  {
    id: 'mov_request',
    name: 'Method of Verification (MOV) Requests',
    strategy_type: 'verification_challenge',
    legal_basis: 'FCRA Section 611(a)(7)',
    success_rate: 0.85,
    tier: 1,
    target_items: ['account', 'collection', 'public_record'],
    key_tactics: ['Challenge verification methods', 'Demand detailed documentation', 'Expose inadequate responses'],
    prerequisites: ['Previous verified dispute'],
    is_active: true,
    created_at: new Date().toISOString()
  },
  {
    id: 'identity_theft_affidavit',
    name: 'Identity Theft Affidavit Strategy',
    strategy_type: 'identity_theft_block',
    legal_basis: 'FCRA Section 605B - Identity theft blocks',
    success_rate: 0.85,
    tier: 1,
    target_items: ['account', 'inquiry', 'collection'],
    key_tactics: ['Geographic inconsistency analysis', 'FTC affidavit filing', 'Pattern detection'],
    prerequisites: ['Identity theft indicators'],
    is_active: true,
    created_at: new Date().toISOString()
  },
  {
    id: 'bankruptcy_removal',
    name: 'Bankruptcy Removal (Court Verification Method)',
    strategy_type: 'court_verification',
    legal_basis: 'FCRA Section 623(a)(1) - False furnisher identification',
    success_rate: 0.85,
    tier: 1,
    target_items: ['public_record'],
    key_tactics: ['Court verification letters', 'Prove courts don\'t report', 'Violation documentation'],
    prerequisites: ['Bankruptcy with court as furnisher'],
    is_active: true,
    created_at: new Date().toISOString()
  },
  {
    id: 'statute_limitations',
    name: 'Statute of Limitations Challenges',
    strategy_type: 'legal_challenge',
    legal_basis: 'State statute of limitations laws',
    success_rate: 0.8,
    tier: 1,
    target_items: ['collection', 'account'],
    key_tactics: ['Time-barred debt identification', 'State-specific calculations', 'Legal challenges'],
    prerequisites: ['Debt beyond statute period'],
    is_active: true,
    created_at: new Date().toISOString()
  },

  // Tier 2: Core Professional Strategies (65-75% Success Rate)
  {
    id: 'debt_validation',
    name: 'Debt Validation Letters',
    strategy_type: 'validation_request',
    legal_basis: 'FDCPA Section 809(b)',
    success_rate: 0.75,
    tier: 2,
    target_items: ['collection'],
    key_tactics: ['Force documentation proof', 'Third-party collector targeting', 'Validation tracking'],
    prerequisites: ['Third-party collection account'],
    is_active: true,
    created_at: new Date().toISOString()
  },
  {
    id: 'round_based_escalation',
    name: 'Round-Based Escalation System',
    strategy_type: 'systematic_escalation',
    legal_basis: 'Strategic escalation through multiple FCRA tactics',
    success_rate: 0.75,
    tier: 2,
    target_items: ['account', 'collection', 'inquiry', 'public_record'],
    key_tactics: ['5-round system', 'Increasing sophistication', 'Outcome-based selection'],
    prerequisites: [],
    is_active: true,
    created_at: new Date().toISOString()
  },
  {
    id: 'factual_dispute',
    name: 'Factual Dispute Methodology',
    strategy_type: 'accuracy_challenge',
    legal_basis: 'FCRA Section 611 - Right to dispute inaccurate information',
    success_rate: 0.7,
    tier: 2,
    target_items: ['account', 'collection', 'inquiry', 'public_record'],
    key_tactics: ['Accuracy analysis', 'Completeness verification', 'Systematic documentation'],
    prerequisites: [],
    is_active: true,
    created_at: new Date().toISOString()
  },
  {
    id: 'estoppel_by_silence',
    name: 'Estoppel by Silence',
    strategy_type: 'legal_leverage',
    legal_basis: 'FCRA Section 611(a)(1)(A) + Legal doctrine of estoppel',
    success_rate: 0.7,
    tier: 2,
    target_items: ['account', 'collection', 'inquiry', 'public_record'],
    key_tactics: ['Monitor response deadlines', 'Create legal leverage', 'Escalate non-compliance'],
    prerequisites: [],
    is_active: true,
    created_at: new Date().toISOString()
  },
  {
    id: 'pay_for_delete',
    name: 'Pay-for-Delete Agreements',
    strategy_type: 'negotiated_settlement',
    legal_basis: 'Contractual negotiation (legally permissible)',
    success_rate: 0.7,
    tier: 2,
    target_items: ['collection', 'account'],
    key_tactics: ['Cost-benefit analysis', 'Negotiation strategy', 'Written agreements'],
    prerequisites: [],
    is_active: true,
    created_at: new Date().toISOString()
  },
  {
    id: 'goodwill_letters',
    name: 'Goodwill Adjustment Letters',
    strategy_type: 'goodwill_request',
    legal_basis: 'Voluntary creditor cooperation',
    success_rate: 0.65,
    tier: 2,
    target_items: ['account'],
    key_tactics: ['Positive payment history emphasis', 'Hardship explanation', 'Relationship leverage'],
    prerequisites: [],
    is_active: true,
    created_at: new Date().toISOString()
  },

  // Tier 3: Specialized Strategies (50-65% Success Rate)
  {
    id: 'furnisher_direct_disputes',
    name: 'Furnisher Direct Disputes (FCRA Section 623)',
    strategy_type: 'direct_furnisher',
    legal_basis: 'FCRA Section 623(b) - Duties of furnishers',
    success_rate: 0.6,
    tier: 3,
    target_items: ['account', 'collection'],
    key_tactics: ['Bypass bureaus', 'Direct accountability', 'Section 623 violations'],
    prerequisites: [],
    is_active: true,
    created_at: new Date().toISOString()
  },
  {
    id: 'cfpb_complaints',
    name: 'CFPB Complaint Strategy',
    strategy_type: 'regulatory_complaint',
    legal_basis: 'Consumer Financial Protection Bureau oversight',
    success_rate: 0.6,
    tier: 3,
    target_items: ['account', 'collection', 'inquiry'],
    key_tactics: ['Regulatory pressure', 'Public record creation', 'Compliance enforcement'],
    prerequisites: [],
    is_active: true,
    created_at: new Date().toISOString()
  },
  {
    id: 'credit_mix_optimization',
    name: 'Credit Mix Optimization',
    strategy_type: 'score_optimization',
    legal_basis: 'FICO scoring methodology',
    success_rate: 0.6,
    tier: 3,
    target_items: ['account'],
    key_tactics: ['Diversification strategy', 'Account type analysis', 'Strategic additions'],
    prerequisites: [],
    is_active: true,
    created_at: new Date().toISOString()
  },
  {
    id: 'inquiry_removal',
    name: 'Hard Inquiry Removal',
    strategy_type: 'inquiry_challenge',
    legal_basis: 'FCRA Section 604 - Permissible purposes',
    success_rate: 0.55,
    tier: 3,
    target_items: ['inquiry'],
    key_tactics: ['Unauthorized inquiry claims', 'Permissible purpose challenges', 'Documentation requests'],
    prerequisites: [],
    is_active: true,
    created_at: new Date().toISOString()
  },
  {
    id: 'account_age_preservation',
    name: 'Account Age Preservation',
    strategy_type: 'score_protection',
    legal_basis: 'FICO age of credit factor',
    success_rate: 0.55,
    tier: 3,
    target_items: ['account'],
    key_tactics: ['Authorized user additions', 'Account retention', 'Strategic closures'],
    prerequisites: [],
    is_active: true,
    created_at: new Date().toISOString()
  },
  {
    id: 'utilization_optimization',
    name: 'Credit Utilization Optimization',
    strategy_type: 'score_optimization',
    legal_basis: 'FICO utilization factor (30% of score)',
    success_rate: 0.55,
    tier: 3,
    target_items: ['account'],
    key_tactics: ['Balance distribution', 'Limit increase requests', 'Payment timing'],
    prerequisites: [],
    is_active: true,
    created_at: new Date().toISOString()
  },
  {
    id: 'rapid_rescore',
    name: 'Rapid Rescore Strategy',
    strategy_type: 'expedited_update',
    legal_basis: 'Lender-initiated bureau updates',
    success_rate: 0.5,
    tier: 3,
    target_items: ['account', 'collection'],
    key_tactics: ['Lender coordination', 'Expedited processing', 'Documentation preparation'],
    prerequisites: [],
    is_active: true,
    created_at: new Date().toISOString()
  },

  // Tier 4: Advanced/Aggressive Strategies (40-50% Success Rate)
  {
    id: 'metro2_compliance',
    name: 'Metro 2 Compliance Challenges',
    strategy_type: 'technical_challenge',
    legal_basis: 'Metro 2 reporting format requirements',
    success_rate: 0.5,
    tier: 4,
    target_items: ['account', 'collection'],
    key_tactics: ['Format violation identification', 'Technical compliance demands', 'Reporting accuracy'],
    prerequisites: [],
    is_active: true,
    created_at: new Date().toISOString()
  },
  {
    id: 'credit_freeze_strategy',
    name: 'Strategic Credit Freeze',
    strategy_type: 'protective_measure',
    legal_basis: 'FCRA Section 605A - Security freezes',
    success_rate: 0.5,
    tier: 4,
    target_items: ['inquiry'],
    key_tactics: ['Freeze implementation', 'Selective thawing', 'Identity protection'],
    prerequisites: [],
    is_active: true,
    created_at: new Date().toISOString()
  },
  {
    id: 'mixed_file_correction',
    name: 'Mixed File Correction',
    strategy_type: 'file_correction',
    legal_basis: 'FCRA Section 611 - Accuracy requirements',
    success_rate: 0.45,
    tier: 4,
    target_items: ['account', 'inquiry', 'public_record'],
    key_tactics: ['File separation', 'Identity verification', 'Systematic correction'],
    prerequisites: [],
    is_active: true,
    created_at: new Date().toISOString()
  },
  {
    id: 'authorized_user_strategy',
    name: 'Strategic Authorized User Additions',
    strategy_type: 'score_boost',
    legal_basis: 'FICO authorized user scoring',
    success_rate: 0.45,
    tier: 4,
    target_items: ['account'],
    key_tactics: ['Account selection', 'Timing optimization', 'Relationship leverage'],
    prerequisites: [],
    is_active: true,
    created_at: new Date().toISOString()
  },
  {
    id: 'settlement_negotiation',
    name: 'Debt Settlement Negotiation',
    strategy_type: 'financial_settlement',
    legal_basis: 'Contractual negotiation',
    success_rate: 0.45,
    tier: 4,
    target_items: ['collection', 'account'],
    key_tactics: ['Lump sum offers', 'Payment plan structuring', 'Deletion negotiation'],
    prerequisites: [],
    is_active: true,
    created_at: new Date().toISOString()
  },
  {
    id: 'credit_builder_loans',
    name: 'Credit Builder Loan Strategy',
    strategy_type: 'positive_addition',
    legal_basis: 'FICO payment history factor',
    success_rate: 0.4,
    tier: 4,
    target_items: ['account'],
    key_tactics: ['Secured loan products', 'Payment history building', 'Mix diversification'],
    prerequisites: [],
    is_active: true,
    created_at: new Date().toISOString()
  },
  {
    id: 'secured_card_strategy',
    name: 'Secured Credit Card Strategy',
    strategy_type: 'positive_addition',
    legal_basis: 'FICO payment history and utilization factors',
    success_rate: 0.4,
    tier: 4,
    target_items: ['account'],
    key_tactics: ['Low utilization maintenance', 'On-time payments', 'Graduation planning'],
    prerequisites: [],
    is_active: true,
    created_at: new Date().toISOString()
  },
  {
    id: 'charge_off_rehabilitation',
    name: 'Charge-Off Rehabilitation',
    strategy_type: 'account_rehabilitation',
    legal_basis: 'Creditor voluntary cooperation',
    success_rate: 0.4,
    tier: 4,
    target_items: ['account'],
    key_tactics: ['Payment resumption', 'Status update negotiation', 'Relationship rebuilding'],
    prerequisites: [],
    is_active: true,
    created_at: new Date().toISOString()
  },
  {
    id: 'collection_validation_combo',
    name: 'Collection Validation + Dispute Combo',
    strategy_type: 'combined_approach',
    legal_basis: 'FDCPA Section 809(b) + FCRA Section 611',
    success_rate: 0.4,
    tier: 4,
    target_items: ['collection'],
    key_tactics: ['Dual-track approach', 'Documentation demands', 'Timing coordination'],
    prerequisites: [],
    is_active: true,
    created_at: new Date().toISOString()
  },
  {
    id: 'student_loan_rehabilitation',
    name: 'Student Loan Rehabilitation',
    strategy_type: 'loan_rehabilitation',
    legal_basis: 'Higher Education Act - Loan rehabilitation provisions',
    success_rate: 0.4,
    tier: 4,
    target_items: ['account'],
    key_tactics: ['9-month payment plan', 'Default removal', 'Credit restoration'],
    prerequisites: [],
    is_active: true,
    created_at: new Date().toISOString()
  },
  {
    id: 'bankruptcy_reaffirmation',
    name: 'Post-Bankruptcy Reaffirmation Strategy',
    strategy_type: 'post_bankruptcy',
    legal_basis: 'Bankruptcy Code Section 524(c)',
    success_rate: 0.4,
    tier: 4,
    target_items: ['account'],
    key_tactics: ['Selective reaffirmation', 'Credit rebuilding', 'Strategic account retention'],
    prerequisites: [],
    is_active: true,
    created_at: new Date().toISOString()
  }
];

/**
 * Get strategies by tier
 */
export function getStrategiesByTier(tier: number): Strategy[] {
  return ADVANCED_STRATEGIES.filter(s => s.tier === tier && s.is_active);
}

/**
 * Get strategies by type
 */
export function getStrategiesByType(type: string): Strategy[] {
  return ADVANCED_STRATEGIES.filter(s => s.strategy_type === type && s.is_active);
}

/**
 * Get strategy by ID
 */
export function getStrategyById(id: string): Strategy | undefined {
  return ADVANCED_STRATEGIES.find(s => s.id === id);
}

/**
 * Get high-impact strategies (Tier 1)
 */
export function getHighImpactStrategies(): Strategy[] {
  return getStrategiesByTier(1);
}

/**
 * Get all active strategies
 */
export function getAllActiveStrategies(): Strategy[] {
  return ADVANCED_STRATEGIES.filter(s => s.is_active);
}

/**
 * Get strategies by success rate threshold
 */
export function getStrategiesBySuccessRate(minRate: number): Strategy[] {
  return ADVANCED_STRATEGIES.filter(s => s.success_rate >= minRate && s.is_active);
}

