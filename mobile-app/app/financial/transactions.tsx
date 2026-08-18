/**
 * Fynvita Transactions Screen
 * Transaction list, category filters, spending charts
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { lightTheme as theme } from "../../src/constants/theme";
import { Card } from "../../src/components/Card";
import { transactionApi } from "../../src/services/api/financial";

/*
 * A local `Transaction` interface, a TRANSACTIONS array and a
 * SPENDING_BY_CATEGORY breakdown lived here.
 *
 * They invented the user's spending — Amazon -89.99, Shopping 168.31 at 28% of
 * the total — and the local type disagreed with the server's on two field
 * names (`name` vs `merchantName`, `account` vs `accountId`), which is part of
 * why the fabrication survived: nothing could typecheck the screen against
 * what the route returns.
 *
 * Both now come from GET /api/financial/transactions. The category breakdown
 * is COMPUTED FROM THE SAME TRANSACTIONS rather than fetched separately, so
 * the chart and the list cannot disagree — the two used to be independent
 * constants and their percentages did not add up.
 */

/** The view-model this screen renders, mapped from the server's Transaction. */
interface TransactionRow {
  id: string;
  name: string;
  amount: number;
  category: string;
  date: string;
  pending: boolean;
}

interface CategorySpend {
  category: string;
  amount: number;
  percent: number;
  color: string;
}

const CATEGORY_COLORS = [
  "#8B5CF6",
  "#22C55E",
  "#3B82F6",
  "#F59E0B",
  "#EF4444",
  "#14B8A6",
];

/**
 * "2026-08-17T..." -> "17 Aug", in UTC.
 *
 * The fixture used "Today" / "Yesterday", which no payload carries. timeZone
 * matters for the same reason it did on the credit-score chart: without it a
 * transaction dated 00:00Z lands on the previous day for every user west of
 * UTC.
 */
const formatDate = (iso: string): string => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleDateString("en-US", {
        day: "numeric",
        month: "short",
        timeZone: "UTC",
      });
};

/**
 * Spending by category, from the caller's own expense rows.
 *
 * Only expenses: including income would make "28% of spending" a share of a
 * number that is not spending. Percentages are of the expense total, so they
 * sum to 100 by construction — the fixture's did not.
 */
function spendByCategory(rows: TransactionRow[]): CategorySpend[] {
  const expenses = rows.filter((r) => r.amount < 0);
  const total = expenses.reduce((sum, r) => sum + Math.abs(r.amount), 0);

  // No `if (total === 0) return []` here, deliberately. Every expense has
  // amount < 0, so |amount| > 0 for each — which makes total === 0 possible
  // only when `expenses` is empty, and an empty list already produces an
  // empty result. Mutation testing proved it: removing that guard changed no
  // test, because nothing could reach it. A guard that cannot fire is a
  // comment that lies.
  const byCategory = new Map<string, number>();
  for (const r of expenses) {
    byCategory.set(
      r.category,
      (byCategory.get(r.category) ?? 0) + Math.abs(r.amount),
    );
  }

  return [...byCategory.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([category, amount], i) => ({
      category,
      amount,
      percent: Math.round((amount / total) * 100),
      color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
    }));
}



export default function TransactionsScreen() {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [rows, setRows] = useState<TransactionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const res = await transactionApi.getAll({ limit: 100 });
    if (!res.success || !res.data) {
      setError("We could not load your transactions.");
      setLoading(false);
      return;
    }
    setRows(
      res.data.items.map((t) => ({
        id: t.id,
        // `merchantName`, not `name` — the local type had it wrong.
        name: t.merchantName,
        amount: t.amount,
        category: t.category,
        date: formatDate(t.date),
        pending: t.pending,
      })),
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const spending = spendByCategory(rows);

  /**
   * Filter chips from the caller's OWN categories, not a fixed list. A chip
   * for a category they have never spent in filters to an empty screen and
   * looks broken.
   */
  const categories = ["All", ...new Set(rows.map((r) => r.category))];

  const filteredTransactions = rows.filter((t) => {
    const matchesCategory =
      selectedCategory === "All" || t.category === selectedCategory;
    const matchesSearch = t.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "Income":
        return "cash";
      case "Shopping":
        return "bag";
      case "Groceries":
        return "cart";
      case "Food & Dining":
        return "restaurant";
      case "Transportation":
        return "car";
      case "Entertainment":
        return "film";
      default:
        return "card";
    }
  };

  const formatCurrency = (amount: number) => {
    const prefix = amount < 0 ? "-" : "+";
    return `${prefix}$${Math.abs(amount).toFixed(2)}`;
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
          <Text style={styles.title}>Transactions</Text>
          <TouchableOpacity>
            <Ionicons name="filter" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={styles.searchContainer}>
          <Ionicons
            name="search"
            size={20}
            color={theme.colors.textSecondary}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search transactions..."
            placeholderTextColor={theme.colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Spending Chart */}
        <Card style={styles.chartCard}>
          <Text style={styles.chartTitle}>Spending This Month</Text>
          <View style={styles.chartContainer}>
            {spending.map((item) => (
              <View key={item.category} style={styles.chartItem}>
                <View
                  testID={`spend-bar-${item.category}`}
                  style={[
                    styles.chartBar,
                    { height: item.percent * 2, backgroundColor: item.color },
                  ]}
                />
                <Text style={styles.chartLabel}>
                  {item.category.split(" ")[0]}
                </Text>
              </View>
            ))}
          </View>
          <View style={styles.chartLegend}>
            {spending.slice(0, 3).map((item) => (
              <View key={item.category} style={styles.legendItem}>
                <View
                  style={[styles.legendDot, { backgroundColor: item.color }]}
                />
                <Text style={styles.legendText}>${item.amount}</Text>
              </View>
            ))}
          </View>
        </Card>

        {/* Category Filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
        >
          {categories.map((category) => (
            <TouchableOpacity
              key={category}
              testID={`filter-chip-${category}`}
              style={[
                styles.filterChip,
                selectedCategory === category && styles.filterChipActive,
              ]}
              onPress={() => setSelectedCategory(category)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  selectedCategory === category && styles.filterChipTextActive,
                ]}
              >
                {category}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Transactions List */}
        <Text style={styles.sectionTitle}>
          {filteredTransactions.length} Transactions
        </Text>
        {loading ? (
          <View style={styles.stateBlock} testID="transactions-loading">
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        ) : null}

        {error ? (
          // A failed read and an empty ledger are different statements about
          // someone's money.
          <View style={styles.stateBlock}>
            <Text style={styles.stateText}>{error}</Text>
            <TouchableOpacity onPress={load}>
              <Text style={styles.retryText}>Try again</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {!loading && !error && filteredTransactions.length === 0 ? (
          <View style={styles.stateBlock}>
            <Text style={styles.stateText}>
              {rows.length === 0
                ? "No transactions yet. Link an account to see your spending."
                : "No transactions match this filter."}
            </Text>
          </View>
        ) : null}

        {filteredTransactions.map((transaction) => (
          <Card key={transaction.id} style={styles.transactionCard}>
            <View style={styles.transactionRow}>
              <View
                style={[
                  styles.transactionIcon,
                  {
                    backgroundColor:
                      transaction.amount > 0 ? "#DCFCE7" : "#F3F4F6",
                  },
                ]}
              >
                <Ionicons
                  name={
                    getCategoryIcon(
                      transaction.category,
                    ) as keyof typeof Ionicons.glyphMap
                  }
                  size={20}
                  color={
                    transaction.amount > 0
                      ? "#22C55E"
                      : theme.colors.textSecondary
                  }
                />
              </View>
              <View style={styles.transactionInfo}>
                <View style={styles.transactionNameRow}>
                  <Text style={styles.transactionName}>{transaction.name}</Text>
                  {transaction.pending && (
                    <View style={styles.pendingBadge}>
                      <Text style={styles.pendingText}>PENDING</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.transactionMeta}>
                  {/* The fixture showed an account NAME here. The server
                      sends `accountId`, a uuid, and joining it to a name is a
                      second read this screen does not make — so the category
                      stands alone rather than printing an identifier. */}
                  {transaction.category}
                </Text>
              </View>
              <View style={styles.transactionAmountContainer}>
                <Text
                  style={[
                    styles.transactionAmount,
                    {
                      color:
                        transaction.amount > 0 ? "#22C55E" : theme.colors.text,
                    },
                  ]}
                >
                  {formatCurrency(transaction.amount)}
                </Text>
                <Text style={styles.transactionDate}>{transaction.date}</Text>
              </View>
            </View>
          </Card>
        ))}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  stateBlock: { paddingVertical: 40, alignItems: "center" },
  stateText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: "center",
    paddingHorizontal: 24,
  },
  retryText: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: "600",
    marginTop: 8,
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
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: theme.spacing.lg,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.text,
    marginLeft: 8,
  },
  chartCard: { marginBottom: theme.spacing.lg },
  chartTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  chartContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "flex-end",
    height: 80,
  },
  chartItem: { alignItems: "center" },
  chartBar: { width: 24, borderRadius: 4, marginBottom: 4 },
  chartLabel: { fontSize: 9, color: theme.colors.textSecondary },
  chartLegend: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 12,
  },
  legendDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  legendText: { fontSize: 12, color: theme.colors.textSecondary },
  filterScroll: { marginBottom: theme.spacing.md },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    marginRight: 8,
  },
  filterChipActive: { backgroundColor: theme.colors.primary },
  filterChipText: { fontSize: 13, color: theme.colors.textSecondary },
  filterChipTextActive: { color: "#fff" },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  transactionCard: { marginBottom: theme.spacing.sm },
  transactionRow: { flexDirection: "row", alignItems: "center" },
  transactionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  transactionInfo: { flex: 1 },
  transactionNameRow: { flexDirection: "row", alignItems: "center" },
  transactionName: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.text,
  },
  pendingBadge: {
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 8,
  },
  pendingText: { fontSize: 9, fontWeight: "600", color: "#F59E0B" },
  transactionMeta: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  transactionAmountContainer: { alignItems: "flex-end" },
  transactionAmount: { fontSize: 15, fontWeight: "600" },
  transactionDate: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
});
