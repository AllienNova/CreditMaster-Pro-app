'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get the code from the URL
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');

        if (accessToken && refreshToken) {
          // Set the session
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (sessionError) {
            throw sessionError;
          }

          // Get the user
          const { data: { user }, error: userError } = await supabase.auth.getUser();

          if (userError) {
            throw userError;
          }

          if (user) {
            // Check if user profile exists in database
            const { data: profileData, error: profileError } = await supabase
              .from('users')
              .select('id')
              .eq('id', user.id)
              .single();

            // If profile doesn't exist, create it
            if (profileError || !profileData) {
              await supabase
                .from('users')
                .insert({
                  id: user.id,
                  email: user.email,
                  name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'User',
                  role: 'user',
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                });
            }

            // Redirect to dashboard
            router.push('/dashboard');
            return;
          }
        }

        // If we get here, something went wrong
        throw new Error('Failed to authenticate');
      } catch (err) {
        console.error('Auth callback error:', err);
        setError(err instanceof Error ? err.message : 'Authentication failed');
        
        // Redirect to login after 3 seconds
        setTimeout(() => {
          router.push('/login');
        }, 3000);
      }
    };

    handleCallback();
  }, [router]);

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-cyan-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Authentication Failed
          </h2>
          <p className="text-gray-600 mb-6">
            {error}
          </p>
          <p className="text-sm text-gray-500">
            Redirecting to login page...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-cyan-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-6"></div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Completing Sign In...
        </h2>
        <p className="text-gray-600">
          Please wait while we set up your account.
        </p>
      </div>
    </div>
  );
}

