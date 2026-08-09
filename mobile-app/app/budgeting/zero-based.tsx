import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { lightTheme as theme } from "../../src/constants/theme";
import { Card } from "../../src/components/Card";

interface BudgetCategory {
  id: string;
  name: string;
  allocated: number;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

const MONTHLY_INCOME = 5000;

const MOCK_CATEGORIES: BudgetCategory[] = [
  {
    id: "1",
    name: "Housing",
    allocated: 1500,
    icon: "home-outline",
    color: "#3B82F6",
  },
  {
    id: "2",
    name: "Food & Groceries",
    allocated: 600,
    icon: "restaurant-outline",
    color: "#22C55E",
  },
  {
    id: "3",
    name: "Transportation",
    allocated: 400,
    icon: "car-outline",
    color: "#F59E0B",
  },
  {
    id: "4",
    name: "Utilities",
    allocated: 250,
    icon: "flash-outline",
    color: "#8B5CF6",
  },
  {
    id: "5",
    name: "Insurance",
    allocated: 350,
    icon: "shield-checkmark-outline",
    color: "#EF4444",
  },
  {
    id: "6",
    name: "Savings",
    allocated: 750,
    icon: "wallet-outline",
    color: "#10B981",
  },
  {
    id: "7",
    name: "Entertainment",
    allocated: 200,
    icon: "game-controller-outline",
    color: "#EC4899",
  },
  {
    id: "8",
    name: "Personal Care",
    allocated: 150,
    icon: "heart-outline",
    color: "#06B6D4",
  },
  {
    id: "9",
    name: "Debt Payments",
    allocated: 500,
    icon: "card-outline",
    color: "#F97316",
  },
  {
    id: "10",
    name: "Miscellaneous",
    allocated: 300,
    icon: "ellipsis-horizontal-outline",
    color: "#6B7280",
  },
];

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
};

export default function ZeroBasedBudgetScreen() {
  const [categories] = useState<BudgetCategory[]>(MOCK_CATEGORIES);

  const totalAllocated = categories.reduce((sum, cat) => sum + cat.allocated, 0);
  const remaining = MONTHLY_INCOME - totalAllocated;
  const allocationPercent = Math.min((totalAllocated / MONTHLY_INCOME) * 100, 100);

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
          <Text style={styles.headerTitle}>Zero-Based Budget</Text>
          <TouchableOpacity style={styles.editButton}>
            <Ionicons
              name="create-outline"
              size={24}
              color={theme.colors.primary}
            />
          </TouchableOpacity>
        </View>

        {/* Tagline */}
        <View style={styles.taglineContainer}>
          <Ionicons
            name="bulb-outline"
            size={18}
            color={theme.colors.primary}
          />
          <Text style={styles.taglineText}>
            Every dollar has a job
          </Text>
        </View>

        {/* Income Summary Card */}
        <Card style={styles.incomeCard}>
          <Text style={styles.incomeLabel}>Monthly Income</Text>
          <Text style={styles.incomeAmount}>
            {formatCurrency(MONTHLY_INCOME)}
          </Text>

          {/* Allocation Progress */}
          <View style={styles.progressSection}>
            <View style={styles.progressLabelRow}>
              <Text style={styles.progressLabel}>Allocated</Text>
              <Text style={styles.progressValue}>
                {formatCurrency(totalAllocated)} of {formatCurrency(MONTHLY_INCOME)}
              </Text>
            </View>
            <View style={styles.progressBarBackground}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width: `${allocationPercent}%`,
                    backgroundColor:
                      remaining === 0
                        ? theme.colors.success
                        : remaining < 0
                          ? theme.colors.error
                          : theme.colors.primary,
                  },
                ]}
              />
            </View>
          </View>

          {/* Remaining */}
          <View style={styles.remainingRow}>
            <Text style={styles.remainingLabel}>
              {remaining >= 0 ? "Remaining to Assign" : "Over Budget"}
            </Text>
            <Text
              style={[
                styles.remainingAmount,
                {
                  color:
                    remaining === 0
                      ? theme.colors.success
                      : remaining < 0
                        ? theme.colors.error
                        : theme.colors.primary,
                },
              ]}
            >
              {formatCurrency(Math.abs(remaining))}
            </Text>
          </View>

          {remaining === 0 && (
            <View style={styles.successBanner}>
              <Ionicons
                name="checkmark-circle"
                size={18}
                color={theme.colors.success}
              />
              <Text style={styles.successText}>
                Budget fully allocated!
              </Text>
            </View>
          )}
        </Card>

        {/* Category Allocations */}
        <Text style={styles.sectionTitle}>Category Allocations</Text>
        {categories.map((cat) => {
          const percentValue = (cat.allocated / MONTHLY_INCOME) * 100;
          const percent = percentValue.toFixed(1);
          return (
            <TouchableOpacity key={cat.id} activeOpacity={0.7}>
              <Card style={styles.categoryCard}>
                <View style={styles.categoryRow}>
                  <View
                    style={[
                      styles.categoryIconContainer,
                      { backgroundColor: cat.color + "20" },
                    ]}
                  >
                    <Ionicons
                      name={cat.icon}
                      size={22}
                      color={cat.color}
                    />
                  </View>
                  <View style={styles.categoryContent}>
                    <Text style={styles.categoryName}>{cat.name}</Text>
                    <View style={styles.categoryBarBackground}>
                      <View
                        style={[
                          styles.categoryBarFill,
                          {
                            width: `${percentValue}%`,
                            backgroundColor: cat.color,
                          },
                        ]}
                      />
                    </View>
                  </View>
                  <View style={styles.categoryRight}>
                    <Text style={styles.categoryAmount}>
                      {formatCurrency(cat.allocated)}
                    </Text>
                    <Text style={styles.categoryPercent}>{percent}%</Text>
                  </View>
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
    marginBottom: theme.spacing.sm,
  },
  backButton: {
    padding: theme.spacing.sm,
  },
  headerTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
  },
  editButton: {
    padding: theme.spacing.sm,
  },
  taglineContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: theme.spacing.lg,
    gap: theme.spacing.xs,
  },
  taglineText: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.primary,
    fontStyle: "italic",
  },
  incomeCard: {
    marginBottom: theme.spacing.lg,
  },
  incomeLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  incomeAmount: {
    fontSize: theme.fontSize.xxxl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  progressSection: {
    marginBottom: theme.spacing.md,
  },
  progressLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: theme.spacing.xs,
  },
  progressLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  progressValue: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.text,
  },
  progressBarBackground: {
    height: 10,
    backgroundColor: theme.colors.borderLight,
    borderRadius: theme.borderRadius.full,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: theme.borderRadius.full,
  },
  remainingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  remainingLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  remainingAmount: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
  },
  successBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: "#DCFCE7",
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.xs,
  },
  successText: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.medium,
    color: "#22C55E",
  },
  sectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  categoryCard: {
    marginBottom: theme.spacing.sm,
  },
  categoryRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  categoryIconContainer: {
    width: 44,
    height: 44,
    borderRadius: theme.borderRadius.lg,
    justifyContent: "center",
    alignItems: "center",
  },
  categoryContent: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  categoryName: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  categoryBarBackground: {
    height: 6,
    backgroundColor: theme.colors.borderLight,
    borderRadius: theme.borderRadius.full,
    overflow: "hidden",
  },
  categoryBarFill: {
    height: "100%",
    borderRadius: theme.borderRadius.full,
  },
  categoryRight: {
    alignItems: "flex-end",
    marginLeft: theme.spacing.sm,
  },
  categoryAmount: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
  },
  categoryPercent: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  bottomSpacer: {
    height: theme.spacing.xxl,
  },
});
