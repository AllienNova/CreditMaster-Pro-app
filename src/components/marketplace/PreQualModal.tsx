"use client";

import { useState, useId, type ChangeEvent } from "react";
import Modal from "@/components/ui/Modal";
import PreApprovalBadge from "./PreApprovalBadge";
import { calculateDTI } from "@/lib/commerce/calculators/dti-calculator";
import {
  calculatePreApprovalOdds,
  type PreApprovalOdds,
} from "@/lib/commerce/matching/pre-approval-calculator";

// =============================================================================
// Types
// =============================================================================

interface PreQualModalProps {
  isOpen: boolean;
  onClose: () => void;
  productName: string;
  productMinScore?: number;
  productMaxDTI?: number;
}

interface FormState {
  annualIncome: string;
  creditScore: string;
  accountAgeYears: string;
  recentInquiries: string;
  paymentHistory: "excellent" | "good" | "fair" | "poor";
  housing: string;
  auto: string;
  studentLoans: string;
  creditCards: string;
  other: string;
}

const INITIAL_FORM: FormState = {
  annualIncome: "",
  creditScore: "",
  accountAgeYears: "",
  recentInquiries: "0",
  paymentHistory: "good",
  housing: "",
  auto: "",
  studentLoans: "",
  creditCards: "",
  other: "",
};

// =============================================================================
// Component
// =============================================================================

export default function PreQualModal({
  isOpen,
  onClose,
  productName,
  productMinScore,
  productMaxDTI,
}: PreQualModalProps) {
  const formId = useId();
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [result, setResult] = useState<PreApprovalOdds | null>(null);
  const [submitted, setSubmitted] = useState(false);

  function handleClose() {
    setForm(INITIAL_FORM);
    setResult(null);
    setSubmitted(false);
    onClose();
  }

  function handleChange(
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    // Clear result when inputs change after first submission
    if (submitted) setResult(null);
  }

  // Live DTI calculation for display
  const monthlyIncome = parseFloat(form.annualIncome) / 12 || 0;
  const debtEntries = [
    { category: "Housing", amount: parseFloat(form.housing) || 0 },
    { category: "Auto", amount: parseFloat(form.auto) || 0 },
    { category: "Student Loans", amount: parseFloat(form.studentLoans) || 0 },
    { category: "Credit Cards", amount: parseFloat(form.creditCards) || 0 },
    { category: "Other", amount: parseFloat(form.other) || 0 },
  ];

  const liveDTI =
    monthlyIncome > 0
      ? calculateDTI(monthlyIncome, debtEntries)
      : null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);

    const income = parseFloat(form.annualIncome);
    const score = parseInt(form.creditScore, 10);
    const ageYears = parseFloat(form.accountAgeYears) || 0;
    const inquiries = parseInt(form.recentInquiries, 10) || 0;

    if (!income || !score) return;

    const monthlyInc = income / 12;
    const dti = calculateDTI(monthlyInc, debtEntries);

    const odds = calculatePreApprovalOdds({
      creditScore: score,
      dtiRatio: dti.ratio,
      accountAgeYears: ageYears,
      recentInquiries: inquiries,
      paymentHistory: form.paymentHistory,
      productMinScore,
      productMaxDTI,
    });

    setResult(odds);
  }

  const isFormValid =
    form.annualIncome.trim() !== "" && form.creditScore.trim() !== "";

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={`Check Your Odds — ${productName}`}
      description="See your estimated approval likelihood without affecting your credit score."
      size="md"
    >
      <div className="space-y-5">
        {/* Soft pull reassurance */}
        <div className="flex items-center gap-2 rounded-md bg-emerald-50 px-3 py-2 dark:bg-emerald-900/20">
          <svg
            className="h-4 w-4 flex-shrink-0 text-emerald-600 dark:text-emerald-400"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z"
              clipRule="evenodd"
            />
          </svg>
          <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
            This won&apos;t affect your credit score
          </p>
        </div>

        <form id={formId} onSubmit={handleSubmit} noValidate>
          <fieldset className="space-y-4">
            <legend className="sr-only">Your financial profile</legend>

            {/* Annual income */}
            <div>
              <label
                htmlFor={`${formId}-income`}
                className="block text-sm font-medium text-gray-700 dark:text-slate-300"
              >
                Annual Income
              </label>
              <div className="relative mt-1">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400 dark:text-slate-500">
                  $
                </span>
                <input
                  id={`${formId}-income`}
                  name="annualIncome"
                  type="number"
                  min="0"
                  step="1000"
                  placeholder="65,000"
                  value={form.annualIncome}
                  onChange={handleChange}
                  required
                  className="block w-full rounded-md border border-gray-300 bg-white py-2 pl-7 pr-3 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder-slate-500"
                />
              </div>
            </div>

            {/* Credit score */}
            <div>
              <label
                htmlFor={`${formId}-score`}
                className="block text-sm font-medium text-gray-700 dark:text-slate-300"
              >
                Estimated Credit Score
              </label>
              <input
                id={`${formId}-score`}
                name="creditScore"
                type="number"
                min="300"
                max="850"
                placeholder="720"
                value={form.creditScore}
                onChange={handleChange}
                required
                className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder-slate-500"
              />
            </div>

            {/* Monthly debt payments */}
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-slate-300">
                Monthly Debt Payments
              </p>
              <div className="mt-2 grid grid-cols-2 gap-3">
                {(
                  [
                    ["housing", "Housing / Rent"],
                    ["auto", "Auto Loan"],
                    ["studentLoans", "Student Loans"],
                    ["creditCards", "Credit Cards"],
                    ["other", "Other"],
                  ] as const
                ).map(([field, label]) => (
                  <div key={field}>
                    <label
                      htmlFor={`${formId}-${field}`}
                      className="block text-xs text-gray-500 dark:text-slate-400"
                    >
                      {label}
                    </label>
                    <div className="relative mt-0.5">
                      <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5 text-gray-400 dark:text-slate-500 text-xs">
                        $
                      </span>
                      <input
                        id={`${formId}-${field}`}
                        name={field}
                        type="number"
                        min="0"
                        placeholder="0"
                        value={form[field]}
                        onChange={handleChange}
                        className="block w-full rounded-md border border-gray-300 bg-white py-1.5 pl-6 pr-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder-slate-500"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Payment history */}
            <div>
              <label
                htmlFor={`${formId}-paymentHistory`}
                className="block text-sm font-medium text-gray-700 dark:text-slate-300"
              >
                Payment History
              </label>
              <select
                id={`${formId}-paymentHistory`}
                name="paymentHistory"
                value={form.paymentHistory}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
              >
                <option value="excellent">Excellent — no missed payments</option>
                <option value="good">Good — 1-2 late payments</option>
                <option value="fair">Fair — some delinquencies</option>
                <option value="poor">Poor — significant delinquencies</option>
              </select>
            </div>
          </fieldset>

          {/* Live DTI preview */}
          {liveDTI && monthlyIncome > 0 && (
            <div className="mt-4 flex items-center justify-between rounded-md bg-gray-50 px-3 py-2 dark:bg-slate-700/40">
              <span className="text-xs text-gray-500 dark:text-slate-400">
                Debt-to-Income Ratio
              </span>
              <span
                className={[
                  "text-sm font-semibold tabular-nums",
                  liveDTI.rating === "excellent" || liveDTI.rating === "good"
                    ? "text-emerald-600 dark:text-emerald-400"
                    : liveDTI.rating === "fair"
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-red-600 dark:text-red-400",
                ].join(" ")}
              >
                {(liveDTI.ratio * 100).toFixed(1)}%
              </span>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={!isFormValid}
            className="mt-5 w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors duration-150 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-600"
          >
            Check My Odds
          </button>
        </form>

        {/* Result */}
        {result && (
          <div className="pt-1">
            <p className="mb-2 text-sm font-medium text-gray-700 dark:text-slate-300">
              Your Estimated Approval Odds
            </p>
            <PreApprovalBadge odds={result} />
          </div>
        )}
      </div>
    </Modal>
  );
}
