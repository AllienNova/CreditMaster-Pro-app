"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { authService } from "@/lib/auth/auth-service";
import { BrandMark } from "@/components/brand";

export default function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isResetMode = searchParams.get("mode") === "reset";

  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!email) {
      setError("Please enter your email address");
      setLoading(false);
      return;
    }

    const response = await authService.requestPasswordReset({ email });

    if (response.success) {
      setSuccess(true);
    } else {
      setError(response.error || "Failed to send reset email");
    }

    setLoading(false);
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!newPassword || !confirmPassword) {
      setError("Please fill in all fields");
      setLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters");
      setLoading(false);
      return;
    }

    const token = searchParams.get("token") || "";
    const response = await authService.updatePassword({ token, newPassword });

    if (response.success) {
      setSuccess(true);
      setTimeout(() => {
        router.push("/auth/login");
      }, 2000);
    } else {
      setError(response.error || "Failed to update password");
    }

    setLoading(false);
  };

  if (success) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl p-8 w-full max-w-md">
        <div className="text-center">
          <div className="text-6xl mb-6"></div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            {isResetMode ? "Password Updated!" : "Check Your Email"}
          </h2>
          <p className="text-gray-600 dark:text-slate-300 mb-6">
            {isResetMode
              ? "Your password has been successfully updated. Redirecting to login..."
              : "We've sent you an email with instructions to reset your password."}
          </p>
          {!isResetMode && (
            <Link
              href="/auth/login"
              className="inline-block px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-600 text-white rounded-lg hover:from-blue-700 hover:to-blue-700 transition-all font-semibold"
            >
              Back to Login
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl p-8 w-full max-w-md">
      {/* Logo */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center mb-3">
          <BrandMark variant="vertical" height={80} priority />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {isResetMode ? "Set New Password" : "Reset Password"}
        </h1>
        <p className="text-gray-600 dark:text-slate-300 mt-2">
          {isResetMode
            ? "Enter your new password below"
            : "Enter your email to receive reset instructions"}
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2">
            <span className="text-red-600 text-xl"></span>
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Form */}
      {isResetMode ? (
        <form onSubmit={handleUpdatePassword} className="space-y-6">
          {/* New Password */}
          <div>
            <label
              htmlFor="newPassword"
              className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-2"
            >
              New Password
            </label>
            <div className="relative">
              <input
                id="newPassword"
                type={showPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:hover:text-slate-200 dark:text-slate-200"
              >
                {showPassword ? "" : "‍"}
              </button>
            </div>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
              Must be at least 8 characters
            </p>
          </div>

          {/* Confirm Password */}
          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-2"
            >
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-600 text-white rounded-lg hover:from-blue-700 hover:to-blue-700 transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Updating..." : "Update Password"}
          </button>
        </form>
      ) : (
        <form onSubmit={handleRequestReset} className="space-y-6">
          {/* Email */}
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-2"
            >
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-600 text-white rounded-lg hover:from-blue-700 hover:to-blue-700 transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Sending..." : "Send Reset Link"}
          </button>
        </form>
      )}

      {/* Back to Login */}
      <div className="mt-6 text-center">
        <Link
          href="/auth/login"
          className="text-blue-600 hover:text-blue-700 font-semibold text-sm"
        >
          ← Back to Login
        </Link>
      </div>
    </div>
  );
}
