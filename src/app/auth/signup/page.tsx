import { Suspense } from 'react';
import { Metadata } from 'next';
import SignUpForm from '@/components/auth/SignUpForm';

export const metadata: Metadata = {
  title: 'Sign Up | CPFI',
  description: 'Create your CPFI account',
};

function SignUpLoadingSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/2 mx-auto mb-8"></div>
        <div className="space-y-4">
          <div className="h-12 bg-gray-200 rounded"></div>
          <div className="h-12 bg-gray-200 rounded"></div>
          <div className="h-12 bg-gray-200 rounded"></div>
          <div className="h-12 bg-gray-200 rounded"></div>
        </div>
      </div>
    </div>
  );
}

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
      <Suspense fallback={<SignUpLoadingSkeleton />}>
        <SignUpForm />
      </Suspense>
    </div>
  );
}

