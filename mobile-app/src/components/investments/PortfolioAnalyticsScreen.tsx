/**
 * Portfolio Analytics Screen (Mobile)
 * 
 * Comprehensive portfolio analysis with performance metrics,
 * allocation charts, risk analysis, and dividend tracking.
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import Svg, { Rect, Text as SvgText, G } from 'react-native-svg';
import { lightTheme as theme } from '../../constants/theme';

// ============================================================================
// TYPES
// ============================================================================

export interface PortfolioHolding {
  symbol: string;
  name: string;
  quantity: number;
  avgCost: number;
  currentPrice: number;
  sector?: string;
  assetClass: 'stock' | 'etf' | 'bond' | 'crypto' | 'cash' | 'other';
  dividendYield?: number;
  beta?: number;
}

export interface PortfolioMetrics {
  totalValue: number;
  totalCost: number;
  totalGain: number;
  totalGainPercent: number;
  dayChange: number;
  dayChangePercent: number;
  oneYearReturn: number;
  sharpeRatio: number;
  beta: number;
  volatility: number;
  maxDrawdown: number;
  dividendYield: number;
}

export interface PortfolioAnalyticsScreenProps {
  holdings: PortfolioHolding[];
  metrics: PortfolioMetrics;
  onHoldingPress?: (symbol: string) => void;
  onRebalance?: () => void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const { width: screenWidth } = Dimensions.get('window');
const CHART_WIDTH = screenWidth - 48;

const COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1',
];

// ============================================================================
// COMPONENT
// ============================================================================

export function PortfolioAnalyticsScreen({
  holdings,
  metrics,
  onHoldingPress,
  onRebalance,
}: PortfolioAnalyticsScreenProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'allocation' | 'risk'>('overview');

  // Calculate allocations
  const { assetAllocation, sectorAllocation, topHoldings } = useMemo(() => {
    const assetMap = new Map<string, number>();
    const sectorMap = new Map<string, number>();
    const totalValue = holdings.reduce((s, h) => s + h.quantity * h.currentPrice, 0);

    holdings.forEach(h => {
      const value = h.quantity * h.currentPrice;
      assetMap.set(h.assetClass, (assetMap.get(h.assetClass) || 0) + value);
      if (h.sector) {
        sectorMap.set(h.sector, (sectorMap.get(h.sector) || 0) + value);
      }
    });

    const toAllocation = (map: Map<string, number>) =>
      Array.from(map.entries())
        .map(([name, value], i) => ({
          name,
          value,
          percent: (value / totalValue) * 100,
          color: COLORS[i % COLORS.length],
        }))
        .sort((a, b) => b.value - a.value);

    const top = [...holdings]
      .map(h => ({
        ...h,
        value: h.quantity * h.currentPrice,
        gain: (h.currentPrice - h.avgCost) * h.quantity,
        gainPercent: ((h.currentPrice - h.avgCost) / h.avgCost) * 100,
        weight: (h.quantity * h.currentPrice / totalValue) * 100,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    return {
      assetAllocation: toAllocation(assetMap),
      sectorAllocation: toAllocation(sectorMap),
      topHoldings: top,
    };
  }, [holdings]);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.totalValue}>${formatNumber(metrics.totalValue)}</Text>
          <View style={styles.changeRow}>
            <Text style={[
              styles.changeText,
              { color: metrics.dayChange >= 0 ? '#26a69a' : '#ef5350' }
            ]}>
              {metrics.dayChange >= 0 ? '+' : ''}${formatNumber(metrics.dayChange)} ({metrics.dayChangePercent.toFixed(2)}%)
            </Text>
            <Text style={styles.todayLabel}>Today</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.rebalanceButton} onPress={onRebalance}>
          <Text style={styles.rebalanceButtonText}>Rebalance</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        {(['overview', 'allocation', 'risk'] as const).map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      {activeTab === 'overview' && (
        <OverviewContent
          metrics={metrics}
          topHoldings={topHoldings}
          onHoldingPress={onHoldingPress}
        />
      )}
      {activeTab === 'allocation' && (
        <AllocationContent
          assetAllocation={assetAllocation}
          sectorAllocation={sectorAllocation}
        />
      )}
      {activeTab === 'risk' && (
        <RiskContent metrics={metrics} holdings={holdings} />
      )}
    </ScrollView>
  );
}

// ============================================================================
// OVERVIEW CONTENT
// ============================================================================

interface OverviewContentProps {
  metrics: PortfolioMetrics;
  topHoldings: Array<PortfolioHolding & { value: number; gain: number; gainPercent: number; weight: number }>;
  onHoldingPress?: (symbol: string) => void;
}

function OverviewContent({ metrics, topHoldings, onHoldingPress }: OverviewContentProps) {
  return (
    <View style={styles.content}>
      {/* Key Metrics */}
      <View style={styles.metricsGrid}>
        <MetricCard
          label="Total Gain"
          value={`${metrics.totalGain >= 0 ? '+' : ''}$${formatNumber(metrics.totalGain)}`}
          subValue={`${metrics.totalGainPercent >= 0 ? '+' : ''}${metrics.totalGainPercent.toFixed(2)}%`}
          valueColor={metrics.totalGain >= 0 ? '#26a69a' : '#ef5350'}
        />
        <MetricCard
          label="1Y Return"
          value={`${metrics.oneYearReturn >= 0 ? '+' : ''}${metrics.oneYearReturn.toFixed(2)}%`}
          valueColor={metrics.oneYearReturn >= 0 ? '#26a69a' : '#ef5350'}
        />
        <MetricCard
          label="Sharpe Ratio"
          value={metrics.sharpeRatio.toFixed(2)}
        />
        <MetricCard
          label="Div Yield"
          value={`${metrics.dividendYield.toFixed(2)}%`}
        />
      </View>

      {/* Top Holdings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Top Holdings</Text>
        {topHoldings.map((holding, i) => (
          <TouchableOpacity
            key={holding.symbol}
            style={styles.holdingRow}
            onPress={() => onHoldingPress?.(holding.symbol)}
          >
            <View style={styles.holdingLeft}>
              <View style={[styles.holdingRank, { backgroundColor: COLORS[i] }]}>
                <Text style={styles.holdingRankText}>{i + 1}</Text>
              </View>
              <View>
                <Text style={styles.holdingSymbol}>{holding.symbol}</Text>
                <Text style={styles.holdingName} numberOfLines={1}>{holding.name}</Text>
              </View>
            </View>
            <View style={styles.holdingRight}>
              <Text style={styles.holdingValue}>${formatNumber(holding.value)}</Text>
              <Text style={[
                styles.holdingChange,
                { color: holding.gainPercent >= 0 ? '#26a69a' : '#ef5350' }
              ]}>
                {holding.gainPercent >= 0 ? '+' : ''}{holding.gainPercent.toFixed(2)}%
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

// ============================================================================
// ALLOCATION CONTENT
// ============================================================================

interface AllocationContentProps {
  assetAllocation: Array<{ name: string; value: number; percent: number; color: string }>;
  sectorAllocation: Array<{ name: string; value: number; percent: number; color: string }>;
}

function AllocationContent({ assetAllocation, sectorAllocation }: AllocationContentProps) {
  return (
    <View style={styles.content}>
      {/* Asset Class */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Asset Class</Text>
        <HorizontalBarChart data={assetAllocation} />
      </View>

      {/* Sector */}
      {sectorAllocation.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sector Allocation</Text>
          <HorizontalBarChart data={sectorAllocation} />
        </View>
      )}
    </View>
  );
}

function HorizontalBarChart({ data }: { data: Array<{ name: string; percent: number; color: string; value: number }> }) {
  const barHeight = 24;
  const gap = 8;
  const height = data.length * (barHeight + gap);

  return (
    <View style={styles.chartContainer}>
      <Svg width={CHART_WIDTH} height={height}>
        {data.map((item, i) => {
          const y = i * (barHeight + gap);
          const barWidth = (item.percent / 100) * (CHART_WIDTH - 100);
          
          return (
            <G key={i}>
              <Rect
                x={0}
                y={y}
                width={Math.max(barWidth, 2)}
                height={barHeight}
                fill={item.color}
                rx={4}
              />
              <SvgText
                x={barWidth + 8}
                y={y + barHeight / 2 + 4}
                fontSize={12}
                fill={theme.colors.text}
              >
                {item.percent.toFixed(1)}%
              </SvgText>
            </G>
          );
        })}
      </Svg>
      <View style={styles.chartLabels}>
        {data.map((item, i) => (
          <View key={i} style={[styles.chartLabel, { height: barHeight + gap }]}>
            <View style={[styles.colorDot, { backgroundColor: item.color }]} />
            <Text style={styles.labelText} numberOfLines={1}>{item.name}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ============================================================================
// RISK CONTENT
// ============================================================================

interface RiskContentProps {
  metrics: PortfolioMetrics;
  holdings: PortfolioHolding[];
}

function RiskContent({ metrics, holdings }: RiskContentProps) {
  const totalValue = holdings.reduce((s, h) => s + h.quantity * h.currentPrice, 0);
  const sortedByValue = [...holdings]
    .map(h => ({ ...h, value: h.quantity * h.currentPrice }))
    .sort((a, b) => b.value - a.value);
  
  const top5Weight = sortedByValue.slice(0, 5).reduce((s, h) => s + h.value, 0) / totalValue * 100;

  const riskItems = [
    { label: 'Volatility', value: `${metrics.volatility.toFixed(1)}%`, level: metrics.volatility > 20 ? 'high' : metrics.volatility > 12 ? 'medium' : 'low' },
    { label: 'Max Drawdown', value: `${metrics.maxDrawdown.toFixed(1)}%`, level: Math.abs(metrics.maxDrawdown) > 20 ? 'high' : Math.abs(metrics.maxDrawdown) > 10 ? 'medium' : 'low' },
    { label: 'Beta', value: metrics.beta.toFixed(2), level: metrics.beta > 1.3 ? 'high' : metrics.beta > 0.8 ? 'medium' : 'low' },
    { label: 'Top 5 Concentration', value: `${top5Weight.toFixed(1)}%`, level: top5Weight > 60 ? 'high' : top5Weight > 40 ? 'medium' : 'low' },
  ];

  const levelColors = {
    low: { bg: '#26a69a20', text: '#26a69a' },
    medium: { bg: '#F59E0B20', text: '#F59E0B' },
    high: { bg: '#ef535020', text: '#ef5350' },
  };

  return (
    <View style={styles.content}>
      {/* Risk Score */}
      <View style={styles.riskScoreCard}>
        <Text style={styles.riskScoreLabel}>Risk Score</Text>
        <Text style={styles.riskScoreValue}>
          {Math.round(50 + (metrics.volatility > 20 ? 15 : 0) + (metrics.beta > 1.2 ? 10 : 0) + (top5Weight > 50 ? 10 : 0))}
        </Text>
        <Text style={styles.riskScoreSubtext}>/ 100</Text>
      </View>

      {/* Risk Indicators */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Risk Indicators</Text>
        {riskItems.map((item, i) => (
          <View key={i} style={styles.riskRow}>
            <Text style={styles.riskLabel}>{item.label}</Text>
            <View style={styles.riskRight}>
              <Text style={styles.riskValue}>{item.value}</Text>
              <View style={[styles.riskBadge, { backgroundColor: levelColors[item.level as keyof typeof levelColors].bg }]}>
                <Text style={[styles.riskBadgeText, { color: levelColors[item.level as keyof typeof levelColors].text }]}>
                  {item.level.toUpperCase()}
                </Text>
              </View>
            </View>
          </View>
        ))}
      </View>

      {/* High Beta Holdings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>High Beta Holdings</Text>
        {holdings
          .filter(h => h.beta && h.beta > 1.3)
          .sort((a, b) => (b.beta || 0) - (a.beta || 0))
          .slice(0, 5)
          .map(h => (
            <View key={h.symbol} style={styles.betaRow}>
              <Text style={styles.betaSymbol}>{h.symbol}</Text>
              <Text style={styles.betaValue}>β {h.beta?.toFixed(2)}</Text>
            </View>
          ))}
        {holdings.filter(h => h.beta && h.beta > 1.3).length === 0 && (
          <Text style={styles.emptyText}>No high-beta holdings</Text>
        )}
      </View>
    </View>
  );
}

// ============================================================================
// SHARED COMPONENTS
// ============================================================================

interface MetricCardProps {
  label: string;
  value: string;
  subValue?: string;
  valueColor?: string;
}

function MetricCard({ label, value, subValue, valueColor = theme.colors.text }: MetricCardProps) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, { color: valueColor }]}>{value}</Text>
      {subValue && <Text style={styles.metricSubValue}>{subValue}</Text>}
    </View>
  );
}

// ============================================================================
// HELPERS
// ============================================================================

function formatNumber(num: number): string {
  if (Math.abs(num) >= 1e6) return (num / 1e6).toFixed(2) + 'M';
  if (Math.abs(num) >= 1e3) return (num / 1e3).toFixed(1) + 'K';
  return num.toFixed(2);
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  totalValue: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.colors.text,
  },
  changeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 8,
  },
  changeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  todayLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  rebalanceButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  rebalanceButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.primary,
  },
  tabText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  tabTextActive: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  content: {
    padding: 16,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  metricCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: theme.colors.surface,
    padding: 12,
    borderRadius: 8,
  },
  metricLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 4,
  },
  metricSubValue: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 12,
  },
  holdingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  holdingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  holdingRank: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  holdingRankText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  holdingSymbol: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text,
  },
  holdingName: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    maxWidth: 120,
  },
  holdingRight: {
    alignItems: 'flex-end',
  },
  holdingValue: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text,
  },
  holdingChange: {
    fontSize: 12,
    fontWeight: '500',
  },
  chartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  chartLabels: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
  chartLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 4,
  },
  colorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  labelText: {
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  riskScoreCard: {
    backgroundColor: theme.colors.surface,
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 24,
  },
  riskScoreLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  riskScoreValue: {
    fontSize: 48,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  riskScoreSubtext: {
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  riskRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  riskLabel: {
    fontSize: 14,
    color: theme.colors.text,
  },
  riskRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  riskValue: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
  },
  riskBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  riskBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  betaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  betaSymbol: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text,
  },
  betaValue: {
    fontSize: 14,
    color: '#F59E0B',
    fontWeight: '500',
  },
  emptyText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    paddingVertical: 16,
  },
});

export default PortfolioAnalyticsScreen;
