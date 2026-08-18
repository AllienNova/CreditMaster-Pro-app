/**
 * Admin Subscriptions — the real subscriptions table.
 *
 * WHAT THIS REPLACED. A SUBSCRIPTIONS fixture naming john@example.com on a
 * "pro" plan at $29.99, sarah@example.com on "enterprise" at $99.99, and four
 * more — behind a FAKE loading spinner:
 *
 *   useEffect(() => { setTimeout(() => setLoading(false), 800); }, []);
 *
 * The MRR and active-subscription counts on the header were sums over that
 * fixture, so an operator read a revenue figure computed from invented rows.
 *
 * GET /api/admin/subscriptions (withRole "admin") reads the real subscriptions
 * table, joined to profiles and enriched with each user's auth email.
 *
 * THE PLAN CHIPS WERE INVENTED. free | basic | pro | enterprise — this product
 * sells Free, Standard, Pro, Family Duo, Family and Family Plus. There is no
 * "basic" and no "enterprise" tier, so two chips could never match and four
 * real tiers had no chip at all. They are now built from the plans actually
 * present in the data.
 */

import React, { useState, useEffect, useCallback } from "react";
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
import {
  adminSubscriptionsApi,
  type AdminSubscription,
} from "../../src/services/api/admin";

export default function AdminSubscriptionsScreen() {
  const [subs, setSubs] = useState<AdminSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [planFilter, setPlanFilter] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const res = await adminSubscriptionsApi.getSubscriptions();

    if (!res.success || !res.data) {
      // No empty-list fallback: an operator seeing zero subscriptions would
      // conclude something very different from "we could not read the table".
      setError("We could not load subscriptions.");
      setLoading(false);
      return;
    }

    setSubs(res.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case "free":
        return theme.colors.textSecondary;
      case "basic":
        return theme.colors.primary;
      case "pro":
        return theme.colors.secondary;
      case "enterprise":
        return theme.colors.warning;
      default:
        return theme.colors.textSecondary;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return theme.colors.success;
      case "cancelled":
        return theme.colors.error;
      case "past_due":
        return theme.colors.warning;
      default:
        return theme.colors.textSecondary;
    }
  };

  // Built from the plans actually present, not from a list of tier names
  // somebody guessed.
  const plans = Array.from(
    new Set(subs.map((s) => s.plan).filter(Boolean)),
  ).sort();

  const filteredSubs = planFilter
    ? subs.filter((s) => s.plan === planFilter)
    : subs;

  const active = subs.filter((s) => s.status === "active");
  // Rows carrying no amount are EXCLUDED from MRR rather than counted as 0,
  // and the count of excluded ones is shown. A subscription whose price we do
  // not have is not a subscription worth nothing.
  const totalMRR = active.reduce((sum, s) => sum + (s.amount ?? 0), 0);
  const unpricedCount = active.filter((s) => s.amount === null).length;
  const activeCount = active.length;

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading subscriptions...</Text>
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
            <Text style={styles.title}>Subscriptions</Text>
            <Text style={styles.subtitle}>Manage billing & plans</Text>
          </View>
        </View>

        {/* Revenue Stats */}
        <View style={styles.statsRow}>
          <Card
            style={[
              styles.statCard,
              { backgroundColor: `${theme.colors.success}10` },
            ]}
          >
            <Text style={[styles.statValue, { color: theme.colors.success }]}>
              ${totalMRR.toFixed(2)}
            </Text>
            <Text style={styles.statLabel}>Monthly Revenue</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={styles.statValue}>{activeCount}</Text>
            <Text style={styles.statLabel}>Active Subs</Text>
          </Card>
          <Card
            style={[
              styles.statCard,
              { backgroundColor: `${theme.colors.warning}10` },
            ]}
          >
            <Text style={[styles.statValue, { color: theme.colors.warning }]}>
              {subs.filter((s) => s.status === "past_due").length}
            </Text>
            <Text style={styles.statLabel}>Past Due</Text>
          </Card>
        </View>

        {/* Said out loud rather than folded into MRR. A subscription whose
            price we do not have is not a subscription worth nothing. */}
        {unpricedCount > 0 && (
          <Text style={styles.loadingText}>
            {unpricedCount} active{" "}
            {unpricedCount === 1 ? "subscription has" : "subscriptions have"} no
            recorded amount and {unpricedCount === 1 ? "is" : "are"} excluded
            from MRR.
          </Text>
        )}

        {error ? (
          <Card>
            <Text style={styles.loadingText}>{error}</Text>
            <TouchableOpacity onPress={load}>
              <Text style={styles.retryText}>Try again</Text>
            </TouchableOpacity>
          </Card>
        ) : subs.length === 0 ? (
          <Card>
            <Text style={styles.loadingText}>
              No subscriptions recorded yet.
            </Text>
          </Card>
        ) : null}

        {/* Filters */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterRow}
        >
          {["All", ...plans].map((plan) => (
            <TouchableOpacity
              key={plan}
              style={[
                styles.filterChip,
                (planFilter === plan || (plan === "All" && !planFilter)) &&
                  styles.filterChipActive,
              ]}
              onPress={() => setPlanFilter(plan === "All" ? null : plan)}
            >
              <Text
                style={[
                  styles.filterText,
                  (planFilter === plan || (plan === "All" && !planFilter)) &&
                    styles.filterTextActive,
                ]}
              >
                {plan.charAt(0).toUpperCase() + plan.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Subscriptions List */}
        <View style={styles.subsList}>
          {filteredSubs.map((sub) => (
            <Card key={sub.id} style={styles.subCard}>
              <View style={styles.subHeader}>
                <View
                  style={[
                    styles.planBadge,
                    { backgroundColor: `${getPlanColor(sub.plan)}15` },
                  ]}
                >
                  <Text
                    style={[styles.planText, { color: getPlanColor(sub.plan) }]}
                  >
                    {sub.plan ? sub.plan.toUpperCase() : "—"}
                  </Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: `${getStatusColor(sub.status)}15` },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      { color: getStatusColor(sub.status) },
                    ]}
                  >
                    {sub.status ? sub.status.replace(/_/g, " ") : "—"}
                  </Text>
                </View>
              </View>
              <Text style={styles.subUser}>{sub.user}</Text>
              <View style={styles.subDetails}>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Amount</Text>
                  <Text style={styles.detailValue}>
                    {/* "—" rather than "$0.00": one states we have no price,
                        the other states the price is nothing. */}
                    {sub.amount === null ? "—" : `$${sub.amount.toFixed(2)}/mo`}
                  </Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Next Billing</Text>
                  <Text style={styles.detailValue}>
                    {sub.nextBilling
                      ? new Date(sub.nextBilling).toLocaleDateString()
                      : "—"}
                  </Text>
                </View>
              </View>
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
    textAlign: "center",
  },
  retryText: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.primary,
    textAlign: "center",
    marginTop: theme.spacing.sm,
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
    marginHorizontal: 4,
    alignItems: "center",
    paddingVertical: theme.spacing.md,
  },
  statValue: { fontSize: 18, fontWeight: "700", color: theme.colors.text },
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
  subsList: {
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
  },
  subCard: { marginBottom: theme.spacing.sm, padding: theme.spacing.md },
  subHeader: { flexDirection: "row", marginBottom: 8 },
  planBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  planText: { fontSize: 10, fontWeight: "700" },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 10, fontWeight: "600", textTransform: "capitalize" },
  subUser: { fontSize: 15, fontWeight: "600", color: theme.colors.text },
  subDetails: {
    flexDirection: "row",
    marginTop: 12,
    justifyContent: "space-between",
  },
  detailItem: {},
  detailLabel: { fontSize: 11, color: theme.colors.textSecondary },
  detailValue: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.text,
    marginTop: 2,
  },
});
