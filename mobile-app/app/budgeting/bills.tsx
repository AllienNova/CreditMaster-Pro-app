import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { lightTheme as theme } from "../../src/constants/theme";
import { Card } from "../../src/components/Card";
import { billsApi, type BillItem } from "../../src/services/api/financial";

/*
 * MOCK_BILLS, BillStatus and STATUS_CONFIG are gone.
 *
 * This screen showed every user a $1,500 "Rent" bill and a $125 electric bill,
 * with paid/overdue badges, and summed them into a total, a paid count and an
 * overdue count. It made no request at all. Meanwhile app/financial/bills.tsx —
 * also in the nav, as "Financial bills" — showed the user's ACTUAL bills from
 * the same endpoint this now uses. Two bills destinations, one real, one
 * invented. See docs/specs/security-findings.md SF-13.
 *
 * NO PER-BILL STATUS. paid/upcoming/overdue is payment HISTORY
 * (BillPayment.isLate), which billDetectionService exposes only through
 * getPaymentHistory — and that has no HTTP route. The adapter's own docblock in
 * services/api/financial.ts records the same conclusion for the two screens
 * fixed before this one: carry only what the endpoint truly provides, and omit
 * the rest rather than fabricate it. So the badges and the paid/overdue counts
 * are gone, not re-derived from a guess.
 */

const formatCurrency = (amount: number): string =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);

export default function BillsScreen() {
  const [bills, setBills] = useState<BillItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadBills = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const res = await billsApi.getBills();

    if (!res.success || !res.data) {
      // Not an empty list: "we could not load your bills" and "you have no
      // bills" lead a user to opposite actions.
      setError("We could not load your bills.");
      setIsLoading(false);
      return;
    }

    setBills(res.data.bills);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadBills();
  }, [loadBills]);

  const totalBills = bills.reduce((sum, bill) => sum + bill.amount, 0);


  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons
              name="arrow-back"
              size={24}
              color={theme.colors.text}
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Bill Tracker</Text>
          <TouchableOpacity style={styles.addButton}>
            <Ionicons name="add" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Summary Card */}
        <Card style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Total Due</Text>
              <Text style={styles.summaryAmount}>{formatCurrency(totalBills)}</Text>
            </View>
            <View style={styles.summaryItem}>
              {/* Was "Paid" over a count of fabricated paid bills. Payment history
                  has no HTTP route, so this counts what is actually tracked. */}
              <Text style={styles.summaryLabel}>Tracked</Text>
              <Text style={[styles.summaryAmount, { color: theme.colors.success }]}>
                {bills.length}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              {/* Was "Overdue". isAutoPay is a real column on the bill; overdue
                  is not derivable from anything this endpoint returns. */}
              <Text style={styles.summaryLabel}>Auto-pay</Text>
              <Text style={[styles.summaryAmount, { color: theme.colors.error }]}>
                {bills.filter((b) => b.isAutoPay).length}
              </Text>
            </View>
          </View>
        </Card>

        {/* Bills List */}
        {isLoading ? (
          <Card>
            <Text style={styles.billCategory}>Loading your bills…</Text>
          </Card>
        ) : error ? (
          <Card>
            <Text style={styles.billCategory}>{error}</Text>
            <TouchableOpacity onPress={loadBills}>
              <Text style={styles.billName}>Try again</Text>
            </TouchableOpacity>
          </Card>
        ) : bills.length === 0 ? (
          <Card>
            <Text style={styles.billCategory}>No bills tracked yet.</Text>
          </Card>
        ) : null}

        {bills.map((bill) => {
          return (
            <TouchableOpacity key={bill.id} activeOpacity={0.7}>
              <Card style={styles.billCard}>
                <View style={styles.billRow}>
                  <View style={styles.billIconContainer}>
                    <Ionicons
                      name="receipt-outline"
                      size={22}
                      color={theme.colors.primary}
                    />
                  </View>
                  <View style={styles.billContent}>
                    <Text style={styles.billName}>{bill.merchant}</Text>
                    <Text style={styles.billCategory}>
                      {bill.category} &middot; Due{" "}
                      {new Date(bill.dueDate).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </Text>
                  </View>
                  <View style={styles.billRight}>
                    <Text style={styles.billAmount}>
                      {formatCurrency(bill.amount)}
                    </Text>
                    {bill.isAutoPay ? (
                      <View
                        style={[
                          styles.statusBadge,
                          { backgroundColor: "#DCFCE7" },
                        ]}
                      >
                        <Text style={[styles.statusText, { color: "#22C55E" }]}>
                          Auto-pay
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              </Card>
            </TouchableOpacity>
          );
        })}

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    flex: 1,
    padding: theme.spacing.md,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: theme.spacing.lg,
  },
  backButton: {
    padding: theme.spacing.sm,
  },
  headerTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
  },
  addButton: {
    padding: theme.spacing.sm,
  },
  summaryCard: {
    marginBottom: theme.spacing.lg,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  summaryItem: {
    alignItems: "center",
  },
  summaryLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  summaryAmount: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
  },
  billCard: {
    marginBottom: theme.spacing.sm,
  },
  billRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  billIconContainer: {
    width: 44,
    height: 44,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.backgroundSecondary,
    justifyContent: "center",
    alignItems: "center",
  },
  billContent: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  billName: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
  },
  billCategory: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  billRight: {
    alignItems: "flex-end",
  },
  billAmount: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
  },
  statusBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.full,
    marginTop: theme.spacing.xs,
  },
  statusText: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.medium,
  },
  bottomSpacer: {
    height: theme.spacing.xxl,
  },
});
