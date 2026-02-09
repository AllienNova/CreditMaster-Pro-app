'use client';

import { CreditAlert } from '@/lib/credit-monitoring/credit-monitoring-service';
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';

interface CreditAlertsListProps {
  alerts: CreditAlert[];
  onRefresh: () => void;
}

export default function CreditAlertsList({ alerts, onRefresh }: CreditAlertsListProps) {
  const { user } = useAuth();
  const [markingAsRead, setMarkingAsRead] = useState<string | null>(null);

  const getAlertIcon = (type: string): string => {
    switch (type) {
      case 'score_increase':
        return '';
      case 'score_decrease':
        return '';
      case 'new_account':
        return '🆕';
      case 'new_inquiry':
        return '';
      case 'account_closed':
        return '';
      case 'payment_missed':
        return '';
      case 'credit_limit_change':
        return '';
      case 'address_change':
        return '';
      case 'fraud_alert':
        return '';
      case 'identity_theft':
        return '';
      default:
        return '';
    }
  };

  const getSeverityColor = (severity: string): string => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-slate-100 border-gray-200 dark:border-slate-700';
    }
  };

  const handleMarkAsRead = async (alertId: string) => {
    if (!user) return;

    setMarkingAsRead(alertId);
    try {
      const response = await fetch('/api/credit-monitoring/alerts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, alertId }),
      });

      if (response.ok) {
        onRefresh();
      }
    } catch (_error) {
      // CreditAlertsList error: Error marking alert as read
      void _error;
    } finally {
      setMarkingAsRead(null);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!user) return;

    try {
      const response = await fetch('/api/credit-monitoring/alerts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, markAllAsRead: true }),
      });

      if (response.ok) {
        onRefresh();
      }
    } catch (_error) {
      // CreditAlertsList error: Error marking all alerts as read
      void _error;
    }
  };

  const formatDate = (date: Date): string => {
    const now = new Date();
    const alertDate = new Date(date);
    const diffMs = now.getTime() - alertDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return alertDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: alertDate.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  };

  if (alerts.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 dark:text-slate-500 text-6xl mb-4"></div>
        <p className="text-gray-600 dark:text-slate-300">No alerts yet</p>
        <p className="text-sm text-gray-500 dark:text-slate-400 mt-2">
          We'll notify you when there are changes to your credit
        </p>
      </div>
    );
  }

  const unreadCount = alerts.filter(a => !a.read).length;

  return (
    <div>
      {/* Header */}
      {unreadCount > 0 && (
        <div className="flex justify-end mb-4">
          <button
            type="button"
            onClick={handleMarkAllAsRead}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            Mark all as read
          </button>
        </div>
      )}

      {/* Alerts List */}
      <div className="space-y-3">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className={`p-4 rounded-lg border-2 transition-all ${
              !alert.read ? 'bg-blue-50/50 border-blue-200' : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700'
            }`}
          >
            <div className="flex items-start gap-4">
              {/* Icon */}
              <div className="text-3xl flex-shrink-0">
                {getAlertIcon(alert.type)}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className={`font-semibold ${!alert.read ? 'text-gray-900' : 'text-gray-700 dark:text-slate-200'}`}>
                        {alert.title}
                      </h4>
                      {!alert.read && (
                        <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-slate-300 mb-2">{alert.message}</p>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-gray-500 dark:text-slate-400">{formatDate(alert.createdAt)}</span>
                      {alert.bureau && (
                        <span className="px-2 py-1 bg-gray-100 dark:bg-slate-800 rounded text-gray-700 dark:text-slate-200">
                          {alert.bureau.charAt(0).toUpperCase() + alert.bureau.slice(1)}
                        </span>
                      )}
                      <span className={`px-2 py-1 rounded border ${getSeverityColor(alert.severity)}`}>
                        {alert.severity}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  {!alert.read && (
                    <button
                      type="button"
                      onClick={() => handleMarkAsRead(alert.id)}
                      disabled={markingAsRead === alert.id}
                      className="px-3 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded transition-colors disabled:opacity-50"
                    >
                      {markingAsRead === alert.id ? 'Marking...' : 'Mark read'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

