import { Suspense } from 'react';
import { Metadata } from 'next';
import ResetPasswordForm from '@/components/auth/ResetPasswordForm';

export const metadata: Metadata = {
  title: 'Reset Password | CPFI',
  description: 'Reset your CPFI password',
};

function ResetPasswordLoadingSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/2 mx-auto mb-8"></div>
        <div className="space-y-4">
          <div className="h-12 bg-gray-200 rounded"></div>
          <div className="h-12 bg-gray-200 rounded"></div>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
      <Suspense fallback={<ResetPasswordLoadingSkeleton />}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}

