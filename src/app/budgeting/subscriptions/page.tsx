"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CreditCard,
  Search,
  Plus,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Lightbulb,
  RefreshCw,
  Calendar,
  DollarSign,
  BarChart3,
  Sparkles,
  X,
  ExternalLink,
  Trash2,
  Eye,
  EyeOff,
} from "lucide-react";

interface Subscription {
  id: string;
  name: string;
  merchantName: string;
  amount: number;
  frequency: "weekly" | "monthly" | "quarterly" | "yearly";
  category: string;
  status: "active" | "paused" | "cancelled";
  nextBillingDate: Date;
  logoUrl?: string;
  autopay: boolean;
}

interface SubscriptionInsight {
  id: string;
  type: "duplicate" | "unused" | "price_increase" | "free_alternative";
  title: string;
  description: string;
  potentialSavings: number;
  priority: "low" | "medium" | "high";
  subscriptionIds: string[];
}

interface DetectedSubscription {
  merchantName: string;
  amount: number;
  frequency: string;
  confidence: number;
  chargeCount: number;
  category: string;
}

const MOCK_SUBSCRIPTIONS: Subscription[] = [
  {
    id: "1",
    name: "Netflix",
    merchantName: "Netflix",
    amount: 15.99,
    frequency: "monthly",
    category: "streaming",
    status: "active",
    nextBillingDate: new Date(2026, 1, 15),
    autopay: true,
  },
  {
    id: "2",
    name: "Spotify",
    merchantName: "Spotify",
    amount: 10.99,
    frequency: "monthly",
    category: "music",
    status: "active",
    nextBillingDate: new Date(2026, 1, 20),
    autopay: true,
  },
  {
    id: "3",
    name: "Disney+",
    merchantName: "Disney Plus",
    amount: 13.99,
    frequency: "monthly",
    category: "streaming",
    status: "active",
    nextBillingDate: new Date(2026, 1, 10),
    autopay: true,
  },
  {
    id: "4",
    name: "Gym Membership",
    merchantName: "Planet Fitness",
    amount: 24.99,
    frequency: "monthly",
    category: "fitness",
    status: "active",
    nextBillingDate: new Date(2026, 1, 1),
    autopay: true,
  },
  {
    id: "5",
    name: "iCloud Storage",
    merchantName: "Apple",
    amount: 2.99,
    frequency: "monthly",
    category: "cloud_storage",
    status: "active",
    nextBillingDate: new Date(2026, 1, 25),
    autopay: true,
  },
  {
    id: "6",
    name: "Adobe Creative Cloud",
    merchantName: "Adobe",
    amount: 54.99,
    frequency: "monthly",
    category: "software",
    status: "active",
    nextBillingDate: new Date(2026, 1, 5),
    autopay: true,
  },
];

const MOCK_INSIGHTS: SubscriptionInsight[] = [
  {
    id: "1",
    type: "duplicate",
    title: "Multiple streaming services detected",
    description:
      "You have 2 video streaming services (Netflix, Disney+) totaling $29.98/month",
    potentialSavings: 13.99,
    priority: "medium",
    subscriptionIds: ["1", "3"],
  },
  {
    id: "2",
    type: "free_alternative",
    title: "Free alternative available",
    description: "Consider using free cloud storage options instead of iCloud",
    potentialSavings: 2.99,
    priority: "low",
    subscriptionIds: ["5"],
  },
  {
    id: "3",
    type: "unused",
    title: "Potentially unused subscription",
    description: "Your gym membership shows no activity in the last 60 days",
    potentialSavings: 24.99,
    priority: "high",
    subscriptionIds: ["4"],
  },
];

const MOCK_DETECTED: DetectedSubscription[] = [
  {
    merchantName: "HBO Max",
    amount: 15.99,
    frequency: "monthly",
    confidence: 92,
    chargeCount: 4,
    category: "streaming",
  },
  {
    merchantName: "Hulu",
    amount: 17.99,
    frequency: "monthly",
    confidence: 88,
    chargeCount: 3,
    category: "streaming",
  },
];

export default function SubscriptionTrackerPage() {
  const [subscriptions] = useState<Subscription[]>(MOCK_SUBSCRIPTIONS);
  const [insights] = useState<SubscriptionInsight[]>(MOCK_INSIGHTS);
  const [detectedSubs] = useState<DetectedSubscription[]>(MOCK_DETECTED);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [showDetectedModal, setShowDetectedModal] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  const filteredSubscriptions = subscriptions.filter((sub) => {
    const matchesSearch = sub.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === "all" || sub.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const totalMonthly = subscriptions
    .filter((s) => s.status === "active")
    .reduce((sum, s) => {
      switch (s.frequency) {
        case "weekly":
          return sum + s.amount * 4.33;
        case "monthly":
          return sum + s.amount;
        case "quarterly":
          return sum + s.amount / 3;
        case "yearly":
          return sum + s.amount / 12;
        default:
          return sum;
      }
    }, 0);

  const totalAnnual = totalMonthly * 12;
  const potentialSavings = insights.reduce(
    (sum, i) => sum + i.potentialSavings,
    0,
  );

  const categories = ["all", ...new Set(subscriptions.map((s) => s.category))];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      all: "All",
      streaming: "Streaming",
      music: "Music",
      fitness: "Fitness",
      cloud_storage: "Cloud Storage",
      software: "Software",
    };
    return labels[category] || category;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300";
      case "medium":
        return "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300";
      case "low":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300";
      default:
        return "bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-200";
    }
  };

  const scanForSubscriptions = async () => {
    setIsScanning(true);
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setIsScanning(false);
    setShowDetectedModal(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <CreditCard className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Subscription Tracker
              </h1>
            </div>
            <p className="text-gray-600 dark:text-slate-400">
              Monitor and optimize your recurring subscriptions
            </p>
          </div>

          <div className="flex items-center gap-3 mt-4 sm:mt-0">
            <button
              onClick={scanForSubscriptions}
              disabled={isScanning}
              className="flex items-center gap-2 px-4 py-2 border border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400 rounded-lg font-medium hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors disabled:opacity-50"
            >
              {isScanning ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Scanning...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  Detect Subscriptions
                </>
              )}
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">
              <Plus className="w-4 h-4" />
              Add Subscription
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <DollarSign className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-slate-400">
                  Monthly Spend
                </p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(totalMonthly)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-slate-400">
                  Annual Spend
                </p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(totalAnnual)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                <BarChart3 className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-slate-400">
                  Active Subscriptions
                </p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {subscriptions.filter((s) => s.status === "active").length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 dark:bg-amber-900 rounded-lg">
                <Lightbulb className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-slate-400">
                  Potential Savings
                </p>
                <p className="text-xl font-bold text-amber-600">
                  {formatCurrency(potentialSavings)}/mo
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Subscriptions List */}
          <div className="lg:col-span-2 space-y-6">
            {/* Search & Filter */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-slate-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search subscriptions..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    aria-label="Search subscriptions"
                  />
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${selectedCategory === cat ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600 dark:text-slate-400 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600"}`}
                    >
                      {getCategoryLabel(cat)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Subscription Cards */}
            <div className="space-y-3">
              {filteredSubscriptions.map((sub) => (
                <motion.div
                  key={sub.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gray-100 dark:bg-slate-700 rounded-xl flex items-center justify-center">
                        <CreditCard className="w-6 h-6 text-gray-500 dark:text-slate-400" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {sub.name}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-slate-400">
                          {sub.merchantName} • Next:{" "}
                          {sub.nextBillingDate.toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-900 dark:text-white">
                        {formatCurrency(sub.amount)}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-slate-400">
                        /{sub.frequency}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100 dark:border-slate-700">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${sub.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-slate-300"}`}
                      >
                        {sub.status}
                      </span>
                      {sub.autopay && (
                        <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                          Autopay
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        className="p-2 text-gray-400 hover:text-gray-600 dark:text-slate-300 dark:hover:text-gray-300 transition-colors"
                        aria-label="View details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        className="p-2 text-gray-400 dark:text-slate-500 hover:text-red-600 transition-colors"
                        aria-label="Cancel subscription"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Sidebar - Insights */}
          <div className="space-y-6">
            {/* AI Insights */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-4">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-blue-500" />
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  AI Insights
                </h3>
              </div>

              <div className="space-y-3">
                {insights.map((insight) => (
                  <div
                    key={insight.id}
                    className="p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium ${getPriorityColor(insight.priority)}`}
                      >
                        {insight.priority}
                      </span>
                      <span className="text-sm font-semibold text-green-600">
                        Save {formatCurrency(insight.potentialSavings)}/mo
                      </span>
                    </div>
                    <h4 className="font-medium text-gray-900 dark:text-white text-sm">
                      {insight.title}
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                      {insight.description}
                    </p>
                    <button className="mt-2 text-xs text-blue-600 dark:text-blue-400 font-medium hover:underline">
                      Take Action →
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Spending Trend */}
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-5 h-5" />
                <h3 className="font-semibold">Spending Trend</h3>
              </div>
              <div className="flex items-end gap-4">
                <div>
                  <p className="text-3xl font-bold">
                    {formatCurrency(totalMonthly)}
                  </p>
                  <p className="text-blue-200 text-sm">This month</p>
                </div>
                <div className="flex items-center gap-1 text-green-300">
                  <TrendingDown className="w-4 h-4" />
                  <span className="text-sm font-medium">-5% vs last month</span>
                </div>
              </div>
              <button className="w-full mt-4 py-2 bg-white hover:bg-white dark:bg-slate-800/30 rounded-lg font-medium transition-colors">
                View Full Report
              </button>
            </div>

            {/* Quick Actions */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                Quick Actions
              </h3>
              <div className="space-y-2">
                <button className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors text-left">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                    <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white text-sm">
                      View Calendar
                    </p>
                    <p className="text-xs text-gray-500 dark:text-slate-400">
                      See upcoming charges
                    </p>
                  </div>
                </button>
                <button className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors text-left">
                  <div className="p-2 bg-red-100 dark:bg-red-900 rounded-lg">
                    <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white text-sm">
                      Cancel Helper
                    </p>
                    <p className="text-xs text-gray-500 dark:text-slate-400">
                      AI-assisted cancellation
                    </p>
                  </div>
                </button>
                <button className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors text-left">
                  <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                    <ExternalLink className="w-4 h-4 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white text-sm">
                      Export Data
                    </p>
                    <p className="text-xs text-gray-500 dark:text-slate-400">
                      Download subscription list
                    </p>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Detected Subscriptions Modal */}
      <AnimatePresence>
        {showDetectedModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowDetectedModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-lg w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-blue-500" />
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Detected Subscriptions
                  </h2>
                </div>
                <button
                  onClick={() => setShowDetectedModal(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg"
                  aria-label="Close modal"
                >
                  <X className="w-5 h-5 text-gray-500 dark:text-slate-400" />
                </button>
              </div>

              <p className="text-gray-600 dark:text-slate-400 mb-4">
                We found {detectedSubs.length} potential subscriptions in your
                transaction history:
              </p>

              <div className="space-y-3 mb-6">
                {detectedSubs.map((sub, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                        <CreditCard className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          {sub.merchantName}
                        </h4>
                        <p className="text-sm text-gray-500 dark:text-slate-400">
                          {sub.chargeCount} charges • {sub.confidence}%
                          confidence
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(sub.amount)}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-slate-400">
                        /{sub.frequency}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowDetectedModal(false)}
                  className="flex-1 py-2 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                >
                  Dismiss
                </button>
                <button className="flex-1 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">
                  Add All
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
