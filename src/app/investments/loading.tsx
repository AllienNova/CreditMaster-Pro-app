export default function InvestmentsLoading() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="animate-pulse space-y-6">
          {/* Header */}
          <div>
            <div className="h-8 bg-gray-200 dark:bg-slate-700 rounded w-56 mb-2" />
            <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-96" />
          </div>

          {/* Portfolio stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="bg-white dark:bg-slate-800 rounded-lg shadow p-6"
              >
                <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-1/2 mb-4" />
                <div className="h-8 bg-gray-200 dark:bg-slate-700 rounded w-3/4" />
              </div>
            ))}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6 h-[400px]" />
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6 h-[400px]" />
          </div>

          {/* Holdings table */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
            <div className="h-6 bg-gray-200 dark:bg-slate-700 rounded w-32 mb-4" />
            <div className="space-y-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-slate-700 last:border-0"
                >
                  <div className="flex items-center">
                    <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-slate-700" />
                    <div className="ml-4">
                      <div className="h-5 bg-gray-200 dark:bg-slate-700 rounded w-16 mb-2" />
                      <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-32" />
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="h-5 bg-gray-200 dark:bg-slate-700 rounded w-24 mb-2" />
                    <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-16" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
