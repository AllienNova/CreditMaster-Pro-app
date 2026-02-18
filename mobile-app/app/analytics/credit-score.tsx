/**
 * Fynvita Credit Score Analytics Screen
 * Detailed credit score analysis and predictions
 */

import React, { useState } from "react";
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

interface ScoreDataPoint {
  month: string;
  score: number;
}

interface ScoreFactor {
  name: string;
  impact: "positive" | "negative" | "neutral";
  weight: number;
  description: string;
}

const SCORE_HISTORY: ScoreDataPoint[] = [
  { month: "Jul", score: 680 },
  { month: "Aug", score: 695 },
  { month: "Sep", score: 702 },
  { month: "Oct", score: 715 },
  { month: "Nov", score: 728 },
  { month: "Dec", score: 742 },
];

const SCORE_FACTORS: ScoreFactor[] = [
  {
    name: "Payment History",
    impact: "positive",
    weight: 35,
    description: "100% on-time payments",
  },
  {
    name: "Credit Utilization",
    impact: "positive",
    weight: 30,
    description: "18% utilization rate",
  },
  {
    name: "Credit Age",
    impact: "neutral",
    weight: 15,
    description: "4.5 years average age",
  },
  {
    name: "Credit Mix",
    impact: "positive",
    weight: 10,
    description: "Good variety of accounts",
  },
  {
    name: "New Credit",
    impact: "negative",
    weight: 10,
    description: "2 recent inquiries",
  },
];

const getImpactColor = (impact: ScoreFactor["impact"]): string => {
  const colors = {
    positive: "#22C55E",
    negative: "#EF4444",
    neutral: "#F59E0B",
  };
  return colors[impact];
};

export default function CreditScoreAnalyticsScreen() {
  const [selectedPeriod, setSelectedPeriod] = useState("6M");
  const periods = ["1M", "3M", "6M", "1Y", "ALL"];
  const maxScore = Math.max(...SCORE_HISTORY.map((d) => d.score));
  const minScore = Math.min(...SCORE_HISTORY.map((d) => d.score));
  const scoreChange =
    SCORE_HISTORY[SCORE_HISTORY.length - 1].score - SCORE_HISTORY[0].score;

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
              <Text style={styles.scoreValue}>742</Text>
            </View>
            <View
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
                +{scoreChange} pts
              </Text>
            </View>
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
          <View style={styles.chart}>
            {SCORE_HISTORY.map((point, index) => (
              <View key={index} style={styles.chartBar}>
                <View
                  style={[
                    styles.bar,
                    {
                      height: `${((point.score - minScore + 20) / (maxScore - minScore + 40)) * 100}%`,
                    },
                  ]}
                >
                  <Text style={styles.barValue}>{point.score}</Text>
                </View>
                <Text style={styles.barLabel}>{point.month}</Text>
              </View>
            ))}
          </View>
        </Card>

        {/* Score Factors */}
        <Text style={styles.sectionTitle}>Score Factors</Text>
        {SCORE_FACTORS.map((factor, index) => (
          <Card key={index} style={styles.factorCard}>
            <View style={styles.factorHeader}>
              <View
                style={[
                  styles.factorIcon,
                  { backgroundColor: `${getImpactColor(factor.impact)}15` },
                ]}
              >
                <Ionicons
                  name={
                    factor.impact === "positive"
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
                <Text style={styles.factorDescription}>
                  {factor.description}
                </Text>
              </View>
              <Text style={styles.factorWeight}>{factor.weight}%</Text>
            </View>
            <View style={styles.factorBar}>
              <View
                style={[
                  styles.factorFill,
                  {
                    width: `${factor.weight}%`,
                    backgroundColor: getImpactColor(factor.impact),
                  },
                ]}
              />
            </View>
          </Card>
        ))}

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
  predictionNote: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    textAlign: "center",
    marginTop: theme.spacing.md,
  },
});
