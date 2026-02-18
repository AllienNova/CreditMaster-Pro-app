"use client";

/**
 * MFA Management Panel
 *
 * Comprehensive UI for managing multi-factor authentication methods
 * including TOTP, security keys, biometrics, and backup codes.
 */

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  Smartphone,
  Key,
  Fingerprint,
  QrCode,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  AlertTriangle,
  RefreshCw,
  Copy,
  Download,
  Eye,
  EyeOff,
  Loader2,
  ChevronRight,
  Info,
} from "lucide-react";

// ============================================================================
// TYPES
// ============================================================================

export type MFAMethodType = "totp" | "webauthn" | "biometric";
export type MFAMethodStatus = "verified" | "pending" | "disabled";

export interface MFAMethod {
  id: string;
  type: MFAMethodType;
  name: string;
  status: MFAMethodStatus;
  createdAt: Date;
  lastUsedAt?: Date;
}

export interface BackupCodesStatus {
  hasBackupCodes: boolean;
  remaining: number;
  total: number;
}

export interface MFAManagementPanelProps {
  userId: string;
  methods: MFAMethod[];
  backupCodesStatus: BackupCodesStatus;
  onEnrollTOTP: () => Promise<{
    qrCode: string;
    secret: string;
    factorId: string;
  }>;
  onVerifyTOTP: (factorId: string, code: string) => Promise<boolean>;
  onRemoveMethod: (methodId: string) => Promise<boolean>;
  onRenameMethod: (methodId: string, newName: string) => Promise<boolean>;
  onEnrollSecurityKey: (
    name?: string,
  ) => Promise<{ success: boolean; error?: string }>;
  onEnrollBiometric: (
    name?: string,
  ) => Promise<{ success: boolean; error?: string }>;
  onGenerateBackupCodes: () => Promise<string[]>;
  isLoading?: boolean;
  isBiometricAvailable?: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const METHOD_ICONS: Record<MFAMethodType, React.ReactNode> = {
  totp: <Smartphone className="w-5 h-5" />,
  webauthn: <Key className="w-5 h-5" />,
  biometric: <Fingerprint className="w-5 h-5" />,
};

const METHOD_LABELS: Record<MFAMethodType, string> = {
  totp: "Authenticator App",
  webauthn: "Security Key",
  biometric: "Biometric",
};

// ============================================================================
// COMPONENT
// ============================================================================

export function MFAManagementPanel({
  userId,
  methods,
  backupCodesStatus,
  onEnrollTOTP,
  onVerifyTOTP,
  onRemoveMethod,
  onRenameMethod,
  onEnrollSecurityKey,
  onEnrollBiometric,
  onGenerateBackupCodes,
  isLoading = false,
  isBiometricAvailable = false,
}: MFAManagementPanelProps) {
  // State
  const [activeModal, setActiveModal] = useState<
    "totp" | "security-key" | "biometric" | "backup-codes" | null
  >(null);
  const [totpSetup, setTotpSetup] = useState<{
    qrCode: string;
    secret: string;
    factorId: string;
  } | null>(null);
  const [totpCode, setTotpCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [editingMethod, setEditingMethod] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const verifiedMethods = methods.filter((m) => m.status === "verified");
  const hasMFA = verifiedMethods.length > 0;

  // Start TOTP enrollment
  const handleStartTOTP = useCallback(async () => {
    setError(null);
    setProcessingId("totp-enroll");
    try {
      const result = await onEnrollTOTP();
      setTotpSetup(result);
      setActiveModal("totp");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to start enrollment",
      );
    } finally {
      setProcessingId(null);
    }
  }, [onEnrollTOTP]);

  // Verify TOTP code
  const handleVerifyTOTP = useCallback(async () => {
    if (!totpSetup || totpCode.length !== 6) return;

    setError(null);
    setProcessingId("totp-verify");
    try {
      const success = await onVerifyTOTP(totpSetup.factorId, totpCode);
      if (success) {
        setActiveModal(null);
        setTotpSetup(null);
        setTotpCode("");
      } else {
        setError("Invalid code. Please try again.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setProcessingId(null);
    }
  }, [totpSetup, totpCode, onVerifyTOTP]);

  // Enroll security key
  const handleEnrollSecurityKey = useCallback(async () => {
    setError(null);
    setProcessingId("security-key");
    try {
      const result = await onEnrollSecurityKey();
      if (result.success) {
        setActiveModal(null);
      } else {
        setError(result.error || "Failed to enroll security key");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Enrollment failed");
    } finally {
      setProcessingId(null);
    }
  }, [onEnrollSecurityKey]);

  // Enroll biometric
  const handleEnrollBiometric = useCallback(async () => {
    setError(null);
    setProcessingId("biometric");
    try {
      const result = await onEnrollBiometric();
      if (result.success) {
        setActiveModal(null);
      } else {
        setError(result.error || "Failed to enroll biometric");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Enrollment failed");
    } finally {
      setProcessingId(null);
    }
  }, [onEnrollBiometric]);

  // Generate backup codes
  const handleGenerateBackupCodes = useCallback(async () => {
    setError(null);
    setProcessingId("backup-codes");
    try {
      const codes = await onGenerateBackupCodes();
      setBackupCodes(codes);
      setShowBackupCodes(true);
      setActiveModal("backup-codes");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate codes");
    } finally {
      setProcessingId(null);
    }
  }, [onGenerateBackupCodes]);

  // Remove method
  const handleRemoveMethod = useCallback(
    async (methodId: string) => {
      setProcessingId(methodId);
      try {
        await onRemoveMethod(methodId);
      } finally {
        setProcessingId(null);
      }
    },
    [onRemoveMethod],
  );

  // Rename method
  const handleSaveRename = useCallback(
    async (methodId: string) => {
      if (!editName.trim()) return;

      setProcessingId(methodId);
      try {
        await onRenameMethod(methodId, editName.trim());
        setEditingMethod(null);
        setEditName("");
      } finally {
        setProcessingId(null);
      }
    },
    [editName, onRenameMethod],
  );

  // Copy backup codes to clipboard
  const copyBackupCodes = useCallback(() => {
    if (!backupCodes) return;
    navigator.clipboard.writeText(backupCodes.join("\n"));
  }, [backupCodes]);

  // Download backup codes
  const downloadBackupCodes = useCallback(() => {
    if (!backupCodes) return;
    const content = `Fynvita Backup Recovery Codes\n\nKeep these codes safe. Each code can only be used once.\n\n${backupCodes.join("\n")}\n\nGenerated: ${new Date().toISOString()}`;
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "fynvita-backup-codes.txt";
    a.click();
    URL.revokeObjectURL(url);
  }, [backupCodes]);

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield
              className={`w-5 h-5 ${hasMFA ? "text-emerald-400" : "text-gray-500 dark:text-slate-400"}`}
            />
            <div>
              <h2 className="text-lg font-semibold text-white">
                Two-Factor Authentication
              </h2>
              <p className="text-sm text-gray-400 dark:text-slate-500">
                {hasMFA
                  ? `${verifiedMethods.length} method${verifiedMethods.length > 1 ? "s" : ""} enabled`
                  : "Add an extra layer of security"}
              </p>
            </div>
          </div>
          {hasMFA && (
            <span className="px-3 py-1 text-xs font-medium bg-emerald-500/20 text-emerald-400 rounded-full">
              Protected
            </span>
          )}
        </div>
      </div>

      {/* Methods List */}
      <div className="divide-y divide-gray-800">
        {methods.map((method) => (
          <div key={method.id} className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div
                  className={`p-2 rounded-lg ${
                    method.status === "verified"
                      ? "bg-emerald-500/10 text-emerald-400"
                      : "bg-gray-800 text-gray-500 dark:text-slate-400"
                  }`}
                >
                  {METHOD_ICONS[method.type]}
                </div>
                <div>
                  {editingMethod === method.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="px-2 py-1 text-sm bg-gray-800 border border-gray-700 rounded text-white"
                        autoFocus
                      />
                      <button
                        onClick={() => handleSaveRename(method.id)}
                        disabled={processingId === method.id}
                        className="p-1 text-emerald-400 hover:text-emerald-300"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setEditingMethod(null);
                          setEditName("");
                        }}
                        className="p-1 text-gray-400 dark:text-slate-500 hover:text-white"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <p className="text-white font-medium">{method.name}</p>
                      <p className="text-xs text-gray-500 dark:text-slate-400">
                        {METHOD_LABELS[method.type]} • Added{" "}
                        {method.createdAt.toLocaleDateString()}
                        {method.lastUsedAt &&
                          ` • Last used ${method.lastUsedAt.toLocaleDateString()}`}
                      </p>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {method.status === "pending" && (
                  <span className="px-2 py-1 text-xs bg-amber-500/20 text-amber-400 rounded">
                    Pending
                  </span>
                )}
                {editingMethod !== method.id && (
                  <>
                    <button
                      onClick={() => {
                        setEditingMethod(method.id);
                        setEditName(method.name);
                      }}
                      className="p-2 text-gray-400 dark:text-slate-500 hover:text-white rounded-lg hover:bg-gray-800 transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleRemoveMethod(method.id)}
                      disabled={processingId === method.id}
                      className="p-2 text-gray-400 dark:text-slate-500 hover:text-red-400 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
                    >
                      {processingId === method.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}

        {methods.length === 0 && (
          <div className="px-6 py-8 text-center">
            <Shield className="w-12 h-12 text-gray-600 dark:text-slate-300 mx-auto mb-3" />
            <p className="text-gray-400 dark:text-slate-500">
              No authentication methods configured
            </p>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
              Add a method below to secure your account
            </p>
          </div>
        )}
      </div>

      {/* Add Method Options */}
      <div className="px-6 py-4 border-t border-gray-800 bg-gray-800/30">
        <p className="text-sm text-gray-400 dark:text-slate-500 mb-3">
          Add authentication method:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Authenticator App */}
          <button
            onClick={handleStartTOTP}
            disabled={processingId === "totp-enroll" || isLoading}
            className="flex items-center gap-3 p-4 bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-700 hover:border-gray-600 transition-colors text-left disabled:opacity-50"
          >
            <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg">
              <Smartphone className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-white">
                Authenticator App
              </p>
              <p className="text-xs text-gray-500 dark:text-slate-400">
                Google, Authy, etc.
              </p>
            </div>
            {processingId === "totp-enroll" ? (
              <Loader2 className="w-4 h-4 text-gray-500 dark:text-slate-400 animate-spin" />
            ) : (
              <Plus className="w-4 h-4 text-gray-500 dark:text-slate-400" />
            )}
          </button>

          {/* Security Key */}
          <button
            onClick={() => setActiveModal("security-key")}
            disabled={isLoading}
            className="flex items-center gap-3 p-4 bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-700 hover:border-gray-600 transition-colors text-left disabled:opacity-50"
          >
            <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg">
              <Key className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-white">Security Key</p>
              <p className="text-xs text-gray-500 dark:text-slate-400">
                YubiKey, Titan, etc.
              </p>
            </div>
            <Plus className="w-4 h-4 text-gray-500 dark:text-slate-400" />
          </button>

          {/* Biometric */}
          <button
            onClick={() => setActiveModal("biometric")}
            disabled={!isBiometricAvailable || isLoading}
            className="flex items-center gap-3 p-4 bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-700 hover:border-gray-600 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div
              className={`p-2 rounded-lg ${isBiometricAvailable ? "bg-emerald-500/10 text-emerald-400" : "bg-gray-700 text-gray-500 dark:text-slate-400"}`}
            >
              <Fingerprint className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-white">Biometric</p>
              <p className="text-xs text-gray-500 dark:text-slate-400">
                {isBiometricAvailable ? "Face ID, Touch ID" : "Not available"}
              </p>
            </div>
            <Plus className="w-4 h-4 text-gray-500 dark:text-slate-400" />
          </button>
        </div>
      </div>

      {/* Backup Codes Section */}
      <div className="px-6 py-4 border-t border-gray-800">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white font-medium">Backup Codes</p>
            <p className="text-sm text-gray-400 dark:text-slate-500">
              {backupCodesStatus.hasBackupCodes
                ? `${backupCodesStatus.remaining} of ${backupCodesStatus.total} codes remaining`
                : "Generate codes for account recovery"}
            </p>
          </div>
          <button
            onClick={handleGenerateBackupCodes}
            disabled={processingId === "backup-codes" || isLoading}
            className="px-4 py-2 text-sm text-white bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {processingId === "backup-codes" ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            {backupCodesStatus.hasBackupCodes ? "Regenerate" : "Generate"}
          </button>
        </div>

        {backupCodesStatus.hasBackupCodes &&
          backupCodesStatus.remaining <= 2 && (
            <div className="mt-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-200">
                You're running low on backup codes. Consider generating new
                ones.
              </p>
            </div>
          )}
      </div>

      {/* TOTP Setup Modal */}
      <AnimatePresence>
        {activeModal === "totp" && totpSetup && (
          <ModalOverlay
            onClose={() => {
              setActiveModal(null);
              setTotpSetup(null);
              setTotpCode("");
            }}
          >
            <div className="p-6 space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-white">
                  Set Up Authenticator App
                </h3>
                <p className="text-sm text-gray-400 dark:text-slate-500 mt-1">
                  Scan the QR code with your authenticator app
                </p>
              </div>

              {/* QR Code */}
              <div className="flex justify-center">
                <div className="bg-white dark:bg-slate-800 p-4 rounded-lg">
                  <img
                    src={totpSetup.qrCode}
                    alt="QR Code"
                    className="w-48 h-48"
                  />
                </div>
              </div>

              {/* Manual Entry */}
              <div className="text-center">
                <p className="text-xs text-gray-500 dark:text-slate-400 mb-2">
                  Or enter this code manually:
                </p>
                <code className="px-3 py-2 bg-gray-800 text-emerald-400 rounded font-mono text-sm">
                  {totpSetup.secret}
                </code>
              </div>

              {/* Verification */}
              <div>
                <label className="block text-sm text-gray-400 dark:text-slate-500 mb-2">
                  Enter the 6-digit code from your app:
                </label>
                <input
                  type="text"
                  value={totpCode}
                  onChange={(e) =>
                    setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  placeholder="000000"
                  className="w-full px-4 py-3 text-center text-2xl font-mono tracking-widest bg-gray-800 border border-gray-700 rounded-lg text-white"
                  autoFocus
                />
              </div>

              {error && (
                <p className="text-sm text-red-400 text-center">{error}</p>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setActiveModal(null);
                    setTotpSetup(null);
                    setTotpCode("");
                  }}
                  className="flex-1 px-4 py-2 text-gray-300 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleVerifyTOTP}
                  disabled={
                    totpCode.length !== 6 || processingId === "totp-verify"
                  }
                  className="flex-1 px-4 py-2 text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {processingId === "totp-verify" && (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  )}
                  Verify
                </button>
              </div>
            </div>
          </ModalOverlay>
        )}
      </AnimatePresence>

      {/* Security Key Modal */}
      <AnimatePresence>
        {activeModal === "security-key" && (
          <ModalOverlay onClose={() => setActiveModal(null)}>
            <div className="p-6 space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Key className="w-8 h-8 text-blue-400" />
                </div>
                <h3 className="text-lg font-semibold text-white">
                  Add Security Key
                </h3>
                <p className="text-sm text-gray-400 dark:text-slate-500 mt-1">
                  Insert your security key and follow the prompts
                </p>
              </div>

              {error && (
                <p className="text-sm text-red-400 text-center">{error}</p>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setActiveModal(null)}
                  className="flex-1 px-4 py-2 text-gray-300 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleEnrollSecurityKey}
                  disabled={processingId === "security-key"}
                  className="flex-1 px-4 py-2 text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {processingId === "security-key" && (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  )}
                  Register Key
                </button>
              </div>
            </div>
          </ModalOverlay>
        )}
      </AnimatePresence>

      {/* Biometric Modal */}
      <AnimatePresence>
        {activeModal === "biometric" && (
          <ModalOverlay onClose={() => setActiveModal(null)}>
            <div className="p-6 space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Fingerprint className="w-8 h-8 text-emerald-400" />
                </div>
                <h3 className="text-lg font-semibold text-white">
                  Enable Biometric Login
                </h3>
                <p className="text-sm text-gray-400 dark:text-slate-500 mt-1">
                  Use Face ID or Touch ID to sign in quickly
                </p>
              </div>

              {error && (
                <p className="text-sm text-red-400 text-center">{error}</p>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setActiveModal(null)}
                  className="flex-1 px-4 py-2 text-gray-300 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleEnrollBiometric}
                  disabled={processingId === "biometric"}
                  className="flex-1 px-4 py-2 text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {processingId === "biometric" && (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  )}
                  Enable
                </button>
              </div>
            </div>
          </ModalOverlay>
        )}
      </AnimatePresence>

      {/* Backup Codes Modal */}
      <AnimatePresence>
        {activeModal === "backup-codes" && backupCodes && (
          <ModalOverlay
            onClose={() => {
              setActiveModal(null);
              setBackupCodes(null);
            }}
          >
            <div className="p-6 space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-white">
                  Your Backup Codes
                </h3>
                <p className="text-sm text-gray-400 dark:text-slate-500 mt-1">
                  Save these codes in a secure place. Each code can only be used
                  once.
                </p>
              </div>

              <div className="bg-gray-800 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-2">
                  {backupCodes.map((code, idx) => (
                    <div
                      key={idx}
                      className="font-mono text-sm text-center py-2 bg-gray-900 rounded"
                    >
                      {showBackupCodes ? code : "••••••••"}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={() => setShowBackupCodes(!showBackupCodes)}
                  className="flex items-center gap-2 text-sm text-gray-400 dark:text-slate-500 hover:text-white transition-colors"
                >
                  {showBackupCodes ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                  {showBackupCodes ? "Hide" : "Show"}
                </button>
                <button
                  onClick={copyBackupCodes}
                  className="flex items-center gap-2 text-sm text-gray-400 dark:text-slate-500 hover:text-white transition-colors"
                >
                  <Copy className="w-4 h-4" />
                  Copy
                </button>
                <button
                  onClick={downloadBackupCodes}
                  className="flex items-center gap-2 text-sm text-gray-400 dark:text-slate-500 hover:text-white transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download
                </button>
              </div>

              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                <p className="text-sm text-amber-200 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  These codes won't be shown again. Make sure to save them now.
                </p>
              </div>

              <button
                onClick={() => {
                  setActiveModal(null);
                  setBackupCodes(null);
                }}
                className="w-full px-4 py-2 text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors"
              >
                I've Saved My Codes
              </button>
            </div>
          </ModalOverlay>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function ModalOverlay({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/70"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-md bg-gray-900 rounded-xl border border-gray-800"
      >
        {children}
      </motion.div>
    </div>
  );
}

export default MFAManagementPanel;
