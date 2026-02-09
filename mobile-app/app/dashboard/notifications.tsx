/**
 * Fynvita Notifications Dashboard Screen
 * Notification center with filtering and actions
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { router, Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { lightTheme as theme } from '../../src/constants/theme';

interface Notification {
  id: string;
  type: 'dispute_update' | 'score_change' | 'document_processed' | 'recommendation' | 'payment_reminder' | 'system';
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
  actionUrl?: string;
}

const MOCK_NOTIFICATIONS: Notification[] = [
  { id: '1', type: 'dispute_update', title: 'Dispute Updated', body: 'Your dispute with Experian has been marked as under review.', createdAt: '2024-11-20T10:30:00Z', read: false, actionUrl: '/dashboard/disputes' },
  { id: '2', type: 'score_change', title: 'Credit Score Changed', body: 'Your credit score increased by 12 points! New score: 678', createdAt: '2024-11-19T14:00:00Z', read: false },
  { id: '3', type: 'document_processed', title: 'Document Analyzed', body: 'Your Experian credit report has been analyzed. 3 disputable items found.', createdAt: '2024-11-18T09:15:00Z', read: true, actionUrl: '/dashboard/documents' },
  { id: '4', type: 'recommendation', title: 'New Recommendation', body: 'Based on your profile, consider applying for a secured credit card.', createdAt: '2024-11-17T16:45:00Z', read: true },
  { id: '5', type: 'payment_reminder', title: 'Payment Due Soon', body: 'Your premium subscription renews in 3 days.', createdAt: '2024-11-16T08:00:00Z', read: true },
];

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    setLoading(true);
    setTimeout(() => {
      setNotifications(MOCK_NOTIFICATIONS);
      setLoading(false);
    }, 500);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadNotifications();
    setRefreshing(false);
  };

  const markAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'dispute_update': return 'document-text';
      case 'score_change': return 'trending-up';
      case 'document_processed': return 'document';
      case 'recommendation': return 'bulb';
      case 'payment_reminder': return 'card';
      case 'system': return 'settings';
      default: return 'notifications';
    }
  };

  const getIconColor = (type: string) => {
    switch (type) {
      case 'dispute_update': return theme.colors.primary;
      case 'score_change': return theme.colors.success;
      case 'document_processed': return '#8B5CF6';
      case 'recommendation': return theme.colors.warning;
      case 'payment_reminder': return '#EC4899';
      default: return theme.colors.textSecondary;
    }
  };

  const filteredNotifications = filter === 'unread'
    ? notifications.filter(n => !n.read)
    : notifications;

  const unreadCount = notifications.filter(n => !n.read).length;

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Notifications</Text>
        {unreadCount > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
          </View>
        )}
        <View style={{ flex: 1 }} />
        {unreadCount > 0 && (
          <TouchableOpacity onPress={markAllAsRead}>
            <Text style={styles.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'all' && styles.filterTabActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterTabText, filter === 'all' && styles.filterTabTextActive]}>All</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'unread' && styles.filterTabActive]}
          onPress={() => setFilter('unread')}
        >
          <Text style={[styles.filterTabText, filter === 'unread' && styles.filterTabTextActive]}>
            Unread ({unreadCount})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {filteredNotifications.map((notification) => (
          <TouchableOpacity
            key={notification.id}
            style={[styles.notificationItem, !notification.read && styles.notificationUnread]}
            onPress={() => markAsRead(notification.id)}
            activeOpacity={0.7}
          >
            <View style={[styles.iconContainer, { backgroundColor: getIconColor(notification.type) + '15' }]}>
              <Ionicons
                name={getIcon(notification.type) as keyof typeof Ionicons.glyphMap}
                size={22}
                color={getIconColor(notification.type)}
              />
            </View>
            <View style={styles.notificationContent}>
              <View style={styles.notificationHeader}>
                <Text style={styles.notificationTitle}>{notification.title}</Text>
                <Text style={styles.notificationTime}>{formatTime(notification.createdAt)}</Text>
              </View>
              <Text style={styles.notificationBody}>{notification.body}</Text>
              {notification.actionUrl && (
                <TouchableOpacity style={styles.actionLink}>
                  <Text style={styles.actionLinkText}>View details</Text>
                  <Ionicons name="arrow-forward" size={14} color={theme.colors.primary} />
                </TouchableOpacity>
              )}
            </View>
            {!notification.read && <View style={styles.unreadDot} />}
          </TouchableOpacity>
        ))}

        {filteredNotifications.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="notifications-off-outline" size={48} color={theme.colors.textSecondary} />
            <Text style={styles.emptyTitle}>
              {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
            </Text>
            <Text style={styles.emptySubtitle}>
              We'll notify you when something important happens
            </Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: { flexDirection: 'row', alignItems: 'center', padding: theme.spacing.lg, paddingBottom: theme.spacing.sm },
  backButton: { padding: 4, marginRight: 8 },
  title: { fontSize: 20, fontWeight: '700', color: theme.colors.text },
  unreadBadge: { backgroundColor: theme.colors.error, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, marginLeft: 8 },
  unreadBadgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  markAllText: { fontSize: 14, color: theme.colors.primary, fontWeight: '500' },

  filterContainer: { flexDirection: 'row', paddingHorizontal: theme.spacing.lg, gap: 12, marginBottom: theme.spacing.sm },
  filterTab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: theme.colors.surface },
  filterTabActive: { backgroundColor: theme.colors.primary },
  filterTabText: { fontSize: 14, fontWeight: '500', color: theme.colors.textSecondary },
  filterTabTextActive: { color: '#fff' },

  scrollView: { flex: 1 },

  notificationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  notificationUnread: { backgroundColor: theme.colors.primary + '08' },
  iconContainer: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  notificationContent: { flex: 1 },
  notificationHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  notificationTitle: { fontSize: 15, fontWeight: '600', color: theme.colors.text, flex: 1, marginRight: 8 },
  notificationTime: { fontSize: 12, color: theme.colors.textSecondary },
  notificationBody: { fontSize: 14, color: theme.colors.textSecondary, lineHeight: 20 },
  actionLink: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 4 },
  actionLinkText: { fontSize: 13, color: theme.colors.primary, fontWeight: '500' },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.primary, marginLeft: 8, marginTop: 4 },

  emptyState: { alignItems: 'center', padding: 60 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: theme.colors.text, marginTop: 16 },
  emptySubtitle: { fontSize: 14, color: theme.colors.textSecondary, marginTop: 4, textAlign: 'center' },
});
