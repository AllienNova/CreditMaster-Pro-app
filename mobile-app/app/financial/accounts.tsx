/**
 * Accounts — every linked account, with the same net worth the overview shows.
 *
 * WHAT THIS REPLACED. An ACCOUNTS fixture: Primary Checking at Chase with
 * $8,542.50, "2 min ago", status connected, and more. No request.
 *
 * IT CARRIED THE SAME SIGN BUG as financial/overview, which is why they are
 * being fixed together:
 *
 *     const totalAssets = ACCOUNTS.filter((a) => a.balance > 0)...
 *     const totalLiabilities = ACCOUNTS.filter((a) => a.balance < 0)...
 *
 * Plaid reports a credit or loan balance as POSITIVE — the amount owed — so
 * against a real payload every debt would be counted as an asset. Found by
 * sweeping for the pattern after fixing the overview; this was the third
 * occurrence, and the two screens link to each other, so they would have
 * disagreed in the same wrong direction.
 *
 * financialOverviewApi.getNetWorth classifies by accountType exactly as the
 * web dashboard does. Both screens now read it, so "See All" cannot lead to a
 * different number.
 *
 * STATUS AND AVAILABLE BALANCE ARE GONE. NetWorthAccount carries neither, and
 * a per-account "connected / needs attention" badge is a claim about a bank
 * connection that this payload cannot make. Connection state lives on
 * settings/connected-accounts, which reads the connections route built for it.
 */

import React, { useState, useEffect, useCallback } from "react";
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
import {
  financialOverviewApi,
  type NetWorthData,
} from "../../src/services/api/financial";

/**
 * Plaid's four account types, which is what NetWorthAccount carries — not the
 * five-name UI vocabulary the old fixture used. `checking` and `savings` were
 * in that list and are not Plaid types at all: depository covers both, and its
 * subtype tells them apart.
 */
const getTypeIcon = (
  type: NetWorthData["assets"][number]["accountType"],
): keyof typeof Ionicons.glyphMap => {
  const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
    depository: "wallet",
    credit: "card",
    investment: "trending-up",
    loan: "document-text",
  };
  return icons[type] ?? "wallet";
};

const getTypeColor = (
  type: NetWorthData["assets"][number]["accountType"],
): string => {
  const colors: Record<string, string> = {
    depository: "#3B82F6",
    credit: "#F59E0B",
    investment: "#8B5CF6",
    loan: "#EF4444",
  };
  return colors[type] ?? "#3B82F6";
};

export default function AccountsScreen() {
  const [filter, setFilter] = useState<string>("all");
  // The types NetWorthAccount can actually hold. "checking" and "savings"
  // were chips no real account could match.
  const filters = ["all", "depository", "credit", "investment", "loan"];

  const [data, setData] = useState<NetWorthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const res = await financialOverviewApi.getNetWorth();

    if (!res.success || !res.data) {
      setError("We could not load your accounts.");
      setLoading(false);
      return;
    }

    setData(res.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Classified by accountType, never by sign.
  const accounts = [
    ...(data?.assets ?? []).map((a) => ({ ...a, isLiability: false })),
    ...(data?.liabilities ?? []).map((a) => ({ ...a, isLiability: true })),
  ];

  const filteredAccounts =
    filter === "all"
      ? accounts
      : accounts.filter((a) => a.accountType === filter);

  const totalAssets = data?.totalAssets ?? 0;
  const totalLiabilities = data?.totalLiabilities ?? 0;
  const netWorth = data?.netWorth ?? 0;

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
          <Text style={styles.title}>Accounts</Text>
          <TouchableOpacity>
            <Ionicons
              name="add-circle-outline"
              size={24}
              color={theme.colors.primary}
            />
          </TouchableOpacity>
        </View>

        {/* Summary Card */}
        <Card style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Assets</Text>
              <Text style={[styles.summaryValue, { color: "#22C55E" }]}>
                ${totalAssets.toLocaleString()}
              </Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Liabilities</Text>
              <Text style={[styles.summaryValue, { color: "#EF4444" }]}>
                ${totalLiabilities.toLocaleString()}
              </Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Net Worth</Text>
              <Text
                style={[styles.summaryValue, { color: theme.colors.primary }]}
              >
                ${netWorth.toLocaleString()}
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
          {filters.map((f) => (
            <TouchableOpacity
              key={f}
              style={[
                styles.filterChip,
                filter === f && styles.filterChipActive,
              ]}
              onPress={() => setFilter(f)}
            >
              <Text
                style={[
                  styles.filterText,
                  filter === f && styles.filterTextActive,
                ]}
              >
                {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Accounts List */}
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
              No accounts linked yet. Link a bank from Settings to see them
              here.
            </Text>
          </Card>
        ) : filteredAccounts.length === 0 ? (
          <Card>
            <Text style={styles.emptyText}>No accounts of this type.</Text>
          </Card>
        ) : null}
        {filteredAccounts.map((account) => {
          const color = getTypeColor(account.accountType);
          return (
            <Card key={account.id} style={styles.accountCard}>
              <View style={styles.accountRow}>
                <View
                  style={[
                    styles.accountIcon,
                    { backgroundColor: `${color}15` },
                  ]}
                >
                  <Ionicons
                    name={getTypeIcon(account.accountType)}
                    size={22}
                    color={color}
                  />
                </View>
                <View style={styles.accountInfo}>
                  <View style={styles.accountHeader}>
                    <Text style={styles.accountName}>{account.name}</Text>
                    {/* No status dot. NetWorthAccount says nothing about the
                        health of the bank connection; that lives on
                        settings/connected-accounts, which reads the route
                        built for it. A green dot here would be a claim this
                        payload cannot make. */}
                  </View>
                  {account.subtype ? (
                    <Text style={styles.accountInstitution}>
                      {account.subtype}
                    </Text>
                  ) : null}
                </View>
                <View style={styles.accountValues}>
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
                    {/* value is the absolute amount; a liability is negated
                        here rather than read off a sign the payload does not
                        carry. */}
                    {account.isLiability ? "-" : ""}$
                    {account.value.toLocaleString()}
                  </Text>
                  {/* No "Available" line: the accounts payload has no
                      available balance, and the fixture's was invented. */}
                </View>
              </View>
            </Card>
          );
        })}

        {/* Add Account Button */}
        <TouchableOpacity style={styles.addButton}>
          <Ionicons name="add" size={24} color={theme.colors.primary} />
          <Text style={styles.addButtonText}>Link New Account</Text>
        </TouchableOpacity>

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
  summaryCard: { marginBottom: theme.spacing.lg },
  summaryRow: { flexDirection: "row", alignItems: "center" },
  summaryItem: { flex: 1, alignItems: "center" },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: theme.colors.border,
  },
  summaryLabel: { fontSize: 11, color: theme.colors.textSecondary },
  summaryValue: { fontSize: 16, fontWeight: "700", marginTop: 2 },
  filterScroll: { marginBottom: theme.spacing.md },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    marginRight: 8,
  },
  filterChipActive: { backgroundColor: theme.colors.primary },
  filterText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontWeight: "500",
  },
  filterTextActive: { color: "#fff" },
  accountCard: { marginBottom: theme.spacing.sm },
  accountRow: { flexDirection: "row", alignItems: "center" },
  accountIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  accountInfo: { flex: 1 },
  accountHeader: { flexDirection: "row", alignItems: "center" },
  accountName: { fontSize: 14, fontWeight: "600", color: theme.colors.text },
  statusDot: { width: 6, height: 6, borderRadius: 3, marginLeft: 6 },
  accountInstitution: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  accountUpdated: {
    fontSize: 10,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  accountValues: { alignItems: "flex-end" },
  accountBalance: { fontSize: 16, fontWeight: "600" },
  accountAvailable: {
    fontSize: 10,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  statusBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: theme.spacing.sm,
  },
  statusText: { fontSize: 12, fontWeight: "500", marginLeft: 6 },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    borderStyle: "dashed",
    borderRadius: 12,
    marginTop: theme.spacing.md,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.primary,
    marginLeft: 8,
  },
});
