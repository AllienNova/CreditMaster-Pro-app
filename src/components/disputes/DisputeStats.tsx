"use client";

import { useState, useEffect, useCallback } from "react";
import { DisputeStats as DisputeStatsType } from "@/lib/disputes/dispute-service";
import { useAuth } from "@/hooks/useAuth";
import { Icon } from "@/components/ui/Icon";

export default function DisputeStats() {
  const { user, loading: authLoading } = useAuth();
  const [stats, setStats] = useState<DisputeStatsType | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    if (!user) return;

    try {
      const response = await fetch(`/api/disputes`);

      if (!response.ok) {
        throw new Error("Failed to fetch stats");
      }

      const data = await response.json();
      setStats(data.stats);
    } catch (_error) {
      // Error logged
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading && user) {
      void fetchStats();
    }
  }, [authLoading, user, fetchStats]);

  if (loading || !stats) {
    return null; // Skeleton is shown by parent
  }

  const statCards = [
    {
      label: "Total Disputes",
      value: stats.total,
      icon: "document-text",
      color: "bg-blue-50 text-blue-700",
    },
    {
      label: "Active Disputes",
      value: stats.active,
      icon: "clock",
      color: "bg-yellow-50 text-yellow-700",
    },
    {
      label: "Resolved",
      value: stats.resolved,
      icon: "check",
      color: "bg-green-50 text-green-700",
    },
    {
      label: "Success Rate",
      value: `${Math.round(stats.successRate)}%`,
      icon: "chart-bar",
      color: "bg-blue-50 text-blue-700",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
      {statCards.map((stat, index) => (
        <div key={index} className={`rounded-lg shadow p-6 ${stat.color}`}>
          <div className="flex items-center justify-between mb-2">
            <Icon name={stat.icon} className="text-2xl inline-block" />
            <span className="text-3xl font-bold">{stat.value}</span>
          </div>
          <p className="text-sm font-medium opacity-80">{stat.label}</p>
        </div>
      ))}
    </div>
  );
}
