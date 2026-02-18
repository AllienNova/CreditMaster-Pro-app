/**
 * Fynvita Score History Screen
 * Interactive timeline chart with date range selector
 */

import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  Alert,
  Share,
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
import { LineChart } from "../../src/components/charts/LineChart";
import { useCreditStore } from "../../src/store/creditStore";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

type DateRange = "3m" | "6m" | "1y" | "2y" | "all";

interface Milestone {
  date: string;
  score: number;
  type: "high" | "low" | "threshold" | "improvement";
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

const DATE_RANGES: { key: DateRange; label: string; months: number }[] = [
  { key: "3m", label: "3M", months: 3 },
  { key: "6m", label: "6M", months: 6 },
  { key: "1y", label: "1Y", months: 12 },
  { key: "2y", label: "2Y", months: 24 },
  { key: "all", label: "All", months: 60 },
];

export default function HistoryScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [selectedRange, setSelectedRange] = useState<DateRange>("6m");
  const [selectedBureau, setSelectedBureau] = useState<string>("all");

  const {
    scores,
    scoreHistory,
    fetchScores,
    fetchScoreHistory,
    isLoadingScores,
  } = useCreditStore();

  useEffect(() => {
    fetchScores();
    const range = DATE_RANGES.find((r) => r.key === selectedRange);
    fetchScoreHistory(range?.months || 6);
  }, [selectedRange, selectedBureau]);

  const onRefresh = async () => {
    setRefreshing(true);
    const range = DATE_RANGES.find((r) => r.key === selectedRange);
    await Promise.all([fetchScores(), fetchScoreHistory(range?.months || 6)]);
    setRefreshing(false);
  };

  // Prepare chart data with bureau filtering
  const filteredHistory =
    scoreHistory?.history?.filter(
      (h) => selectedBureau === "all" || h.bureau === selectedBureau,
    ) || [];

  const chartData = filteredHistory.map((h) => ({
    label: new Date(h.date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
    value: h.score,
  }));

  // Calculate stats
  const historyData = filteredHistory;
  const currentScore = historyData[historyData.length - 1]?.score || 0;
  const startScore = historyData[0]?.score || 0;
  const totalChange = currentScore - startScore;
  const highScore = Math.max(...historyData.map((h) => h.score), 0);
  const lowScore = Math.min(...historyData.map((h) => h.score), 850);
  const avgScore =
    historyData.length > 0
      ? Math.round(
          historyData.reduce((sum, h) => sum + h.score, 0) / historyData.length,
        )
      : 0;

  // Calculate milestones
  const milestones = useMemo((): Milestone[] => {
    if (historyData.length === 0) return [];

    const result: Milestone[] = [];

    // Highest score
    const highestEntry = historyData.reduce((max, curr) =>
      curr.score > max.score ? curr : max,
    );
    result.push({
      date: highestEntry.date,
      score: highestEntry.score,
      type: "high",
      description: "Highest score achieved",
      icon: "trophy",
      color: "#22C55E",
    });

    // Lowest score
    const lowestEntry = historyData.reduce((min, curr) =>
      curr.score < min.score ? curr : min,
    );
    if (lowestEntry.score !== highestEntry.score) {
      result.push({
        date: lowestEntry.date,
        score: lowestEntry.score,
        type: "low",
        description: "Lowest score in period",
        icon: "alert-circle",
        color: "#EF4444",
      });
    }

    // Threshold crossings (e.g., 700, 750, 800)
    const thresholds = [700, 750, 800];
    thresholds.forEach((threshold) => {
      const crossingIndex = historyData.findIndex((item, idx) => {
        if (idx === 0) return false;
        const prev = historyData[idx - 1];
        return prev.score < threshold && item.score >= threshold;
      });

      if (crossingIndex > 0) {
        result.push({
          date: historyData[crossingIndex].date,
          score: historyData[crossingIndex].score,
          type: "threshold",
          description: `Crossed ${threshold} threshold`,
          icon: "checkmark-circle",
          color: "#84CC16",
        });
      }
    });

    // Biggest improvement
    let maxImprovement = 0;
    let improvementIndex = -1;
    historyData.forEach((item, idx) => {
      if (idx === 0) return;
      const improvement = item.score - historyData[idx - 1].score;
      if (improvement > maxImprovement) {
        maxImprovement = improvement;
        improvementIndex = idx;
      }
    });

    if (improvementIndex > 0 && maxImprovement >= 10) {
      result.push({
        date: historyData[improvementIndex].date,
        score: historyData[improvementIndex].score,
        type: "improvement",
        description: `+${maxImprovement} point improvement`,
        icon: "trending-up",
        color: "#3B82F6",
      });
    }

    return result.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
  }, [historyData]);

  // Export/Share functionality
  const handleShare = async () => {
    try {
      const message = `My Credit Score Progress:\n\nCurrent: ${currentScore}\nChange: ${totalChange >= 0 ? "+" : ""}${totalChange} points\nHigh: ${highScore}\nLow: ${lowScore}\nAverage: ${avgScore}\n\nTracked with Fynvita Pro`;

      await Share.share({
        message,
        title: "Credit Score History",
      });
    } catch (error) {
      if (__DEV__) console.error("Error sharing:", error);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
          />
        }
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
          <Text style={styles.title}>Score History</Text>
          <TouchableOpacity onPress={handleShare}>
            <Ionicons
              name="share-outline"
              size={24}
              color={theme.colors.primary}
            />
          </TouchableOpacity>
        </View>

        {/* Date Range Selector */}
        <View style={styles.rangeSelector}>
          {DATE_RANGES.map((range) => (
            <TouchableOpacity
              key={range.key}
              style={[
                styles.rangeButton,
                selectedRange === range.key && styles.rangeButtonActive,
              ]}
              onPress={() => setSelectedRange(range.key)}
            >
              <Text
                style={[
                  styles.rangeButtonText,
                  selectedRange === range.key && styles.rangeButtonTextActive,
                ]}
              >
                {range.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Bureau Filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.bureauFilter}
          contentContainerStyle={styles.bureauFilterContent}
        >
          <TouchableOpacity
            style={[
              styles.bureauChip,
              selectedBureau === "all" && styles.bureauChipActive,
            ]}
            onPress={() => setSelectedBureau("all")}
          >
            <Text
              style={[
                styles.bureauChipText,
                selectedBureau === "all" && styles.bureauChipTextActive,
              ]}
            >
              All Bureaus
            </Text>
          </TouchableOpacity>
          {scores.map((score) => (
            <TouchableOpacity
              key={score.bureau}
              style={[
                styles.bureauChip,
                selectedBureau === score.bureau && styles.bureauChipActive,
              ]}
              onPress={() => setSelectedBureau(score.bureau)}
            >
              <Text
                style={[
                  styles.bureauChipText,
                  selectedBureau === score.bureau &&
                    styles.bureauChipTextActive,
                ]}
              >
                {score.bureau}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Chart Card */}
        <Card style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <View>
              <Text style={styles.currentScoreLabel}>Current Score</Text>
              <Text
                style={[
                  styles.currentScore,
                  { color: getScoreColor(currentScore) },
                ]}
              >
                {currentScore}
              </Text>
            </View>
            <View
              style={[
                styles.changeBadge,
                { backgroundColor: totalChange >= 0 ? "#D1FAE5" : "#FEE2E2" },
              ]}
            >
              <Ionicons
                name={totalChange >= 0 ? "trending-up" : "trending-down"}
                size={16}
                color={totalChange >= 0 ? "#10B981" : "#EF4444"}
              />
              <Text
                style={[
                  styles.changeText,
                  { color: totalChange >= 0 ? "#10B981" : "#EF4444" },
                ]}
              >
                {totalChange >= 0 ? "+" : ""}
                {totalChange} pts
              </Text>
            </View>
          </View>

          {isLoadingScores && chartData.length === 0 ? (
            <View style={styles.emptyChart}>
              <Ionicons name="sync" size={48} color={theme.colors.primary} />
              <Text style={styles.emptyChartText}>
                Loading score history...
              </Text>
            </View>
          ) : chartData.length > 0 ? (
            <LineChart
              data={chartData}
              height={200}
              color={theme.colors.primary}
              showDots
              showArea
            />
          ) : (
            <View style={styles.emptyChart}>
              <Ionicons
                name="analytics-outline"
                size={48}
                color={theme.colors.textSecondary}
              />
              <Text style={styles.emptyChartText}>
                No history data available
              </Text>
              <Text style={styles.emptyChartSubtext}>
                {selectedBureau !== "all"
                  ? `No data for ${selectedBureau}. Try selecting "All Bureaus".`
                  : "Pull to refresh or connect to a credit bureau."}
              </Text>
            </View>
          )}
        </Card>

        {/* Stats Cards */}
        <View style={styles.statsRow}>
          <Card style={styles.statCard}>
            <Text style={styles.statLabel}>High</Text>
            <Text style={[styles.statValue, { color: "#22C55E" }]}>
              {highScore}
            </Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={styles.statLabel}>Low</Text>
            <Text style={[styles.statValue, { color: "#EF4444" }]}>
              {lowScore}
            </Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={styles.statLabel}>Average</Text>
            <Text style={[styles.statValue, { color: theme.colors.primary }]}>
              {avgScore}
            </Text>
          </Card>
        </View>

        {/* Milestones */}
        {milestones.length > 0 && (
          <Card style={styles.milestonesCard}>
            <Text style={styles.cardTitle}>Milestones</Text>
            {milestones.map((milestone, index) => (
              <View key={index} style={styles.milestoneItem}>
                <View
                  style={[
                    styles.milestoneIcon,
                    { backgroundColor: `${milestone.color}20` },
                  ]}
                >
                  <Ionicons
                    name={milestone.icon}
                    size={20}
                    color={milestone.color}
                  />
                </View>
                <View style={styles.milestoneContent}>
                  <Text style={styles.milestoneDescription}>
                    {milestone.description}
                  </Text>
                  <View style={styles.milestoneDetails}>
                    <Text style={styles.milestoneDate}>
                      {new Date(milestone.date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </Text>
                    <Text
                      style={[
                        styles.milestoneScore,
                        { color: milestone.color },
                      ]}
                    >
                      {milestone.score}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </Card>
        )}

        {/* History Timeline */}
        <Card style={styles.timelineCard}>
          <Text style={styles.cardTitle}>Score Timeline</Text>
          {historyData
            .slice()
            .reverse()
            .slice(0, 10)
            .map((item, index) => (
              <View
                key={index}
                style={[
                  styles.timelineItem,
                  index === 0 && styles.timelineItemFirst,
                ]}
              >
                <View style={styles.timelineDot}>
                  <View
                    style={[
                      styles.dot,
                      { backgroundColor: getScoreColor(item.score) },
                    ]}
                  />
                  {index < 9 && <View style={styles.timelineLine} />}
                </View>
                <View style={styles.timelineContent}>
                  <View style={styles.timelineHeader}>
                    <Text style={styles.timelineDate}>
                      {new Date(item.date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </Text>
                    <Text
                      style={[
                        styles.timelineScore,
                        { color: getScoreColor(item.score) },
                      ]}
                    >
                      {item.score}
                    </Text>
                  </View>
                  <Text style={styles.timelineLabel}>
                    {getScoreLabel(item.score)}
                  </Text>
                </View>
              </View>
            ))}
        </Card>

        {/* Insights */}
        <Card style={styles.insightsCard}>
          <Text style={styles.cardTitle}>Insights</Text>
          <View style={styles.insightItem}>
            <Ionicons
              name="trending-up"
              size={20}
              color={totalChange >= 0 ? "#22C55E" : "#EF4444"}
            />
            <Text style={styles.insightText}>
              Your score has {totalChange >= 0 ? "increased" : "decreased"} by{" "}
              {Math.abs(totalChange)} points in this period
            </Text>
          </View>
          <View style={styles.insightItem}>
            <Ionicons name="analytics" size={20} color={theme.colors.primary} />
            <Text style={styles.insightText}>
              Your average score is {avgScore}, which is{" "}
              {avgScore >= 670 ? "above" : "below"} the national average
            </Text>
          </View>
          <TouchableOpacity
            style={styles.viewFactorsButton}
            onPress={() => router.push("/credit/factors")}
          >
            <Text style={styles.viewFactorsText}>View Credit Factors</Text>
            <Ionicons
              name="arrow-forward"
              size={16}
              color={theme.colors.primary}
            />
          </TouchableOpacity>
        </Card>
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scrollView: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  backButton: { padding: 4 },
  title: { fontSize: 20, fontWeight: "700", color: theme.colors.text },
  rangeSelector: {
    flexDirection: "row",
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: 4,
  },
  rangeButton: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    alignItems: "center",
    borderRadius: theme.borderRadius.md,
  },
  rangeButtonActive: { backgroundColor: theme.colors.primary },
  rangeButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: theme.colors.textSecondary,
  },
  rangeButtonTextActive: { color: "#fff" },
  bureauFilter: { marginBottom: theme.spacing.md },
  bureauFilterContent: { paddingHorizontal: theme.spacing.lg },
  bureauChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    marginRight: 8,
  },
  bureauChipActive: { backgroundColor: theme.colors.primary },
  bureauChipText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    textTransform: "capitalize",
  },
  bureauChipTextActive: { color: "#fff" },
  chartCard: {
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  chartHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: theme.spacing.md,
  },
  currentScoreLabel: { fontSize: 12, color: theme.colors.textSecondary },
  currentScore: { fontSize: 36, fontWeight: "700" },
  changeBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  changeText: { fontSize: 14, fontWeight: "600", marginLeft: 4 },
  emptyChart: { height: 200, justifyContent: "center", alignItems: "center" },
  emptyChartText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.sm,
  },
  emptyChartSubtext: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
    textAlign: "center",
    paddingHorizontal: theme.spacing.lg,
  },
  statsRow: {
    flexDirection: "row",
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  statCard: {
    flex: 1,
    marginHorizontal: 4,
    alignItems: "center",
    paddingVertical: theme.spacing.md,
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  statValue: { fontSize: 24, fontWeight: "700" },
  // Milestones Styles
  milestonesCard: {
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  milestoneItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  milestoneIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: theme.spacing.md,
  },
  milestoneContent: {
    flex: 1,
  },
  milestoneDescription: {
    fontSize: 14,
    fontWeight: "500",
    color: theme.colors.text,
    marginBottom: 4,
  },
  milestoneDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  milestoneDate: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  milestoneScore: {
    fontSize: 16,
    fontWeight: "700",
  },
  timelineCard: {
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  timelineItem: { flexDirection: "row", marginBottom: 0 },
  timelineItemFirst: {},
  timelineDot: { alignItems: "center", marginRight: theme.spacing.md },
  dot: { width: 12, height: 12, borderRadius: 6 },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: theme.colors.border,
    marginVertical: 4,
  },
  timelineContent: { flex: 1, paddingBottom: theme.spacing.md },
  timelineHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  timelineDate: { fontSize: 14, fontWeight: "500", color: theme.colors.text },
  timelineScore: { fontSize: 18, fontWeight: "700" },
  timelineLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  insightsCard: {
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  insightItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: theme.spacing.sm,
  },
  insightText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginLeft: 10,
    flex: 1,
    lineHeight: 20,
  },
  viewFactorsButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: theme.spacing.sm,
    backgroundColor: `${theme.colors.primary}10`,
    borderRadius: theme.borderRadius.md,
    marginTop: theme.spacing.sm,
  },
  viewFactorsText: {
    fontSize: 14,
    fontWeight: "500",
    color: theme.colors.primary,
    marginRight: 4,
  },
});
