/**
 * CPFI Investment Portfolio Screen (Enhanced)
 * Track investment portfolio, performance, and navigate to analysis/holdings
 */

import React, { useState, useEffect, useCallback } from 'react';
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
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { lightTheme as theme } from '../../src/constants/theme';
import { Card } from '../../src/components/Card';
import { PieChart } from '../../src/components/charts';
import {
  investmentsApi,
  type Holding as ApiHolding,
  type PortfolioResponse,
} from '../../src/services/api';

type AssetType =
  | 'stock'
  | 'etf'
  | 'crypto'
  | 'bond'
  | 'mutual_fund'
  | 'option'
  | 'other';

// Local interface that maps API Holding to component needs
interface Holding {
  id: string;
  name: string;
  symbol: string;
  value: number;
  change: number;
  changePercent: number;
  shares: number;
  avgCost: number;
  type: AssetType;
  sector?: string;
}

interface PortfolioSummary {
  totalValue: number;
  dayChange: number;
  dayChangePercent: number;
  totalReturn: number;
  totalReturnPercent: number;
}

interface Allocation {
  type: string;
  value: number;
  percentage: number;
  color: string;
}

// Transform API holding to local format
function transformHolding(apiHolding: ApiHolding): Holding {
  return {
    id: apiHolding.id,
    name: apiHolding.name,
    symbol: apiHolding.symbol,
    value: apiHolding.current_value,
    change: apiHolding.day_change,
    changePercent: apiHolding.day_change_percent,
    shares: apiHolding.quantity,
    avgCost: apiHolding.average_cost,
    type: apiHolding.asset_type as AssetType,
    sector: apiHolding.sector,
  };
}

const ALLOCATION_COLORS: Record<string, string> = {
  etf: '#3B82F6',
  stock: '#8B5CF6',
  crypto: '#F59E0B',
  bond: '#22C55E',
  mutual_fund: '#EC4899',
  option: '#14B8A6',
  other: '#6B7280',
};

export default function InvestmentsScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchModal, setShowSearchModal] = useState(false);

  const fetchPortfolio = useCallback(async () => {
    try {
      setError(null);
      const response = await investmentsApi.getPortfolio();

      if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'Failed to load portfolio');
      }

      const {
        summary: apiSummary,
        holdings: apiHoldings,
        allocations: apiAllocations,
      } = response.data;

      // Transform holdings to local format
      const transformedHoldings = apiHoldings.map(transformHolding);
      setHoldings(transformedHoldings);

      // Set summary
      setSummary({
        totalValue: apiSummary.totalValue,
        dayChange: apiSummary.dayChange,
        dayChangePercent: apiSummary.dayChangePercent,
        totalReturn: apiSummary.totalGainLoss,
        totalReturnPercent: apiSummary.totalGainLossPercent,
      });

      // Set allocations with colors
      setAllocations(
        apiAllocations.map((a) => ({
          type: a.type,
          value: a.value,
          percentage: a.percentage,
          color: ALLOCATION_COLORS[a.type] || '#6B7280',
        }))
      );
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to load portfolio';
      setError(errorMessage);
      console.error('Portfolio fetch error:', err);
    }
  }, []);

  useEffect(() => {
    fetchPortfolio().finally(() => setLoading(false));
  }, [fetchPortfolio]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchPortfolio();
    setRefreshing(false);
  }, [fetchPortfolio]);

  const handleRetry = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchPortfolio().finally(() => setLoading(false));
  }, [fetchPortfolio]);

  const getTypeIcon = (type: AssetType): keyof typeof Ionicons.glyphMap => {
    const icons: Record<AssetType, keyof typeof Ionicons.glyphMap> = {
      stock: 'trending-up',
      etf: 'pie-chart',
      crypto: 'logo-bitcoin',
      bond: 'document-text',
      mutual_fund: 'layers',
      option: 'options',
      other: 'cash',
    };
    return icons[type] || 'cash';
  };

  const formatCurrency = (n: number) =>
    `$${Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const formatPercent = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;

  const filteredHoldings = holdings.filter(
    (h) =>
      h.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.symbol.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading portfolio...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color={theme.colors.error} />
          <Text style={styles.errorTitle}>Unable to Load Portfolio</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
            <Ionicons name="refresh" size={20} color="#fff" />
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.title}>Investment Portfolio</Text>
            <Text style={styles.subtitle}>Track your investments</Text>
          </View>
          <TouchableOpacity
            onPress={() => setShowSearchModal(true)}
            style={styles.searchButton}
          >
            <Ionicons name="search" size={22} color={theme.colors.text} />
          </TouchableOpacity>
        </View>

        {/* Portfolio Summary */}
        {summary && (
          <Card style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Total Portfolio Value</Text>
            <Text style={styles.summaryValue}>
              {formatCurrency(summary.totalValue)}
            </Text>
            <View style={styles.summaryRow}>
              <View
                style={[
                  styles.changeBadge,
                  {
                    backgroundColor:
                      summary.dayChange >= 0
                        ? `${theme.colors.success}15`
                        : `${theme.colors.error}15`,
                  },
                ]}
              >
                <Ionicons
                  name={summary.dayChange >= 0 ? 'arrow-up' : 'arrow-down'}
                  size={14}
                  color={
                    summary.dayChange >= 0
                      ? theme.colors.success
                      : theme.colors.error
                  }
                />
                <Text
                  style={[
                    styles.changeText,
                    {
                      color:
                        summary.dayChange >= 0
                          ? theme.colors.success
                          : theme.colors.error,
                    },
                  ]}
                >
                  {summary.dayChange >= 0 ? '+' : '-'}
                  {formatCurrency(summary.dayChange)} (
                  {formatPercent(summary.dayChangePercent)})
                </Text>
              </View>
            </View>
            <View style={styles.returnRow}>
              <Text style={styles.returnLabel}>Total Return:</Text>
              <Text
                style={[
                  styles.returnValue,
                  {
                    color:
                      summary.totalReturn >= 0
                        ? theme.colors.success
                        : theme.colors.error,
                  },
                ]}
              >
                {summary.totalReturn >= 0 ? '+' : '-'}
                {formatCurrency(summary.totalReturn)} (
                {formatPercent(summary.totalReturnPercent)})
              </Text>
            </View>
          </Card>
        )}

        {/* Quick Actions */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/financial/holdings')}
          >
            <Ionicons name="list" size={20} color={theme.colors.primary} />
            <Text style={styles.actionText}>Holdings</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => setShowSearchModal(true)}
          >
            <Ionicons name="analytics" size={20} color={theme.colors.primary} />
            <Text style={styles.actionText}>Analyze</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/financial/holdings')}
          >
            <Ionicons
              name="add-circle"
              size={20}
              color={theme.colors.primary}
            />
            <Text style={styles.actionText}>Add</Text>
          </TouchableOpacity>
        </View>

        {/* Asset Allocation with Pie Chart */}
        <Card style={styles.allocationCard}>
          <Text style={styles.sectionTitle}>Asset Allocation</Text>
          {allocations.length > 0 && (
            <View style={styles.allocationChartContainer}>
              <PieChart
                data={allocations.map(a => ({
                  value: a.value,
                  label: a.type.charAt(0).toUpperCase() + a.type.slice(1),
                  color: a.color,
                }))}
                size={160}
                innerRadius={45}
                centerValue={`$${((summary?.totalValue || 0) / 1000).toFixed(0)}K`}
                centerLabel="Total"
                showPercentages
              />
            </View>
          )}
          <View style={styles.allocationBar}>
            {allocations.map((a, i) => (
              <View
                key={i}
                style={[
                  styles.allocSegment,
                  { backgroundColor: a.color, width: `${a.percentage}%` },
                ]}
              />
            ))}
          </View>
          <View style={styles.allocLegend}>
            {allocations.map((a, i) => (
              <View key={i} style={styles.allocItem}>
                <View style={[styles.allocDot, { backgroundColor: a.color }]} />
                <Text style={styles.allocText}>
                  {a.type.charAt(0).toUpperCase() + a.type.slice(1)}{' '}
                  {a.percentage.toFixed(0)}%
                </Text>
              </View>
            ))}
          </View>
        </Card>

        {/* Holdings List */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Holdings ({holdings.length})
            </Text>
            <TouchableOpacity
              onPress={() => router.push('/financial/holdings')}
            >
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          {filteredHoldings.slice(0, 5).map((h) => (
            <TouchableOpacity
              key={h.id}
              onPress={() =>
                router.push(`/financial/stock-analysis?symbol=${h.symbol}`)
              }
            >
              <Card style={styles.holdingCard}>
                <View style={styles.holdingRow}>
                  <View
                    style={[
                      styles.typeIcon,
                      { backgroundColor: `${ALLOCATION_COLORS[h.type]}15` },
                    ]}
                  >
                    <Ionicons
                      name={getTypeIcon(h.type)}
                      size={20}
                      color={ALLOCATION_COLORS[h.type]}
                    />
                  </View>
                  <View style={styles.holdingInfo}>
                    <Text style={styles.holdingName}>{h.name}</Text>
                    <Text style={styles.holdingSymbol}>
                      {h.symbol} • {h.shares} shares
                    </Text>
                  </View>
                  <View style={styles.holdingValue}>
                    <Text style={styles.valueText}>
                      {formatCurrency(h.value)}
                    </Text>
                    <Text
                      style={[
                        styles.changeSmall,
                        {
                          color:
                            h.change >= 0
                              ? theme.colors.success
                              : theme.colors.error,
                        },
                      ]}
                    >
                      {formatPercent(h.changePercent)}
                    </Text>
                  </View>
                </View>
              </Card>
            </TouchableOpacity>
          ))}
        </View>

        {/* Market Insights */}
        <Card style={styles.insightsCard}>
          <View style={styles.insightsHeader}>
            <Ionicons name="bulb" size={20} color={theme.colors.warning} />
            <Text style={styles.sectionTitle}> Portfolio Insights</Text>
          </View>
          <Text style={styles.insightText}>
            📈 Technology sector is up 2.1% today
          </Text>
          <Text style={styles.insightText}>⚠️ Crypto holdings down 4.87%</Text>
          <Text style={styles.insightText}>
            ✅ Portfolio is well diversified across 5 asset types
          </Text>
          <Text style={styles.insightText}>
            💡 Consider rebalancing - ETFs are 48% of portfolio
          </Text>
        </Card>
      </ScrollView>

      {/* Search Modal */}
      <Modal visible={showSearchModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Search & Analyze Stock</Text>
              <TouchableOpacity onPress={() => setShowSearchModal(false)}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
            <View style={styles.searchInputContainer}>
              <Ionicons
                name="search"
                size={20}
                color={theme.colors.textSecondary}
              />
              <TextInput
                style={styles.searchInput}
                placeholder="Enter stock symbol (e.g., AAPL)"
                placeholderTextColor={theme.colors.textSecondary}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="characters"
                autoFocus
              />
            </View>
            <TouchableOpacity
              style={[
                styles.analyzeButton,
                !searchQuery && styles.analyzeButtonDisabled,
              ]}
              disabled={!searchQuery}
              onPress={() => {
                setShowSearchModal(false);
                router.push(
                  `/financial/stock-analysis?symbol=${searchQuery.toUpperCase()}`
                );
                setSearchQuery('');
              }}
            >
              <Text style={styles.analyzeButtonText}>
                Analyze {searchQuery.toUpperCase() || 'Stock'}
              </Text>
            </TouchableOpacity>
            <Text style={styles.popularLabel}>Popular Stocks</Text>
            <View style={styles.popularGrid}>
              {['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA'].map((s) => (
                <TouchableOpacity
                  key={s}
                  style={styles.popularChip}
                  onPress={() => {
                    setShowSearchModal(false);
                    router.push(`/financial/stock-analysis?symbol=${s}`);
                  }}
                >
                  <Text style={styles.popularChipText}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scrollView: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: {
    marginTop: theme.spacing.md,
    color: theme.colors.textSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  backButton: { padding: theme.spacing.sm },
  headerContent: { flex: 1, marginLeft: theme.spacing.sm },
  title: { fontSize: 24, fontWeight: '700', color: theme.colors.text },
  subtitle: { fontSize: 14, color: theme.colors.textSecondary },
  searchButton: { padding: theme.spacing.sm },
  summaryCard: {
    marginHorizontal: theme.spacing.lg,
    padding: theme.spacing.xl,
    alignItems: 'center',
  },
  summaryLabel: { fontSize: 14, color: theme.colors.textSecondary },
  summaryValue: {
    fontSize: 36,
    fontWeight: '700',
    color: theme.colors.text,
    marginTop: 8,
  },
  summaryRow: { marginTop: 12 },
  changeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  changeText: { fontSize: 14, fontWeight: '600', marginLeft: 4 },
  returnRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  returnLabel: { fontSize: 12, color: theme.colors.textSecondary },
  returnValue: { fontSize: 12, fontWeight: '600', marginLeft: 4 },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.md,
  },
  actionButton: { alignItems: 'center', padding: theme.spacing.md },
  actionText: { fontSize: 12, color: theme.colors.primary, marginTop: 4 },
  section: { paddingHorizontal: theme.spacing.lg, marginTop: theme.spacing.lg },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: theme.colors.text },
  seeAllText: { fontSize: 14, color: theme.colors.primary },
  holdingCard: { marginBottom: theme.spacing.sm, padding: theme.spacing.md },
  holdingRow: { flexDirection: 'row', alignItems: 'center' },
  typeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  holdingInfo: { flex: 1, marginLeft: 12 },
  holdingName: { fontSize: 14, fontWeight: '600', color: theme.colors.text },
  holdingSymbol: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  holdingValue: { alignItems: 'flex-end' },
  valueText: { fontSize: 14, fontWeight: '600', color: theme.colors.text },
  changeSmall: { fontSize: 12, marginTop: 2 },
  allocationCard: {
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.lg,
    padding: theme.spacing.lg,
  },
  allocationChartContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  allocationBar: {
    flexDirection: 'row',
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
    marginTop: theme.spacing.sm,
  },
  allocSegment: { height: 12 },
  allocLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: theme.spacing.md,
  },
  allocItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '50%',
    marginTop: 8,
  },
  allocDot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  allocText: { fontSize: 12, color: theme.colors.textSecondary },
  insightsCard: {
    marginHorizontal: theme.spacing.lg,
    marginVertical: theme.spacing.lg,
    padding: theme.spacing.lg,
  },
  insightsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  insightText: { fontSize: 13, color: theme.colors.text, lineHeight: 24 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: theme.spacing.lg,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  modalTitle: { fontSize: 18, fontWeight: '600', color: theme.colors.text },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: theme.colors.text,
  },
  analyzeButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: theme.spacing.md,
  },
  analyzeButtonDisabled: { backgroundColor: theme.colors.border },
  analyzeButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  popularLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  popularGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  popularChip: {
    backgroundColor: theme.colors.background,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  popularChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginTop: theme.spacing.md,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.sm,
    textAlign: 'center',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: 8,
    marginTop: theme.spacing.lg,
    gap: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
