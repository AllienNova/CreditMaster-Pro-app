import { CreditItem, Strategy, StrategyRecommendation, User } from '@/types';

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
    success_rate: 0.80,
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
    success_rate: 0.70,
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
    success_rate: 0.70,
    tier: 2,
    target_items: ['account', 'collection', 'inquiry', 'public_record'],
    key_tactics: ['Monitor response deadlines', 'Create legal leverage', 'Escalate non-compliance'],
    prerequisites: ['Overdue bureau response'],
    is_active: true,
    created_at: new Date().toISOString()
  },
  {
    id: 'pay_for_delete',
    name: 'Pay-for-Delete Agreements',
    strategy_type: 'negotiated_settlement',
    legal_basis: 'Contractual negotiation (legally permissible)',
    success_rate: 0.70,
    tier: 2,
    target_items: ['collection', 'account'],
    key_tactics: ['Cost-benefit analysis', 'Negotiation strategy', 'Written agreements'],
    prerequisites: ['Negotiable debt'],
    is_active: true,
    created_at: new Date().toISOString()
  },

  // Tier 3: Specialized Advanced Strategies (60-65% Success Rate)
  {
    id: 'student_loan_strategy',
    name: 'Student Loan Strategy (Corey Gray Method)',
    strategy_type: 'specialized_dispute',
    legal_basis: 'FCRA Section 611 (treat student loans as regular tradelines)',
    success_rate: 0.65,
    tier: 3,
    target_items: ['account'],
    key_tactics: ['Myth-busting education', 'Standard dispute tactics', 'Specialized approach'],
    prerequisites: ['Student loan accounts'],
    is_active: true,
    created_at: new Date().toISOString()
  },
  {
    id: 'section_609_requests',
    name: 'FCRA Section 609 Information Requests',
    strategy_type: 'information_request',
    legal_basis: 'FCRA Section 609 - Disclosures to consumers',
    success_rate: 0.65,
    tier: 3,
    target_items: ['account', 'collection', 'inquiry'],
    key_tactics: ['Documentation gap analysis', 'Information requests', 'Verification exposure'],
    prerequisites: ['Potential documentation gaps'],
    is_active: true,
    created_at: new Date().toISOString()
  },
  {
    id: 'mixed_file_disputes',
    name: 'Mixed File Disputes',
    strategy_type: 'identity_confusion',
    legal_basis: 'FCRA Section 611 - Accuracy requirements',
    success_rate: 0.65,
    tier: 3,
    target_items: ['account', 'collection', 'inquiry'],
    key_tactics: ['Identity confusion resolution', 'File separation', 'Cross-reference analysis'],
    prerequisites: ['Similar names/SSNs detected'],
    is_active: true,
    created_at: new Date().toISOString()
  },
  {
    id: 'furnisher_direct_disputes',
    name: 'Furnisher Direct Disputes (FCRA Section 623)',
    strategy_type: 'direct_furnisher',
    legal_basis: 'FCRA Section 623(b) - Duties of furnishers',
    success_rate: 0.60,
    tier: 3,
    target_items: ['account', 'collection'],
    key_tactics: ['Bypass bureaus', 'Direct accountability', 'Section 623 violations'],
    prerequisites: ['Contactable furnisher'],
    is_active: true,
    created_at: new Date().toISOString()
  },
  {
    id: 'procedural_disputes',
    name: 'Procedural Dispute Challenges',
    strategy_type: 'procedure_challenge',
    legal_basis: 'FCRA procedural requirements and violations',
    success_rate: 0.60,
    tier: 3,
    target_items: ['account', 'collection', 'inquiry'],
    key_tactics: ['Challenge investigation methods', 'FCRA violation identification', 'Procedure analysis'],
    prerequisites: ['Inadequate investigation'],
    is_active: true,
    created_at: new Date().toISOString()
  },
  {
    id: 'section_623_dispute',
    name: 'FCRA Section 623 Dispute Method',
    strategy_type: 'furnisher_investigation',
    legal_basis: 'FCRA Section 623(b) - Furnisher investigation duties',
    success_rate: 0.60,
    tier: 3,
    target_items: ['account', 'collection'],
    key_tactics: ['Request investigation vs verification', 'Furnisher duties', 'Documentation requirements'],
    prerequisites: ['Failed factual disputes'],
    is_active: true,
    created_at: new Date().toISOString()
  },

  // Tier 4: Relationship-Based Strategies (45-55% Success Rate)
  {
    id: 'creditor_intervention',
    name: 'Creditor Intervention Letters',
    strategy_type: 'relationship_leverage',
    legal_basis: 'Direct creditor relationship and goodwill',
    success_rate: 0.55,
    tier: 4,
    target_items: ['account'],
    key_tactics: ['Executive office intervention', 'Retention leverage', 'Relationship analysis'],
    prerequisites: ['Active customer relationship'],
    is_active: true,
    created_at: new Date().toISOString()
  },
  {
    id: 'goodwill_saturation',
    name: 'Goodwill Letters & Goodwill Saturation',
    strategy_type: 'goodwill_campaign',
    legal_basis: 'Voluntary creditor cooperation',
    success_rate: 0.45,
    tier: 4,
    target_items: ['account'],
    key_tactics: ['Multi-department targeting', 'Staggered campaigns', 'Hardship emphasis'],
    prerequisites: ['Paid account with isolated incidents'],
    is_active: true,
    created_at: new Date().toISOString()
  },

  // Tier 5: Emerging Advanced Strategies (50-70% Success Rate)
  {
    id: 'credit_profile_optimization',
    name: 'Credit Profile Optimization',
    strategy_type: 'profile_enhancement',
    legal_basis: 'FCRA accuracy and completeness requirements',
    success_rate: 0.60,
    tier: 5,
    target_items: ['account'],
    key_tactics: ['Positive history reporting', 'Account updates', 'Profile completeness'],
    prerequisites: ['Incomplete positive information'],
    is_active: true,
    created_at: new Date().toISOString()
  },
  {
    id: 'inquiry_suppression',
    name: 'Inquiry Suppression Tactics',
    strategy_type: 'inquiry_challenge',
    legal_basis: 'FCRA Section 604 - Permissible purposes',
    success_rate: 0.55,
    tier: 5,
    target_items: ['inquiry'],
    key_tactics: ['Authorization challenges', 'Permissible purpose disputes', 'Unauthorized removal'],
    prerequisites: ['Questionable inquiries'],
    is_active: true,
    created_at: new Date().toISOString()
  },
  {
    id: 'rapid_rescore',
    name: 'Rapid Rescore Preparation',
    strategy_type: 'expedited_processing',
    legal_basis: 'Industry practice for mortgage applications',
    success_rate: 0.70,
    tier: 5,
    target_items: ['account', 'collection', 'inquiry'],
    key_tactics: ['Lender coordination', 'Expedited disputes', 'Timeline optimization'],
    prerequisites: ['Loan application pending'],
    is_active: true,
    created_at: new Date().toISOString()
  },

  // Tier 6: Specialized Legal Strategies (Variable Success Rate)
  {
    id: 'cfpb_complaint',
    name: 'CFPB Complaint Escalation',
    strategy_type: 'regulatory_escalation',
    legal_basis: 'CFPB supervisory authority',
    success_rate: 0.50,
    tier: 6,
    target_items: ['account', 'collection', 'inquiry'],
    key_tactics: ['Federal regulatory pressure', 'Oversight escalation', 'Compliance enforcement'],
    prerequisites: ['Unresolved major creditor disputes'],
    is_active: true,
    created_at: new Date().toISOString()
  },
  {
    id: 'state_ag_complaint',
    name: 'State Attorney General Complaints',
    strategy_type: 'state_regulatory',
    legal_basis: 'State consumer protection laws',
    success_rate: 0.45,
    tier: 6,
    target_items: ['account', 'collection'],
    key_tactics: ['State enforcement', 'Regulatory investigation', 'Consumer protection'],
    prerequisites: ['State-licensed creditors'],
    is_active: true,
    created_at: new Date().toISOString()
  },
  {
    id: 'cease_and_desist',
    name: 'Cease and Desist Letters',
    strategy_type: 'communication_control',
    legal_basis: 'FDCPA Section 805(c) - Communication cessation',
    success_rate: 0.40,
    tier: 6,
    target_items: ['collection'],
    key_tactics: ['Stop communications', 'Harassment prevention', 'Legal protection'],
    prerequisites: ['Harassing collectors'],
    is_active: true,
    created_at: new Date().toISOString()
  },
  {
    id: 'validation_stacking',
    name: 'Validation Stacking',
    strategy_type: 'layered_validation',
    legal_basis: 'FDCPA Section 809(b) + FCRA Section 623',
    success_rate: 0.55,
    tier: 6,
    target_items: ['collection'],
    key_tactics: ['Multiple validation requests', 'Legal challenge layering', 'Violation documentation'],
    prerequisites: ['Multiple collection violations'],
    is_active: true,
    created_at: new Date().toISOString()
  },

  // Advanced Implementation Strategies
  {
    id: 'cross_bureau_discrepancy',
    name: 'Cross-Bureau Discrepancy Analysis',
    strategy_type: 'discrepancy_analysis',
    legal_basis: 'FCRA accuracy requirements',
    success_rate: 0.65,
    tier: 7,
    target_items: ['account', 'collection', 'inquiry'],
    key_tactics: ['Discrepancy identification', 'Accuracy challenges', 'Cross-reference disputes'],
    prerequisites: ['Different reporting across bureaus'],
    is_active: true,
    created_at: new Date().toISOString()
  },
  {
    id: 'furnisher_liability',
    name: 'Furnisher Liability Challenges',
    strategy_type: 'liability_challenge',
    legal_basis: 'FCRA Section 623(a) - Accuracy requirements',
    success_rate: 0.50,
    tier: 7,
    target_items: ['account', 'collection'],
    key_tactics: ['Pattern documentation', 'Systematic error identification', 'Liability establishment'],
    prerequisites: ['Systematic furnisher errors'],
    is_active: true,
    created_at: new Date().toISOString()
  },
  {
    id: 'obsolete_information',
    name: 'Obsolete Information Challenges',
    strategy_type: 'time_based_removal',
    legal_basis: 'FCRA Section 605 - Obsolete information',
    success_rate: 0.80,
    tier: 7,
    target_items: ['account', 'collection', 'inquiry', 'public_record'],
    key_tactics: ['Date calculations', 'Automatic removal', 'Timeline enforcement'],
    prerequisites: ['Items beyond 7-year period'],
    is_active: true,
    created_at: new Date().toISOString()
  },
  {
    id: 'duplicate_consolidation',
    name: 'Duplicate Account Consolidation',
    strategy_type: 'duplicate_removal',
    legal_basis: 'FCRA accuracy requirements',
    success_rate: 0.75,
    tier: 7,
    target_items: ['account', 'collection'],
    key_tactics: ['Duplicate identification', 'Consolidation requests', 'Multiple reporting removal'],
    prerequisites: ['Same debt reported multiple times'],
    is_active: true,
    created_at: new Date().toISOString()
  }
];

// Strategy Selection Engine
export class StrategySelectionEngine {
  static async selectOptimalStrategies(
    creditItem: CreditItem,
    user: User,
    previousAttempts: string[] = []
  ): Promise<StrategyRecommendation[]> {
    const recommendations: StrategyRecommendation[] = [];
    
    // Filter applicable strategies
    const applicableStrategies = ADVANCED_STRATEGIES.filter(strategy => {
      // Check if strategy targets this item type
      if (!strategy.target_items.includes(creditItem.item_type)) {
        return false;
      }
      
      // Check if strategy was already attempted
      if (previousAttempts.includes(strategy.id)) {
        return false;
      }
      
      // Check prerequisites
      return this.checkPrerequisites(strategy, creditItem, user);
    });
    
    // Score and rank strategies
    for (const strategy of applicableStrategies) {
      const recommendation = await this.scoreStrategy(strategy, creditItem, user);
      recommendations.push(recommendation);
    }
    
    // Sort by success probability and impact
    return recommendations.sort((a, b) => 
      (b.successProbability * b.impactScore) - (a.successProbability * a.impactScore)
    );
  }
  
  private static checkPrerequisites(
    strategy: Strategy,
    creditItem: CreditItem,
    user: User
  ): boolean {
    if (!strategy.prerequisites || strategy.prerequisites.length === 0) {
      return true;
    }
    
    for (const prerequisite of strategy.prerequisites) {
      switch (prerequisite) {
        case 'Previous verified dispute':
          // Check if item has previous verified disputes
          return creditItem.dispute_history?.some(d => d.status === 'verified') || false;
          
        case 'Identity theft indicators':
          // Check for identity theft indicators
          return this.hasIdentityTheftIndicators(creditItem, user);
          
        case 'Bankruptcy with court as furnisher':
          return creditItem.item_type === 'public_record' && 
                 creditItem.furnisher?.toLowerCase().includes('court');
          
        case 'Debt beyond statute period':
          return this.isDebtBeyondStatute(creditItem, user);
          
        case 'Third-party collection account':
          return creditItem.item_type === 'collection' && 
                 this.isThirdPartyCollector(creditItem.creditor);
          
        case 'Overdue bureau response':
          return this.hasPendingOverdueResponse(creditItem);
          
        default:
          return true;
      }
    }
    
    return true;
  }
  
  private static async scoreStrategy(
    strategy: Strategy,
    creditItem: CreditItem,
    user: User
  ): Promise<StrategyRecommendation> {
    // Base success probability from strategy
    let successProbability = strategy.success_rate;
    
    // Adjust based on item characteristics
    successProbability *= this.getItemComplexityMultiplier(creditItem);
    
    // Adjust based on user profile
    successProbability *= this.getUserProfileMultiplier(user);
    
    // Calculate impact score
    const impactScore = this.calculateImpactScore(creditItem, strategy);
    
    // Generate reasoning
    const reasoning = this.generateReasoning(strategy, creditItem, successProbability);
    
    return {
      strategyId: strategy.id,
      itemId: creditItem.id,
      successProbability: Math.min(successProbability, 0.95), // Cap at 95%
      impactScore,
      reasoning,
      expectedTimeline: this.estimateTimeline(strategy, creditItem),
      legalBasis: strategy.legal_basis,
      prerequisites: strategy.prerequisites || [],
      contraindications: this.identifyContraindications(strategy, creditItem)
    };
  }
  
  private static getItemComplexityMultiplier(creditItem: CreditItem): number {
    let multiplier = 1.0;
    
    // Age of item (older items are harder to dispute)
    const itemAge = this.calculateItemAge(creditItem);
    if (itemAge > 5) multiplier *= 0.9;
    if (itemAge > 10) multiplier *= 0.8;
    
    // Balance amount (higher balances are more scrutinized)
    if (creditItem.balance && creditItem.balance > 10000) multiplier *= 0.9;
    if (creditItem.balance && creditItem.balance > 50000) multiplier *= 0.8;
    
    // Payment status
    if (creditItem.payment_status === 'charge_off') multiplier *= 0.8;
    if (creditItem.payment_status === 'collection') multiplier *= 0.7;
    
    return multiplier;
  }
  
  private static getUserProfileMultiplier(user: User): number {
    let multiplier = 1.0;
    
    // Subscription tier affects available strategies
    if (user.subscription_tier === 'premium') multiplier *= 1.1;
    if (user.subscription_tier === 'enterprise') multiplier *= 1.2;
    
    return multiplier;
  }
  
  private static calculateImpactScore(creditItem: CreditItem, strategy: Strategy): number {
    let impact = 0.5; // Base impact
    
    // Higher tier strategies have higher impact
    impact += (6 - strategy.tier) * 0.1;
    
    // Item type impact
    if (creditItem.item_type === 'public_record') impact += 0.3;
    if (creditItem.item_type === 'collection') impact += 0.2;
    if (creditItem.item_type === 'account') impact += 0.1;
    
    // Balance impact
    if (creditItem.balance && creditItem.balance > 1000) impact += 0.1;
    if (creditItem.balance && creditItem.balance > 10000) impact += 0.2;
    
    return Math.min(impact, 1.0);
  }
  
  private static generateReasoning(
    strategy: Strategy,
    creditItem: CreditItem,
    successProbability: number
  ): string[] {
    const reasoning: string[] = [];
    
    reasoning.push(`${strategy.name} has a ${(strategy.success_rate * 100).toFixed(0)}% base success rate`);
    reasoning.push(`Legal basis: ${strategy.legal_basis}`);
    
    if (successProbability > strategy.success_rate) {
      reasoning.push('Success probability increased due to favorable item characteristics');
    } else if (successProbability < strategy.success_rate) {
      reasoning.push('Success probability adjusted for item complexity');
    }
    
    reasoning.push(`Primary tactics: ${strategy.key_tactics.slice(0, 2).join(', ')}`);
    
    return reasoning;
  }
  
  private static estimateTimeline(strategy: Strategy, creditItem: CreditItem): string {
    // Base timeline by tier
    const baseTimelines = {
      1: '30-45 days',
      2: '45-60 days',
      3: '60-90 days',
      4: '90-120 days',
      5: '60-90 days',
      6: '120-180 days',
      7: '30-60 days'
    };
    
    return baseTimelines[strategy.tier as keyof typeof baseTimelines] || '60-90 days';
  }
  
  private static identifyContraindications(strategy: Strategy, creditItem: CreditItem): string[] {
    const contraindications: string[] = [];
    
    // Recent disputes
    const recentDisputes = creditItem.dispute_history?.filter(d => {
      const disputeDate = new Date(d.dispute_date);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return disputeDate > thirtyDaysAgo;
    }) || [];
    
    if (recentDisputes.length >= 2) {
      contraindications.push('Multiple recent disputes may be flagged as frivolous');
    }
    
    // Strategy-specific contraindications
    if (strategy.id === 'identity_theft_affidavit' && !this.hasIdentityTheftIndicators(creditItem, {} as User)) {
      contraindications.push('Insufficient evidence for identity theft claim');
    }
    
    return contraindications;
  }
  
  // Helper methods
  private static hasIdentityTheftIndicators(creditItem: CreditItem, user: User): boolean {
    // Simplified check - in real implementation, this would be more sophisticated
    return false; // Placeholder
  }
  
  private static isDebtBeyondStatute(creditItem: CreditItem, user: User): boolean {
    // Simplified check - would need state-specific statute calculations
    const itemAge = this.calculateItemAge(creditItem);
    return itemAge > 7; // Simplified 7-year rule
  }
  
  private static isThirdPartyCollector(creditor: string): boolean {
    // List of known third-party collectors
    const thirdPartyCollectors = [
      'portfolio recovery', 'midland funding', 'cavalry portfolio',
      'lvnv funding', 'asset acceptance', 'jefferson capital'
    ];
    
    return thirdPartyCollectors.some(collector => 
      creditor.toLowerCase().includes(collector)
    );
  }
  
  private static hasPendingOverdueResponse(creditItem: CreditItem): boolean {
    const pendingDisputes = creditItem.dispute_history?.filter(d => 
      d.status === 'pending' || d.status === 'investigating'
    ) || [];
    
    return pendingDisputes.some(dispute => {
      const disputeDate = new Date(dispute.dispute_date);
      const thirtyDaysLater = new Date(disputeDate);
      thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);
      return new Date() > thirtyDaysLater;
    });
  }
  
  private static calculateItemAge(creditItem: CreditItem): number {
    const firstReported = new Date(creditItem.first_reported_date);
    const now = new Date();
    return (now.getTime() - firstReported.getTime()) / (1000 * 60 * 60 * 24 * 365);
  }
}

// Export strategy by ID for easy lookup
export const getStrategyById = (id: string): Strategy | undefined => {
  return ADVANCED_STRATEGIES.find(strategy => strategy.id === id);
};

// Export strategies by tier
export const getStrategiesByTier = (tier: number): Strategy[] => {
  return ADVANCED_STRATEGIES.filter(strategy => strategy.tier === tier);
};

// Export strategies by target item type
export const getStrategiesByItemType = (itemType: string): Strategy[] => {
  return ADVANCED_STRATEGIES.filter(strategy => 
    strategy.target_items.includes(itemType)
  );
};

