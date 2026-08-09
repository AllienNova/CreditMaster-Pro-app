"use client";

import { useState, useEffect, useCallback } from "react";
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
  AlertTriangle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type {
  SavingsRule as ApiSavingsRule,
  SavingsRuleType,
  SavingsRuleStatus,
  SavingsRuleFrequency,
  SavingsSummary as ApiSavingsSummary,
} from "@/lib/financial/types/savings.types";

/** The page's per-rule view model, mapped from the API `SavingsRule`. */
interface SaveRule {
  id: string;
  name: string;
  type: SavingsRuleType;
  status: SavingsRuleStatus;
  description: string;
  totalSaved: number;
  transferCount: number;
  lastTriggered?: Date;
}

/** The page's summary-card view model, mapped from the API `SavingsSummary`. */
interface RuleSummary {
  totalRules: number;
  activeRules: number;
  totalSavedThisMonth: number;
  totalSavedAllTime: number;
  projectedMonthlySavings: number;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
};

/** Frequency enum → human-readable phrase, used when describing fixed rules. */
const FREQUENCY_LABEL: Record<SavingsRuleFrequency, string> = {
  per_transaction: "per transaction",
  daily: "daily",
  weekly: "weekly",
  biweekly: "every two weeks",
  monthly: "monthly",
};

const getRuleIcon = (type: SavingsRuleType) => {
  switch (type) {
    case "round_up":
      return RefreshCw;
    case "percentage":
      return TrendingUp;
    case "fixed":
      return DollarSign;
    case "surplus":
      return ArrowRight;
    case "goal_based":
      return Target;
    default:
      return PiggyBank;
  }
};

const getRuleColor = (type: SavingsRuleType) => {
  switch (type) {
    case "round_up":
      return "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400";
    case "percentage":
      return "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400";
    case "fixed":
      return "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400";
    case "surplus":
      return "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400";
    case "goal_based":
      return "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400";
    default:
      return "bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300";
  }
};

/**
 * Human-readable description of a rule, computed entirely from the rule's real
 * `type`, `config`, and `frequency`. The API's `SavingsRule` carries no
 * description field, so rather than fabricate copy this restates the rule's
 * actual configuration in words (e.g. real `config.roundUpTo` → "Round up to
 * the nearest $1"). When a specific config value is absent it falls back to a
 * type-generic phrase — still factual about the rule kind, never inventing
 * per-rule numbers.
 */
const describeRule = (rule: ApiSavingsRule): string => {
  const c = rule.config;
  switch (rule.type) {
    case "round_up": {
      const multiplier = c.roundUpMultiplier ?? 1;
      if (c.roundUpTo) {
        return `Round up to the nearest $${c.roundUpTo}${
          multiplier > 1 ? ` (${multiplier}× multiplier)` : ""
        }`;
      }
      return "Round up purchases and save the difference";
    }
    case "percentage": {
      if (c.percentageOfIncome) {
        return `Save ${c.percentageOfIncome}% of income`;
      }
      if (c.percentageOfTransaction) {
        return `Save ${c.percentageOfTransaction}% of every transaction`;
      }
      return "Save a percentage automatically";
    }
    case "fixed": {
      if (c.fixedAmount) {
        return `Transfer ${formatCurrency(c.fixedAmount)} ${
          FREQUENCY_LABEL[rule.frequency]
        }`;
      }
      return "Transfer a fixed amount on a schedule";
    }
    case "surplus": {
      if (c.surplusPercentage && c.surplusThreshold) {
        return `Sweep ${c.surplusPercentage}% of your balance over ${formatCurrency(
          c.surplusThreshold,
        )}`;
      }
      return "Sweep surplus balance into savings";
    }
    case "goal_based": {
      if (c.targetAmount) {
        return `Contribute toward your ${formatCurrency(c.targetAmount)} goal`;
      }
      return "Contribute toward a savings goal";
    }
    default:
      return "Automated savings rule";
  }
};

/**
 * Map an API `SavingsRule` (GET /api/financial/savings?type=all → `data.rules`,
 * withAuth Bearer-authenticated) to the shape this page renders. Field
 * provenance verified against `src/lib/financial/types/savings.types.ts`:
 * - `id`/`name`/`type`/`status`/`totalSaved`/`transferCount` map 1:1 (real).
 * - `lastTriggered` ← `new Date(lastTriggeredAt)` (dates arrive as ISO strings
 *   over JSON; the field is optional, so a rule that never triggered has none).
 * - `description` ← `describeRule(api)`, derived from the rule's real
 *   type + config (the API models no description field).
 */
const mapApiRuleToSaveRule = (api: ApiSavingsRule): SaveRule => ({
  id: api.id,
  name: api.name,
  type: api.type,
  status: api.status,
  description: describeRule(api),
  totalSaved: api.totalSaved,
  transferCount: api.transferCount,
  lastTriggered: api.lastTriggeredAt
    ? new Date(api.lastTriggeredAt)
    : undefined,
});

/**
 * Map the API `SavingsSummary` plus the real rule list to the page's summary
 * cards. `totalRules` is the length of the returned rules array (`SavingsSummary`
 * has no such field); `totalSavedAllTime` ← `summary.totalSaved`; every other
 * value is a server-computed aggregate. When the summary is absent the values
 * fall back to what can be derived from the rules — never fabricated.
 */
const mapApiSummary = (
  summary: ApiSavingsSummary | undefined,
  rules: SaveRule[],
): RuleSummary => ({
  totalRules: rules.length,
  activeRules:
    summary?.activeRules ?? rules.filter((r) => r.status === "active").length,
  totalSavedThisMonth: summary?.totalSavedThisMonth ?? 0,
  totalSavedAllTime:
    summary?.totalSaved ?? rules.reduce((sum, r) => sum + r.totalSaved, 0),
  projectedMonthlySavings: summary?.projectedMonthlySavings ?? 0,
});

/** Shape of GET /api/financial/savings?type=all (fields optional as defensive parsing). */
interface SavingsApiResponse {
  success?: boolean;
  data?: {
    rules?: ApiSavingsRule[];
    summary?: ApiSavingsSummary;
  };
}

interface AutoSaveView {
  rules: SaveRule[];
  summary: RuleSummary;
}

/**
 * Session-guarded fetch of the user's auto-save rules and summary. Returns
 * `null` when the user is not signed in (so the caller can render an honest
 * sign-in prompt); throws on a non-ok response or network failure (no mock
 * fallback).
 */
async function fetchAutoSaveView(): Promise<AutoSaveView | null> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return null;
  }

  const res = await fetch("/api/financial/savings?type=all", {
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  if (!res.ok) {
    throw new Error(`Failed to load auto-save rules (${res.status})`);
  }

  const body = (await res.json()) as SavingsApiResponse;
  const rules = (body.data?.rules ?? []).map(mapApiRuleToSaveRule);
  const summary = mapApiSummary(body.data?.summary, rules);
  return { rules, summary };
}

export default function AutoSavePage() {
  const [rules, setRules] = useState<SaveRule[]>([]);
  const [summary, setSummary] = useState<RuleSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRules = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const view = await fetchAutoSaveView();
      if (!view) {
        setRules([]);
        setSummary(null);
        setError("Sign in to view your auto-save rules.");
        return;
      }
      setRules(view.rules);
      setSummary(view.summary);
    } catch (err) {
      setRules([]);
      setSummary(null);
      setError(
        err instanceof Error ? err.message : "Failed to load auto-save rules.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRules();
  }, [loadRules]);

  // Optimistic local toggle (pause/resume). Persisting the change to the API
  // is a separate mutation task; this read-wiring page keeps the pre-existing
  // client-only behavior.
  const toggleRuleStatus = (ruleId: string) => {
    setRules((prev) =>
      prev.map((rule) =>
        rule.id === ruleId
          ? {
              ...rule,
              status: rule.status === "active" ? "paused" : "active",
            }
          : rule,
      ),
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-slate-400">
            Loading your auto-save rules...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-8 max-w-md w-full text-center">
          <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full w-fit mx-auto mb-4">
            <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Couldn&apos;t load your auto-save rules
          </h2>
          <p className="text-gray-600 dark:text-slate-400 mb-6">{error}</p>
          <button
            onClick={loadRules}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Success path always sets summary; this guard narrows the type and is not
  // reachable in practice.
  if (!summary) {
    return null;
  }

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
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
              Saved so far
            </p>
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
              type: "round_up" as SavingsRuleType,
            },
            {
              icon: Zap,
              label: "Paycheck Split",
              desc: "Auto % from income",
              type: "percentage" as SavingsRuleType,
            },
            {
              icon: DollarSign,
              label: "Fixed Transfer",
              desc: "Recurring amount",
              type: "fixed" as SavingsRuleType,
            },
            {
              icon: Target,
              label: "Goal-Based",
              desc: "Save for a goal",
              type: "goal_based" as SavingsRuleType,
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

          {rules.length === 0 ? (
            <div className="p-12 text-center">
              <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-full w-fit mx-auto mb-4">
                <PiggyBank className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                No auto-save rules yet
              </h3>
              <p className="text-gray-600 dark:text-slate-400">
                Create your first rule to start saving automatically.
              </p>
            </div>
          ) : (
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
                              {rule.status.charAt(0).toUpperCase() +
                                rule.status.slice(1)}
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
                                  Last:{" "}
                                  {rule.lastTriggered.toLocaleDateString()}
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
          )}
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
