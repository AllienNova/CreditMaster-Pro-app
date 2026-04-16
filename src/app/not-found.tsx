import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900 px-6">
      <div className="max-w-md w-full text-center space-y-6">
        <p className="text-6xl font-bold text-gray-900 dark:text-white">404</p>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
          Page not found
        </h1>
        <p className="text-gray-600 dark:text-slate-300">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link
          href="/"
          className="inline-block px-6 py-3 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
