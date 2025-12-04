'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

interface BillingPlan {
  id: string;
  name: string;
  price: number;
  interval: 'month' | 'year';
  features: string[];
}

interface SubscriptionSummary {
  planId: string;
  status: 'active' | 'trialing' | 'canceled' | 'past_due';
  cancelAtPeriodEnd: boolean;
  currentPeriodStart: string;
  currentPeriodEnd: string;
}

interface PaymentMethod {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  isDefault: boolean;
}

interface InvoiceSummary {
  id: string;
  amount: number;
  status: 'paid' | 'open' | 'void' | 'uncollectible';
  created: string;
  pdfUrl?: string;
}

interface BillingResponse {
  plans: BillingPlan[];
  subscription: SubscriptionSummary;
  paymentMethods: PaymentMethod[];
  invoices: InvoiceSummary[];
}

export default function BillingDashboard() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [data, setData] = useState<BillingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (user) {
      void fetchBillingData();
    }
  }, [user, authLoading, router]);

  const fetchBillingData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/payment/billing');
      if (!response.ok) {
        throw new Error('Unable to load billing data');
      }
      const payload: BillingResponse = await response.json();
      setData(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load billing data');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-600">Loading billing dashboard…</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white shadow rounded-lg p-8 max-w-md text-center">
          <p className="text-red-600 font-semibold mb-4">{error ?? 'Unknown error'}</p>
          <button
            type="button"
            onClick={fetchBillingData}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const activePlan = data.plans.find((plan) => plan.id === data.subscription.planId);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <header className="space-y-2">
          <p className="text-sm text-gray-500 uppercase tracking-wide">Billing</p>
          <h1 className="text-3xl font-bold text-gray-900">Subscriptions & invoices</h1>
          <p className="text-gray-600">
            Manage your plan, payment methods, and invoice history. Changes propagate to the Stripe
            workspace instantly.
          </p>
        </header>

        {/* Current plan */}
        <section className="bg-white rounded-xl shadow p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p className="text-sm uppercase text-gray-500 tracking-wide">Current plan</p>
              <h2 className="text-2xl font-semibold text-gray-900">
                {activePlan?.name ?? 'Custom plan'}
              </h2>
              <p className="text-gray-600">
                {activePlan ? `$${activePlan.price}/${activePlan.interval}` : 'Contact support'}
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Status:{' '}
                <span className="font-medium capitalize">{data.subscription.status}</span> · Next
                renewal {new Date(data.subscription.currentPeriodEnd).toLocaleDateString()}
              </p>
              {data.subscription.cancelAtPeriodEnd && (
                <p className="text-sm text-red-600 mt-1">
                  Auto-renewal disabled — you’ll retain access until the end of this cycle.
                </p>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/billing/subscription"
                className="px-5 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 text-center"
              >
                Manage subscription
              </Link>
              <Link
                href="/pricing"
                className="px-5 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-center"
              >
                Compare plans
              </Link>
            </div>
          </div>
          {activePlan && (
            <ul className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-gray-700">
              {activePlan.features.map((feature) => (
                <li key={feature} className="flex items-center gap-2">
                  <span className="text-green-600">✔</span>
                  {feature}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Payment methods */}
        <section className="bg-white rounded-xl shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm uppercase text-gray-500 tracking-wide">Payment methods</p>
              <h2 className="text-xl font-semibold text-gray-900">Saved cards</h2>
            </div>
            <button
              type="button"
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Update card
            </button>
          </div>
          <div className="space-y-3">
            {data.paymentMethods.map((method) => (
              <div
                key={method.id}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between border border-gray-200 rounded-lg p-4"
              >
                <div>
                  <p className="text-gray-900 font-medium capitalize">{method.brand} ending in {method.last4}</p>
                  <p className="text-sm text-gray-500">
                    Expires {method.expMonth}/{method.expYear}
                  </p>
                </div>
                {method.isDefault && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-600 mt-2 sm:mt-0">
                    Default
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Invoice history */}
        <section className="bg-white rounded-xl shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm uppercase text-gray-500 tracking-wide">Invoices</p>
              <h2 className="text-xl font-semibold text-gray-900">Recent billing activity</h2>
            </div>
            <Link href="/billing/invoices" className="text-sm text-blue-600 hover:text-blue-700">
              View full history →
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                <tr>
                  <th className="py-3">Invoice</th>
                  <th className="py-3">Date</th>
                  <th className="py-3">Amount</th>
                  <th className="py-3">Status</th>
                  <th className="py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
                {data.invoices.slice(0, 5).map((invoice) => (
                  <tr key={invoice.id}>
                    <td className="py-4 font-medium text-gray-900">{invoice.id}</td>
                    <td className="py-4">{new Date(invoice.created).toLocaleDateString()}</td>
                    <td className="py-4">${invoice.amount.toFixed(2)}</td>
                    <td className="py-4">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          invoice.status === 'paid'
                            ? 'bg-green-50 text-green-700'
                            : invoice.status === 'open'
                              ? 'bg-yellow-50 text-yellow-700'
                              : 'bg-red-50 text-red-600'
                        }`}
                      >
                        {invoice.status}
                      </span>
                    </td>
                    <td className="py-4 text-right">
                      {invoice.pdfUrl ? (
                        <a
                          href={invoice.pdfUrl}
                          className="text-blue-600 hover:text-blue-700"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Download PDF
                        </a>
                      ) : (
                        <span className="text-gray-400">N/A</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}

