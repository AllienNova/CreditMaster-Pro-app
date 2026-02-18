export default function LoansLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="h-8 bg-gray-200 dark:bg-slate-700 rounded w-64" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-white dark:bg-slate-800 rounded-xl h-64 border border-gray-200 dark:border-slate-700"
            />
          ))}
        </div>
        <div className="bg-gray-100 dark:bg-slate-800 rounded-xl h-80" />
      </div>
    </div>
  );
}
