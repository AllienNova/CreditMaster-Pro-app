import { Suspense } from "react";
import { Metadata } from "next";
import LoginForm from "@/components/auth/LoginForm";

export const metadata: Metadata = {
  title: "Login | Fynvita",
  description: "Sign in to your Fynvita account - Your Financial Vitality",
};

function LoginLoadingSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-8 w-full max-w-md animate-pulse border border-gray-100 dark:border-slate-700">
        <div className="h-8 bg-gradient-to-r from-emerald-200 to-blue-200 dark:from-emerald-800 dark:to-blue-800 rounded w-1/2 mx-auto mb-8"></div>
        <div className="space-y-4">
          <div className="h-12 bg-gray-200 dark:bg-slate-700 rounded-lg"></div>
          <div className="h-12 bg-gray-200 dark:bg-slate-700 rounded-lg"></div>
          <div className="h-12 bg-gradient-to-r from-emerald-200 to-blue-200 dark:from-emerald-800 dark:to-blue-800 rounded-lg"></div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
      <Suspense fallback={<LoginLoadingSkeleton />}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
