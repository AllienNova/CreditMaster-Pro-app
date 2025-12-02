export default function TradelinesLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-64" />
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl p-6 h-96 border border-gray-200" />
        <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-xl p-6 h-64 border border-gray-200" />
          ))}
        </div>
      </div>
    </div>
  );
}

