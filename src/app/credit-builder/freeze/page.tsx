"use client";

import { Icon } from "@/components/ui/Icon";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import Link from "next/link";

// Types
interface Bureau {
  id: "experian" | "equifax" | "transunion";
  name: string;
  logo: string;
  freezeStatus: "frozen" | "unfrozen" | "unknown";
  lastUpdated?: Date;
  pin?: string;
  confirmationNumber?: string;
  website: string;
  phone: string;
  freezeUrl: string;
  unfreezeUrl: string;
  estimatedTime: string;
}

interface FreezeHistory {
  id: string;
  bureau: string;
  action: "freeze" | "unfreeze" | "temporary_lift";
  timestamp: Date;
  duration?: number; // for temporary lifts
  reason?: string;
}

interface IdentityAlert {
  id: string;
  type:
    | "hard_inquiry"
    | "new_account"
    | "address_change"
    | "suspicious_activity";
  bureau: string;
  description: string;
  timestamp: Date;
  severity: "low" | "medium" | "high";
  resolved: boolean;
}

export default function CreditFreezeManager() {
  const { user, loading: authLoading } = useAuth();

  // Bureau freeze states
  const [bureaus, setBureaus] = useState<Bureau[]>([
    {
      id: "experian",
      name: "Experian",
      logo: "",
      freezeStatus: "unknown",
      website: "https://www.experian.com/freeze/center.html",
      phone: "1-888-397-3742",
      freezeUrl: "https://www.experian.com/freeze/center.html",
      unfreezeUrl: "https://www.experian.com/freeze/center.html",
      estimatedTime: "1 minute",
    },
    {
      id: "equifax",
      name: "Equifax",
      logo: "",
      freezeStatus: "unknown",
      website:
        "https://www.equifax.com/personal/credit-report-services/credit-freeze/",
      phone: "1-800-349-9960",
      freezeUrl: "https://my.equifax.com/membercenter/#/freeze",
      unfreezeUrl: "https://my.equifax.com/membercenter/#/freeze",
      estimatedTime: "1 minute",
    },
    {
      id: "transunion",
      name: "TransUnion",
      logo: "",
      freezeStatus: "unknown",
      website: "https://www.transunion.com/credit-freeze",
      phone: "1-888-909-8872",
      freezeUrl: "https://service.transunion.com/dss/orderStep1_form.page",
      unfreezeUrl: "https://service.transunion.com/dss/orderStep1_form.page",
      estimatedTime: "1 minute",
    },
  ]);

  const [selectedBureau, setSelectedBureau] = useState<Bureau | null>(null);
  const [freezeHistory, setFreezeHistory] = useState<FreezeHistory[]>([]);
  const [identityAlerts, setIdentityAlerts] = useState<IdentityAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [tempPin, setTempPin] = useState("");
  const [tempConfirmation, setTempConfirmation] = useState("");
  const [showGuide, setShowGuide] = useState(false);
  const [selectedAction, setSelectedAction] = useState<
    "freeze" | "unfreeze" | "temporary"
  >("freeze");

  useEffect(() => {
    fetchFreezeStatus();
    fetchHistory();
    fetchAlerts();
  }, []);

  const fetchFreezeStatus = async () => {
    try {
      const response = await fetch("/api/credit-builder/freeze-status");
      if (response.ok) {
        const data = await response.json();
        if (data.bureaus) {
          setBureaus((prevBureaus) =>
            prevBureaus.map((bureau) => ({
              ...bureau,
              ...data.bureaus.find((b: any) => b.id === bureau.id),
            })),
          );
        }
      }
    } catch (_err) {
      // CreditFreezeManager error: Failed to fetch freeze status
      void _err;
    }
  };

  const fetchHistory = async () => {
    try {
      const response = await fetch("/api/credit-builder/freeze-history");
      if (response.ok) {
        const data = await response.json();
        setFreezeHistory(data.history || []);
      }
    } catch (_err) {
      // CreditFreezeManager error: Failed to fetch history
      void _err;
    }
  };

  const fetchAlerts = async () => {
    try {
      const response = await fetch("/api/credit-builder/identity-alerts");
      if (response.ok) {
        const data = await response.json();
        setIdentityAlerts(data.alerts || []);
      }
    } catch (_err) {
      // CreditFreezeManager error: Failed to fetch alerts
      void _err;
    }
  };

  const updateBureauStatus = (
    bureauId: string,
    status: "frozen" | "unfrozen",
    pin?: string,
    confirmation?: string,
  ) => {
    setBureaus((prev) =>
      prev.map((b) =>
        b.id === bureauId
          ? {
              ...b,
              freezeStatus: status,
              pin,
              confirmationNumber: confirmation,
              lastUpdated: new Date(),
            }
          : b,
      ),
    );

    // Add to history
    const newHistoryEntry: FreezeHistory = {
      id: Date.now().toString(),
      bureau: bureauId,
      action: status === "frozen" ? "freeze" : "unfreeze",
      timestamp: new Date(),
    };
    setFreezeHistory((prev) => [newHistoryEntry, ...prev]);
  };

  const handleFreezeAction = (
    bureau: Bureau,
    action: "freeze" | "unfreeze" | "temporary",
  ) => {
    setSelectedBureau(bureau);
    setSelectedAction(action);
    setShowPinModal(true);
  };

  const confirmAction = () => {
    if (!selectedBureau) return;

    const status = selectedAction === "freeze" ? "frozen" : "unfrozen";
    updateBureauStatus(
      selectedBureau.id,
      status,
      tempPin || undefined,
      tempConfirmation || undefined,
    );

    setShowPinModal(false);
    setTempPin("");
    setTempConfirmation("");
    setSelectedBureau(null);
  };

  const freezeAll = () => {
    bureaus.forEach((bureau) => {
      if (bureau.freezeStatus !== "frozen") {
        window.open(bureau.freezeUrl, "_blank");
      }
    });
  };

  const unfreezeAll = () => {
    bureaus.forEach((bureau) => {
      if (bureau.freezeStatus === "frozen") {
        window.open(bureau.unfreezeUrl, "_blank");
      }
    });
  };

  const getOverallStatus = () => {
    const frozenCount = bureaus.filter(
      (b) => b.freezeStatus === "frozen",
    ).length;
    if (frozenCount === 3)
      return { status: "Protected", color: "green", icon: "sparkles" };
    if (frozenCount > 0)
      return {
        status: "Partially Protected",
        color: "yellow",
        icon: "sparkles",
      };
    return { status: "Unprotected", color: "red", icon: "sparkles" };
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto"></div>
          <p className="mt-6 text-lg text-gray-700 dark:text-slate-200 font-medium">
            Loading Credit Freeze Manager...
          </p>
        </div>
      </div>
    );
  }

  const overallStatus = getOverallStatus();
  const unresolvedAlerts = identityAlerts.filter((a) => !a.resolved);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-50 to-blue-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <Link
            href="/credit-builder"
            className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-4"
          >
            ← Back to Credit Builder
          </Link>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Credit Freeze Manager
          </h1>
          <p className="text-lg text-gray-600 dark:text-slate-300 max-w-3xl mx-auto">
            Centralized control of your credit freezes across all three bureaus.
            Protect your identity with one-click freeze management.
          </p>
        </div>

        {/* Overall Status Card */}
        <div
          className={`bg-gradient-to-r from-${overallStatus.color}-600 to-${overallStatus.color}-700 rounded-xl p-6 mb-8 text-white shadow-xl`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90 mb-1">
                Identity Protection Status
              </p>
              <p className="text-3xl font-bold flex items-center gap-3">
                <span>{overallStatus.icon}</span>
                <span>{overallStatus.status}</span>
              </p>
              <p className="text-sm opacity-90 mt-2">
                {bureaus.filter((b) => b.freezeStatus === "frozen").length} of 3
                bureaus frozen
              </p>
            </div>
            <div className="text-right">
              <button
                onClick={() => setShowGuide(!showGuide)}
                className="px-6 py-3 bg-white text-gray-800 dark:text-slate-100 font-semibold rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 dark:bg-slate-800 transition-colors"
              >
                {showGuide ? "Hide Guide" : "How It Works"}
              </button>
            </div>
          </div>
        </div>

        {/* Guide */}
        {showGuide && (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Credit Freeze Guide
            </h2>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  What is a Credit Freeze?
                </h3>
                <p className="text-sm text-gray-700 dark:text-slate-200 mb-4">
                  A credit freeze (also called a security freeze) restricts
                  access to your credit report, making it nearly impossible for
                  identity thieves to open new accounts in your name. It's the
                  strongest form of identity theft protection available.
                </p>

                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  When to Freeze
                </h3>
                <ul className="text-sm text-gray-700 dark:text-slate-200 space-y-1">
                  <li>• After a data breach involving your personal info</li>
                  <li>• If you're not planning to apply for credit soon</li>
                  <li>• As preventive protection against identity theft</li>
                  <li>• When you suspect fraudulent activity</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  When to Unfreeze
                </h3>
                <ul className="text-sm text-gray-700 dark:text-slate-200 space-y-1 mb-4">
                  <li>• Applying for credit cards or loans</li>
                  <li>• Renting an apartment (some landlords check credit)</li>
                  <li>• Applying for jobs (some employers check credit)</li>
                  <li>• Getting insurance quotes</li>
                </ul>

                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  Important Notes
                </h3>
                <ul className="text-sm text-gray-700 dark:text-slate-200 space-y-1">
                  <li>• Freezing is FREE by federal law</li>
                  <li>• You must freeze at ALL THREE bureaus</li>
                  <li>• Save your PIN/password for unfreezing</li>
                  <li>• Temporary lifts available (1 hour to 7 days)</li>
                </ul>
              </div>
            </div>

            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Pro Tip:</strong> A credit freeze does NOT affect your
                credit score, existing accounts, or employment. It only prevents
                NEW account openings.
              </p>
            </div>
          </div>
        )}

        {/* Identity Alerts */}
        {unresolvedAlerts.length > 0 && (
          <div className="bg-red-50 border-2 border-red-300 rounded-xl p-6 mb-8">
            <h2 className="text-xl font-bold text-red-900 mb-4 flex items-center gap-2">
              <span></span> Identity Alerts ({unresolvedAlerts.length})
            </h2>
            <div className="space-y-3">
              {unresolvedAlerts.slice(0, 3).map((alert) => (
                <div
                  key={alert.id}
                  className="bg-white dark:bg-slate-800 rounded-lg p-4 border-l-4 border-red-500"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {alert.description}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-slate-300">
                        {alert.bureau} •{" "}
                        {new Date(alert.timestamp).toLocaleDateString()}
                      </p>
                    </div>
                    <span
                      className={`px-2 py-1 rounded text-xs font-semibold ${
                        alert.severity === "high"
                          ? "bg-red-100 text-red-800"
                          : alert.severity === "medium"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-slate-100"
                      }`}
                    >
                      {alert.severity}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <button
            onClick={freezeAll}
            className="p-6 bg-gradient-to-br from-blue-600 to-blue-600 text-white rounded-xl hover:from-blue-700 hover:to-blue-700 transition-all shadow-lg"
          >
            <div className="text-center">
              <p className="text-4xl mb-2"></p>
              <p className="text-xl font-bold mb-1">Freeze All Bureaus</p>
              <p className="text-sm opacity-90">
                Maximum protection in 3 minutes
              </p>
            </div>
          </button>

          <button
            onClick={unfreezeAll}
            className="p-6 bg-gradient-to-br from-orange-500 to-red-500 text-white rounded-xl hover:from-orange-600 hover:to-red-600 transition-all shadow-lg"
          >
            <div className="text-center">
              <p className="text-4xl mb-2"></p>
              <p className="text-xl font-bold mb-1">Unfreeze All Bureaus</p>
              <p className="text-sm opacity-90">
                Prepare for credit applications
              </p>
            </div>
          </button>
        </div>

        {/* Bureau Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {bureaus.map((bureau) => (
            <div
              key={bureau.id}
              className="bg-white dark:bg-slate-800 rounded-xl shadow-lg overflow-hidden border-2 border-gray-200 dark:border-slate-700"
            >
              {/* Bureau Header */}
              <div
                className={`p-4 ${
                  bureau.freezeStatus === "frozen"
                    ? "bg-green-50"
                    : bureau.freezeStatus === "unfrozen"
                      ? "bg-red-50"
                      : "bg-gray-50 dark:bg-slate-900"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-3xl">{bureau.logo}</span>
                    <h3 className="font-bold text-gray-900 dark:text-white">
                      {bureau.name}
                    </h3>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      bureau.freezeStatus === "frozen"
                        ? "bg-green-100 text-green-800"
                        : bureau.freezeStatus === "unfrozen"
                          ? "bg-red-100 text-red-800"
                          : "bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-slate-100"
                    }`}
                  >
                    {bureau.freezeStatus === "frozen"
                      ? "Frozen"
                      : bureau.freezeStatus === "unfrozen"
                        ? "Unfrozen"
                        : "Unknown"}
                  </span>
                </div>
                {bureau.lastUpdated && (
                  <p className="text-xs text-gray-600 dark:text-slate-300">
                    Updated: {new Date(bureau.lastUpdated).toLocaleDateString()}
                  </p>
                )}
              </div>

              {/* Bureau Details */}
              <div className="p-4">
                {bureau.pin && (
                  <div className="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-xs font-semibold text-yellow-900 mb-1">
                      Your PIN
                    </p>
                    <p className="text-sm font-mono text-yellow-800">
                      {bureau.pin}
                    </p>
                  </div>
                )}

                {bureau.confirmationNumber && (
                  <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-xs font-semibold text-blue-900 mb-1">
                      Confirmation #
                    </p>
                    <p className="text-sm font-mono text-blue-800">
                      {bureau.confirmationNumber}
                    </p>
                  </div>
                )}

                <div className="space-y-2 text-sm text-gray-600 dark:text-slate-300 mb-4">
                  <p className="flex items-center gap-2">
                    <span></span> {bureau.phone}
                  </p>
                  <p className="flex items-center gap-2">
                    <span>⏱️</span> Est. time: {bureau.estimatedTime}
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="space-y-2">
                  {bureau.freezeStatus !== "frozen" && (
                    <>
                      <button
                        onClick={() => window.open(bureau.freezeUrl, "_blank")}
                        className="w-full py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Freeze on Website
                      </button>
                      <button
                        onClick={() => handleFreezeAction(bureau, "freeze")}
                        className="w-full py-2 bg-gray-100 text-gray-700 dark:text-slate-200 font-semibold rounded-lg hover:bg-gray-200 dark:bg-slate-700 transition-colors"
                      >
                        Mark as Frozen
                      </button>
                    </>
                  )}

                  {bureau.freezeStatus === "frozen" && (
                    <>
                      <button
                        onClick={() =>
                          window.open(bureau.unfreezeUrl, "_blank")
                        }
                        className="w-full py-2 bg-orange-600 text-white font-semibold rounded-lg hover:bg-orange-700 transition-colors"
                      >
                        Unfreeze on Website
                      </button>
                      <button
                        onClick={() => handleFreezeAction(bureau, "temporary")}
                        className="w-full py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Temporary Lift
                      </button>
                      <button
                        onClick={() => handleFreezeAction(bureau, "unfreeze")}
                        className="w-full py-2 bg-gray-100 text-gray-700 dark:text-slate-200 font-semibold rounded-lg hover:bg-gray-200 dark:bg-slate-700 transition-colors"
                      >
                        Mark as Unfrozen
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Freeze History */}
        {freezeHistory.length > 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Recent Activity
            </h2>
            <div className="space-y-3">
              {freezeHistory.slice(0, 10).map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-900 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">
                      {entry.action === "freeze"
                        ? ""
                        : entry.action === "unfreeze"
                          ? ""
                          : "⏰"}
                    </span>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white capitalize">
                        {entry.action.replace("_", " ")} - {entry.bureau}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-slate-300">
                        {new Date(entry.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  {entry.duration && (
                    <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold">
                      {entry.duration} days
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PIN Modal */}
        {showPinModal && selectedBureau && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 max-w-md w-full">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                {selectedAction === "freeze"
                  ? "Confirm Freeze"
                  : selectedAction === "unfreeze"
                    ? "Confirm Unfreeze"
                    : "Temporary Lift"}{" "}
                - {selectedBureau.name}
              </h3>

              <p className="text-sm text-gray-600 dark:text-slate-300 mb-4">
                After completing the {selectedAction} on {selectedBureau.name}'s
                website, enter your PIN and confirmation number here for
                tracking.
              </p>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">
                    PIN / Password
                  </label>
                  <input
                    type="text"
                    value={tempPin}
                    onChange={(e) => setTempPin(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500"
                    placeholder="Enter PIN from bureau"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">
                    Confirmation Number (Optional)
                  </label>
                  <input
                    type="text"
                    value={tempConfirmation}
                    onChange={(e) => setTempConfirmation(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500"
                    placeholder="Enter confirmation number"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowPinModal(false);
                    setTempPin("");
                    setTempConfirmation("");
                  }}
                  className="flex-1 py-2 bg-gray-100 text-gray-700 dark:text-slate-200 font-semibold rounded-lg hover:bg-gray-200 dark:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmAction}
                  className="flex-1 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Educational Info */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h3 className="font-semibold text-blue-900 mb-3">
            Credit Freeze vs. Fraud Alert
          </h3>
          <div className="grid md:grid-cols-2 gap-4 text-sm text-blue-800">
            <div>
              <p className="font-semibold mb-1">Credit Freeze (Recommended)</p>
              <ul className="space-y-1">
                <li>• Completely blocks access to credit report</li>
                <li>• Must be placed at each bureau individually</li>
                <li>• Free by federal law</li>
                <li>• You control when to lift</li>
                <li>• Strongest protection available</li>
              </ul>
            </div>
            <div>
              <p className="font-semibold mb-1">Fraud Alert</p>
              <ul className="space-y-1">
                <li>• Adds warning to credit report</li>
                <li>• Creditors must verify identity first</li>
                <li>• Lasts 1 year (or 7 for ID theft victims)</li>
                <li>• Placed at one bureau, shared with others</li>
                <li>• Weaker protection than freeze</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
