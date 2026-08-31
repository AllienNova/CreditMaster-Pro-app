import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { lightTheme as theme } from "../../src/constants/theme";
import { Card } from "../../src/components/Card";
import { ScreenHeader } from "../../src/components/ScreenHeader";
import {
  budgetApi,
  type BudgetOverviewData,
} from "../../src/services/api/financial";

interface FeatureItem {
  title: string;
  description: string;
  route: Href;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

const FEATURES: FeatureItem[] = [
  {
    title: "Bill Tracker",
    description: "Track and manage all your bills",
    route: "./bills" as Href,
    icon: "calendar-outline",
    color: "#22C55E",
  },
  {
    title: "Subscription Manager",
    description: "Find and cancel unwanted subscriptions",
    route: "./subscriptions" as Href,
    icon: "card-outline",
    color: "#3B82F6",
  },
  {
    title: "Zero-Based Budget",
    description: "Give every dollar a purpose",
    route: "./zero-based" as Href,
    icon: "wallet-outline",
    color: "#8B5CF6",
  },
  {
    title: "Auto-Save Rules",
    description: "Automate your savings",
    route: "./auto-save" as Href,
    icon: "piggy-bank-outline" as keyof typeof Ionicons.glyphMap,
    color: "#10B981",
  },
];

/*
 * QUICK_STATS lived here: "Total Bills 5", "Subscriptions 6", "Save Rules 4".
 *
 * Those are counts of the CALLER's own bills, subscriptions and save rules,
 * not product content — and the screen-data baseline had this file classified
 * `catalogue`, because one baseline key covers both constants in it and the
 * other one, FEATURES, genuinely is a catalogue. A per-file entry cannot carry
 * two classifications, and that is how an invented count sat inside an entry
 * marked safe.
 *
 * Gone rather than wired: each count already has a screen that owns it, listed
 * in FEATURES directly above. Three more fetches on a hub screen would be
 * three more numbers to keep in agreement with the screens that compute them.
 */

export default function BudgetingIndexScreen() {
  const [summary, setSummary] = useState<BudgetOverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const loadSummary = useCallback(async () => {
    setLoading(true);
    setError(false);
    const res = await budgetApi.getBudgetSummary();
    // A failed read and an empty budget are different things and must not
    // render the same, or "you have no budget" becomes the message for an
    // outage.
    if (res.success && res.data) setSummary(res.data);
    else setError(true);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  const formatCurrency = (amount: number) => {
    const prefix = amount < 0 ? "-" : "";
    return `${prefix}$${Math.abs(amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <ScreenHeader
          title="Smart Budgeting"
          subtitle="AI-powered tools to master your money"
          right={
            <TouchableOpacity style={styles.settingsButton}>
              <Ionicons
                name="settings-outline"
                size={24}
                color={theme.colors.text}
              />
            </TouchableOpacity>
          }
        />

        {/*
          This card read Income $5,000 / Expenses $3,245 / Remaining $1,755
          with a bar hardcoded to 64.9%, identical for every user, on a screen
          that imported no API at all.

          It now reads GET /api/financial/budgets/summary through
          budgetApi.getBudgetSummary(), which already existed. The labels
          changed from Income/Expenses to Budgeted/Spent because that is what
          the summary MEASURES: income is not part of a budget summary, and
          labelling `totalBudgeted` "Income" would be a second fabrication
          wearing the first one's clothes.
        */}
        <Card style={styles.overviewCard}>
          <Text style={styles.overviewTitle}>Monthly Overview</Text>
          {error ? (
            <>
              <Text style={styles.stateText}>
                We could not load your budget summary.
              </Text>
              <TouchableOpacity onPress={loadSummary}>
                <Text style={styles.retryText}>Try again</Text>
              </TouchableOpacity>
            </>
          ) : loading ? (
            <Text style={styles.stateText}>Loading…</Text>
          ) : !summary || summary.totalBudgeted === 0 ? (
            <Text style={styles.stateText}>
              You have not set a budget yet. Set one in Smart Budget below and
              this fills in.
            </Text>
          ) : (
            <>
              <View style={styles.overviewRow}>
                <View style={styles.overviewItem}>
                  <Text style={styles.overviewLabel}>Budgeted</Text>
                  <Text
                    style={[styles.overviewAmount, { color: theme.colors.success }]}
                  >
                    {formatCurrency(summary.totalBudgeted)}
                  </Text>
                </View>
                <View style={styles.overviewDivider} />
                <View style={styles.overviewItem}>
                  <Text style={styles.overviewLabel}>Spent</Text>
                  <Text
                    style={[styles.overviewAmount, { color: theme.colors.error }]}
                  >
                    {formatCurrency(summary.totalSpent)}
                  </Text>
                </View>
                <View style={styles.overviewDivider} />
                <View style={styles.overviewItem}>
                  <Text style={styles.overviewLabel}>Remaining</Text>
                  <Text
                    style={[styles.overviewAmount, { color: theme.colors.primary }]}
                  >
                    {formatCurrency(summary.totalRemaining)}
                  </Text>
                </View>
              </View>
              <View style={styles.progressBarBackground}>
                {/* Clamped: spending past the budget would otherwise render a
                    bar wider than its track. */}
                <View
                  testID="budget-progress"
                  style={[
                    styles.progressBarFill,
                    { width: `${Math.min(100, Math.max(0, summary.percentUsed))}%` },
                  ]}
                />
              </View>
              <Text style={styles.progressText}>
                {summary.percentUsed.toFixed(1)}% of budget used
              </Text>
            </>
          )}
        </Card>

        {/* Feature Cards */}
        <Text style={styles.sectionTitle}>Budgeting Tools</Text>
        {FEATURES.map((feature) => (
          <TouchableOpacity
            key={feature.title}
            onPress={() => router.push(feature.route)}
            activeOpacity={0.7}
          >
            <Card style={styles.featureCard}>
              <View style={styles.featureRow}>
                <View
                  style={[
                    styles.featureIconContainer,
                    { backgroundColor: feature.color + "20" },
                  ]}
                >
                  <Ionicons
                    name={feature.icon}
                    size={24}
                    color={feature.color}
                  />
                </View>
                <View style={styles.featureContent}>
                  <Text style={styles.featureTitle}>{feature.title}</Text>
                  <Text style={styles.featureDescription}>
                    {feature.description}
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={theme.colors.textMuted}
                />
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
  settingsButton: {
    padding: theme.spacing.sm,
  },
  stateText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  retryText: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.primary,
    marginTop: 8,
  },
  overviewCard: {
    marginBottom: theme.spacing.lg,
  },
  overviewTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  overviewRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing.md,
  },
  overviewItem: {
    flex: 1,
    alignItems: "center",
  },
  overviewDivider: {
    width: 1,
    height: 40,
    backgroundColor: theme.colors.border,
  },
  overviewLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  overviewAmount: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: theme.colors.borderLight,
    borderRadius: theme.borderRadius.full,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.full,
  },
  progressText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.sm,
    textAlign: "center",
  },
  sectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
    marginTop: theme.spacing.sm,
  },
  featureCard: {
    marginBottom: theme.spacing.sm,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  featureIconContainer: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.lg,
    justifyContent: "center",
    alignItems: "center",
  },
  featureContent: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  featureTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
  },
  featureDescription: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  bottomSpacer: {
    height: theme.spacing.xxl,
  },
});
