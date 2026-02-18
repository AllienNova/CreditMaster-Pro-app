/**
 * Fynvita Financial Insights Screen
 * Spending patterns, saving opportunities, weekly summary
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

interface Insight {
  id: string;
  type: "spending" | "saving" | "alert" | "tip";
  title: string;
  description: string;
  impact: string;
  action?: string;
  actionRoute?: string;
  isNew: boolean;
}

const INSIGHTS: Insight[] = [
  {
    id: "1",
    type: "spending",
    title: "Dining Out Increased 45%",
    description:
      "You spent $420 on restaurants this month, up from $290 last month",
    impact: "-$130",
    action: "Set Budget",
    actionRoute: "/financial/budget",
    isNew: true,
  },
  {
    id: "2",
    type: "saving",
    title: "Subscription Savings Found",
    description:
      "We found 3 subscriptions you haven't used in 30+ days totaling $47/month",
    impact: "+$564/yr",
    action: "Review",
    actionRoute: "/financial/subscriptions",
    isNew: true,
  },
  {
    id: "3",
    type: "alert",
    title: "Large Purchase Detected",
    description: "A $1,250 charge at Best Buy was made yesterday",
    impact: "Verify",
    action: "Review",
    actionRoute: "/financial/transactions",
    isNew: true,
  },
  {
    id: "4",
    type: "tip",
    title: "Credit Utilization Tip",
    description:
      "Paying $200 more on your Chase card would drop utilization to 25%",
    impact: "+15 pts",
    action: "Learn More",
    actionRoute: "/credit-builder/utilization",
    isNew: false,
  },
  {
    id: "5",
    type: "saving",
    title: "Better Savings Rate Available",
    description:
      "Your savings account earns 0.5% APY. We found accounts offering 5.0%",
    impact: "+$450/yr",
    action: "Compare",
    actionRoute: "/marketplace/savings",
    isNew: false,
  },
  {
    id: "6",
    type: "spending",
    title: "Gas Spending Down 20%",
    description: "Great job! You spent $80 less on gas this month",
    impact: "+$80",
    isNew: false,
  },
];

const WEEKLY_SUMMARY = {
  totalSpent: 1245,
  vsLastWeek: -12,
  topCategory: "Groceries",
  topCategoryAmount: 320,
  savingsOpportunities: 3,
  potentialSavings: 127,
};

export default function InsightsScreen() {
  const [selectedFilter, setSelectedFilter] = useState("all");
  const filters = [
    { id: "all", label: "All", icon: "apps" },
    { id: "spending", label: "Spending", icon: "trending-down" },
    { id: "saving", label: "Savings", icon: "wallet" },
    { id: "alert", label: "Alerts", icon: "warning" },
    { id: "tip", label: "Tips", icon: "bulb" },
  ];

  const filteredInsights =
    selectedFilter === "all"
      ? INSIGHTS
      : INSIGHTS.filter((i) => i.type === selectedFilter);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "spending":
        return "trending-down";
      case "saving":
        return "wallet";
      case "alert":
        return "warning";
      case "tip":
        return "bulb";
      default:
        return "information-circle";
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "spending":
        return "#EF4444";
      case "saving":
        return "#22C55E";
      case "alert":
        return "#F59E0B";
      case "tip":
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
            <View
              style={[
                styles.changeBadge,
                {
                  backgroundColor:
                    WEEKLY_SUMMARY.vsLastWeek < 0 ? "#DCFCE7" : "#FEE2E2",
                },
              ]}
            >
              <Ionicons
                name={
                  WEEKLY_SUMMARY.vsLastWeek < 0
                    ? "trending-down"
                    : "trending-up"
                }
                size={14}
                color={WEEKLY_SUMMARY.vsLastWeek < 0 ? "#22C55E" : "#EF4444"}
              />
              <Text
                style={[
                  styles.changeText,
                  {
                    color:
                      WEEKLY_SUMMARY.vsLastWeek < 0 ? "#22C55E" : "#EF4444",
                  },
                ]}
              >
                {Math.abs(WEEKLY_SUMMARY.vsLastWeek)}%
              </Text>
            </View>
          </View>
          <Text style={styles.summaryAmount}>
            ${WEEKLY_SUMMARY.totalSpent.toLocaleString()}
          </Text>
          <Text style={styles.summarySubtext}>spent this week</Text>
          <View style={styles.summaryStats}>
            <View style={styles.summaryStat}>
              <Text style={styles.statLabel}>Top Category</Text>
              <Text style={styles.statValue}>{WEEKLY_SUMMARY.topCategory}</Text>
              <Text style={styles.statSubvalue}>
                ${WEEKLY_SUMMARY.topCategoryAmount}
              </Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryStat}>
              <Text style={styles.statLabel}>Savings Found</Text>
              <Text style={styles.statValue}>
                {WEEKLY_SUMMARY.savingsOpportunities} opportunities
              </Text>
              <Text style={[styles.statSubvalue, { color: "#22C55E" }]}>
                +${WEEKLY_SUMMARY.potentialSavings}/mo
              </Text>
            </View>
          </View>
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
          {filteredInsights.length} Insights
        </Text>
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
                  {insight.isNew && (
                    <View style={styles.newBadge}>
                      <Text style={styles.newText}>NEW</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.insightDescription}>
                  {insight.description}
                </Text>
              </View>
            </View>
            <View style={styles.insightFooter}>
              <View
                style={[
                  styles.impactBadge,
                  {
                    backgroundColor: insight.impact.startsWith("+")
                      ? "#DCFCE7"
                      : insight.impact.startsWith("-")
                        ? "#FEE2E2"
                        : "#FEF3C7",
                  },
                ]}
              >
                <Text
                  style={[
                    styles.impactText,
                    {
                      color: insight.impact.startsWith("+")
                        ? "#22C55E"
                        : insight.impact.startsWith("-")
                          ? "#EF4444"
                          : "#F59E0B",
                    },
                  ]}
                >
                  {insight.impact}
                </Text>
              </View>
              {insight.action && (
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() =>
                    insight.actionRoute &&
                    router.push(insight.actionRoute as never)
                  }
                >
                  <Text style={styles.actionButtonText}>{insight.action}</Text>
                  <Ionicons
                    name="chevron-forward"
                    size={16}
                    color={theme.colors.primary}
                  />
                </TouchableOpacity>
              )}
            </View>
          </Card>
        ))}

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
