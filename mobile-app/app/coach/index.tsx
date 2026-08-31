/**
 * AI Financial Coach Dashboard
 *
 * Main dashboard showing health score, recommendations, goals progress, and coach message.
 */

import React, { useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../src/hooks/useTheme";
import { useCoachStore } from "../../src/store";
import { ScreenHeader } from "../../src/components/ScreenHeader";
import { ScreenLoading } from "../../src/components/ScreenLoading";

export default function CoachDashboardScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { dashboard, dashboardLoading, dashboardError, fetchDashboard } =
    useCoachStore();

  useEffect(() => {
    fetchDashboard();
  }, []);

  const getHealthColor = (score: number) => {
    if (score >= 80) return "#22c55e";
    if (score >= 60) return "#eab308";
    return "#ef4444";
  };

  if (dashboardLoading && !dashboard) {
    return <ScreenLoading title="AI Financial Coach" message="Loading your coach..." />;
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      refreshControl={
        <RefreshControl
          refreshing={dashboardLoading}
          onRefresh={fetchDashboard}
        />
      }
    >
      <ScreenHeader title="AI Financial Coach" />

      {/* Coach Message */}
      <View style={[styles.coachCard, { backgroundColor: colors.primary }]}>
        <View style={styles.coachHeader}>
          <Ionicons name="sparkles" size={24} color="#fff" />
          <Text style={styles.coachTitle}>Your AI Coach</Text>
        </View>
        <Text style={styles.coachMessage}>
          {dashboard?.coachMessage || "Loading your personalized advice..."}
        </Text>
      </View>

      {/* Health Score */}
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>
          Financial Health
        </Text>
        <View style={styles.healthScoreContainer}>
          <View
            style={[
              styles.healthScoreCircle,
              { borderColor: getHealthColor(dashboard?.healthScore || 0) },
            ]}
          >
            <Text
              style={[
                styles.healthScore,
                { color: getHealthColor(dashboard?.healthScore || 0) },
              ]}
            >
              {dashboard?.healthScore || 0}
            </Text>
          </View>
          <View style={styles.healthDetails}>
            <Text style={[styles.healthTrend, { color: colors.textSecondary }]}>
              Trend: {dashboard?.healthTrend || "stable"}
            </Text>
            <Text
              style={[styles.budgetHealth, { color: colors.textSecondary }]}
            >
              Budget: {dashboard?.budgetHealth || "healthy"}
            </Text>
          </View>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.card }]}
          onPress={() => router.push("/coach/recommendations")}
        >
          <Ionicons name="bulb-outline" size={28} color={colors.primary} />
          <Text style={[styles.actionText, { color: colors.text }]}>
            Recommendations
          </Text>
          {dashboard?.pendingActionsCount ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {dashboard.pendingActionsCount}
              </Text>
            </View>
          ) : null}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.card }]}
          onPress={() => router.push("/coach/goals")}
        >
          <Ionicons name="flag-outline" size={28} color={colors.primary} />
          <Text style={[styles.actionText, { color: colors.text }]}>Goals</Text>
          <Text style={[styles.actionSubtext, { color: colors.textSecondary }]}>
            {dashboard?.goalsOnTrack || 0}/{dashboard?.activeGoals || 0} on
            track
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.card }]}
          onPress={() => router.push("/coach/budget")}
        >
          <Ionicons name="wallet-outline" size={28} color={colors.primary} />
          <Text style={[styles.actionText, { color: colors.text }]}>
            Budget
          </Text>
          <Text style={[styles.actionSubtext, { color: colors.textSecondary }]}>
            ${dashboard?.potentialSavings?.toFixed(0) || 0} savings
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.card }]}
          onPress={() => router.push("/coach/debt-strategy")}
        >
          <Ionicons
            name="trending-down-outline"
            size={28}
            color={colors.primary}
          />
          <Text style={[styles.actionText, { color: colors.text }]}>Debt</Text>
          {dashboard?.monthsToDebtFree ? (
            <Text
              style={[styles.actionSubtext, { color: colors.textSecondary }]}
            >
              {dashboard.monthsToDebtFree}mo to freedom
            </Text>
          ) : null}
        </TouchableOpacity>
      </View>

      {/* Next Milestone */}
      {dashboard?.nextMilestone && (
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>
            Next Milestone
          </Text>
          <View style={styles.milestoneContent}>
            <Ionicons name="trophy-outline" size={32} color="#eab308" />
            <View style={styles.milestoneDetails}>
              <Text style={[styles.milestoneName, { color: colors.text }]}>
                {dashboard.nextMilestone.name}
              </Text>
              <Text
                style={[styles.milestoneGoal, { color: colors.textSecondary }]}
              >
                {dashboard.nextMilestone.goalName} - $
                {dashboard.nextMilestone.targetAmount.toFixed(0)}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Top Recommendations Preview */}
      {dashboard?.topRecommendations &&
        dashboard.topRecommendations.length > 0 && (
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <View style={styles.cardHeader}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>
                Top Recommendations
              </Text>
              <TouchableOpacity
                onPress={() => router.push("/coach/recommendations")}
              >
                <Text style={[styles.seeAll, { color: colors.primary }]}>
                  See All
                </Text>
              </TouchableOpacity>
            </View>
            {dashboard.topRecommendations.slice(0, 3).map((rec) => (
              <View key={rec.id} style={styles.recItem}>
                <View
                  style={[
                    styles.priorityDot,
                    { backgroundColor: getPriorityColor(rec.priority) },
                  ]}
                />
                <View style={styles.recContent}>
                  <Text style={[styles.recTitle, { color: colors.text }]}>
                    {rec.title}
                  </Text>
                  {rec.potentialSavings && (
                    <Text style={[styles.recSavings, { color: "#22c55e" }]}>
                      Save ${rec.potentialSavings.toFixed(0)}/year
                    </Text>
                  )}
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={colors.textSecondary}
                />
              </View>
            ))}
          </View>
        )}
    </ScrollView>
  );
}

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case "critical":
      return "#ef4444";
    case "high":
      return "#f97316";
    case "medium":
      return "#eab308";
    default:
      return "#22c55e";
  }
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 12, fontSize: 16 },
  coachCard: { borderRadius: 16, padding: 20, marginBottom: 16 },
  coachHeader: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  coachTitle: { color: "#fff", fontSize: 18, fontWeight: "600", marginLeft: 8 },
  coachMessage: { color: "#fff", fontSize: 16, lineHeight: 24 },
  card: { borderRadius: 12, padding: 16, marginBottom: 16 },
  cardTitle: { fontSize: 18, fontWeight: "600", marginBottom: 12 },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  seeAll: { fontSize: 14, fontWeight: "500" },
  healthScoreContainer: { flexDirection: "row", alignItems: "center" },
  healthScoreCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  healthScore: { fontSize: 28, fontWeight: "bold" },
  healthDetails: { marginLeft: 16 },
  healthTrend: { fontSize: 14, marginBottom: 4 },
  budgetHealth: { fontSize: 14 },
  quickActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  actionButton: {
    width: "48%",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: "center",
  },
  actionText: { fontSize: 14, fontWeight: "600", marginTop: 8 },
  actionSubtext: { fontSize: 12, marginTop: 4 },
  badge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "#ef4444",
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  milestoneContent: { flexDirection: "row", alignItems: "center" },
  milestoneDetails: { marginLeft: 12, flex: 1 },
  milestoneName: { fontSize: 16, fontWeight: "600" },
  milestoneGoal: { fontSize: 14, marginTop: 4 },
  recItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.1)",
  },
  priorityDot: { width: 8, height: 8, borderRadius: 4, marginRight: 12 },
  recContent: { flex: 1 },
  recTitle: { fontSize: 14, fontWeight: "500" },
  recSavings: { fontSize: 12, marginTop: 2 },
});
