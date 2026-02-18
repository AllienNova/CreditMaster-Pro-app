"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

interface InvoiceSummary {
  id: string;
  amount: number;
  status: "paid" | "open" | "void" | "uncollectible";
  created: string;
  pdfUrl?: string;
}

interface BillingResponse {
  invoices: InvoiceSummary[];
}

export default function InvoiceHistoryPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [invoices, setInvoices] = useState<InvoiceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth/login");
      return;
    }

    if (user) {
      void fetchInvoices();
    }
  }, [authLoading, user, router]);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/payment/billing");
      if (!response.ok) {
        throw new Error("Unable to load invoices");
      }
      const data: BillingResponse = await response.json();
      setInvoices(data.invoices);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load invoices");
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center text-gray-600 dark:text-slate-300">
          Loading invoice history…
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="bg-white dark:bg-slate-800 p-8 rounded-lg shadow text-center space-y-4 max-w-md">
          <p className="text-red-600">{error}</p>
          <button
            type="button"
            onClick={fetchInvoices}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 dark:text-slate-400 uppercase tracking-wide">
              Billing
            </p>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Invoice history
            </h1>
          </div>
          <button
            type="button"
            onClick={() => router.push("/billing")}
            className="px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700 dark:bg-slate-900"
          >
            Back to billing
          </button>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-100 dark:divide-slate-700 text-sm text-gray-700 dark:text-slate-200">
            <thead className="bg-gray-50 dark:bg-slate-900 text-xs font-semibold uppercase text-gray-500 dark:text-slate-400">
              <tr>
                <th className="px-6 py-3 text-left">Invoice</th>
                <th className="px-6 py-3 text-left">Date</th>
                <th className="px-6 py-3 text-left">Amount</th>
                <th className="px-6 py-3 text-left">Status</th>
                <th className="px-6 py-3 text-right">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
              {invoices.map((invoice) => (
                <tr key={invoice.id}>
                  <td className="px-6 py-4 font-semibold text-gray-900 dark:text-white">
                    {invoice.id}
                  </td>
                  <td className="px-6 py-4">
                    {new Date(invoice.created).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </td>
                  <td className="px-6 py-4">${invoice.amount.toFixed(2)}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        invoice.status === "paid"
                          ? "bg-green-50 text-green-700"
                          : invoice.status === "open"
                            ? "bg-yellow-50 text-yellow-700"
                            : "bg-red-50 text-red-600"
                      }`}
                    >
                      {invoice.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
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
                      <span className="text-gray-400 dark:text-slate-500">
                        N/A
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
