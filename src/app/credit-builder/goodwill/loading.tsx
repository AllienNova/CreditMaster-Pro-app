export default function Loading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-emerald-600 mx-auto"></div>
        <p className="mt-6 text-lg text-gray-700 font-medium">Loading Goodwill Letter Generator...</p>
        <p className="mt-2 text-sm text-gray-500">Preparing your letter templates</p>
      </div>
    </div>
  );
}
