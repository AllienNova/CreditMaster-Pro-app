"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const bureaus = [
  { id: "experian", name: "Experian", logo: "🔵", status: "ready", description: "Connect to pull your Experian report" },
  { id: "equifax", name: "Equifax", logo: "🔴", status: "coming_soon", description: "Coming soon - Equifax integration" },
  { id: "transunion", name: "TransUnion", logo: "🟢", status: "coming_soon", description: "Coming soon - TransUnion integration" },
];

const bankOptions = [
  { id: "plaid", name: "Connect via Plaid", description: "Securely link your bank accounts", icon: "🏦" },
  { id: "manual", name: "Enter Manually", description: "Add account details yourself", icon: "✏️" },
];

export default function OnboardingConnectPage() {
  const [connectedBureaus, setConnectedBureaus] = useState<string[]>([]);
  const [bankConnected, setBankConnected] = useState(false);
  const [bankInfo, setBankInfo] = useState<{ name: string; mask: string } | null>(null);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Connect to credit bureau via API
  const connectBureau = async (bureauId: string) => {
    setConnecting(bureauId);
    setError(null);

    try {
      // Call the credit report API
      const response = await fetch('/api/credit-repair/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bureau: bureauId,
          action: 'connect'
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to connect to bureau');
      }

      setConnectedBureaus((prev) => [...prev, bureauId]);
    } catch (err: any) {
      setError(err.message || 'Connection failed. Please try again.');
      console.error('Bureau connection error:', err);
    } finally {
      setConnecting(null);
    }
  };

  // Connect bank via Plaid Link
  const connectBank = async () => {
    setConnecting("bank");
    setError(null);

    try {
      // Get Plaid Link token
      const tokenResponse = await fetch('/api/plaid/link-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!tokenResponse.ok) {
        throw new Error('Failed to initialize bank connection');
      }

      const { linkToken } = await tokenResponse.json();

      // In production, this would open Plaid Link
      // For now, simulate successful connection
      if (linkToken) {
        // Plaid Link would be opened here
        // After success, exchange public token
        setBankConnected(true);
        setBankInfo({ name: "Connected Bank", mask: "••••1234" });
      }
    } catch (err: any) {
      setError(err.message || 'Bank connection failed. Please try again.');
      console.error('Bank connection error:', err);
    } finally {
      setConnecting(null);
    }
  };

  return (
    <div>
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Connect Your Accounts</h1>
        <p className="text-gray-600">Link your credit bureaus and bank accounts to get started</p>
      </div>

      <div className="max-w-3xl mx-auto space-y-8">
        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
            <span className="text-red-500">⚠️</span>
            <p className="text-red-700">{error}</p>
            <button type="button" onClick={() => setError(null)} className="ml-auto text-red-500 hover:text-red-700">×</button>
          </div>
        )}

        {/* Credit Bureaus */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Credit Bureaus</h2>
          <p className="text-sm text-gray-500 mb-4">Connect to all three bureaus for a complete picture of your credit</p>
          
          <div className="space-y-4">
            {bureaus.map((bureau) => {
              const isConnected = connectedBureaus.includes(bureau.id);
              const isConnecting = connecting === bureau.id;
              
              return (
                <div key={bureau.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center gap-4">
                    <span className="text-3xl">{bureau.logo}</span>
                    <div>
                      <h3 className="font-medium text-gray-900">{bureau.name}</h3>
                      <p className="text-sm text-gray-500">{bureau.description}</p>
                    </div>
                  </div>
                  {isConnected ? (
                    <span className="px-4 py-2 bg-emerald-100 text-emerald-700 rounded-lg text-sm font-medium">
                      ✓ Connected
                    </span>
                  ) : bureau.status === 'coming_soon' ? (
                    <span className="px-4 py-2 bg-gray-100 text-gray-500 rounded-lg text-sm font-medium">
                      Coming Soon
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => connectBureau(bureau.id)}
                      disabled={isConnecting}
                      className="px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm font-medium hover:bg-emerald-600 disabled:opacity-50 transition"
                    >
                      {isConnecting ? "Connecting..." : "Connect"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          
          {connectedBureaus.length === 3 && (
            <div className="mt-4 p-4 bg-emerald-50 rounded-lg text-center">
              <p className="text-emerald-700 font-medium">🎉 All bureaus connected! Your reports are being analyzed.</p>
            </div>
          )}
        </div>

        {/* Bank Connection */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Bank Account (Optional)</h2>
          <p className="text-sm text-gray-500 mb-4">Link your bank to track payments and get personalized recommendations</p>
          
          {bankConnected ? (
            <div className="p-4 bg-emerald-50 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🏦</span>
                <div>
                  <p className="font-medium text-gray-900">Bank Account Connected</p>
                  <p className="text-sm text-gray-500">{bankInfo?.name || 'Bank'} {bankInfo?.mask || '••••'}</p>
                </div>
              </div>
              <span className="text-emerald-600">✓</span>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {bankOptions.map((option) => (
                <button
                  type="button"
                  key={option.id}
                  onClick={option.id === "plaid" ? connectBank : undefined}
                  disabled={connecting === "bank"}
                  className="p-4 border border-gray-200 rounded-lg text-left hover:border-emerald-300 transition disabled:opacity-50"
                >
                  <span className="text-2xl mb-2 block">{option.icon}</span>
                  <h3 className="font-medium text-gray-900">{option.name}</h3>
                  <p className="text-sm text-gray-500">{option.description}</p>
                  {connecting === "bank" && option.id === "plaid" && (
                    <p className="text-sm text-emerald-500 mt-2">Connecting...</p>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Security Note */}
        <div className="bg-blue-50 rounded-xl p-4 flex items-start gap-3">
          <span className="text-xl">🔒</span>
          <div>
            <h3 className="font-medium text-blue-900">Your data is secure</h3>
            <p className="text-sm text-blue-700">We use bank-level 256-bit encryption. Your credentials are never stored on our servers.</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between mt-8 max-w-3xl mx-auto">
        <Link href="/onboarding/goals" className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition">
          ← Back
        </Link>
        <Link href="/onboarding/complete" className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-blue-500 text-white rounded-lg hover:shadow-lg transition">
          Continue →
        </Link>
      </div>
    </div>
  );
}

