/**
 * Fynvita Billing Overview Screen
 * Manage subscription and payments
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

const BILLING_DATA = {
  plan: "Pro",
  price: 29.99,
  nextBilling: "2024-12-15",
  status: "active",
  paymentMethod: {
    type: "card",
    last4: "4242",
    brand: "Visa",
    expiry: "12/26",
  },
  recentInvoices: [
    { id: "INV-001", date: "2024-11-15", amount: 29.99, status: "paid" },
    { id: "INV-002", date: "2024-10-15", amount: 29.99, status: "paid" },
    { id: "INV-003", date: "2024-09-15", amount: 29.99, status: "paid" },
  ],
};

export default function BillingScreen() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => setLoading(false), 800);
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading billing...</Text>
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
            <Text style={styles.title}>Billing</Text>
            <Text style={styles.subtitle}>Manage your subscription</Text>
          </View>
        </View>

        {/* Current Plan */}
        <Card style={styles.planCard}>
          <View style={styles.planHeader}>
            <View style={styles.planBadge}>
              <Text style={styles.planBadgeText}>{BILLING_DATA.plan}</Text>
            </View>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: `${theme.colors.success}15` },
              ]}
            >
              <Text
                style={[styles.statusText, { color: theme.colors.success }]}
              >
                Active
              </Text>
            </View>
          </View>
          <Text style={styles.planPrice}>
            ${BILLING_DATA.price}
            <Text style={styles.planPeriod}>/month</Text>
          </Text>
          <Text style={styles.nextBilling}>
            Next billing: {BILLING_DATA.nextBilling}
          </Text>
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
          <View style={styles.paymentRow}>
            <View style={styles.cardIcon}>
              <Ionicons name="card" size={24} color={theme.colors.primary} />
            </View>
            <View style={styles.cardInfo}>
              <Text style={styles.cardBrand}>
                {BILLING_DATA.paymentMethod.brand} ••••{" "}
                {BILLING_DATA.paymentMethod.last4}
              </Text>
              <Text style={styles.cardExpiry}>
                Expires {BILLING_DATA.paymentMethod.expiry}
              </Text>
            </View>
            <TouchableOpacity>
              <Ionicons
                name="pencil"
                size={20}
                color={theme.colors.textSecondary}
              />
            </TouchableOpacity>
          </View>
        </Card>

        {/* Recent Invoices */}
        <Card style={styles.invoicesCard}>
          <View style={styles.invoicesHeader}>
            <Text style={styles.sectionTitle}>Recent Invoices</Text>
            <TouchableOpacity onPress={() => router.push("/billing/invoices")}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          {BILLING_DATA.recentInvoices.map((invoice) => (
            <View key={invoice.id} style={styles.invoiceRow}>
              <View style={styles.invoiceInfo}>
                <Text style={styles.invoiceId}>{invoice.id}</Text>
                <Text style={styles.invoiceDate}>{invoice.date}</Text>
              </View>
              <Text style={styles.invoiceAmount}>
                ${invoice.amount.toFixed(2)}
              </Text>
              <View
                style={[
                  styles.invoiceStatus,
                  { backgroundColor: `${theme.colors.success}15` },
                ]}
              >
                <Text
                  style={[
                    styles.invoiceStatusText,
                    { color: theme.colors.success },
                  ]}
                >
                  {invoice.status}
                </Text>
              </View>
            </View>
          ))}
        </Card>

        {/* Quick Actions */}
        <View style={styles.actionsSection}>
          <TouchableOpacity style={styles.actionItem}>
            <Ionicons
              name="receipt-outline"
              size={22}
              color={theme.colors.primary}
            />
            <Text style={styles.actionText}>Download Receipt</Text>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={theme.colors.textSecondary}
            />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionItem}>
            <Ionicons
              name="help-circle-outline"
              size={22}
              color={theme.colors.primary}
            />
            <Text style={styles.actionText}>Billing Support</Text>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={theme.colors.textSecondary}
            />
          </TouchableOpacity>
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
  invoiceInfo: { flex: 1 },
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
  actionsSection: {
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
  },
  actionItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: 12,
    marginBottom: 8,
  },
  actionText: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.text,
    marginLeft: 12,
  },
});
