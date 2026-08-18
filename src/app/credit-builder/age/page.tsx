"use client";

/**
 * Credit Age Tracker.
 *
 * THREE CLAIMS REMOVED.
 *
 * 1. THE ACCOUNTS. A useState initialiser named creditors and open dates, so
 *    the average age, the oldest and newest account, and every recommendation
 *    were computed from a credit history nobody had read. Now from
 *    useCreditAccounts -> GET /api/credit-repair/accounts.
 *
 * 2. "IMPACT IF CLOSED: -25 points". A score prediction with nothing behind
 *    it. Nothing in this app models what closing an account does to a score,
 *    and the figure differed per account as though it had been calculated.
 *
 * 3. "SIMULATE CLOSURE" / "REOPEN". The button flipped an account's status in
 *    local state. Harmless over hardcoded rows; over the reader's real
 *    tradelines it would show an open account as closed. Status now comes from
 *    `closed_date`, and is not editable.
 *
 * THE SCHEMA CHANGE THIS NEEDED. `closed_date` exists on credit_accounts but
 * was not in ACCOUNT_SELECT, so nothing downstream could tell an open account
 * from a closed one — which is why the screen was asserting it. Threaded
 * through the db service, the route projection and the hook in this commit.
 *
 * ON UNKNOWN AGE. `ageMonths` is null when a row has no opened_date. Such an
 * account is shown as "Unknown" and excluded from the averages, rather than
 * folded in as 0 — a zero would drag every figure down with a number nobody
 * recorded.
 */

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useCreditAccounts } from "@/hooks/useCreditAccounts";

interface Account {
  id: string;
  name: string;
  type: "credit_card" | "loan" | "mortgage";
  openDate: string;
  ageYears: number | null;
  status: "open" | "closed";
}

const MONTHS_PER_YEAR = 12;

/** Bureau `account_type` values folded to the three kinds this screen shows. */
function accountKindOf(accountType: string): Account["type"] {
  const kind = accountType.trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (kind.includes("mortgage") || kind.includes("real_estate")) return "mortgage";
  if (kind.includes("card") || kind.includes("revolving")) return "credit_card";
  return "loan";
}

export default function CreditAgePage() {
  const { user, loading: authLoading } = useAuth();
  // The reader's OWN tradelines, via useCreditAccounts ->
  // GET /api/credit-repair/accounts. This was a useState initialiser naming
  // creditors and open dates, so the average age, the oldest account and
  // every recommendation were computed from a history nobody had read.
  // Invisible to audit:screen-data until da4323a.
  const { accounts: tradelines, loading: loadingAccounts, error: accountsError } =
    useCreditAccounts();

  const accounts: Account[] = tradelines.map((line) => ({
    id: line.id,
    name: line.creditorName,
    type: accountKindOf(line.accountType),
    openDate: line.openedDate ?? "",
    // ageMonths is null when the row has no opened_date; the screen shows
    // that as unknown rather than as a brand-new account.
    ageYears: line.ageMonths === null ? null : line.ageMonths / MONTHS_PER_YEAR,
    // Derived from closed_date, not asserted and not toggleable.
    status: line.closedDate ? "closed" : "open",
  }));

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-slate-300">Loading...</p>
        </div>
      </div>
    );
  }

  const openAccounts = accounts.filter((acc) => acc.status === "open");
  // Only accounts with a known open date can contribute to an age figure. A
  // row with no opened_date has an unknown age, and folding it in as 0 would
  // drag every average down with a number nobody recorded.
  const datedAges = openAccounts
    .map((acc) => acc.ageYears)
    .filter((years): years is number => years !== null);
  const averageAge =
    datedAges.length > 0
      ? datedAges.reduce((sum, years) => sum + years, 0) / datedAges.length
      : 0;
  const oldestAccount = datedAges.length > 0 ? Math.max(...datedAges) : 0;
  // No dated account means the age figures are UNKNOWN, not zero. Rendering
  // 0.0 would assert an average age of nothing.
  const ageKnown = datedAges.length > 0;
  const yrs = (value: number) => (ageKnown ? `${value.toFixed(1)} yrs` : "Unknown");
  const newestAccount = datedAges.length > 0 ? Math.min(...datedAges) : 0;

  const getAgeColor = (years: number) => {
    if (years >= 7) return "text-green-600";
    if (years >= 3) return "text-yellow-600";
    return "text-red-600";
  };

  const getAgeStatus = (years: number) => {
    if (years >= 7)
      return { label: "Excellent", color: "bg-green-100 text-green-700" };
    if (years >= 3)
      return { label: "Good", color: "bg-yellow-100 text-yellow-700" };
    return { label: "Building", color: "bg-red-100 text-red-700" };
  };


  const calculateProjectedAge = (monthsAhead: number) => {
    const yearsAhead = monthsAhead / 12;
    return averageAge + yearsAhead;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Link
            href="/credit-builder"
            className="text-sm text-emerald-600 hover:text-emerald-700 mb-2 inline-block"
          >
            ← Back to Credit Builder
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Credit Age Tracker
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-slate-300">
            Protect and grow your account age for long-term score benefits
          </p>
        </div>
      </div>

      {/* Summary Banner */}
      <div className="bg-gradient-to-r from-emerald-500 to-rose-500 text-white">
        {accountsError && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-amber-200 dark:border-amber-900/50">
            <p className="font-medium text-gray-900 dark:text-white mb-1">
              Your accounts could not be loaded
            </p>
            <p className="text-sm text-gray-600 dark:text-slate-300">
              {accountsError}
            </p>
          </div>
        </div>
      )}

      {!accountsError && !loadingAccounts && accounts.length === 0 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-200 dark:border-slate-700">
            <p className="font-medium text-gray-900 dark:text-white mb-1">
              No accounts on your report yet
            </p>
            <p className="text-sm text-gray-600 dark:text-slate-300">
              Credit age is measured from the tradelines on your report. We
              found none, so the figures below stay at zero rather than being
              filled in with an example history.
            </p>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-4xl font-bold mb-2">
                {yrs(averageAge)}
              </div>
              <div className="text-sm text-emerald-100">
                Average Account Age
              </div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold mb-2">
                {yrs(oldestAccount)}
              </div>
              <div className="text-sm text-emerald-100">Oldest Account</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold mb-2">
                {yrs(newestAccount)}
              </div>
              <div className="text-sm text-emerald-100">Newest Account</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Info Section */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-50 border-2 border-blue-200 rounded-xl p-8 mb-8">
          <div className="flex items-start space-x-4">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg
                className="w-7 h-7 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Why Credit Age Matters
              </h2>
              <p className="text-gray-700 dark:text-slate-200 mb-4">
                Credit age accounts for 15% of your FICO score. It includes your
                average account age, age of your oldest account, and how
                recently you opened accounts. Older accounts show stability and
                responsible long-term credit management.
              </p>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-blue-200">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                    Average Account Age
                  </h3>
                  <p className="text-sm text-gray-700 dark:text-slate-200">
                    Sum of all ages / number of accounts
                  </p>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-blue-200">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                    Oldest Account
                  </h3>
                  <p className="text-sm text-gray-700 dark:text-slate-200">
                    Age of your first credit account
                  </p>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-blue-200">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                    Recent Activity
                  </h3>
                  <p className="text-sm text-gray-700 dark:text-slate-200">
                    How recently you opened accounts
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Age Status */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-8 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Account Age Status
            </h2>
            <span
              className={`px-4 py-2 rounded-full font-semibold ${getAgeStatus(averageAge).color}`}
            >
              {getAgeStatus(averageAge).label}
            </span>
          </div>

          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-600 dark:text-slate-300">
                Average Age Progress
              </span>
              <span className="text-lg font-bold">
                {ageKnown ? `${averageAge.toFixed(1)} years` : "an unknown length of time"}
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-4 relative">
              <div
                className={`h-4 rounded-full transition-all duration-500 ${
                  averageAge >= 7
                    ? "bg-green-500"
                    : averageAge >= 3
                      ? "bg-yellow-500"
                      : "bg-red-500"
                }`}
                style={{ width: `${Math.min(100, (averageAge / 10) * 100)}%` }}
              ></div>
              <div className="absolute top-0 left-[30%] w-0.5 h-4 bg-gray-400"></div>
              <div className="absolute top-0 left-[70%] w-0.5 h-4 bg-gray-400"></div>
            </div>
            <div className="flex justify-between text-xs text-gray-500 dark:text-slate-400 mt-1">
              <span>0 yrs</span>
              <span className="text-yellow-600 font-semibold">
                3 yrs (Good)
              </span>
              <span className="text-green-600 font-semibold">
                7 yrs (Excellent)
              </span>
              <span>10+ yrs</span>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200">
              <div className="text-sm text-green-900 font-medium mb-1">
                Oldest Account
              </div>
              <div
                className={`text-3xl font-bold ${getAgeColor(oldestAccount)}`}
              >
                {yrs(oldestAccount)}
              </div>
              <div className="text-xs text-green-700 mt-1">
                Keep this account open!
              </div>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-blue-50 rounded-lg p-4 border border-blue-200">
              <div className="text-sm text-blue-900 font-medium mb-1">
                Average Age
              </div>
              <div className={`text-3xl font-bold ${getAgeColor(averageAge)}`}>
                {yrs(averageAge)}
              </div>
              <div className="text-xs text-blue-700 mt-1">
                Main score factor
              </div>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-emerald-50 rounded-lg p-4 border border-blue-200">
              <div className="text-sm text-blue-900 font-medium mb-1">
                Newest Account
              </div>
              <div
                className={`text-3xl font-bold ${getAgeColor(newestAccount)}`}
              >
                {yrs(newestAccount)}
              </div>
              <div className="text-xs text-blue-700 mt-1">
                Will age naturally
              </div>
            </div>
          </div>
        </div>

        {/* Account List */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            Your Accounts
          </h2>

          <div className="space-y-4">
            {accounts.map((account) => {
              // Unknown age (no opened_date on the row) is shown as unknown
              // rather than as a fresh account.
              const years = account.ageYears;
              const status = getAgeStatus(years ?? 0);
              return (
                <div
                  key={account.id}
                  className={`border-2 rounded-lg p-6 transition-all ${
                    account.status === "open"
                      ? "border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                      : "border-red-200 bg-red-50 opacity-60"
                  }`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl ${
                          account.type === "credit_card"
                            ? "bg-blue-100"
                            : account.type === "loan"
                              ? "bg-blue-100"
                              : "bg-green-100"
                        }`}
                      >
                        {account.type === "credit_card"
                          ? ""
                          : account.type === "loan"
                            ? ""
                            : ""}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {account.name}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-slate-300 capitalize">
                          {account.type.replace("_", " ")} • Opened{" "}
                          {account.openDate}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div
                        className={`text-3xl font-bold ${getAgeColor(years ?? 0)}`}
                      >
                        {years === null ? "Unknown" : `${years.toFixed(1)} yrs`}
                      </div>
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${status.color}`}
                      >
                        {status.label}
                      </span>
                    </div>
                  </div>

                  <div className="bg-gray-50 dark:bg-slate-900 rounded-lg p-4 mb-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <div className="text-xs text-gray-600 dark:text-slate-300 mb-1">
                          Account Age
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              (years ?? 0) >= 7
                                ? "bg-green-500"
                                : (years ?? 0) >= 3
                                  ? "bg-yellow-500"
                                  : "bg-red-500"
                            }`}
                            style={{
                              width: `${Math.min(100, ((years ?? 0) / 10) * 100)}%`,
                            }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600 dark:text-slate-300">
                      {account.status === "open" ? (
                        <span className="flex items-center space-x-2">
                          <svg
                            className="w-4 h-4 text-green-500"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                              clipRule="evenodd"
                            />
                          </svg>
                          <span>Account Open</span>
                        </span>
                      ) : (
                        <span className="flex items-center space-x-2 text-red-600">
                          <svg
                            className="w-4 h-4"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                              clipRule="evenodd"
                            />
                          </svg>
                          <span>Account Closed</span>
                        </span>
                      )}
                    </div>
                    {/* "Simulate Closure" / "Reopen" flipped the account's
                        status in local state, which over REAL tradelines would
                        show the reader an account as closed when it is open.
                        A closure simulator needs a score model this app does
                        not have — the tile beside it claimed "-25 points" from
                        nothing. */}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Future Projection */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            Age Projection
          </h2>

          <div className="space-y-4">
            {[6, 12, 24, 36, 60].map((months) => {
              const projected = calculateProjectedAge(months);
              const status = getAgeStatus(projected);
              return (
                <div key={months} className="flex items-center space-x-4">
                  <div className="w-32 text-sm font-medium text-gray-700 dark:text-slate-200">
                    In {months / 12} year{months > 12 ? "s" : ""}
                  </div>
                  <div className="flex-1">
                    <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-6 relative overflow-hidden">
                      <div
                        className={`h-6 rounded-full transition-all duration-500 flex items-center justify-end pr-3 ${
                          projected >= 7
                            ? "bg-green-500"
                            : projected >= 3
                              ? "bg-yellow-500"
                              : "bg-red-500"
                        }`}
                        style={{
                          width: `${Math.min(100, (projected / 10) * 100)}%`,
                        }}
                      >
                        <span className="text-xs font-semibold text-white">
                          {projected.toFixed(1)} years
                        </span>
                      </div>
                    </div>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${status.color}`}
                  >
                    {status.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Keep-Alive Strategies */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            Keep-Alive Strategies
          </h2>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="border-2 border-green-200 rounded-lg p-6 bg-green-50">
              <h3 className="flex items-center text-lg font-semibold text-gray-900 dark:text-white mb-4">
                <svg
                  className="w-5 h-5 text-green-500 mr-2"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                Do This
              </h3>
              <ul className="space-y-3 text-sm text-gray-700 dark:text-slate-200">
                <li className="flex items-start space-x-2">
                  <span className="text-green-600 mt-0.5"></span>
                  <span>
                    <strong>Keep oldest cards open</strong> - Even if you
                    don&apos;t use them
                  </span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-green-600 mt-0.5"></span>
                  <span>
                    <strong>Use old cards monthly</strong> - Small purchase +
                    autopay
                  </span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-green-600 mt-0.5"></span>
                  <span>
                    <strong>Become authorized user</strong> - Inherit old
                    account age
                  </span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-green-600 mt-0.5"></span>
                  <span>
                    <strong>Set up autopay</strong> - Prevents accidental
                    closure
                  </span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-green-600 mt-0.5"></span>
                  <span>
                    <strong>Monitor for inactivity fees</strong> - Some cards
                    charge if unused
                  </span>
                </li>
              </ul>
            </div>

            <div className="border-2 border-red-200 rounded-lg p-6 bg-red-50">
              <h3 className="flex items-center text-lg font-semibold text-gray-900 dark:text-white mb-4">
                <svg
                  className="w-5 h-5 text-red-500 mr-2"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
                Avoid This
              </h3>
              <ul className="space-y-3 text-sm text-gray-700 dark:text-slate-200">
                <li className="flex items-start space-x-2">
                  <span className="text-red-600 mt-0.5"></span>
                  <span>
                    <strong>Closing old accounts</strong> - Hurts average age
                    immediately
                  </span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-red-600 mt-0.5"></span>
                  <span>
                    <strong>Opening many new accounts</strong> - Lowers average
                    age
                  </span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-red-600 mt-0.5"></span>
                  <span>
                    <strong>Letting cards go inactive</strong> - Issuer may
                    close them
                  </span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-red-600 mt-0.5"></span>
                  <span>
                    <strong>Closing after product change</strong> - Keeps the
                    same account age
                  </span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-red-600 mt-0.5"></span>
                  <span>
                    <strong>Ignoring annual fees</strong> - Sometimes worth
                    keeping old cards
                  </span>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <svg
                className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
              <div>
                <h4 className="font-semibold text-blue-900 mb-1">
                  Pro Tip: Product Changes
                </h4>
                <p className="text-sm text-blue-800">
                  If your oldest card has an annual fee, ask to product change
                  to a no-fee version. This keeps the account open and preserves
                  your credit age without the cost.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
