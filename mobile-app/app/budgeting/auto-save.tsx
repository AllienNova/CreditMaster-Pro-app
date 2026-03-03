import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { lightTheme as theme } from "../../src/constants/theme";
import { Card } from "../../src/components/Card";

type RuleType = "round-up" | "percentage" | "fixed";
type RuleStatus = "active" | "paused";

interface SaveRule {
  id: string;
  name: string;
  description: string;
  type: RuleType;
  amount: number;
  frequency: string;
  status: RuleStatus;
  icon: keyof typeof Ionicons.glyphMap;
  monthlySavings: number;
}

const RULE_TYPE_LABELS: Record<RuleType, { label: string; color: string; bg: string }> = {
  "round-up": { label: "Round-Up", color: "#8B5CF6", bg: "#EDE9FE" },
  percentage: { label: "Percentage", color: "#3B82F6", bg: "#DBEAFE" },
  fixed: { label: "Fixed", color: "#22C55E", bg: "#DCFCE7" },
};

const MOCK_RULES: SaveRule[] = [
  {
    id: "1",
    name: "Purchase Round-Up",
    description: "Round up every purchase to the nearest dollar",
    type: "round-up",
    amount: 1,
    frequency: "Per transaction",
    status: "active",
    icon: "trending-up-outline",
    monthlySavings: 45,
  },
  {
    id: "2",
    name: "Paycheck Percentage",
    description: "Save 10% of every paycheck automatically",
    type: "percentage",
    amount: 10,
    frequency: "Bi-weekly",
    status: "active",
    icon: "cash-outline",
    monthlySavings: 500,
  },
  {
    id: "3",
    name: "Weekly Fixed Save",
    description: "Transfer $50 every Monday to savings",
    type: "fixed",
    amount: 50,
    frequency: "Weekly",
    status: "active",
    icon: "calendar-outline",
    monthlySavings: 200,
  },
  {
    id: "4",
    name: "Spare Change Double",
    description: "Double the round-up on weekends",
    type: "round-up",
    amount: 2,
    frequency: "Weekends",
    status: "paused",
    icon: "swap-horizontal-outline",
    monthlySavings: 0,
  },
  {
    id: "5",
    name: "Monthly Emergency Fund",
    description: "Fixed $200 transfer on the 1st of each month",
    type: "fixed",
    amount: 200,
    frequency: "Monthly",
    status: "active",
    icon: "shield-outline",
    monthlySavings: 200,
  },
  {
    id: "6",
    name: "Bonus Percentage",
    description: "Save 25% of any bonus or extra income",
    type: "percentage",
    amount: 25,
    frequency: "On deposit",
    status: "paused",
    icon: "gift-outline",
    monthlySavings: 0,
  },
];

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
};

export default function AutoSaveScreen() {
  const [rules, setRules] = useState<SaveRule[]>(MOCK_RULES);

  const activeRules = rules.filter((r) => r.status === "active");
  const totalMonthlySavings = rules.reduce((sum, r) => sum + r.monthlySavings, 0);
  const totalAnnualSavings = totalMonthlySavings * 12;

  const toggleRule = (ruleId: string) => {
    setRules((prev) =>
      prev.map((r) =>
        r.id === ruleId
          ? {
              ...r,
              status: r.status === "active" ? "paused" : "active",
              monthlySavings:
                r.status === "active"
                  ? 0
                  : MOCK_RULES.find((m) => m.id === ruleId)?.monthlySavings ?? 0,
            }
          : r,
      ),
    );
  };

  const formatAmount = (rule: SaveRule): string => {
    switch (rule.type) {
      case "round-up":
        return `${rule.amount}x round-up`;
      case "percentage":
        return `${rule.amount}%`;
      case "fixed":
        return formatCurrency(rule.amount);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons
              name="arrow-back"
              size={24}
              color={theme.colors.text}
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Auto-Save Rules</Text>
          <TouchableOpacity style={styles.addButton}>
            <Ionicons name="add" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Summary Card */}
        <Card style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Monthly Savings</Text>
              <Text style={[styles.summaryAmount, { color: theme.colors.success }]}>
                {formatCurrency(totalMonthlySavings)}
              </Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Annual Savings</Text>
              <Text style={[styles.summaryAmount, { color: theme.colors.success }]}>
                {formatCurrency(totalAnnualSavings)}
              </Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Active Rules</Text>
              <Text style={styles.summaryAmount}>
                {activeRules.length}/{rules.length}
              </Text>
            </View>
          </View>
        </Card>

        {/* Rules List */}
        <Text style={styles.sectionTitle}>Your Rules</Text>
        {rules.map((rule) => {
          const typeConfig = RULE_TYPE_LABELS[rule.type];
          return (
            <TouchableOpacity key={rule.id} activeOpacity={0.7}>
              <Card style={styles.ruleCard}>
                <View style={styles.ruleTopRow}>
                  <View style={styles.ruleIconContainer}>
                    <Ionicons
                      name={rule.icon}
                      size={22}
                      color={
                        rule.status === "active"
                          ? theme.colors.primary
                          : theme.colors.textMuted
                      }
                    />
                  </View>
                  <View style={styles.ruleContent}>
                    <Text
                      style={[
                        styles.ruleName,
                        rule.status === "paused" && styles.ruleNamePaused,
                      ]}
                    >
                      {rule.name}
                    </Text>
                    <Text style={styles.ruleDescription}>
                      {rule.description}
                    </Text>
                  </View>
                  <Switch
                    value={rule.status === "active"}
                    onValueChange={() => toggleRule(rule.id)}
                    trackColor={{
                      false: theme.colors.borderLight,
                      true: theme.colors.primary + "60",
                    }}
                    thumbColor={
                      rule.status === "active"
                        ? theme.colors.primary
                        : theme.colors.textMuted
                    }
                  />
                </View>

                <View style={styles.ruleDetails}>
                  <View
                    style={[
                      styles.typeBadge,
                      { backgroundColor: typeConfig.bg },
                    ]}
                  >
                    <Text
                      style={[styles.typeBadgeText, { color: typeConfig.color }]}
                    >
                      {typeConfig.label}
                    </Text>
                  </View>
                  <Text style={styles.ruleDetailText}>
                    {formatAmount(rule)}
                  </Text>
                  <Text style={styles.ruleDetailDot}>&middot;</Text>
                  <Text style={styles.ruleDetailText}>{rule.frequency}</Text>
                  {rule.status === "active" && (
                    <>
                      <Text style={styles.ruleDetailDot}>&middot;</Text>
                      <Text style={[styles.ruleDetailText, { color: theme.colors.success }]}>
                        {formatCurrency(rule.monthlySavings)}/mo
                      </Text>
                    </>
                  )}
                </View>
              </Card>
            </TouchableOpacity>
          );
        })}

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    flex: 1,
    padding: theme.spacing.md,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: theme.spacing.lg,
  },
  backButton: {
    padding: theme.spacing.sm,
  },
  headerTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
  },
  addButton: {
    padding: theme.spacing.sm,
  },
  summaryCard: {
    marginBottom: theme.spacing.lg,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryItem: {
    flex: 1,
    alignItems: "center",
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: theme.colors.border,
  },
  summaryLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  summaryAmount: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
  },
  sectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  ruleCard: {
    marginBottom: theme.spacing.sm,
  },
  ruleTopRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  ruleIconContainer: {
    width: 44,
    height: 44,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.backgroundSecondary,
    justifyContent: "center",
    alignItems: "center",
  },
  ruleContent: {
    flex: 1,
    marginLeft: theme.spacing.md,
    marginRight: theme.spacing.sm,
  },
  ruleName: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
  },
  ruleNamePaused: {
    color: theme.colors.textMuted,
  },
  ruleDescription: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  ruleDetails: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
    flexWrap: "wrap",
    gap: theme.spacing.xs,
  },
  typeBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.full,
  },
  typeBadgeText: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.medium,
  },
  ruleDetailText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  ruleDetailDot: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
  },
  bottomSpacer: {
    height: theme.spacing.xxl,
  },
});
