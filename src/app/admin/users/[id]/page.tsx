/**
 * Admin — one member's detail.
 *
 * WHAT THIS PAGE SHOWED FOR EVERY USER AN ADMIN CLICKED.
 *
 * `mockUser` was John Doe: john@example.com, +1 (555) 123-4567, Premium,
 * credit score 720 (+45), member since January 2024, last login 2 hours ago,
 * three disputes across three bureaus, three $79 payments. `useParams()` was
 * called and its result never read, so the ID in the URL changed nothing. An
 * admin opening any member's record met the same invented person.
 *
 * That is worse than a wrong number. Support decisions get made here — and the
 * page carried "Send Email" and "Suspend User" buttons. Both had no onClick,
 * so nothing happened, which is the only reason this did not end with someone
 * suspended on the strength of a stranger's history.
 *
 * GET /api/admin/users/[id] did not exist. This commit adds it, so the screen
 * now shows the member whose ID is in the URL.
 *
 * WHAT IS GONE AND NOT REPLACED.
 *
 *  - The credit score and its "+45 points". Whether support staff may read a
 *    member's score is the owner's privacy decision, so the route does not
 *    return it. A score is also a point, not a delta; "+45" needed a history
 *    nobody consulted.
 *  - Send Email and Suspend User. Neither did anything. A button that looks
 *    like it suspends an account and does not is worse than no button, and
 *    building suspension for real is a product decision with its own
 *    notification, appeal and audit requirements.
 *  - The phone number. `profiles` has no phone column.
 *
 * ON EMPTY VERSUS UNKNOWN. The route reports which sections it could not read.
 * A member with no disputes and a member whose dispute query failed look
 * identical in a list; they are not the same, and this page says which it is.
 */

"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState, useEffect, useCallback } from "react";

interface AdminUser {
  id: string;
  full_name: string | null;
  email: string | null;
  subscription_tier: string | null;
  subscription_status: string | null;
  stripe_customer_id: string | null;
  created_at: string | null;
  last_sign_in_at: string | null;
}

interface AdminUserSubscription {
  id: string;
  status: string;
  stripe_price_id: string | null;
  plan_name: string | null;
  monthly_list_price: number | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean | null;
}

interface AdminUserDispute {
  id: string;
  bureau: string | null;
  status: string | null;
  item_type: string | null;
  outcome: string | null;
  created_at: string | null;
}

interface AdminUserPayment {
  id: string;
  amount: number;
  currency: string;
  status: string;
  paid_at: string | null;
}

interface Payload {
  user: AdminUser;
  subscriptions: AdminUserSubscription[];
  disputes: AdminUserDispute[];
  payments: AdminUserPayment[];
  unavailable: string[];
}

const STATUS_CLASSES: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700",
  resolved: "bg-emerald-100 text-emerald-700",
  paid: "bg-emerald-100 text-emerald-700",
  succeeded: "bg-emerald-100 text-emerald-700",
  trialing: "bg-blue-100 text-blue-700",
  under_review: "bg-blue-100 text-blue-700",
  pending: "bg-yellow-100 text-yellow-700",
  draft: "bg-gray-100 text-gray-700",
  past_due: "bg-amber-100 text-amber-700",
  canceled: "bg-red-100 text-red-700",
  rejected: "bg-red-100 text-red-700",
  failed: "bg-red-100 text-red-700",
};

function badgeClass(status: string | null): string {
  return STATUS_CLASSES[status ?? ""] ?? "bg-gray-100 text-gray-700";
}

function formatDate(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
      });
}

function money(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: (currency || "usd").toUpperCase(),
  }).format(amount);
}

function initials(name: string | null, email: string | null): string {
  const source = (name ?? email ?? "").trim();
  if (!source) return "?";
  const parts = source.split(/[\s@.]+/).filter(Boolean);
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

/** Renders a section's body, or says the section could not be read. */
function Section({
  title,
  unavailable,
  isEmpty,
  emptyText,
  children,
}: {
  title: string;
  unavailable: boolean;
  isEmpty: boolean;
  emptyText: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700">
      <div className="p-4 border-b border-gray-200 dark:border-slate-700">
        <h2 className="font-semibold text-gray-900 dark:text-white">{title}</h2>
      </div>
      {unavailable ? (
        <p className="p-4 text-sm text-amber-700 dark:text-amber-400">
          We could not load this section. That is not the same as there being
          none — try again in a moment.
        </p>
      ) : isEmpty ? (
        <p className="p-4 text-sm text-gray-600 dark:text-slate-300">
          {emptyText}
        </p>
      ) : (
        children
      )}
    </div>
  );
}

export default function AdminUserDetailPage() {
  const params = useParams();
  const id = Array.isArray(params?.id) ? params.id[0] : params?.id;

  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(id)}`);
      const json = await res.json().catch(() => null);
      if (res.status === 404) {
        setData(null);
        setError("No user with that ID.");
      } else if (!res.ok) {
        setData(null);
        setError(
          "We could not load this member. Nothing is filled in for them — try again in a moment.",
        );
      } else {
        setData(json as Payload);
      }
    } catch {
      setData(null);
      setError("We could not reach the admin service.");
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const unavailable = new Set(data?.unavailable ?? []);

  return (
    <div>
      <div className="flex items-center gap-4 mb-8">
        <Link
          href="/admin/users"
          className="text-gray-500 hover:text-gray-700 dark:hover:text-slate-200 dark:text-slate-200"
        >
          ← Back to Users
        </Link>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-6">
          <div className="h-28 bg-gray-200 dark:bg-slate-700 rounded-xl" />
          <div className="h-40 bg-gray-200 dark:bg-slate-700 rounded-xl" />
        </div>
      ) : error || !data ? (
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-amber-200 dark:border-amber-900/50">
          <p className="font-medium text-gray-900 dark:text-white mb-1">
            This member could not be shown
          </p>
          <p className="text-sm text-gray-600 dark:text-slate-300">
            {error ?? "No data was returned."}
          </p>
        </div>
      ) : (
        <>
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6 mb-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-r from-emerald-400 to-blue-500 flex items-center justify-center text-white text-2xl font-bold">
                {initials(data.user.full_name, data.user.email)}
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white truncate">
                  {data.user.full_name || "No name on file"}
                </h1>
                <p className="text-gray-500 dark:text-slate-400 truncate">
                  {data.user.email || "No email on file"}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-slate-700">
              <p className="text-sm text-gray-500 dark:text-slate-400">Tier</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white capitalize">
                {data.user.subscription_tier || "None recorded"}
              </p>
              {data.user.subscription_status && (
                <p className="text-sm text-gray-500 dark:text-slate-400 capitalize">
                  {data.user.subscription_status.replace(/_/g, " ")}
                </p>
              )}
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-slate-700">
              <p className="text-sm text-gray-500 dark:text-slate-400">
                Member since
              </p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {formatDate(data.user.created_at) || "Unknown"}
              </p>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-slate-700">
              <p className="text-sm text-gray-500 dark:text-slate-400">
                Last sign-in
              </p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {unavailable.has("auth")
                  ? "Could not be read"
                  : formatDate(data.user.last_sign_in_at) || "Never signed in"}
              </p>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <Section
              title="Subscriptions"
              unavailable={unavailable.has("subscriptions")}
              isEmpty={data.subscriptions.length === 0}
              emptyText="No subscription rows for this member."
            >
              <div className="divide-y divide-gray-100 dark:divide-slate-700">
                {data.subscriptions.map((sub) => (
                  <div
                    key={sub.id}
                    className="p-4 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white truncate">
                        {sub.plan_name ??
                          sub.stripe_price_id ??
                          "Unknown plan"}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-slate-400">
                        {sub.monthly_list_price === null
                          ? "Price ID not in the plan catalogue"
                          : `${money(sub.monthly_list_price, "usd")}/month at list price`}
                        {sub.current_period_end &&
                          ` • renews ${formatDate(sub.current_period_end)}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {sub.cancel_at_period_end && (
                        <span className="px-2 py-1 text-xs rounded-full bg-amber-100 text-amber-700">
                          cancels at period end
                        </span>
                      )}
                      <span
                        className={`px-2 py-1 text-xs rounded-full capitalize ${badgeClass(sub.status)}`}
                      >
                        {(sub.status || "unknown").replace(/_/g, " ")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </Section>

            <Section
              title="Payments"
              unavailable={unavailable.has("payments")}
              isEmpty={data.payments.length === 0}
              emptyText="No payments recorded for this member."
            >
              <div className="divide-y divide-gray-100 dark:divide-slate-700">
                {data.payments.map((payment) => (
                  <div
                    key={payment.id}
                    className="p-4 flex items-center justify-between gap-3"
                  >
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {money(payment.amount, payment.currency)}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-slate-400">
                        {formatDate(payment.paid_at)}
                      </p>
                    </div>
                    <span
                      className={`px-2 py-1 text-xs rounded-full capitalize ${badgeClass(payment.status)}`}
                    >
                      {payment.status || "unknown"}
                    </span>
                  </div>
                ))}
              </div>
            </Section>

            <Section
              title="Recent disputes"
              unavailable={unavailable.has("disputes")}
              isEmpty={data.disputes.length === 0}
              emptyText="No disputes filed by this member."
            >
              <div className="divide-y divide-gray-100 dark:divide-slate-700">
                {data.disputes.map((dispute) => (
                  <div
                    key={dispute.id}
                    className="p-4 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white truncate">
                        {dispute.item_type || "Dispute"}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-slate-400 capitalize">
                        {dispute.bureau ?? "Bureau not recorded"}
                        {formatDate(dispute.created_at) &&
                          ` • ${formatDate(dispute.created_at)}`}
                      </p>
                    </div>
                    <span
                      className={`px-2 py-1 text-xs rounded-full capitalize ${badgeClass(dispute.status)}`}
                    >
                      {(dispute.status || "unknown").replace(/_/g, " ")}
                    </span>
                  </div>
                ))}
              </div>
            </Section>
          </div>

          <p className="mt-6 text-sm text-gray-500 dark:text-slate-400">
            Credit score is not shown here: whether support may read a
            member&apos;s score is a privacy decision, not a default. Dispute
            letters are not shown either — the metadata above answers what is
            happening without opening the member&apos;s own account of their
            finances.
          </p>
        </>
      )}
    </div>
  );
}
