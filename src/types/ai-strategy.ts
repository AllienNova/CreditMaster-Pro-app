import type { JsonValue } from "./student-loan";

export interface StrategyDetailSummary {
  strategy_name?: string;
  strategy_type?: string;
  priority_rank?: number;
  success_probability?: number;
  estimated_timeline?: number;
  expected_outcomes?: string[];
  risk_level?: string;
  automation_level?: number;
}

export interface StrategyOrchestrationSummary {
  primary_strategy?: StrategyDetailSummary;
  strategy_type?: string;
  parallel_strategies?: StrategyDetailSummary[];
  contingency_strategies?: StrategyDetailSummary[];
  success_metrics?: {
    primary_metrics?: string[];
    secondary_metrics?: string[];
    target_values?: Record<string, number>;
  };
}

export interface MonitoringPlanSummary {
  checkpoints?: Array<Record<string, JsonValue>>;
  frequency?: string;
  key_metrics?: Record<string, JsonValue>;
  escalation_triggers?: string[];
}

export interface PredictiveAnalysisSummary {
  predicted_success_rate: number;
  predicted_timeline: number;
  predicted_credit_impact: number;
  predicted_financial_impact: number;
  confidence_level: number;
  key_success_factors: string[];
  potential_obstacles: string[];
  mitigation_strategies: string[];
}

export interface AIStrategySummary {
  loan_id: string;
  recommendation_id: string;
  ai_confidence_score: number;
  decision_matrix?: Record<string, JsonValue>;
  strategy_orchestration?: StrategyOrchestrationSummary;
  predictive_analysis: PredictiveAnalysisSummary;
  automation_level: number;
  expected_outcomes: string[];
  risk_mitigation: string[];
  monitoring_plan?: MonitoringPlanSummary;
  created_at: string | Date;
}

export interface ExecutionPlanAction {
  action_name?: string;
  primary_strategy?: string;
  strategy_type?: string;
  description?: string;
  details?: Record<string, JsonValue>;
}

export interface ManualInterventionTask {
  task_name?: string;
  step_name?: string;
  description?: string;
  action?: string;
  deadline?: string | Date;
}

export interface MonitoringScheduleSummary {
  estimated_timeline?: number;
  parallel_execution_groups?: Array<Record<string, JsonValue>>;
  success_probability?: number;
  risk_level?: string;
}

export interface StrategyExecutionPlanSummary {
  execution_id: string;
  recommendation_id: string;
  loan_id: string;
  status: string;
  started_at?: string | Date;
  completed_at?: string | Date;
  automated_actions?: ExecutionPlanAction[];
  manual_interventions?: ManualInterventionTask[];
  monitoring_schedule?: MonitoringScheduleSummary;
}
