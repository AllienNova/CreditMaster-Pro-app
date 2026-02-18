import { Suspense } from "react";
import NotificationCenter from "@/components/notifications/NotificationCenter";

export const metadata = {
  title: "Notifications | Fynvita",
  description: "View your notifications",
};

export default function NotificationsPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Notifications
          </h1>
          <p className="mt-2 text-gray-600 dark:text-slate-300">
            Stay updated with your credit repair progress
          </p>
        </div>

        <Suspense fallback={<NotificationLoadingSkeleton />}>
          <NotificationCenter />
        </Suspense>
      </div>
    </div>
  );
}

// Loading Skeleton
function NotificationLoadingSkeleton() {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow animate-pulse">
      <div className="p-6 border-b border-gray-200 dark:border-slate-700">
        <div className="h-10 bg-gray-200 dark:bg-slate-700 rounded w-1/3"></div>
      </div>
      <div className="divide-y divide-gray-200 dark:divide-slate-700">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="p-6">
            <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    </div>
  );
}
