"use client";

import React, { useState, useEffect } from "react";
import { useToast } from "@/components/ui/Toast";
import type {
  NegotiationSummary,
  NegotiationOpportunity,
  NegotiationInsight,
  BillNegotiation,
  NegotiationType,
} from "@/lib/financial/types/bill-negotiation.types";

// ============================================================================
// TYPES
// ============================================================================

interface NegotiationData {
  summary: NegotiationSummary;
  insights: NegotiationInsight[];
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function BillNegotiationAssistant() {
  const [data, setData] = useState<NegotiationData | null>(null);
  const [activeNegotiations, setActiveNegotiations] = useState<
    BillNegotiation[]
  >([]);
  const [selectedNegotiation, setSelectedNegotiation] =
    useState<BillNegotiation | null>(null);
  const [activeTab, setActiveTab] = useState<
    "overview" | "opportunities" | "active" | "scripts"
  >("overview");
  const [loading, setLoading] = useState(true);
  const [showStartModal, setShowStartModal] = useState(false);
  const [selectedOpportunity, setSelectedOpportunity] =
    useState<NegotiationOpportunity | null>(null);
  const { error: showError, success: showSuccess } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [summaryRes, activeRes] = await Promise.all([
        fetch("/api/financial/bills/negotiate"),
        fetch("/api/financial/bills/negotiate?view=active"),
      ]);

      if (summaryRes.ok) {
        const summaryData = await summaryRes.json();
        setData(summaryData);
      }

      if (activeRes.ok) {
        const activeData = await activeRes.json();
        setActiveNegotiations(activeData.negotiations || []);
      }
    } catch (_err) {
      showError("Failed to load negotiation data");
      // BillNegotiationAssistant error: Failed to load negotiation data
      void _err;
    } finally {
      setLoading(false);
    }
  };

  const startNegotiation = async (
    opportunity: NegotiationOpportunity,
    negotiationType: NegotiationType,
  ) => {
    try {
      const response = await fetch("/api/financial/bills/negotiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          billId: opportunity.billId,
          negotiationType,
          targetAmount:
            opportunity.currentAmount - opportunity.potentialSavings,
        }),
      });

      if (!response.ok) throw new Error("Failed to start negotiation");

      const result = await response.json();
      setSelectedNegotiation(result.negotiation);
      setActiveTab("scripts");
      setShowStartModal(false);
      showSuccess("Negotiation started! Check out your scripts.");
      fetchData();
    } catch (_err) {
      showError("Failed to start negotiation");
      // BillNegotiationAssistant error: Failed to start negotiation
      void _err;
    }
  };

  const recordAttempt = async (
    negotiationId: string,
    method: "phone" | "email" | "chat",
    outcome: "success" | "partial_success" | "rejected" | "pending",
    offeredAmount?: number,
    notes?: string,
  ) => {
    try {
      const response = await fetch(
        `/api/financial/bills/negotiate/${negotiationId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ method, outcome, offeredAmount, notes }),
        },
      );

      if (!response.ok) throw new Error("Failed to record attempt");

      const result = await response.json();
      setSelectedNegotiation(result.negotiation);

      if (outcome === "success") {
        showSuccess("Congratulations on your successful negotiation!");
      }
      fetchData();
    } catch (_err) {
      showError("Failed to record attempt");
      // BillNegotiationAssistant error: Failed to record attempt
      void _err;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const summary = data?.summary;
  const insights = data?.insights || [];
  const opportunities = summary?.topOpportunities || [];

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <SummaryCard
          title="Total Savings"
          value={`$${summary?.totalSavings?.toFixed(2) || "0.00"}`}
          subtitle="All time"
          icon=""
          gradient="from-green-500 to-emerald-600"
        />
        <SummaryCard
          title="Monthly Savings"
          value={`$${summary?.monthlySavings?.toFixed(2) || "0.00"}`}
          subtitle="Per month"
          icon=""
          gradient="from-blue-500 to-blue-600"
        />
        <SummaryCard
          title="Success Rate"
          value={`${summary?.successRate?.toFixed(0) || "0"}%`}
          subtitle={`${summary?.completedNegotiations || 0} completed`}
          icon=""
          gradient="from-blue-500 to-emerald-600"
        />
        <SummaryCard
          title="Active"
          value={`${summary?.activeNegotiations || 0}`}
          subtitle="In progress"
          icon=""
          gradient="from-orange-500 to-red-600"
        />
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-slate-700">
        <nav className="flex space-x-8">
          {(["overview", "opportunities", "active", "scripts"] as const).map(
            (tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 px-1 border-b-2 font-medium text-sm capitalize ${activeTab === tab ? "border-blue-500 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-gray-300"}`}
              >
                {tab}
              </button>
            ),
          )}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && (
        <OverviewTab
          insights={insights}
          recentSuccesses={summary?.recentSuccesses || []}
        />
      )}

      {activeTab === "opportunities" && (
        <OpportunitiesTab
          opportunities={opportunities}
          onStartNegotiation={(opp) => {
            setSelectedOpportunity(opp);
            setShowStartModal(true);
          }}
        />
      )}

      {activeTab === "active" && (
        <ActiveNegotiationsTab
          negotiations={activeNegotiations}
          onSelect={(n) => {
            setSelectedNegotiation(n);
            setActiveTab("scripts");
          }}
        />
      )}

      {activeTab === "scripts" && selectedNegotiation && (
        <ScriptsTab
          negotiation={selectedNegotiation}
          onRecordAttempt={recordAttempt}
        />
      )}

      {/* Start Negotiation Modal */}
      {showStartModal && selectedOpportunity && (
        <StartNegotiationModal
          opportunity={selectedOpportunity}
          onStart={startNegotiation}
          onClose={() => setShowStartModal(false)}
        />
      )}
    </div>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function SummaryCard({
  title,
  value,
  subtitle,
  icon,
  gradient,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: string;
  gradient: string;
}) {
  return (
    <div className={`bg-gradient-to-r ${gradient} rounded-xl p-6 text-white`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white/80 text-sm">{title}</p>
          <p className="text-3xl font-bold mt-1">{value}</p>
          <p className="text-white/70 text-sm mt-1">{subtitle}</p>
        </div>
        <span className="text-4xl">{icon}</span>
      </div>
    </div>
  );
}

function OverviewTab({
  insights,
  recentSuccesses,
}: {
  insights: NegotiationInsight[];
  recentSuccesses: BillNegotiation[];
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Insights */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Insights & Tips
        </h3>
        <div className="space-y-4">
          {insights.map((insight, idx) => (
            <div
              key={idx}
              className={`p-4 rounded-lg ${insight.type === "success_story" ? "bg-green-50 border-l-4 border-green-500" : insight.type === "opportunity" ? "bg-blue-50 border-l-4 border-blue-500" : insight.type === "warning" ? "bg-yellow-50 border-l-4 border-yellow-500" : "bg-gray-50 dark:bg-slate-700 border-l-4 border-gray-400"}`}
            >
              <h4 className="font-medium text-gray-900 dark:text-white">
                {insight.title}
              </h4>
              <p className="text-sm text-gray-600 dark:text-slate-300 mt-1">
                {insight.description}
              </p>
              {insight.potentialSavings && (
                <p className="text-sm font-medium text-green-600 dark:text-green-400 mt-2">
                  Potential: ${insight.potentialSavings.toFixed(2)}/month
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Recent Successes */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Recent Wins
        </h3>
        {recentSuccesses.length === 0 ? (
          <p className="text-gray-500 dark:text-slate-400">
            No successful negotiations yet. Start one today!
          </p>
        ) : (
          <div className="space-y-4">
            {recentSuccesses.map((success) => (
              <div
                key={success.id}
                className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      {success.merchantName}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-slate-300 capitalize">
                      {success.category}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-green-600 dark:text-green-400">
                      -${success.actualSavings?.toFixed(2)}/mo
                    </p>
                    <p className="text-xs text-gray-500 dark:text-slate-400">
                      ${success.currentAmount} → $
                      {success.currentAmount - (success.actualSavings || 0)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function OpportunitiesTab({
  opportunities,
  onStartNegotiation,
}: {
  opportunities: NegotiationOpportunity[];
  onStartNegotiation: (opp: NegotiationOpportunity) => void;
}) {
  if (opportunities.length === 0) {
    return (
      <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-xl">
        <p className="text-gray-500 dark:text-slate-400">
          No negotiation opportunities found.
        </p>
        <p className="text-sm text-gray-400 dark:text-slate-500 mt-2">
          Add more bills to discover savings opportunities.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {opportunities.map((opp) => (
        <div
          key={opp.billId}
          className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm"
        >
          <div className="flex justify-between items-start mb-4">
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white">
                {opp.merchantName}
              </h4>
              <p className="text-sm text-gray-500 dark:text-slate-400 capitalize">
                {opp.category}
              </p>
            </div>
            <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-medium rounded-full">
              {opp.confidence}% match
            </span>
          </div>

          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-slate-400">Current</span>
              <span className="text-gray-900 dark:text-white">
                ${opp.currentAmount}/mo
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-slate-400">
                Potential Savings
              </span>
              <span className="text-green-600 dark:text-green-400 font-medium">
                -${opp.potentialSavings.toFixed(2)}/mo
              </span>
            </div>
          </div>

          <p className="text-sm text-gray-600 dark:text-slate-300 mb-4">
            {opp.reason}
          </p>

          <button
            type="button"
            onClick={() => onStartNegotiation(opp)}
            className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            Start Negotiation
          </button>
        </div>
      ))}
    </div>
  );
}

function ActiveNegotiationsTab({
  negotiations,
  onSelect,
}: {
  negotiations: BillNegotiation[];
  onSelect: (n: BillNegotiation) => void;
}) {
  if (negotiations.length === 0) {
    return (
      <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-xl">
        <p className="text-gray-500 dark:text-slate-400">
          No active negotiations.
        </p>
        <p className="text-sm text-gray-400 dark:text-slate-500 mt-2">
          Check the Opportunities tab to start one.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {negotiations.map((neg) => (
        <div
          key={neg.id}
          className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => onSelect(neg)}
        >
          <div className="flex justify-between items-start">
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white">
                {neg.merchantName}
              </h4>
              <p className="text-sm text-gray-500 dark:text-slate-400 capitalize">
                {neg.negotiationType.replace("_", " ")}
              </p>
            </div>
            <span
              className={`px-3 py-1 rounded-full text-xs font-medium ${neg.status === "in_progress" ? "bg-blue-100 text-blue-700" : neg.status === "awaiting_response" ? "bg-yellow-100 text-yellow-700" : "bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300"}`}
            >
              {neg.status.replace("_", " ")}
            </span>
          </div>
          <div className="mt-4 flex justify-between text-sm">
            <span className="text-gray-500 dark:text-slate-400">
              Target: ${neg.targetAmount}/mo
            </span>
            <span className="text-gray-500 dark:text-slate-400">
              {neg.attemptHistory.length} attempts
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function ScriptsTab({
  negotiation,
  onRecordAttempt,
}: {
  negotiation: BillNegotiation;
  onRecordAttempt: (
    id: string,
    method: "phone" | "email" | "chat",
    outcome: "success" | "partial_success" | "rejected" | "pending",
    offeredAmount?: number,
    notes?: string,
  ) => void;
}) {
  const [activeScript, setActiveScript] = useState<
    "phone" | "email" | "chat" | "retention"
  >("phone");
  const [showRecordModal, setShowRecordModal] = useState(false);

  const scripts = negotiation.scripts;
  const talkingPoints = negotiation.talkingPoints || [];
  const contactInfo = negotiation.contactInfo;

  return (
    <div className="space-y-6">
      {/* Contact Info */}
      {contactInfo && (
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
            Contact Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {contactInfo.phone && (
              <div>
                <p className="text-sm text-gray-500 dark:text-slate-400">
                  Phone
                </p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {contactInfo.phone}
                </p>
              </div>
            )}
            {contactInfo.retentionDepartment && (
              <div>
                <p className="text-sm text-gray-500 dark:text-slate-400">
                  Ask For
                </p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {contactInfo.retentionDepartment}
                </p>
              </div>
            )}
            {contactInfo.bestTimeToCall && (
              <div>
                <p className="text-sm text-gray-500 dark:text-slate-400">
                  Best Time
                </p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {contactInfo.bestTimeToCall}
                </p>
              </div>
            )}
          </div>
          {contactInfo.tips && contactInfo.tips.length > 0 && (
            <div className="mt-4">
              <p className="text-sm text-gray-500 dark:text-slate-400 mb-2">
                Tips
              </p>
              <ul className="list-disc list-inside text-sm text-gray-700 dark:text-slate-300">
                {contactInfo.tips.map((tip, idx) => (
                  <li key={idx}>{tip}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Talking Points */}
      {talkingPoints.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
            Key Talking Points
          </h3>
          <ul className="space-y-2">
            {talkingPoints.map((point, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-green-500 mt-1"></span>
                <span className="text-gray-700 dark:text-slate-300">
                  {point}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Script Tabs */}
      {scripts && (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm overflow-hidden">
          <div className="border-b border-gray-200 dark:border-slate-700">
            <nav className="flex">
              {(["phone", "email", "chat", "retention"] as const).map(
                (type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setActiveScript(type)}
                    className={`flex-1 py-3 px-4 text-sm font-medium capitalize ${activeScript === type ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 border-b-2 border-blue-500" : "text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700"}`}
                  >
                    {type === "retention"
                      ? "Retention"
                      : type === "phone"
                        ? "Phone"
                        : type === "email"
                          ? "Email"
                          : "Chat"}
                  </button>
                ),
              )}
            </nav>
          </div>
          <div className="p-6">
            <pre className="whitespace-pre-wrap text-sm text-gray-700 dark:text-slate-300 font-sans leading-relaxed">
              {activeScript === "phone" && scripts.phoneScript}
              {activeScript === "email" && scripts.emailScript}
              {activeScript === "chat" && scripts.chatScript}
              {activeScript === "retention" && scripts.retentionScript}
            </pre>
            <button
              type="button"
              onClick={() => {
                const text =
                  activeScript === "phone"
                    ? scripts.phoneScript
                    : activeScript === "email"
                      ? scripts.emailScript
                      : activeScript === "chat"
                        ? scripts.chatScript
                        : scripts.retentionScript;
                navigator.clipboard.writeText(text);
              }}
              className="mt-4 px-4 py-2 text-sm bg-gray-100 text-gray-700 dark:text-slate-300 rounded-lg hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600"
            >
              Copy Script
            </button>
          </div>
        </div>
      )}

      {/* Record Attempt Button */}
      <div className="flex justify-center">
        <button
          type="button"
          onClick={() => setShowRecordModal(true)}
          className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium"
        >
          Record Negotiation Attempt
        </button>
      </div>

      {/* Record Attempt Modal */}
      {showRecordModal && (
        <RecordAttemptModal
          negotiationId={negotiation.id}
          onRecord={onRecordAttempt}
          onClose={() => setShowRecordModal(false)}
        />
      )}
    </div>
  );
}

function RecordAttemptModal({
  negotiationId,
  onRecord,
  onClose,
}: {
  negotiationId: string;
  onRecord: (
    id: string,
    method: "phone" | "email" | "chat",
    outcome: "success" | "partial_success" | "rejected" | "pending",
    offeredAmount?: number,
    notes?: string,
  ) => void;
  onClose: () => void;
}) {
  const [method, setMethod] = useState<"phone" | "email" | "chat">("phone");
  const [outcome, setOutcome] = useState<
    "success" | "partial_success" | "rejected" | "pending"
  >("pending");
  const [offeredAmount, setOfferedAmount] = useState("");
  const [notes, setNotes] = useState("");

  const handleSubmit = () => {
    onRecord(
      negotiationId,
      method,
      outcome,
      offeredAmount ? parseFloat(offeredAmount) : undefined,
      notes || undefined,
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Record Attempt
        </h3>

        <div className="space-y-4">
          <div>
            <label
              htmlFor="attempt-method"
              className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1"
            >
              Method
            </label>
            <select
              id="attempt-method"
              value={method}
              onChange={(e) =>
                setMethod(e.target.value as "phone" | "email" | "chat")
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
            >
              <option value="phone">Phone</option>
              <option value="email">Email</option>
              <option value="chat">Chat</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="attempt-outcome"
              className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1"
            >
              Outcome
            </label>
            <select
              id="attempt-outcome"
              value={outcome}
              onChange={(e) =>
                setOutcome(
                  e.target.value as
                    | "success"
                    | "partial_success"
                    | "rejected"
                    | "pending",
                )
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
            >
              <option value="success">Success - Got the discount!</option>
              <option value="partial_success">
                Partial Success - Got some discount
              </option>
              <option value="pending">Pending - Waiting for response</option>
              <option value="rejected">Rejected - No discount offered</option>
            </select>
          </div>

          {(outcome === "success" || outcome === "partial_success") && (
            <div>
              <label
                htmlFor="offered-amount"
                className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1"
              >
                New Monthly Amount
              </label>
              <input
                id="offered-amount"
                type="number"
                value={offeredAmount}
                onChange={(e) => setOfferedAmount(e.target.value)}
                placeholder="e.g., 45.00"
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
              />
            </div>
          )}

          <div>
            <label
              htmlFor="attempt-notes"
              className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1"
            >
              Notes
            </label>
            <textarea
              id="attempt-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What happened during the call?"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

function StartNegotiationModal({
  opportunity,
  onStart,
  onClose,
}: {
  opportunity: NegotiationOpportunity;
  onStart: (opp: NegotiationOpportunity, type: NegotiationType) => void;
  onClose: () => void;
}) {
  const [selectedType, setSelectedType] = useState<NegotiationType>(
    opportunity.suggestedApproach,
  );

  const negotiationTypes: {
    value: NegotiationType;
    label: string;
    description: string;
  }[] = [
    {
      value: "rate_reduction",
      label: "Rate Reduction",
      description: "Ask for a lower monthly rate",
    },
    {
      value: "loyalty_discount",
      label: "Loyalty Discount",
      description: "Request a discount for being a long-term customer",
    },
    {
      value: "price_match",
      label: "Price Match",
      description: "Match a competitor's lower price",
    },
    {
      value: "cancellation",
      label: "Cancellation Threat",
      description: "Threaten to cancel to get retention offers",
    },
    {
      value: "bundle_discount",
      label: "Bundle Discount",
      description: "Combine services for a discount",
    },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 w-full max-w-lg">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Start Negotiation
        </h3>
        <p className="text-gray-500 dark:text-slate-400 mb-4">
          {opportunity.merchantName} - ${opportunity.currentAmount}/mo
        </p>

        <div className="space-y-3 mb-6">
          {negotiationTypes.map((type) => (
            <label
              key={type.value}
              className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer ${
                selectedType === type.value
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                  : "border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700"
              }`}
            >
              <input
                type="radio"
                name="negotiationType"
                value={type.value}
                checked={selectedType === type.value}
                onChange={() => setSelectedType(type.value)}
                className="mt-1"
              />
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  {type.label}
                </p>
                <p className="text-sm text-gray-500 dark:text-slate-400">
                  {type.description}
                </p>
              </div>
              {type.value === opportunity.suggestedApproach && (
                <span className="ml-auto px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs rounded-full">
                  Recommended
                </span>
              )}
            </label>
          ))}
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onStart(opportunity, selectedType)}
            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
          >
            Generate Scripts
          </button>
        </div>
      </div>
    </div>
  );
}
