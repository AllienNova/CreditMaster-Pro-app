/**
 * Global Search Screen
 * Unified search across stocks, transactions, help articles, and settings
 */

import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Keyboard,
  ListRenderItemInfo,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { lightTheme as theme } from "../../src/constants/theme";
import investmentsApi from "../../src/services/api/investments";
import { useTransactionStore } from "../../src/store/transactionStore";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SearchCategory = "all" | "stocks" | "transactions" | "help" | "settings";

interface SearchResult {
  id: string;
  category: SearchCategory;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  route: string;
  params?: Record<string, string>;
}

type SectionItem = SearchResult | { type: "header"; title: string; id: string };

// ---------------------------------------------------------------------------
// Static data
// ---------------------------------------------------------------------------

const RECENT_SEARCHES_KEY = "fynvita_recent_searches";
const MAX_RECENT = 10;
const DEBOUNCE_MS = 300;

const HELP_ARTICLES: {
  id: string;
  title: string;
  description: string;
  route: string;
}[] = [
  {
    id: "help-credit",
    title: "Understanding Your Credit Score",
    description: "How scores are calculated and what impacts them",
    route: "/help/guides",
  },
  {
    id: "help-disputes",
    title: "Filing a Credit Dispute",
    description: "Step-by-step guide to disputing errors",
    route: "/help/guides",
  },
  {
    id: "help-budgets",
    title: "Creating and Managing Budgets",
    description: "Set spending limits and track progress",
    route: "/help/guides",
  },
  {
    id: "help-bills",
    title: "Bill Tracking and Negotiation",
    description: "Never miss a payment, lower your bills",
    route: "/help/guides",
  },
  {
    id: "help-trading",
    title: "Getting Started with Trading",
    description: "Stocks, ETFs, and crypto basics",
    route: "/help/guides",
  },
  {
    id: "help-debt",
    title: "Debt Payoff Strategies",
    description: "Snowball, avalanche, and hybrid methods",
    route: "/help/guides",
  },
  {
    id: "help-savings",
    title: "Building an Emergency Fund",
    description: "How much to save and where to keep it",
    route: "/help/guides",
  },
  {
    id: "help-investments",
    title: "Portfolio Diversification",
    description: "Reduce risk through asset allocation",
    route: "/help/guides",
  },
  {
    id: "help-taxes",
    title: "Tax Planning Basics",
    description: "Deductions, credits, and filing tips",
    route: "/help/guides",
  },
  {
    id: "help-identity",
    title: "Identity Protection",
    description: "Monitor and protect against identity theft",
    route: "/help/guides",
  },
];

const SETTINGS_ITEMS: {
  id: string;
  title: string;
  description: string;
  route: string;
}[] = [
  {
    id: "set-profile",
    title: "Profile",
    description: "Edit your name, email, and photo",
    route: "/settings/profile",
  },
  {
    id: "set-security",
    title: "Security",
    description: "Password, biometrics, and 2FA",
    route: "/profile/security",
  },
  {
    id: "set-billing",
    title: "Billing",
    description: "Subscription plan and payment methods",
    route: "/settings/billing",
  },
  {
    id: "set-notifications",
    title: "Notifications",
    description: "Push, email, and SMS preferences",
    route: "/settings/notifications",
  },
  {
    id: "set-privacy",
    title: "Privacy",
    description: "Data sharing and account visibility",
    route: "/settings/privacy",
  },
  {
    id: "set-connected",
    title: "Connected Accounts",
    description: "Linked banks and brokerages",
    route: "/settings/connected-accounts",
  },
  {
    id: "set-transaction-rules",
    title: "Transaction Rules",
    description: "Auto-categorization and alerts",
    route: "/settings/transaction-rules",
  },
];

const SUGGESTED_SEARCHES = [
  "AAPL",
  "Credit score",
  "Budget",
  "Dispute",
  "Notifications",
  "Savings",
];

const CATEGORY_TABS: { key: SearchCategory; label: string }[] = [
  { key: "all", label: "All" },
  { key: "stocks", label: "Stocks" },
  { key: "transactions", label: "Transactions" },
  { key: "help", label: "Help" },
  { key: "settings", label: "Settings" },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SearchScreen() {
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<SearchCategory>("all");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [stockLoading, setStockLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<TextInput>(null);

  const transactions = useTransactionStore((s) => s.transactions);

  const loadRecentSearches = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(RECENT_SEARCHES_KEY);
      if (stored) {
        setRecentSearches(JSON.parse(stored));
      }
    } catch {
      // Silently fail — recent searches are non-critical
    }
  }, []);

  // Load recent searches on mount
  useEffect(() => {
    loadRecentSearches();
  }, [loadRecentSearches]);

  // Auto-focus input
  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 100);
    return () => clearTimeout(timer);
  }, []);

  const saveRecentSearch = useCallback(
    async (term: string) => {
      const trimmed = term.trim();
      if (!trimmed) return;
      const updated = [
        trimmed,
        ...recentSearches.filter(
          (s) => s.toLowerCase() !== trimmed.toLowerCase(),
        ),
      ].slice(0, MAX_RECENT);
      setRecentSearches(updated);
      try {
        await AsyncStorage.setItem(
          RECENT_SEARCHES_KEY,
          JSON.stringify(updated),
        );
      } catch {
        // Non-critical
      }
    },
    [recentSearches],
  );

  const removeRecentSearch = useCallback(
    async (term: string) => {
      const updated = recentSearches.filter(
        (s) => s.toLowerCase() !== term.toLowerCase(),
      );
      setRecentSearches(updated);
      try {
        await AsyncStorage.setItem(
          RECENT_SEARCHES_KEY,
          JSON.stringify(updated),
        );
      } catch {
        // Non-critical
      }
    },
    [recentSearches],
  );

  const clearRecentSearches = useCallback(async () => {
    setRecentSearches([]);
    try {
      await AsyncStorage.removeItem(RECENT_SEARCHES_KEY);
    } catch {
      // Non-critical
    }
  }, []);

  // -------------------------------------------------------------------------
  // Search logic
  // -------------------------------------------------------------------------

  const searchTransactions = useCallback(
    (q: string): SearchResult[] => {
      const lower = q.toLowerCase();
      return transactions
        .filter(
          (t) =>
            t.merchantName.toLowerCase().includes(lower) ||
            t.category.toLowerCase().includes(lower),
        )
        .slice(0, 10)
        .map((t) => ({
          id: `txn-${t.id}`,
          category: "transactions" as SearchCategory,
          title: t.merchantName,
          subtitle: `${t.type === "expense" ? "-" : "+"}$${Math.abs(t.amount).toFixed(2)} · ${t.category} · ${new Date(t.date).toLocaleDateString()}`,
          icon: "card-outline" as keyof typeof Ionicons.glyphMap,
          iconColor: t.type === "expense" ? theme.colors.error : theme.colors.success,
          route: "/financial/transactions",
        }));
    },
    [transactions],
  );

  const searchHelp = useCallback((q: string): SearchResult[] => {
    const lower = q.toLowerCase();
    return HELP_ARTICLES.filter(
      (a) =>
        a.title.toLowerCase().includes(lower) ||
        a.description.toLowerCase().includes(lower),
    ).map((a) => ({
      id: a.id,
      category: "help" as SearchCategory,
      title: a.title,
      subtitle: a.description,
      icon: "help-circle-outline" as keyof typeof Ionicons.glyphMap,
      iconColor: theme.colors.info,
      route: a.route,
    }));
  }, []);

  const searchSettings = useCallback((q: string): SearchResult[] => {
    const lower = q.toLowerCase();
    return SETTINGS_ITEMS.filter(
      (s) =>
        s.title.toLowerCase().includes(lower) ||
        s.description.toLowerCase().includes(lower),
    ).map((s) => ({
      id: s.id,
      category: "settings" as SearchCategory,
      title: s.title,
      subtitle: s.description,
      icon: "settings-outline" as keyof typeof Ionicons.glyphMap,
      iconColor: theme.colors.textSecondary,
      route: s.route,
    }));
  }, []);

  const searchStocks = useCallback(
    async (q: string): Promise<SearchResult[]> => {
      const symbol = q.trim().toUpperCase();
      if (symbol.length < 1 || symbol.length > 10) return [];
      // Only search if it looks like a stock symbol (letters, maybe a dot)
      if (!/^[A-Z.]{1,10}$/.test(symbol)) return [];

      setStockLoading(true);
      try {
        const response = await investmentsApi.analyzeStock(symbol);
        if (response.data?.analysis) {
          const a = response.data.analysis;
          const sign = a.price_change >= 0 ? "+" : "";
          return [
            {
              id: `stock-${a.symbol}`,
              category: "stocks" as SearchCategory,
              title: `${a.symbol} — ${a.company_name}`,
              subtitle: `$${a.current_price.toFixed(2)}  ${sign}${a.price_change_percent.toFixed(2)}%`,
              icon: "trending-up-outline" as keyof typeof Ionicons.glyphMap,
              iconColor:
                a.price_change >= 0
                  ? theme.colors.success
                  : theme.colors.error,
              route: "/investments/research",
              params: { symbol: a.symbol },
            },
          ];
        }
        return [];
      } catch {
        return [];
      } finally {
        setStockLoading(false);
      }
    },
    [],
  );

  const executeSearch = useCallback(
    async (q: string, tab: SearchCategory) => {
      const trimmed = q.trim();
      if (!trimmed) {
        setResults([]);
        setSearchError(null);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      setSearchError(null);

      try {
        const gathered: SearchResult[] = [];

        if (tab === "all" || tab === "transactions") {
          gathered.push(...searchTransactions(trimmed));
        }
        if (tab === "all" || tab === "help") {
          gathered.push(...searchHelp(trimmed));
        }
        if (tab === "all" || tab === "settings") {
          gathered.push(...searchSettings(trimmed));
        }
        if (tab === "all" || tab === "stocks") {
          const stockResults = await searchStocks(trimmed);
          gathered.push(...stockResults);
        }

        setResults(gathered);

        if (gathered.length === 0) {
          setSearchError(`No results for "${trimmed}"`);
        }
      } catch {
        setSearchError("Search failed. Please try again.");
      } finally {
        setIsSearching(false);
      }
    },
    [searchTransactions, searchHelp, searchSettings, searchStocks],
  );

  const handleQueryChange = useCallback(
    (text: string) => {
      setQuery(text);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (!text.trim()) {
        setResults([]);
        setSearchError(null);
        setIsSearching(false);
        return;
      }
      setIsSearching(true);
      debounceRef.current = setTimeout(() => {
        executeSearch(text, activeTab);
      }, DEBOUNCE_MS);
    },
    [activeTab, executeSearch],
  );

  const handleTabChange = useCallback(
    (tab: SearchCategory) => {
      setActiveTab(tab);
      if (query.trim()) {
        setIsSearching(true);
        executeSearch(query, tab);
      }
    },
    [query, executeSearch],
  );

  const handleResultPress = useCallback(
    (item: SearchResult) => {
      saveRecentSearch(query);
      Keyboard.dismiss();
      router.push(item.route as never);
    },
    [query, saveRecentSearch],
  );

  const handleRecentPress = useCallback(
    (term: string) => {
      setQuery(term);
      executeSearch(term, activeTab);
    },
    [activeTab, executeSearch],
  );

  const handleClear = useCallback(() => {
    setQuery("");
    setResults([]);
    setSearchError(null);
    setIsSearching(false);
    inputRef.current?.focus();
  }, []);

  // -------------------------------------------------------------------------
  // Filtered results by active tab
  // -------------------------------------------------------------------------

  const filteredResults =
    activeTab === "all"
      ? results
      : results.filter((r) => r.category === activeTab);

  // Group results by category for the "All" tab
  const sectionedResults = (): SectionItem[] => {
    if (activeTab !== "all") return filteredResults;
    const sections: SectionItem[] = [];
    const categories: SearchCategory[] = [
      "stocks",
      "transactions",
      "help",
      "settings",
    ];
    const labels: Record<string, string> = {
      stocks: "Stocks",
      transactions: "Transactions",
      help: "Help",
      settings: "Settings",
    };
    for (const cat of categories) {
      const items = results.filter((r) => r.category === cat);
      if (items.length > 0) {
        sections.push({ type: "header", title: labels[cat], id: `header-${cat}` });
        sections.push(...items);
      }
    }
    return sections;
  };

  // -------------------------------------------------------------------------
  // Render helpers
  // -------------------------------------------------------------------------

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<SectionItem>) => {
      if ("type" in item && item.type === "header") {
        return (
          <Text style={styles.sectionHeader}>{item.title}</Text>
        );
      }
      const result = item as SearchResult;
      return (
        <TouchableOpacity
          style={styles.resultItem}
          onPress={() => handleResultPress(result)}
          activeOpacity={0.7}
        >
          <View
            style={[
              styles.resultIcon,
              { backgroundColor: `${result.iconColor}15` },
            ]}
          >
            <Ionicons
              name={result.icon}
              size={20}
              color={result.iconColor}
            />
          </View>
          <View style={styles.resultContent}>
            <Text style={styles.resultTitle} numberOfLines={1}>
              {result.title}
            </Text>
            <Text style={styles.resultSubtitle} numberOfLines={1}>
              {result.subtitle}
            </Text>
          </View>
          <Ionicons
            name="chevron-forward"
            size={18}
            color={theme.colors.textMuted}
          />
        </TouchableOpacity>
      );
    },
    [handleResultPress],
  );

  const keyExtractor = useCallback(
    (item: SectionItem) => item.id,
    [],
  );

  const isEmptyQuery = !query.trim();

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Search bar */}
      <View style={styles.header}>
        <View style={styles.searchBar}>
          <Ionicons
            name="search-outline"
            size={20}
            color={theme.colors.textSecondary}
          />
          <TextInput
            ref={inputRef}
            style={styles.searchInput}
            placeholder="Search stocks, transactions, help..."
            placeholderTextColor={theme.colors.textMuted}
            value={query}
            onChangeText={handleQueryChange}
            returnKeyType="search"
            autoCorrect={false}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={handleClear} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons
                name="close-circle"
                size={20}
                color={theme.colors.textSecondary}
              />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => router.back()}
        >
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>

      {/* Category tabs */}
      <View style={styles.tabBar}>
        {CATEGORY_TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.tab,
              activeTab === tab.key && styles.tabActive,
            ]}
            onPress={() => handleTabChange(tab.key)}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === tab.key && styles.tabTextActive,
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content area */}
      {isEmptyQuery ? (
        <FlatList
          data={[]}
          renderItem={null}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <>
              {/* Recent searches */}
              {recentSearches.length > 0 && (
                <View style={styles.section}>
                  <View style={styles.sectionTitleRow}>
                    <Text style={styles.sectionTitle}>Recent Searches</Text>
                    <TouchableOpacity onPress={clearRecentSearches}>
                      <Text style={styles.clearText}>Clear</Text>
                    </TouchableOpacity>
                  </View>
                  {recentSearches.map((term) => (
                    <TouchableOpacity
                      key={term}
                      style={styles.recentItem}
                      onPress={() => handleRecentPress(term)}
                    >
                      <Ionicons
                        name="time-outline"
                        size={18}
                        color={theme.colors.textMuted}
                      />
                      <Text style={styles.recentText} numberOfLines={1}>
                        {term}
                      </Text>
                      <TouchableOpacity
                        onPress={() => removeRecentSearch(term)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons
                          name="close"
                          size={16}
                          color={theme.colors.textMuted}
                        />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Suggested searches */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Suggested</Text>
                <View style={styles.chipContainer}>
                  {SUGGESTED_SEARCHES.map((term) => (
                    <TouchableOpacity
                      key={term}
                      style={styles.chip}
                      onPress={() => handleRecentPress(term)}
                    >
                      <Text style={styles.chipText}>{term}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </>
          }
        />
      ) : isSearching && results.length === 0 ? (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Searching...</Text>
        </View>
      ) : searchError && results.length === 0 ? (
        <View style={styles.centerState}>
          <Ionicons
            name="search-outline"
            size={48}
            color={theme.colors.textMuted}
          />
          <Text style={styles.noResultsText}>{searchError}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => executeSearch(query, activeTab)}
          >
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={sectionedResults()}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.listContent}
          ListFooterComponent={
            stockLoading ? (
              <View style={styles.inlineLoader}>
                <ActivityIndicator
                  size="small"
                  color={theme.colors.primary}
                />
                <Text style={styles.inlineLoaderText}>
                  Looking up stock...
                </Text>
              </View>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },

  // Header / search bar
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    gap: 12,
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.gray100,
    borderRadius: theme.borderRadius.lg,
    paddingHorizontal: theme.spacing.md,
    height: 44,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.text,
  },
  cancelButton: {
    paddingVertical: 8,
  },
  cancelText: {
    fontSize: 16,
    color: theme.colors.primary,
    fontWeight: "500",
  },

  // Tabs
  tabBar: {
    flexDirection: "row",
    paddingHorizontal: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabActive: {
    borderBottomColor: theme.colors.primary,
  },
  tabText: {
    fontSize: 13,
    fontWeight: "500",
    color: theme.colors.textSecondary,
  },
  tabTextActive: {
    color: theme.colors.primary,
    fontWeight: "600",
  },

  // Sections (empty state)
  section: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
  },
  sectionTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing.sm,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  clearText: {
    fontSize: 14,
    color: theme.colors.primary,
  },

  // Recent search items
  recentItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  recentText: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.text,
  },

  // Suggestion chips
  chipContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  chip: {
    backgroundColor: theme.colors.gray100,
    borderRadius: theme.borderRadius.full,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipText: {
    fontSize: 14,
    color: theme.colors.text,
    fontWeight: "500",
  },

  // Results list
  listContent: {
    paddingVertical: theme.spacing.sm,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: "600",
    color: theme.colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.xs,
  },
  resultItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: 12,
    gap: 12,
  },
  resultIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  resultContent: {
    flex: 1,
  },
  resultTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: theme.colors.text,
  },
  resultSubtitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },

  // Center states
  centerState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: theme.spacing.xl,
  },
  loadingText: {
    marginTop: theme.spacing.md,
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  noResultsText: {
    marginTop: theme.spacing.md,
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: "center",
  },
  retryButton: {
    marginTop: theme.spacing.md,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.lg,
  },
  retryText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 14,
  },

  // Inline loader
  inlineLoader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: theme.spacing.md,
    gap: 8,
  },
  inlineLoaderText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
});
