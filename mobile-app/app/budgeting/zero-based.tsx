import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { lightTheme as theme } from "../../src/constants/theme";
import { Card } from "../../src/components/Card";
import { incomeApi, budgetApi } from "../../src/services/api/financial";

interface BudgetCategory {
  id: string;
  name: string;
  allocated: number;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

/*
 * MONTHLY_INCOME = 5000 and MOCK_CATEGORIES lived here.
 *
 * Zero-based budgeting IS arithmetic against income — allocated, remaining,
 * and the progress bar are all derived from it — so an invented salary made
 * every number on this screen invented too, including "Every dollar has a
 * job" over dollars nobody earned.
 *
 * Both have real sources. Income comes from GET /api/financial/income, whose
 * stats.totalMonthlyIncome is computed from the caller's own income sources.
 * The allocations are the caller's own budgets.
 */

/** A palette for the category rows; the amounts come from the server. */
const CATEGORY_COLORS = [
  "#3B82F6",
  "#22C55E",
  "#F59E0B",
  "#8B5CF6",
  "#EC4899",
  "#14B8A6",
];

const CATEGORY_ICON: keyof typeof Ionicons.glyphMap = "pricetag-outline";


const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
};

export default function ZeroBasedBudgetScreen() {
  const [categories, setCategories] = useState<BudgetCategory[]>([]);
  const [monthlyIncome, setMonthlyIncome] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const [income, budgets] = await Promise.all([
      incomeApi.get(),
      budgetApi.getAll(),
    ]);

    if (!income.success || !income.data) {
      // Income is the denominator of this whole screen. Without it there is
      // no zero-based budget to show, so this is an error rather than a zero.
      setError("We could not load your income.");
      setLoading(false);
      return;
    }
    setMonthlyIncome(income.data.stats?.totalMonthlyIncome ?? 0);

    if (budgets.success && budgets.data) {
      setCategories(
        budgets.data.budgets.map((b, i) => ({
          id: b.id,
          name: b.category,
          allocated: b.limit,
          icon: CATEGORY_ICON,
          color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
        })),
      );
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const totalAllocated = categories.reduce((sum, cat) => sum + cat.allocated, 0);
  const income = monthlyIncome ?? 0;
  const remaining = income - totalAllocated;
  // No zero-denominator guard here on purpose. The render gates on
  // `monthlyIncome === 0` before any of this is shown, so a divide-by-zero is
  // unreachable — and mutation testing proved it: removing an `income > 0`
  // guard from this line changed nothing, because no test could reach it. A
  // guard that cannot fire is dead code with a comment claiming otherwise.
  const allocationPercent = Math.min((totalAllocated / income) * 100, 100);

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
          <Text style={styles.headerTitle}>Zero-Based Budget</Text>
          <TouchableOpacity style={styles.editButton}>
            <Ionicons
              name="create-outline"
              size={24}
              color={theme.colors.primary}
            />
          </TouchableOpacity>
        </View>

        {/* Tagline */}
        <View style={styles.taglineContainer}>
          <Ionicons
            name="bulb-outline"
            size={18}
            color={theme.colors.primary}
          />
          <Text style={styles.taglineText}>
            Every dollar has a job
          </Text>
        </View>

        {loading ? (
          <View style={styles.stateBlock} testID="zero-based-loading">
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        ) : error ? (
          // Income is this screen's denominator. Showing a $0 budget after a
          // failed read would say "you earn nothing", which is a different
          // statement from "we could not read your income".
          <View style={styles.stateBlock}>
            <Text style={styles.stateText}>{error}</Text>
            <TouchableOpacity onPress={load}>
              <Text style={styles.retryText}>Try again</Text>
            </TouchableOpacity>
          </View>
        ) : monthlyIncome === 0 ? (
          <View style={styles.stateBlock}>
            <Text style={styles.stateText}>
              No income recorded yet. Add an income source to build a
              zero-based budget.
            </Text>
          </View>
        ) : (
          <>
        {/* Income Summary Card */}
        <Card style={styles.incomeCard}>
          <Text style={styles.incomeLabel}>Monthly Income</Text>
          <Text style={styles.incomeAmount}>
            {formatCurrency(income)}
          </Text>

          {/* Allocation Progress */}
          <View style={styles.progressSection}>
            <View style={styles.progressLabelRow}>
              <Text style={styles.progressLabel}>Allocated</Text>
              <Text style={styles.progressValue}>
                {formatCurrency(totalAllocated)} of {formatCurrency(income)}
              </Text>
            </View>
            <View style={styles.progressBarBackground}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width: `${allocationPercent}%`,
                    backgroundColor:
                      remaining === 0
                        ? theme.colors.success
                        : remaining < 0
                          ? theme.colors.error
                          : theme.colors.primary,
                  },
                ]}
              />
            </View>
          </View>

          {/* Remaining */}
          <View style={styles.remainingRow}>
            <Text style={styles.remainingLabel}>
              {remaining >= 0 ? "Remaining to Assign" : "Over Budget"}
            </Text>
            <Text
              style={[
                styles.remainingAmount,
                {
                  color:
                    remaining === 0
                      ? theme.colors.success
                      : remaining < 0
                        ? theme.colors.error
                        : theme.colors.primary,
                },
              ]}
            >
              {formatCurrency(Math.abs(remaining))}
            </Text>
          </View>

          {remaining === 0 && (
            <View style={styles.successBanner}>
              <Ionicons
                name="checkmark-circle"
                size={18}
                color={theme.colors.success}
              />
              <Text style={styles.successText}>
                Budget fully allocated!
              </Text>
            </View>
          )}
        </Card>

        {/* Category Allocations */}
        <Text style={styles.sectionTitle}>Category Allocations</Text>
        {categories.map((cat) => {
          // Reachable only when income > 0, per the render gate above.
          const percentValue = (cat.allocated / income) * 100;
          const percent = percentValue.toFixed(1);
          return (
            <TouchableOpacity key={cat.id} activeOpacity={0.7}>
              <Card style={styles.categoryCard}>
                <View style={styles.categoryRow}>
                  <View
                    style={[
                      styles.categoryIconContainer,
                      { backgroundColor: cat.color + "20" },
                    ]}
                  >
                    <Ionicons
                      name={cat.icon}
                      size={22}
                      color={cat.color}
                    />
                  </View>
                  <View style={styles.categoryContent}>
                    <Text style={styles.categoryName}>{cat.name}</Text>
                    <View style={styles.categoryBarBackground}>
                      <View
                        style={[
                          styles.categoryBarFill,
                          {
                            width: `${percentValue}%`,
                            backgroundColor: cat.color,
                          },
                        ]}
                      />
                    </View>
                  </View>
                  <View style={styles.categoryRight}>
                    <Text style={styles.categoryAmount}>
                      {formatCurrency(cat.allocated)}
                    </Text>
                    <Text style={styles.categoryPercent}>{percent}%</Text>
                  </View>
                </View>
              </Card>
            </TouchableOpacity>
          );
        })}

        <View style={styles.bottomSpacer} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  stateBlock: {
    paddingVertical: theme.spacing.xl,
    paddingHorizontal: theme.spacing.lg,
    alignItems: "center",
  },
  stateText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: "center",
  },
  retryText: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: "600",
    marginTop: theme.spacing.sm,
  },
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
    marginBottom: theme.spacing.sm,
  },
  backButton: {
    padding: theme.spacing.sm,
  },
  headerTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
  },
  editButton: {
    padding: theme.spacing.sm,
  },
  taglineContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: theme.spacing.lg,
    gap: theme.spacing.xs,
  },
  taglineText: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.primary,
    fontStyle: "italic",
  },
  incomeCard: {
    marginBottom: theme.spacing.lg,
  },
  incomeLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  incomeAmount: {
    fontSize: theme.fontSize.xxxl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  progressSection: {
    marginBottom: theme.spacing.md,
  },
  progressLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: theme.spacing.xs,
  },
  progressLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  progressValue: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.text,
  },
  progressBarBackground: {
    height: 10,
    backgroundColor: theme.colors.borderLight,
    borderRadius: theme.borderRadius.full,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: theme.borderRadius.full,
  },
  remainingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  remainingLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  remainingAmount: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
  },
  successBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: "#DCFCE7",
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.xs,
  },
  successText: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.medium,
    color: "#22C55E",
  },
  sectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  categoryCard: {
    marginBottom: theme.spacing.sm,
  },
  categoryRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  categoryIconContainer: {
    width: 44,
    height: 44,
    borderRadius: theme.borderRadius.lg,
    justifyContent: "center",
    alignItems: "center",
  },
  categoryContent: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  categoryName: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  categoryBarBackground: {
    height: 6,
    backgroundColor: theme.colors.borderLight,
    borderRadius: theme.borderRadius.full,
    overflow: "hidden",
  },
  categoryBarFill: {
    height: "100%",
    borderRadius: theme.borderRadius.full,
  },
  categoryRight: {
    alignItems: "flex-end",
    marginLeft: theme.spacing.sm,
  },
  categoryAmount: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
  },
  categoryPercent: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  bottomSpacer: {
    height: theme.spacing.xxl,
  },
});
