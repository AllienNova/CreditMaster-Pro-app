'use client';

import { Notification, NotificationType } from '@/lib/notifications/notification-service';
import { useRouter } from 'next/navigation';

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (notificationId: string) => void;
  onDelete: (notificationId: string) => void;
}

export default function NotificationItem({
  notification,
  onMarkAsRead,
  onDelete,
}: NotificationItemProps) {
  const router = useRouter();

  const getNotificationIcon = (type: NotificationType): string => {
    switch (type) {
      case 'dispute_created':
      case 'dispute_updated':
      case 'dispute_resolved':
        return '📋';
      case 'credit_score_changed':
        return '📊';
      case 'payment_successful':
        return '💳';
      case 'payment_failed':
        return '❌';
      case 'subscription_renewed':
      case 'subscription_canceled':
        return '🔄';
      case 'document_uploaded':
        return '📄';
      case 'welcome':
        return '👋';
      case 'password_reset':
        return '🔒';
      default:
        return '🔔';
    }
  };

  const getNotificationColor = (type: NotificationType): string => {
    switch (type) {
      case 'dispute_created':
      case 'dispute_updated':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'dispute_resolved':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'credit_score_changed':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'payment_successful':
      case 'subscription_renewed':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'payment_failed':
      case 'subscription_canceled':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'document_uploaded':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'welcome':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'password_reset':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const formatDate = (date: Date): string => {
    const now = new Date();
    const notifDate = new Date(date);
    const diffMs = now.getTime() - notifDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return notifDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: notifDate.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  };

  const handleClick = () => {
    // Mark as read when clicked
    if (!notification.read) {
      onMarkAsRead(notification.id);
    }
    
    // Navigate based on notification type
    if (notification.data?.disputeId) {
      router.push(`/disputes/${notification.data.disputeId}`);
    } else if (notification.data?.documentId) {
      router.push(`/documents/${notification.data.documentId}`);
    } else if (notification.type.startsWith('payment_') || notification.type.startsWith('subscription_')) {
      router.push('/billing');
    }
  };

  return (
    <div
      className={`p-6 hover:bg-gray-50 transition-colors cursor-pointer ${
        !notification.read ? 'bg-blue-50/30' : ''
      }`}
      onClick={handleClick}
    >
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div
          className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl flex-shrink-0 border ${getNotificationColor(
            notification.type
          )}`}
        >
          {getNotificationIcon(notification.type)}
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h3
                className={`text-sm font-semibold mb-1 ${
                  !notification.read ? 'text-gray-900' : 'text-gray-700'
                }`}
              >
                {notification.title}
                {!notification.read && (
                  <span className="ml-2 inline-block w-2 h-2 bg-blue-600 rounded-full"></span>
                )}
              </h3>
              <p className="text-sm text-gray-600 mb-2">{notification.message}</p>
              <div className="flex items-center gap-3 text-xs text-gray-500">
                <span>{formatDate(notification.createdAt)}</span>
                {notification.data && Object.keys(notification.data).length > 0 && (
                  <span className="px-2 py-1 bg-gray-100 rounded">
                    {notification.type.replace(/_/g, ' ')}
                  </span>
                )}
              </div>
            </div>
            
            {/* Actions */}
            <div className="flex items-center gap-2">
              {!notification.read && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onMarkAsRead(notification.id);
                  }}
                  className="px-3 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded transition-colors"
                  title="Mark as read"
                >
                  Mark read
                </button>
              )}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(notification.id);
                }}
                className="px-3 py-1 text-xs text-red-600 hover:bg-red-50 rounded transition-colors"
                title="Delete"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

