/**
 * Trade History Screen
 * View past trades with performance insights
 */

import React, { useEffect, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { lightTheme as theme } from '../../src/constants/theme';
import { useTradingStore } from '../../src/store/tradingStore';
import type { TradeHistoryItem } from '../../src/services/api/trading';

// ============================================================================
// TYPES
// ============================================================================

type FilterPeriod = '1D' | '1W' | '1M' | '3M' | 'ALL';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const formatCurrency = (amount: number, showSign = false): string => {
  const sign = showSign && amount >= 0 ? '+' : '';
  return `${sign}$${Math.abs(amount).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const formatPercent = (value: number): string => {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${(value * 100).toFixed(2)}%`;
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatDateShort = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
};

// ============================================================================
// COMPONENTS
// ============================================================================

function PerformanceSummary({
  totalTrades,
  winRate,
  totalPL,
  avgWin,
  avgLoss,
  profitFactor,
}: {
  totalTrades: number;
  winRate: number;
  totalPL: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number;
}) {
  const isProfit = totalPL >= 0;

  return (
    <View style={styles.summaryCard}>
      <View style={styles.summaryHeader}>
        <Text style={styles.summaryTitle}>Performance Summary</Text>
      </View>

      <View style={styles.summaryMainStat}>
        <Text style={styles.summaryMainLabel}>Total P&L</Text>
        <Text
          style={[
            styles.summaryMainValue,
            { color: isProfit ? '#10B981' : '#EF4444' },
          ]}
        >
          {formatCurrency(totalPL, true)}
        </Text>
      </View>

      <View style={styles.summaryGrid}>
        <View style={styles.summaryGridItem}>
          <Text style={styles.summaryGridLabel}>Total Trades</Text>
          <Text style={styles.summaryGridValue}>{totalTrades}</Text>
        </View>
        <View style={styles.summaryGridItem}>
          <Text style={styles.summaryGridLabel}>Win Rate</Text>
          <Text style={[styles.summaryGridValue, { color: winRate >= 50 ? '#10B981' : '#EF4444' }]}>
            {winRate.toFixed(1)}%
          </Text>
        </View>
        <View style={styles.summaryGridItem}>
          <Text style={styles.summaryGridLabel}>Avg Win</Text>
          <Text style={[styles.summaryGridValue, { color: '#10B981' }]}>
            {formatCurrency(avgWin, true)}
          </Text>
        </View>
        <View style={styles.summaryGridItem}>
          <Text style={styles.summaryGridLabel}>Avg Loss</Text>
          <Text style={[styles.summaryGridValue, { color: '#EF4444' }]}>
            {formatCurrency(avgLoss)}
          </Text>
        </View>
        <View style={styles.summaryGridItem}>
          <Text style={styles.summaryGridLabel}>Profit Factor</Text>
          <Text
            style={[
              styles.summaryGridValue,
              { color: profitFactor >= 1 ? '#10B981' : '#EF4444' },
            ]}
          >
            {profitFactor.toFixed(2)}
          </Text>
        </View>
        <View style={styles.summaryGridItem}>
          <Text style={styles.summaryGridLabel}>Expectancy</Text>
          <Text
            style={[
              styles.summaryGridValue,
              { color: totalPL / Math.max(totalTrades, 1) >= 0 ? '#10B981' : '#EF4444' },
            ]}
          >
            {formatCurrency(totalPL / Math.max(totalTrades, 1), true)}
          </Text>
        </View>
      </View>
    </View>
  );
}

function PeriodFilter({
  activePeriod,
  onPeriodChange,
}: {
  activePeriod: FilterPeriod;
  onPeriodChange: (period: FilterPeriod) => void;
}) {
  const periods: FilterPeriod[] = ['1D', '1W', '1M', '3M', 'ALL'];

  return (
    <View style={styles.periodFilter}>
      {periods.map((period) => (
        <TouchableOpacity
          key={period}
          style={[
            styles.periodButton,
            activePeriod === period && styles.periodButtonActive,
          ]}
          onPress={() => onPeriodChange(period)}
        >
          <Text
            style={[
              styles.periodButtonText,
              activePeriod === period && styles.periodButtonTextActive,
            ]}
          >
            {period}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function TradeCard({ trade }: { trade: TradeHistoryItem }) {
  const isProfit = (trade.profitLoss ?? 0) >= 0;
  const holdingTime = trade.holdingPeriodDays
    ? trade.holdingPeriodDays * 24
    : trade.exitDate && trade.entryDate
    ? Math.round(
        (new Date(trade.exitDate).getTime() - new Date(trade.entryDate).getTime()) /
          (1000 * 60 * 60)
      )
    : 0;

  return (
    <View style={styles.tradeCard}>
      <View style={styles.tradeHeader}>
        <View style={styles.tradeSymbolContainer}>
          <Text style={styles.tradeSymbol}>{trade.symbol}</Text>
          <View
            style={[
              styles.tradeSideBadge,
              { backgroundColor: trade.direction === 'long' ? '#10B98120' : '#EF444420' },
            ]}
          >
            <Text
              style={[
                styles.tradeSideBadgeText,
                { color: trade.direction === 'long' ? '#10B981' : '#EF4444' },
              ]}
            >
              {trade.direction.toUpperCase()}
            </Text>
          </View>
        </View>
        <View style={styles.tradePL}>
          <Text
            style={[styles.tradePLValue, { color: isProfit ? '#10B981' : '#EF4444' }]}
          >
            {formatCurrency(trade.profitLoss ?? 0, true)}
          </Text>
          <Text
            style={[
              styles.tradePLPercent,
              { color: isProfit ? '#10B981' : '#EF4444' },
            ]}
          >
            {formatPercent((trade.profitLossPercent ?? 0) / 100)}
          </Text>
        </View>
      </View>

      <View style={styles.tradeDetails}>
        <View style={styles.tradeDetailRow}>
          <View style={styles.tradeDetailItem}>
            <Ionicons name="arrow-forward" size={14} color={theme.colors.textSecondary} />
            <Text style={styles.tradeDetailLabel}>Entry</Text>
            <Text style={styles.tradeDetailValue}>${trade.entryPrice.toFixed(2)}</Text>
          </View>
          <View style={styles.tradeDetailItem}>
            <Ionicons name="arrow-back" size={14} color={theme.colors.textSecondary} />
            <Text style={styles.tradeDetailLabel}>Exit</Text>
            <Text style={styles.tradeDetailValue}>${(trade.exitPrice ?? 0).toFixed(2)}</Text>
          </View>
          <View style={styles.tradeDetailItem}>
            <Ionicons name="layers-outline" size={14} color={theme.colors.textSecondary} />
            <Text style={styles.tradeDetailLabel}>Qty</Text>
            <Text style={styles.tradeDetailValue}>{trade.quantity}</Text>
          </View>
        </View>
      </View>

      <View style={styles.tradeFooter}>
        <View style={styles.tradeFooterItem}>
          <Ionicons name="calendar-outline" size={14} color={theme.colors.textSecondary} />
          <Text style={styles.tradeFooterText}>{formatDateShort(trade.entryDate)}</Text>
        </View>
        <View style={styles.tradeFooterItem}>
          <Ionicons name="time-outline" size={14} color={theme.colors.textSecondary} />
          <Text style={styles.tradeFooterText}>
            {holdingTime < 24 ? `${holdingTime}h` : `${Math.round(holdingTime / 24)}d`}
          </Text>
        </View>
        {trade.strategy && (
          <View style={styles.tradeFooterItem}>
            <Ionicons name="bulb-outline" size={14} color={theme.colors.textSecondary} />
            <Text style={styles.tradeFooterText}>{trade.strategy}</Text>
          </View>
        )}
      </View>

      {trade.notes && (
        <View style={styles.tradeNotes}>
          <Ionicons name="document-text-outline" size={14} color={theme.colors.textSecondary} />
          <Text style={styles.tradeNotesText}>{trade.notes}</Text>
        </View>
      )}
    </View>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function TradeHistoryScreen() {
  const [activePeriod, setActivePeriod] = useState<FilterPeriod>('1M');

  const { tradeHistory, isLoading, isRefreshing, fetchTradeHistory } = useTradingStore();

  useEffect(() => {
    fetchTradeHistory(activePeriod);
  }, [activePeriod]);

  const onRefresh = useCallback(() => {
    fetchTradeHistory(activePeriod);
  }, [fetchTradeHistory, activePeriod]);

  // Calculate performance metrics
  const trades = tradeHistory || [];
  const totalTrades = trades.length;
  const winningTrades = trades.filter((t) => (t.profitLoss ?? 0) > 0);
  const losingTrades = trades.filter((t) => (t.profitLoss ?? 0) < 0);
  const winRate = totalTrades > 0 ? (winningTrades.length / totalTrades) * 100 : 0;
  const totalPL = trades.reduce((sum, t) => sum + (t.profitLoss ?? 0), 0);
  const avgWin =
    winningTrades.length > 0
      ? winningTrades.reduce((sum, t) => sum + (t.profitLoss ?? 0), 0) / winningTrades.length
      : 0;
  const avgLoss =
    losingTrades.length > 0
      ? Math.abs(losingTrades.reduce((sum, t) => sum + (t.profitLoss ?? 0), 0) / losingTrades.length)
      : 0;
  const grossWins = winningTrades.reduce((sum, t) => sum + (t.profitLoss ?? 0), 0);
  const grossLosses = Math.abs(losingTrades.reduce((sum, t) => sum + (t.profitLoss ?? 0), 0));
  const profitFactor = grossLosses > 0 ? grossWins / grossLosses : grossWins > 0 ? Infinity : 0;

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Trade History',
          headerRight: () => (
            <TouchableOpacity style={styles.headerButton}>
              <Ionicons name="download-outline" size={24} color={theme.colors.primary} />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Period Filter */}
        <PeriodFilter activePeriod={activePeriod} onPeriodChange={setActivePeriod} />

        {/* Performance Summary */}
        {totalTrades > 0 && (
          <PerformanceSummary
            totalTrades={totalTrades}
            winRate={winRate}
            totalPL={totalPL}
            avgWin={avgWin}
            avgLoss={avgLoss}
            profitFactor={isFinite(profitFactor) ? profitFactor : 0}
          />
        )}

        {/* Trade List */}
        {isLoading && trades.length === 0 ? (
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loadingText}>Loading trade history...</Text>
          </View>
        ) : trades.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons
              name="receipt-outline"
              size={64}
              color={theme.colors.textSecondary}
            />
            <Text style={styles.emptyStateTitle}>No Trades</Text>
            <Text style={styles.emptyStateText}>
              Your completed trades will appear here
            </Text>
          </View>
        ) : (
          <View style={styles.tradesList}>
            <View style={styles.tradesHeader}>
              <Text style={styles.tradesHeaderTitle}>
                Recent Trades ({trades.length})
              </Text>
              <View style={styles.tradesHeaderStats}>
                <View style={styles.statBadge}>
                  <View style={[styles.statDot, { backgroundColor: '#10B981' }]} />
                  <Text style={styles.statText}>{winningTrades.length} wins</Text>
                </View>
                <View style={styles.statBadge}>
                  <View style={[styles.statDot, { backgroundColor: '#EF4444' }]} />
                  <Text style={styles.statText}>{losingTrades.length} losses</Text>
                </View>
              </View>
            </View>

            {trades.map((trade) => (
              <TradeCard key={trade.id} trade={trade} />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  headerButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  periodFilter: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  periodButtonActive: {
    backgroundColor: theme.colors.primary,
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.textSecondary,
  },
  periodButtonTextActive: {
    color: '#FFFFFF',
  },
  summaryCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  summaryHeader: {
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  summaryMainStat: {
    alignItems: 'center',
    marginBottom: 20,
  },
  summaryMainLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  summaryMainValue: {
    fontSize: 32,
    fontWeight: '700',
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
  },
  summaryGridItem: {
    width: '33.33%',
    paddingHorizontal: 8,
    marginBottom: 16,
    alignItems: 'center',
  },
  summaryGridLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  summaryGridValue: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 32,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.text,
    marginTop: 16,
  },
  emptyStateText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
  },
  tradesList: {
    gap: 12,
  },
  tradesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  tradesHeaderTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  tradesHeaderStats: {
    flexDirection: 'row',
    gap: 12,
  },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  tradeCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  tradeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  tradeSymbolContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tradeSymbol: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
  },
  tradeSideBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  tradeSideBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  tradePL: {
    alignItems: 'flex-end',
  },
  tradePLValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  tradePLPercent: {
    fontSize: 13,
    marginTop: 2,
  },
  tradeDetails: {
    backgroundColor: theme.colors.background,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  tradeDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  tradeDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tradeDetailLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  tradeDetailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.text,
  },
  tradeFooter: {
    flexDirection: 'row',
    gap: 16,
  },
  tradeFooterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tradeFooterText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  tradeNotes: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  tradeNotesText: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
  },
});
