"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CreditCard,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Clock,
  AlertCircle,
  CheckCircle,
  ArrowRight,
  Sparkles,
  Calculator,
  RefreshCw,
} from "lucide-react";

interface SimulationAction {
  id: string;
  type: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  inputType: "currency" | "number" | "percentage" | "boolean";
  placeholder?: string;
  min?: number;
  max?: number;
}

interface SimulationResult {
  currentScore: number;
  projectedScore: number;
  scoreChange: number;
  confidence: number;
  timeToAchieve: string;
  factors: {
    name: string;
    impact: number;
    direction: "positive" | "negative" | "neutral";
  }[];
  recommendations: string[];
}

const SIMULATION_ACTIONS: SimulationAction[] = [
  {
    id: "pay_down_debt",
    type: "pay_down_debt",
    label: "Pay Down Credit Card Debt",
    description: "Reduce your credit card balance",
    icon: <CreditCard className="w-5 h-5" />,
    inputType: "currency",
    placeholder: "Amount to pay",
    min: 0,
  },
  {
    id: "increase_credit_limit",
    type: "increase_credit_limit",
    label: "Increase Credit Limit",
    description: "Request a higher credit limit",
    icon: <TrendingUp className="w-5 h-5" />,
    inputType: "currency",
    placeholder: "New limit amount",
    min: 0,
  },
  {
    id: "open_new_account",
    type: "open_new_account",
    label: "Open New Credit Account",
    description: "Apply for a new credit card",
    icon: <CreditCard className="w-5 h-5" />,
    inputType: "boolean",
  },
  {
    id: "remove_late_payment",
    type: "remove_late_payment",
    label: "Remove Late Payment",
    description: "Dispute a late payment from your report",
    icon: <Clock className="w-5 h-5" />,
    inputType: "number",
    placeholder: "Number of late payments",
    min: 1,
    max: 10,
  },
  {
    id: "become_authorized_user",
    type: "become_authorized_user",
    label: "Become Authorized User",
    description: "Get added to someone else's card",
    icon: <CheckCircle className="w-5 h-5" />,
    inputType: "number",
    placeholder: "Account age (years)",
    min: 1,
    max: 30,
  },
  {
    id: "reduce_utilization",
    type: "reduce_utilization",
    label: "Reduce Credit Utilization",
    description: "Lower your credit usage percentage",
    icon: <TrendingDown className="w-5 h-5" />,
    inputType: "percentage",
    placeholder: "Target utilization %",
    min: 0,
    max: 100,
  },
];

export default function CreditScoreSimulatorPage() {
  const [currentScore, setCurrentScore] = useState(720);
  const [selectedActions, setSelectedActions] = useState<
    Map<string, number | boolean>
  >(new Map());
  const [isSimulating, setIsSimulating] = useState(false);
  const [result, setResult] = useState<SimulationResult | null>(null);

  const handleActionToggle = (actionId: string, value: number | boolean) => {
    const newActions = new Map(selectedActions);
    if (value === 0 || value === false) {
      newActions.delete(actionId);
    } else {
      newActions.set(actionId, value);
    }
    setSelectedActions(newActions);
  };

  const runSimulation = async () => {
    setIsSimulating(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Calculate simulated result
    let scoreChange = 0;
    const factors: SimulationResult["factors"] = [];

    selectedActions.forEach((value, actionId) => {
      const action = SIMULATION_ACTIONS.find((a) => a.id === actionId);
      if (!action) return;

      switch (actionId) {
        case "pay_down_debt":
          const debtImpact = Math.min(
            Math.floor((value as number) / 500) * 5,
            40,
          );
          scoreChange += debtImpact;
          factors.push({
            name: "Debt Reduction",
            impact: debtImpact,
            direction: "positive",
          });
          break;
        case "increase_credit_limit":
          const limitImpact = Math.min(
            Math.floor((value as number) / 1000) * 3,
            20,
          );
          scoreChange += limitImpact;
          factors.push({
            name: "Lower Utilization",
            impact: limitImpact,
            direction: "positive",
          });
          break;
        case "open_new_account":
          scoreChange -= 10; // Hard inquiry
          factors.push({
            name: "New Account (Hard Inquiry)",
            impact: -10,
            direction: "negative",
          });
          break;
        case "remove_late_payment":
          const lateImpact = (value as number) * 15;
          scoreChange += lateImpact;
          factors.push({
            name: "Late Payment Removal",
            impact: lateImpact,
            direction: "positive",
          });
          break;
        case "become_authorized_user":
          const auImpact = Math.min((value as number) * 5, 25);
          scoreChange += auImpact;
          factors.push({
            name: "Authorized User",
            impact: auImpact,
            direction: "positive",
          });
          break;
        case "reduce_utilization":
          const currentUtil = 35;
          const targetUtil = value as number;
          const utilImpact = Math.max(
            0,
            Math.floor((currentUtil - targetUtil) * 0.8),
          );
          scoreChange += utilImpact;
          factors.push({
            name: "Utilization Reduction",
            impact: utilImpact,
            direction: "positive",
          });
          break;
      }
    });

    const projectedScore = Math.min(
      850,
      Math.max(300, currentScore + scoreChange),
    );

    setResult({
      currentScore,
      projectedScore,
      scoreChange,
      confidence: 85 + Math.floor(Math.random() * 10),
      timeToAchieve:
        scoreChange > 30
          ? "3-6 months"
          : scoreChange > 15
            ? "1-3 months"
            : "30-60 days",
      factors,
      recommendations: [
        scoreChange > 0
          ? "These actions could significantly improve your score!"
          : "Consider alternative strategies.",
        "Focus on reducing credit utilization below 30%.",
        "Keep older accounts open to maintain credit history length.",
      ],
    });

    setIsSimulating(false);
  };

  const resetSimulation = () => {
    setSelectedActions(new Map());
    setResult(null);
  };

  const getScoreColor = (score: number) => {
    if (score >= 800) return "text-emerald-500";
    if (score >= 740) return "text-green-500";
    if (score >= 670) return "text-lime-500";
    if (score >= 580) return "text-yellow-500";
    return "text-red-500";
  };

  const getScoreRating = (score: number) => {
    if (score >= 800) return "Excellent";
    if (score >= 740) return "Very Good";
    if (score >= 670) return "Good";
    if (score >= 580) return "Fair";
    return "Poor";
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <Calculator className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Credit Score Simulator
            </h1>
          </div>
          <p className="text-gray-600 dark:text-slate-400">
            See how different financial actions could impact your credit score
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Current Score Card */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6 sticky top-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Your Current Score
              </h2>

              <div className="text-center mb-6">
                <div
                  className={`text-6xl font-bold ${getScoreColor(currentScore)}`}
                >
                  {currentScore}
                </div>
                <div className="text-gray-500 dark:text-slate-400 mt-1">
                  {getScoreRating(currentScore)}
                </div>
              </div>

              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">
                  Adjust starting score
                </label>
                <input
                  type="range"
                  min="300"
                  max="850"
                  value={currentScore}
                  onChange={(e) => setCurrentScore(parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-slate-700"
                  title="Adjust your starting credit score"
                  aria-label="Starting credit score"
                />
                <div className="flex justify-between text-xs text-gray-500 dark:text-slate-400">
                  <span>300</span>
                  <span>850</span>
                </div>
              </div>

              {result && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-6 pt-6 border-t border-gray-200 dark:border-slate-700"
                >
                  <h3 className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-3">
                    Projected Score
                  </h3>
                  <div className="text-center">
                    <div
                      className={`text-5xl font-bold ${getScoreColor(result.projectedScore)}`}
                    >
                      {result.projectedScore}
                    </div>
                    <div
                      className={`flex items-center justify-center gap-1 mt-2 ${
                        result.scoreChange >= 0
                          ? "text-green-500"
                          : "text-red-500"
                      }`}
                    >
                      {result.scoreChange >= 0 ? (
                        <TrendingUp className="w-4 h-4" />
                      ) : (
                        <TrendingDown className="w-4 h-4" />
                      )}
                      <span className="font-semibold">
                        {result.scoreChange >= 0 ? "+" : ""}
                        {result.scoreChange} points
                      </span>
                    </div>
                    <div className="text-sm text-gray-500 dark:text-slate-400 mt-1">
                      {result.confidence}% confidence
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </div>

          {/* Actions Panel */}
          <div className="lg:col-span-2 space-y-6">
            {/* Action Cards */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Select Actions to Simulate
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {SIMULATION_ACTIONS.map((action) => {
                  const isSelected = selectedActions.has(action.id);
                  const value = selectedActions.get(action.id);

                  return (
                    <div
                      key={action.id}
                      className={`p-4 rounded-lg border-2 transition-all ${isSelected ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20" : "border-gray-200 hover:border-gray-300 dark:border-slate-600"}`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`p-2 rounded-lg ${isSelected ? "bg-blue-100" : "bg-gray-100 dark:bg-slate-700"}`}
                        >
                          {action.icon}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900 dark:text-white">
                            {action.label}
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-slate-400">
                            {action.description}
                          </p>

                          <div className="mt-3">
                            {action.inputType === "boolean" ? (
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={(e) =>
                                    handleActionToggle(
                                      action.id,
                                      e.target.checked,
                                    )
                                  }
                                  className="w-4 h-4 rounded border-gray-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-sm text-gray-600 dark:text-slate-400">
                                  Include this action
                                </span>
                              </label>
                            ) : (
                              <div className="flex items-center gap-2">
                                {action.inputType === "currency" && (
                                  <span className="text-gray-500 dark:text-slate-400">
                                    $
                                  </span>
                                )}
                                <input
                                  type="number"
                                  placeholder={action.placeholder}
                                  min={action.min}
                                  max={action.max}
                                  value={(value as number) || ""}
                                  onChange={(e) =>
                                    handleActionToggle(
                                      action.id,
                                      parseFloat(e.target.value) || 0,
                                    )
                                  }
                                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                                {action.inputType === "percentage" && (
                                  <span className="text-gray-500 dark:text-slate-400">
                                    %
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Simulate Button */}
              <div className="mt-6 flex gap-3">
                <button
                  onClick={runSimulation}
                  disabled={selectedActions.size === 0 || isSimulating}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isSimulating ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      Simulating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      Run Simulation
                    </>
                  )}
                </button>
                {(selectedActions.size > 0 || result) && (
                  <button
                    onClick={resetSimulation}
                    className="px-4 py-3 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>

            {/* Results Panel */}
            <AnimatePresence>
              {result && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-6"
                >
                  {/* Impact Breakdown */}
                  <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                      Impact Breakdown
                    </h3>

                    <div className="space-y-3">
                      {result.factors.map((factor, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg"
                        >
                          <span className="text-gray-700 dark:text-slate-300">
                            {factor.name}
                          </span>
                          <span
                            className={`font-semibold ${
                              factor.direction === "positive"
                                ? "text-green-500"
                                : factor.direction === "negative"
                                  ? "text-red-500"
                                  : "text-gray-500 dark:text-slate-400"
                            }`}
                          >
                            {factor.impact >= 0 ? "+" : ""}
                            {factor.impact} pts
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-slate-700 flex items-center justify-between">
                      <span className="font-medium text-gray-900 dark:text-white">
                        Estimated Time to Achieve
                      </span>
                      <span className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                        <Clock className="w-4 h-4" />
                        {result.timeToAchieve}
                      </span>
                    </div>
                  </div>

                  {/* Recommendations */}
                  <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl shadow-sm p-6 text-white">
                    <div className="flex items-center gap-2 mb-4">
                      <AlertCircle className="w-5 h-5" />
                      <h3 className="text-lg font-semibold">
                        AI Recommendations
                      </h3>
                    </div>

                    <ul className="space-y-2">
                      {result.recommendations.map((rec, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <ArrowRight className="w-4 h-4 mt-1 flex-shrink-0" />
                          <span className="text-blue-100">{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
