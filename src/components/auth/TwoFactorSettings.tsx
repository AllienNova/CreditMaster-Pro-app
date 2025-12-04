'use client';

import { useState, useEffect } from 'react';
import { authService } from '@/lib/auth/auth-service';
import { useAuth } from '@/hooks/useAuth';

export default function TwoFactorSettings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isEnabled, setIsEnabled] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [factorId, setFactorId] = useState<string | null>(null);
  const [showSetup, setShowSetup] = useState(false);

  useEffect(() => {
    checkMFAStatus();
  }, []);

  const checkMFAStatus = async () => {
    try {
      const factors = await authService.getMFAFactors();
      if (factors && factors.totp && factors.totp.length > 0) {
        setIsEnabled(true);
        setFactorId(factors.totp[0].id);
      }
    } catch (err) {
      console.error('Error checking MFA status:', err);
    }
  };

  const handleEnableTwoFactor = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await authService.enableTwoFactor();

      if (!response.success) {
        throw new Error(response.error || 'Failed to enable 2FA');
      }

      setQrCode(response.qrCode || null);
      setSecret(response.secret || null);
      setShowSetup(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to enable 2FA');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (!factorId && !secret) {
        throw new Error('No factor ID available');
      }

      // For initial setup, we need to get the factor ID from the enrollment
      const factors = await authService.getMFAFactors();
      const currentFactorId = factorId || (factors?.totp?.[0]?.id);

      if (!currentFactorId) {
        throw new Error('Failed to get factor ID');
      }

      const response = await authService.verifyTwoFactor(currentFactorId, verificationCode);

      if (!response.success) {
        throw new Error(response.error || 'Invalid verification code');
      }

      setSuccess('Two-factor authentication enabled successfully!');
      setIsEnabled(true);
      setFactorId(currentFactorId);
      setShowSetup(false);
      setQrCode(null);
      setSecret(null);
      setVerificationCode('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to verify code');
    } finally {
      setLoading(false);
    }
  };

  const handleDisableTwoFactor = async () => {
    if (!confirm('Are you sure you want to disable two-factor authentication?')) {
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (!factorId) {
        throw new Error('No factor ID available');
      }

      const response = await authService.disableTwoFactor(factorId);

      if (!response.success) {
        throw new Error(response.error || 'Failed to disable 2FA');
      }

      setSuccess('Two-factor authentication disabled successfully');
      setIsEnabled(false);
      setFactorId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disable 2FA');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-600">Please log in to manage two-factor authentication.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Two-Factor Authentication</h3>
          <p className="text-sm text-gray-600 mt-1">
            Add an extra layer of security to your account
          </p>
        </div>
        <div className={`px-3 py-1 rounded-full text-sm font-medium ${
          isEnabled 
            ? 'bg-green-100 text-green-800' 
            : 'bg-gray-100 text-gray-800'
        }`}>
          {isEnabled ? 'Enabled' : 'Disabled'}
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 rounded-lg bg-red-50 text-red-800 border border-red-200">
          <p className="text-sm">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 rounded-lg bg-green-50 text-green-800 border border-green-200">
          <p className="text-sm">{success}</p>
        </div>
      )}

      {!isEnabled && !showSetup && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">Why enable 2FA?</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Protect your account from unauthorized access</li>
              <li>• Required for accessing sensitive features</li>
              <li>• Industry-standard security practice</li>
            </ul>
          </div>

          <button
            onClick={handleEnableTwoFactor}
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-6 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Setting up...' : 'Enable Two-Factor Authentication'}
          </button>
        </div>
      )}

      {showSetup && qrCode && (
        <div className="space-y-4">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
            <h4 className="font-medium text-gray-900 mb-4">Scan QR Code</h4>
            <p className="text-sm text-gray-600 mb-4">
              Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
            </p>
            <div className="flex justify-center mb-4">
              <img src={qrCode} alt="2FA QR Code" className="w-48 h-48" />
            </div>
            {secret && (
              <div className="bg-white border border-gray-300 rounded p-3">
                <p className="text-xs text-gray-600 mb-1">Or enter this code manually:</p>
                <code className="text-sm font-mono text-gray-900 break-all">{secret}</code>
              </div>
            )}
          </div>

          <form onSubmit={handleVerifyCode} className="space-y-4">
            <div>
              <label htmlFor="verificationCode" className="block text-sm font-medium text-gray-700 mb-2">
                Verification Code
              </label>
              <input
                id="verificationCode"
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                required
                maxLength={6}
                pattern="[0-9]{6}"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="Enter 6-digit code"
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter the 6-digit code from your authenticator app
              </p>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowSetup(false);
                  setQrCode(null);
                  setSecret(null);
                  setVerificationCode('');
                }}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || verificationCode.length !== 6}
                className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-6 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Verifying...' : 'Verify & Enable'}
              </button>
            </div>
          </form>
        </div>
      )}

      {isEnabled && (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm text-green-800">
              ✓ Two-factor authentication is currently enabled on your account.
            </p>
          </div>

          <button
            onClick={handleDisableTwoFactor}
            disabled={loading}
            className="w-full bg-red-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Disabling...' : 'Disable Two-Factor Authentication'}
          </button>
        </div>
      )}
    </div>
  );
}

