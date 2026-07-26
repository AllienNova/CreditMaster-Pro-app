"use client";

/**
 * Admin system-health dashboard (FR-303 / M4-1).
 *
 * Renders real per-service status fetched from GET /api/admin/health. Replaces
 * the prior hardcoded `SERVICES`/`metrics`/`recentIncidents` arrays that always
 * rendered "operational" regardless of reality. Everything shown here derives
 * from a live probe; nothing is fabricated. Loading and error are surfaced
 * honestly rather than papered over with placeholder green.
 */

import { useCallback, useEffect, useState } from "react";
import type {
  ServiceHealth,
  ServiceStatus,
  SystemHealth,
} from "@/lib/monitoring/service-probes";

const STATUS_DOT: Record<ServiceStatus, string> = {
  healthy: "bg-emerald-500",
  degraded: "bg-yellow-500",
  down: "bg-red-500",
  unknown: "bg-gray-400",
};

const STATUS_BADGE: Record<ServiceStatus, string> = {
  healthy: "bg-emerald-100 text-emerald-700",
  degraded: "bg-yellow-100 text-yellow-700",
  down: "bg-red-100 text-red-700",
  unknown: "bg-gray-100 text-gray-600",
};

const OVERALL_HEADLINE: Record<ServiceStatus, string> = {
  healthy: "All Systems Healthy",
  degraded: "Some Systems Unverified",
  down: "Service Disruption Detected",
  unknown: "Status Unknown",
};

export default function AdminHealthPage() {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/health", { cache: "no-store" });
      if (!res.ok) throw new Error(`Health check failed (HTTP ${res.status})`);
      setHealth((await res.json()) as SystemHealth);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load system health");
      setHealth(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const healthyCount =
    health?.services.filter((s) => s.status === "healthy").length ?? 0;
  const totalCount = health?.services.length ?? 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          System Health
        </h1>
        <button
          onClick={() => void load()}
          disabled={loading}
          className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition disabled:opacity-50"
        >
          {loading ? "Checking…" : "Run Health Check"}
        </button>
      </div>

      {loading && !health && (
        <div
          role="status"
          className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-8 text-center text-gray-500 dark:text-slate-400"
        >
          Checking service health…
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="bg-red-50 dark:bg-red-950 rounded-xl border border-red-200 dark:border-red-900 p-6 mb-8"
        >
          <p className="font-medium text-red-700 dark:text-red-300">
            Unable to load system health
          </p>
          <p className="text-sm text-red-600 dark:text-red-400 mt-1">{error}</p>
          <button
            onClick={() => void load()}
            className="mt-3 px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
          >
            Retry
          </button>
        </div>
      )}

      {health && (
        <>
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6 mb-8">
            <div className="flex items-center gap-4">
              <span
                className={`w-4 h-4 rounded-full ${STATUS_DOT[health.status]}`}
              />
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {OVERALL_HEADLINE[health.status]}
                </h2>
                <p className="text-gray-500 dark:text-slate-400">
                  {healthyCount}/{totalCount} services healthy • checked{" "}
                  {new Date(health.checkedAt).toLocaleTimeString()}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700">
            <div className="p-6 border-b border-gray-200 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Service Status
              </h2>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-slate-700">
              {health.services.map((service) => (
                <ServiceRow key={service.service} service={service} />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function ServiceRow({ service }: { service: ServiceHealth }) {
  return (
    <div className="p-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <span className={`w-3 h-3 rounded-full ${STATUS_DOT[service.status]}`} />
        <div>
          <p className="font-medium text-gray-900 dark:text-white">
            {service.service}
          </p>
          {service.detail && (
            <p className="text-xs text-gray-500 dark:text-slate-400">
              {service.detail}
            </p>
          )}
        </div>
      </div>
      <span
        className={`px-2 py-1 text-xs rounded-full ${STATUS_BADGE[service.status]}`}
      >
        {service.status}
      </span>
    </div>
  );
}
