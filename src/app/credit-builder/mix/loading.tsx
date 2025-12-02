export default function Loading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600 mx-auto"></div>
        <p className="mt-6 text-lg text-gray-700 font-medium">Loading Credit Mix Analyzer...</p>
        <p className="mt-2 text-sm text-gray-500">Analyzing your credit portfolio diversity</p>
      </div>
    </div>
  );
}
