export default function CommunityLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-48" />
      <div className="flex gap-4 border-b border-gray-200 pb-3">
        <div className="h-6 bg-gray-200 rounded w-24" />
        <div className="h-6 bg-gray-200 rounded w-24" />
      </div>
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => <div key={i} className="bg-white rounded-lg h-24 border border-gray-200" />)}
      </div>
    </div>
  );
}

