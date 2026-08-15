/**
 * Tax Optimizer Screen - Mobile App
 *
 * AI-powered tax optimization recommendations with:
 * - Tax bracket visualization
 * - Personalized savings tips
 * - Year-over-year comparison
 * - Retirement contribution gap analysis
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTaxStore } from "../../src/store/taxStore";

const { width } = Dimensions.get("window");

// Mock tax tips data
const TAX_TIPS = [
  {
    id: "1",
    title: "Maximize Employer 401(k) Match",
    description:
      "You may be leaving free money on the table. Ensure you're contributing enough to get the full employer match.",
    potentialSavings: 3200,
    difficulty: "easy" as const,
    category: "Retirement",
    actionSteps: [
      "Check your current contribution rate in HR portal",
      "Review employer matching policy",
      "Increase contribution to at least match threshold",
    ],
  },
  {
    id: "2",
    title: "Consider Backdoor Roth IRA",
    description:
      "Your income exceeds the Roth IRA limit, but you can still contribute through the backdoor strategy.",
    potentialSavings: 0,
    difficulty: "medium" as const,
    category: "Retirement",
    actionSteps: [
      "Open a Traditional IRA (if you don't have one)",
      "Contribute $7,000 to Traditional IRA",
      "Convert to Roth IRA (check for pro-rata rule)",
    ],
  },
  {
    id: "3",
    title: "HSA Triple Tax Advantage",
    description:
      "If you have a high-deductible health plan, maximize your HSA for tax-free growth and withdrawals.",
    potentialSavings: 1600,
    difficulty: "easy" as const,
    category: "Healthcare",
    actionSteps: [
      "Verify you have an HDHP",
      "Increase HSA contribution to $4,150 (2026 limit)",
      "Invest HSA funds for long-term growth",
    ],
  },
  {
    id: "4",
    title: "Tax-Loss Harvesting",
    description:
      "Offset capital gains by selling investments at a loss. Can save thousands in taxes.",
    potentialSavings: 2800,
    difficulty: "medium" as const,
    category: "Investment",
    actionSteps: [
      "Review portfolio for positions with unrealized losses",
      "Sell losing positions to realize losses",
      "Wait 31 days before repurchasing (wash sale rule)",
      "Apply losses against gains and up to $3,000 income",
    ],
  },
  {
    id: "5",
    title: "Charitable Giving Strategy",
    description:
      "Bunch charitable donations in one year to exceed the standard deduction threshold.",
    potentialSavings: 1200,
    difficulty: "medium" as const,
    category: "Deductions",
    actionSteps: [
      "Calculate total planned donations for next 2-3 years",
      "Consider donor-advised fund for bunching",
      "Donate appreciated stock instead of cash",
    ],
  },
];

// Tax brackets for visualization
const TAX_BRACKETS_2026 = [
  { rate: 10, min: 0, max: 11600, label: "10%" },
  { rate: 12, min: 11601, max: 47150, label: "12%" },
  { rate: 22, min: 47151, max: 100525, label: "22%" },
  { rate: 24, min: 100526, max: 191950, label: "24%" },
  { rate: 32, min: 191951, max: 243725, label: "32%" },
  { rate: 35, min: 243726, max: 609350, label: "35%" },
  { rate: 37, min: 609351, max: Infinity, label: "37%" },
];

const difficultyColors = {
  easy: { bg: "#D1FAE5", text: "#065F46" },
  medium: { bg: "#FEF3C7", text: "#92400E" },
  hard: { bg: "#FEE2E2", text: "#991B1B" },
};

export default function TaxOptimizerScreen() {
  const {
    analysis,
    tips,
    fetchAnalysis,
    fetchTips,
    dismissTip,
    compareYears,
    yearComparisons,
  } = useTaxStore();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showAllTips, setShowAllTips] = useState(false);
  const [displayTips, setDisplayTips] = useState(TAX_TIPS);

  const taxableIncome = analysis?.currentProjection?.taxableIncome || 285400;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    await Promise.all([fetchTips(), compareYears([2024, 2025, 2026])]);
  };

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getCurrentBracket = () => {
    for (const bracket of TAX_BRACKETS_2026) {
      if (taxableIncome <= bracket.max) {
        return bracket;
      }
    }
    return TAX_BRACKETS_2026[TAX_BRACKETS_2026.length - 1];
  };

  const currentBracket = getCurrentBracket();

  const handleDismissTip = (tipId: string) => {
    Alert.alert("Dismiss Tip", "Hide this tip from your recommendations?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Dismiss",
        onPress: () => {
          setDisplayTips((prev) => prev.filter((t) => t.id !== tipId));
        },
      },
    ]);
  };

  const handleTipAction = (tip: (typeof TAX_TIPS)[0]) => {
    Alert.alert(
      tip.title,
      `Steps:\n\n${tip.actionSteps.map((s, i) => `${i + 1}. ${s}`).join("\n\n")}`,
      [{ text: "Got It", style: "default" }],
    );
  };

  const totalPotentialSavings = displayTips.reduce(
    (sum, tip) => sum + tip.potentialSavings,
    0,
  );

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          tintColor="#F59E0B"
        />
      }
    >
      {/* Header Stats */}
      <View style={styles.statsContainer}>
        <LinearGradient
          colors={["#F59E0B", "#EA580C"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.statsGradient}
        >
          <Text style={styles.statsLabel}>Total Optimization Potential</Text>
          <Text style={styles.statsValue}>
            {formatCurrency(totalPotentialSavings)}
          </Text>
          <Text style={styles.statsSubtext}>
            {displayTips.length} opportunities identified
          </Text>
        </LinearGradient>
      </View>

      {/* Tax Bracket Visualization */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your Tax Bracket</Text>

        <View style={styles.bracketCard}>
          <View style={styles.bracketHeader}>
            <View>
              <Text style={styles.bracketCurrentLabel}>
                Current Marginal Rate
              </Text>
              <Text style={styles.bracketCurrentRate}>
                {currentBracket.label}
              </Text>
            </View>
            <View style={styles.bracketIncomeBox}>
              <Text style={styles.bracketIncomeLabel}>Taxable Income</Text>
              <Text style={styles.bracketIncomeValue}>
                {formatCurrency(taxableIncome)}
              </Text>
            </View>
          </View>

          {/* Bracket Bars */}
          <View style={styles.bracketBars}>
            {TAX_BRACKETS_2026.map((bracket, index) => {
              const isCurrent = bracket.rate === currentBracket.rate;
              const isPast = bracket.rate < currentBracket.rate;
              const barWidth = Math.min(100, (bracket.rate / 37) * 100);

              return (
                <View key={index} style={styles.bracketRow}>
                  <Text style={styles.bracketLabel}>{bracket.label}</Text>
                  <View style={styles.bracketBarContainer}>
                    <View
                      style={[
                        styles.bracketBar,
                        {
                          width: `${barWidth}%`,
                          backgroundColor: isCurrent
                            ? "#F59E0B"
                            : isPast
                              ? "#FED7AA"
                              : "#E5E7EB",
                        },
                      ]}
                    />
                    {isCurrent && (
                      <View style={styles.currentIndicator}>
                        <Text style={styles.currentIndicatorText}>YOU</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.bracketRange}>
                    {bracket.max === Infinity
                      ? `$${(bracket.min / 1000).toFixed(0)}K+`
                      : `$${(bracket.max / 1000).toFixed(0)}K`}
                  </Text>
                </View>
              );
            })}
          </View>

          {/* Bracket Tip */}
          <View style={styles.bracketTip}>
            <Text style={styles.bracketTipIcon}>💡</Text>
            <Text style={styles.bracketTipText}>
              You're{" "}
              {formatCurrency(
                taxableIncome > currentBracket.max
                  ? 0
                  : currentBracket.max - taxableIncome,
              )}{" "}
              away from the next bracket. Consider pre-tax contributions to stay
              in the {currentBracket.label} bracket.
            </Text>
          </View>
        </View>
      </View>

      {/* Tax-Saving Tips */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Personalized Tips</Text>
          <TouchableOpacity onPress={() => setShowAllTips(!showAllTips)}>
            <Text style={styles.seeAllText}>
              {showAllTips ? "Show Less" : "See All"}
            </Text>
          </TouchableOpacity>
        </View>

        {(showAllTips ? displayTips : displayTips.slice(0, 3)).map((tip) => (
          <TouchableOpacity
            key={tip.id}
            style={styles.tipCard}
            onPress={() => handleTipAction(tip)}
            activeOpacity={0.7}
          >
            <View style={styles.tipHeader}>
              <View
                style={[
                  styles.difficultyBadge,
                  { backgroundColor: difficultyColors[tip.difficulty].bg },
                ]}
              >
                <Text
                  style={[
                    styles.difficultyText,
                    { color: difficultyColors[tip.difficulty].text },
                  ]}
                >
                  {tip.difficulty.toUpperCase()}
                </Text>
              </View>
              <Text style={styles.tipCategory}>{tip.category}</Text>
              <TouchableOpacity
                style={styles.dismissButton}
                onPress={() => handleDismissTip(tip.id)}
              >
                <Text style={styles.dismissText}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.tipTitle}>{tip.title}</Text>
            <Text style={styles.tipDescription}>{tip.description}</Text>

            <View style={styles.tipFooter}>
              {tip.potentialSavings > 0 && (
                <View style={styles.savingsBox}>
                  <Text style={styles.savingsLabel}>Potential Savings</Text>
                  <Text style={styles.savingsValue}>
                    {formatCurrency(tip.potentialSavings)}
                  </Text>
                </View>
              )}
              <TouchableOpacity style={styles.actionButton}>
                <Text style={styles.actionButtonText}>View Steps →</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* Year-over-Year Comparison */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Year-over-Year Comparison</Text>

        <View style={styles.comparisonCard}>
          <View style={styles.comparisonHeader}>
            <View style={styles.comparisonColumn}>
              <Text style={styles.comparisonLabel}>Year</Text>
            </View>
            <View style={styles.comparisonColumn}>
              <Text style={styles.comparisonLabel}>Income</Text>
            </View>
            <View style={styles.comparisonColumn}>
              <Text style={styles.comparisonLabel}>Tax</Text>
            </View>
            <View style={styles.comparisonColumn}>
              <Text style={styles.comparisonLabel}>Rate</Text>
            </View>
          </View>

          {[
            { year: 2024, income: 265000, tax: 68000, rate: 0.256 },
            { year: 2025, income: 285000, tax: 75000, rate: 0.263 },
            { year: 2026, income: 300000, tax: 85000, rate: 0.283 },
          ].map((row, index) => (
            <View
              key={row.year}
              style={[
                styles.comparisonRow,
                index === 2 && styles.comparisonRowCurrent,
              ]}
            >
              <View style={styles.comparisonColumn}>
                <Text
                  style={[
                    styles.comparisonValue,
                    index === 2 && styles.comparisonValueCurrent,
                  ]}
                >
                  {row.year}
                </Text>
              </View>
              <View style={styles.comparisonColumn}>
                <Text style={styles.comparisonValue}>
                  ${(row.income / 1000).toFixed(0)}K
                </Text>
              </View>
              <View style={styles.comparisonColumn}>
                <Text style={[styles.comparisonValue, styles.comparisonTax]}>
                  ${(row.tax / 1000).toFixed(0)}K
                </Text>
              </View>
              <View style={styles.comparisonColumn}>
                <Text style={styles.comparisonValue}>
                  {(row.rate * 100).toFixed(1)}%
                </Text>
              </View>
            </View>
          ))}

          <View style={styles.comparisonTrend}>
            <Text style={styles.trendText}>
              📈 Your effective tax rate has increased by{" "}
              <Text style={styles.trendHighlight}>2.7%</Text> over 3 years
            </Text>
          </View>
        </View>
      </View>

      {/* Retirement Gap */}
      {analysis && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Retirement Contribution Gap</Text>

          <View style={styles.gapCard}>
            <View style={styles.gapHeader}>
              <Text style={styles.gapTitle}>Contribution Room Remaining</Text>
              <Text style={styles.gapAmount}>
                {formatCurrency(analysis.retirementContributionGap)}
              </Text>
            </View>

            <View style={styles.gapDetails}>
              <View style={styles.gapItem}>
                <Text style={styles.gapItemLabel}>401(k) Remaining</Text>
                <Text style={styles.gapItemValue}>$13,000</Text>
              </View>
              <View style={styles.gapItem}>
                <Text style={styles.gapItemLabel}>IRA Remaining</Text>
                <Text style={styles.gapItemValue}>$7,000</Text>
              </View>
              <View style={styles.gapItem}>
                <Text style={styles.gapItemLabel}>HSA Remaining</Text>
                <Text style={styles.gapItemValue}>$3,150</Text>
              </View>
            </View>

            <View style={styles.gapSuggestion}>
              <Text style={styles.gapSuggestionText}>
                Suggested monthly contribution increase:{" "}
                <Text style={styles.gapSuggestionAmount}>
                  {formatCurrency(analysis.suggestedMonthlyContribution)}
                </Text>
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Disclaimer */}
      <View style={styles.disclaimerContainer}>
        <Text style={styles.disclaimerText}>
          Tax optimization suggestions are based on AI analysis and may not
          apply to your specific situation. Consult a qualified tax professional
          before making tax decisions.
        </Text>
      </View>

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF7ED",
  },
  statsContainer: {
    padding: 16,
  },
  statsGradient: {
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
  },
  statsLabel: {
    fontSize: 14,
    color: "rgba(255,255,255,0.9)",
    fontWeight: "500",
  },
  statsValue: {
    fontSize: 40,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginVertical: 8,
  },
  statsSubtext: {
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1C1917",
    marginBottom: 12,
  },
  seeAllText: {
    fontSize: 14,
    color: "#F59E0B",
    fontWeight: "500",
  },
  bracketCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  bracketHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  bracketCurrentLabel: {
    fontSize: 12,
    color: "#78716C",
  },
  bracketCurrentRate: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#F59E0B",
  },
  bracketIncomeBox: {
    alignItems: "flex-end",
  },
  bracketIncomeLabel: {
    fontSize: 12,
    color: "#78716C",
  },
  bracketIncomeValue: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1C1917",
  },
  bracketBars: {
    gap: 8,
  },
  bracketRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  bracketLabel: {
    width: 40,
    fontSize: 12,
    color: "#78716C",
    fontWeight: "500",
  },
  bracketBarContainer: {
    flex: 1,
    height: 20,
    backgroundColor: "#F3F4F6",
    borderRadius: 4,
    marginHorizontal: 8,
    position: "relative",
  },
  bracketBar: {
    height: "100%",
    borderRadius: 4,
  },
  currentIndicator: {
    position: "absolute",
    right: 8,
    top: 2,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  currentIndicatorText: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#F59E0B",
  },
  bracketRange: {
    width: 50,
    fontSize: 11,
    color: "#9CA3AF",
    textAlign: "right",
  },
  bracketTip: {
    flexDirection: "row",
    backgroundColor: "#FEF3C7",
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  bracketTipIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  bracketTipText: {
    flex: 1,
    fontSize: 13,
    color: "#92400E",
    lineHeight: 18,
  },
  tipCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  tipHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 8,
  },
  difficultyText: {
    fontSize: 10,
    fontWeight: "700",
  },
  tipCategory: {
    fontSize: 12,
    color: "#9CA3AF",
    flex: 1,
  },
  dismissButton: {
    padding: 4,
  },
  dismissText: {
    fontSize: 16,
    color: "#9CA3AF",
  },
  tipTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1C1917",
    marginBottom: 8,
  },
  tipDescription: {
    fontSize: 14,
    color: "#78716C",
    lineHeight: 20,
    marginBottom: 12,
  },
  tipFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  savingsBox: {
    flex: 1,
  },
  savingsLabel: {
    fontSize: 11,
    color: "#78716C",
  },
  savingsValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#16A34A",
  },
  actionButton: {
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  actionButtonText: {
    fontSize: 14,
    color: "#92400E",
    fontWeight: "600",
  },
  comparisonCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  comparisonHeader: {
    flexDirection: "row",
    backgroundColor: "#F3F4F6",
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  comparisonColumn: {
    flex: 1,
    alignItems: "center",
  },
  comparisonLabel: {
    fontSize: 12,
    color: "#78716C",
    fontWeight: "500",
  },
  comparisonRow: {
    flexDirection: "row",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  comparisonRowCurrent: {
    backgroundColor: "#FEF3C7",
  },
  comparisonValue: {
    fontSize: 14,
    color: "#1C1917",
    fontWeight: "500",
  },
  comparisonValueCurrent: {
    color: "#F59E0B",
    fontWeight: "700",
  },
  comparisonTax: {
    color: "#DC2626",
  },
  comparisonTrend: {
    padding: 16,
  },
  trendText: {
    fontSize: 13,
    color: "#78716C",
  },
  trendHighlight: {
    color: "#DC2626",
    fontWeight: "600",
  },
  gapCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  gapHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  gapTitle: {
    fontSize: 14,
    color: "#78716C",
  },
  gapAmount: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#F59E0B",
  },
  gapDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  gapItem: {
    alignItems: "center",
  },
  gapItemLabel: {
    fontSize: 11,
    color: "#9CA3AF",
    marginBottom: 4,
  },
  gapItemValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1C1917",
  },
  gapSuggestion: {
    backgroundColor: "#F0FDF4",
    padding: 12,
    borderRadius: 8,
  },
  gapSuggestionText: {
    fontSize: 13,
    color: "#166534",
  },
  gapSuggestionAmount: {
    fontWeight: "700",
    color: "#16A34A",
  },
  disclaimerContainer: {
    margin: 16,
    padding: 16,
    backgroundColor: "#FEF3C7",
    borderRadius: 12,
  },
  disclaimerText: {
    fontSize: 12,
    color: "#92400E",
    lineHeight: 18,
    textAlign: "center",
  },
  bottomPadding: {
    height: 40,
  },
});
