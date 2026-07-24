/**
 * Fynvita Credit Repair Disputes Screen
 *
 * Real-data wiring (PARITY-P2): renders the user's real disputes from
 * useDisputeStore (fetch on mount, honest inline loading / error / empty
 * states). The former hardcoded DISPUTES array, the local Dispute interface,
 * and the fake setTimeout load were removed. Dispute fields come from the
 * mobile Dispute type fed by disputeApi.getAll (see mapWebDispute) — nothing
 * is fabricated.
 */

import React, { useEffect, useState, useCallback } from "react";
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
import { useDisputeStore } from "../../src/store/disputeStore";
import type { Dispute } from "../../src/services/api/types";

// A dispute is "active" while it is still in flight (not closed out).
const CLOSED_STATUSES: readonly Dispute["status"][] = [
  "resolved",
  "rejected",
  "deleted",
];

function isActive(status: Dispute["status"]): boolean {
  return !CLOSED_STATUSES.includes(status);
}

// createdAt arrives as an ISO string; render a compact locale date.
function formatDate(iso?: string): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString();
}

function titleCase(value: string): string {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}

export default function DisputesScreen() {
  const { disputes, isLoading, error, fetchDisputes } = useDisputeStore();
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(() => {
    fetchDisputes();
  }, [fetchDisputes]);

  useEffect(() => {
    load();
  }, [load]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchDisputes();
    setRefreshing(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft":
        return theme.colors.textSecondary;
      case "pending":
      case "ready":
        return theme.colors.warning;
      case "in_progress":
      case "sent":
      case "under_review":
        return theme.colors.primary;
      case "resolved":
        return theme.colors.success;
      case "rejected":
      case "deleted":
        return theme.colors.error;
      default:
        return theme.colors.textSecondary;
    }
  };

  const total = disputes.length;
  const activeCount = disputes.filter((d) => isActive(d.status)).length;
  const resolvedCount = disputes.filter((d) => d.status === "resolved").length;

  if (isLoading && disputes.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.centered} testID="credit-repair-disputes-loading">
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.stateText}>Loading disputes...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error && disputes.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.centered} testID="credit-repair-disputes-error">
          <Ionicons
            name="cloud-offline-outline"
            size={48}
            color={theme.colors.textSecondary}
          />
          <Text style={styles.stateText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={load}>
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
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
            <Text style={styles.title}>Disputes</Text>
            <Text style={styles.subtitle}>Track your disputes</Text>
          </View>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => router.push("/dispute/create" as never)}
          >
            <Ionicons name="add" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Stats — computed from real disputes */}
        <View style={styles.statsRow}>
          <Card style={styles.statCard}>
            <Text style={styles.statValue}>{total}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </Card>
          <Card
            style={[
              styles.statCard,
              { backgroundColor: `${theme.colors.primary}10` },
            ]}
          >
            <Text style={[styles.statValue, { color: theme.colors.primary }]}>
              {activeCount}
            </Text>
            <Text style={styles.statLabel}>Active</Text>
          </Card>
          <Card
            style={[
              styles.statCard,
              { backgroundColor: `${theme.colors.success}10` },
            ]}
          >
            <Text style={[styles.statValue, { color: theme.colors.success }]}>
              {resolvedCount}
            </Text>
            <Text style={styles.statLabel}>Resolved</Text>
          </Card>
        </View>

        {/* Disputes List */}
        {disputes.length === 0 ? (
          <View style={styles.emptyCard} testID="credit-repair-disputes-empty">
            <Ionicons
              name="document-text-outline"
              size={40}
              color={theme.colors.textSecondary}
            />
            <Text style={styles.emptyTitle}>No disputes yet</Text>
            <Text style={styles.emptyText}>
              File a dispute to challenge inaccurate items on your credit report.
            </Text>
          </View>
        ) : (
          <View style={styles.disputesList}>
            {disputes.map((dispute) => {
              const itemLabel = dispute.itemType || dispute.creditorName;
              const showCreditor =
                dispute.creditorName && dispute.itemType
                  ? dispute.creditorName
                  : "";
              const dateLabel = formatDate(dispute.createdAt);
              return (
                <Card key={dispute.id} style={styles.disputeCard}>
                  <View style={styles.disputeHeader}>
                    <Text style={styles.disputeItem}>{itemLabel}</Text>
                    <View
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor: `${getStatusColor(dispute.status)}15`,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          { color: getStatusColor(dispute.status) },
                        ]}
                      >
                        {dispute.status.replace(/_/g, " ")}
                      </Text>
                    </View>
                  </View>
                  {showCreditor !== "" && (
                    <Text style={styles.disputeCreditor}>{showCreditor}</Text>
                  )}
                  <View style={styles.disputeDetails}>
                    <View style={styles.detailItem}>
                      <Ionicons
                        name="business"
                        size={14}
                        color={theme.colors.textSecondary}
                      />
                      <Text style={styles.detailText}>
                        {titleCase(dispute.bureau)}
                      </Text>
                    </View>
                    {dateLabel !== "" && (
                      <View style={styles.detailItem}>
                        <Ionicons
                          name="calendar"
                          size={14}
                          color={theme.colors.textSecondary}
                        />
                        <Text style={styles.detailText}>{dateLabel}</Text>
                      </View>
                    )}
                  </View>
                </Card>
              );
            })}
          </View>
        )}

        {/* New Dispute Button */}
        <TouchableOpacity
          style={styles.newDisputeButton}
          onPress={() => router.push("/dispute/create" as never)}
        >
          <Ionicons name="add-circle" size={22} color="#fff" />
          <Text style={styles.newDisputeText}>File New Dispute</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scrollView: { flex: 1 },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: theme.spacing.xl,
  },
  stateText: {
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: theme.spacing.lg,
  },
  backButton: { padding: theme.spacing.sm },
  headerContent: { flex: 1, marginLeft: theme.spacing.sm },
  title: { fontSize: 24, fontWeight: "700", color: theme.colors.text },
  subtitle: { fontSize: 14, color: theme.colors.textSecondary },
  addButton: {
    width: 40,
    height: 40,
    backgroundColor: theme.colors.primary,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  statsRow: {
    flexDirection: "row",
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  statCard: {
    flex: 1,
    marginHorizontal: 4,
    alignItems: "center",
    paddingVertical: theme.spacing.md,
  },
  statValue: { fontSize: 22, fontWeight: "700", color: theme.colors.text },
  statLabel: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 2 },
  disputesList: { paddingHorizontal: theme.spacing.lg },
  disputeCard: { marginBottom: theme.spacing.sm, padding: theme.spacing.md },
  disputeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  disputeItem: {
    fontSize: 15,
    fontWeight: "600",
    color: theme.colors.text,
    flex: 1,
  },
  disputeCreditor: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 10, fontWeight: "600", textTransform: "capitalize" },
  disputeDetails: { flexDirection: "row" },
  detailItem: { flexDirection: "row", alignItems: "center", marginRight: 16 },
  detailText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginLeft: 4,
  },
  emptyCard: {
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    padding: theme.spacing.xl,
    alignItems: "center",
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
    marginTop: theme.spacing.md,
  },
  emptyText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 4,
    textAlign: "center",
  },
  newDisputeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.primary,
    marginHorizontal: theme.spacing.lg,
    marginVertical: theme.spacing.lg,
    paddingVertical: 14,
    borderRadius: 12,
  },
  newDisputeText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
    marginLeft: 8,
  },
});
