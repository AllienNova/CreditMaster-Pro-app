export default function AdminLoading() {
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-slate-900">
      {/* Admin header */}
      <div className="bg-white dark:bg-slate-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="animate-pulse flex items-center justify-between">
            <div className="h-8 bg-gray-200 dark:bg-slate-700 rounded w-48" />
            <div className="h-10 bg-gray-200 dark:bg-slate-700 rounded w-32" />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse space-y-6">
          {/* Stats row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-24" />
                  <div className="w-10 h-10 rounded-lg bg-gray-200 dark:bg-slate-700" />
                </div>
                <div className="h-8 bg-gray-200 dark:bg-slate-700 rounded w-16" />
              </div>
            ))}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
              <div className="h-6 bg-gray-200 dark:bg-slate-700 rounded w-40 mb-4" />
              <div className="h-64 bg-gray-200 dark:bg-slate-700 rounded" />
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
              <div className="h-6 bg-gray-200 dark:bg-slate-700 rounded w-40 mb-4" />
              <div className="h-64 bg-gray-200 dark:bg-slate-700 rounded" />
            </div>
          </div>

          {/* Table */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center">
              <div className="h-6 bg-gray-200 dark:bg-slate-700 rounded w-32" />
              <div className="h-8 bg-gray-200 dark:bg-slate-700 rounded w-40" />
            </div>
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-slate-700" />
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-40 mb-2" />
                    <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded w-56" />
                  </div>
                  <div className="h-6 bg-gray-200 dark:bg-slate-700 rounded-full w-16" />
                  <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-24" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
