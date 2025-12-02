export default function ConsolidationLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-64" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => <div key={i} className="bg-white rounded-xl h-64 border border-gray-200" />)}
        </div>
        <div className="bg-gray-100 rounded-xl h-80" />
      </div>
    </div>
  );
}

