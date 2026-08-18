/**
 * Fynvita Credit Goals Screen
 * Set and track credit score goals
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  lightTheme as theme,
  getScoreColor,
  getScoreLabel,
} from "../../src/constants/theme";
import { Card } from "../../src/components/Card";
import { LineChart } from "../../src/components/charts";
import { ProgressRing } from "../../src/components/ProgressRing";
import { useCreditStore } from "../../src/store/creditStore";
import { creditBuilderRecommendationsApi } from "../../src/services/api/credit";
import type { CreditBuilderAction } from "../../src/services/api/credit";

/*
 * A `Goal` interface, SAMPLE_GOALS, SCORE_HISTORY and RECOMMENDED_ACTIONS
 * lived here, alongside `const currentScore = 678`.
 *
 * Two of the four now have real sources:
 *   SCORE_HISTORY        GET /credit-monitoring/history, via the credit store
 *   RECOMMENDED_ACTIONS  GET /api/credit-builder/recommendations, derived
 *                        from the caller's own credit-builder score
 *
 * SAMPLE_GOALS DOES NOT, and that is a finding rather than an oversight. A
 * credit-score goal ("reach 740 by June") has nowhere to live: `GoalType` in
 * src/lib/financial/types/ai-coach.types.ts:92-102 covers emergency_fund,
 * debt_payoff, savings, investment, major_purchase, retirement, education,
 * vacation, home_down_payment and custom — all of which track a target
 * AMOUNT, not a target SCORE. `financial_goals` stores targetAmount /
 * currentAmount accordingly.
 *
 * So the screen says goal-setting is not available yet instead of showing
 * goals nobody set, and the Add button is gone rather than opening a form
 * that saves nowhere.
 */



const SCORE_HISTORY_MONTHS = 6;

/**
 * "2026-08-17T..." -> "Aug", in UTC.
 *
 * timeZone matters: without it a reading dated the 1st at 00:00 UTC labels as
 * the previous month for every user west of UTC.
 */
const monthLabel = (iso: string): string => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" });
};

export default function CreditGoalsScreen() {
  const [actions, setActions] = useState<CreditBuilderAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { scores, scoreHistory, fetchScores, fetchScoreHistory } =
    useCreditStore();

  const load = useCallback(async () => {
    setError(null);
    // Scores first: the history route needs a bureau, and the store takes it
    // from the scores already in state.
    await fetchScores();
    await fetchScoreHistory(SCORE_HISTORY_MONTHS);

    const res = await creditBuilderRecommendationsApi.getAll();
    if (!res.success || !res.data) {
      setError("We could not load your recommended actions.");
      setLoading(false);
      return;
    }
    setActions(res.data.recommendations ?? []);
    setLoading(false);
  }, [fetchScores, fetchScoreHistory]);

  useEffect(() => {
    load();
  }, [load]);

  // The caller's real current score, not a constant. Null when no bureau has
  // reported one — which is different from a score of zero.
  const currentScore = scores[0]?.score ?? null;

  const historyPoints = (scoreHistory?.history ?? []).map((h) => ({
    value: h.score,
    label: monthLabel(h.date),
  }));

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
          <Text style={styles.title}>Credit Goals</Text>
          {/* The Add Goal button lived here. It opened a form that saved
              nowhere — a credit-score goal has no storage (see the note at the
              top). A control that cannot persist is worse than no control. */}
          <View style={{ width: 28 }} />
        </View>

        {/* Current Score Card */}
        <Card style={styles.scoreCard}>
          <View style={styles.scoreRow}>
            <View>
              <Text style={styles.scoreLabel}>Current Score</Text>
              <Text
                style={[
                  styles.scoreValue,
                  { color: getScoreColor(currentScore) },
                ]}
              >
                {currentScore}
              </Text>
              <Text style={styles.scoreCategory}>
                {getScoreLabel(currentScore)}
              </Text>
            </View>
            <ProgressRing
              progress={(currentScore - 300) / 550}
              size={80}
              strokeWidth={8}
              color={getScoreColor(currentScore)}
            />
          </View>
        </Card>

        {/* Score Trend */}
        <Card style={styles.chartCard}>
          <Text style={styles.sectionTitle}>Score Trend</Text>
          <LineChart
            data={historyPoints}
            height={160}
            color={theme.colors.primary}
            showDots
            showLabels
            minValue={580}
            maxValue={720}
          />
          <View style={styles.trendStats}>
            <View style={styles.trendStat}>
              <Text style={styles.trendValue}>+58</Text>
              <Text style={styles.trendLabel}>6 Month Gain</Text>
            </View>
            <View style={styles.trendStat}>
              <Text style={styles.trendValue}>+10</Text>
              <Text style={styles.trendLabel}>Monthly Avg</Text>
            </View>
          </View>
        </Card>

        <Text style={styles.sectionTitle}>Your Goals</Text>
        <Card style={styles.actionCard}>
          <Text style={styles.stateText}>
            Setting a target score is not available yet. Goals are stored as
            target AMOUNTS, so a score target has nowhere to live — the two
            sections below are your real score history and the actions derived
            from it.
          </Text>
        </Card>

        {/* Recommended Actions */}
        <Text style={styles.sectionTitle}>Recommended Actions</Text>

        {loading ? (
          <View style={{ paddingVertical: 24, alignItems: "center" }}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        ) : null}

        {error ? (
          <Card style={styles.actionCard}>
            <Text style={styles.stateText}>{error}</Text>
            <TouchableOpacity onPress={load}>
              <Text style={styles.retryText}>Try again</Text>
            </TouchableOpacity>
          </Card>
        ) : null}

        {!loading && !error && actions.length === 0 ? (
          <Card style={styles.actionCard}>
            <Text style={styles.stateText}>
              No actions yet. They are derived from your credit-builder score.
            </Text>
          </Card>
        ) : null}
        {actions.map((action, idx) => (
          <TouchableOpacity key={idx} activeOpacity={0.7}>
            <Card style={styles.actionCard}>
              <View style={styles.actionRow}>
                <View
                  style={[
                    styles.actionIcon,
                    action.impact === "high"
                      ? styles.highPriority
                      : styles.mediumPriority,
                  ]}
                >
                  {/* CreditBuilderAction carries no icon. One glyph for all
                      of them beats inventing a per-item one. */}
                  <Ionicons
                    name="flash-outline"
                    size={20}
                    color={action.impact === "high" ? "#22C55E" : "#F59E0B"}
                  />
                </View>
                <View style={styles.actionContent}>
                  <Text style={styles.actionTitle}>{action.title}</Text>
                  <Text style={styles.actionImpact}>{action.impact}</Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={theme.colors.textSecondary}
                />
              </View>
            </Card>
          </TouchableOpacity>
        ))}

        {/* An "Add New Goal" call-to-action lived here, opening the same form
            that saved nowhere. Removed for the same reason as the header
            button: a credit-score goal has no storage. */}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  stateText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  retryText: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: "600",
    marginTop: 8,
  },
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
  scoreCard: { marginBottom: theme.spacing.lg },
  scoreRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  scoreLabel: { fontSize: 14, color: theme.colors.textSecondary },
  scoreValue: { fontSize: 48, fontWeight: "700" },
  scoreCategory: { fontSize: 14, color: theme.colors.textSecondary },
  chartCard: { marginBottom: theme.spacing.lg },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  trendStats: {
    flexDirection: "row",
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  trendStat: { flex: 1, alignItems: "center" },
  trendValue: { fontSize: 24, fontWeight: "700", color: theme.colors.success },
  trendLabel: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 4 },
  goalCard: { marginBottom: theme.spacing.md },
  goalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  goalInfo: { flex: 1 },
  goalTitle: { fontSize: 16, fontWeight: "600", color: theme.colors.text },
  goalTarget: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  onTrack: { backgroundColor: "#22C55E20" },
  atRisk: { backgroundColor: "#F59E0B20" },
  statusText: { fontSize: 12, fontWeight: "600" },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: theme.spacing.md,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: theme.colors.border,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: theme.colors.primary,
    borderRadius: 4,
  },
  progressText: {
    marginLeft: 12,
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.text,
  },
  goalStats: { flexDirection: "row", marginTop: theme.spacing.md, gap: 16 },
  goalStat: { flexDirection: "row", alignItems: "center" },
  goalStatText: {
    marginLeft: 6,
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  milestones: {
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  milestone: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  milestoneText: {
    marginLeft: 8,
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  milestoneAchieved: {
    color: theme.colors.success,
    textDecorationLine: "line-through",
  },
  actionCard: { marginBottom: theme.spacing.sm },
  actionRow: { flexDirection: "row", alignItems: "center" },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  highPriority: { backgroundColor: "#22C55E20" },
  mediumPriority: { backgroundColor: "#F59E0B20" },
  actionContent: { flex: 1 },
  actionTitle: { fontSize: 15, fontWeight: "500", color: theme.colors.text },
  actionImpact: { fontSize: 13, color: theme.colors.success, marginTop: 2 },
  addGoalButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    borderStyle: "dashed",
    borderRadius: 12,
    marginTop: theme.spacing.md,
  },
  addGoalText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.primary,
  },
});
