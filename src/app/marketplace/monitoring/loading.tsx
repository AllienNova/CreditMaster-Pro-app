export default function MonitoringLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="h-8 bg-gray-200 dark:bg-slate-700 rounded w-64" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white dark:bg-slate-800 rounded-xl p-6 h-48 border border-gray-200 dark:border-slate-700" />
        ))}
      </div>
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 h-80 border border-gray-200 dark:border-slate-700" />
    </div>
  );
}

