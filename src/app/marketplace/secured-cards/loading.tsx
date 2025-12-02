export default function SecuredCardsLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-64" />
      <div className="bg-gray-200 rounded-xl h-32" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[1, 2, 3, 4].map((i) => <div key={i} className="bg-white rounded-xl h-72 border border-gray-200" />)}
      </div>
    </div>
  );
}

