/**
 * Analytics Module
 *
 * Central export for all analytics functionality:
 * - Analytics Engine: Core analytics calculations
 * - Report Generator: Report generation in multiple formats
 * - Data Aggregator: Data aggregation and statistical analysis
 */

export {
  AnalyticsEngine,
  type UserAnalytics,
  type DisputeAnalytics,
  type StrategyAnalytics,
  type WorkflowAnalytics,
  type AIUsageAnalytics,
  type FinancialImpact,
  type TimeSeriesData,
  type AnalyticsReport,
} from "./analytics-engine";

export {
  ReportGenerator,
  type ReportFormat,
  type ReportOptions,
  type GeneratedReport,
} from "./report-generator";

export {
  DataAggregator,
  type AggregationOptions,
  type AggregatedData,
  type StatisticalSummary,
  type TrendAnalysis,
} from "./data-aggregator";
