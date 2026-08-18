/**
 * Trends — what this system can actually chart over time.
 *
 * WHAT WAS HERE. A TREND_METRICS constant of five metrics, each with a
 * six-point series, presented as the user's own history: a credit score
 * climbing 680 -> 742, utilization falling 30% -> 18%, debt falling
 * $20,950 -> $12,450, and "On-Time Payments" flat at 100%. None of it came
 * from anywhere. The month labels were a SEPARATE hardcoded array, so they did
 * not even correspond to the points they sat under.
 *
 * WHAT IS ACTUALLY AVAILABLE. Of those five, exactly ONE has a real series:
 *
 *   Credit Score        REAL SERIES. GET /api/credit-monitoring/history
 *                       returns { bureau, scores: [{ date, score }] }.
 *   Total Debt          CURRENT VALUE ONLY. GET /api/financial/debt computes
 *                       an overview from the caller's debts; nothing stores a
 *                       history of it.
 *   Credit Age          CURRENT VALUE ONLY. Computed per request from
 *                       financial_accounts.opened_date by /api/credit/factors.
 *   Credit Utilization  BLOCKED. Needs credit limits, and
 *                       financial_accounts.credit_limit is never written.
 *   On-Time Payments    BLOCKED. Needs a linked credit report.
 *
 * So this charts the one series it has, states the two current values as
 * current values rather than trends, and names what blocks the rest — reusing
 * the `unavailable` list /api/credit/factors already returns. A metric that is
 * simply absent reads as "not applicable"; one listed with its blocker reads
 * as "we do not know", and that difference is the whole point when the subject
 * is someone's credit.
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { lightTheme as theme } from "../../src/constants/theme";
import { Card } from "../../src/components/Card";
import { ScreenHeader } from "../../src/components/ScreenHeader";
import { useCreditStore } from "../../src/store/creditStore";
import { creditScoreApi } from "../../src/services/api/credit";
import { debtApi } from "../../src/services/api/financial";
import type { UnavailableCreditFactor } from "../../src/services/api/credit";

/** Windows the history route accepts, in months. */
const PERIOD_MONTHS: Record<string, number> = {
  "1M": 1,
  "3M": 3,
  "6M": 6,
  "1Y": 12,
  ALL: 120,
};

const MIN_BAR_HEIGHT = 20;
const BAR_RANGE = 100;

/**
 * "2026-08-17T..." -> "Aug", in UTC.
 *
 * timeZone matters: toLocaleDateString defaults to the device's zone, so a
 * point dated the 1st at 00:00 UTC labels as the previous month for every user
 * west of UTC. The stored timestamps are UTC.
 */
const monthLabel = (iso: string): string => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" });
};

const money = (n: number): string =>
  `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

interface CurrentValue {
  name: string;
  value: string;
  /** Why this is a number and not a line. */
  note: string;
}

export default function TrendsAnalyticsScreen(): React.ReactElement {
  const [selectedPeriod, setSelectedPeriod] = useState("6M");
  const [loading, setLoading] = useState(true);
  const [currentValues, setCurrentValues] = useState<CurrentValue[]>([]);
  const [unavailable, setUnavailable] = useState<UnavailableCreditFactor[]>([]);

  const { scores, scoreHistory, fetchScores, fetchScoreHistory } =
    useCreditStore();

  const load = useCallback(
    async (period: string) => {
      setLoading(true);

      // Scores first: the history route needs a bureau, and the store takes it
      // from the scores already in state.
      await fetchScores();
      await fetchScoreHistory(PERIOD_MONTHS[period] ?? 6);

      // The two secondary reads are independent of the chart. Either failing
      // must not blank it, so neither result gates the other.
      const [debt, factors] = await Promise.all([
        debtApi.getOverview(),
        creditScoreApi.getFactors(),
      ]);

      const values: CurrentValue[] = [];
      if (debt.success && debt.data) {
        values.push({
          name: "Total Debt",
          value: money(debt.data.totalDebt),
          note: "Today's balance. Nothing records a history of this yet, so there is no line to draw.",
        });
      }
      if (factors.success && factors.data) {
        const age = factors.data.factors.find((f) => f.id === "credit_age");
        if (age?.value) {
          values.push({
            name: "Credit Age",
            value: age.value,
            note: "Computed from your linked accounts each time you open this. It is not stored, so it cannot be charted.",
          });
        }
        setUnavailable(factors.data.unavailable);
      }
      setCurrentValues(values);
      setLoading(false);
    },
    [fetchScores, fetchScoreHistory],
  );

  useEffect(() => {
    load(selectedPeriod);
  }, [load, selectedPeriod]);

  const points = scoreHistory?.history ?? [];
  const currentScore = scores[0]?.score ?? null;

  // Guarded on every side: an empty history makes Math.max return -Infinity,
  // and a flat one makes the range zero, which turns every bar height into a
  // division by zero.
  const maxValue = points.length ? Math.max(...points.map((p) => p.score)) : 0;
  const minValue = points.length ? Math.min(...points.map((p) => p.score)) : 0;
  const range = maxValue - minValue;

  // A single reading is not a change. Rendering "+0 pts" over one point
  // asserts stability where there is nothing to compare.
  const scoreChange =
    points.length >= 2
      ? points[points.length - 1].score - points[0].score
      : null;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader title="Trends" />

        <View style={styles.periodSelector}>
          {Object.keys(PERIOD_MONTHS).map((period) => (
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

        {loading ? (
          <View style={styles.centerState} testID="trends-loading">
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        ) : null}

        {/* The one metric with a real series. */}
        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Credit Score</Text>
            <Text style={styles.currentValue} testID="current-score">
              {currentScore !== null ? currentScore : "—"}
            </Text>
          </View>

          {scoreChange !== null ? (
            <Text
              testID="score-change"
              style={[
                styles.changeText,
                {
                  color:
                    scoreChange >= 0 ? theme.colors.success : theme.colors.error,
                },
              ]}
            >
              {scoreChange >= 0 ? "+" : ""}
              {scoreChange} pts over this period
            </Text>
          ) : null}

          {points.length === 0 ? (
            <Text style={styles.emptyText} testID="history-empty">
              No score history yet for this period.
            </Text>
          ) : (
            <View style={styles.chart} testID="score-chart">
              {points.map((point, index) => (
                <View key={`${point.date}-${index}`} style={styles.barColumn}>
                  <View
                    testID={`bar-${index}`}
                    style={[
                      styles.bar,
                      {
                        // range === 0 when every reading is identical. Without
                        // this the height is 0/0 -> NaN, which React Native
                        // drops silently, so the chart just disappears.
                        height:
                          range === 0
                            ? MIN_BAR_HEIGHT
                            : MIN_BAR_HEIGHT +
                              ((point.score - minValue) / range) * BAR_RANGE,
                      },
                    ]}
                  />
                  <Text style={styles.barLabel}>{monthLabel(point.date)}</Text>
                </View>
              ))}
            </View>
          )}
        </Card>

        {/* Real numbers that are not series. Stated as what they are. */}
        {currentValues.map((v) => (
          <Card key={v.name} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{v.name}</Text>
              <Text style={styles.currentValue}>{v.value}</Text>
            </View>
            <Text style={styles.noteText}>{v.note}</Text>
          </Card>
        ))}

        {/* What cannot be measured at all, and what would unblock it. */}
        {unavailable.length > 0 ? (
          <Card style={styles.card}>
            <Text style={styles.cardTitle}>Not tracked yet</Text>
            {unavailable.map((u) => (
              <View key={u.id} style={styles.unavailableRow}>
                <Ionicons
                  name="help-circle-outline"
                  size={18}
                  color={theme.colors.textSecondary}
                />
                <View style={styles.unavailableBody}>
                  <Text style={styles.unavailableName}>{u.name}</Text>
                  <Text style={styles.unavailableWhy}>{u.blockedBy}</Text>
                </View>
              </View>
            ))}
          </Card>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scrollView: { flex: 1 },
  periodSelector: {
    flexDirection: "row",
    paddingHorizontal: theme.spacing.lg,
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  periodButton: {
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    borderRadius: 16,
    backgroundColor: theme.colors.surface,
  },
  periodButtonActive: { backgroundColor: theme.colors.primary },
  periodText: { fontSize: 13, color: theme.colors.textSecondary },
  periodTextActive: { color: "#FFFFFF", fontWeight: "600" },
  centerState: { paddingVertical: theme.spacing.xl, alignItems: "center" },
  card: { marginHorizontal: theme.spacing.lg, marginBottom: theme.spacing.md },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardTitle: { fontSize: 16, fontWeight: "600", color: theme.colors.text },
  currentValue: { fontSize: 20, fontWeight: "700", color: theme.colors.text },
  changeText: { fontSize: 13, marginTop: theme.spacing.xs },
  noteText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  emptyText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.md,
  },
  chart: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginTop: theme.spacing.lg,
    height: MIN_BAR_HEIGHT + BAR_RANGE + 24,
  },
  barColumn: { flex: 1, alignItems: "center" },
  bar: { width: 18, borderRadius: 4, backgroundColor: theme.colors.primary },
  barLabel: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  unavailableRow: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  unavailableBody: { flex: 1 },
  unavailableName: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.text,
  },
  unavailableWhy: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
});
