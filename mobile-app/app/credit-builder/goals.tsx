/**
 * Fynvita Credit Goals Screen
 * Set and track credit score goals
 */

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
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

interface Goal {
  id: string;
  title: string;
  targetScore: number;
  currentScore: number;
  deadline: string;
  status: "on_track" | "at_risk" | "achieved";
  milestones: { score: number; label: string; achieved: boolean }[];
}

const SAMPLE_GOALS: Goal[] = [
  {
    id: "1",
    title: "Qualify for Prime Rates",
    targetScore: 740,
    currentScore: 678,
    deadline: "2025-06-01",
    status: "on_track",
    milestones: [
      { score: 680, label: "Good Credit", achieved: false },
      { score: 700, label: "Very Good", achieved: false },
      { score: 740, label: "Prime Rate", achieved: false },
    ],
  },
  {
    id: "2",
    title: "Home Purchase Ready",
    targetScore: 760,
    currentScore: 678,
    deadline: "2025-12-01",
    status: "on_track",
    milestones: [
      { score: 700, label: "FHA Eligible", achieved: false },
      { score: 720, label: "Conventional", achieved: false },
      { score: 760, label: "Best Rates", achieved: false },
    ],
  },
];

const SCORE_HISTORY = [
  { value: 620, label: "Jan" },
  { value: 635, label: "Feb" },
  { value: 648, label: "Mar" },
  { value: 655, label: "Apr" },
  { value: 668, label: "May" },
  { value: 678, label: "Jun" },
];

const RECOMMENDED_ACTIONS = [
  {
    icon: "trending-down",
    title: "Lower utilization to 10%",
    impact: "+15-25 pts",
    priority: "high",
  },
  {
    icon: "time",
    title: "Pay all bills on time",
    impact: "+5-10 pts/mo",
    priority: "high",
  },
  {
    icon: "close-circle",
    title: "Remove collections account",
    impact: "+30-50 pts",
    priority: "medium",
  },
  {
    icon: "add-circle",
    title: "Become authorized user",
    impact: "+10-20 pts",
    priority: "medium",
  },
];

export default function CreditGoalsScreen() {
  const [goals, setGoals] = useState(SAMPLE_GOALS);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [newGoalTarget, setNewGoalTarget] = useState("");

  const currentScore = 678;

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
          <TouchableOpacity onPress={() => setShowAddGoal(true)}>
            <Ionicons
              name="add-circle"
              size={28}
              color={theme.colors.primary}
            />
          </TouchableOpacity>
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
            data={SCORE_HISTORY}
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

        {/* Active Goals */}
        <Text style={styles.sectionTitle}>Your Goals</Text>
        {goals.map((goal) => {
          const progress =
            ((goal.currentScore - 300) / (goal.targetScore - 300)) * 100;
          const daysRemaining = Math.ceil(
            (new Date(goal.deadline).getTime() - Date.now()) /
              (1000 * 60 * 60 * 24),
          );
          const pointsNeeded = goal.targetScore - goal.currentScore;

          return (
            <Card key={goal.id} style={styles.goalCard}>
              <View style={styles.goalHeader}>
                <View style={styles.goalInfo}>
                  <Text style={styles.goalTitle}>{goal.title}</Text>
                  <Text style={styles.goalTarget}>
                    Target: {goal.targetScore}
                  </Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    goal.status === "on_track" ? styles.onTrack : styles.atRisk,
                  ]}
                >
                  <Text style={styles.statusText}>
                    {goal.status === "on_track" ? "On Track" : "At Risk"}
                  </Text>
                </View>
              </View>

              <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${Math.min(progress, 100)}%` },
                    ]}
                  />
                </View>
                <Text style={styles.progressText}>{Math.round(progress)}%</Text>
              </View>

              <View style={styles.goalStats}>
                <View style={styles.goalStat}>
                  <Ionicons
                    name="trending-up"
                    size={16}
                    color={theme.colors.primary}
                  />
                  <Text style={styles.goalStatText}>
                    {pointsNeeded} pts needed
                  </Text>
                </View>
                <View style={styles.goalStat}>
                  <Ionicons
                    name="calendar"
                    size={16}
                    color={theme.colors.textSecondary}
                  />
                  <Text style={styles.goalStatText}>
                    {daysRemaining} days left
                  </Text>
                </View>
              </View>

              {/* Milestones */}
              <View style={styles.milestones}>
                {goal.milestones.map((milestone, idx) => (
                  <View key={idx} style={styles.milestone}>
                    <Ionicons
                      name={
                        milestone.achieved
                          ? "checkmark-circle"
                          : "ellipse-outline"
                      }
                      size={16}
                      color={
                        milestone.achieved
                          ? theme.colors.success
                          : theme.colors.border
                      }
                    />
                    <Text
                      style={[
                        styles.milestoneText,
                        milestone.achieved && styles.milestoneAchieved,
                      ]}
                    >
                      {milestone.score} - {milestone.label}
                    </Text>
                  </View>
                ))}
              </View>
            </Card>
          );
        })}

        {/* Recommended Actions */}
        <Text style={styles.sectionTitle}>Recommended Actions</Text>
        {RECOMMENDED_ACTIONS.map((action, idx) => (
          <TouchableOpacity key={idx} activeOpacity={0.7}>
            <Card style={styles.actionCard}>
              <View style={styles.actionRow}>
                <View
                  style={[
                    styles.actionIcon,
                    action.priority === "high"
                      ? styles.highPriority
                      : styles.mediumPriority,
                  ]}
                >
                  <Ionicons
                    name={action.icon as keyof typeof Ionicons.glyphMap}
                    size={20}
                    color={action.priority === "high" ? "#22C55E" : "#F59E0B"}
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

        {/* Add Goal CTA */}
        <TouchableOpacity
          style={styles.addGoalButton}
          onPress={() => setShowAddGoal(true)}
        >
          <Ionicons name="add" size={24} color={theme.colors.primary} />
          <Text style={styles.addGoalText}>Add New Goal</Text>
        </TouchableOpacity>

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
