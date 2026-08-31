/**
 * Fynvita Billing Overview Screen
 *
 * Real-data wiring (PARITY-P2): the current plan, default payment method, and
 * recent invoices are fetched from the real Stripe-backed web route
 * GET /api/payment/billing (withPermission("billing:read")) via
 * subscriptionApi.getBillingOverview, adapted web -> mobile by mapWebBilling.
 *
 * The former hardcoded BILLING_DATA — which invented a "Visa •••• 4242" card, a
 * fixed next-billing date, and three static invoices (the mobile face of FND-016)
 * — and the fake setTimeout load were removed. Payment method now shows the user's
 * real default card from Stripe or an honest "no payment method on file" state;
 * recent invoices show real Stripe invoices or an empty state. No card number is
 * hardcoded and none is fabricated.
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
import { subscriptionApi } from "../../src/services/api/user";
import type { BillingOverview } from "../../src/services/api/user";

const STATUS_COLORS: Record<string, string> = {
  active: theme.colors.success,
  trialing: theme.colors.success,
  past_due: theme.colors.warning,
  incomplete: theme.colors.warning,
  unpaid: theme.colors.error,
  canceled: theme.colors.error,
};

function titleCase(value: string): string {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatStatus(status: string): string {
  return titleCase(status.replace(/_/g, " "));
}

function formatExpiry(month: number, year: number): string {
  const mm = String(month).padStart(2, "0");
  const yy = String(year % 100).padStart(2, "0");
  return `${mm}/${yy}`;
}

export default function BillingScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [billing, setBilling] = useState<BillingOverview | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadBilling = useCallback(async () => {
    setLoading(true);
    setError(null);
    // try/finally, not a bare await. If getBillingOverview() REJECTS rather
    // than returning { success: false }, the old code never reached
    // setLoading(false) and the screen sat on "Loading billing..." forever —
    // which is what a simulator sweep of /billing showed: 3 elements, a
    // spinner, and no way out. A permanent spinner is worse than an error,
    // because the user cannot tell it from a slow network.
    try {
      const res = await subscriptionApi.getBillingOverview();
      if (res.success && res.data) {
        setBilling(res.data);
      } else {
        setError(res.error?.message ?? "Unable to load billing right now.");
      }
    } catch {
      setError("Unable to load billing right now.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBilling();
  }, [loadBilling]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadBilling();
    setRefreshing(false);
  };

  if (loading && !billing) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.loadingContainer} testID="billing-overview-loading">
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading billing...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error && !billing) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.title}>Billing</Text>
            <Text style={styles.subtitle}>Manage your subscription</Text>
          </View>
        </View>
        <View style={styles.stateBlock} testID="billing-overview-error">
          <Ionicons
            name="cloud-offline-outline"
            size={48}
            color={theme.colors.textSecondary}
          />
          <Text style={styles.stateText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadBilling}>
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const statusColor = billing
    ? (STATUS_COLORS[billing.status] ?? theme.colors.textSecondary)
    : theme.colors.textSecondary;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
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
            <Text style={styles.title}>Billing</Text>
            <Text style={styles.subtitle}>Manage your subscription</Text>
          </View>
        </View>

        {billing && (
          <>
            {/* Current Plan */}
            <Card style={styles.planCard}>
              <View style={styles.planHeader}>
                <View style={styles.planBadge}>
                  <Text style={styles.planBadgeText}>{billing.planName}</Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: `${statusColor}15` },
                  ]}
                >
                  <Text style={[styles.statusText, { color: statusColor }]}>
                    {formatStatus(billing.status)}
                  </Text>
                </View>
              </View>
              <Text style={styles.planPrice}>
                ${billing.price.toFixed(2)}
                <Text style={styles.planPeriod}>/{billing.interval}</Text>
              </Text>
              {billing.nextBilling && (
                <Text style={styles.nextBilling}>
                  {billing.cancelAtPeriodEnd ? "Access ends" : "Next billing"}:{" "}
                  {billing.nextBilling}
                </Text>
              )}
              <TouchableOpacity
                style={styles.managePlanButton}
                onPress={() => router.push("/billing/subscription")}
              >
                <Text style={styles.managePlanText}>Manage Plan</Text>
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={theme.colors.primary}
                />
              </TouchableOpacity>
            </Card>

            {/* Payment Method */}
            <Card style={styles.paymentCard}>
              <Text style={styles.sectionTitle}>Payment Method</Text>
              {billing.paymentMethod ? (
                <View style={styles.paymentRow}>
                  <View style={styles.cardIcon}>
                    <Ionicons
                      name="card"
                      size={24}
                      color={theme.colors.primary}
                    />
                  </View>
                  <View style={styles.cardInfo}>
                    <Text style={styles.cardBrand}>
                      {titleCase(billing.paymentMethod.brand)} ••••{" "}
                      {billing.paymentMethod.last4}
                    </Text>
                    <Text style={styles.cardExpiry}>
                      Expires{" "}
                      {formatExpiry(
                        billing.paymentMethod.expMonth,
                        billing.paymentMethod.expYear,
                      )}
                    </Text>
                  </View>
                </View>
              ) : (
                <Text
                  style={styles.inlineEmptyText}
                  testID="billing-overview-no-payment-method"
                >
                  No payment method on file.
                </Text>
              )}
            </Card>

            {/* Recent Invoices */}
            <Card style={styles.invoicesCard}>
              <View style={styles.invoicesHeader}>
                <Text style={styles.sectionTitle}>Recent Invoices</Text>
                {billing.recentInvoices.length > 0 && (
                  <TouchableOpacity
                    onPress={() => router.push("/billing/invoices")}
                  >
                    <Text style={styles.viewAllText}>View All</Text>
                  </TouchableOpacity>
                )}
              </View>
              {billing.recentInvoices.length > 0 ? (
                billing.recentInvoices.map((invoice) => {
                  const invoiceColor =
                    invoice.status === "paid"
                      ? theme.colors.success
                      : theme.colors.textSecondary;
                  return (
                    <View key={invoice.id} style={styles.invoiceRow}>
                      <View style={styles.invoiceInfo}>
                        <Text style={styles.invoiceId} numberOfLines={1}>
                          {invoice.id}
                        </Text>
                        <Text style={styles.invoiceDate}>{invoice.date}</Text>
                      </View>
                      <Text style={styles.invoiceAmount}>
                        ${invoice.amount.toFixed(2)}
                      </Text>
                      <View
                        style={[
                          styles.invoiceStatus,
                          { backgroundColor: `${invoiceColor}15` },
                        ]}
                      >
                        <Text
                          style={[
                            styles.invoiceStatusText,
                            { color: invoiceColor },
                          ]}
                        >
                          {invoice.status}
                        </Text>
                      </View>
                    </View>
                  );
                })
              ) : (
                <View style={styles.emptyBlock} testID="billing-overview-empty">
                  <Ionicons
                    name="receipt-outline"
                    size={40}
                    color={theme.colors.textSecondary}
                  />
                  <Text style={styles.emptyText}>No invoices yet.</Text>
                </View>
              )}
            </Card>
          </>
        )}
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
  stateBlock: { alignItems: "center", paddingVertical: 40 },
  stateText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.md,
    textAlign: "center",
    paddingHorizontal: theme.spacing.lg,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: theme.colors.primary,
  },
  retryText: { color: "#FFFFFF", fontWeight: "600", fontSize: 14 },
  planCard: {
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    padding: theme.spacing.lg,
  },
  planHeader: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  planBadge: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  planBadgeText: { color: "#fff", fontWeight: "700", fontSize: 12 },
  statusBadge: {
    marginLeft: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: { fontSize: 11, fontWeight: "600" },
  planPrice: { fontSize: 32, fontWeight: "700", color: theme.colors.text },
  planPeriod: {
    fontSize: 16,
    fontWeight: "400",
    color: theme.colors.textSecondary,
  },
  nextBilling: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  managePlanButton: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  managePlanText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.primary,
  },
  paymentCard: {
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    padding: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.textSecondary,
    marginBottom: 12,
    textTransform: "uppercase",
  },
  paymentRow: { flexDirection: "row", alignItems: "center" },
  cardIcon: {
    width: 44,
    height: 44,
    backgroundColor: `${theme.colors.primary}10`,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  cardInfo: { flex: 1, marginLeft: 12 },
  cardBrand: { fontSize: 14, fontWeight: "600", color: theme.colors.text },
  cardExpiry: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
  inlineEmptyText: { fontSize: 14, color: theme.colors.textSecondary },
  invoicesCard: {
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    padding: theme.spacing.lg,
  },
  invoicesHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  viewAllText: { fontSize: 13, color: theme.colors.primary, fontWeight: "600" },
  invoiceRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  invoiceInfo: { flex: 1, marginRight: 12 },
  invoiceId: { fontSize: 13, fontWeight: "600", color: theme.colors.text },
  invoiceDate: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  invoiceAmount: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.text,
    marginRight: 12,
  },
  invoiceStatus: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  invoiceStatusText: {
    fontSize: 10,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  emptyBlock: { alignItems: "center", paddingVertical: 24 },
  emptyText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.sm,
  },
});
