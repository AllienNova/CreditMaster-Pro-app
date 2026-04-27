"use client";

import React, { useState, useCallback, useEffect, type ReactElement } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Copy,
  ExternalLink,
  AlertTriangle,
  Phone,
  Globe,
  MessageSquare,
  Mail,
  Lightbulb,
  TrendingDown,
  Clock,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui";
import { useToast } from "@/components/ui/Toast";
// Types imported directly to avoid pulling in server-side supabaseAdmin
// The service uses supabase/server which requires next/headers (server-only)
type SubscriptionStatus = "active" | "cancelled" | "pending_cancellation" | "paused";
type CancellationOutcome = "cancelled" | "retained" | "pending" | "failed";

// Matches the service's Subscription type but keeps nextBillingDate flexible
interface Subscription {
  id: string;
  userId: string;
  name: string;
  merchantName: string;
  amount: number;
  frequency: "weekly" | "monthly" | "quarterly" | "yearly";
  category: string;
  status: SubscriptionStatus;
  nextBillingDate: Date;
  detectedFromBillId?: string;
  logoUrl?: string;
  annualCost: number;
  cancellationStatus?: CancellationOutcome;
  cancelledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

type CancellationMethod = "phone" | "email" | "website" | "chat" | "in_app" | "mail";

interface CancellationInfo {
  companyName: string;
  cancellationMethods: CancellationMethod[];
  phoneNumber?: string;
  email?: string;
  websiteUrl?: string;
  chatUrl?: string;
  difficulty: "easy" | "medium" | "hard";
  averageTime: string;
  tips: string[];
  retentionOffers: string[];
}

interface CancellationScript {
  opening: string;
  reason: string;
  rebuttals: { offer: string; response: string }[];
  closing: string;
  tips: string[];
}

// Client-side helper: fetch cancellation info via API instead of direct service import
async function fetchCancellationInfo(merchantName: string): Promise<CancellationInfo | null> {
  try {
    const res = await fetch(`/api/financial/subscriptions/cancellation-info?merchant=${encodeURIComponent(merchantName)}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.info ?? null;
  } catch {
    return null;
  }
}

// Client-side pure function equivalents (no server dependency)
function generateCancellationScript(serviceName: string, reason?: string): CancellationScript {
  const customReason = reason || "I no longer need this service and would like to cancel my subscription.";
  return {
    opening: `Hello, I'm calling to cancel my ${serviceName} subscription.`,
    reason: customReason,
    rebuttals: [
      { offer: "We can offer you a discount", response: "I appreciate the offer, but I've already made my decision to cancel." },
      { offer: "Would you like to pause instead?", response: "No thank you, I'd like to fully cancel my subscription." },
      { offer: "Can I transfer you to our retention team?", response: "I'd prefer to process the cancellation now. Could you help me with that?" },
    ],
    closing: "Could you please confirm the cancellation and send me a confirmation email? What is my cancellation reference number?",
    tips: [
      "Stay polite but firm",
      "Ask for a cancellation confirmation number",
      "Request email confirmation",
      "Note the date, time, and representative's name",
    ],
  };
}

function generateCancellationInstructions(subscription: Subscription, info: CancellationInfo | null): { steps: string[]; warnings: string[]; tips: string[] } {
  if (!info) {
    return {
      steps: [
        `Search for "${subscription.merchantName} cancel subscription" to find instructions`,
        'Log into your account and look for "Account Settings" or "Subscription"',
        'Look for a "Cancel" or "Manage Subscription" option',
        "Follow the prompts to complete cancellation",
        "Request and save a confirmation email or number",
      ],
      warnings: [
        "Make sure to cancel before your next billing date",
        "Some services may try to offer discounts to keep you",
      ],
      tips: [
        "Take screenshots of your cancellation confirmation",
        "Check your bank statement to verify no future charges",
      ],
    };
  }

  const steps: string[] = [];
  if (info.cancellationMethods.includes("in_app")) steps.push(`Log into your ${subscription.merchantName} account and go to Settings > Subscription`);
  if (info.phoneNumber) steps.push(`Call ${info.phoneNumber} during business hours`);
  if (info.email) steps.push(`Send a cancellation request to ${info.email}`);
  if (info.chatUrl) steps.push(`Use live chat at ${info.chatUrl}`);
  if (info.websiteUrl) steps.push(`Visit ${info.websiteUrl} for cancellation options`);
  steps.push("Request a confirmation email and reference number");

  return {
    steps: steps.length > 1 ? steps : [`Contact ${subscription.merchantName} to cancel`, "Request confirmation"],
    warnings: info.retentionOffers.length > 0 ? ["This service is known for retention offers — stay firm if you want to cancel"] : [],
    tips: info.tips.length > 0 ? info.tips : ["Save your cancellation confirmation"],
  };
}

// ============================================================================
// Types
// ============================================================================

interface Props {
  subscription: Subscription;
  onComplete: (outcome: CancellationOutcome) => void;
  onClose: () => void;
}

type Step = 1 | 2 | 3 | 4;

interface OutcomeOption {
  value: CancellationOutcome;
  label: string;
  description: string;
  color: string;
}

// ============================================================================
// Constants
// ============================================================================

const STEP_LABELS: Record<Step, string> = {
  1: "Review",
  2: "Alternatives",
  3: "Cancel",
  4: "Confirm",
};

const OUTCOME_OPTIONS: OutcomeOption[] = [
  {
    value: "cancelled",
    label: "Successfully cancelled",
    description: "The subscription has been cancelled",
    color: "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20",
  },
  {
    value: "retained",
    label: "Kept with discount",
    description: "Negotiated a better rate",
    color: "border-blue-500 bg-blue-50 dark:bg-blue-900/20",
  },
  {
    value: "pending",
    label: "Still working on it",
    description: "Need more time to cancel",
    color: "border-amber-500 bg-amber-50 dark:bg-amber-900/20",
  },
  {
    value: "failed",
    label: "Could not cancel",
    description: "Encountered an obstacle",
    color: "border-red-500 bg-red-50 dark:bg-red-900/20",
  },
];

const ALTERNATIVES: Record<string, { name: string; price: string; note: string }[]> = {
  streaming: [
    { name: "Free tier", price: "$0/mo", note: "Many services offer ad-supported free tiers" },
    { name: "Library streaming", price: "$0/mo", note: "Kanopy and Hoopla via your library card" },
  ],
  software: [
    { name: "Free/open-source", price: "$0/mo", note: "LibreOffice, GIMP, and others cover most needs" },
    { name: "Downgrade plan", price: "50-70% less", note: "Move to a lower tier if available" },
  ],
  fitness: [
    { name: "YouTube workouts", price: "$0/mo", note: "Thousands of free workout videos" },
    { name: "Outdoor exercise", price: "$0/mo", note: "Running, cycling, bodyweight training" },
  ],
  food: [
    { name: "Cook at home", price: "Save $100+/mo", note: "Meal prepping cuts food costs significantly" },
    { name: "Grocery delivery", price: "~$5-10/order", note: "Pay per order instead of monthly" },
  ],
  shopping: [
    { name: "Standard shipping", price: "$0/mo", note: "Free shipping thresholds often work" },
    { name: "Local stores", price: "$0/mo", note: "Shop local and skip membership fees" },
  ],
};

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 40 : -40,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 40 : -40,
    opacity: 0,
  }),
};

// ============================================================================
// Sub-components
// ============================================================================

function StepDots({ current, total }: { current: Step; total: number }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {Array.from({ length: total }, (_, i) => {
        const stepNum = (i + 1) as Step;
        const isDone = stepNum < current;
        const isActive = stepNum === current;
        return (
          <div key={stepNum} className="flex items-center gap-2">
            <div
              className={`flex items-center justify-center rounded-full text-xs font-semibold transition-all duration-200 ${
                isDone
                  ? "w-7 h-7 bg-emerald-600 text-white"
                  : isActive
                  ? "w-7 h-7 bg-emerald-600 text-white ring-4 ring-emerald-100 dark:ring-emerald-900/40"
                  : "w-7 h-7 bg-gray-100 dark:bg-slate-700 text-gray-400 dark:text-slate-500"
              }`}
            >
              {isDone ? <CheckCircle className="w-4 h-4" /> : stepNum}
            </div>
            {i < total - 1 && (
              <div
                className={`w-8 h-0.5 transition-colors duration-300 ${
                  isDone ? "bg-emerald-600" : "bg-gray-200 dark:bg-slate-700"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function DifficultyBadge({ difficulty }: { difficulty: CancellationInfo["difficulty"] }) {
  const map = {
    easy: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    medium: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    hard: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  };
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-semibold capitalize ${map[difficulty]}`}>
      {difficulty} to cancel
    </span>
  );
}

// ============================================================================
// Step 1: Review
// ============================================================================

function StepReview({ subscription }: { subscription: Subscription }) {
  const [info, setInfo] = useState<CancellationInfo | null>(null);
  React.useEffect(() => {
    fetchCancellationInfo(subscription.merchantName).then(setInfo);
  }, [subscription.merchantName]);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);

  const frequencyLabel: Record<Subscription["frequency"], string> = {
    weekly: "week",
    monthly: "month",
    quarterly: "quarter",
    yearly: "year",
  };

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1">
              Subscription
            </p>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              {subscription.name}
            </h3>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">
              {subscription.merchantName}
            </p>
          </div>
          {info && <DifficultyBadge difficulty={info.difficulty} />}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 p-3">
            <p className="text-xs text-gray-500 dark:text-slate-400">Per {frequencyLabel[subscription.frequency]}</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white mt-0.5">
              {formatCurrency(subscription.amount)}
            </p>
          </div>
          <div className="rounded-lg bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 p-3">
            <p className="text-xs text-gray-500 dark:text-slate-400">Annual cost</p>
            <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
              {formatCurrency(subscription.annualCost ?? subscription.amount * 12)}
            </p>
          </div>
        </div>
      </div>

      {info && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-600 dark:text-slate-300">
              Average cancellation time: <strong>{info.averageTime}</strong>
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {info.cancellationMethods.map((method) => {
              const icons: Record<string, ReactElement> = {
                phone: <Phone className="w-3.5 h-3.5" />,
                website: <Globe className="w-3.5 h-3.5" />,
                chat: <MessageSquare className="w-3.5 h-3.5" />,
                email: <Mail className="w-3.5 h-3.5" />,
                in_app: <Shield className="w-3.5 h-3.5" />,
              };
              return (
                <span
                  key={method}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 text-xs font-medium capitalize"
                >
                  {icons[method]}
                  {method.replace("_", " ")}
                </span>
              );
            })}
          </div>
        </div>
      )}

      <div className="rounded-lg border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-900/10 p-3">
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
          <p className="text-sm text-amber-700 dark:text-amber-400">
            Cancelling will save you{" "}
            <strong>{formatCurrency(subscription.annualCost ?? subscription.amount * 12)}/year</strong>. Your access
            continues until the end of the current billing period.
          </p>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Step 2: Alternatives
// ============================================================================

function StepAlternatives({ subscription }: { subscription: Subscription }) {
  const alts = ALTERNATIVES[subscription.category] ?? ALTERNATIVES.streaming;
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);

  return (
    <div className="space-y-5">
      <div className="text-center pb-2">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 mb-3">
          <TrendingDown className="w-6 h-6 text-blue-600 dark:text-blue-400" />
        </div>
        <h3 className="text-base font-semibold text-gray-900 dark:text-white">
          Before you cancel
        </h3>
        <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
          Consider these alternatives to{" "}
          <strong>{formatCurrency(subscription.annualCost ?? subscription.amount * 12)}/year</strong>
        </p>
      </div>

      <div className="space-y-3">
        {alts.map((alt, i) => (
          <div
            key={i}
            className="flex items-start gap-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 p-4"
          >
            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <Lightbulb className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="min-w-0">
              <div className="flex items-baseline gap-2">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{alt.name}</p>
                <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">{alt.price}</span>
              </div>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{alt.note}</p>
            </div>
          </div>
        ))}
      </div>

      <p className="text-center text-xs text-gray-400 dark:text-slate-500">
        Still want to cancel? Continue to the next step.
      </p>
    </div>
  );
}

// ============================================================================
// Step 3: Cancel
// ============================================================================

function StepCancel({ subscription }: { subscription: Subscription }) {
  const toast = useToast();
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const [info, setInfo] = useState<CancellationInfo | null>(null);
  useEffect(() => {
    fetchCancellationInfo(subscription.merchantName).then(setInfo);
  }, [subscription.merchantName]);
  const script: CancellationScript = generateCancellationScript(subscription.name);
  const instructions = generateCancellationInstructions(subscription, info);

  const copyText = useCallback(
    async (text: string, section: string) => {
      try {
        await navigator.clipboard.writeText(text);
        setCopiedSection(section);
        toast.success("Copied to clipboard");
        setTimeout(() => setCopiedSection(null), 2000);
      } catch {
        toast.error("Could not copy to clipboard");
      }
    },
    [toast],
  );

  const fullScript = [
    script.opening,
    "",
    `Reason: ${script.reason}`,
    "",
    ...script.rebuttals.map((r) => `If they say: "${r.offer}"\nYou say: "${r.response}"`),
    "",
    script.closing,
  ].join("\n");

  return (
    <div className="space-y-5">
      {/* Contact info */}
      {info && (
        <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50 p-4 space-y-3">
          <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide">
            How to cancel {info.companyName}
          </p>
          <div className="flex flex-wrap gap-2">
            {info.phoneNumber && (
              <a
                href={`tel:${info.phoneNumber}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
              >
                <Phone className="w-3.5 h-3.5 text-emerald-600" />
                {info.phoneNumber}
              </a>
            )}
            {info.websiteUrl && (
              <a
                href={info.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5 text-blue-600" />
                Cancel online
              </a>
            )}
            {info.chatUrl && (
              <a
                href={info.chatUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
              >
                <MessageSquare className="w-3.5 h-3.5 text-purple-600" />
                Live chat
              </a>
            )}
          </div>
        </div>
      )}

      {/* Step-by-step instructions */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide">
          Steps
        </p>
        <ol className="space-y-2">
          {instructions.steps.map((step, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-bold flex items-center justify-center mt-0.5">
                {i + 1}
              </span>
              <span className="text-sm text-gray-700 dark:text-slate-300">{step}</span>
            </li>
          ))}
        </ol>
      </div>

      {/* AI script */}
      <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50">
          <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide">
            Cancellation script
          </p>
          <button
            type="button"
            onClick={() => copyText(fullScript, "script")}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors"
            aria-label="Copy cancellation script"
          >
            {copiedSection === "script" ? (
              <CheckCircle className="w-3.5 h-3.5" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
            {copiedSection === "script" ? "Copied!" : "Copy all"}
          </button>
        </div>
        <div className="p-4 space-y-3 text-sm text-gray-700 dark:text-slate-300">
          <p>
            <span className="font-semibold text-gray-900 dark:text-white">Opening: </span>
            {script.opening}
          </p>
          <p>
            <span className="font-semibold text-gray-900 dark:text-white">Reason: </span>
            {script.reason}
          </p>
          {script.rebuttals.slice(0, 2).map((r, i) => (
            <div key={i} className="rounded-lg bg-gray-50 dark:bg-slate-900/50 p-3 space-y-1">
              <p className="text-xs text-gray-500 dark:text-slate-400">
                If they say: <em>&ldquo;{r.offer}&rdquo;</em>
              </p>
              <p className="text-xs font-medium text-gray-700 dark:text-slate-300">
                You say: <em>&ldquo;{r.response}&rdquo;</em>
              </p>
            </div>
          ))}
          <p>
            <span className="font-semibold text-gray-900 dark:text-white">Closing: </span>
            {script.closing}
          </p>
        </div>
      </div>

      {/* Tips */}
      {instructions.tips.length > 0 && (
        <div className="space-y-1.5">
          {instructions.tips.map((tip, i) => (
            <div key={i} className="flex items-start gap-2">
              <Lightbulb className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
              <span className="text-xs text-gray-600 dark:text-slate-400">{tip}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Step 4: Confirm
// ============================================================================

interface StepConfirmProps {
  subscription: Subscription;
  selectedOutcome: CancellationOutcome | null;
  onSelectOutcome: (outcome: CancellationOutcome) => void;
  notes: string;
  onNotesChange: (notes: string) => void;
}

function StepConfirm({
  subscription,
  selectedOutcome,
  onSelectOutcome,
  notes,
  onNotesChange,
}: StepConfirmProps) {
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);

  return (
    <div className="space-y-5">
      <div className="text-center pb-1">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white">
          What was the outcome?
        </h3>
        <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
          Record the result of your cancellation attempt
        </p>
      </div>

      <div className="space-y-2">
        {OUTCOME_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onSelectOutcome(option.value)}
            className={`w-full text-left rounded-xl border-2 p-3.5 transition-all duration-150 ${
              selectedOutcome === option.value
                ? option.color
                : "border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 hover:border-gray-300 dark:hover:border-slate-600"
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  {option.label}
                </p>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                  {option.description}
                </p>
              </div>
              {selectedOutcome === option.value && (
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              )}
            </div>
          </button>
        ))}
      </div>

      {selectedOutcome === "cancelled" && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50 p-4 text-center"
        >
          <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
            You&apos;re saving
          </p>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            {formatCurrency(subscription.annualCost ?? subscription.amount * 12)}/year
          </p>
        </motion.div>
      )}

      <div>
        <label
          htmlFor="cancellation-notes"
          className="block text-xs font-medium text-gray-700 dark:text-slate-300 mb-1.5"
        >
          Notes <span className="text-gray-400 dark:text-slate-500 font-normal">(optional)</span>
        </label>
        <textarea
          id="cancellation-notes"
          rows={3}
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder="Confirmation number, representative name, discount offered..."
          className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
        />
      </div>
    </div>
  );
}

// ============================================================================
// Main Wizard
// ============================================================================

export function SubscriptionCancellationWizard({ subscription, onComplete, onClose }: Props) {
  const toast = useToast();
  const [step, setStep] = useState<Step>(1);
  const [direction, setDirection] = useState(1);
  const [selectedOutcome, setSelectedOutcome] = useState<CancellationOutcome | null>(null);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const totalSteps = 4;

  const goTo = useCallback(
    (target: Step) => {
      setDirection(target > step ? 1 : -1);
      setStep(target);
    },
    [step],
  );

  const handleNext = useCallback(() => {
    if (step < totalSteps) goTo((step + 1) as Step);
  }, [step, goTo]);

  const handleBack = useCallback(() => {
    if (step > 1) goTo((step - 1) as Step);
  }, [step, goTo]);

  const handleSubmit = useCallback(async () => {
    if (!selectedOutcome) {
      toast.error("Please select an outcome before submitting");
      return;
    }
    setIsSubmitting(true);
    try {
      onComplete(selectedOutcome);
    } catch {
      toast.error("Failed to record outcome. Please try again.");
      setIsSubmitting(false);
    }
  }, [selectedOutcome, onComplete, toast]);

  const canAdvance = step !== 4 || selectedOutcome !== null;

  return (
    <div className="flex flex-col" style={{ minHeight: "420px" }}>
      {/* Step indicator */}
      <div className="px-6 pt-4">
        <StepDots current={step} total={totalSteps} />
        <p className="text-center text-xs font-medium text-gray-500 dark:text-slate-400 -mt-4 mb-4">
          Step {step} of {totalSteps}: {STEP_LABELS[step]}
        </p>
      </div>

      {/* Step content with slide animation */}
      <div className="flex-1 overflow-y-auto px-6 pb-2">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.2, ease: "easeInOut" }}
          >
            {step === 1 && <StepReview subscription={subscription} />}
            {step === 2 && <StepAlternatives subscription={subscription} />}
            {step === 3 && <StepCancel subscription={subscription} />}
            {step === 4 && (
              <StepConfirm
                subscription={subscription}
                selectedOutcome={selectedOutcome}
                onSelectOutcome={setSelectedOutcome}
                notes={notes}
                onNotesChange={setNotes}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer nav */}
      <div className="px-6 py-4 border-t border-gray-200 dark:border-slate-700 flex items-center justify-between gap-3 mt-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={step === 1 ? onClose : handleBack}
          leftIcon={step > 1 ? <ChevronLeft className="w-4 h-4" /> : undefined}
        >
          {step === 1 ? "Cancel" : "Back"}
        </Button>

        {step < totalSteps ? (
          <Button
            variant="primary"
            size="sm"
            onClick={handleNext}
            rightIcon={<ChevronRight className="w-4 h-4" />}
          >
            {step === 3 ? "Done, record outcome" : "Continue"}
          </Button>
        ) : (
          <Button
            variant="primary"
            size="sm"
            onClick={handleSubmit}
            isLoading={isSubmitting}
            disabled={!canAdvance}
          >
            Submit
          </Button>
        )}
      </div>
    </div>
  );
}

export default SubscriptionCancellationWizard;
