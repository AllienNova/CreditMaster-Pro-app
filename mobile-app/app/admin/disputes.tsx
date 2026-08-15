/**
 * Fynvita Admin Disputes Management Screen
 *
 * Real-data wiring (PARITY): the former hardcoded DISPUTES array and the fake
 * setTimeout load were removed. The screen now fetches every platform dispute
 * from the same real, admin-guarded route the web admin renders against
 * (GET /api/admin/disputes — withRole("admin")) via adminDisputesApi.getDisputes,
 * with honest loading / error / empty states. Statuses, bureaus, and item types
 * are the real DB values (the mock's invented "pending"/"processing" statuses are
 * gone); the status filter now offers the real disputes-table status enum. No
 * value is fabricated — a missing field renders empty, never a placeholder.
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { lightTheme as theme } from "../../src/constants/theme";
import { Card } from "../../src/components/Card";
import {
  adminDisputesApi,
  ADMIN_DISPUTE_STATUSES,
} from "../../src/services/api/admin";
import type { AdminDispute } from "../../src/services/api/admin";
import { toArray } from "../../src/store/toArray";

// Humanize a real DB status/enum value for display: "under_review" -> "Under Review".
// Presentation only — the underlying value stays the real status.
function formatStatus(status: string): string {
  return status
    .split("_")
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(" ");
}

function statusColor(status: string): string {
  switch (status) {
    case "draft":
      return theme.colors.textSecondary;
    case "sent":
      return theme.colors.primary;
    case "under_review":
      return theme.colors.warning;
    case "resolved":
      return theme.colors.success;
    case "rejected":
      return theme.colors.error;
    case "escalated":
      return theme.colors.secondary;
    default:
      return theme.colors.textSecondary;
  }
}

export default function AdminDisputesScreen() {
  const [disputes, setDisputes] = useState<AdminDispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  const loadDisputes = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await adminDisputesApi.getDisputes();
    if (res.success && res.data) {
      setDisputes(toArray<AdminDispute>(res?.data));
    } else {
      setError(res.error?.message ?? "Unable to load disputes right now.");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadDisputes();
  }, [loadDisputes]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDisputes();
    setRefreshing(false);
  };

  // First load only: keep any existing rows on screen while a refresh is in flight.
  if (loading && disputes.length === 0 && !error) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.loadingContainer} testID="admin-disputes-loading">
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading disputes...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error && disputes.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.loadingContainer} testID="admin-disputes-error">
          <Ionicons
            name="cloud-offline-outline"
            size={48}
            color={theme.colors.textSecondary}
          />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadDisputes}>
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const filteredDisputes = statusFilter
    ? disputes.filter((d) => d.status === statusFilter)
    : disputes;

  // Stats computed from the real list — all real disputes-table statuses.
  const stats = {
    total: disputes.length,
    underReview: disputes.filter((d) => d.status === "under_review").length,
    resolved: disputes.filter((d) => d.status === "resolved").length,
    rejected: disputes.filter((d) => d.status === "rejected").length,
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary}
          />
        }
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.title}>All Disputes</Text>
            <Text style={styles.subtitle}>Manage platform disputes</Text>
          </View>
        </View>

        {disputes.length === 0 ? (
          <View style={styles.emptyContainer} testID="admin-disputes-empty">
            <Ionicons
              name="document-text-outline"
              size={48}
              color={theme.colors.textSecondary}
            />
            <Text style={styles.emptyText}>No disputes on the platform yet.</Text>
          </View>
        ) : (
          <>
            {/* Stats */}
            <View style={styles.statsRow}>
              <Card style={styles.statCard}>
                <Text style={styles.statValue}>{stats.total}</Text>
                <Text style={styles.statLabel}>Total</Text>
              </Card>
              <Card
                style={[
                  styles.statCard,
                  { backgroundColor: `${theme.colors.warning}10` },
                ]}
              >
                <Text style={[styles.statValue, { color: theme.colors.warning }]}>
                  {stats.underReview}
                </Text>
                <Text style={styles.statLabel}>Under Review</Text>
              </Card>
              <Card
                style={[
                  styles.statCard,
                  { backgroundColor: `${theme.colors.success}10` },
                ]}
              >
                <Text style={[styles.statValue, { color: theme.colors.success }]}>
                  {stats.resolved}
                </Text>
                <Text style={styles.statLabel}>Resolved</Text>
              </Card>
              <Card
                style={[
                  styles.statCard,
                  { backgroundColor: `${theme.colors.error}10` },
                ]}
              >
                <Text style={[styles.statValue, { color: theme.colors.error }]}>
                  {stats.rejected}
                </Text>
                <Text style={styles.statLabel}>Rejected</Text>
              </Card>
            </View>

            {/* Filters — the real disputes-table status enum */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.filterRow}
            >
              {["All", ...ADMIN_DISPUTE_STATUSES].map((status) => {
                const active =
                  statusFilter === status ||
                  (status === "All" && !statusFilter);
                return (
                  <TouchableOpacity
                    key={status}
                    style={[
                      styles.filterChip,
                      active && styles.filterChipActive,
                    ]}
                    onPress={() =>
                      setStatusFilter(status === "All" ? null : status)
                    }
                  >
                    <Text
                      style={[
                        styles.filterText,
                        active && styles.filterTextActive,
                      ]}
                    >
                      {status === "All" ? "All" : formatStatus(status)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Disputes List */}
            <View style={styles.disputesList}>
              {filteredDisputes.length === 0 ? (
                <Text style={styles.noMatchText}>
                  No disputes match this filter.
                </Text>
              ) : (
                filteredDisputes.map((dispute) => (
                  <Card key={dispute.id} style={styles.disputeCard}>
                    <View style={styles.disputeHeader}>
                      <View style={styles.disputeIdBadge}>
                        <Text style={styles.disputeId}>{dispute.id}</Text>
                      </View>
                      <View
                        style={[
                          styles.statusBadge,
                          {
                            backgroundColor: `${statusColor(dispute.status)}20`,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusText,
                            { color: statusColor(dispute.status) },
                          ]}
                        >
                          {formatStatus(dispute.status)}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.disputeUser}>{dispute.user}</Text>
                    <View style={styles.disputeDetails}>
                      <View style={styles.detailItem}>
                        <Ionicons
                          name="business"
                          size={14}
                          color={theme.colors.textSecondary}
                        />
                        <Text style={styles.detailText}>{dispute.bureau}</Text>
                      </View>
                      <View style={styles.detailItem}>
                        <Ionicons
                          name="document-text"
                          size={14}
                          color={theme.colors.textSecondary}
                        />
                        <Text style={styles.detailText}>{dispute.type}</Text>
                      </View>
                    </View>
                    <Text style={styles.disputeDate}>
                      Created: {dispute.created}
                    </Text>
                  </Card>
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scrollView: { flex: 1 },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: theme.spacing.xl,
  },
  loadingText: {
    marginTop: theme.spacing.md,
    color: theme.colors.textSecondary,
  },
  errorText: {
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.md,
    color: theme.colors.textSecondary,
    textAlign: "center",
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: theme.colors.primary,
  },
  retryText: { color: "#FFFFFF", fontWeight: "600", fontSize: 14 },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: theme.spacing.xl * 2,
    paddingHorizontal: theme.spacing.xl,
  },
  emptyText: {
    marginTop: theme.spacing.md,
    color: theme.colors.textSecondary,
    textAlign: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: theme.spacing.lg,
  },
  backButton: { padding: theme.spacing.sm },
  headerContent: { flex: 1, marginLeft: theme.spacing.sm },
  title: { fontSize: 24, fontWeight: "700", color: theme.colors.text },
  subtitle: { fontSize: 14, color: theme.colors.textSecondary },
  statsRow: {
    flexDirection: "row",
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  statCard: {
    flex: 1,
    marginHorizontal: 2,
    alignItems: "center",
    paddingVertical: theme.spacing.sm,
  },
  statValue: { fontSize: 20, fontWeight: "700", color: theme.colors.text },
  statLabel: { fontSize: 10, color: theme.colors.textSecondary, marginTop: 2 },
  filterRow: {
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    marginRight: 8,
  },
  filterChipActive: { backgroundColor: theme.colors.primary },
  filterText: { fontSize: 12, color: theme.colors.textSecondary },
  filterTextActive: { color: "#fff", fontWeight: "600" },
  disputesList: { paddingHorizontal: theme.spacing.lg },
  noMatchText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    paddingVertical: theme.spacing.md,
    textAlign: "center",
  },
  disputeCard: { marginBottom: theme.spacing.sm, padding: theme.spacing.md },
  disputeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  disputeIdBadge: {
    backgroundColor: theme.colors.background,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  disputeId: {
    fontSize: 12,
    fontWeight: "600",
    color: theme.colors.textSecondary,
  },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 11, fontWeight: "600" },
  disputeUser: { fontSize: 16, fontWeight: "600", color: theme.colors.text },
  disputeDetails: { flexDirection: "row", marginTop: 8 },
  detailItem: { flexDirection: "row", alignItems: "center", marginRight: 16 },
  detailText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginLeft: 4,
  },
  disputeDate: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 8,
  },
});
