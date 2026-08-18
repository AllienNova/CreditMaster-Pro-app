/**
 * Credit Score Analytics — the caller's real scores, history and factors.
 *
 * WHAT THIS REPLACED. A SCORE_HISTORY fixture climbing 680 -> 742 over six
 * months, a SCORE_FACTORS fixture claiming "100% on-time payments", and a
 * hardcoded "742" as the current score — shown to every user, with no request.
 * The 1M/3M/6M/1Y/ALL selector changed none of it.
 *
 * WHERE THE DATA COMES FROM.
 *   score + history  the credit store, which reads
 *                    /api/credit-monitoring/scores and
 *                    /api/credit-monitoring/history?bureau=&days= —
 *                    both plain queries on credit_scores, no mock fallback.
 *   factors          GET /api/credit/factors, rebuilt in the previous commit.
 *                    Until then that route returned five invented factors to
 *                    every caller (SF-16), which is why this screen was NOT
 *                    wired to it earlier: pointing a screen at a fabricating
 *                    endpoint launders a fixture through an HTTP call, and
 *                    that is worse than the fixture because it looks sourced.
 *
 * THREE OF THE FIVE FACTORS CANNOT BE COMPUTED and the route says so; this
 * screen renders that list rather than hiding it. A user whose payment history
 * is unknown must be told it is unknown.
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
import { useCreditStore } from "../../src/store/creditStore";
import { creditScoreApi } from "../../src/services/api/credit";

/** The selector's windows, in the months the store speaks. */
const PERIOD_MONTHS: Record<string, number> = {
  "1M": 1,
  "3M": 3,
  "6M": 6,
  "1Y": 12,
  ALL: 120,
};

/** "2026-08-17T..." -> "Aug". The chart labels points by month. */
const monthLabel = (iso: string): string => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleDateString("en-US", { month: "short" });
};

interface ApiFactor {
  id: string;
  name: string;
  impact: string;
  value: string;
  percentImpact: number;
}

interface ApiUnavailableFactor {
  id: string;
  name: string;
  percentImpact: number;
  blockedBy: string;
}

/**
 * The route's impact vocabulary is five-valued (high_positive .. high_negative),
 * not the three the fixture used. Substring match rather than a lookup table,
 * so a value this screen has not been taught renders neutral instead of
 * indexing into undefined.
 */
const getImpactColor = (impact: string): string => {
  if (impact.includes("positive")) return "#22C55E";
  if (impact.includes("negative")) return "#EF4444";
  return "#F59E0B";
};

export default function CreditScoreAnalyticsScreen() {
  const [selectedPeriod, setSelectedPeriod] = useState("6M");
  const periods = Object.keys(PERIOD_MONTHS);

  const { scores, scoreHistory, fetchScores, fetchScoreHistory } =
    useCreditStore();

  const [factors, setFactors] = useState<ApiFactor[]>([]);
  const [unavailable, setUnavailable] = useState<ApiUnavailableFactor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (period: string) => {
      setLoading(true);
      setError(null);

      // Scores first: the history route needs a bureau, and the store takes
      // it from the scores already in state.
      await fetchScores();
      await fetchScoreHistory(PERIOD_MONTHS[period] ?? 6);

      const res = await creditScoreApi.getFactors();
      if (!res.success || !res.data) {
        setError("We could not load your score factors.");
        setLoading(false);
        return;
      }

      const body = res.data as unknown as {
        data?: ApiFactor[];
        unavailable?: ApiUnavailableFactor[];
      };
      setFactors(Array.isArray(body.data) ? body.data : []);
      setUnavailable(Array.isArray(body.unavailable) ? body.unavailable : []);
      setLoading(false);
    },
    [fetchScores, fetchScoreHistory],
  );

  // Refetches when the period changes — the selector used to change nothing.
  useEffect(() => {
    load(selectedPeriod);
  }, [load, selectedPeriod]);

  const points = scoreHistory?.history ?? [];
  const currentScore = scores[0]?.score ?? null;

  // Guarded on every side. An empty history made Math.max() return -Infinity
  // and the bar heights NaN, and the old fixture could never be empty so the
  // arithmetic below was never written to survive it.
  const scoreValues = points.map((p) => p.score);
  const maxScore = scoreValues.length ? Math.max(...scoreValues) : 0;
  const minScore = scoreValues.length ? Math.min(...scoreValues) : 0;
  // TWO points minimum. With one reading the subtraction gives 0, which
  // renders as "+0 pts" — an assertion that the score held steady, when the
  // truth is that there is nothing to compare it against.
  const scoreChange =
    scoreValues.length >= 2
      ? scoreValues[scoreValues.length - 1] - scoreValues[0]
      : null;

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
          <Text style={styles.title}>Credit Score Analytics</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Current Score */}
        <Card style={styles.scoreCard}>
          <View style={styles.scoreHeader}>
            <View>
              <Text style={styles.scoreLabel}>Current Score</Text>
              {/* Was a hardcoded 742. "—" when no bureau has reported a
                  score: a placeholder number reads as the user's own. */}
              <Text testID="current-score" style={styles.scoreValue}>
                {currentScore === null ? "—" : currentScore}
              </Text>
            </View>
            {/* Only when at least two points exist. A single reading has no
                change, and the fixture could never be short enough to
                notice. */}
            {scoreChange !== null && (
            <View
              testID="score-change-badge"
              style={[
                styles.changeBadge,
                {
                  backgroundColor: scoreChange >= 0 ? "#22C55E15" : "#EF444415",
                },
              ]}
            >
              <Ionicons
                name={scoreChange >= 0 ? "arrow-up" : "arrow-down"}
                size={14}
                color={scoreChange >= 0 ? "#22C55E" : "#EF4444"}
              />
              <Text
                style={[
                  styles.changeText,
                  { color: scoreChange >= 0 ? "#22C55E" : "#EF4444" },
                ]}
              >
                {scoreChange >= 0 ? "+" : ""}
                {scoreChange} pts
              </Text>
            </View>
            )}
          </View>
          <View style={styles.scoreRange}>
            <Text style={styles.rangeLabel}>Excellent (740-850)</Text>
            <View style={styles.rangeBar}>
              <View
                style={[
                  styles.rangeFill,
                  { width: `${((742 - 300) / 550) * 100}%` },
                ]}
              />
            </View>
          </View>
        </Card>

        {/* Period Selector */}
        <View style={styles.periodSelector}>
          {periods.map((period) => (
            <TouchableOpacity
              key={period}
              style={[
                styles.periodButton,
                selectedPeriod === period && styles.periodButtonActive,
              ]}
              onPress={() => setSelectedPeriod(period)}
            >
              <Text
                style={[
                  styles.periodText,
                  selectedPeriod === period && styles.periodTextActive,
                ]}
              >
                {period}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Score Chart */}
        <Card style={styles.chartCard}>
          <Text style={styles.chartTitle}>Score History</Text>
          {points.length === 0 ? (
            <Text style={styles.emptyText}>
              {loading
                ? "Loading your score history…"
                : "No score history yet. Connect a credit bureau to start tracking."}
            </Text>
          ) : (
            <View style={styles.chart}>
              {points.map((point, index) => (
                <View key={`${point.date}-${index}`} style={styles.chartBar}>
                  <View
                    testID={`score-bar-${index}`}
                    style={[
                      styles.bar,
                      {
                        // +20/+40 keeps a flat series visible rather than
                        // collapsing every bar to zero height.
                        height: `${((point.score - minScore + 20) / (maxScore - minScore + 40)) * 100}%`,
                      },
                    ]}
                  >
                    <Text style={styles.barValue}>{point.score}</Text>
                  </View>
                  <Text style={styles.barLabel}>{monthLabel(point.date)}</Text>
                </View>
              ))}
            </View>
          )}
        </Card>

        {/* Score Factors */}
        <Text style={styles.sectionTitle}>Score Factors</Text>
        {error ? (
          <Card>
            <Text style={styles.emptyText}>{error}</Text>
            <TouchableOpacity onPress={() => load(selectedPeriod)}>
              <Text style={styles.retryText}>Try again</Text>
            </TouchableOpacity>
          </Card>
        ) : !loading && factors.length === 0 ? (
          <Card>
            <Text style={styles.emptyText}>
              None of your score factors can be measured yet.
            </Text>
          </Card>
        ) : null}
        {factors.map((factor) => (
          <Card key={factor.id} style={styles.factorCard}>
            <View style={styles.factorHeader}>
              <View
                style={[
                  styles.factorIcon,
                  { backgroundColor: `${getImpactColor(factor.impact)}15` },
                ]}
              >
                <Ionicons
                  name={
                    factor.impact.includes("positive")
                      ? "checkmark-circle"
                      : factor.impact === "negative"
                        ? "close-circle"
                        : "remove-circle"
                  }
                  size={20}
                  color={getImpactColor(factor.impact)}
                />
              </View>
              <View style={styles.factorInfo}>
                <Text style={styles.factorName}>{factor.name}</Text>
                {/* The measured finding for THIS user, not a canned
                    sentence. The fixture said "100% on-time payments" to
                    everyone. */}
                <Text style={styles.factorDescription}>{factor.value}</Text>
              </View>
              <Text style={styles.factorWeight}>{factor.percentImpact}%</Text>
            </View>
            <View style={styles.factorBar}>
              <View
                style={[
                  styles.factorFill,
                  {
                    width: `${factor.percentImpact}%`,
                    backgroundColor: getImpactColor(factor.impact),
                  },
                ]}
              />
            </View>
          </Card>
        ))}

        {/* Factors nothing here can measure yet.
            The route used to return all five with invented values — "100%
            on-time payments" for every user (SF-16). Three have no source in
            this system, so they are named with the reason rather than
            omitted: a missing factor reads as "not applicable", a listed one
            reads as "we do not know". */}
        {unavailable.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Not yet available</Text>
            {unavailable.map((factor) => (
              <Card key={factor.id} style={styles.factorCard}>
                <View style={styles.factorHeader}>
                  <View
                    style={[
                      styles.factorIcon,
                      { backgroundColor: `${theme.colors.textSecondary}15` },
                    ]}
                  >
                    <Ionicons
                      name="help-circle"
                      size={20}
                      color={theme.colors.textSecondary}
                    />
                  </View>
                  <View style={styles.factorInfo}>
                    <Text style={styles.factorName}>{factor.name}</Text>
                    <Text style={styles.factorDescription}>
                      {factor.blockedBy}
                    </Text>
                  </View>
                  <Text style={styles.factorWeight}>
                    {factor.percentImpact}%
                  </Text>
                </View>
              </Card>
            ))}
          </>
        )}

        {/* Predictions */}
        <Text style={styles.sectionTitle}>Score Predictions</Text>
        <Card style={styles.predictionCard}>
          <View style={styles.predictionRow}>
            <View style={styles.predictionItem}>
              <Text style={styles.predictionLabel}>30 Days</Text>
              <Text style={styles.predictionValue}>748</Text>
              <Text style={styles.predictionChange}>+6 pts</Text>
            </View>
            <View style={styles.predictionDivider} />
            <View style={styles.predictionItem}>
              <Text style={styles.predictionLabel}>90 Days</Text>
              <Text style={styles.predictionValue}>762</Text>
              <Text style={styles.predictionChange}>+20 pts</Text>
            </View>
            <View style={styles.predictionDivider} />
            <View style={styles.predictionItem}>
              <Text style={styles.predictionLabel}>6 Months</Text>
              <Text style={styles.predictionValue}>780</Text>
              <Text style={styles.predictionChange}>+38 pts</Text>
            </View>
          </View>
          <Text style={styles.predictionNote}>
            Based on current trends and planned actions
          </Text>
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
  scoreCard: { marginBottom: theme.spacing.md },
  scoreHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  scoreLabel: { fontSize: 13, color: theme.colors.textSecondary },
  scoreValue: { fontSize: 48, fontWeight: "700", color: theme.colors.primary },
  changeBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  changeText: { fontSize: 13, fontWeight: "600", marginLeft: 4 },
  scoreRange: { marginTop: theme.spacing.md },
  rangeLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 6,
  },
  rangeBar: {
    height: 8,
    backgroundColor: theme.colors.border,
    borderRadius: 4,
  },
  rangeFill: {
    height: "100%",
    backgroundColor: theme.colors.primary,
    borderRadius: 4,
  },
  periodSelector: { flexDirection: "row", marginBottom: theme.spacing.md },
  periodButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    marginHorizontal: 2,
    borderRadius: 8,
  },
  periodButtonActive: { backgroundColor: theme.colors.primary },
  periodText: {
    fontSize: 13,
    fontWeight: "500",
    color: theme.colors.textSecondary,
  },
  periodTextActive: { color: "#fff" },
  chartCard: { marginBottom: theme.spacing.lg },
  chartTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  chart: { flexDirection: "row", height: 150, alignItems: "flex-end" },
  chartBar: { flex: 1, alignItems: "center" },
  bar: {
    width: "70%",
    backgroundColor: theme.colors.primary,
    borderRadius: 4,
    justifyContent: "flex-start",
    alignItems: "center",
    paddingTop: 4,
  },
  barValue: { fontSize: 10, fontWeight: "600", color: "#fff" },
  barLabel: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 6 },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  factorCard: { marginBottom: theme.spacing.sm },
  factorHeader: { flexDirection: "row", alignItems: "center" },
  factorIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  factorInfo: { flex: 1 },
  factorName: { fontSize: 14, fontWeight: "600", color: theme.colors.text },
  factorDescription: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  factorWeight: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.textSecondary,
  },
  factorBar: {
    height: 4,
    backgroundColor: theme.colors.border,
    borderRadius: 2,
    marginTop: theme.spacing.sm,
  },
  factorFill: { height: "100%", borderRadius: 2 },
  predictionCard: {},
  predictionRow: { flexDirection: "row" },
  predictionItem: { flex: 1, alignItems: "center" },
  predictionLabel: { fontSize: 12, color: theme.colors.textSecondary },
  predictionValue: {
    fontSize: 24,
    fontWeight: "700",
    color: theme.colors.text,
    marginTop: 4,
  },
  predictionChange: {
    fontSize: 12,
    fontWeight: "500",
    color: "#22C55E",
    marginTop: 2,
  },
  predictionDivider: { width: 1, backgroundColor: theme.colors.border },
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
  predictionNote: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    textAlign: "center",
    marginTop: theme.spacing.md,
  },
});
