"use client";

const scoreFactors = [
  {
    factor: "Payment History",
    impact: 35,
    status: "good",
    score: 92,
    description: "On-time payments for 24 months",
  },
  {
    factor: "Credit Utilization",
    impact: 30,
    status: "fair",
    score: 68,
    description: "Using 32% of available credit",
  },
  {
    factor: "Credit Age",
    impact: 15,
    status: "good",
    score: 85,
    description: "Average account age: 5.2 years",
  },
  {
    factor: "Credit Mix",
    impact: 10,
    status: "excellent",
    score: 95,
    description: "Good mix of credit types",
  },
  {
    factor: "New Credit",
    impact: 10,
    status: "fair",
    score: 70,
    description: "2 inquiries in last 6 months",
  },
];

const scoreHistory = [
  { date: "Dec 2024", experian: 725, equifax: 718, transunion: 715 },
  { date: "Nov 2024", experian: 713, equifax: 710, transunion: 710 },
  { date: "Oct 2024", experian: 695, equifax: 690, transunion: 688 },
  { date: "Sep 2024", experian: 670, equifax: 665, transunion: 668 },
  { date: "Aug 2024", experian: 650, equifax: 648, transunion: 652 },
  { date: "Jul 2024", experian: 635, equifax: 630, transunion: 628 },
];

const recommendations = [
  {
    title: "Pay down credit card balances",
    impact: "+15-25 points",
    priority: "high",
    timeframe: "1-2 months",
  },
  {
    title: "Avoid new credit applications",
    impact: "+5-10 points",
    priority: "medium",
    timeframe: "6 months",
  },
  {
    title: "Become authorized user",
    impact: "+10-20 points",
    priority: "medium",
    timeframe: "1-3 months",
  },
];

export default function CreditScoreAnalyticsPage() {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "excellent":
        return "text-emerald-600 bg-emerald-100";
      case "good":
        return "text-blue-600 bg-blue-100";
      case "fair":
        return "text-yellow-600 bg-yellow-100";
      case "poor":
        return "text-red-600 bg-red-100";
      default:
        return "text-gray-600 dark:text-slate-300 bg-gray-100 dark:bg-slate-800";
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        Credit Score Analysis
      </h1>

      {/* Current Score */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-8 mb-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 dark:text-slate-400">
              Your Current Score
            </p>
            <p className="text-6xl font-bold bg-gradient-to-r from-emerald-500 to-blue-500 bg-clip-text text-transparent">
              720
            </p>
            <p className="text-emerald-500 mt-2">+45 points in 6 months</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500 dark:text-slate-400">
              Score Range
            </p>
            <p className="text-lg font-semibold text-emerald-600">Good</p>
            <p className="text-sm text-gray-400 dark:text-slate-500">670-739</p>
          </div>
        </div>
        <div className="mt-6">
          <div className="flex justify-between text-xs text-gray-500 dark:text-slate-400 mb-1">
            <span>Poor</span>
            <span>Fair</span>
            <span>Good</span>
            <span>Very Good</span>
            <span>Excellent</span>
          </div>
          <div className="h-4 bg-gradient-to-r from-red-400 via-yellow-400 via-green-400 to-emerald-500 rounded-full relative">
            <div
              className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white dark:bg-slate-800 border-2 border-gray-800 rounded-full"
              style={{ left: `${((720 - 300) / 550) * 100}%` }}
            />
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Score Factors */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700">
          <div className="p-6 border-b border-gray-200 dark:border-slate-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Score Factors
            </h2>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-slate-700">
            {scoreFactors.map((factor) => (
              <div key={factor.factor} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-900 dark:text-white">
                    {factor.factor}
                  </span>
                  <span
                    className={`px-2 py-1 text-xs rounded-full ${getStatusColor(factor.status)}`}
                  >
                    {factor.status}
                  </span>
                </div>
                <div className="flex items-center gap-3 mb-1">
                  <div className="flex-1 bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-emerald-500 to-blue-500 h-2 rounded-full"
                      style={{ width: `${factor.score}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {factor.score}%
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  {factor.description} • {factor.impact}% of score
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Recommendations */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700">
          <div className="p-6 border-b border-gray-200 dark:border-slate-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Recommendations
            </h2>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-slate-700">
            {recommendations.map((rec, i) => (
              <div key={i} className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {rec.title}
                    </p>
                    <p className="text-sm text-emerald-500">{rec.impact}</p>
                    <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">
                      Timeframe: {rec.timeframe}
                    </p>
                  </div>
                  <span
                    className={`px-2 py-1 text-xs rounded-full ${rec.priority === "high" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"}`}
                  >
                    {rec.priority}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Score History Table */}
      <div className="mt-8 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Score History
          </h2>
        </div>
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-slate-900">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">
                Experian
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">
                Equifax
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">
                TransUnion
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
            {scoreHistory.map((row) => (
              <tr key={row.date}>
                <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                  {row.date}
                </td>
                <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                  {row.experian}
                </td>
                <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                  {row.equifax}
                </td>
                <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                  {row.transunion}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
