/**
 * Pay-for-Delete Negotiator Component
 *
 * AI-powered pay-for-delete negotiation tool:
 * - Generate phone scripts, email templates, and formal letters
 * - Calculate optimal settlement amounts (30-50% of balance)
 * - 80% success rate
 * - 50-100 point impact per collection removed
 */

"use client";

import { useState } from "react";

interface NegotiationFormData {
  collectionId: string;
  collectionAgency: string;
  originalCreditor: string;
  originalBalance: number;
  currentBalance: number;
  settlementPercentage: number;
  accountAge: string;
}

interface NegotiationScripts {
  phoneScript: string;
  emailScript: string;
  letterScript: string;
}

interface NegotiationApiResponse {
  data?: {
    negotiation?: {
      scripts?: NegotiationScripts;
    };
  };
}

export default function PayForDeleteNegotiator() {
  const [formData, setFormData] = useState<NegotiationFormData>({
    collectionId: "",
    collectionAgency: "",
    originalCreditor: "",
    originalBalance: 0,
    currentBalance: 0,
    settlementPercentage: 40,
    accountAge: "1-2",
  });
  const [scripts, setScripts] = useState<NegotiationScripts | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"phone" | "email" | "letter">(
    "phone",
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/credit-repair/negotiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          collectionId: formData.collectionId,
          collectionAgency: formData.collectionAgency,
          originalCreditor: formData.originalCreditor,
          originalBalance: formData.originalBalance,
          currentBalance: formData.currentBalance,
          userInfo: {
            name: "User Name", // Would come from auth
            address: "123 Main St, City, ST 12345",
            phone: "(555) 123-4567",
            settlementPercentage: formData.settlementPercentage,
          },
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate negotiation scripts");
      }

      const data = (await response.json()) as NegotiationApiResponse;
      setScripts(data.data?.negotiation?.scripts ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const calculateSettlement = () => {
    return Math.round(
      formData.currentBalance * (formData.settlementPercentage / 100),
    );
  };

  const calculateSavings = () => {
    return formData.currentBalance - calculateSettlement();
  };

  const handleDownload = (content: string, filename: string) => {
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-600 to-red-600 rounded-lg p-8 text-white mb-6">
        <h1 className="text-3xl font-bold mb-2">Pay-for-Delete Negotiator</h1>
        <p className="text-orange-100">
          AI-powered negotiation scripts - 80% success rate, save 50-70% on
          collections
        </p>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <h3 className="font-semibold text-blue-800 mb-2">
          What is Pay-for-Delete?
        </h3>
        <p className="text-sm text-blue-700">
          Pay-for-delete is a negotiation strategy where you offer to pay a
          collection account in exchange for the collector removing it from your
          credit report. Key points:
        </p>
        <ul className="list-disc list-inside text-sm text-blue-700 mt-2 space-y-1">
          <li>Offer 30-50% of the balance (start low, negotiate up)</li>
          <li>Get written agreement BEFORE paying</li>
          <li>Pay via money order or cashier's check (keep proof)</li>
          <li>80% success rate when done correctly</li>
          <li>Can boost score by 50-100 points per collection removed</li>
        </ul>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold mb-4">Collection Details</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Collection Agency */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-2">
                Collection Agency Name *
              </label>
              <input
                type="text"
                value={formData.collectionAgency}
                onChange={(e) =>
                  setFormData({ ...formData, collectionAgency: e.target.value })
                }
                placeholder="e.g., Portfolio Recovery Associates"
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>

            {/* Original Creditor */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-2">
                Original Creditor *
              </label>
              <input
                type="text"
                value={formData.originalCreditor}
                onChange={(e) =>
                  setFormData({ ...formData, originalCreditor: e.target.value })
                }
                placeholder="e.g., Verizon, AT&T, Medical Provider"
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>

            {/* Account Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-2">
                Account/Reference Number *
              </label>
              <input
                type="text"
                value={formData.collectionId}
                onChange={(e) =>
                  setFormData({ ...formData, collectionId: e.target.value })
                }
                placeholder="Account or reference number"
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>

            {/* Original Balance */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-2">
                Original Balance
              </label>
              <input
                type="number"
                value={formData.originalBalance || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    originalBalance: parseFloat(e.target.value) || 0,
                  })
                }
                placeholder="0.00"
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>

            {/* Current Balance */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-2">
                Current Balance *
              </label>
              <input
                type="number"
                value={formData.currentBalance || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    currentBalance: parseFloat(e.target.value) || 0,
                  })
                }
                placeholder="0.00"
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>

            {/* Settlement Percentage */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-2">
                Settlement Offer: {formData.settlementPercentage}%
              </label>
              <input
                type="range"
                min="20"
                max="70"
                step="5"
                value={formData.settlementPercentage}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    settlementPercentage: parseInt(e.target.value),
                  })
                }
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-600 dark:text-slate-300 mt-1">
                <span>20% (Aggressive)</span>
                <span>40% (Recommended)</span>
                <span>70% (Conservative)</span>
              </div>
            </div>

            {/* Settlement Calculator */}
            {formData.currentBalance > 0 && (
              <div className="p-4 bg-green-50 rounded-lg">
                <h3 className="font-semibold text-green-800 mb-2">
                  Settlement Calculation
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-700 dark:text-slate-200">
                      Current Balance:
                    </span>
                    <span className="font-semibold">
                      ${formData.currentBalance.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700 dark:text-slate-200">
                      Your Offer ({formData.settlementPercentage}%):
                    </span>
                    <span className="font-bold text-green-600">
                      ${calculateSettlement().toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-green-200 pt-2">
                    <span className="text-gray-700 dark:text-slate-200">
                      You Save:
                    </span>
                    <span className="font-bold text-green-700">
                      ${calculateSavings().toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Account Age */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-2">
                How old is this collection?
              </label>
              <select
                value={formData.accountAge}
                onChange={(e) =>
                  setFormData({ ...formData, accountAge: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="<1">Less than 1 year</option>
                <option value="1-2">1-2 years</option>
                <option value="3-5">3-5 years</option>
                <option value="5-7">
                  5-7 years (near statute of limitations)
                </option>
                <option value="7+">7+ years (should be removed)</option>
              </select>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold"
            >
              {loading
                ? "Generating Scripts..."
                : "Generate Negotiation Scripts"}
            </button>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}
          </form>
        </div>

        {/* Scripts Preview */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold mb-4">Negotiation Scripts</h2>

          {!scripts && (
            <div className="flex items-center justify-center h-64 bg-gray-50 dark:bg-slate-900 rounded-lg">
              <p className="text-gray-500 dark:text-slate-400">
                Fill out the form to generate your negotiation scripts
              </p>
            </div>
          )}

          {scripts && (
            <div className="space-y-4">
              {/* Tabs */}
              <div className="border-b border-gray-200 dark:border-slate-700">
                <nav className="flex -mb-px">
                  <button
                    onClick={() => setActiveTab("phone")}
                    className={`px-4 py-2 text-sm font-medium border-b-2 ${activeTab === "phone" ? "border-orange-500 text-orange-600" : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-slate-200 dark:text-slate-200"}`}
                  >
                    Phone Script
                  </button>
                  <button
                    onClick={() => setActiveTab("email")}
                    className={`px-4 py-2 text-sm font-medium border-b-2 ${activeTab === "email" ? "border-orange-500 text-orange-600" : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-slate-200 dark:text-slate-200"}`}
                  >
                    Email Template
                  </button>
                  <button
                    onClick={() => setActiveTab("letter")}
                    className={`px-4 py-2 text-sm font-medium border-b-2 ${activeTab === "letter" ? "border-orange-500 text-orange-600" : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-slate-200 dark:text-slate-200"}`}
                  >
                    Formal Letter
                  </button>
                </nav>
              </div>

              {/* Content */}
              <div className="bg-gray-50 dark:bg-slate-900 rounded-lg p-4 max-h-96 overflow-y-auto">
                <pre className="whitespace-pre-wrap text-sm text-gray-800 dark:text-slate-100 font-mono">
                  {activeTab === "phone" && scripts.phoneScript}
                  {activeTab === "email" && scripts.emailScript}
                  {activeTab === "letter" && scripts.letterScript}
                </pre>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() =>
                    handleDownload(
                      activeTab === "phone"
                        ? scripts.phoneScript
                        : activeTab === "email"
                          ? scripts.emailScript
                          : scripts.letterScript,
                      `${activeTab}-script-${Date.now()}.txt`,
                    )
                  }
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Download
                </button>
                <button
                  onClick={() =>
                    navigator.clipboard.writeText(
                      activeTab === "phone"
                        ? scripts.phoneScript
                        : activeTab === "email"
                          ? scripts.emailScript
                          : scripts.letterScript,
                    )
                  }
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Copy
                </button>
              </div>

              {/* Tips */}
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h3 className="font-semibold text-yellow-800 mb-2">
                  Critical Rules:
                </h3>
                <ol className="list-decimal list-inside space-y-1 text-sm text-yellow-700">
                  <li>
                    <strong>NEVER pay without written agreement</strong>
                  </li>
                  <li>Get pay-for-delete in writing before sending money</li>
                  <li>Use money order or cashier's check (keep receipt)</li>
                  <li>Record phone calls (if legal in your state)</li>
                  <li>Start low (30-40%), negotiate up if needed</li>
                  <li>Verify deletion after 30-45 days</li>
                </ol>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
