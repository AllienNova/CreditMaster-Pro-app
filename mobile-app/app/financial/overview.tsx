/**
 * Financial Overview — the caller's real accounts, net worth and budgets.
 *
 * WHAT THIS REPLACED. An ACCOUNTS fixture (Primary Checking $4,250 at Chase,
 * a High-Yield Savings, and more) and a BUDGET_STATUS object ($2,450 of
 * $4,000 spent, Food & Dining 620/800, Shopping over budget at 450/400).
 * No request. BUDGET_STATUS is a constant OBJECT rather than an array, so
 * audit:screen-data could not see it until the detector was extended.
 *
 * AND THE NET WORTH WAS COMPUTED THE WRONG WAY. The old arithmetic split
 * accounts by balance SIGN — positive is an asset, negative a liability:
 *
 *     const assets = ACCOUNTS.filter((a) => a.balance > 0)...
 *
 * Plaid does not sign balances that way. A credit card or loan carries a
 * POSITIVE balance meaning the amount OWED, so every debt would have counted
 * as an asset and net worth would be overstated by the whole of it. The
 * fixture hid this by hand-signing its own numbers.
 *
 * financialOverviewApi.getNetWorth already classifies by accountType exactly
 * as the web dashboard does, and its docblock records this same conclusion.
 * The screen uses it rather than recomputing.
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { router, Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { lightTheme as theme } from "../../src/constants/theme";
import { Card } from "../../src/components/Card";
import {
  financialOverviewApi,
  budgetApi,
  type NetWorthData,
} from "../../src/services/api/financial";
import type { Budget } from "../../src/services/api/types";

export default function FinancialOverviewScreen() {
  const [netWorthData, setNetWorthData] = useState<NetWorthData | null>(null);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const [netWorthRes, budgetRes] = await Promise.all([
      financialOverviewApi.getNetWorth(),
      budgetApi.getAll(),
    ]);

    if (!netWorthRes.success || !netWorthRes.data) {
      // Not zeroes. A net worth of $0 and "we could not read your accounts"
      // are opposite statements about someone's finances.
      setError("We could not load your accounts.");
      setLoading(false);
      return;
    }

    setNetWorthData(netWorthRes.data);
    // Budgets are secondary: their failure leaves that card empty rather
    // than blanking the accounts the other request did return.
    setBudgets(
      budgetRes.success && Array.isArray(budgetRes.data?.budgets)
        ? budgetRes.data.budgets
        : [],
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Classified by accountType, not by balance sign. Plaid reports a credit or
  // loan balance as POSITIVE (the amount owed), so the old sign rule counted
  // every debt as an asset.
  const netWorth = netWorthData?.netWorth ?? 0;
  const assets = netWorthData?.totalAssets ?? 0;
  const liabilities = netWorthData?.totalLiabilities ?? 0;

  // One list for display: assets first, then liabilities, each already
  // carrying its real accountType and name.
  const accounts = [
    ...(netWorthData?.assets ?? []).map((a) => ({ ...a, isLiability: false })),
    ...(netWorthData?.liabilities ?? []).map((a) => ({
      ...a,
      isLiability: true,
    })),
  ];

  const budgetSpent = budgets.reduce((sum, b) => sum + (b.spent ?? 0), 0);
  const budgetTotal = budgets.reduce((sum, b) => sum + (b.limit ?? 0), 0);

  const getAccountIcon = (type: string) => {
    switch (type) {
      case "checking":
        return "wallet";
      case "savings":
        return "cash";
      case "credit":
        return "card";
      case "investment":
        return "trending-up";
      default:
        return "wallet";
    }
  };

  const formatCurrency = (amount: number) => {
    const prefix = amount < 0 ? "-" : "";
    return `${prefix}$${Math.abs(amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
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
          <Text style={styles.title}>Financial Overview</Text>
          <TouchableOpacity onPress={() => router.push("/financial/accounts")}>
            <Ionicons
              name="add-circle-outline"
              size={24}
              color={theme.colors.primary}
            />
          </TouchableOpacity>
        </View>

        {/* Net Worth Card */}
        <Card style={styles.netWorthCard}>
          <Text style={styles.netWorthLabel}>Net Worth</Text>
          <Text style={styles.netWorthValue}>{formatCurrency(netWorth)}</Text>
          <View style={styles.netWorthBreakdown}>
            <View style={styles.breakdownItem}>
              <Ionicons name="arrow-up-circle" size={16} color="#22C55E" />
              <Text style={styles.breakdownLabel}>Assets</Text>
              <Text style={[styles.breakdownValue, { color: "#22C55E" }]}>
                {formatCurrency(assets)}
              </Text>
            </View>
            <View style={styles.breakdownDivider} />
            <View style={styles.breakdownItem}>
              <Ionicons name="arrow-down-circle" size={16} color="#EF4444" />
              <Text style={styles.breakdownLabel}>Liabilities</Text>
              <Text style={[styles.breakdownValue, { color: "#EF4444" }]}>
                {formatCurrency(liabilities)}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.viewMoreButton}
            onPress={() => router.push("/financial/net-worth")}
          >
            <Text style={styles.viewMoreText}>View Details</Text>
            <Ionicons
              name="chevron-forward"
              size={16}
              color={theme.colors.primary}
            />
          </TouchableOpacity>
        </Card>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => router.push("/financial/transactions")}
          >
            <View
              style={[styles.quickActionIcon, { backgroundColor: "#DBEAFE" }]}
            >
              <Ionicons name="swap-horizontal" size={20} color="#3B82F6" />
            </View>
            <Text style={styles.quickActionText}>Transactions</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => router.push("/financial/budgets")}
          >
            <View
              style={[styles.quickActionIcon, { backgroundColor: "#DCFCE7" }]}
            >
              <Ionicons name="pie-chart" size={20} color="#22C55E" />
            </View>
            <Text style={styles.quickActionText}>Budgets</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => router.push("/financial/goals")}
          >
            <View
              style={[styles.quickActionIcon, { backgroundColor: "#FEF3C7" }]}
            >
              <Ionicons name="flag" size={20} color="#F59E0B" />
            </View>
            <Text style={styles.quickActionText}>Goals</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => router.push("/financial/debt")}
          >
            <View
              style={[styles.quickActionIcon, { backgroundColor: "#FEE2E2" }]}
            >
              <Ionicons name="calculator" size={20} color="#EF4444" />
            </View>
            <Text style={styles.quickActionText}>Debt</Text>
          </TouchableOpacity>
        </View>

        {/* Accounts */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Accounts</Text>
          <TouchableOpacity onPress={() => router.push("/financial/accounts")}>
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        </View>
        {loading ? (
          <Card>
            <Text style={styles.emptyText}>Loading your accounts…</Text>
          </Card>
        ) : error ? (
          <Card>
            <Text style={styles.emptyText}>{error}</Text>
            <TouchableOpacity onPress={load}>
              <Text style={styles.retryText}>Try again</Text>
            </TouchableOpacity>
          </Card>
        ) : accounts.length === 0 ? (
          <Card>
            <Text style={styles.emptyText}>
              No accounts linked yet. Link a bank to see your net worth here.
            </Text>
          </Card>
        ) : null}
        {accounts.map((account) => (
          <TouchableOpacity
            key={account.id}
            onPress={() =>
              router.push(`/financial/account-detail?id=${account.id}` as Href)
            }
          >
            <Card style={styles.accountCard}>
              <View style={styles.accountRow}>
                <View
                  style={[
                    styles.accountIcon,
                    {
                      // By classification, not by sign: a credit balance is
                      // positive and still a debt.
                      backgroundColor: account.isLiability
                        ? "#FEE2E2"
                        : "#DCFCE7",
                    },
                  ]}
                >
                  <Ionicons
                    name={
                      getAccountIcon(
                        account.accountType,
                      ) as keyof typeof Ionicons.glyphMap
                    }
                    size={20}
                    color={account.isLiability ? "#EF4444" : "#22C55E"}
                  />
                </View>
                <View style={styles.accountInfo}>
                  <Text style={styles.accountName}>{account.name}</Text>
                  {/* The subtype, which the accounts payload does carry.
                      The fixture showed an institution and a "2 min ago"
                      freshness stamp; neither is in NetWorthAccount, and a
                      sync time nobody measured is the kind of detail that
                      makes invented data convincing. */}
                  {account.subtype ? (
                    <Text style={styles.accountInstitution}>
                      {account.subtype}
                    </Text>
                  ) : null}
                </View>
                <Text
                  style={[
                    styles.accountBalance,
                    {
                      color: account.isLiability
                        ? "#EF4444"
                        : theme.colors.text,
                    },
                  ]}
                >
                  {/* NetWorthAccount.value is already the absolute amount for
                      a liability, so the minus sign is applied here rather
                      than assumed from the stored sign. */}
                  {formatCurrency(
                    account.isLiability ? -account.value : account.value,
                  )}
                </Text>
              </View>
            </Card>
          </TouchableOpacity>
        ))}

        {/* Budget Status */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Budget Status</Text>
          <TouchableOpacity onPress={() => router.push("/financial/budgets")}>
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        </View>
        <Card style={styles.budgetCard}>
          <View style={styles.budgetOverview}>
            <Text style={styles.budgetSpent}>
              ${Math.round(budgetSpent)}{" "}
              <Text style={styles.budgetTotal}>
                / ${Math.round(budgetTotal)}
              </Text>
            </Text>
            {/* No percentage when nothing is budgeted: spent/0 is Infinity,
                and the fixture's denominator was always 4000. */}
            {budgetTotal > 0 ? (
              <Text style={styles.budgetPercent}>
                {Math.round((budgetSpent / budgetTotal) * 100)}% used
              </Text>
            ) : null}
          </View>
          <View style={styles.budgetProgressContainer}>
            <View
              style={[
                styles.budgetProgress,
                {
                  width: `${budgetTotal > 0 ? Math.min(100, (budgetSpent / budgetTotal) * 100) : 0}%`,
                },
              ]}
            />
          </View>
          {budgets.length === 0 ? (
            <Text style={styles.emptyText}>
              {loading ? "Loading your budgets…" : "No budgets set yet."}
            </Text>
          ) : (
            budgets.map((budget, idx) => (
              <View
                key={budget.id}
                style={[
                  styles.categoryRow,
                  idx < budgets.length - 1 && styles.categoryRowBorder,
                ]}
              >
                <Text style={styles.categoryName}>{budget.category}</Text>
                <Text
                  style={[
                    styles.categoryAmount,
                    {
                      color:
                        budget.spent > budget.limit ? "#EF4444" : "#22C55E",
                    },
                  ]}
                >
                  ${Math.round(budget.spent)} / ${Math.round(budget.limit)}
                </Text>
              </View>
            ))
          )}
        </Card>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  emptyText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: "center",
    paddingVertical: theme.spacing.md,
  },
  retryText: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.primary,
    textAlign: "center",
    marginTop: theme.spacing.sm,
  },
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
  netWorthCard: {
    marginBottom: theme.spacing.lg,
    backgroundColor: theme.colors.primary,
  },
  netWorthLabel: { fontSize: 14, color: "rgba(255,255,255,0.8)" },
  netWorthValue: {
    fontSize: 36,
    fontWeight: "700",
    color: "#fff",
    marginTop: 4,
  },
  netWorthBreakdown: {
    flexDirection: "row",
    marginTop: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.2)",
  },
  breakdownItem: { flex: 1, alignItems: "center" },
  breakdownDivider: { width: 1, backgroundColor: "rgba(255,255,255,0.2)" },
  breakdownLabel: {
    fontSize: 11,
    color: "rgba(255,255,255,0.7)",
    marginTop: 4,
  },
  breakdownValue: { fontSize: 16, fontWeight: "600", marginTop: 2 },
  viewMoreButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.2)",
  },
  viewMoreText: {
    fontSize: 13,
    color: "#fff",
    fontWeight: "500",
    marginRight: 4,
  },
  quickActions: { flexDirection: "row", marginBottom: theme.spacing.lg },
  quickAction: { flex: 1, alignItems: "center" },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },
  quickActionText: {
    fontSize: 11,
    color: theme.colors.text,
    fontWeight: "500",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: theme.spacing.md,
  },
  sectionTitle: { fontSize: 18, fontWeight: "600", color: theme.colors.text },
  seeAllText: { fontSize: 13, color: theme.colors.primary, fontWeight: "500" },
  accountCard: { marginBottom: theme.spacing.sm },
  accountRow: { flexDirection: "row", alignItems: "center" },
  accountIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  accountInfo: { flex: 1 },
  accountName: { fontSize: 14, fontWeight: "600", color: theme.colors.text },
  accountInstitution: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  accountBalance: { fontSize: 16, fontWeight: "600" },
  budgetCard: { marginBottom: theme.spacing.lg },
  budgetOverview: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
  },
  budgetSpent: { fontSize: 24, fontWeight: "700", color: theme.colors.text },
  budgetTotal: {
    fontSize: 16,
    fontWeight: "400",
    color: theme.colors.textSecondary,
  },
  budgetPercent: { fontSize: 13, color: theme.colors.textSecondary },
  budgetProgressContainer: {
    height: 8,
    backgroundColor: theme.colors.border,
    borderRadius: 4,
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  budgetProgress: {
    height: "100%",
    backgroundColor: theme.colors.primary,
    borderRadius: 4,
  },
  categoryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: theme.spacing.sm,
  },
  categoryRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  categoryName: { fontSize: 13, color: theme.colors.text },
  categoryAmount: { fontSize: 13, fontWeight: "600" },
});
