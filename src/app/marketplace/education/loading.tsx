export default function EducationLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="h-8 bg-gray-200 dark:bg-slate-700 rounded w-48" />
      <div className="flex gap-4 border-b border-gray-200 dark:border-slate-700 pb-3">
        <div className="h-6 bg-gray-200 dark:bg-slate-700 rounded w-24" />
        <div className="h-6 bg-gray-200 dark:bg-slate-700 rounded w-24" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="bg-white dark:bg-slate-800 rounded-xl h-80 border border-gray-200 dark:border-slate-700" />
        ))}
      </div>
    </div>
  );
}

