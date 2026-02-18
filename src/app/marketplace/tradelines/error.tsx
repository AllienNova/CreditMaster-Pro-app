"use client";

export default function TradelinesError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="min-h-[400px] flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          Failed to load tradelines
        </h2>
        <p className="text-gray-600 dark:text-slate-300 mb-4">
          {error.message}
        </p>
        <button
          onClick={reset}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
