/**
 * Fynvita Invoices Screen
 *
 * Real-data wiring (PARITY-P2): the full billing history is fetched from the real
 * Stripe-backed web route GET /api/payment/billing (withPermission("billing:read"))
 * via subscriptionApi.getInvoices, adapted web -> mobile by mapWebInvoices.
 *
 * The former hardcoded INVOICES array (INV-001..007, with fabricated "Pro Plan -
 * December 2024" descriptions) and its fake setTimeout load were removed. Invoice
 * ids, amounts, dates, and statuses now come from real Stripe invoices; the status
 * is remapped to paid | pending | failed. When an invoice carries a real PDF link,
 * a "View PDF" action opens it through the scheme-allowlisted opener (FND-070);
 * invoices without a PDF show no action. No card data is rendered on this screen.
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
import type { InvoiceStatus, InvoiceView } from "../../src/services/api/user";
import { openExternalUrl } from "../../src/utils/openExternalUrl";

const FILTERS: { key: InvoiceStatus | null; label: string }[] = [
  { key: null, label: "All" },
  { key: "paid", label: "Paid" },
  { key: "pending", label: "Pending" },
  { key: "failed", label: "Failed" },
];

function getStatusColor(status: InvoiceStatus): string {
  switch (status) {
    case "paid":
      return theme.colors.success;
    case "pending":
      return theme.colors.warning;
    case "failed":
      return theme.colors.error;
    default:
      return theme.colors.textSecondary;
  }
}

export default function InvoicesScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [invoices, setInvoices] = useState<InvoiceView[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<InvoiceStatus | null>(null);

  const loadInvoices = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await subscriptionApi.getInvoices();
    if (res.success && res.data) {
      setInvoices(res.data);
    } else {
      setError(res.error?.message ?? "Unable to load your invoices right now.");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadInvoices();
  }, [loadInvoices]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadInvoices();
    setRefreshing(false);
  };

  const header = (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
      </TouchableOpacity>
      <View style={styles.headerContent}>
        <Text style={styles.title}>Invoices</Text>
        <Text style={styles.subtitle}>Billing history</Text>
      </View>
    </View>
  );

  if (loading && !invoices) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.loadingContainer} testID="billing-invoices-loading">
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading invoices...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error && !invoices) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        {header}
        <View style={styles.stateBlock} testID="billing-invoices-error">
          <Ionicons
            name="cloud-offline-outline"
            size={48}
            color={theme.colors.textSecondary}
          />
          <Text style={styles.stateText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadInvoices}>
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const list = invoices ?? [];
  const hasInvoices = list.length > 0;
  const filteredInvoices = filter
    ? list.filter((i) => i.status === filter)
    : list;
  const totalPaid = list
    .filter((i) => i.status === "paid")
    .reduce((sum, i) => sum + i.amount, 0);

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
        {header}

        {!hasInvoices && (
          <View style={styles.stateBlock} testID="billing-invoices-empty">
            <Ionicons
              name="receipt-outline"
              size={48}
              color={theme.colors.textSecondary}
            />
            <Text style={styles.stateText}>No invoices yet.</Text>
          </View>
        )}

        {hasInvoices && (
          <>
            {/* Summary */}
            <Card style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryValue}>{list.length}</Text>
                  <Text style={styles.summaryLabel}>Total Invoices</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryItem}>
                  <Text
                    style={[
                      styles.summaryValue,
                      { color: theme.colors.success },
                    ]}
                  >
                    ${totalPaid.toFixed(2)}
                  </Text>
                  <Text style={styles.summaryLabel}>Total Paid</Text>
                </View>
              </View>
            </Card>

            {/* Filters */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.filterRow}
            >
              {FILTERS.map(({ key, label }) => {
                const active = filter === key;
                return (
                  <TouchableOpacity
                    key={label}
                    style={[
                      styles.filterChip,
                      active && styles.filterChipActive,
                    ]}
                    onPress={() => setFilter(key)}
                  >
                    <Text
                      style={[
                        styles.filterText,
                        active && styles.filterTextActive,
                      ]}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Invoices List */}
            <View style={styles.invoicesList}>
              {filteredInvoices.map((invoice) => {
                const statusColor = getStatusColor(invoice.status);
                const pdfUrl = invoice.pdfUrl;
                return (
                  <Card key={invoice.id} style={styles.invoiceCard}>
                    <View style={styles.invoiceHeader}>
                      <View style={styles.invoiceIdBadge}>
                        <Text style={styles.invoiceId} numberOfLines={1}>
                          {invoice.id}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.statusBadge,
                          { backgroundColor: `${statusColor}15` },
                        ]}
                      >
                        <Text style={[styles.statusText, { color: statusColor }]}>
                          {invoice.status}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.invoiceFooter}>
                      <Text style={styles.invoiceDate}>
                        {invoice.date || "—"}
                      </Text>
                      <Text style={styles.invoiceAmount}>
                        ${invoice.amount.toFixed(2)}
                      </Text>
                    </View>
                    {pdfUrl ? (
                      <View style={styles.invoiceActions}>
                        <TouchableOpacity
                          style={styles.invoiceAction}
                          onPress={() => openExternalUrl(pdfUrl)}
                          testID={`billing-invoice-pdf-${invoice.id}`}
                        >
                          <Ionicons
                            name="download-outline"
                            size={18}
                            color={theme.colors.primary}
                          />
                          <Text style={styles.actionText}>View PDF</Text>
                        </TouchableOpacity>
                      </View>
                    ) : null}
                  </Card>
                );
              })}
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
  summaryCard: {
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    padding: theme.spacing.lg,
  },
  summaryRow: { flexDirection: "row", alignItems: "center" },
  summaryItem: { flex: 1, alignItems: "center" },
  summaryValue: { fontSize: 24, fontWeight: "700", color: theme.colors.text },
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
  invoicesList: {
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
  },
  invoiceCard: { marginBottom: theme.spacing.sm, padding: theme.spacing.md },
  invoiceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  invoiceIdBadge: {
    flex: 1,
    marginRight: 8,
    backgroundColor: theme.colors.background,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: "flex-start",
  },
  invoiceId: {
    fontSize: 11,
    fontWeight: "600",
    color: theme.colors.textSecondary,
  },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 10, fontWeight: "600", textTransform: "capitalize" },
  invoiceFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  invoiceDate: { fontSize: 12, color: theme.colors.textSecondary },
  invoiceAmount: { fontSize: 16, fontWeight: "700", color: theme.colors.text },
  invoiceActions: {
    flexDirection: "row",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  invoiceAction: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 20,
  },
  actionText: { fontSize: 13, color: theme.colors.primary, marginLeft: 4 },
});
