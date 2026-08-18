/**
 * Smart Budget Mobile Screen - Phase 2.6.2
 * AI-powered budget creation and optimization
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Modal,
  Dimensions,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { LineChart } from "react-native-chart-kit";
import { lightTheme as theme } from "../../src/constants/theme";
import { Card } from "../../src/components/Card";

const { width } = Dimensions.get("window");

// TypeScript Interfaces
interface BudgetCategory {
  category: string;
  budgeted: number;
  spent: number;
  remaining: number;
  percentUsed: number;
  trend: "up" | "down" | "stable";
}

interface BudgetAnalysis {
  totalBudgeted: number;
  totalSpent: number;
  totalRemaining: number;
  percentUsed: number;
  daysRemaining: number;
  categories: BudgetCategory[];
  monthlyIncome: number;
}

interface Recommendation {
  id: string;
  type: "increase" | "decrease" | "reallocate";
  category: string;
  currentAmount: number;
  suggestedAmount: number;
  reason: string;
  impact: "high" | "medium" | "low";
  confidence: number;
}

interface SpendingTrend {
  date: string;
  amount: number;
}

/**
 * BudgetOverview Component
 * Monthly budget summary with progress visualization
 */
interface BudgetOverviewProps {
  analysis: BudgetAnalysis;
}

const BudgetOverview: React.FC<BudgetOverviewProps> = ({ analysis }) => {
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getProgressColor = (percentUsed: number): string => {
    if (percentUsed >= 100) return theme.colors.error;
    if (percentUsed >= 90) return theme.colors.warning;
    if (percentUsed >= 75) return theme.colors.primary;
    return theme.colors.success;
  };

  return (
    <Card style={styles.overviewCard}>
      <Text style={styles.cardTitle}>Monthly Budget Overview</Text>

      <View style={styles.metricsGrid}>
        <View style={styles.metricBox}>
          <Ionicons name="wallet" size={24} color={theme.colors.primary} />
          <Text style={styles.metricLabel}>Budgeted</Text>
          <Text style={styles.metricValue}>
            {formatCurrency(analysis.totalBudgeted)}
          </Text>
        </View>

        <View style={styles.metricBox}>
          <Ionicons
            name="trending-down"
            size={24}
            color={theme.colors.warning}
          />
          <Text style={styles.metricLabel}>Spent</Text>
          <Text
            style={[
              styles.metricValue,
              { color: getProgressColor(analysis.percentUsed) },
            ]}
          >
            {formatCurrency(analysis.totalSpent)}
          </Text>
        </View>

        <View style={styles.metricBox}>
          <Ionicons name="cash" size={24} color={theme.colors.success} />
          <Text style={styles.metricLabel}>Remaining</Text>
          <Text style={styles.metricValue}>
            {formatCurrency(analysis.totalRemaining)}
          </Text>
        </View>

        <View style={styles.metricBox}>
          <Ionicons
            name="calendar"
            size={24}
            color={theme.colors.textSecondary}
          />
          <Text style={styles.metricLabel}>Days Left</Text>
          <Text style={styles.metricValue}>{analysis.daysRemaining}</Text>
        </View>
      </View>

      <View style={styles.progressSection}>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${Math.min(analysis.percentUsed, 100)}%`,
                backgroundColor: getProgressColor(analysis.percentUsed),
              },
            ]}
          />
        </View>
        <Text style={styles.progressText}>
          {analysis.percentUsed.toFixed(1)}% of budget used
        </Text>
      </View>
    </Card>
  );
};

/**
 * CategoryList Component
 * Editable list of budget categories with inline editing
 */
interface CategoryListProps {
  categories: BudgetCategory[];
  onUpdateCategory: (category: string, newAmount: number) => void;
}

const CategoryList: React.FC<CategoryListProps> = ({
  categories,
  onUpdateCategory,
}) => {
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>("");

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getProgressColor = (percentUsed: number): string => {
    if (percentUsed >= 100) return theme.colors.error;
    if (percentUsed >= 90) return theme.colors.warning;
    if (percentUsed >= 75) return theme.colors.primary;
    return theme.colors.success;
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "up":
        return "trending-up";
      case "down":
        return "trending-down";
      default:
        return "remove";
    }
  };

  const handleEdit = (category: BudgetCategory) => {
    setEditingCategory(category.category);
    setEditValue(category.budgeted.toString());
  };

  const handleSave = () => {
    if (editingCategory && editValue) {
      const newAmount = parseFloat(editValue);
      if (!isNaN(newAmount) && newAmount > 0) {
        onUpdateCategory(editingCategory, newAmount);
      }
    }
    setEditingCategory(null);
    setEditValue("");
  };

  const handleCancel = () => {
    setEditingCategory(null);
    setEditValue("");
  };

  return (
    <Card style={styles.categoryCard}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>Budget Categories</Text>
        <Text style={styles.cardSubtitle}>{categories.length} categories</Text>
      </View>

      {categories.map((category) => (
        <View key={category.category} style={styles.categoryItem}>
          <View style={styles.categoryHeader}>
            <View style={styles.categoryTitleRow}>
              <Text style={styles.categoryName}>{category.category}</Text>
              <Ionicons
                name={getTrendIcon(category.trend)}
                size={16}
                color={
                  category.trend === "up"
                    ? theme.colors.error
                    : theme.colors.success
                }
              />
            </View>
            <TouchableOpacity onPress={() => handleEdit(category)}>
              <Ionicons
                name="create-outline"
                size={20}
                color={theme.colors.primary}
              />
            </TouchableOpacity>
          </View>

          {editingCategory === category.category ? (
            <View style={styles.editContainer}>
              <TextInput
                style={styles.editInput}
                value={editValue}
                onChangeText={setEditValue}
                keyboardType="numeric"
                placeholder="Enter amount"
                autoFocus
              />
              <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                <Ionicons name="checkmark" size={20} color="#FFF" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleCancel}
              >
                <Ionicons name="close" size={20} color="#FFF" />
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View style={styles.categoryAmounts}>
                <View style={styles.amountItem}>
                  <Text style={styles.amountLabel}>Budgeted</Text>
                  <Text style={styles.amountValue}>
                    {formatCurrency(category.budgeted)}
                  </Text>
                </View>
                <View style={styles.amountItem}>
                  <Text style={styles.amountLabel}>Spent</Text>
                  <Text
                    style={[
                      styles.amountValue,
                      { color: getProgressColor(category.percentUsed) },
                    ]}
                  >
                    {formatCurrency(category.spent)}
                  </Text>
                </View>
                <View style={styles.amountItem}>
                  <Text style={styles.amountLabel}>Remaining</Text>
                  <Text style={styles.amountValue}>
                    {formatCurrency(category.remaining)}
                  </Text>
                </View>
              </View>

              <View style={styles.categoryProgress}>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${Math.min(category.percentUsed, 100)}%`,
                        backgroundColor: getProgressColor(category.percentUsed),
                      },
                    ]}
                  />
                </View>
                <Text style={styles.progressText}>
                  {category.percentUsed.toFixed(1)}%
                </Text>
              </View>
            </>
          )}
        </View>
      ))}
    </Card>
  );
};

/**
 * SpendingChart Component
 * Interactive chart showing spending trends with pinch-to-zoom
 */
interface SpendingChartProps {
  trends: SpendingTrend[];
  category?: string;
}

const SpendingChart: React.FC<SpendingChartProps> = ({ trends, category }) => {
  const chartData = {
    labels: trends.slice(-7).map((t) => new Date(t.date).getDate().toString()),
    datasets: [
      {
        data: trends.slice(-7).map((t) => t.amount),
      },
    ],
  };

  return (
    <Card style={styles.chartCard}>
      <Text style={styles.cardTitle}>
        {category ? `${category} Spending Trend` : "Overall Spending Trend"}
      </Text>
      <Text style={styles.cardSubtitle}>Last 7 days</Text>

      <LineChart
        data={chartData}
        width={width - 48}
        height={220}
        chartConfig={{
          backgroundColor: theme.colors.background,
          backgroundGradientFrom: theme.colors.background,
          backgroundGradientTo: theme.colors.background,
          decimalPlaces: 0,
          color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
          labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
          style: {
            borderRadius: 16,
          },
          propsForDots: {
            r: "6",
            strokeWidth: "2",
            stroke: theme.colors.primary,
          },
        }}
        bezier
        style={styles.chart}
      />
    </Card>
  );
};

/**
 * Recommendations Component
 * AI-generated budget optimization suggestions with one-tap apply
 */
interface RecommendationsProps {
  recommendations: Recommendation[];
  onApplyRecommendation: (recommendation: Recommendation) => void;
}

const Recommendations: React.FC<RecommendationsProps> = ({
  recommendations,
  onApplyRecommendation,
}) => {
  const getImpactColor = (impact: string): string => {
    switch (impact) {
      case "high":
        return theme.colors.success;
      case "medium":
        return theme.colors.warning;
      case "low":
        return theme.colors.textSecondary;
      default:
        return theme.colors.text;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "increase":
        return "arrow-up-circle";
      case "decrease":
        return "arrow-down-circle";
      case "reallocate":
        return "swap-horizontal";
      default:
        return "bulb";
    }
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleApply = (recommendation: Recommendation) => {
    Alert.alert(
      "Apply Recommendation",
      `Update ${recommendation.category} budget from ${formatCurrency(recommendation.currentAmount)} to ${formatCurrency(recommendation.suggestedAmount)}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Apply",
          onPress: () => onApplyRecommendation(recommendation),
        },
      ],
    );
  };

  if (recommendations.length === 0) {
    return (
      <Card style={styles.recommendationsCard}>
        <Text style={styles.cardTitle}>AI Recommendations</Text>
        <View style={styles.emptyState}>
          <Ionicons
            name="checkmark-circle"
            size={48}
            color={theme.colors.success}
          />
          <Text style={styles.emptyStateText}>Your budget looks great!</Text>
          <Text style={styles.emptyStateSubtext}>
            No optimization suggestions at this time.
          </Text>
        </View>
      </Card>
    );
  }

  return (
    <Card style={styles.recommendationsCard}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>AI Recommendations</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{recommendations.length}</Text>
        </View>
      </View>

      {recommendations.map((rec) => (
        <View key={rec.id} style={styles.recommendationItem}>
          <View style={styles.recommendationHeader}>
            <View
              style={[
                styles.recommendationIcon,
                { backgroundColor: getImpactColor(rec.impact) + "20" },
              ]}
            >
              <Ionicons
                name={getTypeIcon(rec.type)}
                size={24}
                color={getImpactColor(rec.impact)}
              />
            </View>
            <View style={styles.recommendationContent}>
              <Text style={styles.recommendationCategory}>{rec.category}</Text>
              <Text style={styles.recommendationReason}>{rec.reason}</Text>
            </View>
          </View>

          <View style={styles.recommendationAmounts}>
            <View style={styles.amountChange}>
              <Text style={styles.amountChangeLabel}>Current</Text>
              <Text style={styles.amountChangeValue}>
                {formatCurrency(rec.currentAmount)}
              </Text>
            </View>
            <Ionicons
              name="arrow-forward"
              size={20}
              color={theme.colors.textSecondary}
            />
            <View style={styles.amountChange}>
              <Text style={styles.amountChangeLabel}>Suggested</Text>
              <Text
                style={[
                  styles.amountChangeValue,
                  { color: getImpactColor(rec.impact) },
                ]}
              >
                {formatCurrency(rec.suggestedAmount)}
              </Text>
            </View>
          </View>

          <View style={styles.recommendationFooter}>
            <View style={styles.confidenceBadge}>
              <Text style={styles.confidenceText}>
                {(rec.confidence * 100).toFixed(0)}% confidence
              </Text>
            </View>
            <TouchableOpacity
              style={[
                styles.applyButton,
                { backgroundColor: getImpactColor(rec.impact) },
              ]}
              onPress={() => handleApply(rec)}
            >
              <Text style={styles.applyButtonText}>Apply</Text>
              <Ionicons name="checkmark" size={16} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </Card>
  );
};

/**
 * Main SmartBudgetScreen Component
 */
export default function SmartBudgetScreen() {
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [analysis, setAnalysis] = useState<BudgetAnalysis | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [trends, setTrends] = useState<SpendingTrend[]>([]);

  const fetchBudgetData = useCallback(async () => {
    try {
      setLoading(true);
      setLoadFailed(false);

      // Parallel API calls
      const [analysisRes, recommendationsRes, trendsRes] = await Promise.all([
        fetch("/api/financial/budgets/analyze?period=monthly"),
        fetch("/api/financial/budgets/recommendations"),
        fetch("/api/financial/spending/trends?period=daily&days=30"),
      ]);

      if (analysisRes.ok) {
        const data = await analysisRes.json();
        setAnalysis(data.analysis || null);
      }

      if (recommendationsRes.ok) {
        const data = await recommendationsRes.json();
        setRecommendations(data.recommendations || []);
      }

      if (trendsRes.ok) {
        const data = await trendsRes.json();
        setTrends(data.trends || []);
      }
    } catch (error) {
      if (__DEV__) console.error("Error fetching budget data:", error);
      // NOT Alert.alert. This runs on mount, and a native alert is a separate
      // window: it covers the screen, offers only "OK" with no retry, and
      // stays up until dismissed — it also masked every route measured after
      // it in the device sweep. The action alerts elsewhere in this file are
      // fine; those follow something the user did.
      setLoadFailed(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchBudgetData();
  }, [fetchBudgetData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchBudgetData();
  }, [fetchBudgetData]);

  const handleUpdateCategory = async (category: string, newAmount: number) => {
    try {
      const response = await fetch("/api/financial/budgets/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adjustments: [{ category, budgeted: newAmount }],
        }),
      });

      if (response.ok) {
        Alert.alert(
          "Success",
          `${category} budget updated to $${newAmount.toLocaleString()}`,
        );
        fetchBudgetData();
      } else {
        Alert.alert("Error", "Failed to update budget. Please try again.");
      }
    } catch (error) {
      if (__DEV__) console.error("Error updating category:", error);
      Alert.alert("Error", "Failed to update budget. Please try again.");
    }
  };

  const handleApplyRecommendation = async (recommendation: Recommendation) => {
    try {
      const response = await fetch("/api/financial/budgets/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adjustments: [
            {
              category: recommendation.category,
              budgeted: recommendation.suggestedAmount,
            },
          ],
        }),
      });

      if (response.ok) {
        Alert.alert("Success", "Budget recommendation applied successfully!");
        fetchBudgetData();
      } else {
        Alert.alert(
          "Error",
          "Failed to apply recommendation. Please try again.",
        );
      }
    } catch (error) {
      if (__DEV__) console.error("Error applying recommendation:", error);
      Alert.alert("Error", "Failed to apply recommendation. Please try again.");
    }
  };

    if (loadFailed && !analysis) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>
            We could not load your budget.
          </Text>
          <TouchableOpacity onPress={fetchBudgetData}>
            <Text style={styles.retryTextState}>Try again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

if (loading && !analysis) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading Budget...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.primary]}
          />
        }
      >
        {/* Budget Overview */}
        {analysis && <BudgetOverview analysis={analysis} />}

        {/* AI Recommendations */}
        <Recommendations
          recommendations={recommendations}
          onApplyRecommendation={handleApplyRecommendation}
        />

        {/* Category List */}
        {analysis && (
          <CategoryList
            categories={analysis.categories}
            onUpdateCategory={handleUpdateCategory}
          />
        )}

        {/* Spending Chart */}
        {trends.length > 0 && <SpendingChart trends={trends} />}
      </ScrollView>
    </SafeAreaView>
  );
}

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  retryTextState: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.primary,
    marginTop: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: theme.spacing.md,
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  // BudgetOverview styles
  overviewCard: {
    margin: theme.spacing.md,
    padding: theme.spacing.lg,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  cardSubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginTop: theme.spacing.md,
  },
  metricBox: {
    width: "48%",
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    alignItems: "center",
  },
  metricLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.sm,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: theme.colors.text,
    marginTop: 4,
  },
  progressSection: {
    marginTop: theme.spacing.lg,
  },
  progressBar: {
    height: 8,
    backgroundColor: theme.colors.border,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 4,
    textAlign: "right",
  },
  // CategoryList styles
  categoryCard: {
    margin: theme.spacing.md,
    padding: theme.spacing.lg,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing.md,
  },
  categoryItem: {
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  categoryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing.sm,
  },
  categoryTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
    textTransform: "capitalize",
  },
  editContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  editInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: theme.spacing.md,
    fontSize: 16,
    color: theme.colors.text,
  },
  saveButton: {
    width: 40,
    height: 40,
    backgroundColor: theme.colors.success,
    borderRadius: theme.borderRadius.sm,
    justifyContent: "center",
    alignItems: "center",
  },
  cancelButton: {
    width: 40,
    height: 40,
    backgroundColor: theme.colors.error,
    borderRadius: theme.borderRadius.sm,
    justifyContent: "center",
    alignItems: "center",
  },
  categoryAmounts: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: theme.spacing.sm,
  },
  amountItem: {
    flex: 1,
    alignItems: "center",
  },
  amountLabel: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginBottom: 2,
  },
  amountValue: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.text,
  },
  categoryProgress: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  // SpendingChart styles
  chartCard: {
    margin: theme.spacing.md,
    padding: theme.spacing.lg,
  },
  chart: {
    marginVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
  },
  // Recommendations styles
  recommendationsCard: {
    margin: theme.spacing.md,
    padding: theme.spacing.lg,
  },
  badge: {
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: "center",
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FFF",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: theme.spacing.xl,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
    marginTop: theme.spacing.md,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.sm,
  },
  recommendationItem: {
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  recommendationHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: theme.spacing.md,
  },
  recommendationIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: theme.spacing.md,
  },
  recommendationContent: {
    flex: 1,
  },
  recommendationCategory: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: 4,
    textTransform: "capitalize",
  },
  recommendationReason: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  recommendationAmounts: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  amountChange: {
    alignItems: "center",
  },
  amountChangeLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  amountChangeValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: theme.colors.text,
  },
  recommendationFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  confidenceBadge: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
  },
  confidenceText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  applyButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
  },
  applyButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFF",
  },
});
