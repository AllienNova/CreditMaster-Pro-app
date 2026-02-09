export default function WatchlistLoading() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="animate-pulse space-y-6">
          {/* Header skeleton */}
          <div className="flex justify-between items-start">
            <div>
              <div className="h-8 bg-gray-200 dark:bg-slate-700 rounded w-40 mb-2" />
              <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-64" />
            </div>
            <div className="h-10 bg-gray-200 dark:bg-slate-700 rounded w-28" />
          </div>

          {/* List skeleton */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm overflow-hidden">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="px-6 py-4 flex items-center justify-between border-b border-gray-200 dark:border-slate-700 last:border-0"
              >
                <div className="flex items-center">
                  <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-slate-700" />
                  <div className="ml-4">
                    <div className="h-5 bg-gray-200 dark:bg-slate-700 rounded w-16 mb-2" />
                    <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-32" />
                  </div>
                </div>
                <div className="text-right">
                  <div className="h-5 bg-gray-200 dark:bg-slate-700 rounded w-20 mb-2" />
                  <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-14" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
