"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

interface Dispute {
  id: string;
  bureau: string;
  status: string;
  item_type: string;
  item_description: string;
  created_at: string;
  outcome: string | null;
}

export default function UserDisputesPage() {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");

  useEffect(() => {
    const fetchDisputes = async () => {
      try {
        const response = await fetch("/api/disputes");
        if (response.ok) {
          const data = await response.json();
          setDisputes(data.disputes || []);
        } else {
          // Mock data
          setDisputes([
            {
              id: "1",
              bureau: "experian",
              status: "resolved",
              item_type: "Late Payment",
              item_description: "Capital One late payment March 2023",
              created_at: "2024-10-15T10:00:00Z",
              outcome: "removed",
            },
            {
              id: "2",
              bureau: "equifax",
              status: "under_review",
              item_type: "Collection",
              item_description: "Medical collection ABC Collections",
              created_at: "2024-11-01T09:15:00Z",
              outcome: null,
            },
            {
              id: "3",
              bureau: "transunion",
              status: "sent",
              item_type: "Inquiry",
              item_description: "Unauthorized hard inquiry XYZ Lender",
              created_at: "2024-11-10T16:45:00Z",
              outcome: null,
            },
            {
              id: "4",
              bureau: "experian",
              status: "draft",
              item_type: "Balance Error",
              item_description: "Incorrect balance on Chase card",
              created_at: "2024-11-15T11:20:00Z",
              outcome: null,
            },
          ]);
        }
      } catch {
        setDisputes([
          {
            id: "1",
            bureau: "experian",
            status: "resolved",
            item_type: "Late Payment",
            item_description: "Capital One late payment March 2023",
            created_at: "2024-10-15T10:00:00Z",
            outcome: "removed",
          },
          {
            id: "2",
            bureau: "equifax",
            status: "under_review",
            item_type: "Collection",
            item_description: "Medical collection ABC Collections",
            created_at: "2024-11-01T09:15:00Z",
            outcome: null,
          },
        ]);
      } finally {
        setLoading(false);
      }
    };
    fetchDisputes();
  }, []);

  const filteredDisputes = disputes.filter(
    (d) => filterStatus === "all" || d.status === filterStatus,
  );

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      draft: "bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-slate-100",
      sent: "bg-blue-100 text-blue-800",
      under_review: "bg-yellow-100 text-yellow-800",
      resolved: "bg-green-100 text-green-800",
      rejected: "bg-red-100 text-red-800",
    };
    return (
      colors[status] ||
      "bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-slate-100"
    );
  };

  const getBureauColor = (bureau: string) => {
    const colors: Record<string, string> = {
      experian: "text-blue-600",
      equifax: "text-red-600",
      transunion: "text-green-600",
    };
    return colors[bureau] || "text-gray-600 dark:text-slate-300";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-50 to-blue-50 p-8">
        <div className="animate-pulse space-y-4 max-w-4xl mx-auto">
          <div className="h-8 bg-gray-200 dark:bg-slate-700 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 dark:bg-slate-700 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-50 to-blue-50">
      <header className="bg-white dark:bg-slate-800/80 backdrop-blur-sm shadow-sm border-b border-white/20 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link
                href="/dashboard"
                className="text-gray-600 hover:text-gray-900 dark:text-white dark:hover:text-white"
              >
                ← Back
              </Link>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                My Disputes
              </h1>
            </div>
            <Link
              href="/credit-builder"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              + New Dispute
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          {["all", "draft", "sent", "under_review", "resolved"].map(
            (status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`p-4 rounded-lg text-center transition-all ${filterStatus === status ? "bg-blue-600 text-white" : "bg-white text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-slate-700 dark:bg-slate-900"}`}
              >
                <p className="text-2xl font-bold">
                  {status === "all"
                    ? disputes.length
                    : disputes.filter((d) => d.status === status).length}
                </p>
                <p className="text-sm capitalize">
                  {status === "all" ? "Total" : status.replace("_", " ")}
                </p>
              </button>
            ),
          )}
        </div>

        {/* Disputes List */}
        <div className="space-y-4">
          {filteredDisputes.map((dispute) => (
            <div
              key={dispute.id}
              className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span
                      className={`font-semibold capitalize ${getBureauColor(dispute.bureau)}`}
                    >
                      {dispute.bureau}
                    </span>
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(dispute.status)}`}
                    >
                      {dispute.status.replace("_", " ")}
                    </span>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    {dispute.item_type}
                  </h3>
                  <p className="text-gray-600 dark:text-slate-300 text-sm mt-1">
                    {dispute.item_description}
                  </p>
                  <p className="text-gray-400 dark:text-slate-500 text-xs mt-2">
                    Created: {new Date(dispute.created_at).toLocaleDateString()}
                    {dispute.outcome && (
                      <span className="ml-4">
                        Outcome:{" "}
                        <span className="text-green-600 font-medium">
                          {dispute.outcome}
                        </span>
                      </span>
                    )}
                  </p>
                </div>
                <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                  View Details →
                </button>
              </div>
            </div>
          ))}
          {filteredDisputes.length === 0 && (
            <div className="text-center py-12 text-gray-500 dark:text-slate-400">
              <p className="text-lg">No disputes found</p>
              <Link
                href="/credit-builder"
                className="text-blue-600 hover:underline mt-2 inline-block"
              >
                Start a new dispute →
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
