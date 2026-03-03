/**
 * Fynvita Financial Tab Screen
 * Financial overview with accounts, transactions, budgets
 */

import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../src/hooks/useTheme";
import { Card } from "../../src/components/Card";
import { useFinancialStore } from "../../src/store/financialStore";

export default function FinancialScreen() {
  const { colors, spacing, borderRadius, fontSize, fontWeight, withOpacity } =
    useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const { dashboard, accounts, fetchDashboard, fetchAccounts, isLoading } =
    useFinancialStore();

  useEffect(() => {
    fetchDashboard();
    fetchAccounts();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchDashboard(), fetchAccounts()]);
    setRefreshing(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const menuItems = [
    {
      icon: "wallet",
      title: "Accounts",
      subtitle: `${accounts.length} connected`,
      route: "/financial/accounts",
    },
    {
      icon: "swap-horizontal",
      title: "Transactions",
      subtitle: "View all transactions",
      route: "/financial/transactions",
    },
    {
      icon: "pie-chart",
      title: "Budgets",
      subtitle: "Track your spending",
      route: "/financial/budgets",
    },
    {
      icon: "flag",
      title: "Goals",
      subtitle: "Savings goals",
      route: "/financial/goals",
    },
    {
      icon: "trending-down",
      title: "Debt Payoff",
      subtitle: "Payoff calculator",
      route: "/financial/debt",
    },
    {
      icon: "calendar",
      title: "Bills",
      subtitle: "Upcoming payments",
      route: "/financial/bills",
    },
    {
      icon: "bar-chart",
      title: "Insights",
      subtitle: "Spending analysis",
      route: "/financial/insights",
    },
    {
      icon: "cash",
      title: "Cash Flow",
      subtitle: "Income vs expenses",
      route: "/financial/cashflow",
    },
    {
      icon: "receipt",
      title: "Tax Center",
      subtitle: "Tax optimization & filing",
      route: "/tax",
    },
    {
      icon: "school",
      title: "AI Coach",
      subtitle: "Personalized financial coaching",
      route: "/coach",
    },
    {
      icon: "school-outline",
      title: "Student Loans",
      subtitle: "Loan management & repayment",
      route: "/student-loans",
    },
  ];

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.background },
        scrollView: { flex: 1 },
        header: {
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          padding: spacing.lg,
        },
        title: { fontSize: 28, fontWeight: "700", color: colors.text },
        netWorthCard: {
          marginHorizontal: spacing.lg,
          marginBottom: spacing.lg,
          alignItems: "center",
          paddingVertical: spacing.xl,
        },
        netWorthLabel: {
          fontSize: 14,
          color: colors.textSecondary,
          marginBottom: 4,
        },
        netWorthValue: {
          fontSize: 36,
          fontWeight: "700",
          color: colors.text,
          marginBottom: spacing.lg,
        },
        netWorthBreakdown: { flexDirection: "row", alignItems: "center" },
        breakdownItem: { alignItems: "center", paddingHorizontal: spacing.lg },
        breakdownLabel: {
          fontSize: 12,
          color: colors.textSecondary,
          marginBottom: 4,
        },
        breakdownValue: { fontSize: 16, fontWeight: "600" },
        breakdownDivider: {
          width: 1,
          height: 30,
          backgroundColor: colors.border,
        },
        statsRow: {
          flexDirection: "row",
          paddingHorizontal: spacing.lg,
          marginBottom: spacing.lg,
        },
        statCard: {
          flex: 1,
          marginHorizontal: 4,
          alignItems: "center",
          paddingVertical: spacing.md,
        },
        statLabel: { fontSize: 12, color: colors.textSecondary, marginTop: 4 },
        statValue: {
          fontSize: 18,
          fontWeight: "600",
          color: colors.text,
          marginTop: 2,
        },
        menuSection: { paddingHorizontal: spacing.lg },
        menuItem: {
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: colors.surface,
          borderRadius: borderRadius.lg,
          padding: spacing.md,
          marginBottom: spacing.sm,
        },
        menuIcon: {
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: withOpacity(colors.primary, 0.08),
          justifyContent: "center",
          alignItems: "center",
          marginRight: spacing.md,
        },
        menuContent: { flex: 1 },
        menuTitle: { fontSize: 16, fontWeight: "600", color: colors.text },
        menuSubtitle: {
          fontSize: 13,
          color: colors.textSecondary,
          marginTop: 2,
        },
      }),
    [colors, spacing, borderRadius, withOpacity],
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Finances</Text>
          <TouchableOpacity onPress={() => router.push("/financial/accounts")}>
            <Ionicons
              name="add-circle-outline"
              size={24}
              color={colors.primary}
            />
          </TouchableOpacity>
        </View>

        {/* Net Worth Card */}
        <Card style={styles.netWorthCard}>
          <Text style={styles.netWorthLabel}>Net Worth</Text>
          <Text style={styles.netWorthValue}>
            {formatCurrency(dashboard?.netWorth || 0)}
          </Text>
          <View style={styles.netWorthBreakdown}>
            <View style={styles.breakdownItem}>
              <Text style={styles.breakdownLabel}>Assets</Text>
              <Text style={[styles.breakdownValue, { color: colors.success }]}>
                {formatCurrency(dashboard?.totalAssets || 0)}
              </Text>
            </View>
            <View style={styles.breakdownDivider} />
            <View style={styles.breakdownItem}>
              <Text style={styles.breakdownLabel}>Liabilities</Text>
              <Text style={[styles.breakdownValue, { color: colors.error }]}>
                {formatCurrency(dashboard?.totalLiabilities || 0)}
              </Text>
            </View>
          </View>
        </Card>

        {/* Quick Stats */}
        <View style={styles.statsRow}>
          <Card style={styles.statCard}>
            <Ionicons name="arrow-up-circle" size={24} color={colors.success} />
            <Text style={styles.statLabel}>Income</Text>
            <Text style={styles.statValue}>
              {formatCurrency(dashboard?.monthlyIncome || 0)}
            </Text>
          </Card>
          <Card style={styles.statCard}>
            <Ionicons name="arrow-down-circle" size={24} color={colors.error} />
            <Text style={styles.statLabel}>Expenses</Text>
            <Text style={styles.statValue}>
              {formatCurrency(dashboard?.monthlyExpenses || 0)}
            </Text>
          </Card>
        </View>

        {/* Menu Items */}
        <View style={styles.menuSection}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.menuItem}
              onPress={() => router.push(item.route as never)}
            >
              <View style={styles.menuIcon}>
                <Ionicons
                  name={item.icon as keyof typeof Ionicons.glyphMap}
                  size={24}
                  color={colors.primary}
                />
              </View>
              <View style={styles.menuContent}>
                <Text style={styles.menuTitle}>{item.title}</Text>
                <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
