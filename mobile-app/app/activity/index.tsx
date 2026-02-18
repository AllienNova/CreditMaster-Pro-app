import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { lightTheme } from "../../constants/theme";

type ActivityItem = {
  id: string;
  type:
    | "score_change"
    | "dispute"
    | "payment"
    | "document"
    | "alert"
    | "account";
  title: string;
  description: string;
  time: string;
  meta?: { change?: number; status?: string };
};

export default function ActivityScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<string>("all");

  const activities: ActivityItem[] = [
    {
      id: "1",
      type: "score_change",
      title: "Credit Score Update",
      description: "Your Experian score increased",
      time: "2 hours ago",
      meta: { change: 15 },
    },
    {
      id: "2",
      type: "dispute",
      title: "Dispute Updated",
      description: "Medical collection dispute marked as resolved",
      time: "5 hours ago",
      meta: { status: "resolved" },
    },
    {
      id: "3",
      type: "payment",
      title: "Payment Received",
      description: "Premium subscription renewed",
      time: "Yesterday",
      meta: { status: "success" },
    },
    {
      id: "4",
      type: "document",
      title: "Document Uploaded",
      description: "Credit report from Experian uploaded",
      time: "Yesterday",
    },
    {
      id: "5",
      type: "alert",
      title: "New Hard Inquiry",
      description: "Chase Bank checked your credit",
      time: "2 days ago",
    },
    {
      id: "6",
      type: "account",
      title: "Account Added",
      description: "New credit card account detected",
      time: "3 days ago",
    },
    {
      id: "7",
      type: "score_change",
      title: "Credit Score Update",
      description: "Your TransUnion score decreased",
      time: "1 week ago",
      meta: { change: -5 },
    },
    {
      id: "8",
      type: "dispute",
      title: "Dispute Filed",
      description: "Late payment dispute submitted to Equifax",
      time: "1 week ago",
      meta: { status: "pending" },
    },
  ];

  const filters = [
    { key: "all", label: "All" },
    { key: "score_change", label: "Scores" },
    { key: "dispute", label: "Disputes" },
    { key: "payment", label: "Payments" },
    { key: "alert", label: "Alerts" },
  ];

  const getIcon = (type: string) => {
    switch (type) {
      case "score_change":
        return { name: "trending-up", color: "#0066CC" };
      case "dispute":
        return { name: "document-text", color: "#FF9800" };
      case "payment":
        return { name: "card", color: "#00AA00" };
      case "document":
        return { name: "folder", color: "#9C27B0" };
      case "alert":
        return { name: "warning", color: "#CC0000" };
      case "account":
        return { name: "business", color: "#607D8B" };
      default:
        return { name: "ellipse", color: "#666" };
    }
  };

  const filteredActivities =
    filter === "all" ? activities : activities.filter((a) => a.type === filter);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

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
        {filters.map((f) => (
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
        {filteredActivities.map((activity) => {
          const icon = getIcon(activity.type);
          return (
            <TouchableOpacity key={activity.id} style={styles.activityItem}>
              <View
                style={[
                  styles.iconContainer,
                  { backgroundColor: `${icon.color}15` },
                ]}
              >
                <Ionicons
                  name={icon.name as any}
                  size={20}
                  color={icon.color}
                />
              </View>
              <View style={styles.activityContent}>
                <Text style={styles.activityTitle}>{activity.title}</Text>
                <Text style={styles.activityDesc}>{activity.description}</Text>
                <Text style={styles.activityTime}>{activity.time}</Text>
              </View>
              {activity.meta?.change !== undefined && (
                <View
                  style={[
                    styles.changeBadge,
                    {
                      backgroundColor:
                        activity.meta.change > 0 ? "#E8F5E9" : "#FFEBEE",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.changeText,
                      {
                        color: activity.meta.change > 0 ? "#00AA00" : "#CC0000",
                      },
                    ]}
                  >
                    {activity.meta.change > 0 ? "+" : ""}
                    {activity.meta.change}
                  </Text>
                </View>
              )}
              {activity.meta?.status && (
                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor:
                        activity.meta.status === "resolved"
                          ? "#E8F5E9"
                          : activity.meta.status === "success"
                            ? "#E8F5E9"
                            : "#FFF3E0",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      {
                        color:
                          activity.meta.status === "resolved"
                            ? "#00AA00"
                            : activity.meta.status === "success"
                              ? "#00AA00"
                              : "#E65100",
                      },
                    ]}
                  >
                    {activity.meta.status.charAt(0).toUpperCase() +
                      activity.meta.status.slice(1)}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
        {filteredActivities.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="time-outline" size={48} color="#ccc" />
            <Text style={styles.emptyText}>No activity found</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
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
  changeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  changeText: { fontSize: 14, fontWeight: "700" },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 12, fontWeight: "600" },
  emptyState: { alignItems: "center", paddingVertical: 48 },
  emptyText: { fontSize: 14, color: "#999", marginTop: 12 },
});
