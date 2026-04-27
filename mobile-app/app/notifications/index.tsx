import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { lightTheme } from "../../src/constants/theme";
import { EmptyState } from "../../src/components/EmptyState";

interface Notification {
  id: string;
  type: "score_change" | "dispute_update" | "payment" | "alert" | "system";
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  actionUrl?: string;
}

const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: "1",
    type: "score_change",
    title: "Score Increased!",
    message: "Your Experian score increased by 15 points to 695.",
    timestamp: "2 hours ago",
    read: false,
  },
  {
    id: "2",
    type: "dispute_update",
    title: "Dispute Resolved",
    message: "Your dispute with Capital One has been resolved in your favor.",
    timestamp: "5 hours ago",
    read: false,
  },
  {
    id: "3",
    type: "alert",
    title: "New Hard Inquiry",
    message: "A new hard inquiry was added to your TransUnion report.",
    timestamp: "1 day ago",
    read: true,
  },
  {
    id: "4",
    type: "payment",
    title: "Payment Reminder",
    message:
      "Your subscription renews in 3 days. Update payment method if needed.",
    timestamp: "2 days ago",
    read: true,
  },
  {
    id: "5",
    type: "dispute_update",
    title: "Dispute Submitted",
    message: "Your dispute letter has been sent to Equifax.",
    timestamp: "3 days ago",
    read: true,
  },
  {
    id: "6",
    type: "system",
    title: "New Feature Available",
    message: "Try our new AI-powered credit analysis tool!",
    timestamp: "1 week ago",
    read: true,
  },
  {
    id: "7",
    type: "score_change",
    title: "Score Alert",
    message:
      "Your Equifax score dropped by 8 points due to increased utilization.",
    timestamp: "1 week ago",
    read: true,
  },
];

const getNotificationIcon = (type: string) => {
  switch (type) {
    case "score_change":
      return { name: "trending-up-outline", color: "#4CAF50" };
    case "dispute_update":
      return { name: "document-text-outline", color: "#2196F3" };
    case "payment":
      return { name: "card-outline", color: "#FF9800" };
    case "alert":
      return { name: "alert-circle-outline", color: "#EF4444" };
    case "system":
      return { name: "information-circle-outline", color: "#9C27B0" };
    default:
      return {
        name: "notifications-outline",
        color: lightTheme.colors.primary,
      };
  }
};

export default function NotificationsScreen() {
  const router = useRouter();
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const unreadCount = notifications.filter((n) => !n.read).length;
  const filteredNotifications =
    filter === "unread" ? notifications.filter((n) => !n.read) : notifications;

  const handleRefresh = async () => {
    setRefreshing(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setRefreshing(false);
  };

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleNotificationPress = (notification: Notification) => {
    markAsRead(notification.id);
    // Navigate based on notification type
    if (notification.type === "dispute_update") {
      router.push("/disputes");
    } else if (notification.type === "score_change") {
      router.push("/reports");
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons
            name="arrow-back"
            size={28}
            color={lightTheme.colors.text}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={styles.headerActions}>
          {unreadCount > 0 && (
            <TouchableOpacity onPress={markAllAsRead}>
              <Text style={styles.markAllText}>Mark all read</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={() => router.push("/settings/notification-preferences" as never)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name="settings-outline"
              size={24}
              color={lightTheme.colors.textSecondary}
            />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.filterBar}>
        <TouchableOpacity
          style={[
            styles.filterButton,
            filter === "all" && styles.filterButtonActive,
          ]}
          onPress={() => setFilter("all")}
        >
          <Text
            style={[
              styles.filterText,
              filter === "all" && styles.filterTextActive,
            ]}
          >
            All
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterButton,
            filter === "unread" && styles.filterButtonActive,
          ]}
          onPress={() => setFilter("unread")}
        >
          <Text
            style={[
              styles.filterText,
              filter === "unread" && styles.filterTextActive,
            ]}
          >
            Unread {unreadCount > 0 && `(${unreadCount})`}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {filteredNotifications.length === 0 ? (
          <EmptyState
            icon="checkmark-circle-outline"
            title="All caught up!"
            description={
              filter === "unread"
                ? "You have no unread notifications"
                : "Notifications will appear here"
            }
          />
        ) : (
          filteredNotifications.map((notification) => {
            const icon = getNotificationIcon(notification.type);
            return (
              <TouchableOpacity
                key={notification.id}
                style={[
                  styles.notificationItem,
                  !notification.read && styles.notificationUnread,
                ]}
                onPress={() => handleNotificationPress(notification)}
              >
                <View
                  style={[
                    styles.iconContainer,
                    { backgroundColor: icon.color + "20" },
                  ]}
                >
                  <Ionicons
                    name={icon.name as any}
                    size={24}
                    color={icon.color}
                  />
                </View>
                <View style={styles.notificationContent}>
                  <View style={styles.notificationHeader}>
                    <Text
                      style={[
                        styles.notificationTitle,
                        !notification.read && styles.notificationTitleUnread,
                      ]}
                    >
                      {notification.title}
                    </Text>
                    {!notification.read && <View style={styles.unreadDot} />}
                  </View>
                  <Text style={styles.notificationMessage} numberOfLines={2}>
                    {notification.message}
                  </Text>
                  <Text style={styles.notificationTime}>
                    {notification.timestamp}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: lightTheme.colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    paddingTop: 48,
    backgroundColor: lightTheme.colors.surface,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: lightTheme.colors.text,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  markAllText: {
    fontSize: 14,
    color: lightTheme.colors.primary,
    fontWeight: "600",
  },
  filterBar: {
    flexDirection: "row",
    padding: 16,
    gap: 12,
    backgroundColor: lightTheme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: lightTheme.colors.border,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: lightTheme.colors.background,
  },
  filterButtonActive: { backgroundColor: lightTheme.colors.primary },
  filterText: {
    fontSize: 14,
    color: lightTheme.colors.textSecondary,
    fontWeight: "500",
  },
  filterTextActive: { color: "#FFFFFF" },
  content: { flex: 1 },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 64,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: lightTheme.colors.text,
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: lightTheme.colors.textSecondary,
    marginTop: 8,
  },
  notificationItem: {
    flexDirection: "row",
    padding: 16,
    backgroundColor: lightTheme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: lightTheme.colors.border,
  },
  notificationUnread: { backgroundColor: lightTheme.colors.primary + "08" },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  notificationContent: { flex: 1, marginLeft: 12 },
  notificationHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  notificationTitle: { fontSize: 16, color: lightTheme.colors.text },
  notificationTitleUnread: { fontWeight: "600" },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: lightTheme.colors.primary,
  },
  notificationMessage: {
    fontSize: 14,
    color: lightTheme.colors.textSecondary,
    marginTop: 4,
    lineHeight: 20,
  },
  notificationTime: {
    fontSize: 12,
    color: lightTheme.colors.textSecondary,
    marginTop: 8,
  },
});
