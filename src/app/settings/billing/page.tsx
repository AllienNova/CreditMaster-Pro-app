"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/utils";

interface BillingPaymentMethod {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  isDefault: boolean;
}

interface BillingInvoice {
  id: string;
  amount: number;
  status: "paid" | "open" | "void" | "uncollectible";
  created: string;
  dueDate?: string;
  pdfUrl?: string;
}

interface BillingSubscriptionInfo {
  planId: string;
  status: string;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd: boolean;
}

interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  interval: "month" | "year";
}

interface BillingApiResponse {
  plans: SubscriptionPlan[];
  subscription: BillingSubscriptionInfo;
  paymentMethods: BillingPaymentMethod[];
  invoices: BillingInvoice[];
}

type BillingState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: BillingApiResponse };

function capitalize(value: string): string {
  return value.length > 0 ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}

function formatPlanPrice(plan: SubscriptionPlan | undefined): string {
  if (!plan || plan.price === 0) return "Free";
  return `${formatCurrency(plan.price)}/${plan.interval}`;
}

/**
 * Fetches real billing data via /api/payment/billing (backed by
 * getBillingData — FND-016/FND-017). No fabricated card or invoice data:
 * the caller renders explicit empty states when Stripe has nothing to return.
 */
export default function BillingSettingsPage() {
  const [state, setState] = useState<BillingState>({ status: "loading" });

  // `cancelled` guards every setState after an await so an in-flight request
  // from an unmounted instance (e.g. rapid navigation away from /settings/billing)
  // never applies a stale result.
  useEffect(() => {
    let cancelled = false;

    async function loadBilling() {
      setState({ status: "loading" });

      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled) return;

      if (!session) {
        setState({
          status: "error",
          message: "Sign in to view your billing information.",
        });
        return;
      }

      try {
        const res = await fetch("/api/payment/billing", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (cancelled) return;

        if (!res.ok) {
          throw new Error(`Failed to load billing information (${res.status})`);
        }

        const data = (await res.json()) as BillingApiResponse;
        if (cancelled) return;
        setState({ status: "ready", data });
      } catch (error) {
        if (cancelled) return;
        setState({
          status: "error",
          message:
            error instanceof Error
              ? error.message
              : "Failed to load billing information.",
        });
      }
    }

    loadBilling();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
        Billing & Subscription
      </h2>
      <p className="text-gray-600 dark:text-slate-300 mb-8">
        Manage your subscription and payment methods
      </p>

      {state.status === "loading" && (
        <p className="text-gray-500 dark:text-slate-400">
          Loading billing information...
        </p>
      )}

      {state.status === "error" && (
        <div className="p-4 border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/20 rounded-lg text-red-700 dark:text-red-300 text-sm">
          {state.message}
        </div>
      )}

      {state.status === "ready" && <BillingContent data={state.data} />}
    </div>
  );
}

function BillingContent({ data }: { data: BillingApiResponse }) {
  const { plans, subscription, paymentMethods, invoices } = data;
  const plan = plans.find((p) => p.id === subscription.planId);
  const defaultPaymentMethod =
    paymentMethods.find((pm) => pm.isDefault) ?? paymentMethods[0];

  return (
    <>
      {/* Current Plan */}
      <div className="bg-gradient-to-r from-emerald-500 to-blue-600 rounded-xl p-6 text-white mb-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-white/80">Current Plan</p>
            <p className="text-2xl font-bold">
              {plan?.name ?? capitalize(subscription.planId)}
            </p>
            <p className="text-white/80">{formatPlanPrice(plan)}</p>
          </div>
          <div className="text-right">
            <span className="inline-block px-3 py-1 bg-white dark:bg-slate-800/20 rounded-full text-sm">
              {capitalize(subscription.status)}
            </span>
            {subscription.currentPeriodEnd && (
              <p className="text-sm text-white/80 mt-2">
                {subscription.cancelAtPeriodEnd ? "Cancels" : "Next billing"}:{" "}
                {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>
        <div className="mt-4 flex gap-3">
          <Link
            href="/pricing"
            className="px-4 py-2 bg-white text-emerald-600 rounded-lg text-sm font-medium hover:bg-gray-100 dark:hover:bg-slate-700 dark:bg-slate-800 transition"
          >
            Upgrade Plan
          </Link>
          <button className="px-4 py-2 bg-white text-white rounded-lg text-sm font-medium hover:bg-white dark:bg-slate-800/30 transition">
            Cancel Subscription
          </button>
        </div>
      </div>

      {/* Payment Method */}
      <div className="mb-8">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
          Payment Method
        </h3>
        {defaultPaymentMethod ? (
          <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-slate-700 rounded-lg">
            <div className="flex items-center gap-4">
              <div className="w-12 h-8 bg-blue-600 rounded flex items-center justify-center text-white text-xs font-bold">
                {capitalize(defaultPaymentMethod.brand)}
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  •••• •••• •••• {defaultPaymentMethod.last4}
                </p>
                <p className="text-sm text-gray-500 dark:text-slate-400">
                  Expires{" "}
                  {String(defaultPaymentMethod.expMonth).padStart(2, "0")}/
                  {String(defaultPaymentMethod.expYear).slice(-2)}
                </p>
              </div>
            </div>
            <button className="text-emerald-500 hover:text-emerald-600 font-medium text-sm">
              Update
            </button>
          </div>
        ) : (
          <div className="p-4 border border-dashed border-gray-300 dark:border-slate-600 rounded-lg text-sm text-gray-500 dark:text-slate-400">
            No payment method on file.
          </div>
        )}
        <button className="mt-3 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-slate-200 dark:text-slate-200">
          {defaultPaymentMethod
            ? "+ Add backup payment method"
            : "+ Add payment method"}
        </button>
      </div>

      {/* Billing History */}
      <div>
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
          Billing History
        </h3>
        {invoices.length === 0 ? (
          <div className="p-4 border border-dashed border-gray-300 dark:border-slate-600 rounded-lg text-sm text-gray-500 dark:text-slate-400">
            No billing history yet.
          </div>
        ) : (
          <div className="border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-slate-900">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-slate-400">
                    Invoice
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-slate-400">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-slate-400">
                    Amount
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-slate-400">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-500 dark:text-slate-400">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                {invoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                      {invoice.id}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-slate-400">
                      {new Date(invoice.created).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                      {formatCurrency(invoice.amount)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-block px-2 py-1 bg-emerald-100 text-emerald-700 text-xs rounded-full">
                        {capitalize(invoice.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {invoice.pdfUrl ? (
                        <a
                          href={invoice.pdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-emerald-500 hover:text-emerald-600 text-sm"
                        >
                          Download
                        </a>
                      ) : (
                        <span className="text-gray-300 dark:text-slate-600 text-sm">
                          —
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
