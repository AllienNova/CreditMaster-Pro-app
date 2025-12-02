'use client';

export default function SecuredCardsError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="min-h-[400px] flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Failed to load cards</h2>
        <p className="text-gray-600 mb-4">{error.message}</p>
        <button onClick={reset} className="px-4 py-2 bg-indigo-600 text-white rounded-lg">Try again</button>
      </div>
    </div>
  );
}

