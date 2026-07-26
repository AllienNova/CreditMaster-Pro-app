/**
 * Fynvita Activity Screen
 *
 * Real-data wiring (M2-3): renders the user's real activity feed from
 * GET /api/activity (authed) via activityApi.getActivity, adapted web -> mobile by
 * mapWebActivity. The feed is sourced from the notifications table; each item's
 * icon is driven off its real `type`. Fetch on mount with honest inline
 * loading / error / empty states; pull-to-refresh re-fetches.
 *
 * The former hardcoded 8-item `activities` array, the local ActivityItem type,
 * and the fake setTimeout refresh were removed. Radical honesty: only real fields
 * render — title, message, and a formatted `createdAt`. The old per-item
 * change/status badges (e.g. "+15", "Resolved") had NO backing in the contract and
 * are dropped, not re-invented. An unrecognized `type` shows a neutral default icon
 * rather than a fabricated category, and an unread item is surfaced (never hidden).
 */

import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { lightTheme } from "../../constants/theme";
import { activityApi, ACTIVITY_TYPES } from "../../src/services/api/activity";
import type { ActivityItem, ActivityType } from "../../src/services/api/activity";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

// Per-type display: filter label + list icon/color, driven off the real activity
// `type`. `other` is the neutral floor an unrecognized type maps to — a default
// dot icon, never a fabricated category. Colors preserve the screen's prior
// palette (dispute=orange, payment=green, document=purple).
const TYPE_DISPLAY: Record<
  ActivityType,
  { label: string; icon: IoniconName; color: string }
> = {
  dispute_update: { label: "Disputes", icon: "document-text", color: "#FF9800" },
  payment_success: { label: "Payments", icon: "card", color: "#00AA00" },
  document_uploaded: { label: "Documents", icon: "folder", color: "#9C27B0" },
  tip: { label: "Tips", icon: "bulb", color: "#0066CC" },
  other: { label: "Other", icon: "ellipse", color: "#666" },
};

// Filter chips: "All" plus one chip per real type (derived from ACTIVITY_TYPES so
// the filters can never drift from the contract). `other` items are only shown
// under "All" — they belong to no specific real category.
const FILTERS: { key: "all" | ActivityType; label: string }[] = [
  { key: "all", label: "All" },
  ...ACTIVITY_TYPES.map((t) => ({ key: t, label: TYPE_DISPLAY[t].label })),
];

// createdAt arrives as an ISO string; render a compact locale date. Absent or
// unparseable -> "" so the row omits the time line rather than showing a fake one.
function formatActivityTime(iso: string): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString();
}

export default function ActivityScreen() {
  const [activities, setActivities] = useState<ActivityItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<"all" | ActivityType>("all");

  const fetchActivities = useCallback(async () => {
    const res = await activityApi.getActivity();
    if (res.success && res.data) {
      setActivities(res.data.activities);
      setError(null);
    } else {
      setError(res.error?.message ?? "Unable to load your activity.");
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    await fetchActivities();
    setLoading(false);
  }, [fetchActivities]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchActivities();
    setRefreshing(false);
  }, [fetchActivities]);

  if (loading && activities === null) {
    return (
      <View style={styles.container}>
        <View style={styles.centered} testID="activity-loading">
          <ActivityIndicator size="large" color={lightTheme.colors.primary} />
          <Text style={styles.stateText}>Loading activity...</Text>
        </View>
      </View>
    );
  }

  if (error && activities === null) {
    return (
      <View style={styles.container}>
        <View style={styles.centered} testID="activity-error">
          <Ionicons name="cloud-offline-outline" size={48} color="#ccc" />
          <Text style={styles.stateText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={load}>
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const items = activities ?? [];
  const filteredActivities =
    filter === "all" ? items : items.filter((a) => a.type === filter);
  const filterLabel = FILTERS.find((f) => f.key === filter)?.label ?? "";

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Activity</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterContainer}
      >
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[
              styles.filterChip,
              filter === f.key && styles.filterChipActive,
            ]}
            onPress={() => setFilter(f.key)}
          >
            <Text
              style={[
                styles.filterText,
                filter === f.key && styles.filterTextActive,
              ]}
            >
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        style={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {items.length === 0 ? (
          <View style={styles.emptyState} testID="activity-empty">
            <Ionicons name="time-outline" size={48} color="#ccc" />
            <Text style={styles.emptyText}>No activity yet</Text>
          </View>
        ) : filteredActivities.length === 0 ? (
          <View style={styles.emptyState} testID="activity-filter-empty">
            <Ionicons name="funnel-outline" size={48} color="#ccc" />
            <Text style={styles.emptyText}>
              No {filterLabel.toLowerCase()} activity
            </Text>
          </View>
        ) : (
          filteredActivities.map((activity) => {
            const display = TYPE_DISPLAY[activity.type];
            const time = formatActivityTime(activity.createdAt);
            return (
              <TouchableOpacity key={activity.id} style={styles.activityItem}>
                <View
                  style={[
                    styles.iconContainer,
                    { backgroundColor: `${display.color}15` },
                  ]}
                >
                  <Ionicons
                    name={display.icon}
                    size={20}
                    color={display.color}
                  />
                </View>
                <View style={styles.activityContent}>
                  <Text style={styles.activityTitle}>{activity.title}</Text>
                  {activity.message ? (
                    <Text style={styles.activityDesc}>{activity.message}</Text>
                  ) : null}
                  {time ? (
                    <Text style={styles.activityTime}>{time}</Text>
                  ) : null}
                </View>
                {!activity.read ? (
                  <View
                    style={styles.unreadDot}
                    testID={`activity-unread-${activity.id}`}
                  />
                ) : null}
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  stateText: {
    marginTop: 16,
    marginBottom: 16,
    color: "#666",
    textAlign: "center",
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: lightTheme.colors.primary,
  },
  retryText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    paddingTop: 50,
    backgroundColor: "#fff",
  },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: "600" },
  filterContainer: {
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#f0f0f0",
    marginRight: 8,
  },
  filterChipActive: { backgroundColor: lightTheme.colors.primary },
  filterText: { fontSize: 14, color: "#666" },
  filterTextActive: { color: "#fff", fontWeight: "600" },
  list: { flex: 1, padding: 16 },
  activityItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  activityContent: { flex: 1 },
  activityTitle: { fontSize: 14, fontWeight: "600", color: "#333" },
  activityDesc: { fontSize: 12, color: "#666", marginTop: 2 },
  activityTime: { fontSize: 11, color: "#999", marginTop: 4 },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: lightTheme.colors.primary,
    marginLeft: 8,
  },
  emptyState: { alignItems: "center", paddingVertical: 48 },
  emptyText: { fontSize: 14, color: "#999", marginTop: 12 },
});
