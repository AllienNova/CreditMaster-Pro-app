'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';

/**
 * OAuth Callback Page
 *
 * Handles OAuth redirect callbacks using PKCE flow.
 * Creates user profile in 'profiles' table if it doesn't exist.
 * Respects 'next' query parameter for redirect after auth.
 */
function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Create browser client for OAuth callback
        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        // Handle PKCE code exchange (modern OAuth flow)
        const code = searchParams.get('code');
        const errorParam = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');

        // Check for OAuth errors
        if (errorParam) {
          throw new Error(errorDescription || errorParam);
        }

        if (code) {
          // Exchange code for session (PKCE flow)
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

          if (exchangeError) {
            throw exchangeError;
          }

          if (data.user) {
            // Check if user profile exists in 'profiles' table (canonical table)
            const { data: profileData, error: profileError } = await supabase
              .from('profiles')
              .select('id')
              .eq('id', data.user.id)
              .single();

            // If profile doesn't exist, create it
            if (profileError || !profileData) {
              const { error: insertError } = await supabase
                .from('profiles')
                .insert({
                  id: data.user.id,
                  full_name: data.user.user_metadata?.full_name ||
                             data.user.user_metadata?.name ||
                             data.user.email?.split('@')[0] ||
                             'User',
                  subscription_tier: 'free',
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                });

              if (insertError) {
                // AuthCallback: Failed to create user profile (will be created later)
                void insertError;
              }
            }

            // Respect 'next' parameter for redirect, default to dashboard
            const nextUrl = searchParams.get('next') || '/dashboard';
            router.push(nextUrl);
            return;
          }
        }

        // Legacy: Handle hash tokens (fallback for older OAuth configs)
        if (typeof window !== 'undefined' && window.location.hash) {
          const hashParams = new URLSearchParams(window.location.hash.substring(1));
          const accessToken = hashParams.get('access_token');
          const refreshToken = hashParams.get('refresh_token');

          if (accessToken && refreshToken) {
            // AuthCallback: Using legacy hash token flow (consider PKCE for OAuth config)

            const { error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

            if (sessionError) {
              throw sessionError;
            }

            const { data: { user }, error: userError } = await supabase.auth.getUser();

            if (userError) {
              throw userError;
            }

            if (user) {
              // Create profile in 'profiles' table
              const { data: profileData } = await supabase
                .from('profiles')
                .select('id')
                .eq('id', user.id)
                .single();

              if (!profileData) {
                await supabase
                  .from('profiles')
                  .insert({
                    id: user.id,
                    full_name: user.user_metadata?.full_name ||
                               user.user_metadata?.name ||
                               user.email?.split('@')[0] ||
                               'User',
                    subscription_tier: 'free',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                  });
              }

              const nextUrl = searchParams.get('next') || '/dashboard';
              router.push(nextUrl);
              return;
            }
          }
        }

        // If we get here without a code or hash, something went wrong
        throw new Error('No authentication code received');
      } catch (err) {
        // AuthCallback error: OAuth callback failed
        setError(err instanceof Error ? err.message : 'Authentication failed');

        // Redirect to canonical login page after 3 seconds
        setTimeout(() => {
          router.push('/auth/login');
        }, 3000);
      }
    };

    handleCallback();
  }, [router, searchParams]);

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-50 to-blue-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-xl shadow-xl p-8 text-center">
          <div className="text-red-500 text-5xl mb-4"></div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Authentication Failed
          </h2>
          <p className="text-gray-600 dark:text-slate-300 mb-6">
            {error}
          </p>
          <p className="text-sm text-gray-500 dark:text-slate-400">
            Redirecting to login page...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-50 to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-xl shadow-xl p-8 text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-6"></div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          Completing Sign In...
        </h2>
        <p className="text-gray-600 dark:text-slate-300">
          Please wait while we set up your account.
        </p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-50 to-blue-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-xl shadow-xl p-8 text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-6"></div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Loading...
            </h2>
          </div>
        </div>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}
