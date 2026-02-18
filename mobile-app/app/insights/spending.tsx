/**
 * Fynvita Spending Analysis Screen
 * AI-powered spending pattern analysis and insights
 */

import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { lightTheme as theme } from "../../src/constants/theme";
import { Card } from "../../src/components/Card";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface SpendingCategory {
  name: string;
  amount: number;
  percentOfTotal: number;
  trend: "up" | "down" | "stable";
  trendPercent: number;
  budget?: number;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

interface SpendingPattern {
  id: string;
  type: "anomaly" | "trend" | "recurring" | "opportunity";
  title: string;
  description: string;
  impact: string;
  severity: "low" | "medium" | "high";
}

interface SpendingAnalysis {
  totalSpending: number;
  transactionCount: number;
  averageTransaction: number;
  overallRiskScore: number;
  periodDays: number;
  categories: SpendingCategory[];
  patterns: SpendingPattern[];
  recommendations: string[];
  dailyAverage: number;
  projectedMonthly: number;
  comparedToLastPeriod: number;
}

const MOCK_ANALYSIS: SpendingAnalysis = {
  totalSpending: 3456.78,
  transactionCount: 87,
  averageTransaction: 39.73,
  overallRiskScore: 4.2,
  periodDays: 30,
  dailyAverage: 115.23,
  projectedMonthly: 3500,
  comparedToLastPeriod: 8.5,
  categories: [
    {
      name: "Housing",
      amount: 1200,
      percentOfTotal: 34.7,
      trend: "stable",
      trendPercent: 0,
      budget: 1200,
      icon: "home",
      color: "#3B82F6",
    },
    {
      name: "Groceries",
      amount: 542.15,
      percentOfTotal: 15.7,
      trend: "up",
      trendPercent: 12,
      budget: 500,
      icon: "cart",
      color: "#22C55E",
    },
    {
      name: "Dining Out",
      amount: 456.8,
      percentOfTotal: 13.2,
      trend: "up",
      trendPercent: 45,
      budget: 300,
      icon: "restaurant",
      color: "#F59E0B",
    },
    {
      name: "Transportation",
      amount: 289.45,
      percentOfTotal: 8.4,
      trend: "down",
      trendPercent: -15,
      budget: 350,
      icon: "car",
      color: "#8B5CF6",
    },
    {
      name: "Shopping",
      amount: 367.9,
      percentOfTotal: 10.6,
      trend: "up",
      trendPercent: 25,
      budget: 250,
      icon: "bag",
      color: "#EC4899",
    },
    {
      name: "Entertainment",
      amount: 198.5,
      percentOfTotal: 5.7,
      trend: "stable",
      trendPercent: 2,
      budget: 200,
      icon: "film",
      color: "#06B6D4",
    },
    {
      name: "Subscriptions",
      amount: 142.98,
      percentOfTotal: 4.1,
      trend: "up",
      trendPercent: 8,
      icon: "repeat",
      color: "#6366F1",
    },
    {
      name: "Other",
      amount: 259.0,
      percentOfTotal: 7.5,
      trend: "down",
      trendPercent: -5,
      icon: "ellipsis-horizontal",
      color: "#9CA3AF",
    },
  ],
  patterns: [
    {
      id: "1",
      type: "anomaly",
      title: "Dining spending spike",
      description:
        "Your dining out spending increased 45% compared to your 3-month average.",
      impact: "+$140/month",
      severity: "high",
    },
    {
      id: "2",
      type: "trend",
      title: "Subscription creep",
      description:
        "Your subscription costs have grown 8% over the past 6 months.",
      impact: "+$11/month",
      severity: "medium",
    },
    {
      id: "3",
      type: "recurring",
      title: "Weekend spending pattern",
      description: "You spend 40% more on weekends compared to weekdays.",
      impact: "Pattern detected",
      severity: "low",
    },
    {
      id: "4",
      type: "opportunity",
      title: "Transportation savings",
      description: "Great job! Your transportation costs are 15% below budget.",
      impact: "Save $60/month",
      severity: "low",
    },
  ],
  recommendations: [
    "Set a dining out limit of $75/week to stay within budget",
    "Review your subscriptions - 2 services appear unused in the last 30 days",
    "Consider meal prepping on weekends to reduce weekday dining expenses",
    "Your grocery spending is optimal - maintain current habits",
    "Set spending alerts for categories exceeding budget",
  ],
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export default function SpendingAnalysisScreen() {
  const [analysis] = useState<SpendingAnalysis>(MOCK_ANALYSIS);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [periodFilter, setPeriodFilter] = useState<"7d" | "30d" | "90d">("30d");
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setRefreshing(false);
  }, []);

  const getRiskColor = (score: number) => {
    if (score <= 3) return "#22C55E";
    if (score <= 6) return "#F59E0B";
    return "#EF4444";
  };

  const getPatternIcon = (type: string): keyof typeof Ionicons.glyphMap => {
    switch (type) {
      case "anomaly":
        return "alert-circle";
      case "trend":
        return "trending-up";
      case "recurring":
        return "repeat";
      case "opportunity":
        return "bulb";
      default:
        return "information-circle";
    }
  };

  const getPatternColor = (type: string) => {
    switch (type) {
      case "anomaly":
        return "#EF4444";
      case "trend":
        return "#F59E0B";
      case "recurring":
        return "#3B82F6";
      case "opportunity":
        return "#22C55E";
      default:
        return theme.colors.textSecondary;
    }
  };

  const getSeverityBadge = (severity: string) => {
    const colors = {
      high: { bg: "#FEE2E2", text: "#DC2626" },
      medium: { bg: "#FEF3C7", text: "#D97706" },
      low: { bg: "#D1FAE5", text: "#059669" },
    };
    return colors[severity as keyof typeof colors] || colors.low;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Analyzing your spending...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Spending Analysis</Text>
          <TouchableOpacity onPress={() => {}}>
            <Ionicons
              name="download-outline"
              size={24}
              color={theme.colors.textSecondary}
            />
          </TouchableOpacity>
        </View>

        {/* Period Filter */}
        <View style={styles.periodFilter}>
          {(["7d", "30d", "90d"] as const).map((period) => (
            <TouchableOpacity
              key={period}
              style={[
                styles.periodChip,
                periodFilter === period && styles.periodChipActive,
              ]}
              onPress={() => setPeriodFilter(period)}
            >
              <Text
                style={[
                  styles.periodText,
                  periodFilter === period && styles.periodTextActive,
                ]}
              >
                {period === "7d"
                  ? "7 Days"
                  : period === "30d"
                    ? "30 Days"
                    : "90 Days"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Overview Cards */}
        <View style={styles.overviewGrid}>
          <Card style={styles.overviewCard}>
            <Text style={styles.overviewLabel}>Total Spent</Text>
            <Text style={styles.overviewValue}>
              {formatCurrency(analysis.totalSpending)}
            </Text>
            <View style={styles.overviewTrend}>
              <Ionicons
                name={
                  analysis.comparedToLastPeriod >= 0
                    ? "trending-up"
                    : "trending-down"
                }
                size={14}
                color={
                  analysis.comparedToLastPeriod >= 0 ? "#EF4444" : "#22C55E"
                }
              />
              <Text
                style={[
                  styles.overviewTrendText,
                  {
                    color:
                      analysis.comparedToLastPeriod >= 0
                        ? "#EF4444"
                        : "#22C55E",
                  },
                ]}
              >
                {analysis.comparedToLastPeriod >= 0 ? "+" : ""}
                {analysis.comparedToLastPeriod}%
              </Text>
            </View>
          </Card>

          <Card style={styles.overviewCard}>
            <Text style={styles.overviewLabel}>Transactions</Text>
            <Text style={styles.overviewValue}>
              {analysis.transactionCount}
            </Text>
            <Text style={styles.overviewSubtext}>
              Avg: {formatCurrency(analysis.averageTransaction)}
            </Text>
          </Card>

          <Card style={styles.overviewCard}>
            <Text style={styles.overviewLabel}>Daily Average</Text>
            <Text style={styles.overviewValue}>
              {formatCurrency(analysis.dailyAverage)}
            </Text>
            <Text style={styles.overviewSubtext}>
              Projected: {formatCurrency(analysis.projectedMonthly)}/mo
            </Text>
          </Card>

          <Card style={styles.overviewCard}>
            <Text style={styles.overviewLabel}>Risk Score</Text>
            <Text
              style={[
                styles.overviewValue,
                { color: getRiskColor(analysis.overallRiskScore) },
              ]}
            >
              {analysis.overallRiskScore.toFixed(1)}/10
            </Text>
            <Text style={styles.overviewSubtext}>
              {analysis.overallRiskScore <= 3
                ? "Healthy"
                : analysis.overallRiskScore <= 6
                  ? "Monitor"
                  : "High Risk"}
            </Text>
          </Card>
        </View>

        {/* Spending by Category */}
        <Text style={styles.sectionTitle}>Spending by Category</Text>
        <Card style={styles.categoryCard}>
          {analysis.categories.map((cat) => {
            const isOverBudget = cat.budget && cat.amount > cat.budget;
            const budgetPercent = cat.budget
              ? (cat.amount / cat.budget) * 100
              : 0;
            const isExpanded = expandedCategory === cat.name;

            return (
              <TouchableOpacity
                key={cat.name}
                style={styles.categoryRow}
                onPress={() =>
                  setExpandedCategory(isExpanded ? null : cat.name)
                }
              >
                <View
                  style={[
                    styles.categoryIcon,
                    { backgroundColor: `${cat.color}20` },
                  ]}
                >
                  <Ionicons name={cat.icon} size={20} color={cat.color} />
                </View>
                <View style={styles.categoryContent}>
                  <View style={styles.categoryHeader}>
                    <View style={styles.categoryNameRow}>
                      <Text style={styles.categoryName}>{cat.name}</Text>
                      {isOverBudget && (
                        <View style={styles.overBudgetBadge}>
                          <Ionicons name="alert" size={10} color="#EF4444" />
                        </View>
                      )}
                    </View>
                    <View style={styles.categoryAmountRow}>
                      <Text style={styles.categoryAmount}>
                        {formatCurrency(cat.amount)}
                      </Text>
                      <View
                        style={[
                          styles.trendBadge,
                          {
                            backgroundColor:
                              cat.trend === "down"
                                ? "#D1FAE5"
                                : cat.trend === "up"
                                  ? "#FEE2E2"
                                  : "#F3F4F6",
                          },
                        ]}
                      >
                        <Ionicons
                          name={
                            cat.trend === "up"
                              ? "arrow-up"
                              : cat.trend === "down"
                                ? "arrow-down"
                                : "remove"
                          }
                          size={10}
                          color={
                            cat.trend === "down"
                              ? "#22C55E"
                              : cat.trend === "up"
                                ? "#EF4444"
                                : "#6B7280"
                          }
                        />
                        <Text
                          style={[
                            styles.trendText,
                            {
                              color:
                                cat.trend === "down"
                                  ? "#22C55E"
                                  : cat.trend === "up"
                                    ? "#EF4444"
                                    : "#6B7280",
                            },
                          ]}
                        >
                          {Math.abs(cat.trendPercent)}%
                        </Text>
                      </View>
                    </View>
                  </View>
                  <View style={styles.progressContainer}>
                    <View style={styles.progressBar}>
                      <View
                        style={[
                          styles.progressFill,
                          {
                            width: `${Math.min(cat.percentOfTotal, 100)}%`,
                            backgroundColor: cat.color,
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.percentText}>
                      {cat.percentOfTotal.toFixed(0)}%
                    </Text>
                  </View>
                  {isExpanded && cat.budget && (
                    <View style={styles.expandedContent}>
                      <View style={styles.budgetRow}>
                        <Text style={styles.budgetLabel}>Budget:</Text>
                        <Text style={styles.budgetValue}>
                          {formatCurrency(cat.budget)}
                        </Text>
                      </View>
                      <View style={styles.budgetProgress}>
                        <View
                          style={[
                            styles.budgetProgressFill,
                            {
                              width: `${Math.min(budgetPercent, 100)}%`,
                              backgroundColor: isOverBudget
                                ? "#EF4444"
                                : "#22C55E",
                            },
                          ]}
                        />
                      </View>
                      <Text
                        style={[
                          styles.budgetStatus,
                          { color: isOverBudget ? "#EF4444" : "#22C55E" },
                        ]}
                      >
                        {isOverBudget
                          ? `${formatCurrency(cat.amount - cat.budget)} over budget`
                          : `${formatCurrency(cat.budget - cat.amount)} remaining`}
                      </Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </Card>

        {/* Spending Patterns */}
        <Text style={styles.sectionTitle}>AI-Detected Patterns</Text>
        {analysis.patterns.map((pattern) => {
          const badge = getSeverityBadge(pattern.severity);
          return (
            <Card key={pattern.id} style={styles.patternCard}>
              <View style={styles.patternHeader}>
                <View
                  style={[
                    styles.patternIcon,
                    { backgroundColor: `${getPatternColor(pattern.type)}15` },
                  ]}
                >
                  <Ionicons
                    name={getPatternIcon(pattern.type)}
                    size={20}
                    color={getPatternColor(pattern.type)}
                  />
                </View>
                <View style={styles.patternContent}>
                  <View style={styles.patternTitleRow}>
                    <Text style={styles.patternTitle}>{pattern.title}</Text>
                    <View
                      style={[
                        styles.severityBadge,
                        { backgroundColor: badge.bg },
                      ]}
                    >
                      <Text
                        style={[styles.severityText, { color: badge.text }]}
                      >
                        {pattern.severity}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.patternDescription}>
                    {pattern.description}
                  </Text>
                  <Text
                    style={[
                      styles.patternImpact,
                      { color: getPatternColor(pattern.type) },
                    ]}
                  >
                    {pattern.impact}
                  </Text>
                </View>
              </View>
            </Card>
          );
        })}

        {/* Recommendations */}
        <Text style={styles.sectionTitle}>Recommendations</Text>
        <Card style={styles.recommendationsCard}>
          {analysis.recommendations.map((rec, index) => (
            <View key={index} style={styles.recommendationRow}>
              <Ionicons name="checkmark-circle" size={20} color="#22C55E" />
              <Text style={styles.recommendationText}>{rec}</Text>
            </View>
          ))}
        </Card>

        {/* Action Button */}
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => router.push("/financial/budgets" as never)}
        >
          <Ionicons name="settings" size={20} color="#fff" />
          <Text style={styles.primaryButtonText}>Adjust Budgets</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scrollView: { flex: 1, padding: theme.spacing.lg },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: {
    marginTop: theme.spacing.md,
    color: theme.colors.textSecondary,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: theme.spacing.lg,
  },
  backButton: { padding: 4 },
  title: { fontSize: 20, fontWeight: "700", color: theme.colors.text },
  periodFilter: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: theme.spacing.lg,
  },
  periodChip: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: theme.colors.surface,
    marginHorizontal: 4,
  },
  periodChipActive: { backgroundColor: theme.colors.primary },
  periodText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontWeight: "500",
  },
  periodTextActive: { color: "#fff" },
  overviewGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -6,
    marginBottom: theme.spacing.lg,
  },
  overviewCard: {
    width: "47%",
    marginHorizontal: "1.5%",
    marginBottom: 12,
    padding: theme.spacing.md,
  },
  overviewLabel: { fontSize: 12, color: theme.colors.textSecondary },
  overviewValue: {
    fontSize: 22,
    fontWeight: "700",
    color: theme.colors.text,
    marginTop: 4,
  },
  overviewTrend: { flexDirection: "row", alignItems: "center", marginTop: 4 },
  overviewTrendText: { fontSize: 13, fontWeight: "500", marginLeft: 2 },
  overviewSubtext: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  categoryCard: { marginBottom: theme.spacing.lg, padding: theme.spacing.md },
  categoryRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  categoryContent: { flex: 1 },
  categoryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  categoryNameRow: { flexDirection: "row", alignItems: "center" },
  categoryName: { fontSize: 14, fontWeight: "600", color: theme.colors.text },
  overBudgetBadge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#FEE2E2",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 6,
  },
  categoryAmountRow: { flexDirection: "row", alignItems: "center" },
  categoryAmount: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.text,
    marginRight: 8,
  },
  trendBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  trendText: { fontSize: 10, fontWeight: "600", marginLeft: 2 },
  progressContainer: { flexDirection: "row", alignItems: "center" },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: "#E5E7EB",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: { height: "100%", borderRadius: 3 },
  percentText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginLeft: 8,
    width: 32,
  },
  expandedContent: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  budgetRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  budgetLabel: { fontSize: 12, color: theme.colors.textSecondary },
  budgetValue: { fontSize: 12, fontWeight: "600", color: theme.colors.text },
  budgetProgress: {
    height: 4,
    backgroundColor: "#E5E7EB",
    borderRadius: 2,
    overflow: "hidden",
    marginBottom: 6,
  },
  budgetProgressFill: { height: "100%", borderRadius: 2 },
  budgetStatus: { fontSize: 12, fontWeight: "500" },
  patternCard: { marginBottom: theme.spacing.sm, padding: theme.spacing.md },
  patternHeader: { flexDirection: "row" },
  patternIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  patternContent: { flex: 1 },
  patternTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  patternTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: theme.colors.text,
    flex: 1,
  },
  severityBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  severityText: {
    fontSize: 10,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  patternDescription: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 19,
  },
  patternImpact: { fontSize: 13, fontWeight: "600", marginTop: 6 },
  recommendationsCard: {
    marginBottom: theme.spacing.lg,
    padding: theme.spacing.md,
  },
  recommendationRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  recommendationText: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.text,
    marginLeft: 10,
    lineHeight: 20,
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
    marginLeft: 8,
  },
});
