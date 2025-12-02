/**
 * Marketplace Loading State
 * 
 * Skeleton loading UI for marketplace pages.
 */

export default function MarketplaceLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Hero Skeleton */}
      <div className="bg-gray-200 rounded-2xl h-40" />

      {/* Featured Section Skeleton */}
      <section>
        <div className="h-6 bg-gray-200 rounded w-32 mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="h-12 w-12 bg-gray-200 rounded-lg mb-4" />
              <div className="h-5 bg-gray-200 rounded w-3/4 mb-2" />
              <div className="h-4 bg-gray-200 rounded w-full" />
            </div>
          ))}
        </div>
      </section>

      {/* Categories Skeleton */}
      <section>
        <div className="h-6 bg-gray-200 rounded w-40 mb-4" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="flex items-center gap-4 p-4 bg-white rounded-lg border border-gray-200">
              <div className="h-10 w-10 bg-gray-200 rounded-lg" />
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                <div className="h-3 bg-gray-200 rounded w-full" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

