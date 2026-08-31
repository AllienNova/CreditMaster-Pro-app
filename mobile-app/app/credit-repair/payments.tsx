/**
 * Fynvita Payments (Bills) Screen
 *
 * Real-data wiring (PARITY-P2): renders the user's real recurring bills from
 * GET /api/financial/bills (withPermission "financial:read") via billsApi.getBills,
 * adapted web -> mobile by mapWebBill. Fetch on mount with honest inline
 * loading / error / empty states, a retry, and pull-to-refresh.
 *
 * The former hardcoded PAYMENTS array, the local Payment interface, the fake
 * setTimeout load, and the fabricated "next payment due in 3 days" calendar card
 * were removed. The screen previously computed an on-time %, showed paid/late/missed
 * per-bill statuses, and a "late" count — all of which describe PAYMENT HISTORY
 * (BillPayment.isLate). No HTTP route exposes payment history
 * (billDetectionService.getPaymentHistory is unwired), so those metrics have no
 * honest source and are OMITTED rather than fabricated. Only the fields the bills
 * endpoint truly provides are shown; the two summary stats (bill count, autopay
 * count) are computed from the real bills.
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
import { ScreenError } from "../../src/components/ScreenError";
import { lightTheme as theme } from "../../src/constants/theme";
import { Card } from "../../src/components/Card";
import { billsApi } from "../../src/services/api/financial";
import type { BillItem } from "../../src/services/api/financial";
import { toArray } from "../../src/store/toArray";

// dueDate arrives as an ISO string; render a compact locale date.
function formatDate(iso?: string): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString();
}

// category is a snake_case enum from the web (credit_card, ...); show it with
// spaces. This only reformats the real value — it never invents one.
function formatCategory(category: string): string {
  return category.replace(/_/g, " ");
}

export default function PaymentsScreen() {
  const [bills, setBills] = useState<BillItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchBills = useCallback(async () => {
    const res = await billsApi.getBills();
    if (res.success && res.data) {
      setBills(toArray<BillItem>(res?.data?.bills));
      setError(null);
    } else {
      setError(res.error?.message ?? "Unable to load bills.");
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
      // try/finally: a REJECTED request used to skip setLoading(false)
      // entirely, leaving a permanent spinner the user cannot escape —
      // indistinguishable from a slow network. See G-033.
    try {
      await fetchBills();
    } finally {
      setLoading(false);
    }
  }, [fetchBills]);

  useEffect(() => {
    load();
  }, [load]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchBills();
    setRefreshing(false);
  };

  // Summary — computed from the real bills. An on-time % and a "late" count are
  // intentionally absent: they need payment history, which no endpoint exposes.
  const totalBills = bills.length;
  const autopayCount = bills.filter((b) => b.isAutoPay).length;

  if (loading && bills.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.centered} testID="credit-repair-payments-loading">
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.stateText}>Loading bills...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error && bills.length === 0) {
    return (
      <ScreenError
        title="Bills"
        message={error}
        onRetry={load}
        testID="credit-repair-payments-error"
      />
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
            <Text style={styles.title}>Bills</Text>
            <Text style={styles.subtitle}>Your upcoming bills</Text>
          </View>
        </View>

        {/* Stats — computed from real bills */}
        <Card style={styles.statsCard}>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{totalBills}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: theme.colors.primary }]}>
                {autopayCount}
              </Text>
              <Text style={styles.statLabel}>On Autopay</Text>
            </View>
          </View>
        </Card>

        {/* Bills List */}
        <View style={styles.billsList}>
          <Text style={styles.sectionTitle}>Your Bills</Text>
          {bills.length === 0 ? (
            <View style={styles.emptyCard} testID="credit-repair-payments-empty">
              <Ionicons
                name="receipt-outline"
                size={40}
                color={theme.colors.textSecondary}
              />
              <Text style={styles.emptyTitle}>No bills yet</Text>
              <Text style={styles.emptyText}>
                Bills you add or that Fynvita detects from your linked accounts
                will show here with their amounts and due dates.
              </Text>
            </View>
          ) : (
            bills.map((bill) => (
              <Card key={bill.id} style={styles.billCard}>
                <View style={styles.billRow}>
                  <View style={styles.billIcon}>
                    <Ionicons
                      name="receipt-outline"
                      size={20}
                      color={theme.colors.primary}
                    />
                  </View>
                  <View style={styles.billInfo}>
                    <Text style={styles.billMerchant}>{bill.merchant}</Text>
                    <Text style={styles.billMeta}>
                      {formatDate(bill.dueDate) !== ""
                        ? `Due ${formatDate(bill.dueDate)}`
                        : "No due date"}
                      {bill.category ? ` · ${formatCategory(bill.category)}` : ""}
                    </Text>
                  </View>
                  <View style={styles.billRight}>
                    <Text style={styles.billAmount}>
                      ${bill.amount.toLocaleString()}
                    </Text>
                    {bill.isAutoPay && (
                      <Text style={styles.autopayTag}>Autopay</Text>
                    )}
                  </View>
                </View>
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
  statsCard: {
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    padding: theme.spacing.lg,
  },
  statsRow: { flexDirection: "row", alignItems: "center" },
  statItem: { flex: 1, alignItems: "center" },
  statValue: { fontSize: 22, fontWeight: "700", color: theme.colors.text },
  statLabel: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 4 },
  statDivider: { width: 1, height: 36, backgroundColor: theme.colors.border },
  billsList: {
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: 12,
  },
  billCard: { marginBottom: theme.spacing.sm, padding: theme.spacing.md },
  billRow: { flexDirection: "row", alignItems: "center" },
  billIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: `${theme.colors.primary}15`,
    justifyContent: "center",
    alignItems: "center",
  },
  billInfo: { flex: 1, marginLeft: 12 },
  billMerchant: { fontSize: 14, fontWeight: "600", color: theme.colors.text },
  billMeta: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
    textTransform: "capitalize",
  },
  billRight: { alignItems: "flex-end" },
  billAmount: { fontSize: 16, fontWeight: "700", color: theme.colors.text },
  autopayTag: {
    fontSize: 11,
    fontWeight: "600",
    color: theme.colors.primary,
    marginTop: 2,
  },
  emptyCard: { padding: theme.spacing.xl, alignItems: "center" },
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
