// Student Loan Types

/**
 * Branded type for SSN values that have been encrypted.
 * Raw SSN strings must be encrypted via PIIProtectionService before assignment.
 */
export type EncryptedSSN = string & { readonly __brand: "EncryptedSSN" };

export interface FederalProgramApplication {
  userId: string;
  programType: "fresh-start" | "rehabilitation" | "consolidation";
  loanIds: string[];
  personalInfo: {
    firstName: string;
    lastName: string;
    ssn: EncryptedSSN;
    dateOfBirth: string;
    email: string;
    phone: string;
  };
  financialInfo?: {
    annualIncome: number;
    householdSize: number;
    employmentStatus: string;
  };
  additionalData?: Record<string, any>;
}

export interface ApplicationStatus {
  applicationId: string;
  status: "pending" | "in-progress" | "approved" | "denied" | "completed";
  submittedDate: string;
  lastUpdated: string;
  details: string;
  nextSteps?: string[];
}

export interface StudentLoan {
  id: string;
  servicer: string;
  loanType: "federal" | "private";
  balance: number;
  interestRate: number;
  status: "current" | "delinquent" | "default" | "forbearance" | "deferment";
  monthlyPayment: number;
  originationDate: string;
  disbursementAmount: number;
  // Extended properties for ML models
  loan_id?: string;
  current_balance?: number;
  disbursement_date?: Date;
  default_date?: Date;
  original_amount?: number;
  interest_rate?: number;
  loan_type?: string;
  loan_status?: string;
  account_number?: string;
  payment_history?: {
    payment_date: string;
    payment_amount: number;
    principal_amount: number;
    interest_amount: number;
  }[];
  servicer_transfer_history?: {
    from_servicer?: string;
    to_servicer?: string;
    transfer_date?: string;
    proper_notification?: boolean;
    payment_processing_gap_days?: number;
  }[];
  // Extended properties for AI analysis
  credit_report_discrepancies?: unknown[];
  dispute_history?: unknown[];
  collection_activities?: unknown[];
  servicer_communications?: unknown[];
  error_flags?: string[];
  fresh_start_eligible?: boolean;
  rehabilitation_eligible?: boolean;
  discharge_eligible?: boolean;
  borrower_defense_eligible?: boolean;
  user_id?: string;
  created_at?: Date;
  updated_at?: Date;
  last_payment_date?: Date;
  original_balance?: number;
  // Servicer intelligence properties
  servicer_name?: string;
  servicer_id?: string;
}

export interface NSLDSData {
  userId: string;
  loans: StudentLoan[];
  grants: {
    id: string;
    type: string;
    amount: number;
    disbursementDate: string;
  }[];
  retrievedDate: string;
}

export interface DisputeItem {
  id: string;
  loanId: string;
  disputeType:
    | "inaccurate-balance"
    | "incorrect-status"
    | "unauthorized-inquiry"
    | "other";
  description: string;
  status: "pending" | "investigating" | "resolved" | "rejected";
  submittedDate: string;
  resolvedDate?: string;
  outcome?: string;
}

export interface CreditImpactAnalysis {
  currentScore: number;
  projectedScore: number;
  potentialIncrease: number;
  timeframe: string;
  factors: {
    factor: string;
    impact: "positive" | "negative" | "neutral";
    weight: number;
  }[];
}

// ML Prediction Types
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };
export type JsonRecord = Record<string, unknown>;

export interface PredictionFeatures {
  loan_balance?: number;
  loan_age_months?: number;
  default_duration_days?: number;
  interest_rate?: number;
  loan_type_encoded?: number;
  original_amount?: number;
  servicer_error_rate?: number;
  servicer_vulnerability_score?: number;
  servicer_compliance_score?: number;
  servicer_response_quality?: number;
  credit_score?: number;
  income_level?: number;
  employment_stability?: number;
  dispute_history_count?: number;
  cooperation_score?: number;
  error_count?: number;
  error_severity_avg?: number;
  payment_error_count?: number;
  reporting_error_count?: number;
  regulatory_enforcement_level?: number;
  consumer_protection_strength?: number;
  court_decision_favorability?: number;
  strategy_complexity?: number;
  automation_level?: number;
  legal_basis_strength?: number;
  program_type_encoded?: number;
  eligibility_score?: number;
  documentation_completeness?: number;
}

export interface PredictionResult {
  probability: number;
  confidence: number;
  timeline?: number;
  score_improvement?: number;
  improvement_range?: [number, number];
  timeline_breakdown?: Record<string, number>;
}

export interface MLPrediction {
  prediction_id: string;
  prediction_type: string;
  loan_id?: string;
  input_features: PredictionFeatures;
  success_probability: number;
  confidence_score: number;
  predicted_timeline?: number;
  expected_outcomes: Record<string, unknown>;
  risk_factors: string[];
  model_explanations: Record<string, unknown>;
  prediction_date: Date;
  model_versions: Record<string, string>;
}

// Servicer Intelligence Types
export interface ServicerProfile {
  servicer_id: string;
  name: string;
  error_rate?: number;
  vulnerability_score?: number;
  compliance_score?: number;
  response_quality_score?: number;
  known_issues?: string[];
  regulatory_actions?: string[];
  dispute_success_rate?: number;
}

export interface ServicerVulnerability {
  vulnerability_id: string;
  servicer_id: string;
  type: string;
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  exploitation_potential?: number;
  legal_basis?: string[];
  evidence_requirements?: string[];
}

export interface ErrorPattern {
  pattern_id?: string;
  pattern_type?: string;
  servicer_id?: string;
  error_type?: string;
  frequency?: number;
  severity?: number | string;
  description?: string;
  detection_method?: string;
  remediation_steps?: string[];
  legal_basis?: string;
  affected_loans?: string[];
  evidence?: JsonRecord[] | string[];
  exploitation_potential?: number;
}

export interface ComplianceViolation {
  violation_id: string;
  servicer_id: string;
  regulation: string;
  violation_type: string;
  severity: "minor" | "moderate" | "major" | "critical";
  date_identified?: Date;
  status: "open" | "investigating" | "resolved" | "escalated";
  evidence?: string[];
  remediation_required?: string;
}

export interface ServicerAnalysisResult {
  servicer_id?: string;
  servicer_name?: string;
  overall_vulnerability_score?: number;
  vulnerability_score?: number;
  compliance_score?: number;
  error_patterns: ErrorPattern[];
  vulnerabilities?: ServicerVulnerability[];
  compliance_violations?: ComplianceViolation[];
  exploitation_opportunities: ExploitationOpportunity[];
  recommended_strategies: string[];
  confidence_level?: number;
  risk_assessment?: {
    level: "low" | "medium" | "high";
    factors: string[];
  };
}

export interface ExploitationOpportunity {
  opportunity_id: string;
  servicer_id: string;
  type: string;
  description: string;
  success_probability: number;
  potential_impact: string;
  required_evidence: string[];
  legal_basis: string[];
  recommended_approach: string;
  timeline_estimate?: number;
}

// Credit Repair Strategy Types
export interface Strategy {
  id: string;
  name: string;
  strategy_type: string;
  legal_basis: string;
  success_rate: number;
  tier: number;
  target_items: string[];
  key_tactics: string[];
  prerequisites: string[];
  is_active: boolean;
  created_at: string;
  description?: string;
  complexity?: "low" | "medium" | "high";
  estimated_timeline?: string;
  required_documents?: string[];
}

// AI Engine Types
export interface AIStrategyRecommendation {
  strategy_id?: string;
  strategy_name?: string;
  confidence_score?: number;
  success_probability?: number;
  recommended_actions?: string[];
  risk_factors?: string[];
  expected_timeline?: number;
  priority?: "low" | "medium" | "high" | "critical";
  // Extended properties for AI engine
  loan_id?: string;
  recommendation_id?: string;
  ai_confidence_score?: number;
  decision_matrix?: Record<string, unknown>;
  strategy_orchestration?: Record<string, unknown>;
  predictive_analysis?: PredictiveAnalysis;
  automation_level?: number;
  expected_outcomes?: Record<string, unknown> | string[];
  risk_mitigation?: Record<string, unknown> | string[];
  monitoring_plan?: Record<string, unknown>;
  created_at?: string;
  last_updated?: string;
}

export interface StrategyExecutionPlan {
  plan_id: string;
  strategies: AIStrategyRecommendation[];
  execution_order: string[];
  total_timeline: number;
  checkpoints: ExecutionCheckpoint[];
  success_criteria: string[];
}

export interface ExecutionCheckpoint {
  checkpoint_id: string;
  name: string;
  expected_date: Date;
  success_criteria: string[];
  fallback_actions: string[];
}

export interface PredictiveAnalysis {
  analysis_id: string;
  loan_id: string;
  success_probability: number;
  confidence_score: number;
  risk_factors: string[];
  opportunities: string[];
  recommended_strategies: string[];
  timeline_estimate: number;
}

export interface AutomationWorkflow {
  workflow_id: string;
  name: string;
  steps: WorkflowStep[];
  triggers: WorkflowTrigger[];
  status: "active" | "paused" | "completed" | "failed";
  created_at: Date;
  updated_at: Date;
}

export interface WorkflowStep {
  step_id: string;
  name: string;
  action: string;
  parameters: Record<string, unknown>;
  dependencies: string[];
  status: "pending" | "running" | "completed" | "failed";
}

export interface WorkflowTrigger {
  trigger_id: string;
  type: "schedule" | "event" | "condition";
  configuration: Record<string, unknown>;
}

export interface SuccessMetrics {
  total_disputes: number;
  successful_disputes: number;
  success_rate: number;
  average_timeline: number;
  credit_score_improvement: number;
  total_debt_removed: number;
}

export interface PaymentHistory {
  payment_id: string;
  loan_id: string;
  amount: number;
  date: Date;
  status: "pending" | "completed" | "failed" | "reversed";
  allocation?: Record<string, number>;
}
