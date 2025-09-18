// ML-specific type definitions for CreditMaster Pro

export interface MLPrediction {
  id: string;
  user_id: string;
  prediction_type: 'credit_score' | 'dispute_success' | 'fraud_detection' | 'optimization';
  model_version: string;
  confidence_level: number;
  prediction_date: string;
  actual_outcome?: any;
  accuracy_score?: number;
}

export interface CreditScorePrediction extends MLPrediction {
  timeframe: '30_days' | '60_days' | '90_days' | '180_days' | '1_year';
  predicted_score: number;
  confidence_interval: [number, number];
  contributing_factors: Array<{
    factor: string;
    impact: number;
    direction: 'positive' | 'negative';
  }>;
  baseline_score: number;
  action_impact: number;
}

export interface DisputeSuccessPrediction extends MLPrediction {
  success_probability: number;
  risk_factors: string[];
  optimization_recommendations: string[];
  expected_timeline_days: number;
  alternative_strategies: string[];
  optimal_timing: Date;
}

export interface PersonalizedStrategy {
  strategy_id: string;
  strategy_name: string;
  personalization_score: number;
  user_fit_reasons: string[];
  expected_user_effort: 'low' | 'medium' | 'high';
  success_factors: string[];
  customizations: Array<{
    parameter: string;
    value: any;
    reason: string;
  }>;
  execution_order: number;
  dependencies: string[];
}

export interface BehaviorInsights {
  credit_behavior_profile: 'conservative' | 'moderate' | 'aggressive' | 'rebuilding';
  spending_patterns: Array<{
    category: string;
    trend: 'increasing' | 'decreasing' | 'stable';
    impact_on_credit: number;
  }>;
  utilization_patterns: {
    average_utilization: number;
    utilization_trend: 'improving' | 'worsening' | 'stable';
    optimal_utilization: number;
    recommendations: string[];
  };
  payment_behavior: {
    payment_consistency: number;
    payment_timing: 'early' | 'on_time' | 'late';
    missed_payments_trend: 'improving' | 'worsening' | 'stable';
    recommendations: string[];
  };
  risk_indicators: string[];
  improvement_opportunities: OptimizationOpportunity[];
  behavioral_score: number;
  recommendations: string[];
}

export interface FraudAlert {
  id: string;
  alert_type: 'identity_theft' | 'account_fraud' | 'synthetic_identity' | 'suspicious_activity';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  affected_items: string[];
  evidence: Array<{
    type: string;
    description: string;
    confidence: number;
  }>;
  risk_score: number;
  confidence_level: number;
  recommended_actions: string[];
  created_date: string;
  status: 'active' | 'investigating' | 'resolved' | 'false_positive';
}

export interface OptimizationOpportunity {
  id: string;
  opportunity_type: 'utilization' | 'payment_timing' | 'account_management' | 'credit_mix' | 'dispute_strategy';
  title: string;
  description: string;
  potential_impact: {
    score_improvement: number;
    timeline_days: number;
    confidence: number;
  };
  required_actions: Array<{
    action: string;
    effort_level: 'low' | 'medium' | 'high';
    timeline: string;
  }>;
  impact_score: number;
  effort_score: number;
  roi_score: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  prerequisites: string[];
}

export interface MLModelPerformance {
  model_name: string;
  model_version: string;
  accuracy: number;
  precision: number;
  recall: number;
  f1_score: number;
  training_data_size: number;
  validation_data_size: number;
  last_trained: string;
  performance_trend: 'improving' | 'stable' | 'declining';
  feature_importance: Array<{
    feature: string;
    importance: number;
  }>;
}

export interface PredictiveAnalytics {
  credit_score_projections: CreditScorePrediction[];
  dispute_success_rates: Array<{
    strategy_id: string;
    success_rate: number;
    confidence: number;
    sample_size: number;
  }>;
  optimization_timeline: Array<{
    month: number;
    projected_score: number;
    key_actions: string[];
  }>;
  risk_assessment: {
    overall_risk: 'low' | 'medium' | 'high';
    risk_factors: Array<{
      factor: string;
      impact: number;
      mitigation: string;
    }>;
  };
}

export interface AdvancedMLFeatures {
  adaptive_learning: {
    enabled: boolean;
    learning_rate: number;
    feedback_integration: boolean;
    model_updates: 'real_time' | 'batch' | 'scheduled';
  };
  ensemble_methods: {
    models: string[];
    voting_strategy: 'majority' | 'weighted' | 'stacking';
    confidence_threshold: number;
  };
  feature_engineering: {
    automated_features: boolean;
    feature_selection: 'automatic' | 'manual' | 'hybrid';
    dimensionality_reduction: boolean;
  };
  explainable_ai: {
    feature_importance: boolean;
    decision_trees: boolean;
    lime_explanations: boolean;
    shap_values: boolean;
  };
}

export interface MLTrainingData {
  id: string;
  data_type: 'credit_profile' | 'dispute_outcome' | 'user_behavior' | 'market_data';
  features: Record<string, any>;
  target_variable: any;
  data_quality_score: number;
  created_date: string;
  validation_status: 'pending' | 'validated' | 'rejected';
  privacy_level: 'public' | 'anonymized' | 'private';
}

export interface ModelValidation {
  validation_id: string;
  model_name: string;
  validation_type: 'cross_validation' | 'holdout' | 'time_series' | 'bootstrap';
  metrics: {
    accuracy: number;
    precision: number;
    recall: number;
    f1_score: number;
    auc_roc: number;
    mean_squared_error?: number;
    mean_absolute_error?: number;
  };
  validation_date: string;
  data_split: {
    training_size: number;
    validation_size: number;
    test_size: number;
  };
  performance_by_segment: Array<{
    segment: string;
    metrics: Record<string, number>;
  }>;
}

export interface AutoMLConfiguration {
  enabled: boolean;
  algorithms: string[];
  hyperparameter_tuning: {
    method: 'grid_search' | 'random_search' | 'bayesian_optimization';
    max_iterations: number;
    optimization_metric: string;
  };
  feature_selection: {
    method: 'recursive_elimination' | 'lasso' | 'mutual_information';
    max_features: number;
  };
  model_selection: {
    cross_validation_folds: number;
    scoring_metric: string;
    ensemble_methods: boolean;
  };
}

export interface RealTimeMLPipeline {
  pipeline_id: string;
  status: 'active' | 'paused' | 'error' | 'maintenance';
  data_sources: string[];
  processing_steps: Array<{
    step_name: string;
    step_type: 'preprocessing' | 'feature_engineering' | 'prediction' | 'postprocessing';
    configuration: Record<string, any>;
  }>;
  output_destinations: string[];
  performance_metrics: {
    throughput: number;
    latency_ms: number;
    error_rate: number;
    uptime_percentage: number;
  };
  last_updated: string;
}

export interface MLExperiment {
  experiment_id: string;
  experiment_name: string;
  hypothesis: string;
  model_configurations: Array<{
    model_name: string;
    hyperparameters: Record<string, any>;
    features: string[];
  }>;
  results: Array<{
    model_name: string;
    metrics: Record<string, number>;
    training_time: number;
    inference_time: number;
  }>;
  conclusion: string;
  next_steps: string[];
  created_date: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
}

export interface FeatureStore {
  feature_id: string;
  feature_name: string;
  feature_type: 'numerical' | 'categorical' | 'text' | 'datetime' | 'boolean';
  description: string;
  computation_logic: string;
  data_sources: string[];
  update_frequency: 'real_time' | 'hourly' | 'daily' | 'weekly' | 'monthly';
  quality_metrics: {
    completeness: number;
    accuracy: number;
    consistency: number;
    timeliness: number;
  };
  usage_statistics: {
    models_using: string[];
    importance_scores: Record<string, number>;
    last_accessed: string;
  };
}

export interface MLMonitoring {
  model_name: string;
  monitoring_metrics: {
    prediction_drift: number;
    data_drift: number;
    model_performance: number;
    feature_importance_changes: Record<string, number>;
  };
  alerts: Array<{
    alert_type: 'performance_degradation' | 'data_drift' | 'prediction_drift' | 'system_error';
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    timestamp: string;
    resolved: boolean;
  }>;
  retraining_recommendations: {
    should_retrain: boolean;
    confidence: number;
    reasons: string[];
    estimated_improvement: number;
  };
}

// Export all types
export type {
  MLPrediction,
  CreditScorePrediction,
  DisputeSuccessPrediction,
  PersonalizedStrategy,
  BehaviorInsights,
  FraudAlert,
  OptimizationOpportunity,
  MLModelPerformance,
  PredictiveAnalytics,
  AdvancedMLFeatures,
  MLTrainingData,
  ModelValidation,
  AutoMLConfiguration,
  RealTimeMLPipeline,
  MLExperiment,
  FeatureStore,
  MLMonitoring
};

