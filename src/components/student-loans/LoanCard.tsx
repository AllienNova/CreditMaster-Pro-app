"use client";

import { useState } from "react";

interface StudentLoan {
  loan_id: string;
  loan_type: string;
  servicer_name: string;
  current_balance: number;
  interest_rate: number;
  loan_status: string;
  disbursement_date: string;
  repayment_start_date: string;
}

interface LoanCardProps {
  loan: StudentLoan;
  onViewStrategies: (loanId: string) => void;
  onCreateDispute: (loanId: string) => void;
}

export default function LoanCard({
  loan,
  onViewStrategies,
  onCreateDispute,
}: LoanCardProps) {
  const [expanded, setExpanded] = useState(false);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "current":
      case "in_repayment":
        return "bg-green-100 text-green-800";
      case "delinquent":
      case "default":
        return "bg-red-100 text-red-800";
      case "deferment":
      case "forbearance":
        return "bg-yellow-100 text-yellow-800";
      case "paid_in_full":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-slate-100";
    }
  };

  return (
    <div className="border border-gray-200 dark:border-slate-700 rounded-lg hover:shadow-md transition-shadow">
      {/* Card Header */}
      <div className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {loan.loan_type
                  .replace(/_/g, " ")
                  .replace(/\b\w/g, (l) => l.toUpperCase())}
              </h3>
              <span
                className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(loan.loan_status)}`}
              >
                {loan.loan_status
                  .replace(/_/g, " ")
                  .replace(/\b\w/g, (l) => l.toUpperCase())}
              </span>
            </div>
            <p className="text-sm text-gray-600 dark:text-slate-300">
              Servicer: {loan.servicer_name}
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatCurrency(loan.current_balance)}
            </p>
            <p className="text-sm text-gray-600 dark:text-slate-300">
              {loan.interest_rate}% APR
            </p>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-200 dark:border-slate-700">
          <div>
            <p className="text-xs text-gray-500 dark:text-slate-400">
              Disbursement Date
            </p>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {formatDate(loan.disbursement_date)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-slate-400">
              Repayment Start
            </p>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {formatDate(loan.repayment_start_date)}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mt-4">
          <button
            onClick={() => onViewStrategies(loan.loan_id)}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            View AI Strategies
          </button>
          <button
            onClick={() => onCreateDispute(loan.loan_id)}
            className="flex-1 px-4 py-2 bg-white border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-200 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 dark:bg-slate-900 transition-colors text-sm font-medium"
          >
            Create Dispute
          </button>
          <button
            onClick={() => setExpanded(!expanded)}
            className="px-4 py-2 bg-white border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-200 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 dark:bg-slate-900 transition-colors"
          >
            <svg
              className={`w-5 h-5 transition-transform ${expanded ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div className="px-6 pb-6 border-t border-gray-200 dark:border-slate-700">
          <div className="pt-4 space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  Loan ID
                </p>
                <p className="text-sm font-medium text-gray-900 dark:text-white font-mono">
                  {loan.loan_id}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  Loan Type
                </p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {loan.loan_type}
                </p>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm font-medium text-blue-900 mb-2">
                AI Insights Available
              </p>
              <p className="text-xs text-blue-700">
                Our AI has analyzed this loan and can provide personalized
                strategies for repayment, forgiveness programs, and dispute
                opportunities.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
