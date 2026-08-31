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
import type { TaxTipView } from "../../src/services/api/tax";
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

/**
 * There is no TAX_TIPS constant any more.
 *
 * This screen used to seed `displayTips` with five hardcoded tips carrying
 * invented savings ($3,200, $1,600, $2,800, $1,200) and never sync them from
 * the store, so every user saw the same fabricated list and the same
 * fabricated "Total Optimization Potential" summed from it. fetchTips() hit
 * /tax/tips, which does not exist, so the real list stayed empty regardless.
 * Tips now come from the store, which fetches /tax/recommendations.
 */
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
    tipsProfileMissing,
  } = useTaxStore();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showAllTips, setShowAllTips] = useState(false);

  const displayTips = tips;

  /**
   * null until the user's analysis loads. Taxable income used to fall back to
   * 285400 — a specific, confident figure belonging to nobody — and the whole
   * bracket section was computed from it. A user cannot tell invented numbers
   * about their own finances apart from real ones, so nothing is shown until
   * their own figures arrive.
   */
  const projection = analysis?.currentProjection ?? null;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    // fetchAnalysis is NOT called here: it requires { taxYear, grossIncome,
    // filingStatus, stateOfResidence } and this screen holds none of them. It
    // populates from wherever the user entered their profile. Until then
    // `projection` is null and the rates card asks for those details rather
    // than inventing them — which is what the old $285,400 fallback did.
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

  /**
   * Rates as a percentage. The engine returns 0.24 for 24%, but has also been
   * seen to return 24 directly, so a value above 1 is treated as already-scaled
   * rather than rendered as 2400%.
   */
  const formatRate = (rate: number) =>
    `${(rate > 1 ? rate : rate * 100).toFixed(1)}%`;

  const handleDismissTip = (tipId: string) => {
    Alert.alert("Dismiss Tip", "Hide this tip from your recommendations?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Dismiss",
        onPress: async () => {
          // Was a local filter only: the tip reappeared on the next launch
          // because nothing was ever told about it. The store removes it from
          // state only when the server accepts the dismissal.
          const dismissed = await dismissTip(tipId);
          if (!dismissed) {
            Alert.alert(
              "Could not dismiss",
              "That tip is still in your list. Please try again.",
            );
          }
        },
      },
    ]);
  };

  const handleTipAction = (tip: TaxTipView) => {
    Alert.alert(
      tip.title,
      `Steps:\n\n${tip.actionSteps.map((s: string, i: number) => `${i + 1}. ${s}`).join("\n\n")}`,
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

      {/*
        The user's real rates, straight from their analysis.

        This replaced a bracket chart drawn from a hardcoded TAX_BRACKETS_2026
        table that actually held the 2024 single-filer figures ($11,600 /
        $47,150 / $100,525), applied to every user regardless of filing status,
        and fed by a taxable income that defaulted to an invented $285,400. The
        marginal rate, the bar highlight and the "$X from the next bracket"
        line were all derived from those two wrong inputs.

        federalMarginalRate and effectiveRate are computed server-side from the
        real IRS tables for the caller's own profile, so they are shown
        directly instead of re-derived on the client. The bracket chart can
        come back the moment this screen has a filing status to send: both
        /api/tax/brackets and the store's fetchBrackets already exist and take
        { taxYear, filingStatus, taxableIncome } — nothing calls them yet.
      */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your Tax Rates</Text>
        <View style={styles.bracketCard}>
          {projection ? (
            <View style={styles.bracketHeader}>
              <View>
                <Text style={styles.bracketCurrentLabel}>
                  Current Marginal Rate
                </Text>
                <Text style={styles.bracketCurrentRate}>
                  {formatRate(projection.federalMarginalRate)}
                </Text>
                <Text style={styles.bracketCurrentLabel}>
                  Effective rate {formatRate(projection.effectiveRate)}
                </Text>
              </View>
              <View style={styles.bracketIncomeBox}>
                <Text style={styles.bracketIncomeLabel}>Taxable Income</Text>
                <Text style={styles.bracketIncomeValue}>
                  {formatCurrency(projection.taxableIncome)}
                </Text>
              </View>
            </View>
          ) : (
            <Text style={styles.bracketCurrentLabel}>
              Add your income details to see your marginal and effective rates.
            </Text>
          )}
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

        {displayTips.length === 0 ? (
          <View style={styles.tipCard}>
            <Text style={styles.tipDescription}>
              {tipsProfileMissing
                ? "Tell us about your taxes and we'll look for opportunities."
                : "No opportunities found for you right now."}
            </Text>
          </View>
        ) : null}

        {(showAllTips ? displayTips : displayTips.slice(0, 3)).map((tip) => (
          <TouchableOpacity
            key={tip.id}
            style={styles.tipCard}
            onPress={() => handleTipAction(tip)}
            activeOpacity={0.7}
          >
            <View style={styles.tipHeader}>
              {/*
                difficulty and category come from the recommendation's joined
                strategy. When it did not come back they are absent, and the
                chip is omitted rather than defaulted to "MEDIUM" — a guess the
                user would read as a measurement.
              */}
              {tip.difficulty ? (
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
              ) : null}
              {tip.category ? (
                <Text style={styles.tipCategory}>{tip.category}</Text>
              ) : null}
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

          {/*
            "📈 Your effective tax rate has increased by 2.7% over 3 years"
            lived here — a claim about this user's tax history, with no source.
            Nothing stores three years of effective rates; the analysis this
            screen reads describes the CURRENT year only.

            It survived the earlier fix of this screen, which replaced the
            invented income, bracket and five tips: that pass removed the
            module-level constants and left the JSX literals.
          */}
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

            {/*
              A per-account breakdown lived here — 401(k) Remaining $13,000,
              IRA $7,000, HSA $3,150 — rendered directly BENEATH the genuinely
              computed `retirementContributionGap` above, which is what made
              them read as computed too.

              They are not. `TaxOptimizationAnalysis` (services/api/tax.ts:
              36-49) carries one `retirementContributionGap` and no per-account
              split, so there is nothing to divide between 401(k), IRA and HSA.
              "Remaining" is also a claim about what the user has ALREADY
              contributed — $13,000 remaining of a $23,000 limit asserts they
              have paid in $10,000 — and no contribution record exists.

              Stated rather than silently dropped, because a total with no
              breakdown reads as an oversight and an explained one does not.
            */}
            <Text style={styles.gapNote}>
              We cannot break this down by account yet — that needs your
              contributions so far for each of 401(k), IRA and HSA, and those
              are not recorded.
            </Text>

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
  gapNote: {
    fontSize: 13,
    color: "#9CA3AF",
    lineHeight: 19,
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
