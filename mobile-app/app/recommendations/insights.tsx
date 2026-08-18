/**
 * Financial Insights — the coaching insights derived from the caller's data.
 *
 * WHAT THIS REPLACED. An INSIGHTS fixture shown to every user with no
 * request: "Dining Out Increased 45% — You spent $420 on restaurants this
 * month, up from $290 last month", impact "-$130", tagged NEW. Precise
 * figures about somebody who does not exist.
 *
 * WHERE THE DATA COMES FROM. GET /api/ai/insights ->
 * behavioralCoach.generateInsights, which pushes an insight only when real
 * data supports it: a top spending category that actually exists, goals
 * genuinely past 75%, a bias score actually above 60. A user with no data
 * gets no insights rather than a generic set.
 *
 * FOUR OF THE FIXTURE'S FIELDS HAVE NO SOURCE and are gone. The real
 * CoachingInsight is { type, title, description, data? } — there is no
 * `impact` figure, no `action` label, no `actionRoute`, and no `isNew` flag.
 * services/api/financial.ts's mapWebInsight already recorded exactly this
 * conclusion for this screen: "adapt the real, narrower shape at the boundary
 * instead of faking those fields."
 *
 * THE FILTERS CHANGED VOCABULARY for the same reason. spending | saving |
 * alert | tip was invented; the route's type union is observation |
 * suggestion | warning | celebration, so no real insight could have matched a
 * chip.
 */

import React, { useState, useEffect, useCallback } from "react";
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
  financialOverviewApi,
  type Insight,
  type InsightType,
  type SpendingAnalysisData,
} from "../../src/services/api/financial";

const DAYS_IN_WEEK = 7;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** The window the "This Week" card describes, as the analyze route wants it. */
function lastSevenDays(): { startDate: string; endDate: string } {
  const end = new Date();
  const start = new Date(end.getTime() - DAYS_IN_WEEK * MS_PER_DAY);
  return { startDate: start.toISOString(), endDate: end.toISOString() };
}

/** The four values the route's CoachingInsight.type can hold. */
const INSIGHT_FILTERS: { id: string; label: string; icon: string }[] = [
  { id: "all", label: "All", icon: "apps" },
  { id: "observation", label: "Observations", icon: "eye" },
  { id: "suggestion", label: "Suggestions", icon: "bulb" },
  { id: "warning", label: "Warnings", icon: "warning" },
  { id: "celebration", label: "Wins", icon: "trophy" },
];

export default function InsightsScreen() {
  const [selectedFilter, setSelectedFilter] = useState("all");
  const filters = INSIGHT_FILTERS;

  const [insights, setInsights] = useState<Insight[]>([]);
  const [weekly, setWeekly] = useState<SpendingAnalysisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    // The "This Week" card used a WEEKLY_SUMMARY constant — $1,245 spent,
    // -12% vs last week, Groceries $320 — that the screen-data gate never
    // caught, because it detects a constant ARRAY of objects and this was a
    // constant OBJECT. Its real source is the same spending-analysis route
    // the spending screen uses, over the last seven days.
    const [res, weeklyRes] = await Promise.all([
      financialOverviewApi.getInsights(),
      financialOverviewApi.getSpendingAnalysis(lastSevenDays()),
    ]);

    // Secondary: a failed weekly read leaves that card empty rather than
    // blanking the insights the other request did return.
    setWeekly(weeklyRes.success && weeklyRes.data ? weeklyRes.data : null);

    if (!res.success || !res.data) {
      // Not an empty list: "we could not load your insights" and "there is
      // nothing to say about your data yet" lead to opposite actions.
      setError("We could not load your insights.");
      setLoading(false);
      return;
    }

    setInsights(res.data.insights ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Real, from the analyze route. Null when there is no week to compare
  // against — the old constant was always -12.
  const weeklyChange = weekly?.comparedToLastPeriod ?? null;
  const topCategory = weekly?.categories?.[0] ?? null;

  const filteredInsights =
    selectedFilter === "all"
      ? insights
      : insights.filter((i) => i.type === selectedFilter);

  // The route's four-value type union, not the invented spending | saving |
  // alert | tip. No real insight could ever have matched those.
  const getTypeIcon = (type: InsightType | string) => {
    switch (type) {
      case "observation":
        return "eye";
      case "suggestion":
        return "bulb";
      case "warning":
        return "warning";
      case "celebration":
        return "trophy";
      default:
        return "information-circle";
    }
  };

  const getTypeColor = (type: InsightType | string) => {
    switch (type) {
      case "warning":
        return "#F59E0B";
      case "celebration":
        return "#22C55E";
      case "suggestion":
        return "#8B5CF6";
      default:
        return theme.colors.primary;
    }
  };

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
          <Text style={styles.title}>Financial Insights</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Weekly Summary */}
        <Card style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <Text style={styles.summaryTitle}>This Week</Text>
            {weeklyChange !== null && (
            <View
              style={[
                styles.changeBadge,
                {
                  backgroundColor: weeklyChange < 0 ? "#DCFCE7" : "#FEE2E2",
                },
              ]}
            >
              <Ionicons
                name={
                  weeklyChange < 0
                    ? "trending-down"
                    : "trending-up"
                }
                size={14}
                color={weeklyChange < 0 ? "#22C55E" : "#EF4444"}
              />
              <Text
                style={[
                  styles.changeText,
                  {
                    color:
                      weeklyChange < 0 ? "#22C55E" : "#EF4444",
                  },
                ]}
              >
                {Math.abs(Math.round(weeklyChange))}%
              </Text>
            </View>
            )}
          </View>
          <Text style={styles.summaryAmount}>
            ${(weekly?.totalSpending ?? 0).toLocaleString()}
          </Text>
          <Text style={styles.summarySubtext}>spent this week</Text>
          {/* "Savings Found — 3 opportunities, +$127/mo" is gone: nothing
              computes an opportunity count or a potential saving. Only the
              top category has a source. */}
          {topCategory ? (
            <View style={styles.summaryStats}>
              <View style={styles.summaryStat}>
                <Text style={styles.statLabel}>Top Category</Text>
                <Text style={styles.statValue}>{topCategory.name}</Text>
                <Text style={styles.statSubvalue}>
                  ${Math.round(topCategory.amount).toLocaleString()}
                </Text>
              </View>
            </View>
          ) : null}
        </Card>

        {/* Filter Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
        >
          {filters.map((filter) => (
            <TouchableOpacity
              key={filter.id}
              style={[
                styles.filterChip,
                selectedFilter === filter.id && styles.filterChipActive,
              ]}
              onPress={() => setSelectedFilter(filter.id)}
            >
              <Ionicons
                name={filter.icon as keyof typeof Ionicons.glyphMap}
                size={16}
                color={
                  selectedFilter === filter.id
                    ? "#fff"
                    : theme.colors.textSecondary
                }
              />
              <Text
                style={[
                  styles.filterChipText,
                  selectedFilter === filter.id && styles.filterChipTextActive,
                ]}
              >
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Insights List */}
        <Text style={styles.sectionTitle}>
          {filteredInsights.length}{" "}
          {filteredInsights.length === 1 ? "Insight" : "Insights"}
        </Text>
        {loading ? (
          <Card>
            <Text style={styles.emptyText}>Loading your insights…</Text>
          </Card>
        ) : error ? (
          <Card>
            <Text style={styles.emptyText}>{error}</Text>
            <TouchableOpacity onPress={load}>
              <Text style={styles.retryText}>Try again</Text>
            </TouchableOpacity>
          </Card>
        ) : insights.length === 0 ? (
          <Card>
            <Text style={styles.emptyText}>
              No insights yet. Link an account and Fynvita will start spotting
              patterns in your spending and goals.
            </Text>
          </Card>
        ) : filteredInsights.length === 0 ? (
          <Card>
            <Text style={styles.emptyText}>No insights of this kind.</Text>
          </Card>
        ) : null}
        {filteredInsights.map((insight) => (
          <Card key={insight.id} style={styles.insightCard}>
            <View style={styles.insightHeader}>
              <View
                style={[
                  styles.insightIcon,
                  { backgroundColor: `${getTypeColor(insight.type)}15` },
                ]}
              >
                <Ionicons
                  name={
                    getTypeIcon(insight.type) as keyof typeof Ionicons.glyphMap
                  }
                  size={20}
                  color={getTypeColor(insight.type)}
                />
              </View>
              <View style={styles.insightContent}>
                <View style={styles.insightTitleRow}>
                  <Text style={styles.insightTitle}>{insight.title}</Text>
                  {/* The NEW badge is gone with the fixture. CoachingInsight
                      carries no first-seen timestamp, and a badge that is
                      always on says nothing. */}
                </View>
                <Text style={styles.insightDescription}>
                  {insight.description}
                </Text>
              </View>
            </View>
            {/* The footer is gone with the fixture. It rendered an
                `impact` figure ("-$130") and an `action` button with a route
                — three fields the real CoachingInsight does not have. There
                is no impact to state and nowhere the server says to go. */}
          </Card>
        ))}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  emptyText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: "center",
    paddingVertical: theme.spacing.md,
  },
  retryText: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.primary,
    textAlign: "center",
    marginTop: theme.spacing.sm,
  },
  scrollView: { flex: 1, padding: theme.spacing.lg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: theme.spacing.lg,
  },
  backButton: { padding: 4 },
  title: { fontSize: 20, fontWeight: "700", color: theme.colors.text },
  summaryCard: { marginBottom: theme.spacing.lg },
  summaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  summaryTitle: { fontSize: 14, color: theme.colors.textSecondary },
  changeBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  changeText: { fontSize: 12, fontWeight: "600", marginLeft: 4 },
  summaryAmount: {
    fontSize: 36,
    fontWeight: "700",
    color: theme.colors.text,
    marginTop: 4,
  },
  summarySubtext: { fontSize: 14, color: theme.colors.textSecondary },
  summaryStats: {
    flexDirection: "row",
    marginTop: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  summaryStat: { flex: 1, alignItems: "center" },
  summaryDivider: { width: 1, backgroundColor: theme.colors.border },
  statLabel: { fontSize: 11, color: theme.colors.textSecondary },
  statValue: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.text,
    marginTop: 4,
  },
  statSubvalue: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  filterScroll: { marginBottom: theme.spacing.md },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    marginRight: 8,
  },
  filterChipActive: { backgroundColor: theme.colors.primary },
  filterChipText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginLeft: 6,
  },
  filterChipTextActive: { color: "#fff" },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  insightCard: { marginBottom: theme.spacing.sm },
  insightHeader: { flexDirection: "row" },
  insightIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  insightContent: { flex: 1 },
  insightTitleRow: { flexDirection: "row", alignItems: "center" },
  insightTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: theme.colors.text,
    flex: 1,
  },
  newBadge: {
    backgroundColor: "#EF4444",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 8,
  },
  newText: { fontSize: 9, fontWeight: "700", color: "#fff" },
  insightDescription: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 4,
    lineHeight: 18,
  },
  insightFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  impactBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  impactText: { fontSize: 13, fontWeight: "600" },
  actionButton: { flexDirection: "row", alignItems: "center" },
  actionButtonText: {
    fontSize: 13,
    fontWeight: "500",
    color: theme.colors.primary,
    marginRight: 4,
  },
});
