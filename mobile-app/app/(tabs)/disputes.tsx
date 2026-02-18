import { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../src/hooks/useTheme";
import { colors } from "../../src/constants/theme";
import { useDisputeStore } from "../../src/store/disputeStore";
import type { Dispute } from "../../src/services/api/types";

const statusColors: Record<string, { bg: string; text: string }> = {
  draft: { bg: "#F3F4F6", text: "#6B7280" },
  sent: { bg: "#DBEAFE", text: "#2563EB" },
  pending: { bg: "#DBEAFE", text: "#2563EB" },
  in_review: { bg: "#FEF3C7", text: "#D97706" },
  under_review: { bg: "#FEF3C7", text: "#D97706" },
  resolved: { bg: "#DCFCE7", text: "#16A34A" },
  rejected: { bg: "#FEE2E2", text: "#DC2626" },
};

export default function DisputesScreen() {
  const {
    colors: themeColors,
    spacing,
    borderRadius,
    fontSize,
    fontWeight,
    withOpacity,
  } = useTheme();
  const { disputes, isLoading, error, fetchDisputes } = useDisputeStore();
  const [filter, setFilter] = useState<string>("all");
  const [refreshing, setRefreshing] = useState(false);

  // Fetch disputes when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchDisputes();
    }, [fetchDisputes]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDisputes();
    setRefreshing(false);
  };

  const filteredDisputes =
    filter === "all" ? disputes : disputes.filter((d) => d.status === filter);

  const filters = ["all", "draft", "sent", "under_review", "resolved"];

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: themeColors.background },
        header: {
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          padding: spacing.lg,
          paddingTop: 60,
        },
        title: { fontSize: 28, fontWeight: "700", color: themeColors.text },
        addButton: {
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: themeColors.primary,
          alignItems: "center",
          justifyContent: "center",
        },
        quickActionsContainer: {
          flexDirection: "row",
          paddingHorizontal: spacing.md,
          marginBottom: spacing.md,
          gap: 12,
        },
        quickActionCard: {
          flex: 1,
          backgroundColor: themeColors.surface,
          padding: spacing.md,
          borderRadius: borderRadius.lg,
        },
        quickActionIcon: {
          width: 40,
          height: 40,
          borderRadius: 12,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 8,
        },
        quickActionText: {
          fontSize: 15,
          fontWeight: "600",
          color: themeColors.text,
        },
        quickActionSubtext: {
          fontSize: 12,
          color: themeColors.textSecondary,
          marginTop: 2,
        },
        statsContainer: {
          flexDirection: "row",
          paddingHorizontal: spacing.md,
          marginBottom: spacing.md,
        },
        statCard: {
          flex: 1,
          backgroundColor: themeColors.surface,
          marginHorizontal: 4,
          padding: spacing.md,
          borderRadius: borderRadius.md,
          alignItems: "center",
        },
        statValue: { fontSize: 24, fontWeight: "700" },
        statLabel: { fontSize: 12, color: themeColors.textSecondary },
        filterContainer: {
          flexDirection: "row",
          paddingHorizontal: spacing.md,
          marginBottom: spacing.sm,
        },
        filterButton: {
          paddingHorizontal: 12,
          paddingVertical: 6,
          borderRadius: 16,
          marginRight: 8,
          backgroundColor: themeColors.surface,
        },
        filterButtonActive: { backgroundColor: themeColors.primary },
        filterText: { fontSize: 12, color: themeColors.textSecondary },
        filterTextActive: { color: themeColors.white, fontWeight: "600" },
        list: { padding: spacing.md },
        disputeCard: {
          backgroundColor: themeColors.surface,
          borderRadius: borderRadius.lg,
          padding: spacing.md,
          marginBottom: spacing.md,
        },
        disputeHeader: {
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 8,
        },
        bureau: { fontSize: 14, fontWeight: "600" },
        statusBadge: {
          paddingHorizontal: 8,
          paddingVertical: 4,
          borderRadius: 12,
        },
        statusText: {
          fontSize: 11,
          fontWeight: "600",
          textTransform: "capitalize",
        },
        itemType: {
          fontSize: 16,
          fontWeight: "600",
          color: themeColors.text,
          marginBottom: 4,
        },
        itemDescription: {
          fontSize: 14,
          color: themeColors.textSecondary,
          marginBottom: 8,
        },
        disputeFooter: {
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        },
        dateText: { fontSize: 12, color: themeColors.textSecondary },
        outcomeText: {
          fontSize: 12,
          color: themeColors.success,
          fontWeight: "500",
        },
        emptyState: { alignItems: "center", paddingTop: 60 },
        emptyText: {
          fontSize: 16,
          color: themeColors.textSecondary,
          marginTop: spacing.md,
        },
        emptyButton: {
          marginTop: spacing.lg,
          backgroundColor: themeColors.primary,
          paddingHorizontal: 24,
          paddingVertical: 12,
          borderRadius: borderRadius.md,
        },
        emptyButtonText: { color: themeColors.white, fontWeight: "600" },
        errorContainer: {
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: withOpacity(themeColors.error, 0.1),
          padding: spacing.md,
          marginHorizontal: spacing.md,
          borderRadius: borderRadius.md,
          gap: 8,
        },
        errorText: { color: themeColors.error, fontSize: 14, flex: 1 },
        loadingContainer: {
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          paddingTop: 60,
        },
        loadingText: {
          marginTop: spacing.md,
          color: themeColors.textSecondary,
          fontSize: 14,
        },
      }),
    [themeColors, spacing, borderRadius, withOpacity],
  );

  const renderDispute = ({ item }: { item: Dispute }) => (
    <TouchableOpacity
      style={styles.disputeCard}
      onPress={() => router.push(`/dispute/${item.id}` as never)}
    >
      <View style={styles.disputeHeader}>
        <Text
          style={[
            styles.bureau,
            {
              color: colors.bureaus[item.bureau as keyof typeof colors.bureaus],
            },
          ]}
        >
          {item.bureau.charAt(0).toUpperCase() + item.bureau.slice(1)}
        </Text>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: statusColors[item.status]?.bg },
          ]}
        >
          <Text
            style={[
              styles.statusText,
              { color: statusColors[item.status]?.text },
            ]}
          >
            {item.status.replace("_", " ")}
          </Text>
        </View>
      </View>
      <Text style={styles.itemType}>{item.itemType}</Text>
      <Text style={styles.itemDescription} numberOfLines={2}>
        {item.creditorName || item.disputeReason}
      </Text>
      <View style={styles.disputeFooter}>
        <Text style={styles.dateText}>
          {new Date(item.createdAt).toLocaleDateString()}
        </Text>
        {item.outcome && (
          <Text style={styles.outcomeText}>Outcome: {item.outcome}</Text>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>My Disputes</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push("/dispute/create" as never)}
        >
          <Ionicons name="add" size={24} color={themeColors.white} />
        </TouchableOpacity>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActionsContainer}>
        <TouchableOpacity
          style={styles.quickActionCard}
          onPress={() => router.push("/dispute/templates" as never)}
        >
          <View
            style={[
              styles.quickActionIcon,
              { backgroundColor: withOpacity(themeColors.primary, 0.125) },
            ]}
          >
            <Ionicons
              name="document-text"
              size={20}
              color={themeColors.primary}
            />
          </View>
          <Text style={styles.quickActionText}>Templates</Text>
          <Text style={styles.quickActionSubtext}>10 proven letters</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.quickActionCard}
          onPress={() => router.push("/dispute/strategies" as never)}
        >
          <View
            style={[
              styles.quickActionIcon,
              { backgroundColor: withOpacity(themeColors.accent, 0.125) },
            ]}
          >
            <Ionicons
              name="shield-checkmark"
              size={20}
              color={themeColors.accent}
            />
          </View>
          <Text style={styles.quickActionText}>Strategies</Text>
          <Text style={styles.quickActionSubtext}>7 advanced tactics</Text>
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        {[
          {
            label: "Total",
            value: disputes.length,
            color: themeColors.primary,
          },
          {
            label: "Pending",
            value: disputes.filter((d) =>
              ["sent", "under_review"].includes(d.status),
            ).length,
            color: themeColors.warning,
          },
          {
            label: "Resolved",
            value: disputes.filter((d) => d.status === "resolved").length,
            color: themeColors.success,
          },
        ].map((stat, i) => (
          <View key={i} style={styles.statCard}>
            <Text style={[styles.statValue, { color: stat.color }]}>
              {stat.value}
            </Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>

      {/* Filters */}
      <View style={styles.filterContainer}>
        {filters.map((f) => (
          <TouchableOpacity
            key={f}
            style={[
              styles.filterButton,
              filter === f && styles.filterButtonActive,
            ]}
            onPress={() => setFilter(f)}
          >
            <Text
              style={[
                styles.filterText,
                filter === f && styles.filterTextActive,
              ]}
            >
              {f === "all"
                ? "All"
                : f.charAt(0).toUpperCase() + f.slice(1).replace("_", " ")}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Error State */}
      {error && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={20} color={themeColors.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Loading State */}
      {isLoading && disputes.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={themeColors.primary} />
          <Text style={styles.loadingText}>Loading disputes...</Text>
        </View>
      ) : (
        /* Disputes List */
        <FlatList
          data={filteredDisputes}
          renderItem={renderDispute}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={themeColors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons
                name="document-text-outline"
                size={64}
                color={themeColors.border}
              />
              <Text style={styles.emptyText}>No disputes found</Text>
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => router.push("/dispute/create" as never)}
              >
                <Text style={styles.emptyButtonText}>Create New Dispute</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </View>
  );
}
