'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';

interface PlaidLinkButtonProps {
  onSuccess: () => void;
  variant?: 'primary' | 'secondary';
}

export default function PlaidLinkButton({ onSuccess, variant = 'primary' }: PlaidLinkButtonProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async () => {
    if (!user) {
      setError('You must be logged in to connect your bank account');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Step 1: Create link token
      const linkTokenResponse = await fetch('/api/financial/plaid/link-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      if (!linkTokenResponse.ok) {
        throw new Error('Failed to create link token');
      }

      const { data: linkTokenData } = await linkTokenResponse.json();

      // Step 2: Open Plaid Link (in production, use Plaid Link SDK)
      // For now, we'll simulate the flow
      console.log('Link Token:', linkTokenData.linkToken);

      // In production, you would use:
      // const plaid = Plaid.create({
      //   token: linkTokenData.linkToken,
      //   onSuccess: async (publicToken) => {
      //     // Exchange public token for access token
      //     await exchangeToken(publicToken);
      //   },
      // });
      // plaid.open();

      // Simulate successful connection for demo
      alert('In production, this would open Plaid Link to connect your bank account.\n\nFor demo purposes, we\'ll simulate a successful connection.');

      // Simulate public token (in production, this comes from Plaid Link)
      const simulatedPublicToken = 'public-sandbox-' + Math.random().toString(36).substring(7);

      // Step 3: Exchange public token
      const exchangeResponse = await fetch('/api/financial/plaid/exchange-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          publicToken: simulatedPublicToken,
        }),
      });

      if (!exchangeResponse.ok) {
        throw new Error('Failed to exchange token');
      }

      // Success!
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect account');
    } finally {
      setLoading(false);
    }
  };

  const buttonClasses = variant === 'primary'
    ? 'px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold'
    : 'px-4 py-2 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-200 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 dark:bg-slate-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed';

  return (
    <div>
      <button
        type="button"
        onClick={handleConnect}
        disabled={loading}
        className={buttonClasses}
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Connecting...
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <span></span>
            <span>Connect Bank Account</span>
          </span>
        )}
      </button>

      {error && (
        <div className="mt-2 text-sm text-red-600">
          {error}
        </div>
      )}
    </div>
  );
}

