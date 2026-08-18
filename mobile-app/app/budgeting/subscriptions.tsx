/**
 * Subscriptions — the recurring bills Fynvita has detected as subscriptions.
 *
 * WHAT THIS REPLACED. A MOCK_SUBSCRIPTIONS array — Netflix at $15.99, Spotify
 * at $10.99 and the rest — shown to every user, summed into a monthly and an
 * annual cost, with Manage and Cancel buttons beside each. The screen made no
 * request. A user reading their annual subscription spend was reading a number
 * about somebody who does not exist.
 *
 * WHERE THE DATA COMES FROM. GET /api/financial/bills, the same endpoint the
 * three bills screens use, filtered to the two BillCategory values that mean
 * subscription: `subscription` and `streaming`. bill-detection-service assigns
 * those from the merchant on the user's real transactions.
 *
 * THE CATEGORY CHIPS WERE INVENTED TOO. "Entertainment", "Software",
 * "Services", "Fitness", "Cloud" — none of them is a value the database can
 * hold, so no real bill could ever have matched them. The chips are now built
 * from the categories actually present in the user's own data.
 *
 * MANAGE AND CANCEL ARE GONE. Neither did anything, and neither has a route:
 * cancelling a subscription means cancelling it with the merchant, which this
 * app cannot do. A button that looks like it cancels a payment and does not is
 * worse than no button.
 */

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
import {
  billsApi,
  monthlyCost,
  SUBSCRIPTION_BILL_CATEGORIES,
  type BillItem,
} from "../../src/services/api/financial";

/** "streaming" -> "Streaming". The stored values are lower-case slugs. */
const titleCase = (value: string): string =>
  value ? value.charAt(0).toUpperCase() + value.slice(1) : "Uncategorised";

/**
 * How to render a bill's cadence. Falls back to the raw value rather than
 * asserting "Monthly" for a frequency this screen does not recognise — the old
 * version only knew monthly and yearly, and rendered everything else as
 * "Yearly" by virtue of a single ternary.
 */
const CYCLE_LABELS: Record<string, { long: string; short: string }> = {
  weekly: { long: "Weekly", short: "wk" },
  biweekly: { long: "Every 2 weeks", short: "2wk" },
  monthly: { long: "Monthly", short: "mo" },
  quarterly: { long: "Quarterly", short: "qtr" },
  yearly: { long: "Yearly", short: "yr" },
};

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
};

export default function SubscriptionsScreen() {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [subscriptions, setSubscriptions] = useState<BillItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const res = await billsApi.getBills();

    if (!res.success || !res.data) {
      // Not an empty list. "We could not load this" and "you have no
      // subscriptions" lead a user to opposite actions.
      setError("We could not load your subscriptions.");
      setIsLoading(false);
      return;
    }

    setSubscriptions(
      res.data.bills.filter((b) =>
        SUBSCRIPTION_BILL_CATEGORIES.includes(b.category),
      ),
    );
    setIsLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Built from the user's own bills, not from a list of category names
  // somebody guessed. "All" first, then whatever is actually present.
  const categories = [
    "All",
    ...Array.from(new Set(subscriptions.map((s) => s.category))).sort(),
  ];

  const filteredSubscriptions =
    selectedCategory === "All"
      ? subscriptions
      : subscriptions.filter((sub) => sub.category === selectedCategory);

  // Only bills whose cadence we recognise can be normalised to a month. One
  // with an unknown frequency is EXCLUDED from the total rather than counted
  // at face value, and the count of excluded ones is shown — a yearly charge
  // silently treated as monthly would overstate the total twelvefold.
  const monthlyCosts = subscriptions.map(monthlyCost);
  const totalMonthly = monthlyCosts.reduce<number>(
    (sum, cost) => sum + (cost ?? 0),
    0,
  );
  const uncostedCount = monthlyCosts.filter((c) => c === null).length;
  const totalAnnual = totalMonthly * 12;

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
          <Text style={styles.headerTitle}>Subscriptions</Text>
          <TouchableOpacity style={styles.addButton}>
            <Ionicons name="add" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Summary Card */}
        <Card style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Monthly Cost</Text>
              <Text style={styles.summaryAmount}>
                {formatCurrency(totalMonthly)}
              </Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Annual Cost</Text>
              <Text style={styles.summaryAmount}>
                {formatCurrency(totalAnnual)}
              </Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Active</Text>
              <Text style={styles.summaryAmount}>
                {subscriptions.length}
              </Text>
            </View>
          </View>
          {/* Said out loud rather than folded into the total. A bill whose
              cadence we do not recognise cannot be converted to a monthly
              figure, and quietly counting it at face value is how a yearly
              charge ends up inflating a monthly total. */}
          {uncostedCount > 0 && (
            <Text style={styles.summaryNote}>
              {uncostedCount}{" "}
              {uncostedCount === 1 ? "subscription has" : "subscriptions have"}{" "}
              an unknown billing cycle and {uncostedCount === 1 ? "is" : "are"}{" "}
              not included in these totals.
            </Text>
          )}
        </Card>

        {/* Category Filters */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoryScroll}
          contentContainerStyle={styles.categoryContainer}
        >
          {categories.map((category) => (
            <TouchableOpacity
              key={category}
              onPress={() => setSelectedCategory(category)}
              style={[
                styles.categoryChip,
                selectedCategory === category && styles.categoryChipActive,
              ]}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  selectedCategory === category && styles.categoryChipTextActive,
                ]}
              >
                {category === "All" ? "All" : titleCase(category)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Subscription List */}
        {isLoading ? (
          <Card>
            <Text style={styles.emptyText}>Loading your subscriptions…</Text>
          </Card>
        ) : error ? (
          <Card>
            <Text style={styles.emptyText}>{error}</Text>
            <TouchableOpacity onPress={load}>
              <Text style={styles.retryText}>Try again</Text>
            </TouchableOpacity>
          </Card>
        ) : subscriptions.length === 0 ? (
          <Card>
            <Text style={styles.emptyText}>
              No subscriptions detected yet. Link a bank account and Fynvita
              will find recurring charges in your transactions.
            </Text>
          </Card>
        ) : filteredSubscriptions.length === 0 ? (
          <Card>
            <Text style={styles.emptyText}>
              No subscriptions in this category.
            </Text>
          </Card>
        ) : null}
        {filteredSubscriptions.map((sub) => (
          <TouchableOpacity key={sub.id} activeOpacity={0.7}>
            <Card style={styles.subCard}>
              <View style={styles.subRow}>
                <View style={styles.subIconContainer}>
                  {/* One icon for every row. The fixture chose a per-brand
                      glyph; a detected merchant string has no icon, and
                      guessing one from the name would be decoration
                      masquerading as recognition. */}
                  <Ionicons
                    name="repeat"
                    size={22}
                    color={theme.colors.primary}
                  />
                </View>
                <View style={styles.subContent}>
                  <Text style={styles.subName}>{sub.merchant}</Text>
                  <Text style={styles.subDetail}>
                    {titleCase(sub.category)} &middot;{" "}
                    {CYCLE_LABELS[sub.frequency]?.long ?? "Cadence unknown"}
                  </Text>
                </View>
                <View style={styles.subRight}>
                  <Text style={styles.subCost}>
                    {formatCurrency(sub.amount)}
                  </Text>
                  <Text style={styles.subCycle}>
                    {CYCLE_LABELS[sub.frequency]
                      ? `/${CYCLE_LABELS[sub.frequency].short}`
                      : ""}
                  </Text>
                </View>
              </View>
            </Card>
          </TouchableOpacity>
        ))}

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
    marginBottom: theme.spacing.md,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryItem: {
    flex: 1,
    alignItems: "center",
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: theme.colors.border,
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
  summaryNote: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.sm,
    textAlign: "center",
  },
  categoryScroll: {
    marginBottom: theme.spacing.md,
  },
  categoryContainer: {
    paddingVertical: theme.spacing.sm,
  },
  categoryChip: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.backgroundSecondary,
    marginRight: theme.spacing.sm,
  },
  categoryChipActive: {
    backgroundColor: theme.colors.primary,
  },
  categoryChipText: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.textSecondary,
  },
  categoryChipTextActive: {
    color: theme.colors.white,
  },
  subCard: {
    marginBottom: theme.spacing.sm,
  },
  subRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  subIconContainer: {
    width: 44,
    height: 44,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.backgroundSecondary,
    justifyContent: "center",
    alignItems: "center",
  },
  subContent: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  subName: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
  },
  subDetail: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  subRight: {
    alignItems: "flex-end",
  },
  subCost: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
  },
  subCycle: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
  },
  subActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
  },
  manageButton: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.backgroundSecondary,
    marginRight: theme.spacing.sm,
  },
  manageButtonText: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.primary,
  },
  cancelButton: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    backgroundColor: "#FEE2E2",
  },
  cancelButtonText: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.error,
  },
  bottomSpacer: {
    height: theme.spacing.xxl,
  },
});
