"use client";

const metrics = [
  { label: "Monthly Recurring Revenue", value: "$487,230", change: "+15%" },
  { label: "Annual Recurring Revenue", value: "$5.8M", change: "+22%" },
  { label: "Average Revenue Per User", value: "$59.12", change: "+8%" },
  { label: "Churn Rate", value: "2.3%", change: "-0.5%" },
];

const planBreakdown = [
  { plan: "Basic ($29)", users: 4521, revenue: "$131,109", percentage: 35 },
  { plan: "Premium ($79)", users: 3012, revenue: "$237,948", percentage: 49 },
  { plan: "Enterprise ($199)", users: 701, revenue: "$139,499", percentage: 16 },
];

const recentSubscriptions = [
  { user: "john@example.com", plan: "Premium", action: "upgraded", date: "2 hours ago" },
  { user: "jane@example.com", plan: "Basic", action: "new", date: "5 hours ago" },
  { user: "bob@example.com", plan: "Enterprise", action: "renewed", date: "1 day ago" },
  { user: "alice@example.com", plan: "Premium", action: "cancelled", date: "2 days ago" },
];

export default function AdminSubscriptionsPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Subscription Management</h1>
        <button className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition">
          Export Report
        </button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {metrics.map((metric) => (
          <div key={metric.label} className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-slate-700">
            <p className="text-sm text-gray-500 dark:text-slate-400">{metric.label}</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{metric.value}</p>
            <p className={`text-sm mt-2 ${metric.change.startsWith("+") ? "text-emerald-500" : metric.change.startsWith("-") && metric.label === "Churn Rate" ? "text-emerald-500" : "text-red-500"}`}>
              {metric.change} from last month
            </p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Plan Breakdown */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700">
          <div className="p-6 border-b border-gray-200 dark:border-slate-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Plan Breakdown</h2>
          </div>
          <div className="p-6">
            {planBreakdown.map((plan) => (
              <div key={plan.plan} className="mb-6 last:mb-0">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-900 dark:text-white">{plan.plan}</span>
                  <span className="text-sm text-gray-500 dark:text-slate-400">{plan.users.toLocaleString()} users</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-3">
                  <div
                    className="bg-gradient-to-r from-emerald-500 to-blue-500 h-3 rounded-full"
                    style={{ width: `${plan.percentage}%` }}
                  />
                </div>
                <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">{plan.revenue}/month ({plan.percentage}%)</p>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700">
          <div className="p-6 border-b border-gray-200 dark:border-slate-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Subscription Activity</h2>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-slate-700">
            {recentSubscriptions.map((sub, i) => (
              <div key={i} className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{sub.user}</p>
                  <p className="text-sm text-gray-500 dark:text-slate-400">{sub.plan} • {sub.date}</p>
                </div>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  sub.action === "new" ? "bg-emerald-100 text-emerald-700" :
                  sub.action === "upgraded" ? "bg-blue-100 text-blue-700" :
                  sub.action === "renewed" ? "bg-blue-100 text-blue-700" :
                  "bg-red-100 text-red-700"
                }`}>
                  {sub.action}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Churn Analysis */}
      <div className="mt-8 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Churn Analysis</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="text-center p-4 bg-gray-50 dark:bg-slate-900 rounded-lg">
            <p className="text-3xl font-bold text-gray-900 dark:text-white">156</p>
            <p className="text-sm text-gray-500 dark:text-slate-400">Cancellations this month</p>
          </div>
          <div className="text-center p-4 bg-gray-50 dark:bg-slate-900 rounded-lg">
            <p className="text-3xl font-bold text-gray-900 dark:text-white">$12,324</p>
            <p className="text-sm text-gray-500 dark:text-slate-400">Lost MRR</p>
          </div>
          <div className="text-center p-4 bg-gray-50 dark:bg-slate-900 rounded-lg">
            <p className="text-3xl font-bold text-gray-900 dark:text-white">45%</p>
            <p className="text-sm text-gray-500 dark:text-slate-400">Reason: Price</p>
          </div>
        </div>
      </div>
    </div>
  );
}

