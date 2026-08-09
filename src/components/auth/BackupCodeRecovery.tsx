"use client";

/**
 * Backup Code Recovery Component
 *
 * UI for recovering account access using backup codes when
 * the user doesn't have access to their primary MFA method.
 */

import React, { useState, useCallback, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Shield,
  AlertTriangle,
  ArrowLeft,
  Check,
  Loader2,
  HelpCircle,
} from "lucide-react";

// ============================================================================
// TYPES
// ============================================================================

export interface BackupCodeRecoveryProps {
  onVerify: (code: string) => Promise<{ success: boolean; error?: string }>;
  onBack: () => void;
  onSuccess: () => void;
  attemptsRemaining?: number;
  isLocked?: boolean;
  lockoutEndTime?: Date;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function BackupCodeRecovery({
  onVerify,
  onBack,
  onSuccess,
  attemptsRemaining = 5,
  isLocked = false,
  lockoutEndTime,
}: BackupCodeRecoveryProps) {
  const [code, setCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(attemptsRemaining);
  const [lockoutRemaining, setLockoutRemaining] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Format code with dashes for display (e.g., XXXX-XXXX)
  const formatCode = (value: string): string => {
    const cleaned = value.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
    if (cleaned.length <= 4) return cleaned;
    return `${cleaned.slice(0, 4)}-${cleaned.slice(4, 8)}`;
  };

  // Handle code input
  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^A-Za-z0-9-]/g, "").toUpperCase();
    if (value.replace(/-/g, "").length <= 8) {
      setCode(formatCode(value));
      setError(null);
    }
  };

  // Handle paste
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").trim();
    const cleaned = pasted
      .replace(/[^A-Za-z0-9]/g, "")
      .toUpperCase()
      .slice(0, 8);
    setCode(formatCode(cleaned));
  };

  // Submit verification
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      const cleanCode = code.replace(/-/g, "");
      if (cleanCode.length !== 8) {
        setError("Please enter a complete 8-character backup code");
        return;
      }

      setIsVerifying(true);
      setError(null);

      try {
        const result = await onVerify(cleanCode);

        if (result.success) {
          onSuccess();
        } else {
          setError(result.error || "Invalid backup code");
          setAttempts((prev) => Math.max(0, prev - 1));
          setCode("");
          inputRef.current?.focus();
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Verification failed");
      } finally {
        setIsVerifying(false);
      }
    },
    [code, onVerify, onSuccess],
  );

  // Lockout countdown
  useEffect(() => {
    if (!isLocked || !lockoutEndTime) {
      setLockoutRemaining(null);
      return;
    }

    const updateCountdown = () => {
      const remaining = Math.max(0, lockoutEndTime.getTime() - Date.now());
      setLockoutRemaining(Math.ceil(remaining / 1000));
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [isLocked, lockoutEndTime]);

  // Auto-focus input
  useEffect(() => {
    if (!isLocked) {
      inputRef.current?.focus();
    }
  }, [isLocked]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-800">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-sm text-gray-400 dark:text-slate-500 hover:text-white transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            Back to login
          </button>

          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 rounded-lg">
              <Shield className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-white">
                Use Backup Code
              </h1>
              <p className="text-sm text-gray-400 dark:text-slate-500">
                Enter one of your recovery codes to sign in
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {isLocked && lockoutRemaining ? (
            // Lockout state
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-red-400" />
              </div>
              <h2 className="text-lg font-medium text-white mb-2">
                Account Temporarily Locked
              </h2>
              <p className="text-gray-400 dark:text-slate-500 mb-4">
                Too many failed attempts. Please try again in:
              </p>
              <div className="text-3xl font-mono font-bold text-red-400">
                {formatTime(lockoutRemaining)}
              </div>
            </div>
          ) : (
            // Input form
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label
                  htmlFor="backup-code"
                  className="block text-sm text-gray-400 dark:text-slate-500 mb-2"
                >
                  Backup Code
                </label>
                <input
                  ref={inputRef}
                  id="backup-code"
                  type="text"
                  value={code}
                  onChange={handleCodeChange}
                  onPaste={handlePaste}
                  placeholder="XXXX-XXXX"
                  disabled={isVerifying}
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="characters"
                  spellCheck="false"
                  className="w-full px-4 py-3 text-center text-2xl font-mono tracking-widest bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 disabled:opacity-50"
                />
              </div>

              {/* Error message */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-3"
                >
                  <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
                  <div>
                    <p className="text-sm text-red-200">{error}</p>
                    {attempts < attemptsRemaining && (
                      <p className="text-xs text-red-400 mt-1">
                        {attempts} attempt{attempts !== 1 ? "s" : ""} remaining
                      </p>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Warning for low attempts */}
              {attempts <= 2 && attempts > 0 && !error && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
                  <p className="text-sm text-amber-200">
                    Only {attempts} attempt{attempts !== 1 ? "s" : ""} remaining
                    before temporary lockout.
                  </p>
                </div>
              )}

              {/* Submit button */}
              <button
                type="submit"
                disabled={isVerifying || code.replace(/-/g, "").length !== 8}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    Verify Code
                  </>
                )}
              </button>
            </form>
          )}

          {/* Help section */}
          <div className="mt-6 pt-6 border-t border-gray-800">
            <div className="flex items-start gap-3 text-sm">
              <HelpCircle className="w-5 h-5 text-gray-500 dark:text-slate-400 shrink-0" />
              <div className="text-gray-400 dark:text-slate-500">
                <p className="font-medium text-gray-300 mb-1">
                  Can't find your backup codes?
                </p>
                <p>
                  If you've lost access to your backup codes and your
                  authenticator, please{" "}
                  <a
                    href="/support"
                    className="text-blue-400 hover:text-blue-300"
                  >
                    contact support
                  </a>{" "}
                  for account recovery assistance.
                </p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Info card */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="mt-4 p-4 bg-gray-800/50 rounded-lg border border-gray-700"
      >
        <h3 className="text-sm font-medium text-gray-300 mb-2">
          About Backup Codes
        </h3>
        <ul className="text-xs text-gray-500 dark:text-slate-400 space-y-1">
          <li>• Each backup code can only be used once</li>
          <li>• After using a code, it will be permanently invalidated</li>
          <li>• Generate new codes from your security settings</li>
          <li>• Keep your codes in a safe, accessible location</li>
        </ul>
      </motion.div>
    </div>
  );
}

export default BackupCodeRecovery;
