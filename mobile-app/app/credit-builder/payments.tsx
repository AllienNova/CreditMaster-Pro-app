/**
 * Payment History — the rent payments Fynvita actually reports for the user.
 *
 * WHAT THIS REPLACED. A MOCK_PAYMENTS array shown to every user: a Chase
 * Freedom payment, a Capital One payment, and a Discover payment five days
 * LATE, summed into an on-time rate. The screen made no request. Telling
 * someone they have a late payment they do not have is the same class of harm
 * as hiding one — it is exactly the data a user would open a dispute over.
 *
 * WHERE THE DATA COMES FROM. GET /api/credit-builder/rent-payments ->
 * rent_payments, the payments Fynvita reports to the bureaus on the user's
 * behalf. That route did not exist until this change: rent reporting is a
 * marketed credit-building feature that had tables and a complete service
 * behind it and no way in (docs/qa/triage-financial.md graded it UNREACHABLE).
 *
 * WHY NOT CARD PAYMENTS. Payment history for credit cards lives in the credit
 * report, and that path currently falls back to a mock generator on any failed
 * bureau call (SF-11) — building this screen on it would put invented accounts
 * in front of the user under a heading that says "your payments". Rent is the
 * payment history this product genuinely owns, so the screen says so rather
 * than implying it covers everything.
 *
 * NO ESTIMATED SCORE IMPACT. The service can compute one; nothing measures it.
 * See the route header.
 */

import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { lightTheme as theme } from "../../src/constants/theme";
import { Card } from "../../src/components/Card";
import {
  rentReportingApi,
  type RentPayment,
  type RentReportingAccount,
} from "../../src/services/api/credit";

// The five values rent_payments.status can hold, per its CHECK constraint in
// 20260731000022. "upcoming" was in the old vocabulary and is not one of them:
// a payment that has not come due yet is `pending`.
const getStatusColor = (status: string) => {
  switch (status) {
    case "on_time":
      return "#22C55E";
    case "late":
    case "partial":
      return "#F59E0B";
    case "missed":
      return "#EF4444";
    case "pending":
      return "#3B82F6";
    default:
      return theme.colors.textSecondary;
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case "on_time":
      return "checkmark-circle";
    case "late":
    case "partial":
      return "warning";
    case "missed":
      return "close-circle";
    case "pending":
      return "time";
    default:
      return "help-circle";
  }
};

const STATUS_LABELS: Record<string, string> = {
  on_time: "Paid",
  pending: "Due",
  late: "Late",
  missed: "Missed",
  partial: "Partial",
};

/**
 * How late a payment was, from the two real timestamps.
 *
 * The old screen carried a `daysLate` field on its fixture. rent_payments has
 * no such column — it has due_date and paid_date, so the number is derived, and
 * is null when the payment has not been paid (there is no second date to
 * measure against, and guessing from today would keep growing).
 */
function daysLate(payment: RentPayment): number | null {
  if (payment.status !== "late" || !payment.paidDate) return null;
  const due = new Date(payment.dueDate).getTime();
  const paid = new Date(payment.paidDate).getTime();
  if (Number.isNaN(due) || Number.isNaN(paid) || paid <= due) return null;
  return Math.round((paid - due) / (24 * 60 * 60 * 1000));
}

export default function PaymentsScreen() {
  const [filter, setFilter] = useState<string>("all");
  const [payments, setPayments] = useState<RentPayment[]>([]);
  const [accounts, setAccounts] = useState<RentReportingAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const res = await rentReportingApi.getPayments();

    if (!res.success || !res.data) {
      // Not an empty list. "We could not load this" and "you have no tracked
      // payments" lead a user to opposite actions.
      setError("We could not load your payment history.");
      setIsLoading(false);
      return;
    }

    setPayments(res.data.payments ?? []);
    setAccounts(res.data.accounts ?? []);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onTimeCount = payments.filter((p) => p.status === "on_time").length;
  const lateCount = payments.filter(
    (p) => p.status === "late" || p.status === "missed",
  ).length;
  const pendingCount = payments.filter((p) => p.status === "pending").length;

  // No payments settled yet means there is no rate to state. The old version
  // fell back to `|| 100`, so a user with nothing tracked was shown a perfect
  // 100% on-time record — a fabricated compliment.
  const settled = onTimeCount + lateCount;
  const onTimeRate =
    settled > 0 ? Math.round((onTimeCount / settled) * 100) : null;

  const filteredPayments =
    filter === "all" ? payments : payments.filter((p) => p.status === filter);

  const propertyFor = (accountId: string): string =>
    accounts.find((a) => a.id === accountId)?.propertyAddress ?? "Rent";

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Payment History</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Stats Card */}
        <Card style={styles.statsCard}>
          <View style={styles.rateCircle}>
            <Text
              style={[
                styles.ratePercent,
                {
                  color:
                    onTimeRate === null
                      ? theme.colors.textSecondary
                      : onTimeRate >= 95
                        ? "#22C55E"
                        : onTimeRate >= 80
                          ? "#F59E0B"
                          : "#EF4444",
                },
              ]}
            >
              {/* Was `|| 100`, so a user with nothing tracked saw a perfect
                  on-time record. With no settled payment there is no rate. */}
              {onTimeRate === null ? "—" : `${onTimeRate}%`}
            </Text>
            <Text style={styles.rateLabel}>On-Time Rate</Text>
          </View>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Ionicons name="checkmark-circle" size={24} color="#22C55E" />
              <Text style={styles.statValue}>{onTimeCount}</Text>
              <Text style={styles.statLabel}>On Time</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="warning" size={24} color="#F59E0B" />
              <Text style={styles.statValue}>{lateCount}</Text>
              <Text style={styles.statLabel}>Late</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="time" size={24} color="#3B82F6" />
              {/* rent_payments has no "upcoming" — its CHECK constraint calls
                  a payment that has not come due `pending`. */}
              <Text style={styles.statValue}>{pendingCount}</Text>
              <Text style={styles.statLabel}>Pending</Text>
            </View>
          </View>
        </Card>

        {/* Impact Info */}
        <Card style={styles.impactCard}>
          <Ionicons
            name="information-circle"
            size={20}
            color={theme.colors.primary}
          />
          <Text style={styles.impactText}>
            {/* Scoped deliberately. This screen shows the rent payments
                Fynvita reports for you — not your card or loan payments,
                which live in your credit report. Leaving it unqualified
                implied a completeness the data does not have. */}
            Payment history is the largest factor in your credit score. These
            are the rent payments Fynvita reports on your behalf.
          </Text>
        </Card>

        {/* Filter Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterRow}
        >
          {["all", "pending", "on_time", "late"].map((f) => (
            <TouchableOpacity
              key={f}
              style={[
                styles.filterChip,
                filter === f && styles.filterChipActive,
              ]}
              onPress={() => setFilter(f)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  filter === f && styles.filterChipTextActive,
                ]}
              >
                {f === "all"
                  ? "All"
                  : f === "on_time"
                    ? "On Time"
                    : f.charAt(0).toUpperCase() + f.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Payments List */}
        <Text style={styles.sectionTitle}>Payment Records</Text>
        {isLoading ? (
          <Card>
            <Text style={styles.emptyText}>Loading your payment history…</Text>
          </Card>
        ) : error ? (
          <Card>
            <Text style={styles.emptyText}>{error}</Text>
            <TouchableOpacity onPress={load}>
              <Text style={styles.retryText}>Try again</Text>
            </TouchableOpacity>
          </Card>
        ) : payments.length === 0 ? (
          <Card>
            <Text style={styles.emptyText}>
              No payments are being reported yet. Rent reporting adds your
              on-time rent to your credit file — set it up to start building
              history here.
            </Text>
          </Card>
        ) : filteredPayments.length === 0 ? (
          <Card>
            <Text style={styles.emptyText}>
              No payments match this filter.
            </Text>
          </Card>
        ) : null}
        {filteredPayments.map((payment) => (
          <Card key={payment.id} style={styles.paymentCard}>
            <View style={styles.paymentRow}>
              <View
                style={[
                  styles.statusIcon,
                  { backgroundColor: `${getStatusColor(payment.status)}20` },
                ]}
              >
                <Ionicons
                  name={
                    getStatusIcon(
                      payment.status,
                    ) as keyof typeof Ionicons.glyphMap
                  }
                  size={20}
                  color={getStatusColor(payment.status)}
                />
              </View>
              <View style={styles.paymentInfo}>
                {/* The property this payment was for. rent_payments carries
                    account_id, not a display name, so it is resolved from the
                    accounts the same response returned. */}
                <Text style={styles.paymentAccount}>
                  {propertyFor(payment.accountId)}
                </Text>
                <Text style={styles.paymentDate}>
                  Due: {new Date(payment.dueDate).toLocaleDateString()}
                </Text>
                {daysLate(payment) !== null && (
                  <Text style={styles.lateText}>
                    {daysLate(payment)} days late
                  </Text>
                )}
                {/* Whether this one actually reached the bureaus. A payment
                    tracked but not yet reported has not affected the score,
                    and the old screen had no way to say so. */}
                {!payment.reportedToCredit && (
                  <Text style={styles.paymentDate}>Not yet reported</Text>
                )}
              </View>
              <View style={styles.paymentRight}>
                <Text style={styles.paymentAmount}>${payment.amount}</Text>
                <Text
                  style={[
                    styles.paymentStatus,
                    { color: getStatusColor(payment.status) },
                  ]}
                >
                  {STATUS_LABELS[payment.status] ?? payment.status}
                </Text>
              </View>
            </View>
          </Card>
        ))}

        {/* Tips */}
        <Card style={styles.tipsCard}>
          <Text style={styles.tipsTitle}>Tips for On-Time Payments</Text>
          <View style={styles.tipItem}>
            <Ionicons name="checkmark-circle" size={18} color="#22C55E" />
            <Text style={styles.tipText}>
              Set up autopay for minimum payments
            </Text>
          </View>
          <View style={styles.tipItem}>
            <Ionicons name="checkmark-circle" size={18} color="#22C55E" />
            <Text style={styles.tipText}>
              Create calendar reminders 5 days before due dates
            </Text>
          </View>
          <View style={styles.tipItem}>
            <Ionicons name="checkmark-circle" size={18} color="#22C55E" />
            <Text style={styles.tipText}>
              Request due date changes to align with payday
            </Text>
          </View>
          <View style={styles.tipItem}>
            <Ionicons name="checkmark-circle" size={18} color="#22C55E" />
            <Text style={styles.tipText}>
              Use bill pay apps to track all due dates
            </Text>
          </View>
        </Card>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scrollView: { flex: 1, padding: theme.spacing.lg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: theme.spacing.lg,
  },
  backButton: { padding: 4 },
  title: { fontSize: 20, fontWeight: "700", color: theme.colors.text },
  statsCard: { alignItems: "center", marginBottom: theme.spacing.md },
  rateCircle: { alignItems: "center", marginBottom: theme.spacing.md },
  ratePercent: { fontSize: 48, fontWeight: "700" },
  rateLabel: { fontSize: 14, color: theme.colors.textSecondary },
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
  },
  statItem: { alignItems: "center" },
  statValue: {
    fontSize: 20,
    fontWeight: "700",
    color: theme.colors.text,
    marginTop: 4,
  },
  statLabel: { fontSize: 12, color: theme.colors.textSecondary },
  impactCard: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: theme.spacing.md,
    backgroundColor: `${theme.colors.primary}10`,
  },
  impactText: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.text,
    marginLeft: 10,
  },
  filterRow: { marginBottom: theme.spacing.md },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    marginRight: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  filterChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  filterChipText: { fontSize: 14, color: theme.colors.textSecondary },
  filterChipTextActive: { color: "#fff", fontWeight: "500" },
  emptyText: {
    fontSize: 14,
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  paymentCard: { marginBottom: theme.spacing.sm },
  paymentRow: { flexDirection: "row", alignItems: "center" },
  statusIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: theme.spacing.md,
  },
  paymentInfo: { flex: 1 },
  paymentAccount: { fontSize: 15, fontWeight: "600", color: theme.colors.text },
  paymentDate: { fontSize: 13, color: theme.colors.textSecondary },
  lateText: { fontSize: 12, color: "#F59E0B", marginTop: 2 },
  paymentRight: { alignItems: "flex-end" },
  paymentAmount: { fontSize: 16, fontWeight: "600", color: theme.colors.text },
  paymentStatus: { fontSize: 12, fontWeight: "500" },
  tipsCard: { marginTop: theme.spacing.md },
  tipsTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  tipItem: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  tipText: { fontSize: 14, color: theme.colors.textSecondary, marginLeft: 10 },
});
