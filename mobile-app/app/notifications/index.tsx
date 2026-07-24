import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { lightTheme } from "../../src/constants/theme";
import { useNotificationStore } from "../../src/store/notificationStore";
import type { Notification } from "../../src/services/api/types";

const getNotificationIcon = (
  type: Notification["type"],
): { name: keyof typeof Ionicons.glyphMap; color: string } => {
  switch (type) {
    case "score_change":
      return { name: "trending-up-outline", color: "#4CAF50" };
    case "dispute_update":
      return { name: "document-text-outline", color: "#2196F3" };
    case "payment":
      return { name: "card-outline", color: "#FF9800" };
    case "alert":
      return { name: "alert-circle-outline", color: "#EF4444" };
    case "recommendation":
      return { name: "bulb-outline", color: "#FFC107" };
    case "system":
      return { name: "information-circle-outline", color: "#9C27B0" };
    default:
      return {
        name: "notifications-outline",
        color: lightTheme.colors.primary,
      };
  }
};

// The API delivers ISO createdAt strings; render a compact relative time.
function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const minutes = Math.floor((Date.now() - date.getTime()) / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

export default function NotificationsScreen() {
  const router = useRouter();
  const {
    notifications,
    unreadCount,
    isLoading,
    error,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
  } = useNotificationStore();
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const filteredNotifications =
    filter === "unread" ? notifications.filter((n) => !n.read) : notifications;

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  };

  const handleNotificationPress = (notification: Notification) => {
    if (!notification.read) markAsRead(notification.id);
    if (notification.type === "dispute_update") {
      router.push("/(tabs)/disputes");
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
            <TouchableOpacity onPress={() => markAllAsRead()}>
              <Text style={styles.markAllText}>Mark all read</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={() =>
              router.push("/settings/notification-preferences" as never)
            }
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
        {isLoading && notifications.length === 0 ? (
          <View style={styles.centered} testID="notifications-loading">
            <ActivityIndicator size="large" color={lightTheme.colors.primary} />
          </View>
        ) : error && notifications.length === 0 ? (
          <View style={styles.centered} testID="notifications-error">
            <Ionicons
              name="cloud-offline-outline"
              size={48}
              color={lightTheme.colors.textSecondary}
            />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => fetchNotifications()}
            >
              <Text style={styles.retryText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        ) : filteredNotifications.length === 0 ? (
          <View style={styles.centered} testID="notifications-empty">
            <Ionicons
              name="checkmark-circle-outline"
              size={48}
              color={lightTheme.colors.primary}
            />
            <Text style={styles.emptyTitle}>All caught up!</Text>
            <Text style={styles.emptyText}>
              {filter === "unread"
                ? "You have no unread notifications"
                : "Notifications will appear here"}
            </Text>
          </View>
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
                  <Ionicons name={icon.name} size={24} color={icon.color} />
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
                    {notification.body}
                  </Text>
                  <Text style={styles.notificationTime}>
                    {formatTimestamp(notification.createdAt)}
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
  centered: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 64,
    paddingHorizontal: 24,
  },
  errorText: {
    fontSize: 14,
    color: lightTheme.colors.textSecondary,
    marginTop: 12,
    marginBottom: 16,
    textAlign: "center",
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: lightTheme.colors.primary,
  },
  retryText: { color: "#FFFFFF", fontWeight: "600", fontSize: 14 },
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
    textAlign: "center",
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
