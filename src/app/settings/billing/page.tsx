"use client";

import { useState } from "react";
import Link from "next/link";

export default function BillingSettingsPage() {
  const [currentPlan] = useState({
    name: "Premium",
    price: "$79/month",
    nextBilling: "January 15, 2025",
    status: "active",
  });

  const [paymentMethod] = useState({
    type: "card",
    last4: "4242",
    brand: "Visa",
    expiry: "12/26",
  });

  const invoices = [
    { id: "INV-001", date: "Dec 15, 2024", amount: "$79.00", status: "Paid" },
    { id: "INV-002", date: "Nov 15, 2024", amount: "$79.00", status: "Paid" },
    { id: "INV-003", date: "Oct 15, 2024", amount: "$79.00", status: "Paid" },
  ];

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Billing & Subscription</h2>
      <p className="text-gray-600 mb-8">Manage your subscription and payment methods</p>

      {/* Current Plan */}
      <div className="bg-gradient-to-r from-emerald-500 to-blue-600 rounded-xl p-6 text-white mb-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-white/80">Current Plan</p>
            <p className="text-2xl font-bold">{currentPlan.name}</p>
            <p className="text-white/80">{currentPlan.price}</p>
          </div>
          <div className="text-right">
            <span className="inline-block px-3 py-1 bg-white/20 rounded-full text-sm">Active</span>
            <p className="text-sm text-white/80 mt-2">Next billing: {currentPlan.nextBilling}</p>
          </div>
        </div>
        <div className="mt-4 flex gap-3">
          <Link href="/pricing" className="px-4 py-2 bg-white text-emerald-600 rounded-lg text-sm font-medium hover:bg-gray-100 transition">
            Upgrade Plan
          </Link>
          <button className="px-4 py-2 bg-white/20 text-white rounded-lg text-sm font-medium hover:bg-white/30 transition">
            Cancel Subscription
          </button>
        </div>
      </div>

      {/* Payment Method */}
      <div className="mb-8">
        <h3 className="font-semibold text-gray-900 mb-4">Payment Method</h3>
        <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
          <div className="flex items-center gap-4">
            <div className="w-12 h-8 bg-blue-600 rounded flex items-center justify-center text-white text-xs font-bold">
              {paymentMethod.brand}
            </div>
            <div>
              <p className="font-medium text-gray-900">•••• •••• •••• {paymentMethod.last4}</p>
              <p className="text-sm text-gray-500">Expires {paymentMethod.expiry}</p>
            </div>
          </div>
          <button className="text-emerald-500 hover:text-emerald-600 font-medium text-sm">
            Update
          </button>
        </div>
        <button className="mt-3 text-sm text-gray-500 hover:text-gray-700">
          + Add backup payment method
        </button>
      </div>

      {/* Billing History */}
      <div>
        <h3 className="font-semibold text-gray-900 mb-4">Billing History</h3>
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Invoice</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Date</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Amount</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Status</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {invoices.map((invoice) => (
                <tr key={invoice.id}>
                  <td className="px-4 py-3 text-sm text-gray-900">{invoice.id}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{invoice.date}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{invoice.amount}</td>
                  <td className="px-4 py-3">
                    <span className="inline-block px-2 py-1 bg-emerald-100 text-emerald-700 text-xs rounded-full">
                      {invoice.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button className="text-emerald-500 hover:text-emerald-600 text-sm">Download</button>
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

