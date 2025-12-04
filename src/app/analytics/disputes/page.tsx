"use client";

const disputeStats = [
  { label: "Total Disputes", value: "24", change: "+8 this month" },
  { label: "Successful", value: "12", change: "50% success rate" },
  { label: "Pending", value: "5", change: "Avg 18 days wait" },
  { label: "In Progress", value: "4", change: "Response expected" },
];

const disputesByType = [
  { type: "Late Payments", total: 8, successful: 5, pending: 2, failed: 1 },
  { type: "Collections", total: 6, successful: 3, pending: 1, failed: 2 },
  { type: "Inquiries", total: 5, successful: 2, pending: 2, failed: 1 },
  { type: "Account Errors", total: 3, successful: 2, pending: 0, failed: 1 },
  { type: "Identity Issues", total: 2, successful: 0, pending: 0, failed: 2 },
];

const disputesByBureau = [
  { bureau: "Experian", total: 10, successful: 6, pending: 2, avgDays: 28 },
  { bureau: "Equifax", total: 8, successful: 4, pending: 2, avgDays: 32 },
  { bureau: "TransUnion", total: 6, successful: 2, pending: 1, avgDays: 25 },
];

const recentDisputes = [
  { id: "D-001", type: "Late Payment", bureau: "Experian", status: "resolved", date: "Nov 28", result: "Removed" },
  { id: "D-002", type: "Collection", bureau: "Equifax", status: "pending", date: "Nov 20", result: "-" },
  { id: "D-003", type: "Inquiry", bureau: "TransUnion", status: "in_progress", date: "Nov 15", result: "-" },
  { id: "D-004", type: "Late Payment", bureau: "Experian", status: "resolved", date: "Nov 10", result: "Updated" },
  { id: "D-005", type: "Collection", bureau: "Equifax", status: "failed", date: "Nov 5", result: "Verified" },
];

export default function DisputeAnalyticsPage() {
  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      resolved: "bg-emerald-100 text-emerald-700",
      pending: "bg-yellow-100 text-yellow-700",
      in_progress: "bg-blue-100 text-blue-700",
      failed: "bg-red-100 text-red-700",
    };
    return <span className={`px-2 py-1 text-xs rounded-full ${styles[status]}`}>{status.replace("_", " ")}</span>;
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dispute Analytics</h1>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {disputeStats.map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <p className="text-sm text-gray-500">{stat.label}</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{stat.value}</p>
            <p className="text-sm mt-2 text-gray-400">{stat.change}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-8 mb-8">
        {/* By Type */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Disputes by Type</h2>
          </div>
          <div className="p-6">
            {disputesByType.map((item) => (
              <div key={item.type} className="mb-4 last:mb-0">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-900">{item.type}</span>
                  <span className="text-sm text-gray-500">{item.total} total</span>
                </div>
                <div className="flex h-4 rounded-full overflow-hidden bg-gray-100">
                  <div className="bg-emerald-500" style={{ width: `${(item.successful / item.total) * 100}%` }} />
                  <div className="bg-yellow-500" style={{ width: `${(item.pending / item.total) * 100}%` }} />
                  <div className="bg-red-500" style={{ width: `${(item.failed / item.total) * 100}%` }} />
                </div>
                <div className="flex gap-4 mt-1 text-xs text-gray-500">
                  <span>✓ {item.successful}</span>
                  <span>⏳ {item.pending}</span>
                  <span>✗ {item.failed}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* By Bureau */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Disputes by Bureau</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {disputesByBureau.map((bureau) => (
              <div key={bureau.bureau} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-900">{bureau.bureau}</span>
                  <span className="text-sm text-emerald-500">{Math.round((bureau.successful / bureau.total) * 100)}% success</span>
                </div>
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div className="bg-gray-50 rounded p-2">
                    <p className="text-lg font-bold text-gray-900">{bureau.total}</p>
                    <p className="text-xs text-gray-500">Total</p>
                  </div>
                  <div className="bg-emerald-50 rounded p-2">
                    <p className="text-lg font-bold text-emerald-600">{bureau.successful}</p>
                    <p className="text-xs text-gray-500">Won</p>
                  </div>
                  <div className="bg-yellow-50 rounded p-2">
                    <p className="text-lg font-bold text-yellow-600">{bureau.pending}</p>
                    <p className="text-xs text-gray-500">Pending</p>
                  </div>
                  <div className="bg-blue-50 rounded p-2">
                    <p className="text-lg font-bold text-blue-600">{bureau.avgDays}</p>
                    <p className="text-xs text-gray-500">Avg Days</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Disputes */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Recent Disputes</h2>
        </div>
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bureau</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Result</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {recentDisputes.map((dispute) => (
              <tr key={dispute.id}>
                <td className="px-6 py-4 text-sm font-medium text-gray-900">{dispute.id}</td>
                <td className="px-6 py-4 text-sm text-gray-900">{dispute.type}</td>
                <td className="px-6 py-4 text-sm text-gray-500">{dispute.bureau}</td>
                <td className="px-6 py-4">{getStatusBadge(dispute.status)}</td>
                <td className="px-6 py-4 text-sm text-gray-500">{dispute.date}</td>
                <td className="px-6 py-4 text-sm text-gray-900">{dispute.result}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

