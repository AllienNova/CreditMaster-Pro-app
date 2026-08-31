"use client";

import { Icon } from "@/components/ui/Icon";
import React, { useState, useEffect } from "react";
import Link from "next/link";

type Step =
  | "select-bureau"
  | "select-type"
  | "select-items"
  | "customize"
  | "review"
  | "complete";

interface DisputeItem {
  id: string;
  type: string;
  description: string;
  selected: boolean;
}

export default function DisputeWizardPage() {
  const [step, setStep] = useState<Step>("select-bureau");
  const [bureau, setBureau] = useState<string>("");
  const [disputeType, setDisputeType] = useState<string>("");
  // The reader's OWN disputable items, from
  // GET /api/credit-repair/disputable-items (withPermission, user id from the
  // session). This was a useState initialiser holding four invented entries —
  // "Capital One - Late payment March 2023", "ABC Collections - Medical debt
  // $450", "XYZ Lender - Unauthorized inquiry Oct 2024" — which a reader could
  // tick and dispute. Filing a dispute over an entry that is not on your report
  // is a real action with real consequences.
  const [items, setItems] = useState<DisputeItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const [itemsError, setItemsError] = useState<string | null>(null);
  const [customMessage, setCustomMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/credit-repair/disputable-items");
        const json = await res.json().catch(() => null);
        if (cancelled) return;
        if (!res.ok || !Array.isArray(json?.items)) {
          setItems([]);
          setItemsError(
            "We could not load the items on your report. Nothing is listed here for you to dispute until we can — try again in a moment.",
          );
        } else {
          setItems(
            (json.items as Record<string, unknown>[]).map((item) => ({
              id: String(item.id ?? ""),
              type: String(item.type ?? "account"),
              description: [
                String(item.accountName ?? "Account"),
                item.status ? String(item.status) : null,
                typeof item.balance === "number"
                  ? `$${item.balance.toLocaleString()}`
                  : null,
              ]
                .filter(Boolean)
                .join(" — "),
              selected: false,
            })),
          );
        }
      } catch {
        if (!cancelled) {
          setItems([]);
          setItemsError("We could not reach the credit-report service.");
        }
      } finally {
        if (!cancelled) setLoadingItems(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const bureaus = [
    { id: "experian", name: "Experian", color: "blue", icon: "document-chart" },
    { id: "equifax", name: "Equifax", color: "red", icon: "document-chart" },
    {
      id: "transunion",
      name: "TransUnion",
      color: "green",
      icon: "document-chart",
    },
  ];

  const disputeTypes = [
    {
      id: "not-mine",
      name: "Not My Account",
      desc: "Account does not belong to me",
    },
    { id: "never-late", name: "Never Late", desc: "Payment was made on time" },
    { id: "paid", name: "Paid in Full", desc: "Debt has been paid" },
    {
      id: "incorrect",
      name: "Incorrect Information",
      desc: "Details are wrong",
    },
    { id: "outdated", name: "Outdated", desc: "Should be removed due to age" },
    { id: "duplicate", name: "Duplicate", desc: "Same item reported twice" },
  ];

  const toggleItem = (id: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, selected: !item.selected } : item,
      ),
    );
  };

  const selectedCount = items.filter((i) => i.selected).length;

  const nextStep = () => {
    const steps: Step[] = [
      "select-bureau",
      "select-type",
      "select-items",
      "customize",
      "review",
      "complete",
    ];
    const currentIndex = steps.indexOf(step);
    if (currentIndex < steps.length - 1) setStep(steps[currentIndex + 1]);
  };

  const prevStep = () => {
    const steps: Step[] = [
      "select-bureau",
      "select-type",
      "select-items",
      "customize",
      "review",
      "complete",
    ];
    const currentIndex = steps.indexOf(step);
    if (currentIndex > 0) setStep(steps[currentIndex - 1]);
  };

  const submitDispute = async () => {
    // Simulate submission
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setStep("complete");
  };

  const progressPercent = {
    "select-bureau": 20,
    "select-type": 40,
    "select-items": 60,
    customize: 80,
    review: 90,
    complete: 100,
  }[step];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-50 to-blue-50">
      <header className="bg-white dark:bg-slate-800/80 backdrop-blur-sm shadow-sm border-b border-white/20 sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link
                href="/dashboard/disputes"
                className="text-gray-600 hover:text-gray-900 dark:text-white dark:hover:text-white"
              >
                ← Back
              </Link>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                Dispute Wizard
              </h1>
            </div>
            <span className="text-sm text-gray-500 dark:text-slate-400">
              Step{" "}
              {[
                "select-bureau",
                "select-type",
                "select-items",
                "customize",
                "review",
              ].indexOf(step) + 1}{" "}
              of 5
            </span>
          </div>
          <div className="h-1 bg-gray-200 dark:bg-slate-700 -mx-4 sm:-mx-6 lg:-mx-8">
            <div
              className="h-full bg-blue-600 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {step === "select-bureau" && (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Select Credit Bureau
            </h2>
            <p className="text-gray-600 dark:text-slate-300 mb-6">
              Choose which bureau to send your dispute to
            </p>
            <div className="grid grid-cols-3 gap-4">
              {bureaus.map((b) => (
                <button
                  key={b.id}
                  onClick={() => {
                    setBureau(b.id);
                    nextStep();
                  }}
                  className={`p-6 rounded-xl border-2 transition-all hover:shadow-md ${bureau === b.id ? "border-blue-500 bg-blue-50" : "border-gray-200 dark:border-slate-700"}`}
                >
                  <div className="text-4xl mb-2">{b.icon}</div>
                  <p className="font-semibold">{b.name}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === "select-type" && (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Dispute Reason
            </h2>
            <p className="text-gray-600 dark:text-slate-300 mb-6">
              Why are you disputing this item?
            </p>
            <div className="grid grid-cols-2 gap-4">
              {disputeTypes.map((type) => (
                <button
                  key={type.id}
                  onClick={() => {
                    setDisputeType(type.id);
                    nextStep();
                  }}
                  className={`p-4 rounded-xl border-2 text-left transition-all hover:shadow-md ${disputeType === type.id ? "border-blue-500 bg-blue-50" : "border-gray-200 dark:border-slate-700"}`}
                >
                  <p className="font-semibold">{type.name}</p>
                  <p className="text-sm text-gray-500 dark:text-slate-400">
                    {type.desc}
                  </p>
                </button>
              ))}
            </div>
            <button
              onClick={prevStep}
              className="mt-6 text-gray-600 hover:text-gray-900 dark:text-white dark:hover:text-white"
            >
              ← Back
            </button>
          </div>
        )}

        {step === "select-items" && (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Select Items to Dispute
            </h2>
            <p className="text-gray-600 dark:text-slate-300 mb-6">
              Choose which items from your report to include
            </p>

            {itemsError && (
              <div className="mb-6 rounded-lg border border-amber-200 dark:border-amber-900/50 p-4">
                <p className="font-medium text-gray-900 dark:text-white mb-1">
                  Your report items could not be loaded
                </p>
                <p className="text-sm text-gray-600 dark:text-slate-300">
                  {itemsError}
                </p>
              </div>
            )}

            {loadingItems && (
              <p className="text-sm text-gray-600 dark:text-slate-300 mb-6">
                Loading the items on your report...
              </p>
            )}

            {/* An empty list must not read as "nothing to dispute" when the
                load failed — the two are different facts. */}
            {!loadingItems && !itemsError && items.length === 0 && (
              <div className="mb-6 rounded-lg border border-gray-200 dark:border-slate-700 p-6">
                <p className="font-medium text-gray-900 dark:text-white mb-1">
                  Nothing on your report is disputable right now
                </p>
                <p className="text-sm text-gray-600 dark:text-slate-300">
                  We found no negative accounts or undisputed inquiries on your
                  report. Nothing is listed here for you to dispute.
                </p>
              </div>
            )}

            <div className="space-y-3">
              {items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => toggleItem(item.id)}
                  className={`w-full p-4 rounded-xl border-2 text-left transition-all ${item.selected ? "border-blue-500 bg-blue-50" : "border-gray-200 dark:border-slate-700"}`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{item.type}</p>
                      <p className="text-sm text-gray-600 dark:text-slate-300">
                        {item.description}
                      </p>
                    </div>
                    <div
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${item.selected ? "border-blue-500 bg-blue-500" : "border-gray-300 dark:border-slate-600"}`}
                    >
                      {item.selected && (
                        <span className="text-white text-sm"></span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
            <div className="flex justify-between mt-6">
              <button
                onClick={prevStep}
                className="text-gray-600 hover:text-gray-900 dark:text-white dark:hover:text-white"
              >
                ← Back
              </button>
              <button
                onClick={nextStep}
                disabled={selectedCount === 0}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50"
              >
                Continue ({selectedCount} selected)
              </button>
            </div>
          </div>
        )}

        {step === "customize" && (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Customize Your Letter
            </h2>
            <p className="text-gray-600 dark:text-slate-300 mb-6">
              Add any additional details (optional)
            </p>
            <textarea
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder="Add any additional context..."
              className="w-full h-40 p-4 border border-gray-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <div className="flex justify-between mt-6">
              <button
                onClick={prevStep}
                className="text-gray-600 dark:text-slate-300"
              >
                ← Back
              </button>
              <button
                onClick={nextStep}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {step === "review" && (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              Review Your Dispute
            </h2>
            <div className="space-y-4 mb-6">
              <div className="p-4 bg-gray-50 dark:bg-slate-900 rounded-lg">
                <span className="text-gray-500 dark:text-slate-400">
                  Bureau:
                </span>{" "}
                <span className="font-medium capitalize">{bureau}</span>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-slate-900 rounded-lg">
                <span className="text-gray-500 dark:text-slate-400">
                  Reason:
                </span>{" "}
                <span className="font-medium">
                  {disputeTypes.find((t) => t.id === disputeType)?.name}
                </span>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-slate-900 rounded-lg">
                <span className="text-gray-500 dark:text-slate-400">
                  Items:
                </span>{" "}
                <span className="font-medium">
                  {selectedCount} items selected
                </span>
              </div>
            </div>
            <div className="flex justify-between">
              <button
                onClick={prevStep}
                className="text-gray-600 dark:text-slate-300"
              >
                ← Back
              </button>
              <button
                onClick={submitDispute}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Submit Dispute
              </button>
            </div>
          </div>
        )}

        {step === "complete" && (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-8 text-center">
            <div className="text-6xl mb-4"></div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Dispute Submitted!
            </h2>
            <p className="text-gray-600 dark:text-slate-300 mb-6">
              Your dispute has been generated and is ready to send. Track
              progress in your dashboard.
            </p>
            <div className="flex gap-4 justify-center">
              <Link
                href="/dashboard/disputes"
                className="px-6 py-2 bg-blue-600 text-white rounded-lg"
              >
                View Disputes
              </Link>
              <button
                onClick={() => {
                  setStep("select-bureau");
                  setBureau("");
                  setDisputeType("");
                  setItems(items.map((i) => ({ ...i, selected: false })));
                }}
                className="px-6 py-2 border rounded-lg"
              >
                New Dispute
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
