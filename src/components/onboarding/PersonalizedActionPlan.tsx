"use client";

import { CheckCircleIcon, ClockIcon, SparklesIcon } from "@heroicons/react/24/outline";

interface ActionStep {
  title: string;
  description: string;
  timeframe: string;
  impact: string;
  priority: "high" | "medium" | "low";
}

interface PersonalizedActionPlanProps {
  selectedGoals: string[];
  currentScore: string;
  targetScore: string;
  timeframe: string;
}

const goalActionPlans: Record<string, ActionStep[]> = {
  buy_home: [
    {
      title: "Dispute Negative Items",
      description: "Remove errors and outdated negative items from your reports",
      timeframe: "30-45 days",
      impact: "+20-40 pts",
      priority: "high"
    },
    {
      title: "Lower Credit Utilization",
      description: "Pay down credit card balances to below 30% of limits",
      timeframe: "Immediate",
      impact: "+15-30 pts",
      priority: "high"
    },
    {
      title: "Become Authorized User",
      description: "Get added to a family member's old, well-maintained account",
      timeframe: "30 days",
      impact: "+10-20 pts",
      priority: "medium"
    },
  ],
  buy_car: [
    {
      title: "Pay Down High Balances",
      description: "Focus on cards with highest utilization first",
      timeframe: "Immediate",
      impact: "+15-25 pts",
      priority: "high"
    },
    {
      title: "Dispute Collections",
      description: "Challenge any collection accounts for removal",
      timeframe: "30-60 days",
      impact: "+20-35 pts",
      priority: "high"
    },
  ],
  credit_cards: [
    {
      title: "Improve Payment History",
      description: "Set up autopay to ensure on-time payments",
      timeframe: "Ongoing",
      impact: "+10-20 pts",
      priority: "high"
    },
    {
      title: "Request Credit Limit Increases",
      description: "Ask for higher limits to lower utilization ratio",
      timeframe: "60-90 days",
      impact: "+5-15 pts",
      priority: "medium"
    },
  ],
  lower_rates: [
    {
      title: "Dispute Late Payments",
      description: "Request goodwill removal of late payment marks",
      timeframe: "30-45 days",
      impact: "+15-25 pts",
      priority: "high"
    },
    {
      title: "Consolidate Debt",
      description: "Consider a balance transfer to lower interest",
      timeframe: "Immediate",
      impact: "Save $100+/mo",
      priority: "high"
    },
  ],
  remove_negatives: [
    {
      title: "File Disputes",
      description: "Challenge inaccurate or unverifiable negative items",
      timeframe: "30-45 days",
      impact: "+25-50 pts",
      priority: "high"
    },
    {
      title: "Negotiate Pay-for-Delete",
      description: "Offer to pay collections in exchange for removal",
      timeframe: "30-60 days",
      impact: "+20-40 pts",
      priority: "medium"
    },
  ],
  build_credit: [
    {
      title: "Open Secured Credit Card",
      description: "Start building positive payment history",
      timeframe: "Immediate",
      impact: "+10-20 pts",
      priority: "high"
    },
    {
      title: "Become Authorized User",
      description: "Benefit from someone else's good credit history",
      timeframe: "30 days",
      impact: "+15-30 pts",
      priority: "high"
    },
  ],
};

export function PersonalizedActionPlan({ selectedGoals, currentScore, targetScore, timeframe }: PersonalizedActionPlanProps) {
  // Combine action steps from all selected goals
  const allSteps: ActionStep[] = [];
  const seenTitles = new Set<string>();
  
  selectedGoals.forEach(goalId => {
    const steps = goalActionPlans[goalId] || [];
    steps.forEach(step => {
      if (!seenTitles.has(step.title)) {
        seenTitles.add(step.title);
        allSteps.push(step);
      }
    });
  });

  // Sort by priority
  const sortedSteps = allSteps.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  // Take top 5 steps
  const topSteps = sortedSteps.slice(0, 5);

  if (topSteps.length === 0) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
      <div className="flex items-center gap-2 mb-4">
        <SparklesIcon className="w-6 h-6 text-emerald-600" />
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Your Personalized Action Plan</h2>
      </div>
      <p className="text-sm text-gray-600 dark:text-slate-300 mb-6">
        Based on your goals, here are the most impactful steps you can take right now:
      </p>

      <div className="space-y-4">
        {topSteps.map((step, index) => (
          <div 
            key={step.title}
            className={`p-4 rounded-lg border-2 ${
              step.priority === 'high' 
                ? 'border-emerald-200 bg-emerald-50' 
                : 'border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900'
            }`}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                  step.priority === 'high' 
                    ? 'bg-emerald-500 text-white' 
                    : 'bg-gray-300 text-gray-700 dark:text-slate-200'
                }`}>
                  {index + 1}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">{step.title}</h3>
                  <p className="text-sm text-gray-600 dark:text-slate-300 mt-1">{step.description}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4 mt-3 ml-11 text-xs">
              <div className="flex items-center gap-1 text-gray-600 dark:text-slate-300">
                <ClockIcon className="w-4 h-4" />
                <span>{step.timeframe}</span>
              </div>
              <div className="flex items-center gap-1 text-emerald-600 font-semibold">
                <CheckCircleIcon className="w-4 h-4" />
                <span>{step.impact}</span>
              </div>
              {step.priority === 'high' && (
                <span className="bg-emerald-500 text-white px-2 py-0.5 rounded-full text-xs font-medium">
                  High Priority
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

