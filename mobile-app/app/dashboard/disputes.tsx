/**
 * Fynvita Disputes Dashboard Screen
 * Dispute tracking and management.
 *
 * Real-data wiring (PARITY): renders the user's real disputes from
 * useDisputeStore (fetch on mount, honest inline loading / error / empty
 * states). The former MOCK_DISPUTES array, the local Dispute interface, and
 * the fake setTimeout load were removed. Dispute fields come from the mobile
 * Dispute type fed by disputeApi.getAll (see mapWebDispute, which maps the web
 * `itemDescription` onto `creditorName`) — nothing is fabricated. This route
 * (/dashboard/disputes) is the deep-link target used by the notifications
 * screen's dispute_update actionUrl.
 */

import React, { useState, useEffect, useCallback } from "react";
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
import { SafeAreaView } from "react-native-safe-area-context";
import { lightTheme as theme } from "../../src/constants/theme";
import { Card } from "../../src/components/Card";
import { useDisputeStore } from "../../src/store/disputeStore";

const FILTERS = ["all", "draft", "sent", "under_review", "resolved"] as const;

// createdAt arrives as an ISO string; render a compact locale date (empty for
// a missing/invalid timestamp rather than "Invalid Date").
function formatDate(iso?: string): string {
  if (!iso) return "";
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString();
}

export default function DisputesScreen() {
  const { disputes, isLoading, error, fetchDisputes } = useDisputeStore();
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<string>("all");

  const load = useCallback(() => {
    fetchDisputes();
  }, [fetchDisputes]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDisputes();
    setRefreshing(false);
  };

  const filteredDisputes = disputes.filter(
    (d) => filter === "all" || d.status === filter,
  );

  const showLoading = isLoading && disputes.length === 0;
  const showError = !!error && disputes.length === 0;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "resolved":
        return theme.colors.success;
      case "sent":
      case "under_review":
        return theme.colors.primary;
      case "rejected":
        return theme.colors.error;
      default:
        return theme.colors.textSecondary;
    }
  };

  const getBureauColor = (bureau: string) => {
    switch (bureau) {
      case "experian":
        return "#1E40AF";
      case "equifax":
        return "#DC2626";
      case "transunion":
        return "#059669";
      default:
        return theme.colors.textSecondary;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "resolved":
        return "checkmark-circle";
      case "sent":
        return "send";
      case "under_review":
        return "time";
      case "rejected":
        return "close-circle";
      default:
        return "document-text";
    }
  };

  const getFilterCount = (filterKey: string) => {
    return filterKey === "all"
      ? disputes.length
      : disputes.filter((d) => d.status === filterKey).length;
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>My Disputes</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push("/credit-builder")}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Filter Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filtersContainer}
          contentContainerStyle={styles.filtersContent}
        >
          {FILTERS.map((filterKey) => (
            <TouchableOpacity
              key={filterKey}
              style={[
                styles.filterPill,
                filter === filterKey && styles.filterPillActive,
              ]}
              onPress={() => setFilter(filterKey)}
            >
              <Text
                style={[
                  styles.filterCount,
                  filter === filterKey && styles.filterCountActive,
                ]}
              >
                {getFilterCount(filterKey)}
              </Text>
              <Text
                style={[
                  styles.filterLabel,
                  filter === filterKey && styles.filterLabelActive,
                ]}
              >
                {filterKey === "all" ? "Total" : filterKey.replace("_", " ")}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Honest inline states — no mock fallback, nothing fabricated */}
        {showLoading && (
          <View
            style={styles.stateContainer}
            testID="dashboard-disputes-loading"
          >
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.stateText}>Loading disputes...</Text>
          </View>
        )}

        {showError && (
          <View style={styles.stateContainer} testID="dashboard-disputes-error">
            <Ionicons
              name="cloud-offline-outline"
              size={48}
              color={theme.colors.textSecondary}
            />
            <Text style={styles.stateText}>{error}</Text>
            <TouchableOpacity style={styles.emptyButton} onPress={load}>
              <Text style={styles.emptyButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Disputes List */}
        {!showLoading && !showError && (
        <View style={styles.disputesList}>
          {filteredDisputes.map((dispute) => (
            <Card key={dispute.id} style={styles.disputeCard}>
              <View style={styles.disputeHeader}>
                <View style={styles.bureauBadge}>
                  <Text
                    style={[
                      styles.bureauText,
                      { color: getBureauColor(dispute.bureau) },
                    ]}
                  >
                    {dispute.bureau.charAt(0).toUpperCase() +
                      dispute.bureau.slice(1)}
                  </Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: getStatusColor(dispute.status) + "20" },
                  ]}
                >
                  <Ionicons
                    name={
                      getStatusIcon(
                        dispute.status,
                      ) as keyof typeof Ionicons.glyphMap
                    }
                    size={14}
                    color={getStatusColor(dispute.status)}
                  />
                  <Text
                    style={[
                      styles.statusText,
                      { color: getStatusColor(dispute.status) },
                    ]}
                  >
                    {dispute.status.replace("_", " ")}
                  </Text>
                </View>
              </View>

              <Text style={styles.itemType}>{dispute.itemType}</Text>
              {!!dispute.creditorName && (
                <Text style={styles.itemDescription}>
                  {dispute.creditorName}
                </Text>
              )}

              <View style={styles.disputeFooter}>
                <Text style={styles.dateText}>
                  Created: {formatDate(dispute.createdAt)}
                </Text>
                {dispute.outcome && (
                  <View style={styles.outcomeBadge}>
                    <Ionicons
                      name="checkmark"
                      size={12}
                      color={theme.colors.success}
                    />
                    <Text style={styles.outcomeText}>{dispute.outcome}</Text>
                  </View>
                )}
              </View>

              <TouchableOpacity style={styles.detailsButton}>
                <Text style={styles.detailsButtonText}>View Details</Text>
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={theme.colors.primary}
                />
              </TouchableOpacity>
            </Card>
          ))}

          {filteredDisputes.length === 0 && (
            <View style={styles.emptyState} testID="dashboard-disputes-empty">
              <Ionicons
                name="document-text-outline"
                size={48}
                color={theme.colors.textSecondary}
              />
              <Text style={styles.emptyTitle}>No disputes found</Text>
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => router.push("/credit-builder")}
              >
                <Text style={styles.emptyButtonText}>Start a New Dispute</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: theme.spacing.lg,
    paddingBottom: 0,
  },
  backButton: { padding: 4, marginRight: 12 },
  title: { flex: 1, fontSize: 20, fontWeight: "700", color: theme.colors.text },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollView: { flex: 1 },

  filtersContainer: { marginTop: theme.spacing.md },
  filtersContent: { paddingHorizontal: theme.spacing.lg, gap: 10 },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    alignItems: "center",
    minWidth: 70,
  },
  filterPillActive: { backgroundColor: theme.colors.primary },
  filterCount: { fontSize: 20, fontWeight: "700", color: theme.colors.text },
  filterCountActive: { color: "#fff" },
  filterLabel: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
    textTransform: "capitalize",
  },
  filterLabelActive: { color: "rgba(255,255,255,0.8)" },

  disputesList: { padding: theme.spacing.lg },
  disputeCard: { marginBottom: theme.spacing.md },
  disputeHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  bureauBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
  },
  bureauText: { fontSize: 13, fontWeight: "600" },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusText: { fontSize: 12, fontWeight: "600", textTransform: "capitalize" },
  itemType: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: 4,
  },
  itemDescription: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  disputeFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  dateText: { fontSize: 12, color: theme.colors.textSecondary },
  outcomeBadge: { flexDirection: "row", alignItems: "center", gap: 4 },
  outcomeText: {
    fontSize: 12,
    fontWeight: "600",
    color: theme.colors.success,
    textTransform: "capitalize",
  },
  detailsButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  detailsButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.primary,
    marginRight: 4,
  },

  emptyState: { alignItems: "center", padding: 40 },
  emptyTitle: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    marginTop: 16,
    marginBottom: 20,
  },
  emptyButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyButtonText: { color: "#fff", fontWeight: "600" },

  stateContainer: { alignItems: "center", padding: 40, gap: 12 },
  stateText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: "center",
  },
});
