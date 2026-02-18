"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

interface BillingPlan {
  id: string;
  name: string;
  price: number;
  interval: "month" | "year";
  features: string[];
}

interface SubscriptionSummary {
  planId: string;
  status: "active" | "trialing" | "canceled" | "past_due";
  cancelAtPeriodEnd: boolean;
}

interface BillingResponse {
  plans: BillingPlan[];
  subscription: SubscriptionSummary;
}

export default function SubscriptionManagement() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [data, setData] = useState<BillingResponse | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [mutating, setMutating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth/login");
      return;
    }

    if (user) {
      void fetchSubscription();
    }
  }, [authLoading, user, router]);

  const fetchSubscription = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/payment/billing");
      if (!response.ok) {
        throw new Error("Unable to load plans");
      }
      const payload: BillingResponse = await response.json();
      setData(payload);
      setSelectedPlan(payload.subscription.planId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load plans");
    } finally {
      setLoading(false);
    }
  };

  const handlePlanChange = async (planId: string) => {
    try {
      setMutating(true);
      setError(null);
      setMessage(null);
      const response = await fetch("/api/payment/billing/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });
      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.error || "Failed to update subscription");
      }
      setSelectedPlan(planId);
      setMessage("Plan updated successfully.");
      await fetchSubscription();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update subscription",
      );
    } finally {
      setMutating(false);
    }
  };

  const handleCancellation = async () => {
    try {
      setMutating(true);
      setError(null);
      setMessage(null);
      const response = await fetch("/api/payment/billing/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cancelSubscription: true }),
      });
      if (!response.ok) {
        throw new Error("Unable to cancel subscription");
      }
      setMessage("Subscription will end at the close of this billing period.");
      await fetchSubscription();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to cancel subscription",
      );
    } finally {
      setMutating(false);
    }
  };

  if (authLoading || loading || !data) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-gray-600 dark:text-slate-300">
          Loading subscription manager…
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <header className="space-y-2">
          <p className="text-sm text-gray-500 dark:text-slate-400 uppercase tracking-wide">
            Billing
          </p>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Manage subscription
          </h1>
          <p className="text-gray-600 dark:text-slate-300">
            Choose the plan that best matches your workload. Changes take effect
            immediately and sync to Stripe.
          </p>
        </header>

        {message && (
          <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-green-700">
            {message}
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">
            {error}
          </div>
        )}

        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {data.plans.map((plan) => {
            const isActive = plan.id === selectedPlan;
            return (
              <div
                key={plan.id}
                className={`rounded-xl border ${
                  isActive
                    ? "border-blue-500 shadow-lg"
                    : "border-gray-200 dark:border-slate-700 shadow"
                } bg-white dark:bg-slate-800 p-6 flex flex-col`}
              >
                <div className="space-y-2">
                  <p className="text-sm uppercase text-gray-500 dark:text-slate-400 tracking-wide">
                    {plan.name}
                  </p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">
                    ${plan.price}
                    <span className="text-base font-normal text-gray-500 dark:text-slate-400">
                      /{plan.interval}
                    </span>
                  </p>
                  <ul className="space-y-2 text-sm text-gray-700 dark:text-slate-200 mt-4">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2">
                        <span className="text-green-600"></span>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="mt-6">
                  <button
                    type="button"
                    onClick={() => handlePlanChange(plan.id)}
                    disabled={mutating || isActive}
                    className={`w-full px-4 py-2 rounded-lg ${
                      isActive
                        ? "bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400 cursor-not-allowed"
                        : "bg-blue-600 text-white hover:bg-blue-700"
                    } transition-colors`}
                  >
                    {isActive ? "Current plan" : "Switch to this plan"}
                  </button>
                </div>
              </div>
            );
          })}
        </section>

        <section className="bg-white dark:bg-slate-800 rounded-xl shadow p-6 space-y-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Need to pause?
            </h2>
            <p className="text-gray-600 dark:text-slate-300">
              Canceling will keep your access until the end of the billing
              cycle. You can reactivate anytime.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={handleCancellation}
              disabled={mutating}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700 dark:bg-slate-900 transition-colors"
            >
              Cancel at renewal
            </button>
            <button
              type="button"
              onClick={() => router.push("/billing")}
              className="px-4 py-2 rounded-lg bg-gray-900 text-white hover:bg-gray-800 transition-colors"
            >
              Back to billing
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
