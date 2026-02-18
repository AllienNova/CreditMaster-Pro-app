/**
 * Fynvita Budget Integration Screen
 * Link budget management with credit building goals
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
import { lightTheme as theme } from "../../src/constants/theme";
import { Card } from "../../src/components/Card";
import { BarChart } from "../../src/components/charts";

interface BudgetCategory {
  id: string;
  name: string;
  allocated: number;
  spent: number;
  icon: string;
  color: string;
}

const BUDGET_CATEGORIES: BudgetCategory[] = [
  {
    id: "debt",
    name: "Debt Payments",
    allocated: 500,
    spent: 450,
    icon: "card",
    color: "#EF4444",
  },
  {
    id: "savings",
    name: "Emergency Fund",
    allocated: 300,
    spent: 300,
    icon: "wallet",
    color: "#22C55E",
  },
  {
    id: "credit",
    name: "Credit Card Payments",
    allocated: 400,
    spent: 380,
    icon: "trending-up",
    color: "#3B82F6",
  },
  {
    id: "bills",
    name: "Monthly Bills",
    allocated: 800,
    spent: 780,
    icon: "receipt",
    color: "#8B5CF6",
  },
  {
    id: "discretionary",
    name: "Discretionary",
    allocated: 200,
    spent: 180,
    icon: "cart",
    color: "#F59E0B",
  },
];

const CREDIT_IMPACT_TIPS = [
  {
    icon: "checkmark-circle",
    title: "Pay On Time",
    description: "Allocate bill payments before the due date",
    impact: "High",
  },
  {
    icon: "trending-down",
    title: "Reduce Utilization",
    description: "Budget extra to pay down credit cards",
    impact: "High",
  },
  {
    icon: "shield",
    title: "Build Emergency Fund",
    description: "Avoid late payments during emergencies",
    impact: "Medium",
  },
  {
    icon: "cash",
    title: "Avoid New Debt",
    description: "Budget to prevent credit dependency",
    impact: "Medium",
  },
];

export default function BudgetIntegrationScreen() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [monthlyIncome, setMonthlyIncome] = useState("3500");

  const totalAllocated = BUDGET_CATEGORIES.reduce(
    (sum, c) => sum + c.allocated,
    0,
  );
  const totalSpent = BUDGET_CATEGORIES.reduce((sum, c) => sum + c.spent, 0);
  const remaining = parseFloat(monthlyIncome) - totalAllocated;

  const chartData = BUDGET_CATEGORIES.map((c) => ({
    value: c.allocated,
    label: c.name.split(" ")[0],
    color: c.color,
  }));

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
          <Text style={styles.title}>Budget & Credit</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Income Input */}
        <Card style={styles.incomeCard}>
          <Text style={styles.incomeLabel}>Monthly Income</Text>
          <View style={styles.incomeInputRow}>
            <Text style={styles.currencySymbol}>$</Text>
            <TextInput
              style={styles.incomeInput}
              value={monthlyIncome}
              onChangeText={setMonthlyIncome}
              keyboardType="numeric"
              placeholder="0"
            />
          </View>
          <View style={styles.incomeStats}>
            <View style={styles.incomeStat}>
              <Text style={styles.incomeStatValue}>
                ${totalAllocated.toLocaleString()}
              </Text>
              <Text style={styles.incomeStatLabel}>Allocated</Text>
            </View>
            <View style={styles.incomeStat}>
              <Text
                style={[
                  styles.incomeStatValue,
                  {
                    color:
                      remaining >= 0
                        ? theme.colors.success
                        : theme.colors.error,
                  },
                ]}
              >
                ${remaining.toLocaleString()}
              </Text>
              <Text style={styles.incomeStatLabel}>Remaining</Text>
            </View>
          </View>
        </Card>

        {/* Budget Chart */}
        <Card style={styles.chartCard}>
          <Text style={styles.sectionTitle}>Budget Allocation</Text>
          <BarChart data={chartData} height={180} showValues showLabels />
        </Card>

        {/* Budget Categories */}
        <Text style={styles.sectionTitle}>Categories</Text>
        {BUDGET_CATEGORIES.map((category) => {
          const percentage = Math.round(
            (category.spent / category.allocated) * 100,
          );
          const isOverBudget = category.spent > category.allocated;

          return (
            <TouchableOpacity
              key={category.id}
              onPress={() =>
                setSelectedCategory(
                  selectedCategory === category.id ? null : category.id,
                )
              }
              activeOpacity={0.7}
            >
              <Card style={styles.categoryCard}>
                <View style={styles.categoryHeader}>
                  <View
                    style={[
                      styles.categoryIcon,
                      { backgroundColor: category.color + "20" },
                    ]}
                  >
                    <Ionicons
                      name={category.icon as keyof typeof Ionicons.glyphMap}
                      size={20}
                      color={category.color}
                    />
                  </View>
                  <View style={styles.categoryInfo}>
                    <Text style={styles.categoryName}>{category.name}</Text>
                    <Text style={styles.categoryAmount}>
                      ${category.spent.toLocaleString()} / $
                      {category.allocated.toLocaleString()}
                    </Text>
                  </View>
                  <View style={styles.categoryRight}>
                    <Text
                      style={[
                        styles.categoryPercentage,
                        isOverBudget && styles.overBudget,
                      ]}
                    >
                      {percentage}%
                    </Text>
                    <Ionicons
                      name={
                        selectedCategory === category.id
                          ? "chevron-up"
                          : "chevron-down"
                      }
                      size={16}
                      color={theme.colors.textSecondary}
                    />
                  </View>
                </View>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${Math.min(percentage, 100)}%`,
                        backgroundColor: isOverBudget
                          ? theme.colors.error
                          : category.color,
                      },
                    ]}
                  />
                </View>

                {selectedCategory === category.id && (
                  <View style={styles.categoryDetails}>
                    <TouchableOpacity style={styles.adjustButton}>
                      <Ionicons
                        name="create-outline"
                        size={16}
                        color={theme.colors.primary}
                      />
                      <Text style={styles.adjustButtonText}>
                        Adjust Allocation
                      </Text>
                    </TouchableOpacity>
                    {category.id === "credit" && (
                      <Text style={styles.creditTip}>
                        Tip: Paying more than the minimum builds credit faster
                      </Text>
                    )}
                  </View>
                )}
              </Card>
            </TouchableOpacity>
          );
        })}

        {/* Credit Impact Tips */}
        <Text style={styles.sectionTitle}>Credit Building Tips</Text>
        {CREDIT_IMPACT_TIPS.map((tip, idx) => (
          <Card key={idx} style={styles.tipCard}>
            <View style={styles.tipRow}>
              <View
                style={[
                  styles.tipIcon,
                  {
                    backgroundColor:
                      tip.impact === "High" ? "#22C55E20" : "#F59E0B20",
                  },
                ]}
              >
                <Ionicons
                  name={tip.icon as keyof typeof Ionicons.glyphMap}
                  size={20}
                  color={tip.impact === "High" ? "#22C55E" : "#F59E0B"}
                />
              </View>
              <View style={styles.tipContent}>
                <View style={styles.tipHeader}>
                  <Text style={styles.tipTitle}>{tip.title}</Text>
                  <View
                    style={[
                      styles.impactBadge,
                      tip.impact === "High"
                        ? styles.highImpact
                        : styles.mediumImpact,
                    ]}
                  >
                    <Text style={styles.impactText}>{tip.impact} Impact</Text>
                  </View>
                </View>
                <Text style={styles.tipDescription}>{tip.description}</Text>
              </View>
            </View>
          </Card>
        ))}

        {/* CTA */}
        <TouchableOpacity
          style={styles.ctaButton}
          onPress={() => router.push("/financial/budget" as never)}
        >
          <Text style={styles.ctaButtonText}>Open Full Budget Planner</Text>
          <Ionicons name="arrow-forward" size={20} color="#fff" />
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
  incomeCard: { marginBottom: theme.spacing.lg },
  incomeLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  incomeInputRow: { flexDirection: "row", alignItems: "center" },
  currencySymbol: {
    fontSize: 28,
    fontWeight: "700",
    color: theme.colors.text,
    marginRight: 4,
  },
  incomeInput: {
    fontSize: 28,
    fontWeight: "700",
    color: theme.colors.text,
    flex: 1,
  },
  incomeStats: {
    flexDirection: "row",
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  incomeStat: { flex: 1 },
  incomeStatValue: {
    fontSize: 18,
    fontWeight: "600",
    color: theme.colors.text,
  },
  incomeStatLabel: { fontSize: 12, color: theme.colors.textSecondary },
  chartCard: { marginBottom: theme.spacing.lg },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  categoryCard: { marginBottom: theme.spacing.sm },
  categoryHeader: { flexDirection: "row", alignItems: "center" },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  categoryInfo: { flex: 1 },
  categoryName: { fontSize: 15, fontWeight: "600", color: theme.colors.text },
  categoryAmount: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  categoryRight: { alignItems: "flex-end" },
  categoryPercentage: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.colors.success,
  },
  overBudget: { color: theme.colors.error },
  progressBar: {
    height: 6,
    backgroundColor: theme.colors.border,
    borderRadius: 3,
    marginTop: 12,
    overflow: "hidden",
  },
  progressFill: { height: "100%", borderRadius: 3 },
  categoryDetails: {
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  adjustButton: { flexDirection: "row", alignItems: "center" },
  adjustButtonText: {
    fontSize: 14,
    color: theme.colors.primary,
    marginLeft: 6,
  },
  creditTip: {
    fontSize: 12,
    color: theme.colors.success,
    marginTop: 8,
    fontStyle: "italic",
  },
  tipCard: { marginBottom: theme.spacing.sm },
  tipRow: { flexDirection: "row" },
  tipIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  tipContent: { flex: 1 },
  tipHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  tipTitle: { fontSize: 15, fontWeight: "600", color: theme.colors.text },
  impactBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  highImpact: { backgroundColor: "#22C55E20" },
  mediumImpact: { backgroundColor: "#F59E0B20" },
  impactText: { fontSize: 11, fontWeight: "500" },
  tipDescription: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  ctaButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    padding: 16,
    marginTop: theme.spacing.md,
  },
  ctaButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
    marginRight: 8,
  },
});
