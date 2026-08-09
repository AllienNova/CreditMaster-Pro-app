/**
 * Fynvita Debt Negotiation Screen
 *
 * Real-data wiring (PARITY-P2): renders the user's real pay-for-delete
 * negotiations from GET /api/credit-repair/negotiate (withAuth) via
 * creditRepairApi.getNegotiations, adapted web -> mobile by mapWebNegotiation.
 * Fetch on mount with honest inline loading / error / empty states, a retry, and
 * pull-to-refresh. The former hardcoded DEBTS array, the local Debt interface,
 * and the fake setTimeout load were removed; the summary is computed from the
 * real negotiations. Nothing is fabricated.
 */

import React, { useCallback, useEffect, useState } from "react";
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
import { creditRepairApi } from "../../src/services/api/creditRepair";
import type {
  NegotiationDebt,
  NegotiationStatus,
} from "../../src/services/api/creditRepair";

// updatedAt arrives as an ISO string; render a compact locale date.
function formatDate(iso?: string): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString();
}

export default function NegotiateScreen() {
  const [debts, setDebts] = useState<NegotiationDebt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDebts = useCallback(async () => {
    const res = await creditRepairApi.getNegotiations();
    if (res.success && res.data) {
      setDebts(res.data.debts);
      setError(null);
    } else {
      setError(res.error?.message ?? "Unable to load negotiations.");
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    await fetchDebts();
    setLoading(false);
  }, [fetchDebts]);

  useEffect(() => {
    load();
  }, [load]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchDebts();
    setRefreshing(false);
  };

  // status is a closed union (NegotiationStatus); the switch is exhaustive.
  const getStatusColor = (status: NegotiationStatus): string => {
    switch (status) {
      case "active":
        return theme.colors.error;
      case "negotiating":
        return theme.colors.warning;
      case "settled":
        return theme.colors.success;
    }
  };

  const totalDebt = debts.reduce((sum, d) => sum + d.balance, 0);
  const totalSaved = debts.reduce(
    (sum, d) => sum + (d.originalBalance - d.balance),
    0,
  );

  if (loading && debts.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.centered} testID="credit-repair-negotiate-loading">
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.stateText}>Loading negotiations...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error && debts.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.centered} testID="credit-repair-negotiate-error">
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
            <Text style={styles.title}>Debt Negotiation</Text>
            <Text style={styles.subtitle}>Negotiate with creditors</Text>
          </View>
        </View>

        {/* Summary — computed from real negotiations */}
        <Card style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text
                style={[styles.summaryValue, { color: theme.colors.error }]}
              >
                ${totalDebt.toLocaleString()}
              </Text>
              <Text style={styles.summaryLabel}>Total Debt</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text
                style={[styles.summaryValue, { color: theme.colors.success }]}
              >
                ${totalSaved.toLocaleString()}
              </Text>
              <Text style={styles.summaryLabel}>Total Saved</Text>
            </View>
          </View>
        </Card>

        {/* Tips */}
        <Card style={styles.tipsCard}>
          <Text style={styles.tipsTitle}>Negotiation Tips</Text>
          <View style={styles.tipItem}>
            <Ionicons
              name="checkmark-circle"
              size={16}
              color={theme.colors.success}
            />
            <Text style={styles.tipText}>Always get agreements in writing</Text>
          </View>
          <View style={styles.tipItem}>
            <Ionicons
              name="checkmark-circle"
              size={16}
              color={theme.colors.success}
            />
            <Text style={styles.tipText}>Start with 25-50% of the balance</Text>
          </View>
          <View style={styles.tipItem}>
            <Ionicons
              name="checkmark-circle"
              size={16}
              color={theme.colors.success}
            />
            <Text style={styles.tipText}>
              Request "pay for delete" agreements
            </Text>
          </View>
        </Card>

        {/* Debts List */}
        <View style={styles.debtsList}>
          <Text style={styles.sectionTitle}>Your Debts</Text>
          {debts.length === 0 ? (
            <View
              style={styles.emptyCard}
              testID="credit-repair-negotiate-empty"
            >
              <Ionicons
                name="chatbubbles-outline"
                size={40}
                color={theme.colors.textSecondary}
              />
              <Text style={styles.emptyTitle}>No debts in negotiation yet</Text>
              <Text style={styles.emptyText}>
                Start a pay-for-delete negotiation with a collection agency to
                settle a debt for less than the full balance.
              </Text>
            </View>
          ) : (
            debts.map((debt) => (
              <Card key={debt.id} style={styles.debtCard}>
                <View style={styles.debtHeader}>
                  <Text style={styles.debtCreditor}>{debt.creditor}</Text>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: `${getStatusColor(debt.status)}15` },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        { color: getStatusColor(debt.status) },
                      ]}
                    >
                      {debt.status}
                    </Text>
                  </View>
                </View>
                <View style={styles.debtDetails}>
                  <View style={styles.debtAmounts}>
                    <Text style={styles.debtBalance}>
                      ${debt.balance.toLocaleString()}
                    </Text>
                    {debt.balance < debt.originalBalance && (
                      <Text style={styles.debtOriginal}>
                        was ${debt.originalBalance.toLocaleString()}
                      </Text>
                    )}
                  </View>
                  {formatDate(debt.updatedAt) !== "" && (
                    <Text style={styles.debtContact}>
                      Updated {formatDate(debt.updatedAt)}
                    </Text>
                  )}
                </View>
                {debt.status !== "settled" && (
                  <TouchableOpacity style={styles.negotiateButton}>
                    <Text style={styles.negotiateText}>
                      {debt.status === "negotiating"
                        ? "Continue Negotiation"
                        : "Start Negotiation"}
                    </Text>
                  </TouchableOpacity>
                )}
              </Card>
            ))
          )}
        </View>
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
  summaryCard: {
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    padding: theme.spacing.lg,
  },
  summaryRow: { flexDirection: "row", alignItems: "center" },
  summaryItem: { flex: 1, alignItems: "center" },
  summaryValue: { fontSize: 24, fontWeight: "700" },
  summaryLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: theme.colors.border,
  },
  tipsCard: {
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    padding: theme.spacing.md,
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: 12,
  },
  tipItem: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  tipText: { fontSize: 13, color: theme.colors.text, marginLeft: 8 },
  debtsList: {
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: 12,
  },
  debtCard: { marginBottom: theme.spacing.sm, padding: theme.spacing.md },
  debtHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  debtCreditor: { fontSize: 15, fontWeight: "600", color: theme.colors.text },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 10, fontWeight: "600", textTransform: "capitalize" },
  debtDetails: { marginBottom: 12 },
  debtAmounts: { flexDirection: "row", alignItems: "baseline" },
  debtBalance: { fontSize: 22, fontWeight: "700", color: theme.colors.text },
  debtOriginal: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginLeft: 8,
    textDecorationLine: "line-through",
  },
  debtContact: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  negotiateButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  negotiateText: { fontSize: 14, fontWeight: "600", color: "#fff" },
  emptyCard: {
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
});
