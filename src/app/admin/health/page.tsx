"use client";

const services = [
  {
    name: "API Server",
    status: "operational",
    latency: "45ms",
    uptime: "99.99%",
    lastCheck: "30s ago",
  },
  {
    name: "Database (Supabase)",
    status: "operational",
    latency: "12ms",
    uptime: "99.95%",
    lastCheck: "30s ago",
  },
  {
    name: "Experian API",
    status: "operational",
    latency: "320ms",
    uptime: "99.8%",
    lastCheck: "1m ago",
  },
  {
    name: "Equifax API",
    status: "degraded",
    latency: "850ms",
    uptime: "98.5%",
    lastCheck: "1m ago",
  },
  {
    name: "TransUnion API",
    status: "operational",
    latency: "280ms",
    uptime: "99.7%",
    lastCheck: "1m ago",
  },
  {
    name: "Stripe",
    status: "operational",
    latency: "95ms",
    uptime: "100%",
    lastCheck: "30s ago",
  },
  {
    name: "Plaid",
    status: "operational",
    latency: "180ms",
    uptime: "99.9%",
    lastCheck: "1m ago",
  },
  {
    name: "Email (Resend)",
    status: "degraded",
    latency: "450ms",
    uptime: "98.2%",
    lastCheck: "2m ago",
  },
  {
    name: "Redis Cache",
    status: "operational",
    latency: "2ms",
    uptime: "99.99%",
    lastCheck: "30s ago",
  },
  {
    name: "CDN (Vercel)",
    status: "operational",
    latency: "15ms",
    uptime: "100%",
    lastCheck: "30s ago",
  },
];

const metrics = [
  { label: "API Requests (24h)", value: "2.4M", trend: "+12%" },
  { label: "Error Rate", value: "0.02%", trend: "-0.01%" },
  { label: "Avg Response Time", value: "125ms", trend: "-15ms" },
  { label: "Active Connections", value: "8,234", trend: "+5%" },
];

const recentIncidents = [
  {
    id: "INC-001",
    service: "Equifax API",
    issue: "High latency",
    started: "2 hours ago",
    status: "investigating",
  },
  {
    id: "INC-002",
    service: "Email Service",
    issue: "Delayed delivery",
    started: "4 hours ago",
    status: "monitoring",
  },
];

export default function AdminHealthPage() {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "operational":
        return "bg-emerald-500";
      case "degraded":
        return "bg-yellow-500";
      case "outage":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      operational: "bg-emerald-100 text-emerald-700",
      degraded: "bg-yellow-100 text-yellow-700",
      outage: "bg-red-100 text-red-700",
      investigating: "bg-orange-100 text-orange-700",
      monitoring: "bg-blue-100 text-blue-700",
    };
    return (
      <span className={`px-2 py-1 text-xs rounded-full ${styles[status]}`}>
        {status}
      </span>
    );
  };

  const operationalCount = services.filter(
    (s) => s.status === "operational",
  ).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          System Health
        </h1>
        <button className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition">
          Run Health Check
        </button>
      </div>

      {/* Overall Status */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6 mb-8">
        <div className="flex items-center gap-4">
          <div
            className={`w-4 h-4 rounded-full ${operationalCount === services.length ? "bg-emerald-500" : "bg-yellow-500"}`}
          />
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {operationalCount === services.length
                ? "All Systems Operational"
                : "Some Systems Degraded"}
            </h2>
            <p className="text-gray-500 dark:text-slate-400">
              {operationalCount}/{services.length} services operational
            </p>
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {metrics.map((metric) => (
          <div
            key={metric.label}
            className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-slate-700"
          >
            <p className="text-sm text-gray-500 dark:text-slate-400">
              {metric.label}
            </p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
              {metric.value}
            </p>
            <p className="text-sm mt-2 text-emerald-500">{metric.trend}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Services Status */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700">
          <div className="p-6 border-b border-gray-200 dark:border-slate-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Service Status
            </h2>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-slate-700">
            {services.map((service) => (
              <div
                key={service.name}
                className="p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-3 h-3 rounded-full ${getStatusColor(service.status)}`}
                  />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {service.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-slate-400">
                      Latency: {service.latency} • Uptime: {service.uptime}
                    </p>
                  </div>
                </div>
                {getStatusBadge(service.status)}
              </div>
            ))}
          </div>
        </div>

        {/* Active Incidents */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700">
          <div className="p-6 border-b border-gray-200 dark:border-slate-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Active Incidents
            </h2>
          </div>
          {recentIncidents.length > 0 ? (
            <div className="divide-y divide-gray-100 dark:divide-slate-700">
              {recentIncidents.map((incident) => (
                <div key={incident.id} className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-900 dark:text-white">
                      {incident.service}
                    </span>
                    {getStatusBadge(incident.status)}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-slate-300">
                    {incident.issue}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">
                    Started {incident.started}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-gray-500 dark:text-slate-400">
              No active incidents
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
