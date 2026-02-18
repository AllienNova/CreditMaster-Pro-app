"use client";

import { useAuth } from "@/hooks/useAuth";
import TwoFactorSettings from "@/components/auth/TwoFactorSettings";
import SessionManagement from "@/components/auth/SessionManagement";
import BackupCodesManagement from "@/components/auth/BackupCodesManagement";
import PasskeyManagement from "@/components/auth/PasskeyManagement";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function SecuritySettingsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Get user metadata
  const userName =
    user.user_metadata?.name || user.user_metadata?.full_name || "Not set";
  const userRole =
    user.app_metadata?.role || user.user_metadata?.role || "user";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Security Settings
              </h1>
              <p className="text-gray-600 dark:text-slate-300 mt-1">
                Manage your account security and authentication
              </p>
            </div>
            <button
              onClick={() => router.push("/dashboard")}
              className="px-4 py-2 text-gray-600 hover:text-gray-900 dark:text-white dark:hover:text-white font-medium"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* User Info */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Account Information
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-slate-300">
                  Email
                </label>
                <p className="text-gray-900 dark:text-white">{user.email}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-slate-300">
                  Name
                </label>
                <p className="text-gray-900 dark:text-white">{userName}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-slate-300">
                  Role
                </label>
                <p className="text-gray-900 dark:text-white capitalize">
                  {userRole}
                </p>
              </div>
            </div>
          </div>

          {/* Passkeys / WebAuthn */}
          <PasskeyManagement
            userId={user.id}
            userName={user.email || ""}
            displayName={userName}
          />

          {/* Two-Factor Authentication */}
          <TwoFactorSettings />

          {/* Backup Codes */}
          <BackupCodesManagement />

          {/* Session Management */}
          <SessionManagement />

          {/* Password Management */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Password
            </h3>
            <p className="text-sm text-gray-600 dark:text-slate-300 mb-4">
              Change your password or reset it if you have forgotten it
            </p>
            <button
              onClick={() => router.push("/auth/login")}
              className="px-6 py-2 bg-gray-100 text-gray-700 dark:text-slate-200 rounded-lg font-medium hover:bg-gray-200 dark:bg-slate-700 transition-all"
            >
              Change Password
            </button>
          </div>

          {/* Active Sessions */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Active Sessions
            </h3>
            <p className="text-sm text-gray-600 dark:text-slate-300 mb-4">
              Manage your active sessions across different devices
            </p>
            <div className="bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    Current Session
                  </p>
                  <p className="text-sm text-gray-600 dark:text-slate-300">
                    This device
                  </p>
                </div>
                <span className="px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full">
                  Active
                </span>
              </div>
            </div>
          </div>

          {/* Security Recommendations */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-4">
              Security Recommendations
            </h3>
            <ul className="space-y-2 text-sm text-blue-800">
              <li className="flex items-start">
                <span className="mr-2">*</span>
                <span>
                  Enable two-factor authentication for enhanced security
                </span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">*</span>
                <span>Use a strong, unique password</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">*</span>
                <span>Keep your recovery codes up to date</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
