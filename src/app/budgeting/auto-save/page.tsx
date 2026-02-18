"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  PiggyBank,
  Plus,
  Settings,
  Play,
  Pause,
  Trash2,
  TrendingUp,
  ArrowRight,
  Zap,
  Target,
  DollarSign,
  RefreshCw,
  ChevronRight,
} from "lucide-react";

type RuleType =
  | "round_up"
  | "percentage"
  | "fixed_amount"
  | "paycheck_split"
  | "surplus_sweep";
type RuleStatus = "active" | "paused" | "disabled";

interface SaveRule {
  id: string;
  name: string;
  type: RuleType;
  status: RuleStatus;
  description: string;
  totalSaved: number;
  transferCount: number;
  lastTriggered?: Date;
  config: {
    amount?: number;
    percentage?: number;
    roundTo?: number;
    multiplier?: number;
    frequency?: string;
  };
}

interface RuleSummary {
  totalRules: number;
  activeRules: number;
  totalSavedThisMonth: number;
  totalSavedAllTime: number;
  projectedMonthlySavings: number;
}

const MOCK_RULES: SaveRule[] = [
  {
    id: "1",
    name: "Round-Up Savings",
    type: "round_up",
    status: "active",
    description:
      "Round up every purchase to nearest $1 and save the difference",
    totalSaved: 847.32,
    transferCount: 245,
    lastTriggered: new Date("2026-01-20"),
    config: { roundTo: 1, multiplier: 1 },
  },
  {
    id: "2",
    name: "Paycheck Split",
    type: "paycheck_split",
    status: "active",
    description: "Save 10% of every paycheck automatically",
    totalSaved: 2400.0,
    transferCount: 24,
    lastTriggered: new Date("2026-01-15"),
    config: { percentage: 10 },
  },
  {
    id: "3",
    name: "Weekly Transfer",
    type: "fixed_amount",
    status: "active",
    description: "Transfer $50 every Friday",
    totalSaved: 1200.0,
    transferCount: 24,
    lastTriggered: new Date("2026-01-17"),
    config: { amount: 50, frequency: "weekly" },
  },
  {
    id: "4",
    name: "Monthly Surplus Sweep",
    type: "surplus_sweep",
    status: "paused",
    description: "Move 50% of checking balance over $1000 to savings",
    totalSaved: 650.0,
    transferCount: 3,
    lastTriggered: new Date("2025-12-01"),
    config: { percentage: 50 },
  },
];

const MOCK_SUMMARY: RuleSummary = {
  totalRules: 4,
  activeRules: 3,
  totalSavedThisMonth: 425.67,
  totalSavedAllTime: 5097.32,
  projectedMonthlySavings: 485.0,
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
};

const getRuleIcon = (type: RuleType) => {
  switch (type) {
    case "round_up":
      return RefreshCw;
    case "percentage":
      return TrendingUp;
    case "fixed_amount":
      return DollarSign;
    case "paycheck_split":
      return Zap;
    case "surplus_sweep":
      return ArrowRight;
    default:
      return PiggyBank;
  }
};

const getRuleColor = (type: RuleType) => {
  switch (type) {
    case "round_up":
      return "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400";
    case "percentage":
      return "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400";
    case "fixed_amount":
      return "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400";
    case "paycheck_split":
      return "bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400";
    case "surplus_sweep":
      return "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400";
    default:
      return "bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300";
  }
};

export default function AutoSavePage() {
  const [rules, setRules] = useState<SaveRule[]>(MOCK_RULES);
  const [summary] = useState<RuleSummary>(MOCK_SUMMARY);

  const toggleRuleStatus = (ruleId: string) => {
    setRules(
      rules.map((rule) => {
        if (rule.id === ruleId) {
          return {
            ...rule,
            status: rule.status === "active" ? "paused" : "active",
          };
        }
        return rule;
      }),
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-emerald-100 dark:bg-emerald-900 rounded-lg">
                <PiggyBank className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Auto-Save Rules
              </h1>
            </div>
            <p className="text-gray-600 dark:text-slate-400">
              Automate your savings with smart rules
            </p>
          </div>

          <button className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors mt-4 sm:mt-0">
            <Plus className="w-4 h-4" />
            Create Rule
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl p-4 text-white"
          >
            <p className="text-emerald-100 text-sm">Total Saved</p>
            <p className="text-2xl font-bold">
              {formatCurrency(summary.totalSavedAllTime)}
            </p>
            <p className="text-emerald-200 text-sm mt-1">All time</p>
          </motion.div>

          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm">
            <p className="text-sm text-gray-500 dark:text-slate-400">
              This Month
            </p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatCurrency(summary.totalSavedThisMonth)}
            </p>
            <div className="flex items-center gap-1 text-sm mt-1 text-green-600">
              <TrendingUp className="w-3 h-3" />
              +12% vs last month
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm">
            <p className="text-sm text-gray-500 dark:text-slate-400">
              Active Rules
            </p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {summary.activeRules}/{summary.totalRules}
            </p>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
              Rules running
            </p>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm">
            <p className="text-sm text-gray-500 dark:text-slate-400">
              Projected
            </p>
            <p className="text-2xl font-bold text-emerald-600">
              {formatCurrency(summary.projectedMonthlySavings)}
            </p>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
              Per month
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            {
              icon: RefreshCw,
              label: "Round-Up",
              desc: "Save spare change",
              type: "round_up" as RuleType,
            },
            {
              icon: Zap,
              label: "Paycheck Split",
              desc: "Auto % from income",
              type: "paycheck_split" as RuleType,
            },
            {
              icon: DollarSign,
              label: "Fixed Transfer",
              desc: "Recurring amount",
              type: "fixed_amount" as RuleType,
            },
            {
              icon: Target,
              label: "Goal-Based",
              desc: "Save for a goal",
              type: "percentage" as RuleType,
            },
          ].map((action) => (
            <button
              key={action.type}
              className="flex flex-col items-center p-4 bg-white dark:bg-slate-800 rounded-xl shadow-sm hover:shadow-md transition-shadow text-center"
            >
              <div
                className={`p-3 rounded-full ${getRuleColor(action.type)} mb-2`}
              >
                <action.icon className="w-5 h-5" />
              </div>
              <span className="font-medium text-gray-900 dark:text-white">
                {action.label}
              </span>
              <span className="text-xs text-gray-500 dark:text-slate-400">
                {action.desc}
              </span>
            </button>
          ))}
        </div>

        {/* Rules List */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Your Save Rules
            </h2>
          </div>

          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {rules.map((rule) => {
              const Icon = getRuleIcon(rule.type);
              return (
                <div
                  key={rule.id}
                  className="p-6 hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div
                        className={`p-3 rounded-lg ${getRuleColor(rule.type)}`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-900 dark:text-white">
                            {rule.name}
                          </h3>
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${rule.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-400"}`}
                          >
                            {rule.status === "active" ? "Active" : "Paused"}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
                          {rule.description}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-sm">
                          <span className="text-emerald-600 font-medium">
                            {formatCurrency(rule.totalSaved)} saved
                          </span>
                          <span className="text-gray-400 dark:text-slate-500">
                            •
                          </span>
                          <span className="text-gray-500 dark:text-slate-400">
                            {rule.transferCount} transfers
                          </span>
                          {rule.lastTriggered && (
                            <>
                              <span className="text-gray-400 dark:text-slate-500">
                                •
                              </span>
                              <span className="text-gray-500 dark:text-slate-400">
                                Last: {rule.lastTriggered.toLocaleDateString()}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleRuleStatus(rule.id)}
                        className={`p-2 rounded-lg transition-colors ${rule.status === "active" ? "bg-amber-100 text-amber-600 hover:bg-amber-200" : "bg-green-100 text-green-600 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400"}`}
                        title={
                          rule.status === "active"
                            ? "Pause rule"
                            : "Resume rule"
                        }
                      >
                        {rule.status === "active" ? (
                          <Pause className="w-4 h-4" />
                        ) : (
                          <Play className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 dark:bg-slate-700 dark:text-slate-400 dark:hover:bg-slate-600"
                        title="Edit rule"
                      >
                        <Settings className="w-4 h-4" />
                      </button>
                      <button
                        className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400"
                        title="Delete rule"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Tips Section */}
        <div className="mt-8 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-6">
          <h3 className="font-semibold text-emerald-900 dark:text-emerald-100 mb-3">
            Savings Tips
          </h3>
          <ul className="space-y-2 text-sm text-emerald-800 dark:text-emerald-200">
            <li className="flex items-start gap-2">
              <ChevronRight className="w-4 h-4 mt-0.5 flex-shrink-0" />
              Round-up savings adds up fast - users save an average of $35/month
            </li>
            <li className="flex items-start gap-2">
              <ChevronRight className="w-4 h-4 mt-0.5 flex-shrink-0" />
              Set up paycheck splits before you see the money to avoid
              temptation
            </li>
            <li className="flex items-start gap-2">
              <ChevronRight className="w-4 h-4 mt-0.5 flex-shrink-0" />
              Start small with 5% and increase by 1% each month
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
