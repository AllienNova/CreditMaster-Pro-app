"use client";

import { useState } from "react";

interface FeatureFlag {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  rollout: number;
  environment: "all" | "production" | "staging";
  createdAt: string;
}

const initialFlags: FeatureFlag[] = [
  {
    id: "1",
    name: "ai_dispute_v2",
    description: "New AI-powered dispute generation engine",
    enabled: true,
    rollout: 100,
    environment: "all",
    createdAt: "2024-11-01",
  },
  {
    id: "2",
    name: "credit_score_simulator",
    description: "Interactive credit score simulator",
    enabled: true,
    rollout: 75,
    environment: "production",
    createdAt: "2024-10-15",
  },
  {
    id: "3",
    name: "plaid_integration",
    description: "Bank account linking via Plaid",
    enabled: true,
    rollout: 100,
    environment: "all",
    createdAt: "2024-09-20",
  },
  {
    id: "4",
    name: "goodwill_letter_ai",
    description: "AI-generated goodwill letters",
    enabled: false,
    rollout: 0,
    environment: "staging",
    createdAt: "2024-11-20",
  },
  {
    id: "5",
    name: "dark_mode",
    description: "Dark mode theme option",
    enabled: false,
    rollout: 25,
    environment: "staging",
    createdAt: "2024-11-25",
  },
  {
    id: "6",
    name: "multi_bureau_sync",
    description: "Sync disputes across all bureaus",
    enabled: true,
    rollout: 50,
    environment: "production",
    createdAt: "2024-10-01",
  },
];

export default function AdminFeaturesPage() {
  const [flags, setFlags] = useState<FeatureFlag[]>(initialFlags);

  const toggleFlag = (id: string) => {
    setFlags(
      flags.map((f) => (f.id === id ? { ...f, enabled: !f.enabled } : f)),
    );
  };

  const updateRollout = (id: string, rollout: number) => {
    setFlags(flags.map((f) => (f.id === id ? { ...f, rollout } : f)));
  };

  const getEnvBadge = (env: string) => {
    const styles: Record<string, string> = {
      all: "bg-emerald-100 text-emerald-700",
      production: "bg-blue-100 text-blue-700",
      staging: "bg-yellow-100 text-yellow-700",
    };
    return (
      <span className={`px-2 py-1 text-xs rounded-full ${styles[env]}`}>
        {env}
      </span>
    );
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Feature Flags
        </h1>
        <button className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition">
          + Create Flag
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-slate-700">
          <p className="text-sm text-gray-500 dark:text-slate-400">
            Total Flags
          </p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {flags.length}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-slate-700">
          <p className="text-sm text-gray-500 dark:text-slate-400">Enabled</p>
          <p className="text-2xl font-bold text-emerald-600">
            {flags.filter((f) => f.enabled).length}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-slate-700">
          <p className="text-sm text-gray-500 dark:text-slate-400">
            In Staging
          </p>
          <p className="text-2xl font-bold text-yellow-600">
            {flags.filter((f) => f.environment === "staging").length}
          </p>
        </div>
      </div>

      {/* Feature Flags List */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700">
        <div className="divide-y divide-gray-100 dark:divide-slate-700">
          {flags.map((flag) => (
            <div key={flag.id} className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-gray-900 dark:text-white font-mono">
                      {flag.name}
                    </h3>
                    {getEnvBadge(flag.environment)}
                  </div>
                  <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">
                    {flag.description}
                  </p>

                  {/* Rollout Slider */}
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-500 dark:text-slate-400 w-20">
                      Rollout:
                    </span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={flag.rollout}
                      onChange={(e) =>
                        updateRollout(flag.id, parseInt(e.target.value))
                      }
                      className="flex-1 h-2 bg-gray-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer"
                      disabled={!flag.enabled}
                    />
                    <span className="text-sm font-medium text-gray-900 dark:text-white w-12">
                      {flag.rollout}%
                    </span>
                  </div>
                </div>

                {/* Toggle */}
                <button
                  onClick={() => toggleFlag(flag.id)}
                  className={`w-14 h-7 rounded-full transition ${flag.enabled ? "bg-emerald-500" : "bg-gray-300"}`}
                >
                  <span
                    className={`block w-5 h-5 bg-white dark:bg-slate-800 rounded-full shadow transform transition ${flag.enabled ? "translate-x-8" : "translate-x-1"}`}
                  />
                </button>
              </div>

              <div className="mt-4 flex items-center gap-4 text-xs text-gray-400 dark:text-slate-500">
                <span>Created: {flag.createdAt}</span>
                <button className="text-emerald-500 hover:text-emerald-600">
                  Edit
                </button>
                <button className="text-red-500 hover:text-red-600">
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
