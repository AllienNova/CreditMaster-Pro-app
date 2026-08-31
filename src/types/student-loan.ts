// Student Loan Types

export type JsonValue = string | number | boolean | null | undefined | JsonValue[] | { [key: string]: JsonValue };
export type JsonRecord = Record<string, JsonValue>;

export interface FederalProgramApplication {
  userId: string;
  programType: 'fresh-start' | 'rehabilitation' | 'consolidation';
  loanIds: string[];
  personalInfo: {
    firstName: string;
    lastName: string;
    ssn: string;
    dateOfBirth: string;
    email: string;
    phone: string;
  };
  financialInfo?: {
    annualIncome: number;
    householdSize: number;
    employmentStatus: string;
  };
  additionalData?: JsonRecord;
}

export interface ApplicationStatus {
  applicationId: string;
  status: 'pending' | 'in-progress' | 'approved' | 'denied' | 'completed';
  submittedDate: string;
  lastUpdated: string;
  details: string;
  nextSteps?: string[];
}

export interface StudentLoan {
  id: string;
  loan_id: string;
  servicer: string;
  servicer_name: string;
  account_number: string;
  loanType: 'federal' | 'private';
  loan_type: string;
  balance: number;
  current_balance: number;
  original_amount: number;
  interestRate: number;
  interest_rate: number;
  status: 'current' | 'delinquent' | 'default' | 'forbearance' | 'deferment';
  loan_status: string;
  monthlyPayment: number;
  originationDate: string;
  disbursement_date: Date;
  disbursementAmount: number;
  default_date?: Date;
  payment_history?: PaymentHistory[];
  forbearance_periods?: ForbearancePeriod[];
  capitalization_history?: CapitalizationEvent[];
  credit_report_history?: CreditReportEntry[];
  servicer_transfer_history?: ServicerTransfer[];
  credit_report_discrepancies?: JsonRecord[];
  dispute_history?: DisputeRecord[];
  collection_activities?: CollectionActivity[];
  servicer_communications?: ServicerCommunication[];
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
}

export interface PaymentHistory extends JsonRecord {
  payment_date: string;
  payment_amount: number;
  principal_amount: number;
  interest_amount: number;
  fees_amount?: number;
}

export interface ForbearancePeriod extends JsonRecord {
  start_date: string;
  end_date: string;
  forbearance_type: string;
  authorized: boolean;
}

export interface CapitalizationEvent extends JsonRecord {
  date: string;
  capitalized_amount: number;
  loan_status_at_time: string;
  reason: string;
}

export interface CreditReportEntry extends JsonRecord {
  report_date: string;
  payment_status: string;
  balance_reported: number;
  bureau: string;
}

export interface ServicerTransfer extends JsonRecord {
  transfer_date: string;
  from_servicer: string;
  to_servicer: string;
  borrower_notification_date?: string;
  proper_notification: boolean;
  payment_processing_gap_days: number;
}

export interface DisputeRecord extends JsonRecord {
  submission_date: string;
  dispute_type: string;
  status: string;
  resolution_date?: string;
}

export interface CollectionActivity extends JsonRecord {
  activity_date: string;
  activity_type: string;
  violation_type?: string[];
  description: string;
}

export interface ServicerCommunication extends JsonRecord {
  communication_date: string;
  communication_type: string;
  abusive_language?: boolean;
  misleading_information?: boolean;
  harassment_indicators?: boolean;
  content: string;
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
  disputeType: 'inaccurate-balance' | 'incorrect-status' | 'unauthorized-inquiry' | 'other';
  description: string;
  status: 'pending' | 'investigating' | 'resolved' | 'rejected';
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
    impact: 'positive' | 'negative' | 'neutral';
    weight: number;
  }[];
}

// ML Prediction Types
export interface MLPrediction {
  prediction_id: string;
  prediction_type: string;
  loan_id: string;
  input_features: JsonRecord;
  success_probability: number;
  confidence_score: number;
  predicted_timeline: number;
  expected_outcomes: JsonRecord;
  risk_factors: string[];
  model_explanations: JsonRecord;
  prediction_date: Date;
  model_versions: Record<string, string>;
}

export interface PredictionFeatures extends JsonRecord {
  loan_balance: number;
  loan_age_months: number;
  default_duration_days?: number;
  interest_rate: number;
  loan_type_encoded: number;
  original_amount: number;
  servicer_error_rate: number;
  servicer_vulnerability_score: number;
  servicer_compliance_score: number;
  servicer_response_quality: number;
  credit_score: number;
  income_level: number;
  employment_stability: number;
  dispute_history_count: number;
  cooperation_score: number;
  error_count: number;
  error_severity_avg: number;
  payment_error_count: number;
  reporting_error_count: number;
  regulatory_enforcement_level: number;
  consumer_protection_strength: number;
  court_decision_favorability: number;
  strategy_complexity: number;
  automation_level: number;
  legal_basis_strength: number;
  program_type_encoded?: number;
  eligibility_score?: number;
  documentation_completeness?: number;
}

export interface PredictionResult {
  probability: number;
  confidence: number;
  timeline: number;
  score_improvement: number;
  improvement_range: [number, number];
  timeline_breakdown?: JsonRecord;
}

export interface ModelTrainingData {
  features: PredictionFeatures[];
  labels: number[];
  metadata: JsonRecord;
}

// Servicer Intelligence Types
export interface ServicerProfile {
  servicer_name: string;
  error_rate: number;
  compliance_score: number;
  response_quality_score: number;
  transfer_frequency: number;
  documentation_quality: number;
  average_resolution_time: number;
  customer_satisfaction: number;
  regulatory_actions: number;
  federal_contractor: boolean;
  vulnerability_score: number;
  operational_characteristics?: {
    documentation_quality: string;
    response_time_avg: number;
    escalation_effectiveness: number;
    automation_level: number;
  };
  vulnerability_indicators?: {
    payment_processing_errors: number;
    transfer_documentation_gaps: number;
    compliance_violations: number;
    customer_service_issues: number;
  };
  historical_performance?: {
    complaint_volume_trend: string;
    regulatory_actions: number;
    settlement_history: string[];
  };
  data_quality_score?: number;
}

export interface ServicerAnalysisResult extends JsonRecord {
  servicer_name: string;
  vulnerability_score: number;
  error_patterns: ErrorPattern[];
  compliance_violations: ComplianceViolation[];
  exploitation_opportunities: ExploitationOpportunity[];
  recommended_strategies: string[];
  confidence_level: number;
}

export interface ExploitationOpportunity extends JsonRecord {
  type: string;
  description: string;
  legal_basis: string;
  success_probability: number;
  potential_impact: string;
  required_actions: string[];
  timeline: string;
  documentation_needed: string[];
}

export interface ServicerError {
  error_id: string;
  error_type: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  detected_date: Date;
  evidence: JsonRecord;
}

export interface ServicerVulnerability {
  vulnerability_type: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  exploitation_potential: number;
  legal_basis: string;
}

export interface ErrorPattern extends JsonRecord {
  pattern_type: string;
  description: string;
  frequency: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  legal_basis: string;
  detection_method: string;
  evidence: JsonRecord[];
  exploitation_potential: number;
}

export interface ComplianceViolation extends JsonRecord {
  violation_type: string;
  regulation: string;
  description: string;
  severity: 'minor' | 'moderate' | 'major' | 'severe';
  evidence: JsonRecord | JsonRecord[];
  potential_damages: string;
  enforcement_actions: string[];
}

// AI Strategy Types
export interface AIStrategyRecommendation {
  loan_id: string;
  recommendation_id: string;
  ai_confidence_score: number;
  decision_matrix: JsonRecord;
  strategy_orchestration: JsonRecord;
  predictive_analysis: PredictiveAnalysis;
  automation_level: number;
  expected_outcomes: string[];
  risk_mitigation: string[];
  monitoring_plan: JsonRecord;
  created_at: string;
  last_updated: string;
}

export interface StrategyExecutionPlan {
  execution_id: string;
  recommendation_id: string;
  loan_id: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  started_at?: Date;
  completed_at?: Date;
  automated_actions: JsonRecord[];
  manual_interventions: JsonRecord[];
  monitoring_schedule: JsonRecord;
}

export interface PredictiveAnalysis {
  predicted_success_rate: number;
  predicted_timeline: number;
  predicted_credit_impact: number;
  predicted_financial_impact: number;
  confidence_level: number;
  key_success_factors: string[];
  potential_obstacles: string[];
  mitigation_strategies: string[];
}

export interface AutomationWorkflow extends JsonRecord {
  workflow_id: string;
  workflow_name: string;
  workflow_type: string;
  trigger_conditions: string[];
  automation_steps: string[];
  success_criteria: string[];
  failure_handling: string;
  parameters: JsonRecord;
}

export interface SuccessMetrics extends JsonRecord {
  primary_metrics: string[];
  secondary_metrics: string[];
  target_values: Record<string, number>;
}

// Student Loan Service Types
export interface StudentLoanAnalysisResponse {
  total_loans: number;
  total_balance: number;
  loans_by_status: Record<string, number>;
  servicer_breakdown: ServicerBreakdown[];
  repair_opportunities: RepairOpportunity[];
  recommended_strategies: StrategyRecommendation[];
  eligibility_summary: EligibilitySummary;
  projected_outcomes: ProjectedOutcomes;
}

export interface ServicerBreakdown {
  servicer_name: string;
  loan_count: number;
  total_balance: number;
  error_rate: number;
  vulnerability_score: number;
}

export interface RepairOpportunity {
  type: string;
  description: string;
  potential_impact: string;
  difficulty: 'low' | 'medium' | 'high';
  estimated_timeline: string;
  success_probability: number;
}

export interface StrategyRecommendation {
  strategy_type: string;
  priority: number;
  success_probability: number;
  estimated_timeline: string;
  expected_impact: string;
  automation_level: string;
}

export interface EligibilitySummary {
  fresh_start_eligible: boolean;
  rehabilitation_eligible: boolean;
  discharge_eligible: boolean;
  borrower_defense_eligible: boolean;
  consolidation_eligible: boolean;
}

export interface ProjectedOutcomes {
  credit_score_improvement: CreditScoreProjection;
  timeline_to_resolution: TimelineProjection;
  financial_impact: FinancialImpact;
}

export interface CreditScoreProjection {
  current_estimated_score: number;
  projected_score_3_months: number;
  projected_score_6_months: number;
  projected_score_12_months: number;
  confidence_level: number;
}

export interface TimelineProjection {
  optimistic_timeline: number;
  realistic_timeline: number;
  pessimistic_timeline: number;
  key_milestones: ProjectedMilestone[];
}

export interface ProjectedMilestone {
  milestone: string;
  estimated_date: Date;
  impact: string;
}

export interface FinancialImpact {
  potential_savings: number;
  cost_of_service: number;
  net_benefit: number;
  roi_percentage: number;
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
}

export interface CreditItem {
  id: string;
  type: 'account' | 'collection' | 'inquiry' | 'public_record';
  status: string;
  creditor_name: string;
  account_number?: string;
  balance?: number;
  date_opened?: string;
  date_reported?: string;
  description?: string;
}

// Additional types for Student Loan Service
export interface StudentLoanStrategy {
  id: string;
  user_id: string;
  loan_id: string;
  strategy_type: string;
  strategy_name: string;
  status: string;
  priority: number;
  current_step: number;
  step_history: JsonRecord[];
  created_at: string;
  updated_at: string;
}

export interface ServicerCommunication {
  id: string;
  user_id: string;
  loan_id: string;
  communication_type: string;
  direction: 'inbound' | 'outbound';
  content: string;
  created_at: string;
  updated_at: string;
}

export interface RegulatoryComplaint {
  id: string;
  user_id: string;
  loan_id: string;
  complaint_type: string;
  agency: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface CreditReportMonitoring {
  id: string;
  user_id: string;
  loan_id: string;
  report_date: Date;
  bureau: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface DocumentAnalysis {
  id: string;
  user_id: string;
  loan_id: string;
  document_type: string;
  analysis_results: JsonRecord;
  created_at: string;
  updated_at: string;
}

export interface MonitoringEvent {
  id: string;
  strategy_id: string;
  event_type: string;
  event_data: JsonRecord;
  created_at: string;
  updated_at: string;
}

export interface PerformanceAnalytics {
  id: string;
  strategy_id: string;
  measurement_date: Date;
  metrics: JsonRecord;
  created_at: string;
}
