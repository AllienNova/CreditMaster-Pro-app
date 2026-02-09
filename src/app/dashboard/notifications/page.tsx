'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
  actionUrl?: string;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const response = await fetch('/api/notifications');
        if (response.ok) {
          const data = await response.json();
          setNotifications(data.notifications || []);
        } else {
          // Mock data
          setNotifications([
            { id: '1', type: 'dispute_update', title: 'Dispute Updated', body: 'Your dispute with Experian has been marked as under review.', createdAt: '2024-11-20T10:30:00Z', read: false, actionUrl: '/dashboard/disputes' },
            { id: '2', type: 'score_change', title: 'Credit Score Changed', body: 'Your credit score increased by 12 points! New score: 678', createdAt: '2024-11-19T14:00:00Z', read: false },
            { id: '3', type: 'document_processed', title: 'Document Analyzed', body: 'Your Experian credit report has been analyzed. 3 disputable items found.', createdAt: '2024-11-18T09:15:00Z', read: true, actionUrl: '/dashboard/documents' },
            { id: '4', type: 'recommendation', title: 'New Recommendation', body: 'Based on your profile, consider applying for a secured credit card.', createdAt: '2024-11-17T16:45:00Z', read: true, actionUrl: '/marketplace/secured-cards' },
            { id: '5', type: 'payment_reminder', title: 'Payment Due Soon', body: 'Your premium subscription renews in 3 days.', createdAt: '2024-11-16T08:00:00Z', read: true },
          ]);
        }
      } catch {
        setNotifications([]);
      } finally {
        setLoading(false);
      }
    };
    fetchNotifications();
  }, []);

  const markAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const getIcon = (type: string) => {
    const icons: Record<string, string> = {
      dispute_update: '', score_change: '', document_processed: '',
      recommendation: '', payment_reminder: '', system: '', promotion: '',
    };
    return icons[type] || '';
  };

  const filteredNotifications = filter === 'unread' 
    ? notifications.filter(n => !n.read) 
    : notifications;

  const unreadCount = notifications.filter(n => !n.read).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-50 to-blue-50 p-8">
        <div className="animate-pulse space-y-4 max-w-2xl mx-auto">
          <div className="h-8 bg-gray-200 dark:bg-slate-700 rounded w-1/4"></div>
          {[...Array(5)].map((_, i) => <div key={i} className="h-20 bg-gray-200 dark:bg-slate-700 rounded"></div>)}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-50 to-blue-50">
      <header className="bg-white dark:bg-slate-800/80 backdrop-blur-sm shadow-sm border-b border-white/20 sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link href="/dashboard" className="text-gray-600 hover:text-gray-900 dark:text-white dark:hover:text-white">← Back</Link>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Notifications</h1>
              {unreadCount > 0 && (
                <span className="px-2 py-1 text-xs font-medium bg-red-500 text-white rounded-full">{unreadCount}</span>
              )}
            </div>
            <div className="flex items-center space-x-4">
              <select value={filter} onChange={(e) => setFilter(e.target.value as 'all' | 'unread')} className="px-3 py-1 border rounded-lg text-sm">
                <option value="all">All</option>
                <option value="unread">Unread</option>
              </select>
              {unreadCount > 0 && (
                <button onClick={markAllAsRead} className="text-sm text-blue-600 hover:text-blue-800">Mark all read</button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-3">
          {filteredNotifications.map((notification) => (
            <div
              key={notification.id}
              onClick={() => markAsRead(notification.id)}
              className={`bg-white dark:bg-slate-800 rounded-xl shadow-sm border p-4 cursor-pointer transition-all hover:shadow-md ${!notification.read ? 'border-blue-300 bg-blue-50/50' : 'border-gray-200 dark:border-slate-700'}`}
            >
              <div className="flex items-start space-x-4">
                <span className="text-2xl">{getIcon(notification.type)}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className={`font-medium ${!notification.read ? 'text-gray-900' : 'text-gray-700 dark:text-slate-200'}`}>{notification.title}</h3>
                    <span className="text-xs text-gray-500 dark:text-slate-400">{new Date(notification.createdAt).toLocaleDateString()}</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-slate-300 mt-1">{notification.body}</p>
                  {notification.actionUrl && (
                    <Link href={notification.actionUrl} className="text-sm text-blue-600 hover:underline mt-2 inline-block">View details →</Link>
                  )}
                </div>
                {!notification.read && <div className="w-2 h-2 bg-blue-500 rounded-full"></div>}
              </div>
            </div>
          ))}
          {filteredNotifications.length === 0 && (
            <div className="text-center py-12 text-gray-500 dark:text-slate-400">
              <p className="text-4xl mb-4"></p>
              <p>{filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

