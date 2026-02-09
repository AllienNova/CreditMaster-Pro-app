"use client";

const trendMetrics = [
  { label: "Score Velocity", value: "+7.5", unit: "pts/month", trend: "up", description: "Average monthly score increase" },
  { label: "Dispute Success Trend", value: "78%", unit: "", trend: "up", description: "Improving from 65% last quarter" },
  { label: "Utilization Trend", value: "-5%", unit: "", trend: "down", description: "Decreasing (good)" },
  { label: "Account Age Trend", value: "+0.5", unit: "yrs", trend: "up", description: "Growing steadily" },
];

const monthlyTrends = [
  { month: "Jul", score: 620, disputes: 2, utilization: 45 },
  { month: "Aug", score: 635, disputes: 4, utilization: 42 },
  { month: "Sep", score: 655, disputes: 3, utilization: 38 },
  { month: "Oct", score: 680, disputes: 5, utilization: 35 },
  { month: "Nov", score: 705, disputes: 6, utilization: 32 },
  { month: "Dec", score: 720, disputes: 4, utilization: 30 },
];

const projections = [
  { timeframe: "3 months", projectedScore: 745, confidence: "High", factors: "Continued dispute success, lower utilization" },
  { timeframe: "6 months", projectedScore: 770, confidence: "Medium", factors: "Account aging, payment history" },
  { timeframe: "12 months", projectedScore: 800, confidence: "Low", factors: "All factors improving" },
];

const insights = [
  { type: "positive", title: "Strong Upward Momentum", description: "Your score has increased every month for 6 consecutive months" },
  { type: "positive", title: "Dispute Strategy Working", description: "Your dispute success rate is 13% above average" },
  { type: "warning", title: "Utilization Still High", description: "Consider paying down balances to below 30% for optimal score" },
  { type: "info", title: "Account Age Improving", description: "Your average account age will cross 6 years next quarter" },
];

export default function TrendsAnalyticsPage() {
  const getTrendIcon = (trend: string) => trend === "up" ? "" : trend === "down" ? "" : "";

  const getInsightStyle = (type: string) => {
    switch (type) {
      case "positive": return "border-emerald-200 bg-emerald-50";
      case "warning": return "border-yellow-200 bg-yellow-50";
      case "info": return "border-blue-200 bg-blue-50";
      default: return "border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900";
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Trends & Projections</h1>

      {/* Trend Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {trendMetrics.map((metric) => (
          <div key={metric.label} className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500 dark:text-slate-400">{metric.label}</p>
              <span className="text-xl">{getTrendIcon(metric.trend)}</span>
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
              {metric.value}<span className="text-lg text-gray-500 dark:text-slate-400">{metric.unit}</span>
            </p>
            <p className="text-sm mt-2 text-gray-400 dark:text-slate-500">{metric.description}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-8 mb-8">
        {/* Trend Chart */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">6-Month Trend Analysis</h2>
          <div className="space-y-4">
            {monthlyTrends.map((month, i) => (
              <div key={month.month} className="flex items-center gap-4">
                <span className="w-8 text-sm text-gray-500 dark:text-slate-400">{month.month}</span>
                <div className="flex-1 flex items-center gap-2">
                  <div className="flex-1 bg-gray-100 dark:bg-slate-800 rounded-full h-6 relative overflow-hidden">
                    <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-500 to-blue-500 rounded-full" style={{ width: `${((month.score - 500) / 350) * 100}%` }} />
                    <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-white">{month.score}</span>
                  </div>
                </div>
                <div className="w-20 text-right">
                  <span className={`text-xs ${i > 0 && month.score > monthlyTrends[i - 1].score ? "text-emerald-500" : "text-gray-400 dark:text-slate-500"}`}>
                    {i > 0 ? `+${month.score - monthlyTrends[i - 1].score}` : "-"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Projections */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700">
          <div className="p-6 border-b border-gray-200 dark:border-slate-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Score Projections</h2>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-slate-700">
            {projections.map((proj) => (
              <div key={proj.timeframe} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-900 dark:text-white">{proj.timeframe}</span>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    proj.confidence === "High" ? "bg-emerald-100 text-emerald-700" :
                    proj.confidence === "Medium" ? "bg-yellow-100 text-yellow-700" :
                    "bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-200"
                  }`}>
                    {proj.confidence} confidence
                  </span>
                </div>
                <p className="text-3xl font-bold bg-gradient-to-r from-emerald-500 to-blue-500 bg-clip-text text-transparent">
                  {proj.projectedScore}
                </p>
                <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">{proj.factors}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* AI Insights */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700">
        <div className="p-6 border-b border-gray-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">AI-Powered Insights</h2>
        </div>
        <div className="grid md:grid-cols-2 gap-4 p-6">
          {insights.map((insight, i) => (
            <div key={i} className={`border rounded-lg p-4 ${getInsightStyle(insight.type)}`}>
              <h3 className="font-medium text-gray-900 dark:text-white">{insight.title}</h3>
              <p className="text-sm text-gray-600 dark:text-slate-300 mt-1">{insight.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

