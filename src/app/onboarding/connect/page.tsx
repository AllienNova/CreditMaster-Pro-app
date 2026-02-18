"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShieldCheckIcon,
  LockClosedIcon,
  CheckCircleIcon,
  QuestionMarkCircleIcon,
  CalendarDaysIcon,
} from "@heroicons/react/24/outline";
import { EducationalTooltip } from "@/components/onboarding/EducationalTooltip";
import { educationalContent } from "@/lib/onboarding/educational-content";
import { useOnboardingProgress } from "@/hooks/useOnboardingProgress";
import { Icon } from "@/components/ui/Icon";

const bureaus = [
  {
    id: "experian",
    name: "Experian",
    logo: "",
    status: "ready",
    description: "Connect to pull your Experian report",
    benefit: "Find errors and negative items",
  },
  {
    id: "equifax",
    name: "Equifax",
    logo: "",
    status: "coming_soon",
    description: "Coming soon - Equifax integration",
    benefit: "Complete credit picture",
  },
  {
    id: "transunion",
    name: "TransUnion",
    logo: "",
    status: "coming_soon",
    description: "Coming soon - TransUnion integration",
    benefit: "Comprehensive analysis",
  },
];

const bankOptions = [
  {
    id: "plaid",
    name: "Connect via Plaid",
    description: "Securely link your bank accounts",
    icon: "user",
    recommended: true,
  },
  {
    id: "manual",
    name: "Enter Manually",
    description: "Add account details yourself",
    icon: "user",
    recommended: false,
  },
];

const whyConnect = [
  {
    icon: "user",
    title: "Find Hidden Errors",
    description:
      "Our AI scans your reports to find errors that could be lowering your score",
  },
  {
    icon: "chart-bar",
    title: "Track Progress",
    description:
      "Monitor your score improvements across all three bureaus in real-time",
  },
  {
    icon: "chart-bar",
    title: "Personalized Plan",
    description: "Get custom recommendations based on your actual credit data",
  },
  {
    icon: "chart-bar",
    title: "Automated Disputes",
    description:
      "Generate and send dispute letters with one click when we find errors",
  },
];

const payFrequencies = [
  { id: "weekly", label: "Weekly", description: "Every week" },
  { id: "biweekly", label: "Bi-weekly", description: "Every 2 weeks" },
  { id: "semimonthly", label: "Semi-monthly", description: "1st & 15th" },
  { id: "monthly", label: "Monthly", description: "Once a month" },
];

export default function OnboardingConnectPage() {
  const router = useRouter();
  const { progress, updateFormData, completeStep, saving } =
    useOnboardingProgress();

  // Get saved form data
  const savedData = progress.form_data?.step_4 || {};

  const [connectedBureaus, setConnectedBureaus] = useState<string[]>(
    savedData.connectedBureaus || [],
  );
  const [bankConnected, setBankConnected] = useState(
    savedData.bankConnected || false,
  );
  const [bankInfo, setBankInfo] = useState<{
    name: string;
    mask: string;
  } | null>(savedData.bankInfo || null);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showWhyConnect, setShowWhyConnect] = useState(true);

  // Payday setup state
  const [payFrequency, setPayFrequency] = useState(
    savedData.payFrequency || "",
  );
  const [nextPayDate, setNextPayDate] = useState(savedData.nextPayDate || "");
  const [payAmount, setPayAmount] = useState(savedData.payAmount || "");
  const [incomeName, setIncomeName] = useState(savedData.incomeName || "");

  // Auto-save payday data
  useEffect(() => {
    if (payFrequency || nextPayDate || payAmount || incomeName) {
      updateFormData({
        connectedBureaus,
        bankConnected,
        bankInfo,
        payFrequency,
        nextPayDate,
        payAmount,
        incomeName,
      });
    }
  }, [
    payFrequency,
    nextPayDate,
    payAmount,
    incomeName,
    connectedBureaus,
    bankConnected,
    bankInfo,
    updateFormData,
  ]);

  // Connect to credit bureau via API
  const connectBureau = async (bureauId: string) => {
    setConnecting(bureauId);
    setError(null);

    try {
      // Call the credit report API
      const response = await fetch("/api/credit-repair/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bureau: bureauId,
          action: "connect",
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to connect to bureau");
      }

      const newConnected = [...connectedBureaus, bureauId];
      setConnectedBureaus(newConnected);

      // Save progress
      updateFormData({
        connectedBureaus: newConnected,
        bankConnected,
        bankInfo,
      });
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Connection failed. Please try again.",
      );
      console.error("Bureau connection error:", err);
    } finally {
      setConnecting(null);
    }
  };

  // Connect bank via Plaid Link
  const connectBank = async () => {
    setConnecting("bank");
    setError(null);

    try {
      // Get Plaid Link token
      const tokenResponse = await fetch("/api/plaid/link-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!tokenResponse.ok) {
        throw new Error("Failed to initialize bank connection");
      }

      const { linkToken } = await tokenResponse.json();

      // In production, this would open Plaid Link
      // For now, simulate successful connection
      if (linkToken) {
        // Plaid Link would be opened here
        // After success, exchange public token
        const newBankInfo = { name: "Connected Bank", mask: "••••1234" };
        setBankConnected(true);
        setBankInfo(newBankInfo);

        // Save progress
        updateFormData({
          connectedBureaus,
          bankConnected: true,
          bankInfo: newBankInfo,
        });
      }
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Bank connection failed. Please try again.",
      );
      console.error("Bank connection error:", err);
    } finally {
      setConnecting(null);
    }
  };

  const handleContinue = async () => {
    await completeStep(4);
    router.push("/onboarding/complete");
  };

  return (
    <div>
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Connect Your Accounts
        </h1>
        <p className="text-gray-600 dark:text-slate-300 mb-4">
          Securely link your credit bureaus to unlock powerful insights
        </p>

        {/* Trust Indicators */}
        <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-600 dark:text-slate-300">
          <div className="flex items-center gap-2">
            <ShieldCheckIcon className="w-5 h-5 text-emerald-500" />
            <span>256-bit Encryption</span>
          </div>
          <div className="flex items-center gap-2">
            <LockClosedIcon className="w-5 h-5 text-emerald-500" />
            <span>SOC 2 Certified</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircleIcon className="w-5 h-5 text-emerald-500" />
            <span>FCRA Compliant</span>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto space-y-8">
        {/* Why Connect Section */}
        {showWhyConnect && (
          <div className="bg-gradient-to-br from-emerald-50 to-blue-50 rounded-xl p-6 border-2 border-emerald-200">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2">
                <QuestionMarkCircleIcon className="w-6 h-6 text-emerald-600" />
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  Why Connect Your Credit Bureaus?
                </h3>
              </div>
              <button
                onClick={() => setShowWhyConnect(false)}
                className="text-gray-400 hover:text-gray-600 dark:text-slate-300"
              >
                ×
              </button>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {whyConnect.map((item) => (
                <div
                  key={item.title}
                  className="bg-white dark:bg-slate-800 rounded-lg p-4"
                >
                  <div className="flex items-start gap-3">
                    <Icon name={item.icon} className="text-2xl inline-block" />
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                        {item.title}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-slate-300">
                        {item.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
            <span className="text-red-500"></span>
            <p className="text-red-700">{error}</p>
            <button
              type="button"
              onClick={() => setError(null)}
              className="ml-auto text-red-500 hover:text-red-700"
            >
              ×
            </button>
          </div>
        )}

        {/* Credit Bureaus */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              Credit Bureaus
              <EducationalTooltip
                title={educationalContent.bureauConnection.title}
                content={educationalContent.bureauConnection.content}
                learnMoreUrl={educationalContent.bureauConnection.learnMoreUrl}
              />
            </h2>
            <span className="text-sm text-gray-500 dark:text-slate-400">
              {connectedBureaus.length}/3 connected
            </span>
          </div>
          <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">
            Connect to all three bureaus for a complete picture of your credit
          </p>

          <div className="space-y-4">
            {bureaus.map((bureau) => {
              const isConnected = connectedBureaus.includes(bureau.id);
              const isConnecting = connecting === bureau.id;

              return (
                <div
                  key={bureau.id}
                  className={`flex items-center justify-between p-4 border-2 rounded-lg transition ${
                    isConnected
                      ? "border-emerald-500 bg-emerald-50"
                      : "border-gray-200 dark:border-slate-700"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <span className="text-3xl">{bureau.logo}</span>
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                        {bureau.name}
                        {isConnected && (
                          <CheckCircleIcon className="w-5 h-5 text-emerald-500" />
                        )}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-slate-400">
                        {bureau.description}
                      </p>
                      <p className="text-xs text-emerald-600 mt-1">
                        {bureau.benefit}
                      </p>
                    </div>
                  </div>
                  {isConnected ? (
                    <span className="px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm font-medium">
                      Connected
                    </span>
                  ) : bureau.status === "coming_soon" ? (
                    <span className="px-4 py-2 bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400 rounded-lg text-sm font-medium">
                      Coming Soon
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => connectBureau(bureau.id)}
                      disabled={isConnecting}
                      className="px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm font-medium hover:bg-emerald-600 hover:shadow-md disabled:opacity-50 transition"
                    >
                      {isConnecting ? (
                        <span className="flex items-center gap-2">
                          <svg
                            className="animate-spin h-4 w-4"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                              fill="none"
                            />
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            />
                          </svg>
                          Connecting...
                        </span>
                      ) : (
                        "Connect"
                      )}
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {connectedBureaus.length > 0 && connectedBureaus.length < 3 && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg flex items-start gap-3">
              <span className="text-blue-500"></span>
              <div>
                <p className="text-sm text-blue-900 font-medium">
                  Tip: Connect all three bureaus
                </p>
                <p className="text-xs text-blue-700">
                  Different bureaus may have different information. Connecting
                  all three ensures we find every error.
                </p>
              </div>
            </div>
          )}

          {connectedBureaus.length === 3 && (
            <div className="mt-4 p-4 bg-emerald-50 rounded-lg text-center">
              <p className="text-emerald-700 font-medium flex items-center justify-center gap-2">
                <CheckCircleIcon className="w-5 h-5" />
                All bureaus connected! Your reports are being analyzed.
              </p>
            </div>
          )}
        </div>

        {/* Bank Connection */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              Bank Account
              <EducationalTooltip
                title={educationalContent.bankConnection.title}
                content={educationalContent.bankConnection.content}
                learnMoreUrl={educationalContent.bankConnection.learnMoreUrl}
              />
            </h2>
            <span className="text-xs bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 px-2 py-1 rounded">
              Optional
            </span>
          </div>
          <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">
            Link your bank to track payments and get personalized
            recommendations
          </p>

          {bankConnected ? (
            <div className="p-4 bg-emerald-50 border-2 border-emerald-500 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl"></span>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                    Bank Account Connected
                    <CheckCircleIcon className="w-5 h-5 text-emerald-500" />
                  </p>
                  <p className="text-sm text-gray-500 dark:text-slate-400">
                    {bankInfo?.name || "Bank"} {bankInfo?.mask || "••••"}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {bankOptions.map((option) => (
                <button
                  type="button"
                  key={option.id}
                  onClick={option.id === "plaid" ? connectBank : undefined}
                  disabled={connecting === "bank"}
                  className={`relative p-4 border-2 rounded-lg text-left hover:border-emerald-300 hover:shadow-md transition disabled:opacity-50 ${
                    option.recommended
                      ? "border-emerald-200 bg-emerald-50"
                      : "border-gray-200 dark:border-slate-700"
                  }`}
                >
                  {option.recommended && (
                    <span className="absolute top-2 right-2 text-xs bg-emerald-500 text-white px-2 py-0.5 rounded-full">
                      Recommended
                    </span>
                  )}
                  <Icon
                    name={option.icon}
                    className="text-2xl mb-2 inline-block"
                  />
                  <h3 className="font-medium text-gray-900 dark:text-white">
                    {option.name}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-slate-400">
                    {option.description}
                  </p>
                  {connecting === "bank" && option.id === "plaid" && (
                    <p className="text-sm text-emerald-500 mt-2 flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                          fill="none"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      Connecting...
                    </p>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Plaid Security Info */}
          <div className="mt-4 p-3 bg-blue-50 rounded-lg flex items-start gap-2">
            <LockClosedIcon className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-blue-900 font-medium">
                Powered by Plaid
              </p>
              <p className="text-xs text-blue-700">
                Plaid is trusted by thousands of apps. Your credentials are
                encrypted and never shared with us.
              </p>
            </div>
          </div>
        </div>

        {/* Payday Setup Section */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <CalendarDaysIcon className="w-5 h-5 text-emerald-500" />
              Set Up Payday Countdown
            </h2>
            <span className="text-xs bg-emerald-100 text-emerald-600 px-2 py-1 rounded">
              Recommended
            </span>
          </div>
          <p className="text-sm text-gray-500 dark:text-slate-400 mb-6">
            Track your income and see a countdown to your next payday on your
            dashboard
          </p>

          <div className="space-y-6">
            {/* Pay Frequency */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-3">
                How often do you get paid?
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {payFrequencies.map((freq) => (
                  <button
                    type="button"
                    key={freq.id}
                    onClick={() => setPayFrequency(freq.id)}
                    className={`p-3 rounded-lg border-2 text-center transition hover:shadow-md ${payFrequency === freq.id ? "border-emerald-500 bg-emerald-50" : "border-gray-200 hover:border-gray-300 dark:border-slate-600"}`}
                  >
                    <p className="font-medium text-gray-900 dark:text-white">
                      {freq.label}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-slate-400">
                      {freq.description}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Next Pay Date */}
            {payFrequency && (
              <div>
                <label
                  htmlFor="nextPayDate"
                  className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-2"
                >
                  When is your next payday?
                </label>
                <input
                  type="date"
                  id="nextPayDate"
                  value={nextPayDate}
                  onChange={(e) => setNextPayDate(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  className="w-full md:w-auto px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
            )}

            {/* Income Details (Optional) */}
            {payFrequency && nextPayDate && (
              <div className="pt-4 border-t border-gray-100 dark:border-slate-700">
                <p className="text-sm text-gray-600 dark:text-slate-300 mb-4">
                  Optional: Add more details for better tracking
                </p>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="incomeName"
                      className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-2"
                    >
                      Income source name
                    </label>
                    <input
                      type="text"
                      id="incomeName"
                      value={incomeName}
                      onChange={(e) => setIncomeName(e.target.value)}
                      placeholder="e.g., Main Job, Freelance"
                      className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="payAmount"
                      className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-2"
                    >
                      Expected amount (after tax)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-slate-400">
                        $
                      </span>
                      <input
                        type="number"
                        id="payAmount"
                        value={payAmount}
                        onChange={(e) => setPayAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full pl-8 pr-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Payday Preview */}
            {payFrequency && nextPayDate && (
              <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center">
                    <span className="text-2xl"></span>
                  </div>
                  <div>
                    <p className="text-sm text-emerald-700">
                      Your payday countdown is set!
                    </p>
                    <p className="text-lg font-bold text-emerald-900">
                      Next payday:{" "}
                      {new Date(nextPayDate).toLocaleDateString("en-US", {
                        weekday: "long",
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                    {payAmount && (
                      <p className="text-sm text-emerald-600">
                        Expected: ${parseFloat(payAmount).toLocaleString()}
                        {incomeName && ` from ${incomeName}`}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Security Note */}
        <div className="bg-gradient-to-br from-blue-50 to-emerald-50 rounded-xl p-6 border-2 border-blue-200">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
              <ShieldCheckIcon className="w-7 h-7 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white mb-2">
                Your Data is Protected
              </h3>
              <ul className="space-y-2 text-sm text-gray-700 dark:text-slate-200">
                <li className="flex items-start gap-2">
                  <CheckCircleIcon className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                  <span>
                    <strong>256-bit encryption</strong> - Same security as banks
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircleIcon className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                  <span>
                    <strong>Never stored</strong> - Your credentials are never
                    saved on our servers
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircleIcon className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                  <span>
                    <strong>FCRA compliant</strong> - We follow strict federal
                    regulations
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircleIcon className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                  <span>
                    <strong>SOC 2 certified</strong> - Independently audited
                    security
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between mt-8 max-w-4xl mx-auto">
        <Link
          href="/onboarding/goals"
          className="px-6 py-3 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-200 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 dark:bg-slate-900 transition"
        >
          ← Back
        </Link>
        <button
          onClick={handleContinue}
          disabled={saving || connectedBureaus.length === 0}
          className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-blue-500 text-white rounded-lg hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {connectedBureaus.length === 0
            ? "Connect at least one bureau"
            : "Complete Setup →"}
        </button>
      </div>

      {saving && (
        <div className="mt-4 text-sm text-gray-500 dark:text-slate-400 flex items-center justify-center gap-2">
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          Saving your connections...
        </div>
      )}
    </div>
  );
}
