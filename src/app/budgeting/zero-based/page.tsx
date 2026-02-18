"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wallet,
  PiggyBank,
  CreditCard,
  Home,
  ShoppingCart,
  Car,
  Utensils,
  Sparkles,
  Check,
  AlertCircle,
  TrendingUp,
  ArrowRight,
  RefreshCw,
  Target,
  DollarSign,
} from "lucide-react";

interface BudgetCategory {
  id: string;
  name: string;
  icon: React.ReactNode;
  allocated: number;
  type: "essential" | "debt" | "savings" | "lifestyle";
  color: string;
}

interface BudgetPriorities {
  essentials: number;
  debtPayoff: number;
  savings: number;
  lifestyle: number;
}

const CATEGORY_TEMPLATES: Record<
  string,
  { icon: React.ReactNode; color: string; type: BudgetCategory["type"] }
> = {
  housing: {
    icon: <Home className="w-4 h-4" />,
    color: "bg-blue-500",
    type: "essential",
  },
  utilities: {
    icon: <Sparkles className="w-4 h-4" />,
    color: "bg-blue-500",
    type: "essential",
  },
  groceries: {
    icon: <ShoppingCart className="w-4 h-4" />,
    color: "bg-green-500",
    type: "essential",
  },
  transportation: {
    icon: <Car className="w-4 h-4" />,
    color: "bg-orange-500",
    type: "essential",
  },
  debt_payments: {
    icon: <CreditCard className="w-4 h-4" />,
    color: "bg-red-500",
    type: "debt",
  },
  savings: {
    icon: <PiggyBank className="w-4 h-4" />,
    color: "bg-emerald-500",
    type: "savings",
  },
  emergency_fund: {
    icon: <Target className="w-4 h-4" />,
    color: "bg-teal-500",
    type: "savings",
  },
  dining_out: {
    icon: <Utensils className="w-4 h-4" />,
    color: "bg-emerald-500",
    type: "lifestyle",
  },
  entertainment: {
    icon: <Sparkles className="w-4 h-4" />,
    color: "bg-blue-500",
    type: "lifestyle",
  },
  shopping: {
    icon: <ShoppingCart className="w-4 h-4" />,
    color: "bg-blue-500",
    type: "lifestyle",
  },
};

export default function ZeroBasedBudgetPage() {
  const [step, setStep] = useState<
    "income" | "priorities" | "allocate" | "review"
  >("income");
  const [monthlyIncome, setMonthlyIncome] = useState<number>(5000);
  const [priorities, setPriorities] = useState<BudgetPriorities>({
    essentials: 50,
    debtPayoff: 10,
    savings: 20,
    lifestyle: 20,
  });
  const [categories, setCategories] = useState<BudgetCategory[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const totalAllocated = categories.reduce(
    (sum, cat) => sum + cat.allocated,
    0,
  );
  const unallocated = monthlyIncome - totalAllocated;
  const prioritiesTotal =
    priorities.essentials +
    priorities.debtPayoff +
    priorities.savings +
    priorities.lifestyle;

  const generateBudget = async () => {
    setIsGenerating(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const pools = {
      essentials: monthlyIncome * (priorities.essentials / 100),
      debt: monthlyIncome * (priorities.debtPayoff / 100),
      savings: monthlyIncome * (priorities.savings / 100),
      lifestyle: monthlyIncome * (priorities.lifestyle / 100),
    };

    const newCategories: BudgetCategory[] = [
      {
        id: "1",
        name: "Housing",
        ...CATEGORY_TEMPLATES.housing,
        allocated: Math.round(pools.essentials * 0.5),
      },
      {
        id: "2",
        name: "Utilities",
        ...CATEGORY_TEMPLATES.utilities,
        allocated: Math.round(pools.essentials * 0.1),
      },
      {
        id: "3",
        name: "Groceries",
        ...CATEGORY_TEMPLATES.groceries,
        allocated: Math.round(pools.essentials * 0.25),
      },
      {
        id: "4",
        name: "Transportation",
        ...CATEGORY_TEMPLATES.transportation,
        allocated: Math.round(pools.essentials * 0.15),
      },
      {
        id: "5",
        name: "Debt Payments",
        ...CATEGORY_TEMPLATES.debt_payments,
        allocated: Math.round(pools.debt),
      },
      {
        id: "6",
        name: "Savings",
        ...CATEGORY_TEMPLATES.savings,
        allocated: Math.round(pools.savings * 0.6),
      },
      {
        id: "7",
        name: "Emergency Fund",
        ...CATEGORY_TEMPLATES.emergency_fund,
        allocated: Math.round(pools.savings * 0.4),
      },
      {
        id: "8",
        name: "Dining Out",
        ...CATEGORY_TEMPLATES.dining_out,
        allocated: Math.round(pools.lifestyle * 0.35),
      },
      {
        id: "9",
        name: "Entertainment",
        ...CATEGORY_TEMPLATES.entertainment,
        allocated: Math.round(pools.lifestyle * 0.35),
      },
      {
        id: "10",
        name: "Shopping",
        ...CATEGORY_TEMPLATES.shopping,
        allocated: Math.round(pools.lifestyle * 0.3),
      },
    ];

    setCategories(newCategories);
    setIsGenerating(false);
    setStep("allocate");
  };

  const updateCategoryAllocation = (categoryId: string, amount: number) => {
    setCategories((prev) =>
      prev.map((cat) =>
        cat.id === categoryId
          ? { ...cat, allocated: Math.max(0, amount) }
          : cat,
      ),
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getCategoryTypeLabel = (type: BudgetCategory["type"]) => {
    switch (type) {
      case "essential":
        return "Essential";
      case "debt":
        return "Debt";
      case "savings":
        return "Savings";
      case "lifestyle":
        return "Lifestyle";
    }
  };

  const getCategoryTypeColor = (type: BudgetCategory["type"]) => {
    switch (type) {
      case "essential":
        return "text-blue-600 bg-blue-100 dark:bg-blue-900/50";
      case "debt":
        return "text-red-600 bg-red-100 dark:bg-red-900/50";
      case "savings":
        return "text-emerald-600 bg-emerald-100 dark:bg-emerald-900/50";
      case "lifestyle":
        return "text-blue-600 bg-blue-100 dark:bg-blue-900/50";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <Wallet className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Zero-Based Budget
            </h1>
          </div>
          <p className="text-gray-600 dark:text-slate-400">
            Give every dollar a job - Income minus expenses equals zero
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {["income", "priorities", "allocate", "review"].map((s, index) => (
              <div key={s} className="flex items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                    step === s
                      ? "bg-blue-600 text-white"
                      : ["income", "priorities", "allocate", "review"].indexOf(
                            step,
                          ) > index
                        ? "bg-green-500 text-white"
                        : "bg-gray-200 dark:bg-slate-700 text-gray-500 dark:text-slate-400"
                  }`}
                >
                  {["income", "priorities", "allocate", "review"].indexOf(
                    step,
                  ) > index ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    index + 1
                  )}
                </div>
                {index < 3 && (
                  <div
                    className={`w-full h-1 mx-2 ${
                      ["income", "priorities", "allocate", "review"].indexOf(
                        step,
                      ) > index
                        ? "bg-green-500"
                        : "bg-gray-200 dark:bg-slate-700"
                    }`}
                    style={{ width: "60px" }}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-xs text-gray-500 dark:text-slate-400">
              Income
            </span>
            <span className="text-xs text-gray-500 dark:text-slate-400">
              Priorities
            </span>
            <span className="text-xs text-gray-500 dark:text-slate-400">
              Allocate
            </span>
            <span className="text-xs text-gray-500 dark:text-slate-400">
              Review
            </span>
          </div>
        </div>

        {/* Step Content */}
        <AnimatePresence mode="wait">
          {/* Step 1: Income */}
          {step === "income" && (
            <motion.div
              key="income"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6"
            >
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                What's your monthly income?
              </h2>
              <p className="text-gray-500 dark:text-slate-400 mb-6">
                Enter your total take-home pay after taxes
              </p>

              <div className="relative mb-8">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl text-gray-400 dark:text-slate-500">
                  $
                </span>
                <input
                  type="number"
                  value={monthlyIncome}
                  onChange={(e) =>
                    setMonthlyIncome(parseFloat(e.target.value) || 0)
                  }
                  className="w-full pl-10 pr-4 py-4 text-3xl font-bold border-2 border-gray-200 dark:border-slate-600 rounded-xl bg-transparent text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="5000"
                  aria-label="Monthly income"
                />
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                  <div>
                    <p className="font-medium text-blue-900 dark:text-blue-200">
                      Zero-Based Budgeting
                    </p>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      Every dollar gets assigned to a category until you reach
                      $0 unallocated. This ensures you're intentional with every
                      dollar you earn.
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setStep("priorities")}
                disabled={monthlyIncome <= 0}
                className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Continue
                <ArrowRight className="w-4 h-4" />
              </button>
            </motion.div>
          )}

          {/* Step 2: Priorities */}
          {step === "priorities" && (
            <motion.div
              key="priorities"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6"
            >
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Set your spending priorities
              </h2>
              <p className="text-gray-500 dark:text-slate-400 mb-6">
                Allocate percentages to each category (must total 100%)
              </p>

              <div className="space-y-6 mb-6">
                {[
                  {
                    key: "essentials",
                    label: "Essentials",
                    desc: "Housing, utilities, groceries, transportation",
                    color: "bg-blue-500",
                  },
                  {
                    key: "debtPayoff",
                    label: "Debt Payoff",
                    desc: "Credit cards, loans, other debt payments",
                    color: "bg-red-500",
                  },
                  {
                    key: "savings",
                    label: "Savings",
                    desc: "Emergency fund, retirement, investments",
                    color: "bg-emerald-500",
                  },
                  {
                    key: "lifestyle",
                    label: "Lifestyle",
                    desc: "Dining, entertainment, shopping, travel",
                    color: "bg-blue-500",
                  },
                ].map((item) => (
                  <div key={item.key} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-3 h-3 rounded-full ${item.color}`}
                          />
                          <span className="font-medium text-gray-900 dark:text-white">
                            {item.label}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-slate-400 ml-5">
                          {item.desc}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={priorities[item.key as keyof BudgetPriorities]}
                          onChange={(e) =>
                            setPriorities((prev) => ({
                              ...prev,
                              [item.key]: Math.min(
                                100,
                                Math.max(0, parseInt(e.target.value) || 0),
                              ),
                            }))
                          }
                          className="w-20 px-3 py-2 text-right border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                          aria-label={`${item.label} percentage`}
                        />
                        <span className="text-gray-500 dark:text-slate-400">
                          %
                        </span>
                      </div>
                    </div>
                    <div className="ml-5">
                      <div className="h-2 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${item.color} transition-all`}
                          style={{
                            width: `${priorities[item.key as keyof BudgetPriorities]}%`,
                          }}
                        />
                      </div>
                      <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
                        {formatCurrency(
                          monthlyIncome *
                            (priorities[item.key as keyof BudgetPriorities] /
                              100),
                        )}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Total Indicator */}
              <div
                className={`p-4 rounded-lg mb-6 ${prioritiesTotal === 100 ? "bg-green-50 border border-green-200" : "bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800"}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {prioritiesTotal === 100 ? (
                      <Check className="w-5 h-5 text-green-600" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-amber-600" />
                    )}
                    <span
                      className={`font-medium ${prioritiesTotal === 100 ? "text-green-700" : "text-amber-700 dark:text-amber-300"}`}
                    >
                      {prioritiesTotal === 100
                        ? "Perfect!"
                        : `Total: ${prioritiesTotal}%`}
                    </span>
                  </div>
                  {prioritiesTotal !== 100 && (
                    <span className="text-sm text-amber-600 dark:text-amber-400">
                      {prioritiesTotal < 100
                        ? `Add ${100 - prioritiesTotal}%`
                        : `Remove ${prioritiesTotal - 100}%`}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep("income")}
                  className="flex-1 py-3 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={generateBudget}
                  disabled={prioritiesTotal !== 100 || isGenerating}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      Generate Budget
                      <Sparkles className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}

          {/* Step 3: Allocate */}
          {step === "allocate" && (
            <motion.div
              key="allocate"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              {/* Unallocated Banner */}
              <div
                className={`rounded-xl p-4 ${unallocated === 0 ? "bg-green-100 border border-green-200" : unallocated > 0 ? "bg-amber-100 border border-amber-200" : "bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800"}`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-slate-400">
                      Unallocated
                    </p>
                    <p
                      className={`text-2xl font-bold ${unallocated === 0 ? "text-green-700" : unallocated > 0 ? "text-amber-700" : "text-red-700 dark:text-red-300"}`}
                    >
                      {formatCurrency(unallocated)}
                    </p>
                  </div>
                  {unallocated === 0 && (
                    <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                      <Check className="w-6 h-6" />
                      <span className="font-medium">Zero-based!</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Categories */}
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  Fine-tune your allocations
                </h2>

                <div className="space-y-4">
                  {["essential", "debt", "savings", "lifestyle"].map((type) => {
                    const typeCategories = categories.filter(
                      (c) => c.type === type,
                    );
                    if (typeCategories.length === 0) return null;

                    return (
                      <div key={type}>
                        <h3
                          className={`text-sm font-medium mb-2 ${getCategoryTypeColor(type as BudgetCategory["type"])} inline-block px-2 py-1 rounded`}
                        >
                          {getCategoryTypeLabel(type as BudgetCategory["type"])}
                        </h3>
                        <div className="space-y-2">
                          {typeCategories.map((cat) => (
                            <div
                              key={cat.id}
                              className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg"
                            >
                              <div className="flex items-center gap-3">
                                <div
                                  className={`p-2 rounded-lg ${cat.color} text-white`}
                                >
                                  {cat.icon}
                                </div>
                                <span className="font-medium text-gray-900 dark:text-white">
                                  {cat.name}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-gray-400 dark:text-slate-500">
                                  $
                                </span>
                                <input
                                  type="number"
                                  value={cat.allocated}
                                  onChange={(e) =>
                                    updateCategoryAllocation(
                                      cat.id,
                                      parseInt(e.target.value) || 0,
                                    )
                                  }
                                  className="w-24 px-3 py-2 text-right border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                                  aria-label={`${cat.name} allocation`}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep("priorities")}
                  className="flex-1 py-3 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep("review")}
                  disabled={unallocated !== 0}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Review Budget
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          {/* Step 4: Review */}
          {step === "review" && (
            <motion.div
              key="review"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              {/* Success Banner */}
              <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl p-6 text-white">
                <div className="flex items-center gap-3 mb-2">
                  <Check className="w-8 h-8" />
                  <h2 className="text-2xl font-bold">
                    Your Zero-Based Budget is Ready!
                  </h2>
                </div>
                <p className="text-green-100">
                  Every dollar has been assigned a job. Your budget is balanced
                  and ready to use.
                </p>
              </div>

              {/* Summary */}
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Budget Summary
                </h3>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg text-center">
                    <DollarSign className="w-6 h-6 mx-auto text-gray-400 dark:text-slate-500 mb-2" />
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {formatCurrency(monthlyIncome)}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-slate-400">
                      Monthly Income
                    </p>
                  </div>
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-center">
                    <Home className="w-6 h-6 mx-auto text-blue-500 mb-2" />
                    <p className="text-2xl font-bold text-blue-600">
                      {formatCurrency(
                        categories
                          .filter((c) => c.type === "essential")
                          .reduce((s, c) => s + c.allocated, 0),
                      )}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-slate-400">
                      Essentials
                    </p>
                  </div>
                  <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg text-center">
                    <PiggyBank className="w-6 h-6 mx-auto text-emerald-500 mb-2" />
                    <p className="text-2xl font-bold text-emerald-600">
                      {formatCurrency(
                        categories
                          .filter((c) => c.type === "savings")
                          .reduce((s, c) => s + c.allocated, 0),
                      )}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-slate-400">
                      Savings
                    </p>
                  </div>
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-center">
                    <TrendingUp className="w-6 h-6 mx-auto text-blue-500 mb-2" />
                    <p className="text-2xl font-bold text-blue-600">
                      {formatCurrency(
                        categories
                          .filter((c) => c.type === "lifestyle")
                          .reduce((s, c) => s + c.allocated, 0),
                      )}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-slate-400">
                      Lifestyle
                    </p>
                  </div>
                </div>

                {/* Category List */}
                <div className="space-y-2">
                  {categories.map((cat) => (
                    <div
                      key={cat.id}
                      className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-slate-700 last:border-0"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-1.5 rounded ${cat.color} text-white`}
                        >
                          {cat.icon}
                        </div>
                        <span className="text-gray-900 dark:text-white">
                          {cat.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="w-32 h-2 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${cat.color}`}
                            style={{
                              width: `${(cat.allocated / monthlyIncome) * 100}%`,
                            }}
                          />
                        </div>
                        <span className="font-semibold text-gray-900 dark:text-white w-20 text-right">
                          {formatCurrency(cat.allocated)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep("allocate")}
                  className="flex-1 py-3 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                >
                  Edit Budget
                </button>
                <button className="flex-1 flex items-center justify-center gap-2 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors">
                  Save & Start Using
                  <Check className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
