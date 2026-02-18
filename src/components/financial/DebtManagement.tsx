"use client";

import { useState, useEffect, useCallback } from "react";
import { PlaidAccount } from "@/lib/financial/plaid-service";
import { useAuth } from "@/hooks/useAuth";

interface DebtAccount {
  id: string;
  name: string;
  type:
    | "credit_card"
    | "student_loan"
    | "auto_loan"
    | "mortgage"
    | "personal_loan";
  balance: number;
  interestRate: number;
  minimumPayment: number;
  dueDate: Date;
}

interface PayoffStrategy {
  method: "snowball" | "avalanche";
  monthlyPayment: number;
  payoffDate: Date;
  totalInterest: number;
  timeline: Array<{
    month: number;
    balance: number;
    payment: number;
    interest: number;
  }>;
}

const mapAccountSubtypeToDebtType = (subtype: string): DebtAccount["type"] => {
  if (subtype.includes("student")) return "student_loan";
  if (subtype.includes("auto")) return "auto_loan";
  if (subtype.includes("mortgage")) return "mortgage";
  if (subtype.includes("credit")) return "credit_card";
  return "personal_loan";
};

export default function DebtManagement() {
  const { user, loading: authLoading } = useAuth();
  const [debts, setDebts] = useState<DebtAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [strategy, setStrategy] = useState<"snowball" | "avalanche">(
    "avalanche",
  );
  const [extraPayment, setExtraPayment] = useState("0");

  const fetchDebts = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);

      const response = await fetch(`/api/financial/accounts`);
      if (!response.ok) throw new Error("Failed to fetch accounts");

      const data = await response.json();

      // Filter debt accounts (credit and loan accounts)
      const debtAccounts: DebtAccount[] = data.data
        .filter(
          (a: PlaidAccount) =>
            a.accountType === "credit" || a.accountType === "loan",
        )
        .map((a: PlaidAccount) => ({
          id: a.id,
          name: a.accountName,
          type: mapAccountSubtypeToDebtType(a.accountSubtype),
          balance: Math.abs(a.currentBalance),
          interestRate: 18.5, // Mock data - would come from actual source
          minimumPayment: Math.abs(a.currentBalance) * 0.02, // 2% minimum
          dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days from now
        }));

      setDebts(debtAccounts);
    } catch (error) {
      console.error("Error fetching debts:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading && user) {
      void fetchDebts();
    }
  }, [authLoading, user, fetchDebts]);

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const calculatePayoffStrategy = (): PayoffStrategy | null => {
    if (debts.length === 0) return null;

    const totalMinimum = debts.reduce((sum, d) => sum + d.minimumPayment, 0);
    const monthlyPayment = totalMinimum + parseFloat(extraPayment || "0");

    // Sort debts based on strategy
    const sortedDebts = [...debts].sort((a, b) => {
      if (strategy === "snowball") {
        return a.balance - b.balance; // Smallest balance first
      } else {
        return b.interestRate - a.interestRate; // Highest interest first
      }
    });

    // Calculate payoff timeline (simplified)
    const remainingDebts = sortedDebts.map((d) => ({ ...d }));
    let month = 0;
    let totalInterest = 0;
    const timeline = [];

    while (remainingDebts.some((d) => d.balance > 0) && month < 360) {
      // Max 30 years
      month++;
      let availablePayment = monthlyPayment;

      // Pay minimum on all debts
      remainingDebts.forEach((debt) => {
        if (debt.balance > 0) {
          const interest = (debt.balance * debt.interestRate) / 100 / 12;
          const payment = Math.min(
            debt.minimumPayment,
            debt.balance + interest,
          );
          debt.balance = debt.balance + interest - payment;
          availablePayment -= payment;
          totalInterest += interest;
        }
      });

      // Apply extra payment to first debt
      if (availablePayment > 0) {
        const targetDebt = remainingDebts.find((d) => d.balance > 0);
        if (targetDebt) {
          const payment = Math.min(availablePayment, targetDebt.balance);
          targetDebt.balance -= payment;
        }
      }

      const totalBalance = remainingDebts.reduce(
        (sum, d) => sum + Math.max(0, d.balance),
        0,
      );
      timeline.push({
        month,
        balance: totalBalance,
        payment: monthlyPayment,
        interest: totalInterest,
      });

      if (totalBalance <= 0) break;
    }

    const payoffDate = new Date();
    payoffDate.setMonth(payoffDate.getMonth() + month);

    return {
      method: strategy,
      monthlyPayment,
      payoffDate,
      totalInterest,
      timeline: timeline.slice(0, 12), // Show first 12 months
    };
  };

  const payoffStrategy = calculatePayoffStrategy();
  const totalDebt = debts.reduce((sum, d) => sum + d.balance, 0);
  const totalMinimum = debts.reduce((sum, d) => sum + d.minimumPayment, 0);
  const avgInterestRate =
    debts.length > 0
      ? debts.reduce((sum, d) => sum + d.interestRate, 0) / debts.length
      : 0;

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-lg shadow p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold opacity-90">Total Debt</h3>
            <span className="text-2xl"></span>
          </div>
          <div className="text-3xl font-bold">{formatCurrency(totalDebt)}</div>
          <div className="text-sm opacity-90 mt-1">{debts.length} accounts</div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-600 dark:text-slate-300">
              Min Payment
            </h3>
            <span className="text-2xl"></span>
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">
            {formatCurrency(totalMinimum)}
          </div>
          <div className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            Per month
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-600 dark:text-slate-300">
              Avg Interest
            </h3>
            <span className="text-2xl"></span>
          </div>
          <div className="text-3xl font-bold text-orange-600">
            {avgInterestRate.toFixed(1)}%
          </div>
          <div className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            APR
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-600 dark:text-slate-300">
              Payoff Date
            </h3>
            <span className="text-2xl"></span>
          </div>
          <div className="text-xl font-bold text-gray-900 dark:text-white">
            {payoffStrategy
              ? payoffStrategy.payoffDate.toLocaleDateString("en-US", {
                  month: "short",
                  year: "numeric",
                })
              : "N/A"}
          </div>
          <div className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            {payoffStrategy
              ? `${Math.ceil((payoffStrategy.payoffDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30))} months`
              : ""}
          </div>
        </div>
      </div>

      {/* Strategy Selector */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Payoff Strategy
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-2">
              Method
            </label>
            <select
              value={strategy}
              onChange={(e) =>
                setStrategy(e.target.value as "snowball" | "avalanche")
              }
              className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="avalanche">
                Avalanche (Highest Interest First)
              </option>
              <option value="snowball">
                Snowball (Smallest Balance First)
              </option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-2">
              Extra Monthly Payment
            </label>
            <input
              type="number"
              value={extraPayment}
              onChange={(e) => setExtraPayment(e.target.value)}
              min="0"
              step="10"
              placeholder="0.00"
              className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Debt List */}
      {debts.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-12">
          <div className="text-center max-w-md mx-auto">
            <div className="text-6xl mb-6"></div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              No Debts Found!
            </h3>
            <p className="text-gray-600 dark:text-slate-300">
              You're debt-free or haven't connected any debt accounts yet.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow">
          <div className="p-6 border-b border-gray-200 dark:border-slate-700">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Your Debts
            </h2>
            <p className="text-sm text-gray-600 dark:text-slate-300 mt-1">
              Sorted by{" "}
              {strategy === "avalanche"
                ? "highest interest rate"
                : "smallest balance"}
            </p>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-slate-700">
            {[...debts]
              .sort((a, b) => {
                if (strategy === "snowball") return a.balance - b.balance;
                return b.interestRate - a.interestRate;
              })
              .map((debt, index) => (
                <div
                  key={debt.id}
                  className="p-6 hover:bg-gray-50 dark:hover:bg-slate-700 dark:bg-slate-900 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center text-white text-xl font-bold">
                        #{index + 1}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {debt.name}
                        </h3>
                        <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-slate-300 mt-1">
                          <span className="capitalize">
                            {debt.type.replace("_", " ")}
                          </span>
                          <span>•</span>
                          <span>{debt.interestRate}% APR</span>
                          <span>•</span>
                          <span>
                            Min: {formatCurrency(debt.minimumPayment)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      <div className="text-2xl font-bold text-red-600">
                        {formatCurrency(debt.balance)}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-slate-400 mt-1">
                        Due: {debt.dueDate.toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Payoff Timeline */}
      {payoffStrategy && (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
            12-Month Payoff Timeline
          </h3>
          <div className="space-y-3">
            {payoffStrategy.timeline.map((month) => {
              const maxBalance = payoffStrategy.timeline[0].balance;
              const percentage = (month.balance / maxBalance) * 100;

              return (
                <div key={month.month}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-gray-900 dark:text-white">
                      Month {month.month}
                    </span>
                    <span className="font-bold text-red-600">
                      {formatCurrency(month.balance)}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-3">
                    <div
                      className="bg-gradient-to-r from-red-500 to-orange-500 h-3 rounded-full transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-700 dark:text-slate-200">
                Total Interest Paid:
              </span>
              <span className="font-bold text-gray-900 dark:text-white">
                {formatCurrency(payoffStrategy.totalInterest)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
