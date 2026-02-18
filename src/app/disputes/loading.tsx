export default function DisputesLoading() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="animate-pulse space-y-6">
          {/* Header */}
          <div className="flex justify-between items-start">
            <div>
              <div className="h-8 bg-gray-200 dark:bg-slate-700 rounded w-40 mb-2" />
              <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-72" />
            </div>
            <div className="h-10 bg-gray-200 dark:bg-slate-700 rounded w-36" />
          </div>

          {/* Stats cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="bg-white dark:bg-slate-800 rounded-lg shadow p-6"
              >
                <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-20 mb-3" />
                <div className="h-8 bg-gray-200 dark:bg-slate-700 rounded w-12" />
              </div>
            ))}
          </div>

          {/* Disputes list */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-slate-700">
              <div className="h-6 bg-gray-200 dark:bg-slate-700 rounded w-32" />
            </div>
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="p-4 flex items-center justify-between">
                  <div className="flex items-center flex-1">
                    <div className="w-10 h-10 rounded-lg bg-gray-200 dark:bg-slate-700" />
                    <div className="ml-4 flex-1">
                      <div className="h-5 bg-gray-200 dark:bg-slate-700 rounded w-48 mb-2" />
                      <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-32" />
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="h-6 bg-gray-200 dark:bg-slate-700 rounded-full w-20" />
                    <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-24" />
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
