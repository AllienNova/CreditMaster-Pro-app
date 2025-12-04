"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

const mockUser = {
  id: "1",
  name: "John Doe",
  email: "john@example.com",
  phone: "+1 (555) 123-4567",
  plan: "Premium",
  status: "active",
  creditScore: 720,
  scoreChange: "+45",
  joinedAt: "January 15, 2024",
  lastLogin: "2 hours ago",
  disputes: [
    { id: "D001", type: "Late Payment", status: "resolved", bureau: "Experian", date: "2024-11-15" },
    { id: "D002", type: "Collection Account", status: "pending", bureau: "Equifax", date: "2024-11-20" },
    { id: "D003", type: "Inquiry", status: "in_progress", bureau: "TransUnion", date: "2024-11-25" },
  ],
  payments: [
    { id: "P001", amount: "$79.00", date: "Dec 1, 2024", status: "paid" },
    { id: "P002", amount: "$79.00", date: "Nov 1, 2024", status: "paid" },
    { id: "P003", amount: "$79.00", date: "Oct 1, 2024", status: "paid" },
  ],
};

export default function AdminUserDetailPage() {
  const params = useParams();

  return (
    <div>
      <div className="flex items-center gap-4 mb-8">
        <Link href="/admin/users" className="text-gray-500 hover:text-gray-700">← Back to Users</Link>
      </div>

      {/* User Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-r from-emerald-400 to-blue-500 flex items-center justify-center text-white text-2xl font-bold">
              {mockUser.name.split(" ").map((n) => n[0]).join("")}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{mockUser.name}</h1>
              <p className="text-gray-500">{mockUser.email}</p>
              <p className="text-sm text-gray-400">{mockUser.phone}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition">
              Send Email
            </button>
            <button className="px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition">
              Suspend User
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
          <p className="text-sm text-gray-500">Credit Score</p>
          <p className="text-2xl font-bold text-gray-900">{mockUser.creditScore}</p>
          <p className="text-sm text-emerald-500">{mockUser.scoreChange} points</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
          <p className="text-sm text-gray-500">Plan</p>
          <p className="text-2xl font-bold text-gray-900">{mockUser.plan}</p>
          <p className="text-sm text-gray-400">$79/month</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
          <p className="text-sm text-gray-500">Total Disputes</p>
          <p className="text-2xl font-bold text-gray-900">{mockUser.disputes.length}</p>
          <p className="text-sm text-gray-400">1 resolved</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
          <p className="text-sm text-gray-500">Member Since</p>
          <p className="text-lg font-bold text-gray-900">{mockUser.joinedAt}</p>
          <p className="text-sm text-gray-400">Last login: {mockUser.lastLogin}</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Disputes */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h2 className="font-semibold text-gray-900">Recent Disputes</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {mockUser.disputes.map((dispute) => (
              <div key={dispute.id} className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{dispute.type}</p>
                  <p className="text-sm text-gray-500">{dispute.bureau} • {dispute.date}</p>
                </div>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  dispute.status === "resolved" ? "bg-emerald-100 text-emerald-700" :
                  dispute.status === "pending" ? "bg-yellow-100 text-yellow-700" :
                  "bg-blue-100 text-blue-700"
                }`}>
                  {dispute.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Payments */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h2 className="font-semibold text-gray-900">Payment History</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {mockUser.payments.map((payment) => (
              <div key={payment.id} className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{payment.amount}</p>
                  <p className="text-sm text-gray-500">{payment.date}</p>
                </div>
                <span className="px-2 py-1 text-xs rounded-full bg-emerald-100 text-emerald-700">
                  {payment.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

