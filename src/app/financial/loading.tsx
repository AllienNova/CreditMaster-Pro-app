export default function FinancialLoading() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="animate-pulse space-y-6">
          {/* Header skeleton */}
          <div>
            <div className="h-8 bg-gray-200 dark:bg-slate-700 rounded w-48 mb-2" />
            <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-80" />
          </div>

          {/* Stats cards */}
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

          {/* Main content */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6 h-80" />
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6 h-80" />
          </div>

          {/* List section */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
            <div className="h-6 bg-gray-200 dark:bg-slate-700 rounded w-40 mb-4" />
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-slate-700 last:border-0"
                >
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-slate-700" />
                    <div className="ml-4">
                      <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-32 mb-2" />
                      <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded w-24" />
                    </div>
                  </div>
                  <div className="h-5 bg-gray-200 dark:bg-slate-700 rounded w-20" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
