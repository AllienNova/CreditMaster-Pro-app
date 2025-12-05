/**
 * Advanced Dispute Resolution Strategies
 * 
 * Street-smart, legally compliant dispute resolution strategies
 * that go beyond basic letter writing.
 * 
 * @version 1.0.0
 */

// ============================================================================
// TYPES
// ============================================================================

export type RiskLevel = 'low' | 'medium' | 'high';
export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';
export type StrategyPhase = 'initial' | 'escalation' | 'regulatory' | 'legal';

export interface AdvancedStrategy {
  id: string;
  name: string;
  description: string;
  legalBasis: LegalBasis[];
  steps: StrategyStep[];
  timeline: StrategyTimeline;
  riskLevel: RiskLevel;
  difficulty: DifficultyLevel;
  expectedOutcomes: ExpectedOutcome[];
  whenToUse: string[];
  whenNotToUse: string[];
  integrationPoints: string[];
  aiPrompt: string;
  successRate: number;
}

export interface LegalBasis {
  law: string;
  section: string;
  description: string;
  citation: string;
}

export interface StrategyStep {
  order: number;
  title: string;
  description: string;
  duration: string;
  documents: string[];
  tips: string[];
}

export interface StrategyTimeline {
  minDays: number;
  maxDays: number;
  phases: TimelinePhase[];
}

export interface TimelinePhase {
  name: string;
  duration: string;
  description: string;
}

export interface ExpectedOutcome {
  outcome: string;
  probability: number;
  description: string;
}

export interface StrategyResult {
  strategyId: string;
  disputeId: string;
  startDate: Date;
  currentPhase: StrategyPhase;
  stepsCompleted: number[];
  outcome?: string;
  notes: string[];
}

// ============================================================================
// STRATEGY 1: ESCALATION TACTICS
// ============================================================================

export const ESCALATION_TACTICS: AdvancedStrategy = {
  id: 'escalation_tactics',
  name: 'Multi-Level Escalation Strategy',
  description: 'Systematic escalation from bureau dispute to CFPB complaint to state AG involvement to legal demand letters.',
  legalBasis: [
    {
      law: 'FCRA',
      section: '§611(a)',
      description: 'Right to dispute and reinvestigation',
      citation: '15 U.S.C. § 1681i(a)',
    },
    {
      law: 'FCRA',
      section: '§616-617',
      description: 'Civil liability for willful/negligent noncompliance',
      citation: '15 U.S.C. § 1681n-o',
    },
    {
      law: 'Consumer Financial Protection Act',
      section: '§1031',
      description: 'CFPB authority over unfair practices',
      citation: '12 U.S.C. § 5531',
    },
  ],
  steps: [
    {
      order: 1,
      title: 'Initial Bureau Dispute',
      description: 'Send certified dispute letter to credit bureau with documentation',
      duration: '30-45 days',
      documents: ['Dispute letter', 'Supporting evidence', 'ID verification'],
      tips: ['Send certified mail with return receipt', 'Keep copies of everything'],
    },
    {
      order: 2,
      title: 'Furnisher Direct Dispute',
      description: 'If bureau fails, dispute directly with the data furnisher',
      duration: '30 days',
      documents: ['Direct dispute letter', 'Bureau response', 'Evidence'],
      tips: ['Reference FCRA §623(b)', 'Demand method of verification'],
    },
    {
      order: 3,
      title: 'CFPB Complaint',
      description: 'File formal complaint with Consumer Financial Protection Bureau',
      duration: '15-60 days',
      documents: ['CFPB complaint form', 'All prior correspondence', 'Timeline'],
      tips: ['Be specific and factual', 'Include all dates and reference numbers'],
    },
    {
      order: 4,
      title: 'State Attorney General',
      description: 'File complaint with state AG consumer protection division',
      duration: '30-90 days',
      documents: ['AG complaint form', 'CFPB complaint copy', 'All evidence'],
      tips: ['Some states have stronger consumer protection laws'],
    },
    {
      order: 5,
      title: 'Legal Demand Letter',
      description: 'Send attorney demand letter citing FCRA violations',
      duration: '30 days',
      documents: ['Attorney letter', 'Damages calculation', 'Settlement demand'],
      tips: ['Consider consulting FCRA attorney', 'Document all damages'],
    },
  ],
  timeline: {
    minDays: 90,
    maxDays: 270,
    phases: [
      { name: 'Bureau Dispute', duration: '30-45 days', description: 'Initial dispute' },
      { name: 'Furnisher Dispute', duration: '30 days', description: 'Direct dispute' },
      { name: 'Regulatory', duration: '30-90 days', description: 'CFPB/AG complaints' },
      { name: 'Legal', duration: '30+ days', description: 'Demand letters/litigation' },
    ],
  },
  riskLevel: 'medium',
  difficulty: 'intermediate',
  expectedOutcomes: [
    { outcome: 'Item removed', probability: 0.65, description: 'Disputed item deleted' },
    { outcome: 'Item corrected', probability: 0.20, description: 'Information updated' },
    { outcome: 'Settlement', probability: 0.10, description: 'Monetary settlement' },
    { outcome: 'No change', probability: 0.05, description: 'Dispute unsuccessful' },
  ],
  whenToUse: [
    'Bureau dispute was denied without proper investigation',
    'Clear FCRA violation exists',
    'You have strong documentation',
    'Item is significantly impacting credit score',
  ],
  whenNotToUse: [
    'Information is accurate',
    'You lack documentation',
    'Item is minor or about to age off',
  ],
  integrationPoints: ['dispute-service.ts', 'dispute-prompts.ts', '/api/disputes/generate'],
  aiPrompt: `Generate an escalation strategy letter for the following dispute scenario.
Current escalation level: {ESCALATION_LEVEL}
Previous responses: {PREVIOUS_RESPONSES}
Dispute details: {DISPUTE_DETAILS}

The letter should:
1. Reference all prior dispute attempts and responses
2. Cite specific FCRA violations
3. Demand immediate action with specific deadline
4. Warn of next escalation step
5. Be professional but firm`,
  successRate: 72,
};

// ============================================================================
// STRATEGY 2: METHOD OF VERIFICATION (MOV) CHALLENGES
// ============================================================================

export const MOV_CHALLENGE: AdvancedStrategy = {
  id: 'mov_challenge',
  name: 'Method of Verification Challenge',
  description: 'Demand proof of how the bureau verified disputed information. Bureaus often use automated systems that fail to meet FCRA reasonable investigation standards.',
  legalBasis: [
    {
      law: 'FCRA',
      section: '§611(a)(6)(B)(iii)',
      description: 'Right to description of reinvestigation procedure',
      citation: '15 U.S.C. § 1681i(a)(6)(B)(iii)',
    },
    {
      law: 'FCRA',
      section: '§611(a)(7)',
      description: 'Right to method of verification upon request',
      citation: '15 U.S.C. § 1681i(a)(7)',
    },
    {
      law: 'Case Law',
      section: 'Cushman v. Trans Union',
      description: 'Bureaus must conduct meaningful investigation',
      citation: '115 F.3d 220 (3d Cir. 1997)',
    },
  ],
  steps: [
    {
      order: 1,
      title: 'Initial Dispute with MOV Request',
      description: 'File dispute and explicitly request method of verification',
      duration: '30 days',
      documents: ['Dispute letter with MOV request', 'Evidence'],
      tips: ['Cite §611(a)(7) specifically', 'Request in writing'],
    },
    {
      order: 2,
      title: 'Analyze MOV Response',
      description: 'Review the method of verification provided',
      duration: '5-10 days',
      documents: ['Bureau response', 'MOV documentation'],
      tips: ['Look for e-OSCAR automated responses', 'Check if actual documents reviewed'],
    },
    {
      order: 3,
      title: 'Challenge Inadequate MOV',
      description: 'If MOV shows automated/inadequate investigation, challenge it',
      duration: '30 days',
      documents: ['Challenge letter', 'MOV analysis', 'Case law citations'],
      tips: ['Cite Cushman v. Trans Union', 'Argue reasonable investigation not conducted'],
    },
    {
      order: 4,
      title: 'Regulatory Complaint',
      description: 'File CFPB complaint citing inadequate investigation procedures',
      duration: '30-60 days',
      documents: ['CFPB complaint', 'MOV evidence', 'Timeline'],
      tips: ['CFPB takes investigation failures seriously'],
    },
  ],
  timeline: {
    minDays: 60,
    maxDays: 150,
    phases: [
      { name: 'Initial MOV Request', duration: '30 days', description: 'Dispute with MOV demand' },
      { name: 'Analysis', duration: '5-10 days', description: 'Review MOV response' },
      { name: 'Challenge', duration: '30 days', description: 'Challenge inadequate MOV' },
      { name: 'Escalation', duration: '30-60 days', description: 'Regulatory complaint' },
    ],
  },
  riskLevel: 'low',
  difficulty: 'advanced',
  expectedOutcomes: [
    { outcome: 'Item removed', probability: 0.55, description: 'Bureau cannot prove adequate investigation' },
    { outcome: 'Detailed MOV provided', probability: 0.25, description: 'Bureau provides actual verification' },
    { outcome: 'No change', probability: 0.20, description: 'Bureau maintains position' },
  ],
  whenToUse: [
    'Bureau verified item without apparent investigation',
    'Response was suspiciously fast (under 10 days)',
    'Generic response with no specific details',
    'e-OSCAR automated dispute suspected',
  ],
  whenNotToUse: [
    'Bureau provided detailed investigation results',
    'Furnisher provided original documents',
    'Information is clearly accurate',
  ],
  integrationPoints: ['dispute-service.ts', '/api/disputes/generate'],
  aiPrompt: `Generate a Method of Verification challenge letter.
Bureau response: {BUREAU_RESPONSE}
Original dispute: {ORIGINAL_DISPUTE}
Days to respond: {RESPONSE_TIME}

The letter should:
1. Cite FCRA §611(a)(7) right to MOV
2. Point out deficiencies in their investigation
3. Reference Cushman v. Trans Union if applicable
4. Demand specific verification documents
5. Warn of CFPB complaint if inadequate`,
  successRate: 58,
};

// ============================================================================
// STRATEGY 3: FURNISHER DIRECT DISPUTES
// ============================================================================

export const FURNISHER_DIRECT: AdvancedStrategy = {
  id: 'furnisher_direct',
  name: 'Furnisher Direct Dispute Strategy',
  description: 'Bypass credit bureaus and dispute directly with the data furnisher (creditor/collector) under FCRA §623.',
  legalBasis: [
    {
      law: 'FCRA',
      section: '§623(a)(8)',
      description: 'Duty to investigate direct disputes',
      citation: '15 U.S.C. § 1681s-2(a)(8)',
    },
    {
      law: 'FCRA',
      section: '§623(b)',
      description: 'Duties upon notice of dispute from CRA',
      citation: '15 U.S.C. § 1681s-2(b)',
    },
    {
      law: 'FCRA',
      section: '§623(a)(1)',
      description: 'Duty to provide accurate information',
      citation: '15 U.S.C. § 1681s-2(a)(1)',
    },
  ],
  steps: [
    {
      order: 1,
      title: 'Identify Furnisher Address',
      description: 'Find the correct address for disputes (often different from billing)',
      duration: '1-3 days',
      documents: ['Credit report', 'Furnisher contact research'],
      tips: ['Check furnisher website for dispute address', 'Use address on credit report'],
    },
    {
      order: 2,
      title: 'Send Direct Dispute',
      description: 'Send detailed dispute letter directly to furnisher',
      duration: '30 days',
      documents: ['Direct dispute letter', 'Evidence', 'ID verification'],
      tips: ['Cite §623(a)(8)', 'Be specific about inaccuracy'],
    },
    {
      order: 3,
      title: 'Follow Up',
      description: 'If no response in 30 days, send follow-up with escalation warning',
      duration: '15 days',
      documents: ['Follow-up letter', 'Proof of original mailing'],
      tips: ['Document lack of response', 'Prepare for CFPB complaint'],
    },
    {
      order: 4,
      title: 'Regulatory Action',
      description: 'File CFPB complaint for failure to investigate direct dispute',
      duration: '30-60 days',
      documents: ['CFPB complaint', 'All correspondence', 'Timeline'],
      tips: ['§623(a)(8) violations are taken seriously'],
    },
  ],
  timeline: {
    minDays: 45,
    maxDays: 120,
    phases: [
      { name: 'Research', duration: '1-3 days', description: 'Find correct address' },
      { name: 'Direct Dispute', duration: '30 days', description: 'Send to furnisher' },
      { name: 'Follow-up', duration: '15 days', description: 'Escalation warning' },
      { name: 'Regulatory', duration: '30-60 days', description: 'CFPB complaint' },
    ],
  },
  riskLevel: 'low',
  difficulty: 'intermediate',
  expectedOutcomes: [
    { outcome: 'Item corrected/removed', probability: 0.60, description: 'Furnisher updates reporting' },
    { outcome: 'Documentation provided', probability: 0.20, description: 'Furnisher proves accuracy' },
    { outcome: 'No response', probability: 0.15, description: 'Furnisher ignores (violation)' },
    { outcome: 'Dispute rejected', probability: 0.05, description: 'Furnisher denies' },
  ],
  whenToUse: [
    'Bureau dispute was unsuccessful',
    'You have evidence furnisher has wrong information',
    'Furnisher is a large company with compliance department',
    'You want to create paper trail for potential lawsuit',
  ],
  whenNotToUse: [
    'Furnisher is out of business',
    'Debt has been sold multiple times',
    'You have no evidence of inaccuracy',
  ],
  integrationPoints: ['dispute-service.ts', '/api/disputes/generate'],
  aiPrompt: `Generate a direct furnisher dispute letter.
Furnisher: {FURNISHER_NAME}
Account: {ACCOUNT_NUMBER}
Dispute reason: {DISPUTE_REASON}
Evidence: {EVIDENCE_SUMMARY}

The letter should:
1. Cite FCRA §623(a)(8) direct dispute rights
2. Clearly state the inaccuracy
3. Demand investigation within 30 days
4. Request written response
5. Warn of regulatory complaint if ignored`,
  successRate: 62,
};

// ============================================================================
// STRATEGY 4: PROCEDURAL VIOLATIONS
// ============================================================================

export const PROCEDURAL_VIOLATIONS: AdvancedStrategy = {
  id: 'procedural_violations',
  name: 'Procedural Violation Exploitation',
  description: 'Identify and exploit bureau failures to follow FCRA procedural requirements during investigation.',
  legalBasis: [
    {
      law: 'FCRA',
      section: '§611(a)(1)(A)',
      description: '30-day investigation requirement',
      citation: '15 U.S.C. § 1681i(a)(1)(A)',
    },
    {
      law: 'FCRA',
      section: '§611(a)(5)',
      description: 'Requirement to forward all relevant information to furnisher',
      citation: '15 U.S.C. § 1681i(a)(5)',
    },
    {
      law: 'FCRA',
      section: '§611(a)(6)',
      description: 'Written notice of results requirement',
      citation: '15 U.S.C. § 1681i(a)(6)',
    },
  ],
  steps: [
    {
      order: 1,
      title: 'Document Timeline',
      description: 'Carefully track all dates and deadlines',
      duration: 'Ongoing',
      documents: ['Certified mail receipts', 'Response dates', 'Timeline log'],
      tips: ['Use certified mail for proof of delivery date', 'Calculate 30 days from receipt'],
    },
    {
      order: 2,
      title: 'Identify Violations',
      description: 'Review bureau response for procedural failures',
      duration: '1-5 days',
      documents: ['Bureau response', 'Checklist of requirements'],
      tips: ['Check: timing, forwarding evidence, written notice, MOV'],
    },
    {
      order: 3,
      title: 'Document Violation',
      description: 'Create detailed record of procedural violation',
      duration: '1-3 days',
      documents: ['Violation documentation', 'Timeline proof', 'FCRA citations'],
      tips: ['Be specific about which section was violated'],
    },
    {
      order: 4,
      title: 'Demand Deletion',
      description: 'Demand item deletion due to procedural violation',
      duration: '30 days',
      documents: ['Demand letter', 'Violation evidence', 'Legal citations'],
      tips: ['Cite specific FCRA section violated', 'Reference case law'],
    },
  ],
  timeline: {
    minDays: 35,
    maxDays: 90,
    phases: [
      { name: 'Monitoring', duration: '30+ days', description: 'Track investigation' },
      { name: 'Analysis', duration: '1-5 days', description: 'Identify violations' },
      { name: 'Documentation', duration: '1-3 days', description: 'Build case' },
      { name: 'Demand', duration: '30 days', description: 'Deletion demand' },
    ],
  },
  riskLevel: 'low',
  difficulty: 'advanced',
  expectedOutcomes: [
    { outcome: 'Item deleted', probability: 0.50, description: 'Bureau removes due to violation' },
    { outcome: 'Re-investigation', probability: 0.30, description: 'Bureau conducts proper investigation' },
    { outcome: 'No change', probability: 0.20, description: 'Bureau disputes violation claim' },
  ],
  whenToUse: [
    'Bureau responded after 30 days',
    'Bureau did not forward your evidence to furnisher',
    'Bureau did not provide written results',
    'Bureau did not provide MOV when requested',
  ],
  whenNotToUse: [
    'Bureau followed all procedures',
    'Response was timely and complete',
    'You cannot prove the violation',
  ],
  integrationPoints: ['dispute-service.ts', '/api/disputes/generate'],
  aiPrompt: `Generate a procedural violation demand letter.
Violation type: {VIOLATION_TYPE}
Timeline: {TIMELINE_DETAILS}
Evidence: {EVIDENCE}

The letter should:
1. State the specific procedural violation
2. Cite the exact FCRA section violated
3. Provide timeline proving the violation
4. Demand deletion due to failure to comply
5. Reference relevant case law`,
  successRate: 52,
};

// ============================================================================
// STRATEGY 5: DEBT VALIDATION DEMANDS (FDCPA)
// ============================================================================

export const DEBT_VALIDATION: AdvancedStrategy = {
  id: 'debt_validation',
  name: 'FDCPA Debt Validation Strategy',
  description: 'Use FDCPA §809(b) to demand debt validation from collectors, which can lead to deletion if they cannot validate.',
  legalBasis: [
    {
      law: 'FDCPA',
      section: '§809(b)',
      description: 'Right to debt validation within 30 days',
      citation: '15 U.S.C. § 1692g(b)',
    },
    {
      law: 'FDCPA',
      section: '§809(a)',
      description: 'Required validation notice contents',
      citation: '15 U.S.C. § 1692g(a)',
    },
    {
      law: 'FCRA',
      section: '§623(a)(1)',
      description: 'Cannot report unverified debt',
      citation: '15 U.S.C. § 1681s-2(a)(1)',
    },
  ],
  steps: [
    {
      order: 1,
      title: 'Send Validation Request',
      description: 'Within 30 days of first contact, send debt validation letter',
      duration: '30 days',
      documents: ['Debt validation letter', 'Certified mail receipt'],
      tips: ['Must be within 30 days of initial contact', 'Request specific documents'],
    },
    {
      order: 2,
      title: 'Analyze Response',
      description: 'Review validation documents for completeness',
      duration: '5-10 days',
      documents: ['Collector response', 'Validation checklist'],
      tips: ['Check for original signed agreement', 'Verify chain of ownership'],
    },
    {
      order: 3,
      title: 'Challenge Inadequate Validation',
      description: 'If validation is incomplete, challenge and demand deletion',
      duration: '30 days',
      documents: ['Challenge letter', 'Analysis of deficiencies'],
      tips: ['Collectors often cannot produce original documents'],
    },
    {
      order: 4,
      title: 'Credit Bureau Dispute',
      description: 'Dispute with bureaus citing failure to validate',
      duration: '30 days',
      documents: ['Bureau dispute', 'Validation correspondence', 'Evidence'],
      tips: ['Include proof collector could not validate'],
    },
  ],
  timeline: {
    minDays: 60,
    maxDays: 120,
    phases: [
      { name: 'Validation Request', duration: '30 days', description: 'Send DV letter' },
      { name: 'Analysis', duration: '5-10 days', description: 'Review response' },
      { name: 'Challenge', duration: '30 days', description: 'Challenge inadequate DV' },
      { name: 'Bureau Dispute', duration: '30 days', description: 'Dispute with bureaus' },
    ],
  },
  riskLevel: 'low',
  difficulty: 'beginner',
  expectedOutcomes: [
    { outcome: 'Debt deleted', probability: 0.45, description: 'Collector cannot validate' },
    { outcome: 'Debt validated', probability: 0.35, description: 'Collector provides documents' },
    { outcome: 'Collection stopped', probability: 0.15, description: 'Collector ceases activity' },
    { outcome: 'No response', probability: 0.05, description: 'Collector ignores (violation)' },
  ],
  whenToUse: [
    'New collection appeared on credit report',
    'You do not recognize the debt',
    'Debt has been sold to multiple collectors',
    'Original creditor is out of business',
  ],
  whenNotToUse: [
    'More than 30 days since first contact',
    'You acknowledge owing the debt',
    'Debt is with original creditor (not collector)',
  ],
  integrationPoints: ['dispute-service.ts', '/api/disputes/generate'],
  aiPrompt: `Generate a debt validation demand letter.
Collector: {COLLECTOR_NAME}
Account: {ACCOUNT_NUMBER}
Amount claimed: {AMOUNT}
Original creditor: {ORIGINAL_CREDITOR}

The letter should:
1. Cite FDCPA §809(b) validation rights
2. Demand specific validation documents
3. Request chain of ownership documentation
4. Demand they cease collection until validated
5. Warn of FCRA violation if reporting unvalidated debt`,
  successRate: 48,
};

// ============================================================================
// STRATEGY 6: CREDIT BUREAU NEGLIGENCE CLAIMS
// ============================================================================

export const BUREAU_NEGLIGENCE: AdvancedStrategy = {
  id: 'bureau_negligence',
  name: 'Credit Bureau Negligence Strategy',
  description: 'Build a case for bureau negligence when they fail to conduct reasonable investigations or maintain reasonable procedures.',
  legalBasis: [
    {
      law: 'FCRA',
      section: '§607(b)',
      description: 'Reasonable procedures requirement',
      citation: '15 U.S.C. § 1681e(b)',
    },
    {
      law: 'FCRA',
      section: '§617',
      description: 'Civil liability for negligent noncompliance',
      citation: '15 U.S.C. § 1681o',
    },
    {
      law: 'Case Law',
      section: 'Safeco v. Burr',
      description: 'Standard for willful violations',
      citation: '551 U.S. 47 (2007)',
    },
  ],
  steps: [
    {
      order: 1,
      title: 'Document Pattern of Failures',
      description: 'Collect evidence of multiple investigation failures',
      duration: 'Ongoing',
      documents: ['All dispute correspondence', 'Bureau responses', 'Timeline'],
      tips: ['Multiple failures strengthen negligence claim'],
    },
    {
      order: 2,
      title: 'Calculate Damages',
      description: 'Document actual damages from inaccurate reporting',
      duration: '1-2 weeks',
      documents: ['Credit denials', 'Higher interest rates', 'Emotional distress diary'],
      tips: ['Keep records of all credit applications and results'],
    },
    {
      order: 3,
      title: 'Send Negligence Notice',
      description: 'Formal notice of negligence claim to bureau',
      duration: '30 days',
      documents: ['Negligence notice letter', 'Damages documentation', 'Evidence'],
      tips: ['This creates record for potential lawsuit'],
    },
    {
      order: 4,
      title: 'Consult FCRA Attorney',
      description: 'Discuss potential lawsuit with consumer rights attorney',
      duration: 'Varies',
      documents: ['All documentation', 'Damages calculation'],
      tips: ['Many FCRA attorneys work on contingency'],
    },
  ],
  timeline: {
    minDays: 90,
    maxDays: 365,
    phases: [
      { name: 'Documentation', duration: '30-90 days', description: 'Build evidence' },
      { name: 'Damages', duration: '1-2 weeks', description: 'Calculate harm' },
      { name: 'Notice', duration: '30 days', description: 'Formal notice' },
      { name: 'Legal', duration: 'Varies', description: 'Attorney consultation' },
    ],
  },
  riskLevel: 'high',
  difficulty: 'expert',
  expectedOutcomes: [
    { outcome: 'Settlement', probability: 0.40, description: 'Bureau settles to avoid lawsuit' },
    { outcome: 'Item removed', probability: 0.30, description: 'Bureau removes to resolve' },
    { outcome: 'Lawsuit filed', probability: 0.20, description: 'Proceed to litigation' },
    { outcome: 'No resolution', probability: 0.10, description: 'Claim unsuccessful' },
  ],
  whenToUse: [
    'Multiple failed disputes on same item',
    'Clear evidence of inadequate investigation',
    'Significant damages from inaccurate reporting',
    'Bureau ignored evidence you provided',
  ],
  whenNotToUse: [
    'Single dispute failure',
    'No documented damages',
    'Information is accurate',
    'You cannot afford potential legal costs',
  ],
  integrationPoints: ['dispute-service.ts', '/api/disputes/generate'],
  aiPrompt: `Generate a negligence notice letter to credit bureau.
Bureau: {BUREAU_NAME}
Dispute history: {DISPUTE_HISTORY}
Failures documented: {FAILURES}
Damages: {DAMAGES}

The letter should:
1. Cite FCRA §607(b) reasonable procedures requirement
2. Document pattern of investigation failures
3. List specific damages suffered
4. Reference §617 negligent noncompliance liability
5. Demand immediate correction and compensation`,
  successRate: 45,
};

// ============================================================================
// STRATEGY 7: HYBRID DISPUTE + GOODWILL
// ============================================================================

export const HYBRID_GOODWILL: AdvancedStrategy = {
  id: 'hybrid_goodwill',
  name: 'Hybrid Dispute + Goodwill Strategy',
  description: 'Combine legal dispute tactics with relationship-building goodwill requests for maximum effectiveness.',
  legalBasis: [
    {
      law: 'FCRA',
      section: '§623(a)(2)',
      description: 'Furnisher duty to correct after dispute',
      citation: '15 U.S.C. § 1681s-2(a)(2)',
    },
    {
      law: 'Business Practice',
      section: 'Goodwill Adjustment',
      description: 'Creditors may voluntarily remove negative items',
      citation: 'Industry standard practice',
    },
  ],
  steps: [
    {
      order: 1,
      title: 'Assess Relationship',
      description: 'Evaluate your history and current standing with creditor',
      duration: '1-3 days',
      documents: ['Account history', 'Payment records', 'Current status'],
      tips: ['Long-term customers have more leverage'],
    },
    {
      order: 2,
      title: 'Send Goodwill Letter',
      description: 'Request goodwill adjustment citing positive history',
      duration: '30 days',
      documents: ['Goodwill letter', 'Payment history', 'Explanation'],
      tips: ['Be humble and appreciative', 'Explain circumstances'],
    },
    {
      order: 3,
      title: 'Follow Up with Dispute',
      description: 'If goodwill denied, follow with formal dispute',
      duration: '30 days',
      documents: ['Dispute letter', 'Evidence of inaccuracy if any'],
      tips: ['Reference goodwill attempt', 'Cite any technical inaccuracies'],
    },
    {
      order: 4,
      title: 'Executive Escalation',
      description: 'Escalate to executive customer service',
      duration: '15-30 days',
      documents: ['Executive letter', 'All prior correspondence'],
      tips: ['Find executive contacts online', 'Be professional'],
    },
  ],
  timeline: {
    minDays: 45,
    maxDays: 120,
    phases: [
      { name: 'Assessment', duration: '1-3 days', description: 'Evaluate relationship' },
      { name: 'Goodwill', duration: '30 days', description: 'Request adjustment' },
      { name: 'Dispute', duration: '30 days', description: 'Formal dispute' },
      { name: 'Escalation', duration: '15-30 days', description: 'Executive contact' },
    ],
  },
  riskLevel: 'low',
  difficulty: 'beginner',
  expectedOutcomes: [
    { outcome: 'Goodwill removal', probability: 0.35, description: 'Creditor removes as courtesy' },
    { outcome: 'Partial adjustment', probability: 0.25, description: 'Some items removed' },
    { outcome: 'Dispute success', probability: 0.20, description: 'Technical dispute wins' },
    { outcome: 'No change', probability: 0.20, description: 'Both approaches fail' },
  ],
  whenToUse: [
    'Long-term customer with good history',
    'One-time late payment due to circumstances',
    'Account is current and in good standing',
    'Creditor has reputation for goodwill adjustments',
  ],
  whenNotToUse: [
    'Multiple late payments or charge-offs',
    'No relationship with creditor',
    'Account is closed negatively',
    'Debt is with collection agency',
  ],
  integrationPoints: ['dispute-service.ts', '/api/disputes/generate'],
  aiPrompt: `Generate a hybrid goodwill/dispute letter.
Creditor: {CREDITOR_NAME}
Account history: {ACCOUNT_HISTORY}
Issue: {ISSUE_DESCRIPTION}
Circumstances: {CIRCUMSTANCES}

The letter should:
1. Express appreciation for the relationship
2. Explain circumstances leading to the issue
3. Highlight positive payment history
4. Request goodwill adjustment
5. Subtly mention dispute rights if needed`,
  successRate: 55,
};

// ============================================================================
// EXPORT ALL STRATEGIES
// ============================================================================

export const ALL_ADVANCED_STRATEGIES: AdvancedStrategy[] = [
  ESCALATION_TACTICS,
  MOV_CHALLENGE,
  FURNISHER_DIRECT,
  PROCEDURAL_VIOLATIONS,
  DEBT_VALIDATION,
  BUREAU_NEGLIGENCE,
  HYBRID_GOODWILL,
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get strategy by ID
 */
export function getStrategyById(id: string): AdvancedStrategy | undefined {
  return ALL_ADVANCED_STRATEGIES.find(s => s.id === id);
}

/**
 * Get strategies by difficulty level
 */
export function getStrategiesByDifficulty(difficulty: DifficultyLevel): AdvancedStrategy[] {
  return ALL_ADVANCED_STRATEGIES.filter(s => s.difficulty === difficulty);
}

/**
 * Get strategies by risk level
 */
export function getStrategiesByRisk(risk: RiskLevel): AdvancedStrategy[] {
  return ALL_ADVANCED_STRATEGIES.filter(s => s.riskLevel === risk);
}

/**
 * Get strategies sorted by success rate
 */
export function getStrategiesBySuccessRate(minRate: number = 50): AdvancedStrategy[] {
  return ALL_ADVANCED_STRATEGIES
    .filter(s => s.successRate >= minRate)
    .sort((a, b) => b.successRate - a.successRate);
}

/**
 * Recommend strategy based on dispute scenario
 */
export function recommendStrategy(scenario: {
  disputeType: string;
  previousAttempts: number;
  hasEvidence: boolean;
  accountAge: number;
  isCollection: boolean;
  hasRelationship: boolean;
}): AdvancedStrategy[] {
  const recommendations: AdvancedStrategy[] = [];

  // New collection - start with debt validation
  if (scenario.isCollection && scenario.previousAttempts === 0) {
    recommendations.push(DEBT_VALIDATION);
  }

  // Has relationship - try goodwill first
  if (scenario.hasRelationship && scenario.previousAttempts < 2) {
    recommendations.push(HYBRID_GOODWILL);
  }

  // Previous attempts failed - escalate
  if (scenario.previousAttempts >= 1) {
    recommendations.push(ESCALATION_TACTICS);
    recommendations.push(MOV_CHALLENGE);
  }

  // Multiple failures - consider negligence
  if (scenario.previousAttempts >= 3 && scenario.hasEvidence) {
    recommendations.push(BUREAU_NEGLIGENCE);
  }

  // Has evidence - direct furnisher dispute
  if (scenario.hasEvidence) {
    recommendations.push(FURNISHER_DIRECT);
  }

  // Default - procedural violations always worth checking
  if (scenario.previousAttempts >= 1) {
    recommendations.push(PROCEDURAL_VIOLATIONS);
  }

  // Remove duplicates and return
  const uniqueIds = new Set<string>();
  return recommendations.filter(strategy => {
    if (uniqueIds.has(strategy.id)) {
      return false;
    }
    uniqueIds.add(strategy.id);
    return true;
  });
}

/**
 * Track strategy usage and outcomes
 */
export interface StrategyTracking {
  strategyId: string;
  disputeId: string;
  userId: string;
  startDate: Date;
  endDate?: Date;
  outcome?: 'success' | 'partial' | 'failure';
  notes: string[];
  stepsCompleted: number[];
}

/**
 * Calculate strategy effectiveness from tracking data
 */
export function calculateStrategyEffectiveness(
  trackingData: StrategyTracking[]
): Map<string, { successRate: number; avgDays: number; totalUses: number }> {
  const results = new Map<string, { successRate: number; avgDays: number; totalUses: number }>();

  for (const strategy of ALL_ADVANCED_STRATEGIES) {
    const strategyData = trackingData.filter(t => t.strategyId === strategy.id && t.outcome);

    if (strategyData.length === 0) {
      results.set(strategy.id, {
        successRate: strategy.successRate,
        avgDays: (strategy.timeline.minDays + strategy.timeline.maxDays) / 2,
        totalUses: 0,
      });
      continue;
    }

    const successes = strategyData.filter(t => t.outcome === 'success' || t.outcome === 'partial').length;
    const avgDays = strategyData
      .filter(t => t.endDate)
      .reduce((sum, t) => {
        const days = Math.ceil((t.endDate!.getTime() - t.startDate.getTime()) / (1000 * 60 * 60 * 24));
        return sum + days;
      }, 0) / strategyData.filter(t => t.endDate).length || 0;

    results.set(strategy.id, {
      successRate: Math.round((successes / strategyData.length) * 100),
      avgDays: Math.round(avgDays),
      totalUses: strategyData.length,
    });
  }

  return results;
}

/**
 * Generate AI prompt for a specific strategy
 */
export function generateStrategyPrompt(
  strategyId: string,
  variables: Record<string, string>
): string {
  const strategy = getStrategyById(strategyId);
  if (!strategy) {
    throw new Error(`Strategy not found: ${strategyId}`);
  }

  let prompt = strategy.aiPrompt;
  for (const [key, value] of Object.entries(variables)) {
    prompt = prompt.replace(`{${key}}`, value);
  }

  return prompt;
}

