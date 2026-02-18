"use client";

import { useState } from "react";
import type {
  StrategyExecutionPlanSummary,
  ExecutionPlanAction,
  ManualInterventionTask,
} from "@/types/ai-strategy";

interface ExecutionPlanProps {
  plan: StrategyExecutionPlanSummary;
}

export default function ExecutionPlan({ plan }: ExecutionPlanProps) {
  const [expandedStep, setExpandedStep] = useState<number | null>(null);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
        return "bg-green-100 text-green-800 border-green-300";
      case "in_progress":
        return "bg-blue-100 text-blue-800 border-blue-300";
      case "pending":
        return "bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-slate-100 border-gray-300 dark:border-slate-600";
      case "failed":
        return "bg-red-100 text-red-800 border-red-300";
      default:
        return "bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-slate-100 border-gray-300 dark:border-slate-600";
    }
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="space-y-6">
      {/* Plan Header */}
      <div className="bg-gradient-to-r from-blue-50 to-blue-50 rounded-lg p-6 border border-blue-200">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Execution Plan
            </h2>
            <p className="text-gray-700 dark:text-slate-200">
              ID: <span className="font-mono text-sm">{plan.execution_id}</span>
            </p>
          </div>
          <span
            className={`px-4 py-2 rounded-full text-sm font-medium border ${getStatusColor(plan.status)}`}
          >
            {plan.status
              .replace(/_/g, " ")
              .replace(/\b\w/g, (l: string) => l.toUpperCase())}
          </span>
        </div>

        {/* Timeline */}
        <div className="grid grid-cols-2 gap-4 mt-4">
          {plan.started_at && (
            <div>
              <p className="text-xs text-gray-600 dark:text-slate-300 mb-1">
                Started
              </p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {formatDate(plan.started_at)}
              </p>
            </div>
          )}
          {plan.completed_at && (
            <div>
              <p className="text-xs text-gray-600 dark:text-slate-300 mb-1">
                Completed
              </p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {formatDate(plan.completed_at)}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Automated Actions */}
      {plan.automated_actions && plan.automated_actions.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-6">
          <div className="flex items-center gap-2 mb-4">
            <svg
              className="w-6 h-6 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Automated Actions
            </h3>
            <span className="ml-auto px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
              {plan.automated_actions.length} actions
            </span>
          </div>

          <div className="space-y-3">
            {plan.automated_actions.map(
              (action: ExecutionPlanAction, index: number) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 dark:bg-slate-800 transition-colors cursor-pointer"
                  onClick={() =>
                    setExpandedStep(expandedStep === index ? null : index)
                  }
                >
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-1">
                      {action.action_name ||
                        action.primary_strategy ||
                        `Action ${index + 1}`}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-slate-300">
                      {action.description ||
                        action.strategy_type ||
                        "Automated action"}
                    </p>
                    {expandedStep === index && action.details && (
                      <div className="mt-3 p-3 bg-white dark:bg-slate-800 rounded border border-gray-200 dark:border-slate-700">
                        <pre className="text-xs text-gray-700 dark:text-slate-200 whitespace-pre-wrap">
                          {JSON.stringify(action.details, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                  <svg
                    className={`w-5 h-5 text-gray-400 dark:text-slate-500 transition-transform ${
                      expandedStep === index ? "rotate-180" : ""
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </div>
              ),
            )}
          </div>
        </div>
      )}

      {/* Manual Interventions */}
      {plan.manual_interventions && plan.manual_interventions.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-6">
          <div className="flex items-center gap-2 mb-4">
            <svg
              className="w-6 h-6 text-orange-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Manual Interventions Required
            </h3>
            <span className="ml-auto px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-medium">
              {plan.manual_interventions.length} tasks
            </span>
          </div>

          <div className="space-y-3">
            {plan.manual_interventions.map(
              (intervention: ManualInterventionTask, index: number) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-4 bg-orange-50 rounded-lg border border-orange-200"
                >
                  <input
                    type="checkbox"
                    className="mt-1 w-5 h-5 text-blue-600 border-gray-300 dark:border-slate-600 rounded focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-1">
                      {intervention.task_name ||
                        intervention.step_name ||
                        `Task ${index + 1}`}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-slate-300 mb-2">
                      {intervention.description ||
                        intervention.action ||
                        "Manual task required"}
                    </p>
                    {intervention.deadline && (
                      <p className="text-xs text-orange-700">
                        ⏰ Due: {formatDate(intervention.deadline)}
                      </p>
                    )}
                  </div>
                </div>
              ),
            )}
          </div>
        </div>
      )}

      {/* Monitoring Schedule */}
      {plan.monitoring_schedule && (
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-6">
          <div className="flex items-center gap-2 mb-4">
            <svg
              className="w-6 h-6 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Monitoring Schedule
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {plan.monitoring_schedule.estimated_timeline && (
              <div className="p-4 bg-gray-50 dark:bg-slate-900 rounded-lg">
                <p className="text-xs text-gray-600 dark:text-slate-300 mb-1">
                  Estimated Timeline
                </p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  {plan.monitoring_schedule.estimated_timeline} days
                </p>
              </div>
            )}

            {plan.monitoring_schedule.parallel_execution_groups && (
              <div className="p-4 bg-gray-50 dark:bg-slate-900 rounded-lg">
                <p className="text-xs text-gray-600 dark:text-slate-300 mb-1">
                  Parallel Groups
                </p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  {plan.monitoring_schedule.parallel_execution_groups.length}
                </p>
              </div>
            )}

            {plan.monitoring_schedule.success_probability && (
              <div className="p-4 bg-gray-50 dark:bg-slate-900 rounded-lg">
                <p className="text-xs text-gray-600 dark:text-slate-300 mb-1">
                  Success Probability
                </p>
                <p className="text-lg font-bold text-green-600">
                  {Math.round(
                    plan.monitoring_schedule.success_probability * 100,
                  )}
                  %
                </p>
              </div>
            )}

            {plan.monitoring_schedule.risk_level && (
              <div className="p-4 bg-gray-50 dark:bg-slate-900 rounded-lg">
                <p className="text-xs text-gray-600 dark:text-slate-300 mb-1">
                  Risk Level
                </p>
                <p className="text-lg font-bold text-gray-900 dark:text-white capitalize">
                  {plan.monitoring_schedule.risk_level}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-4">
        <button className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
          Start Execution
        </button>
        <button className="px-6 py-3 bg-white border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-200 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 dark:bg-slate-900 transition-colors font-medium">
          Export Plan
        </button>
        <button className="px-6 py-3 bg-white border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-200 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 dark:bg-slate-900 transition-colors font-medium">
          Schedule Review
        </button>
      </div>
    </div>
  );
}
