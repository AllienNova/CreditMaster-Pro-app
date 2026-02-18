"use client";

import { useState, useEffect, useCallback } from "react";
import { sessionService, Session } from "@/lib/auth/session-service";
import { useAuth } from "@/hooks/useAuth";

export default function SessionManagement() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [revokingSessionId, setRevokingSessionId] = useState<string | null>(
    null,
  );

  const loadSessions = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const userSessions = await sessionService.getUserSessions(user.id);
      setSessions(userSessions);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load sessions");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      void loadSessions();
    }
  }, [user, loadSessions]);

  const handleRevokeSession = async (sessionId: string) => {
    if (!user) return;

    if (
      !confirm(
        "Are you sure you want to revoke this session? The device will be logged out.",
      )
    ) {
      return;
    }

    setRevokingSessionId(sessionId);
    setError(null);
    setSuccess(null);

    try {
      const response = await sessionService.revokeSession(sessionId, user.id);

      if (!response.success) {
        throw new Error(response.error || "Failed to revoke session");
      }

      setSuccess("Session revoked successfully");
      await loadSessions();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to revoke session");
    } finally {
      setRevokingSessionId(null);
    }
  };

  const handleRevokeAllOther = async () => {
    if (!user) return;

    if (
      !confirm(
        "Are you sure you want to revoke all other sessions? All other devices will be logged out.",
      )
    ) {
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const currentSession = sessions.find((s) => s.isCurrent);
      if (!currentSession) {
        throw new Error("Current session not found");
      }

      const response = await sessionService.revokeAllOtherSessions(
        user.id,
        currentSession.id,
      );

      if (!response.success) {
        throw new Error(response.error || "Failed to revoke sessions");
      }

      setSuccess("All other sessions revoked successfully");
      await loadSessions();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to revoke sessions",
      );
    } finally {
      setLoading(false);
    }
  };

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType) {
      case "desktop":
        return "";
      case "mobile":
        return "";
      case "tablet":
        return "";
      default:
        return "";
    }
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
    if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
    return `${days} day${days > 1 ? "s" : ""} ago`;
  };

  if (!user) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
        <p className="text-gray-600 dark:text-slate-300">
          Please log in to manage sessions.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Active Sessions
          </h3>
          <p className="text-sm text-gray-600 dark:text-slate-300 mt-1">
            Manage your active sessions across different devices
          </p>
        </div>
        {sessions.length > 1 && (
          <button
            onClick={handleRevokeAllOther}
            disabled={loading}
            className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Revoke All Other Sessions
          </button>
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

      {loading && sessions.length === 0 ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-600 dark:text-slate-300">
            No active sessions found
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {sessions.map((session) => (
            <div
              key={session.id}
              className={`border rounded-lg p-4 ${
                session.isCurrent
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 dark:border-slate-700"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <div className="text-3xl">
                    {getDeviceIcon(session.deviceType)}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        {session.deviceName ||
                          `${session.browser} on ${session.os}`}
                      </h4>
                      {session.isCurrent && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                          Current Session
                        </span>
                      )}
                    </div>
                    <div className="mt-1 space-y-1 text-sm text-gray-600 dark:text-slate-300">
                      <p>
                        <span className="font-medium">Browser:</span>{" "}
                        {session.browser}
                      </p>
                      <p>
                        <span className="font-medium">OS:</span> {session.os}
                      </p>
                      <p>
                        <span className="font-medium">IP Address:</span>{" "}
                        {session.ipAddress}
                      </p>
                      {session.location && (
                        <p>
                          <span className="font-medium">Location:</span>{" "}
                          {session.location}
                        </p>
                      )}
                      <p>
                        <span className="font-medium">Last Active:</span>{" "}
                        {formatDate(session.lastActiveAt)}
                      </p>
                      <p>
                        <span className="font-medium">Created:</span>{" "}
                        {session.createdAt.toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>

                {!session.isCurrent && (
                  <button
                    onClick={() => handleRevokeSession(session.id)}
                    disabled={revokingSessionId === session.id}
                    className="px-3 py-1 text-sm text-red-600 hover:text-red-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {revokingSessionId === session.id
                      ? "Revoking..."
                      : "Revoke"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 dark:text-white mb-2">
          Session Security Tips
        </h4>
        <ul className="space-y-1 text-sm text-gray-600 dark:text-slate-300">
          <li>• Revoke sessions from devices you no longer use</li>
          <li>• Check for suspicious activity regularly</li>
          <li>• Use different devices for different purposes</li>
          <li>• Enable two-factor authentication for extra security</li>
        </ul>
      </div>
    </div>
  );
}
