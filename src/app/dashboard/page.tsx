"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { SpendingOverview } from "@/components/financial/SpendingOverview";
import { PaydayCountdown } from "@/components/financial/PaydayCountdown";
import { XpBar, StreakDisplay } from "@/components/gamification";
import { useGamification } from "@/hooks/useGamification";
import { FadeIn, StaggerList, ScrollReveal } from "@/components/ui/animations";
import type { FinancialDashboard } from "@/lib/financial/financial-service";
import type { PaydayCountdown as PaydayCountdownData } from "@/lib/financial/income-tracking-service";
import type { RecurringCharge } from "@/lib/financial/types/savings.types";

interface User {
  id: string;
  email: string;
  user_metadata: {
    full_name?: string;
  };
}

// View-models mapped from the real API responses this page consumes. No mock
// fallback: when a source is empty or errors, the widget shows an honest
// empty/error state rather than fabricated numbers.
interface SpendingView {
  totalSpent: number;
  lastMonthSpent: number;
  categories: {
    name: string;
    value: number;
    color: string;
    percentage: number;
  }[];
}

interface SubscriptionView {
  name: string;
  amount: number;
  category: string;
}

interface CreditView {
  score: number | null;
  change: number | null;
}

interface DisputesView {
  pending: number;
  resolved: number;
  total: number;
}

// Real API response shapes (fields verified against the route/service source):
// - /api/financial/dashboard → { data: FinancialDashboard } (withPermission)
// - /api/financial/income → { countdown: PaydayCountdown | null } (withAuth)
// - /api/financial/savings/subscriptions → { data: { subscriptions } } (withPermission)
// - /api/user/analytics → { creditHistory, disputeStats } (withAuth)
interface DashboardApiResponse {
  data: FinancialDashboard;
}
interface IncomeApiResponse {
  countdown: PaydayCountdownData | null;
}
interface SubscriptionsApiResponse {
  data?: { subscriptions?: RecurringCharge[] };
}
interface AnalyticsApiResponse {
  creditHistory: { date: string; score: number }[];
  disputeStats: {
    total: number;
    resolved: number;
    pending: number;
    successRate: number;
  };
}

/**
 * Honest inline error card for a widget whose data source failed. Renders no
 * fabricated data — just a message prompting a refresh.
 */
function WidgetError({ label }: { label: string }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-5 flex items-center justify-center text-center min-h-[140px]">
      <div>
        <div className="mx-auto w-10 h-10 bg-red-50 dark:bg-red-950/40 rounded-full flex items-center justify-center mb-3">
          <svg
            className="w-5 h-5 text-red-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
            />
          </svg>
        </div>
        <p className="text-sm text-gray-500 dark:text-slate-400">
          Couldn&apos;t load {label} data. Please refresh.
        </p>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const router = useRouter();
  const { progress: gamificationProgress } = useGamification();

  // Real dashboard data. Each widget owns its honest loading / empty / error
  // state so a single failed source never blanks another (or falls back to
  // fabricated numbers).
  const [spending, setSpending] = useState<SpendingView | null>(null);
  const [spendingError, setSpendingError] = useState(false);
  const [savingsRate, setSavingsRate] = useState<number | null>(null);
  const [payday, setPayday] = useState<PaydayCountdownData | null>(null);
  const [paydayError, setPaydayError] = useState(false);
  const [subscriptions, setSubscriptions] = useState<SubscriptionView[] | null>(
    null,
  );
  const [subscriptionsError, setSubscriptionsError] = useState(false);
  const [credit, setCredit] = useState<CreditView | null>(null);
  const [creditError, setCreditError] = useState(false);
  const [disputes, setDisputes] = useState<DisputesView | null>(null);
  const [disputesError, setDisputesError] = useState(false);

  const loadDashboardData = useCallback(async (accessToken: string) => {
    setDataLoading(true);
    const headers = { Authorization: `Bearer ${accessToken}` };

    const [dashboardRes, incomeRes, subsRes, analyticsRes] =
      await Promise.allSettled([
        fetch("/api/financial/dashboard", { headers }),
        fetch("/api/financial/income", { headers }),
        fetch("/api/financial/savings/subscriptions", { headers }),
        fetch("/api/user/analytics", { headers }),
      ]);

    // Spending + savings rate ← /api/financial/dashboard
    try {
      if (dashboardRes.status !== "fulfilled" || !dashboardRes.value.ok) {
        throw new Error("dashboard");
      }
      const body = (await dashboardRes.value.json()) as DashboardApiResponse;
      const d = body.data;
      setSpending({
        totalSpent: d.monthlyExpenses,
        // monthlyTrend is oldest-first; the entry before the current month is
        // last month. Absent history → 0 (widget shows a neutral comparison).
        lastMonthSpent:
          d.monthlyTrend.length >= 2
            ? d.monthlyTrend[d.monthlyTrend.length - 2].expenses
            : 0,
        categories: d.spendingByCategory.map((c) => ({
          name: c.category,
          value: c.amount,
          color: "", // SpendingOverview resolves a color by name.
          percentage: c.percentage,
        })),
      });
      setSavingsRate(d.savingsRate);
    } catch {
      setSpendingError(true);
    }

    // Payday ← /api/financial/income (countdown is null when no income sources)
    try {
      if (incomeRes.status !== "fulfilled" || !incomeRes.value.ok) {
        throw new Error("income");
      }
      const body = (await incomeRes.value.json()) as IncomeApiResponse;
      setPayday(
        body.countdown
          ? {
              ...body.countdown,
              // Dates arrive as ISO strings over JSON.
              nextPayDate: new Date(body.countdown.nextPayDate),
            }
          : null,
      );
    } catch {
      setPaydayError(true);
    }

    // Subscriptions ← /api/financial/savings/subscriptions
    try {
      if (subsRes.status !== "fulfilled" || !subsRes.value.ok) {
        throw new Error("subscriptions");
      }
      const body = (await subsRes.value.json()) as SubscriptionsApiResponse;
      setSubscriptions(
        (body.data?.subscriptions ?? []).map((rc) => ({
          name: rc.merchantName,
          amount: rc.amount,
          category: rc.category,
        })),
      );
    } catch {
      setSubscriptionsError(true);
    }

    // Credit + disputes ← /api/user/analytics
    try {
      if (analyticsRes.status !== "fulfilled" || !analyticsRes.value.ok) {
        throw new Error("analytics");
      }
      const body = (await analyticsRes.value.json()) as AnalyticsApiResponse;
      const history = body.creditHistory ?? [];
      setCredit({
        score: history.length > 0 ? history[history.length - 1].score : null,
        change:
          history.length >= 2
            ? history[history.length - 1].score - history[0].score
            : null,
      });
      setDisputes({
        pending: body.disputeStats.pending,
        resolved: body.disputeStats.resolved,
        total: body.disputeStats.total,
      });
    } catch {
      setCreditError(true);
      setDisputesError(true);
    }

    setDataLoading(false);
  }, []);

  useEffect(() => {
    const init = async () => {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push("/auth/login");
        return;
      }

      setUser(session.user as User);
      setLoading(false);
      await loadDashboardData(session.access_token);
    };

    init();
  }, [router, loadDashboardData]);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
  };

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900"
        role="alert"
        aria-busy="true"
        aria-live="polite"
      >
        <div className="text-center">
          <div
            className="animate-spin rounded-full h-16 w-16 sm:h-32 sm:w-32 border-b-2 border-blue-600 mx-auto mb-4"
            aria-hidden="true"
          ></div>
          <p className="text-gray-600 dark:text-slate-300">
            Loading your AI credit dashboard...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      {/* Header */}
      <header className="bg-white dark:bg-slate-900/80 backdrop-blur-xl shadow-sm border-b border-gray-200 dark:border-slate-700/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-blue-500 rounded-md flex items-center justify-center">
                <span
                  className="text-white font-bold text-sm"
                  aria-hidden="true"
                >
                  F
                </span>
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900 dark:text-white tracking-tight">
                  Fynvita
                </h1>
              </div>
            </div>

            {/* Navigation */}
            <nav className="hidden lg:flex items-center space-x-4 xl:space-x-6">
              <a
                href="/dashboard"
                className="text-sm font-medium text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 pb-1 whitespace-nowrap"
              >
                Dashboard
              </a>
              <a
                href="/credit-builder"
                className="text-sm font-medium text-gray-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors whitespace-nowrap"
              >
                Credit Builder
              </a>
              <a
                href="/marketplace"
                className="text-sm font-medium text-gray-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors whitespace-nowrap"
              >
                Marketplace
              </a>
              <a
                href="/student-loan-agent"
                className="text-sm font-medium text-gray-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors whitespace-nowrap"
              >
                Student Loans
              </a>
              <a
                href="/pricing"
                className="text-sm font-medium text-gray-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors whitespace-nowrap"
              >
                Pricing
              </a>
            </nav>

            <div className="flex items-center space-x-2 sm:space-x-4 min-w-0 flex-shrink-0">
              <span className="hidden md:block text-sm text-gray-700 dark:text-slate-300 max-w-[120px] lg:max-w-[180px] truncate">
                Welcome, {user?.user_metadata?.full_name || user?.email}
              </span>
              <button
                onClick={handleSignOut}
                className="hidden sm:block px-3 sm:px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-md text-sm font-medium text-gray-700 dark:text-slate-200 bg-white dark:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors whitespace-nowrap flex-shrink-0"
              >
                Sign Out
              </button>
              {/* Mobile menu button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 rounded-md text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                aria-label="Toggle mobile menu"
                aria-expanded={mobileMenuOpen}
              >
                {mobileMenuOpen ? (
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                ) : (
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Mobile Navigation Menu */}
          {mobileMenuOpen && (
            <div className="lg:hidden border-t border-gray-200 dark:border-slate-700 py-4">
              <nav className="flex flex-col space-y-2">
                <a
                  href="/dashboard"
                  className="px-3 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 rounded-lg"
                >
                  Dashboard
                </a>
                <a
                  href="/credit-builder"
                  className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                  Credit Builder
                </a>
                <a
                  href="/marketplace"
                  className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                  Marketplace
                </a>
                <a
                  href="/student-loan-agent"
                  className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                  Student Loans
                </a>
                <a
                  href="/pricing"
                  className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                  Pricing
                </a>
                <div className="border-t border-gray-200 dark:border-slate-700 my-2 pt-2">
                  <p className="px-3 py-1 text-xs text-gray-500 dark:text-slate-400">
                    Signed in as {user?.user_metadata?.full_name || user?.email}
                  </p>
                  <button
                    onClick={handleSignOut}
                    className="w-full text-left px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                  >
                    Sign Out
                  </button>
                </div>
              </nav>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section with Vitality Score */}
        <FadeIn className="mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Welcome back, {user?.user_metadata?.full_name || "there"}!
          </h2>
          <p className="text-gray-600 dark:text-slate-300 text-sm sm:text-base">
            Your complete financial health dashboard - track credit, spending,
            and reach your goals.
          </p>
        </FadeIn>

        {/* Financial Vitality Score - Hero Widget.
            The vitality engine currently has no real per-user data source (its
            component scores are not yet wired to live data), so we render an
            honest "set up your score" state rather than a fabricated number. */}
        <div className="mb-8">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-5">
            <div className="flex items-center gap-5">
              <div className="w-28 h-28 rounded-full border-4 border-dashed border-gray-200 dark:border-slate-700 flex items-center justify-center flex-shrink-0">
                <svg
                  className="w-10 h-10 text-gray-400 dark:text-slate-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                  Financial Vitality Score
                </h3>
                <p className="text-sm text-gray-500 dark:text-slate-400 mb-3">
                  Connect your accounts and complete your financial profile to
                  calculate your Vitality Score.
                </p>
                <Link
                  href="/dashboard/vitality"
                  className="text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors"
                >
                  Set up your score →
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Gamification Progress Widget */}
        {gamificationProgress && (
          <div className="mb-8 bg-gradient-to-r from-emerald-600 to-blue-600 rounded-xl p-6 text-white">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 bg-white dark:bg-slate-800/20 rounded-lg flex items-center justify-center">
                    <svg
                      className="w-6 h-6 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M18.75 4.236c.982.143 1.954.317 2.916.52A6.003 6.003 0 0016.27 9.728M18.75 4.236V4.5c0 2.108-.966 3.99-2.48 5.228M18.75 4.236V2.721M16.27 9.728l-.254.255a8.287 8.287 0 01-4.016 2.19M7.73 9.728l.254.255a8.287 8.287 0 004.016 2.19m0 0a.75.75 0 00.75-.75V14.25"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">
                      Level {gamificationProgress.level.current}
                    </h3>
                    <p className="text-emerald-200 text-sm">
                      {gamificationProgress.level.title}
                    </p>
                  </div>
                </div>
                <XpBar
                  currentXp={
                    gamificationProgress.xp.totalEarned -
                    gamificationProgress.xp.toNextLevel
                  }
                  xpToNextLevel={gamificationProgress.xp.toNextLevel}
                  currentLevel={gamificationProgress.level.current}
                  levelTitle={gamificationProgress.level.title}
                  showDetails={false}
                />
              </div>
              <div className="flex items-center gap-4">
                <StreakDisplay
                  streak={gamificationProgress.streak.days}
                  multiplier={gamificationProgress.streak.multiplier}
                  size="md"
                />
                <Link
                  href="/rewards"
                  className="px-4 py-2 bg-white hover:bg-white dark:bg-slate-800/30 rounded-lg text-sm font-medium transition-colors"
                >
                  View Rewards →
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Top Row - Key Widgets */}
        <StaggerList stagger={0.1} className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Payday Countdown */}
          {paydayError ? (
            <WidgetError label="payday" />
          ) : (
            <PaydayCountdown
              isLoading={dataLoading}
              daysUntilPayday={payday?.daysUntilPayday}
              nextPayDate={payday?.nextPayDate}
              expectedAmount={payday?.expectedAmount}
              sourceName={payday?.sourceName}
              percentComplete={payday?.percentComplete}
              hasIncomeSources={!dataLoading && payday !== null}
            />
          )}

          {/* Spending Overview */}
          {spendingError ? (
            <WidgetError label="spending" />
          ) : (
            <SpendingOverview
              isLoading={dataLoading}
              totalSpent={spending?.totalSpent ?? 0}
              lastMonthSpent={spending?.lastMonthSpent ?? 0}
              categories={spending?.categories ?? []}
            />
          )}

          {/* Subscriptions Widget */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-5 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-slate-400 mb-1">
                  Active Subscriptions
                </h3>
                {dataLoading ? (
                  <div className="h-8 w-28 bg-gray-200 dark:bg-slate-700 rounded animate-pulse" />
                ) : subscriptionsError ? (
                  <p className="text-sm text-red-500 dark:text-red-400">
                    Couldn&apos;t load subscriptions
                  </p>
                ) : (
                  <>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      $
                      {(subscriptions ?? [])
                        .reduce((sum, s) => sum + s.amount, 0)
                        .toFixed(0)}
                      /mo
                    </p>
                    <p className="text-sm text-gray-500 dark:text-slate-400">
                      {(subscriptions ?? []).length} subscriptions
                    </p>
                  </>
                )}
              </div>
              <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-blue-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3"
                  />
                </svg>
              </div>
            </div>
            {!dataLoading && !subscriptionsError && (
              <div className="space-y-2 mb-4">
                {(subscriptions ?? []).length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-slate-400">
                    No recurring subscriptions detected yet.
                  </p>
                ) : (
                  (subscriptions ?? []).slice(0, 3).map((sub, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-gray-700 dark:text-slate-300">
                        {sub.name}
                      </span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        ${sub.amount.toFixed(2)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}
            <Link
              href="/dashboard/subscriptions"
              className="text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors"
            >
              Manage subscriptions →
            </Link>
          </div>
        </StaggerList>

        {/* Key Metrics Row */}
        <StaggerList stagger={0.1} className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-slate-800/80 backdrop-blur-sm border border-gray-200 dark:border-slate-700/50 shadow-sm rounded-lg p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-medium text-gray-600 dark:text-slate-400">
                Credit Score
              </h3>
              <div className="w-8 h-8 rounded-md bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center">
                <svg
                  className="w-4 h-4 text-emerald-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.281m5.94 2.28l-2.28 5.941"
                  />
                </svg>
              </div>
            </div>
            {dataLoading ? (
              <div className="h-6 w-16 bg-gray-200 dark:bg-slate-700 rounded animate-pulse" />
            ) : creditError ? (
              <div className="text-xl font-bold text-gray-400 dark:text-slate-500">
                —
              </div>
            ) : credit?.score != null ? (
              <>
                <div className="text-xl font-bold text-green-600 dark:text-green-400">
                  {credit.score}
                </div>
                {credit.change != null && credit.change !== 0 && (
                  <p
                    className={`text-xs ${
                      credit.change > 0
                        ? "text-green-600 dark:text-green-400"
                        : "text-red-600 dark:text-red-400"
                    }`}
                  >
                    {credit.change > 0 ? "+" : ""}
                    {credit.change} this period
                  </p>
                )}
              </>
            ) : (
              <>
                <div className="text-xl font-bold text-gray-400 dark:text-slate-500">
                  —
                </div>
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  No score yet
                </p>
              </>
            )}
          </div>

          <div className="bg-white dark:bg-slate-800/80 backdrop-blur-sm border border-gray-200 dark:border-slate-700/50 shadow-sm rounded-lg p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-medium text-gray-600 dark:text-slate-400">
                Active Disputes
              </h3>
              <div className="w-8 h-8 rounded-md bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center">
                <svg
                  className="w-4 h-4 text-amber-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                  />
                </svg>
              </div>
            </div>
            {dataLoading ? (
              <div className="h-6 w-12 bg-gray-200 dark:bg-slate-700 rounded animate-pulse" />
            ) : disputesError ? (
              <div className="text-xl font-bold text-gray-400 dark:text-slate-500">
                —
              </div>
            ) : (
              <>
                <div className="text-xl font-bold text-gray-900 dark:text-white">
                  {disputes?.pending ?? 0}
                </div>
                <p className="text-xs text-gray-600 dark:text-slate-400">
                  {disputes?.resolved ?? 0} resolved
                </p>
              </>
            )}
          </div>

          <div className="bg-white dark:bg-slate-800/80 backdrop-blur-sm border border-gray-200 dark:border-slate-700/50 shadow-sm rounded-lg p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-medium text-gray-600 dark:text-slate-400">
                Savings Rate
              </h3>
              <div className="w-8 h-8 rounded-md bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center">
                <svg
                  className="w-4 h-4 text-emerald-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z"
                  />
                </svg>
              </div>
            </div>
            {dataLoading ? (
              <div className="h-6 w-16 bg-gray-200 dark:bg-slate-700 rounded animate-pulse" />
            ) : spendingError ? (
              <div className="text-xl font-bold text-gray-400 dark:text-slate-500">
                —
              </div>
            ) : savingsRate != null ? (
              <>
                <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                  {savingsRate.toFixed(0)}%
                </div>
                <p className="text-xs text-gray-600 dark:text-slate-400">
                  of income
                </p>
              </>
            ) : (
              <>
                <div className="text-xl font-bold text-gray-400 dark:text-slate-500">
                  —
                </div>
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  No data yet
                </p>
              </>
            )}
          </div>

          <div className="bg-white dark:bg-slate-800/80 backdrop-blur-sm border border-gray-200 dark:border-slate-700/50 shadow-sm rounded-lg p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-medium text-gray-600 dark:text-slate-400">
                Transaction Rules
              </h3>
              <div className="w-8 h-8 rounded-md bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center">
                <svg
                  className="w-4 h-4 text-blue-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </div>
            </div>
            {/* No real transaction-rules data source exists yet, so we show an
                honest empty state instead of a fabricated count. */}
            <div className="text-xl font-bold text-gray-400 dark:text-slate-500">
              —
            </div>
            <Link
              href="/dashboard/settings/transaction-rules"
              className="text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors"
            >
              Set up rules →
            </Link>
          </div>
        </StaggerList>

        {/* Quick Actions */}
        <ScrollReveal>
        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-sm rounded-xl p-4 sm:p-6 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-md bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center">
              <svg
                className="w-4 h-4 text-emerald-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"
                />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Quick Actions
            </h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <Link
              href="/dashboard/vitality"
              className="flex flex-col items-center justify-center p-4 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-lg transition-all"
            >
              <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center mb-2">
                <svg
                  className="w-5 h-5 text-emerald-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
                  />
                </svg>
              </div>
              <span className="text-xs text-gray-700 dark:text-slate-300 text-center">
                Vitality Score
              </span>
            </Link>
            <Link
              href="/dashboard/spending"
              className="flex flex-col items-center justify-center p-4 border border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-all"
            >
              <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center mb-2">
                <svg
                  className="w-5 h-5 text-blue-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z"
                  />
                </svg>
              </div>
              <span className="text-xs text-gray-700 dark:text-slate-300 text-center">
                Spending
              </span>
            </Link>
            <Link
              href="/dashboard/subscriptions"
              className="flex flex-col items-center justify-center p-4 border border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-all"
            >
              <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center mb-2">
                <svg
                  className="w-5 h-5 text-blue-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3"
                  />
                </svg>
              </div>
              <span className="text-xs text-gray-700 dark:text-slate-300 text-center">
                Subscriptions
              </span>
            </Link>
            <Link
              href="/dashboard/settings/transaction-rules"
              className="flex flex-col items-center justify-center p-4 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-lg transition-all"
            >
              <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center mb-2">
                <svg
                  className="w-5 h-5 text-emerald-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </div>
              <span className="text-xs text-gray-700 dark:text-slate-300 text-center">
                Rules
              </span>
            </Link>
            <Link
              href="/credit-builder"
              className="flex flex-col items-center justify-center p-4 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-lg transition-all"
            >
              <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center mb-2">
                <svg
                  className="w-5 h-5 text-emerald-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.281m5.94 2.28l-2.28 5.941"
                  />
                </svg>
              </div>
              <span className="text-xs text-gray-700 dark:text-slate-300 text-center">
                Credit Builder
              </span>
            </Link>
            <Link
              href="/student-loan-agent"
              className="flex flex-col items-center justify-center p-4 border border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-all"
            >
              <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center mb-2">
                <svg
                  className="w-5 h-5 text-blue-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5"
                  />
                </svg>
              </div>
              <span className="text-xs text-gray-700 dark:text-slate-300 text-center">
                Student Loans
              </span>
            </Link>
          </div>
        </div>
        </ScrollReveal>

        {/* Student Loan CTA */}
        <ScrollReveal delay={0.15}>
        <div className="bg-gradient-to-r from-emerald-600 to-blue-600 rounded-xl p-6 text-white">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between">
            <div className="mb-4 sm:mb-0">
              <h2 className="text-xl font-bold mb-2">
                Improve Your Financial Vitality
              </h2>
              <p className="text-emerald-100 text-sm sm:text-base">
                Complete your financial profile to get personalized
                recommendations and boost your score
              </p>
            </div>
            <Link
              href="/dashboard/vitality"
              className="bg-white dark:bg-slate-800 text-emerald-600 px-6 py-3 rounded-lg font-medium hover:bg-emerald-50 transition-colors whitespace-nowrap focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-emerald-600"
            >
              View Score Details
            </Link>
          </div>
        </div>
        </ScrollReveal>
      </main>
    </div>
  );
}
