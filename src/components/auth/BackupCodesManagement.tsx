'use client';

import { useState, useEffect, useCallback } from 'react';
import { backupCodesService } from '@/lib/auth/backup-codes';
import { useAuth } from '@/hooks/useAuth';

export default function BackupCodesManagement() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [remainingCount, setRemainingCount] = useState(0);
  const [showCodes, setShowCodes] = useState(false);

  const loadRemainingCount = useCallback(async () => {
    if (!user) return;

    try {
      const count = await backupCodesService.getRemainingCodesCount(user.id);
      setRemainingCount(count);
    } catch (_error) {
      // Error logged
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      void loadRemainingCount();
    }
  }, [user, loadRemainingCount]);

  const handleGenerateCodes = async () => {
    if (!user) return;

    if (remainingCount > 0) {
      if (
        !confirm('This will invalidate your existing backup codes. Continue?')
      ) {
        return;
      }
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await backupCodesService.generateBackupCodes(user.id);

      if (!response.success || !response.codes) {
        throw new Error(response.error || 'Failed to generate backup codes');
      }

      setBackupCodes(response.codes);
      setShowCodes(true);
      setSuccess(
        'Backup codes generated successfully! Save them in a secure place.'
      );
      await loadRemainingCount();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to generate backup codes'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadCodes = () => {
    const text = backupCodes.join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Fynvita-pro-backup-codes.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopyToClipboard = () => {
    const text = backupCodes.join('\n');
    navigator.clipboard.writeText(text);
    setSuccess('Backup codes copied to clipboard!');
  };

  const handlePrint = () => {
    const printWindow = window.open('', '', 'width=600,height=400');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Fynvita - Backup Codes</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; }
              h1 { color: #667eea; }
              .codes { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin: 20px 0; }
              .code { background: #f3f4f6; padding: 10px; border-radius: 5px; font-family: monospace; font-size: 14px; }
              .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }
            </style>
          </head>
          <body>
            <h1>Fynvita - Backup Codes</h1>
            <p>Generated: ${new Date().toLocaleString()}</p>
            <div class="warning">
              <strong>Important:</strong> Store these codes in a secure place. Each code can only be used once.
            </div>
            <div class="codes">
              ${backupCodes.map((code) => `<div class="code">${code}</div>`).join('')}
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  if (!user) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
        <p className="text-gray-600 dark:text-slate-300">Please log in to manage backup codes.</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Backup Codes</h3>
          <p className="text-sm text-gray-600 dark:text-slate-300 mt-1">
            Use backup codes to access your account if you lose your 2FA device
          </p>
        </div>
        {remainingCount > 0 && (
          <div className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
            {remainingCount} codes remaining
          </div>
        )}
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

      {!showCodes ? (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">
              What are backup codes?
            </h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• One-time use codes for 2FA recovery</li>
              <li>• Use them if you lose access to your authenticator app</li>
              <li>• Each code can only be used once</li>
              <li>
                • Store them in a secure place (password manager, safe, etc.)
              </li>
            </ul>
          </div>

          {remainingCount === 0 ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                You don't have any backup codes. Generate them now to ensure
                you can recover your account.
              </p>
            </div>
          ) : (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-800">
                You have {remainingCount} unused backup codes.
              </p>
            </div>
          )}

          <button
            onClick={handleGenerateCodes}
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:from-blue-700 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading
              ? 'Generating...'
              : remainingCount > 0
                ? 'Regenerate Backup Codes'
                : 'Generate Backup Codes'}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800 font-medium">
              Save these codes now! You won't be able to see them again.
            </p>
          </div>

          <div className="bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg p-6">
            <div className="grid grid-cols-2 gap-3">
              {backupCodes.map((code, index) => (
                <div
                  key={index}
                  className="bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded p-3 font-mono text-center text-lg font-semibold"
                >
                  {code}
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleDownloadCodes}
              className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-all"
            >
              Download
            </button>
            <button
              onClick={handleCopyToClipboard}
              className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-all"
            >
              Copy
            </button>
            <button
              onClick={handlePrint}
              className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-all"
            >
              Print
            </button>
          </div>

          <button
            onClick={() => {
              setShowCodes(false);
              setBackupCodes([]);
            }}
            className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-700 dark:text-slate-200 font-medium hover:bg-gray-50 dark:hover:bg-slate-700 dark:bg-slate-900 transition-all"
          >
            I've Saved My Codes
          </button>

          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h4 className="font-medium text-red-900 mb-2">
              Important Security Tips
            </h4>
            <ul className="text-sm text-red-800 space-y-1">
              <li>• Store codes in a password manager or secure location</li>
              <li>• Don't share codes with anyone</li>
              <li>• Each code can only be used once</li>
              <li>
                • Generate new codes if you suspect they've been compromised
              </li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
