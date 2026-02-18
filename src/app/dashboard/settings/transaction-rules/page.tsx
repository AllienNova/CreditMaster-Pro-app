"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  SparklesIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  CheckIcon,
  XMarkIcon,
  ArrowPathIcon,
  PlayIcon,
} from "@heroicons/react/24/outline";
import { EmptyState } from "@/components/ui/EmptyState";
import { PullToRefresh } from "@/components/ui/PullToRefresh";

// ============================================================================
// Types
// ============================================================================

type ConditionType =
  | "merchant_contains"
  | "merchant_equals"
  | "amount_equals"
  | "amount_greater_than"
  | "amount_less_than"
  | "category_equals";
type ActionType =
  | "set_category"
  | "add_tag"
  | "mark_tax_deductible"
  | "rename_merchant";

interface RuleCondition {
  type: ConditionType;
  value: string | number;
}

interface RuleAction {
  type: ActionType;
  value: string | number | boolean;
}

interface TransactionRule {
  id: string;
  name: string;
  description?: string;
  conditions: RuleCondition[];
  conditionLogic: "AND" | "OR";
  actions: RuleAction[];
  isActive: boolean;
  priority: number;
  matchCount: number;
}

// ============================================================================
// Mock Data
// ============================================================================

const mockRules: TransactionRule[] = [
  {
    id: "1",
    name: "Coffee Shops → Food & Dining",
    description: "Categorize all coffee shop purchases",
    conditions: [
      { type: "merchant_contains", value: "starbucks" },
      { type: "merchant_contains", value: "coffee" },
    ],
    conditionLogic: "OR",
    actions: [{ type: "set_category", value: "Food & Dining" }],
    isActive: true,
    priority: 1,
    matchCount: 47,
  },
  {
    id: "2",
    name: "Amazon → Shopping",
    description: "All Amazon purchases are shopping",
    conditions: [{ type: "merchant_contains", value: "amazon" }],
    conditionLogic: "AND",
    actions: [
      { type: "set_category", value: "Shopping" },
      { type: "add_tag", value: "online" },
    ],
    isActive: true,
    priority: 2,
    matchCount: 23,
  },
  {
    id: "3",
    name: "Tax Deductible Expenses",
    description: "Mark work-related expenses as tax deductible",
    conditions: [
      { type: "merchant_contains", value: "office" },
      { type: "amount_greater_than", value: 25 },
    ],
    conditionLogic: "AND",
    actions: [
      { type: "mark_tax_deductible", value: true },
      { type: "add_tag", value: "business" },
    ],
    isActive: false,
    priority: 3,
    matchCount: 8,
  },
];

const categories = [
  "Food & Dining",
  "Shopping",
  "Transportation",
  "Entertainment",
  "Bills & Utilities",
  "Health & Fitness",
  "Travel",
  "Income",
  "Transfer",
  "Uncategorized",
];

const conditionLabels: Record<ConditionType, string> = {
  merchant_contains: "Merchant contains",
  merchant_equals: "Merchant equals",
  amount_equals: "Amount equals",
  amount_greater_than: "Amount greater than",
  amount_less_than: "Amount less than",
  category_equals: "Category equals",
};

const actionLabels: Record<ActionType, string> = {
  set_category: "Set category to",
  add_tag: "Add tag",
  mark_tax_deductible: "Mark as tax deductible",
  rename_merchant: "Rename merchant to",
};

// ============================================================================
// Helper Components
// ============================================================================

function ConditionBadge({ condition }: { condition: RuleCondition }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded text-xs">
      <span className="font-medium">{conditionLabels[condition.type]}</span>
      <span className="text-blue-500">"{condition.value}"</span>
    </span>
  );
}

function ActionBadge({ action }: { action: RuleAction }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 rounded text-xs">
      <span className="font-medium">{actionLabels[action.type]}</span>
      <span className="text-emerald-500">
        {typeof action.value === "boolean"
          ? action.value
            ? "Yes"
            : "No"
          : `"${action.value}"`}
      </span>
    </span>
  );
}

function RuleCard({
  rule,
  onEdit,
  onDelete,
  onToggle,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}: {
  rule: TransactionRule;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  return (
    <div
      className={`bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4 ${!rule.isActive ? "opacity-60" : ""}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <button
              onClick={onToggle}
              className={`w-10 h-6 rounded-full transition-colors relative ${rule.isActive ? "bg-emerald-500" : "bg-gray-300 dark:bg-slate-600"}`}
            >
              <span
                className={`absolute top-1 w-4 h-4 bg-white dark:bg-slate-800 rounded-full transition-transform ${rule.isActive ? "left-5" : "left-1"}`}
              />
            </button>
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {rule.name}
            </h3>
            <span className="text-xs text-gray-500 dark:text-slate-400 bg-gray-100 dark:bg-slate-700 px-2 py-0.5 rounded">
              {rule.matchCount} matches
            </span>
          </div>

          {rule.description && (
            <p className="text-sm text-gray-500 dark:text-slate-400 mb-3">
              {rule.description}
            </p>
          )}

          {/* Conditions */}
          <div className="mb-2">
            <span className="text-xs text-gray-500 dark:text-slate-400 mr-2">
              IF
            </span>
            <div className="inline-flex flex-wrap gap-1">
              {rule.conditions.map((condition, i) => (
                <React.Fragment key={i}>
                  <ConditionBadge condition={condition} />
                  {i < rule.conditions.length - 1 && (
                    <span className="text-xs text-gray-400 dark:text-slate-500 self-center px-1">
                      {rule.conditionLogic}
                    </span>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div>
            <span className="text-xs text-gray-500 dark:text-slate-400 mr-2">
              THEN
            </span>
            <div className="inline-flex flex-wrap gap-1">
              {rule.actions.map((action, i) => (
                <ActionBadge key={i} action={action} />
              ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-1">
          <div className="flex gap-1">
            <button
              onClick={onMoveUp}
              disabled={isFirst}
              className="p-1.5 text-gray-400 hover:text-gray-600 dark:text-slate-300 dark:hover:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronUpIcon className="w-4 h-4" />
            </button>
            <button
              onClick={onMoveDown}
              disabled={isLast}
              className="p-1.5 text-gray-400 hover:text-gray-600 dark:text-slate-300 dark:hover:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronDownIcon className="w-4 h-4" />
            </button>
          </div>
          <button
            onClick={onEdit}
            className="p-1.5 text-gray-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400"
          >
            <PencilIcon className="w-4 h-4" />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 text-gray-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400"
          >
            <TrashIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function RuleBuilder({
  onSave,
  onCancel,
  initialRule,
}: {
  onSave: (rule: Partial<TransactionRule>) => void;
  onCancel: () => void;
  initialRule?: TransactionRule;
}) {
  const [name, setName] = useState(initialRule?.name || "");
  const [description, setDescription] = useState(
    initialRule?.description || "",
  );
  const [conditions, setConditions] = useState<RuleCondition[]>(
    initialRule?.conditions || [{ type: "merchant_contains", value: "" }],
  );
  const [conditionLogic, setConditionLogic] = useState<"AND" | "OR">(
    initialRule?.conditionLogic || "AND",
  );
  const [actions, setActions] = useState<RuleAction[]>(
    initialRule?.actions || [{ type: "set_category", value: "Uncategorized" }],
  );

  const addCondition = () => {
    setConditions([...conditions, { type: "merchant_contains", value: "" }]);
  };

  const removeCondition = (index: number) => {
    setConditions(conditions.filter((_, i) => i !== index));
  };

  const updateCondition = (index: number, updates: Partial<RuleCondition>) => {
    setConditions(
      conditions.map((c, i) => (i === index ? { ...c, ...updates } : c)),
    );
  };

  const addAction = () => {
    setActions([...actions, { type: "add_tag", value: "" }]);
  };

  const removeAction = (index: number) => {
    setActions(actions.filter((_, i) => i !== index));
  };

  const updateAction = (index: number, updates: Partial<RuleAction>) => {
    setActions(actions.map((a, i) => (i === index ? { ...a, ...updates } : a)));
  };

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({
      id: initialRule?.id,
      name: name.trim(),
      description: description.trim() || undefined,
      conditions,
      conditionLogic,
      actions,
      isActive: initialRule?.isActive ?? true,
    });
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        {initialRule ? "Edit Rule" : "Create New Rule"}
      </h2>

      {/* Name & Description */}
      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
            Rule Name *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Coffee Shops → Food & Dining"
            className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
            Description (optional)
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe what this rule does"
            className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Conditions */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium text-gray-900 dark:text-white">
            Conditions
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 dark:text-slate-400">
              Match
            </span>
            <select
              value={conditionLogic}
              onChange={(e) =>
                setConditionLogic(e.target.value as "AND" | "OR")
              }
              className="px-2 py-1 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded text-sm"
            >
              <option value="AND">ALL conditions</option>
              <option value="OR">ANY condition</option>
            </select>
          </div>
        </div>

        <div className="space-y-3">
          {conditions.map((condition, index) => (
            <div
              key={index}
              className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2"
            >
              <select
                value={condition.type}
                onChange={(e) =>
                  updateCondition(index, {
                    type: e.target.value as ConditionType,
                  })
                }
                className="px-3 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg text-sm flex-shrink-0"
              >
                {Object.entries(conditionLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>

              <div className="flex items-center gap-2 flex-1 min-w-0">
                {condition.type === "category_equals" ? (
                  <select
                    value={condition.value as string}
                    onChange={(e) =>
                      updateCondition(index, { value: e.target.value })
                    }
                    className="flex-1 px-3 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg text-sm min-w-0"
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={condition.type.includes("amount") ? "number" : "text"}
                    value={condition.value}
                    onChange={(e) =>
                      updateCondition(index, {
                        value: condition.type.includes("amount")
                          ? parseFloat(e.target.value) || 0
                          : e.target.value,
                      })
                    }
                    placeholder="Value"
                    className="flex-1 px-3 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg text-sm min-w-0"
                  />
                )}

                {conditions.length > 1 && (
                  <button
                    onClick={() => removeCondition(index)}
                    className="p-2 text-gray-400 dark:text-slate-500 hover:text-red-600 flex-shrink-0"
                  >
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={addCondition}
          className="mt-3 text-sm text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1"
        >
          <PlusIcon className="w-4 h-4" />
          Add condition
        </button>
      </div>

      {/* Actions */}
      <div className="mb-6">
        <h3 className="font-medium text-gray-900 dark:text-white mb-3">
          Actions
        </h3>

        <div className="space-y-3">
          {actions.map((action, index) => (
            <div key={index} className="flex items-center gap-2">
              <select
                value={action.type}
                onChange={(e) =>
                  updateAction(index, {
                    type: e.target.value as ActionType,
                    value: "",
                  })
                }
                className="px-3 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg text-sm"
              >
                {Object.entries(actionLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>

              {action.type === "set_category" ? (
                <select
                  value={action.value as string}
                  onChange={(e) =>
                    updateAction(index, { value: e.target.value })
                  }
                  className="flex-1 px-3 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg text-sm"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              ) : action.type === "mark_tax_deductible" ? (
                <select
                  value={action.value ? "true" : "false"}
                  onChange={(e) =>
                    updateAction(index, { value: e.target.value === "true" })
                  }
                  className="flex-1 px-3 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg text-sm"
                >
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              ) : (
                <input
                  type="text"
                  value={action.value as string}
                  onChange={(e) =>
                    updateAction(index, { value: e.target.value })
                  }
                  placeholder="Value"
                  className="flex-1 px-3 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg text-sm"
                />
              )}

              {actions.length > 1 && (
                <button
                  onClick={() => removeAction(index)}
                  className="p-2 text-gray-400 dark:text-slate-500 hover:text-red-600"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>

        <button
          onClick={addAction}
          className="mt-3 text-sm text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1"
        >
          <PlusIcon className="w-4 h-4" />
          Add action
        </button>
      </div>

      {/* Save/Cancel */}
      <div className="flex justify-end gap-3">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={!name.trim()}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {initialRule ? "Update Rule" : "Create Rule"}
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function TransactionRulesPage() {
  const [rules, setRules] = useState<TransactionRule[]>(mockRules);
  const [isLoading, setIsLoading] = useState(true);
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingRule, setEditingRule] = useState<TransactionRule | null>(null);

  const loadData = useCallback(async () => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    setRules(mockRules);
  }, []);

  useEffect(() => {
    loadData().then(() => setIsLoading(false));
  }, [loadData]);

  const handleSave = (ruleData: Partial<TransactionRule>) => {
    if (editingRule) {
      setRules(
        rules.map((r) =>
          r.id === editingRule.id
            ? ({ ...r, ...ruleData } as TransactionRule)
            : r,
        ),
      );
    } else {
      const newRule: TransactionRule = {
        ...(ruleData as TransactionRule),
        id: Date.now().toString(),
        matchCount: 0,
        priority: rules.length,
      };
      setRules([...rules, newRule]);
    }
    setShowBuilder(false);
    setEditingRule(null);
  };

  const handleEdit = (rule: TransactionRule) => {
    setEditingRule(rule);
    setShowBuilder(true);
  };

  const handleDelete = (ruleId: string) => {
    setRules(rules.filter((r) => r.id !== ruleId));
  };

  const handleToggle = (ruleId: string) => {
    setRules(
      rules.map((r) => (r.id === ruleId ? { ...r, isActive: !r.isActive } : r)),
    );
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newRules = [...rules];
    [newRules[index - 1], newRules[index]] = [
      newRules[index],
      newRules[index - 1],
    ];
    setRules(newRules.map((r, i) => ({ ...r, priority: i })));
  };

  const handleMoveDown = (index: number) => {
    if (index === rules.length - 1) return;
    const newRules = [...rules];
    [newRules[index], newRules[index + 1]] = [
      newRules[index + 1],
      newRules[index],
    ];
    setRules(newRules.map((r, i) => ({ ...r, priority: i })));
  };

  const handleRefresh = useCallback(async () => {
    await loadData();
  }, [loadData]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-4 sm:p-6">
        <div className="max-w-4xl mx-auto animate-pulse space-y-6">
          {/* Header skeleton */}
          <div className="flex items-center justify-between">
            <div>
              <div className="h-7 bg-gray-200 dark:bg-slate-700 rounded w-48 mb-2"></div>
              <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-64"></div>
            </div>
            <div className="h-10 bg-gray-200 dark:bg-slate-700 rounded-lg w-32"></div>
          </div>
          {/* Rule cards skeleton */}
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5"
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-gray-200 dark:bg-slate-700 rounded-lg"></div>
                <div className="flex-1">
                  <div className="h-5 bg-gray-200 dark:bg-slate-700 rounded w-40 mb-2"></div>
                  <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-full mb-3"></div>
                  <div className="flex gap-2">
                    <div className="h-6 bg-gray-200 dark:bg-slate-700 rounded-full w-20"></div>
                    <div className="h-6 bg-gray-200 dark:bg-slate-700 rounded-full w-24"></div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <PullToRefresh
      onRefresh={handleRefresh}
      className="min-h-screen bg-gray-50 dark:bg-slate-900 p-6"
    >
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Transaction Rules
            </h1>
            <p className="text-gray-500 dark:text-slate-400">
              Automatically categorize and tag transactions
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => loadData()}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-gray-200"
            >
              <ArrowPathIcon className="w-5 h-5" />
            </button>
            {!showBuilder && (
              <button
                onClick={() => {
                  setEditingRule(null);
                  setShowBuilder(true);
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium flex items-center gap-2"
              >
                <PlusIcon className="w-5 h-5" />
                New Rule
              </button>
            )}
          </div>
        </div>

        {/* AI Suggestions Banner */}
        {!showBuilder && (
          <div className="bg-gradient-to-r from-blue-500 to-blue-500 rounded-xl p-5 mb-6 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white dark:bg-slate-800/20 rounded-lg">
                  <SparklesIcon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">AI-Suggested Rules</h3>
                  <p className="text-white/80 text-sm">
                    We found 3 patterns in your transactions that could save you
                    time
                  </p>
                </div>
              </div>
              <button className="px-4 py-2 bg-white text-blue-600 rounded-lg font-medium hover:bg-white dark:bg-slate-800/90 transition-colors">
                View Suggestions
              </button>
            </div>
          </div>
        )}

        {/* Rule Builder */}
        {showBuilder && (
          <div className="mb-6">
            <RuleBuilder
              initialRule={editingRule || undefined}
              onSave={handleSave}
              onCancel={() => {
                setShowBuilder(false);
                setEditingRule(null);
              }}
            />
          </div>
        )}

        {/* Rules List */}
        {!showBuilder && (
          <div className="space-y-4">
            {rules.length === 0 ? (
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
                <EmptyState
                  type="no-rules"
                  title="No rules yet"
                  description="Create rules to automatically categorize your transactions"
                  primaryAction={{
                    label: "Create Your First Rule",
                    onClick: () => setShowBuilder(true),
                    icon: <PlusIcon className="w-5 h-5" />,
                  }}
                />
              </div>
            ) : (
              rules.map((rule, index) => (
                <RuleCard
                  key={rule.id}
                  rule={rule}
                  onEdit={() => handleEdit(rule)}
                  onDelete={() => handleDelete(rule.id)}
                  onToggle={() => handleToggle(rule.id)}
                  onMoveUp={() => handleMoveUp(index)}
                  onMoveDown={() => handleMoveDown(index)}
                  isFirst={index === 0}
                  isLast={index === rules.length - 1}
                />
              ))
            )}
          </div>
        )}

        {/* Info */}
        {!showBuilder && rules.length > 0 && (
          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <h4 className="font-medium text-blue-800 dark:text-blue-300 mb-1">
              How rules work
            </h4>
            <p className="text-sm text-blue-700 dark:text-blue-400">
              Rules are applied in priority order (top to bottom). The first
              matching rule wins. Drag rules to reorder them, or use the arrows
              to adjust priority.
            </p>
          </div>
        )}
      </div>
    </PullToRefresh>
  );
}
