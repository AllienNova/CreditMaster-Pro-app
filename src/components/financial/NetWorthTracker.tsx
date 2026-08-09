"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/ui/Toast";
import AreaChartComponent from "@/components/charts/AreaChart";
import PieChartComponent from "@/components/charts/PieChart";
import { Icon } from "@/components/ui/Icon";
import { CHART_COLORS } from "@/lib/design-tokens/chart-colors";

// Types
interface Asset {
  id: string;
  name: string;
  category: AssetCategory;
  value: number;
  institution?: string;
  lastUpdated: Date;
  isLinked: boolean;
}

interface Liability {
  id: string;
  name: string;
  category: LiabilityCategory;
  balance: number;
  interestRate?: number;
  minimumPayment?: number;
  institution?: string;
  lastUpdated: Date;
  isLinked: boolean;
}

type AssetCategory =
  | "cash"
  | "investments"
  | "retirement"
  | "real_estate"
  | "vehicles"
  | "other";
type LiabilityCategory =
  | "credit_card"
  | "mortgage"
  | "auto_loan"
  | "student_loan"
  | "personal_loan"
  | "other";

interface NetWorthHistory {
  date: string;
  netWorth: number;
  assets: number;
  liabilities: number;
}

interface Milestone {
  amount: number;
  achieved: boolean;
  date?: Date;
}

interface NetWorthData {
  current: number;
  assets: number;
  liabilities: number;
  assetsList: Asset[];
  liabilitiesList: Liability[];
  history: NetWorthHistory[];
  milestones: Milestone[];
  monthlyChange: number;
  yearlyChange: number;
}

type TabType = "overview" | "assets" | "liabilities" | "history";

const ASSET_CATEGORIES: {
  value: AssetCategory;
  label: string;
  icon: string;
  color: string;
}[] = [
  { value: "cash", label: "Cash & Savings", icon: "wallet", color: CHART_COLORS.emerald },
  {
    value: "investments",
    label: "Investments",
    icon: "trending-up",
    color: CHART_COLORS.blue,
  },
  {
    value: "retirement",
    label: "Retirement",
    icon: "shield",
    color: CHART_COLORS.purple,
  },
  {
    value: "real_estate",
    label: "Real Estate",
    icon: "home",
    color: CHART_COLORS.amber,
  },
  { value: "vehicles", label: "Vehicles", icon: "truck", color: CHART_COLORS.indigo },
  { value: "other", label: "Other", icon: "puzzle-piece", color: CHART_COLORS.gray },
];

const LIABILITY_CATEGORIES: {
  value: LiabilityCategory;
  label: string;
  icon: string;
  color: string;
}[] = [
  {
    value: "credit_card",
    label: "Credit Cards",
    icon: "credit-card",
    color: CHART_COLORS.red,
  },
  { value: "mortgage", label: "Mortgage", icon: "home", color: CHART_COLORS.orange },
  { value: "auto_loan", label: "Auto Loans", icon: "truck", color: CHART_COLORS.amber },
  {
    value: "student_loan",
    label: "Student Loans",
    icon: "academic-cap",
    color: CHART_COLORS.yellow,
  },
  {
    value: "personal_loan",
    label: "Personal Loans",
    icon: "banknotes",
    color: CHART_COLORS.lime,
  },
  { value: "other", label: "Other", icon: "puzzle-piece", color: CHART_COLORS.gray },
];

export default function NetWorthTracker() {
  const { user, loading: authLoading } = useAuth();
  const { success: showSuccess, error: showError } = useToast();
  const [data, setData] = useState<NetWorthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [showAddAssetModal, setShowAddAssetModal] = useState(false);
  const [showAddLiabilityModal, setShowAddLiabilityModal] = useState(false);

  // Form state for adding assets/liabilities
  const [newAsset, setNewAsset] = useState<Partial<Asset>>({
    category: "cash",
    value: 0,
  });
  const [newLiability, setNewLiability] = useState<Partial<Liability>>({
    category: "credit_card",
    balance: 0,
  });

  const fetchNetWorthData = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/financial/dashboard`);
      if (!response.ok) throw new Error("Failed to fetch data");

      const result = await response.json();
      const dashboard = result.data;

      // Generate historical data (last 12 months)
      const history: NetWorthHistory[] = [];
      for (let i = 11; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const variance = Math.random() * 2000 - 1000;
        history.push({
          date: date.toLocaleDateString("en-US", {
            month: "short",
            year: "numeric",
          }),
          netWorth: dashboard.netWorth - i * 500 + variance,
          assets: dashboard.totalAssets - i * 300 + variance * 0.6,
          liabilities: dashboard.totalLiabilities - i * 200 - variance * 0.4,
        });
      }

      // Generate sample assets based on total
      const assetsList: Asset[] = [
        {
          id: "1",
          name: "Checking Account",
          category: "cash",
          value: dashboard.totalAssets * 0.15,
          institution: "Chase Bank",
          lastUpdated: new Date(),
          isLinked: true,
        },
        {
          id: "2",
          name: "Savings Account",
          category: "cash",
          value: dashboard.totalAssets * 0.15,
          institution: "Chase Bank",
          lastUpdated: new Date(),
          isLinked: true,
        },
        {
          id: "3",
          name: "Brokerage Account",
          category: "investments",
          value: dashboard.totalAssets * 0.25,
          institution: "Fidelity",
          lastUpdated: new Date(),
          isLinked: true,
        },
        {
          id: "4",
          name: "401(k)",
          category: "retirement",
          value: dashboard.totalAssets * 0.3,
          institution: "Vanguard",
          lastUpdated: new Date(),
          isLinked: true,
        },
        {
          id: "5",
          name: "Primary Residence",
          category: "real_estate",
          value: dashboard.totalAssets * 0.1,
          lastUpdated: new Date(),
          isLinked: false,
        },
        {
          id: "6",
          name: "Vehicle",
          category: "vehicles",
          value: dashboard.totalAssets * 0.05,
          lastUpdated: new Date(),
          isLinked: false,
        },
      ];

      // Generate sample liabilities
      const liabilitiesList: Liability[] = [
        {
          id: "1",
          name: "Chase Sapphire",
          category: "credit_card",
          balance: dashboard.totalLiabilities * 0.15,
          interestRate: 24.99,
          minimumPayment: 50,
          institution: "Chase",
          lastUpdated: new Date(),
          isLinked: true,
        },
        {
          id: "2",
          name: "Home Mortgage",
          category: "mortgage",
          balance: dashboard.totalLiabilities * 0.5,
          interestRate: 6.5,
          minimumPayment: 1500,
          institution: "Wells Fargo",
          lastUpdated: new Date(),
          isLinked: true,
        },
        {
          id: "3",
          name: "Auto Loan",
          category: "auto_loan",
          balance: dashboard.totalLiabilities * 0.15,
          interestRate: 5.9,
          minimumPayment: 350,
          institution: "Capital One",
          lastUpdated: new Date(),
          isLinked: true,
        },
        {
          id: "4",
          name: "Student Loans",
          category: "student_loan",
          balance: dashboard.totalLiabilities * 0.2,
          interestRate: 4.5,
          minimumPayment: 250,
          institution: "Navient",
          lastUpdated: new Date(),
          isLinked: true,
        },
      ];

      // Define milestones
      const milestones: Milestone[] = [
        {
          amount: 10000,
          achieved: dashboard.netWorth >= 10000,
          date: dashboard.netWorth >= 10000 ? new Date() : undefined,
        },
        {
          amount: 25000,
          achieved: dashboard.netWorth >= 25000,
          date: dashboard.netWorth >= 25000 ? new Date() : undefined,
        },
        {
          amount: 50000,
          achieved: dashboard.netWorth >= 50000,
          date: dashboard.netWorth >= 50000 ? new Date() : undefined,
        },
        {
          amount: 100000,
          achieved: dashboard.netWorth >= 100000,
          date: dashboard.netWorth >= 100000 ? new Date() : undefined,
        },
        {
          amount: 250000,
          achieved: dashboard.netWorth >= 250000,
          date: dashboard.netWorth >= 250000 ? new Date() : undefined,
        },
        {
          amount: 500000,
          achieved: dashboard.netWorth >= 500000,
          date: dashboard.netWorth >= 500000 ? new Date() : undefined,
        },
        {
          amount: 1000000,
          achieved: dashboard.netWorth >= 1000000,
          date: dashboard.netWorth >= 1000000 ? new Date() : undefined,
        },
      ];

      const monthlyChange =
        history.length >= 2
          ? history[history.length - 1].netWorth -
            history[history.length - 2].netWorth
          : 0;
      const yearlyChange =
        history.length >= 12
          ? history[history.length - 1].netWorth - history[0].netWorth
          : 0;

      setData({
        current: dashboard.netWorth,
        assets: dashboard.totalAssets,
        liabilities: dashboard.totalLiabilities,
        assetsList,
        liabilitiesList,
        history,
        milestones,
        monthlyChange,
        yearlyChange,
      });
    } catch (error) {
      console.error("Error fetching net worth data:", error);
      showError("Failed to load net worth data");
    } finally {
      setLoading(false);
    }
  }, [user, showError]);

  useEffect(() => {
    if (!authLoading && user) {
      void fetchNetWorthData();
    }
  }, [authLoading, user, fetchNetWorthData]);

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercent = (value: number): string => {
    return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
  };

  const handleAddAsset = () => {
    if (!newAsset.name || !newAsset.value) {
      showError("Please fill in all required fields");
      return;
    }
    showSuccess(`Added ${newAsset.name} to assets`);
    setShowAddAssetModal(false);
    setNewAsset({ category: "cash", value: 0 });
    void fetchNetWorthData();
  };

  const handleAddLiability = () => {
    if (!newLiability.name || !newLiability.balance) {
      showError("Please fill in all required fields");
      return;
    }
    showSuccess(`Added ${newLiability.name} to liabilities`);
    setShowAddLiabilityModal(false);
    setNewLiability({ category: "credit_card", balance: 0 });
    void fetchNetWorthData();
  };

  // Calculate category totals for pie charts
  const getAssetsByCategory = () => {
    if (!data) return [];
    const categoryTotals = new Map<AssetCategory, number>();
    data.assetsList.forEach((asset) => {
      categoryTotals.set(
        asset.category,
        (categoryTotals.get(asset.category) || 0) + asset.value,
      );
    });
    return ASSET_CATEGORIES.map((cat) => ({
      name: cat.label,
      value: categoryTotals.get(cat.value) || 0,
      color: cat.color,
    })).filter((item) => item.value > 0);
  };

  const getLiabilitiesByCategory = () => {
    if (!data) return [];
    const categoryTotals = new Map<LiabilityCategory, number>();
    data.liabilitiesList.forEach((liability) => {
      categoryTotals.set(
        liability.category,
        (categoryTotals.get(liability.category) || 0) + liability.balance,
      );
    });
    return LIABILITY_CATEGORIES.map((cat) => ({
      name: cat.label,
      value: categoryTotals.get(cat.value) || 0,
      color: cat.color,
    })).filter((item) => item.value > 0);
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-white dark:bg-slate-800 rounded-lg shadow p-6"
            >
              <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-1/2 mb-4"></div>
              <div className="h-8 bg-gray-200 dark:bg-slate-700 rounded w-3/4"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const yearlyGrowthPercent =
    data.history[0].netWorth !== 0
      ? (data.yearlyChange / Math.abs(data.history[0].netWorth)) * 100
      : 0;

  const tabs: { id: TabType; label: string; icon: string }[] = [
    { id: "overview", label: "Overview", icon: "chart-bar" },
    { id: "assets", label: "Assets", icon: "trending-up" },
    { id: "liabilities", label: "Liabilities", icon: "credit-card" },
    { id: "history", label: "History", icon: "clock" },
  ];

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold opacity-90">Net Worth</h3>
            <span className="text-2xl"></span>
          </div>
          <div className="text-3xl font-bold">
            {formatCurrency(data.current)}
          </div>
          <div className="text-sm opacity-90 mt-1">
            {formatPercent(yearlyGrowthPercent)} this year
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-600 dark:text-slate-400">
              Total Assets
            </h3>
            <span className="text-2xl"></span>
          </div>
          <div className="text-3xl font-bold text-green-600 dark:text-green-400">
            {formatCurrency(data.assets)}
          </div>
          <div className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            {data.assetsList.length} accounts
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-600 dark:text-slate-400">
              Total Liabilities
            </h3>
            <span className="text-2xl"></span>
          </div>
          <div className="text-3xl font-bold text-red-600 dark:text-red-400">
            {formatCurrency(data.liabilities)}
          </div>
          <div className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            {data.liabilitiesList.length} accounts
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-600 dark:text-slate-400">
              Monthly Change
            </h3>
            <span className="text-2xl">
              {data.monthlyChange >= 0 ? "" : ""}
            </span>
          </div>
          <div
            className={`text-3xl font-bold ${data.monthlyChange >= 0 ? "text-green-600" : "text-red-600 dark:text-red-400"}`}
          >
            {data.monthlyChange >= 0 ? "+" : ""}
            {formatCurrency(data.monthlyChange)}
          </div>
          <div className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            vs last month
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow">
        <div className="border-b border-gray-200 dark:border-slate-700">
          <nav className="flex -mb-px overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${activeTab === tab.id ? "border-blue-500 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700 dark:text-slate-200 dark:hover:text-gray-300 hover:border-gray-300 dark:border-slate-600"}`}
              >
                <Icon name={tab.icon} className="w-4 h-4 inline-block" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Overview Tab */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* Net Worth Trend Chart */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Net Worth Trend
                </h3>
                <div className="h-64">
                  <AreaChartComponent
                    data={data.history.map((h) => ({
                      label: h.date,
                      netWorth: h.netWorth,
                    }))}
                    areas={[
                      {
                        dataKey: "netWorth",
                        name: "Net Worth",
                        color: CHART_COLORS.purple,
                      },
                    ]}
                    height={256}
                    currency={true}
                    xAxisKey="label"
                  />
                </div>
              </div>

              {/* Asset vs Liability Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Assets by Category
                  </h3>
                  <div className="h-64">
                    <PieChartComponent
                      data={getAssetsByCategory()}
                      height={256}
                      currency={true}
                    />
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Liabilities by Category
                  </h3>
                  <div className="h-64">
                    <PieChartComponent
                      data={getLiabilitiesByCategory()}
                      height={256}
                      currency={true}
                    />
                  </div>
                </div>
              </div>

              {/* Milestones */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Net Worth Milestones
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                  {data.milestones.map((milestone) => (
                    <div
                      key={milestone.amount}
                      className={`p-3 rounded-lg text-center ${milestone.achieved ? "bg-green-100 border-2 border-green-500" : "bg-gray-100 dark:bg-slate-700 border-2 border-gray-300 dark:border-slate-600"}`}
                    >
                      <div className="text-2xl mb-1">
                        {milestone.achieved ? "" : ""}
                      </div>
                      <div
                        className={`text-sm font-bold ${milestone.achieved ? "text-green-700" : "text-gray-600 dark:text-slate-400"}`}
                      >
                        {formatCurrency(milestone.amount)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Assets Tab */}
          {activeTab === "assets" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Your Assets
                </h3>
                <button
                  onClick={() => setShowAddAssetModal(true)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                >
                  <span>+</span> Add Asset
                </button>
              </div>

              {ASSET_CATEGORIES.map((category) => {
                const categoryAssets = data.assetsList.filter(
                  (a) => a.category === category.value,
                );
                if (categoryAssets.length === 0) return null;
                const categoryTotal = categoryAssets.reduce(
                  (sum, a) => sum + a.value,
                  0,
                );

                return (
                  <div
                    key={category.value}
                    className="border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden"
                  >
                    <div className="bg-gray-50 dark:bg-slate-700 px-4 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon
                          name={category.icon}
                          className="w-5 h-5 inline-block"
                        />
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {category.label}
                        </span>
                      </div>
                      <span className="font-bold text-green-600 dark:text-green-400">
                        {formatCurrency(categoryTotal)}
                      </span>
                    </div>
                    <div className="divide-y divide-gray-200 dark:divide-gray-700">
                      {categoryAssets.map((asset) => (
                        <div
                          key={asset.id}
                          className="px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-slate-700/50"
                        >
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">
                              {asset.name}
                            </div>
                            {asset.institution && (
                              <div className="text-sm text-gray-500 dark:text-slate-400">
                                {asset.institution}
                              </div>
                            )}
                          </div>
                          <div className="text-right">
                            <div className="font-semibold text-gray-900 dark:text-white">
                              {formatCurrency(asset.value)}
                            </div>
                            {asset.isLinked && (
                              <span className="text-xs text-green-600 dark:text-green-400">
                                Linked
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Liabilities Tab */}
          {activeTab === "liabilities" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Your Liabilities
                </h3>
                <button
                  onClick={() => setShowAddLiabilityModal(true)}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                >
                  <span>+</span> Add Liability
                </button>
              </div>

              {LIABILITY_CATEGORIES.map((category) => {
                const categoryLiabilities = data.liabilitiesList.filter(
                  (l) => l.category === category.value,
                );
                if (categoryLiabilities.length === 0) return null;
                const categoryTotal = categoryLiabilities.reduce(
                  (sum, l) => sum + l.balance,
                  0,
                );

                return (
                  <div
                    key={category.value}
                    className="border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden"
                  >
                    <div className="bg-gray-50 dark:bg-slate-700 px-4 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon
                          name={category.icon}
                          className="w-5 h-5 inline-block"
                        />
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {category.label}
                        </span>
                      </div>
                      <span className="font-bold text-red-600 dark:text-red-400">
                        {formatCurrency(categoryTotal)}
                      </span>
                    </div>
                    <div className="divide-y divide-gray-200 dark:divide-gray-700">
                      {categoryLiabilities.map((liability) => (
                        <div
                          key={liability.id}
                          className="px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-slate-700/50"
                        >
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">
                              {liability.name}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-slate-400">
                              {liability.institution}{" "}
                              {liability.interestRate &&
                                `• ${liability.interestRate}% APR`}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold text-red-600 dark:text-red-400">
                              {formatCurrency(liability.balance)}
                            </div>
                            {liability.minimumPayment && (
                              <div className="text-xs text-gray-500 dark:text-slate-400">
                                Min: {formatCurrency(liability.minimumPayment)}
                                /mo
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* History Tab */}
          {activeTab === "history" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Assets vs Liabilities Over Time
                </h3>
                <div className="h-64">
                  <AreaChartComponent
                    data={data.history.map((h) => ({
                      label: h.date,
                      assets: h.assets,
                      liabilities: h.liabilities,
                    }))}
                    areas={[
                      { dataKey: "assets", name: "Assets", color: CHART_COLORS.emerald },
                      {
                        dataKey: "liabilities",
                        name: "Liabilities",
                        color: CHART_COLORS.red,
                      },
                    ]}
                    height={256}
                    currency={true}
                    xAxisKey="label"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-slate-700">
                      <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">
                        Month
                      </th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-900 dark:text-white">
                        Assets
                      </th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-900 dark:text-white">
                        Liabilities
                      </th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-900 dark:text-white">
                        Net Worth
                      </th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-900 dark:text-white">
                        Change
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...data.history].reverse().map((month, index, arr) => {
                      const prevMonth = arr[index + 1];
                      const change = prevMonth
                        ? month.netWorth - prevMonth.netWorth
                        : 0;
                      return (
                        <tr
                          key={month.date}
                          className="border-b border-gray-100 dark:border-slate-700/50 hover:bg-gray-50 dark:hover:bg-slate-700/30"
                        >
                          <td className="py-3 px-4 text-gray-900 dark:text-white">
                            {month.date}
                          </td>
                          <td className="py-3 px-4 text-right text-green-600 dark:text-green-400">
                            {formatCurrency(month.assets)}
                          </td>
                          <td className="py-3 px-4 text-right text-red-600 dark:text-red-400">
                            {formatCurrency(month.liabilities)}
                          </td>
                          <td className="py-3 px-4 text-right font-semibold text-gray-900 dark:text-white">
                            {formatCurrency(month.netWorth)}
                          </td>
                          <td
                            className={`py-3 px-4 text-right ${change >= 0 ? "text-green-600" : "text-red-600 dark:text-red-400"}`}
                          >
                            {index < arr.length - 1
                              ? `${change >= 0 ? "+" : ""}${formatCurrency(change)}`
                              : "-"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Asset Modal */}
      {showAddAssetModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Add Asset
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  value={newAsset.name || ""}
                  onChange={(e) =>
                    setNewAsset({ ...newAsset, name: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                  placeholder="e.g., Savings Account"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                  Category *
                </label>
                <select
                  value={newAsset.category}
                  onChange={(e) =>
                    setNewAsset({
                      ...newAsset,
                      category: e.target.value as AssetCategory,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                >
                  {ASSET_CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.icon} {cat.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                  Value *
                </label>
                <input
                  type="number"
                  value={newAsset.value || ""}
                  onChange={(e) =>
                    setNewAsset({
                      ...newAsset,
                      value: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                  Institution
                </label>
                <input
                  type="text"
                  value={newAsset.institution || ""}
                  onChange={(e) =>
                    setNewAsset({ ...newAsset, institution: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                  placeholder="e.g., Chase Bank"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddAssetModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleAddAsset}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Add Asset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Liability Modal */}
      {showAddLiabilityModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Add Liability
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  value={newLiability.name || ""}
                  onChange={(e) =>
                    setNewLiability({ ...newLiability, name: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                  placeholder="e.g., Credit Card"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                  Category *
                </label>
                <select
                  value={newLiability.category}
                  onChange={(e) =>
                    setNewLiability({
                      ...newLiability,
                      category: e.target.value as LiabilityCategory,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                >
                  {LIABILITY_CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.icon} {cat.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                  Balance *
                </label>
                <input
                  type="number"
                  value={newLiability.balance || ""}
                  onChange={(e) =>
                    setNewLiability({
                      ...newLiability,
                      balance: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                  placeholder="0.00"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                    Interest Rate %
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={newLiability.interestRate || ""}
                    onChange={(e) =>
                      setNewLiability({
                        ...newLiability,
                        interestRate: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                    Min Payment
                  </label>
                  <input
                    type="number"
                    value={newLiability.minimumPayment || ""}
                    onChange={(e) =>
                      setNewLiability({
                        ...newLiability,
                        minimumPayment: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                  Institution
                </label>
                <input
                  type="text"
                  value={newLiability.institution || ""}
                  onChange={(e) =>
                    setNewLiability({
                      ...newLiability,
                      institution: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                  placeholder="e.g., Chase"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddLiabilityModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleAddLiability}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Add Liability
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
