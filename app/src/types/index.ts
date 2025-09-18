// Core Types
export interface User {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  address: Address;
  created_at: string;
  updated_at: string;
  subscription_tier: 'basic' | 'premium' | 'enterprise';
  onboarding_completed: boolean;
}

export interface Address {
  street: string;
  city: string;
  state: string;
  zip_code: string;
  country: string;
}

// Credit Report Types
export interface CreditReport {
  id: string;
  user_id: string;
  bureau: 'experian' | 'equifax' | 'transunion';
  report_date: string;
  credit_score: number;
  raw_data: any;
  parsed_data: ParsedCreditData;
  created_at: string;
}

export interface ParsedCreditData {
  personal_info: PersonalInfo;
  accounts: CreditAccount[];
  inquiries: CreditInquiry[];
  public_records: PublicRecord[];
  collections: Collection[];
}

export interface PersonalInfo {
  name: string;
  ssn: string;
  date_of_birth: string;
  addresses: Address[];
  employment: Employment[];
}

export interface Employment {
  employer: string;
  position?: string;
  start_date?: string;
  end_date?: string;
}

// Credit Item Types
export interface CreditItem {
  id: string;
  user_id: string;
  report_id: string;
  item_type: 'account' | 'inquiry' | 'public_record' | 'collection';
  creditor: string;
  furnisher?: string;
  account_number?: string;
  account_type?: string;
  balance?: number;
  original_balance?: number;
  credit_limit?: number;
  payment_status: string;
  date_opened?: string;
  date_closed?: string;
  last_payment_date?: string;
  first_reported_date: string;
  last_reported_date: string;
  status: 'active' | 'closed' | 'disputed' | 'resolved';
  dispute_history: DisputeHistory[];
  created_at: string;
  updated_at: string;
}

export interface CreditAccount extends CreditItem {
  item_type: 'account';
  monthly_payment?: number;
  payment_history: PaymentHistory[];
  account_status: 'open' | 'closed' | 'transferred' | 'paid';
}

export interface CreditInquiry extends CreditItem {
  item_type: 'inquiry';
  inquiry_type: 'hard' | 'soft';
  inquiry_date: string;
  permissible_purpose?: string;
}

export interface PublicRecord extends CreditItem {
  item_type: 'public_record';
  record_type: 'bankruptcy' | 'tax_lien' | 'judgment' | 'foreclosure';
  filing_date: string;
  court_name?: string;
  case_number?: string;
  amount?: number;
}

export interface Collection extends CreditItem {
  item_type: 'collection';
  original_creditor?: string;
  collection_agency: string;
  collection_date: string;
  original_amount?: number;
}

export interface PaymentHistory {
  date: string;
  status: 'current' | 'late_30' | 'late_60' | 'late_90' | 'late_120' | 'charge_off';
  amount?: number;
  days_late?: number;
}

// Dispute Types
export interface DisputeHistory {
  id: string;
  item_id: string;
  strategy_id: string;
  dispute_date: string;
  bureau: 'experian' | 'equifax' | 'transunion' | 'furnisher';
  dispute_reason: string;
  status: 'pending' | 'investigating' | 'resolved' | 'verified' | 'deleted' | 'modified';
  response_date?: string;
  outcome?: string;
  next_action?: string;
  created_at: string;
}

// Strategy Types
export interface Strategy {
  id: string;
  name: string;
  strategy_type: string;
  legal_basis: string;
  success_rate: number;
  tier: number;
  target_items: string[];
  key_tactics: string[];
  prerequisites?: string[];
  is_active: boolean;
  created_at: string;
}

export interface StrategyExecution {
  id: string;
  user_id: string;
  item_id: string;
  strategy_id: string;
  execution_status: 'pending' | 'executing' | 'completed' | 'failed';
  started_at: string;
  completed_at?: string;
  success?: boolean;
  outcome_details: any;
  next_strategy_recommended?: string;
  created_at: string;
}

export interface StrategyRecommendation {
  strategyId: string;
  itemId: string;
  successProbability: number;
  impactScore: number;
  reasoning: string[];
  expectedTimeline: string;
  legalBasis: string;
  prerequisites: string[];
  contraindications: string[];
}

// AI Analysis Types
export interface AIAnalysis {
  id: string;
  user_id: string;
  item_id: string;
  analysis_type: 'credit_item' | 'portfolio' | 'strategy_selection';
  analysis_data: any;
  confidence_score: number;
  recommendations: string[];
  created_at: string;
}

export interface CreditAnalysis {
  overall_score: number;
  score_factors: ScoreFactor[];
  improvement_opportunities: ImprovementOpportunity[];
  risk_factors: RiskFactor[];
  timeline_estimate: string;
}

export interface ScoreFactor {
  factor: string;
  impact: 'positive' | 'negative' | 'neutral';
  weight: number;
  description: string;
}

export interface ImprovementOpportunity {
  opportunity: string;
  potential_impact: number;
  difficulty: 'easy' | 'medium' | 'hard';
  timeline: string;
  strategies: string[];
}

export interface RiskFactor {
  risk: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
  mitigation: string[];
}

// Document Types
export interface Document {
  id: string;
  user_id: string;
  document_type: 'credit_report' | 'dispute_letter' | 'response_letter' | 'legal_document';
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  metadata: any;
  created_at: string;
}

// Notification Types
export interface Notification {
  id: string;
  user_id: string;
  type: 'dispute_update' | 'strategy_recommendation' | 'credit_score_change' | 'system_alert';
  title: string;
  message: string;
  read: boolean;
  action_url?: string;
  created_at: string;
}

// Subscription Types
export interface Subscription {
  id: string;
  user_id: string;
  plan: 'basic' | 'premium' | 'enterprise';
  status: 'active' | 'canceled' | 'past_due' | 'trialing';
  current_period_start: string;
  current_period_end: string;
  stripe_subscription_id?: string;
  created_at: string;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  has_more: boolean;
}

// Form Types
export interface CreditReportUpload {
  bureau: 'experian' | 'equifax' | 'transunion';
  file: File;
  report_date: string;
}

export interface DisputeForm {
  item_id: string;
  strategy_id: string;
  custom_reason?: string;
  supporting_documents?: File[];
}

// Dashboard Types
export interface DashboardStats {
  total_items: number;
  disputed_items: number;
  resolved_items: number;
  success_rate: number;
  credit_score_change: number;
  active_disputes: number;
}

export interface CreditScoreHistory {
  date: string;
  experian_score?: number;
  equifax_score?: number;
  transunion_score?: number;
}

// Advanced Strategy Types
export interface AdvancedStrategy {
  id: string;
  name: string;
  description: string;
  legal_basis: string;
  success_rate: number;
  complexity: 'basic' | 'intermediate' | 'advanced' | 'expert';
  target_scenarios: string[];
  implementation_steps: ImplementationStep[];
  required_documents: string[];
  timeline: string;
  risks: string[];
  benefits: string[];
}

export interface ImplementationStep {
  step_number: number;
  title: string;
  description: string;
  action_type: 'letter' | 'document' | 'api_call' | 'wait' | 'follow_up';
  template_id?: string;
  wait_days?: number;
  success_criteria: string[];
}

// Letter Template Types
export interface LetterTemplate {
  id: string;
  strategy_id: string;
  template_name: string;
  template_type: 'dispute' | 'validation' | 'goodwill' | 'legal' | 'follow_up';
  content: string;
  variables: TemplateVariable[];
  legal_citations: string[];
  delivery_method: 'mail' | 'email' | 'fax' | 'online_portal';
  created_at: string;
}

export interface TemplateVariable {
  name: string;
  type: 'text' | 'date' | 'number' | 'address' | 'currency';
  required: boolean;
  description: string;
  default_value?: string;
}

// Compliance Types
export interface ComplianceCheck {
  id: string;
  strategy_id: string;
  regulation: 'FCRA' | 'CROA' | 'FDCPA' | 'STATE_LAW';
  section: string;
  requirement: string;
  compliance_status: 'compliant' | 'non_compliant' | 'requires_review';
  notes?: string;
}

export interface LegalViolation {
  id: string;
  item_id: string;
  violation_type: string;
  regulation: string;
  section: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  evidence: string[];
  potential_damages?: number;
  statute_of_limitations?: string;
}

// Utility Types
export type DatabaseTables = 
  | 'profiles'
  | 'credit_reports'
  | 'credit_items'
  | 'strategies'
  | 'strategy_executions'
  | 'dispute_history'
  | 'ai_analysis'
  | 'documents'
  | 'notifications'
  | 'subscriptions';

export type ItemStatus = 'active' | 'disputed' | 'resolved' | 'verified' | 'deleted';
export type DisputeStatus = 'pending' | 'investigating' | 'resolved' | 'verified' | 'deleted' | 'modified';
export type StrategyTier = 1 | 2 | 3 | 4 | 5 | 6;

