export default function Loading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto"></div>
        <p className="mt-6 text-lg text-gray-700 dark:text-slate-200 font-medium">
          Loading Credit Freeze Manager...
        </p>
        <p className="mt-2 text-sm text-gray-500 dark:text-slate-400">
          Checking your freeze status across all bureaus
        </p>
      </div>
    </div>
  );
}
