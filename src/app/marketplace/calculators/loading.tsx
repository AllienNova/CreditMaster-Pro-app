export default function CalculatorsLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="h-8 bg-gray-200 dark:bg-slate-700 rounded w-48" />
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="bg-white dark:bg-slate-800 rounded-xl p-4 h-24 border border-gray-200 dark:border-slate-700" />
        ))}
      </div>
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 h-80 border border-gray-200 dark:border-slate-700" />
    </div>
  );
}

