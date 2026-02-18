/**
 * Fynvita Admin Disputes Management Screen
 * View and manage all platform disputes
 */

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { lightTheme as theme } from "../../src/constants/theme";
import { Card } from "../../src/components/Card";

interface Dispute {
  id: string;
  user: string;
  bureau: string;
  status: "pending" | "processing" | "resolved" | "rejected";
  type: string;
  created: string;
}

const DISPUTES: Dispute[] = [
  {
    id: "DSP-001",
    user: "John Doe",
    bureau: "Experian",
    status: "pending",
    type: "Late Payment",
    created: "2024-12-07",
  },
  {
    id: "DSP-002",
    user: "Sarah Smith",
    bureau: "Equifax",
    status: "processing",
    type: "Collection",
    created: "2024-12-06",
  },
  {
    id: "DSP-003",
    user: "Mike Johnson",
    bureau: "TransUnion",
    status: "resolved",
    type: "Identity Error",
    created: "2024-12-05",
  },
  {
    id: "DSP-004",
    user: "Emily Brown",
    bureau: "Experian",
    status: "rejected",
    type: "Account Not Mine",
    created: "2024-12-04",
  },
  {
    id: "DSP-005",
    user: "David Lee",
    bureau: "Equifax",
    status: "pending",
    type: "Balance Error",
    created: "2024-12-03",
  },
  {
    id: "DSP-006",
    user: "Lisa Wang",
    bureau: "TransUnion",
    status: "processing",
    type: "Duplicate Entry",
    created: "2024-12-02",
  },
];

export default function AdminDisputesScreen() {
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  useEffect(() => {
    setTimeout(() => setLoading(false), 800);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return theme.colors.warning;
      case "processing":
        return theme.colors.primary;
      case "resolved":
        return theme.colors.success;
      case "rejected":
        return theme.colors.error;
      default:
        return theme.colors.textSecondary;
    }
  };

  const filteredDisputes = statusFilter
    ? DISPUTES.filter((d) => d.status === statusFilter)
    : DISPUTES;
  const stats = {
    total: DISPUTES.length,
    pending: DISPUTES.filter((d) => d.status === "pending").length,
    processing: DISPUTES.filter((d) => d.status === "processing").length,
    resolved: DISPUTES.filter((d) => d.status === "resolved").length,
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading disputes...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
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
              {stats.pending}
            </Text>
            <Text style={styles.statLabel}>Pending</Text>
          </Card>
          <Card
            style={[
              styles.statCard,
              { backgroundColor: `${theme.colors.primary}10` },
            ]}
          >
            <Text style={[styles.statValue, { color: theme.colors.primary }]}>
              {stats.processing}
            </Text>
            <Text style={styles.statLabel}>Processing</Text>
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
        </View>

        {/* Filters */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterRow}
        >
          {["All", "pending", "processing", "resolved", "rejected"].map(
            (status) => (
              <TouchableOpacity
                key={status}
                style={[
                  styles.filterChip,
                  (statusFilter === status ||
                    (status === "All" && !statusFilter)) &&
                    styles.filterChipActive,
                ]}
                onPress={() =>
                  setStatusFilter(status === "All" ? null : status)
                }
              >
                <Text
                  style={[
                    styles.filterText,
                    (statusFilter === status ||
                      (status === "All" && !statusFilter)) &&
                      styles.filterTextActive,
                  ]}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </Text>
              </TouchableOpacity>
            ),
          )}
        </ScrollView>

        {/* Disputes List */}
        <View style={styles.disputesList}>
          {filteredDisputes.map((dispute) => (
            <Card key={dispute.id} style={styles.disputeCard}>
              <View style={styles.disputeHeader}>
                <View style={styles.disputeIdBadge}>
                  <Text style={styles.disputeId}>{dispute.id}</Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: `${getStatusColor(dispute.status)}20` },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      { color: getStatusColor(dispute.status) },
                    ]}
                  >
                    {dispute.status}
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
              <Text style={styles.disputeDate}>Created: {dispute.created}</Text>
            </Card>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scrollView: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: {
    marginTop: theme.spacing.md,
    color: theme.colors.textSecondary,
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
  statusText: { fontSize: 11, fontWeight: "600", textTransform: "capitalize" },
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
