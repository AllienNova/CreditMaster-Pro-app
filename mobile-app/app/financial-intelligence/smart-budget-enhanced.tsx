/**
 * Smart Budget Mobile Screen - Enhanced
 * AI-powered budget creation and optimization with Phase 2.1 integration
 */

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { lightTheme as theme } from "../../src/constants/theme";
import { Card } from "../../src/components/Card";

interface BudgetCategory {
  category: string;
  budgeted: number;
  spent: number;
  remaining: number;
  percentUsed: number;
}

interface BudgetAnalysis {
  totalBudgeted: number;
  totalSpent: number;
  totalRemaining: number;
  percentUsed: number;
  daysRemaining: number;
  categories: BudgetCategory[];
  alerts: Array<{
    category: string;
    severity: "high" | "medium" | "low";
    message: string;
  }>;
}

/**
 * Budget Overview Component
 * Monthly budget summary with progress bars
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

      {analysis.alerts && analysis.alerts.length > 0 && (
        <View style={styles.alertsSection}>
          <Text style={styles.alertsTitle}>⚠️ Alerts</Text>
          {analysis.alerts.slice(0, 3).map((alert, idx) => (
            <View key={idx} style={styles.alertItem}>
              <Text style={styles.alertText}>{alert.message}</Text>
            </View>
          ))}
        </View>
      )}
    </Card>
  );
};

const styles = StyleSheet.create({
  overviewCard: { padding: 16, marginBottom: 16 },
  cardTitle: { fontSize: 18, fontWeight: "600", marginBottom: 12, color: theme.colors.text },
  metricsGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginBottom: 16 },
  metricBox: { width: "48%", alignItems: "center", paddingVertical: 12, marginBottom: 8, backgroundColor: theme.colors.background, borderRadius: 8 },
  metricLabel: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 4 },
  metricValue: { fontSize: 18, fontWeight: "700", color: theme.colors.text, marginTop: 2 },
  progressSection: { marginTop: 8 },
  progressBar: { height: 8, backgroundColor: theme.colors.border, borderRadius: 4, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 4 },
  progressText: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 4, textAlign: "center" },
  alertsSection: { marginTop: 12, padding: 12, backgroundColor: "#FFF3CD", borderRadius: 8 },
  alertsTitle: { fontSize: 14, fontWeight: "600", marginBottom: 4 },
  alertItem: { paddingVertical: 2 },
  alertText: { fontSize: 13, color: theme.colors.text },
  container: { flex: 1, backgroundColor: theme.colors.background },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
});

export default function SmartBudgetEnhancedScreen() {
  const [loading, setLoading] = useState(true);
  const [analysis, setAnalysis] = useState<BudgetAnalysis | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnalysis({
        totalBudgeted: 5000,
        totalSpent: 3200,
        totalRemaining: 1800,
        percentUsed: 64,
        daysRemaining: 12,
        categories: [],
        alerts: [],
      });
      setLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  if (loading || !analysis) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={{ marginTop: 12, color: theme.colors.textSecondary }}>Loading budget data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <BudgetOverview analysis={analysis} />
      </ScrollView>
    </SafeAreaView>
  );
}
