/**
 * CPFI Stock Analysis Screen
 * AI-powered stock analysis with buy/sell/hold recommendations
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
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { lightTheme as theme } from '../../src/constants/theme';
import { Card } from '../../src/components/Card';
import {
  investmentsApi,
  type StockAnalysis as ApiStockAnalysis,
} from '../../src/services/api';

type Recommendation = 'strong_buy' | 'buy' | 'hold' | 'sell' | 'strong_sell';

interface StockData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  high52w: number;
  low52w: number;
  marketCap: string;
  peRatio: number;
  dividend: number;
  volume: string;
  avgVolume: string;
}

interface Analysis {
  recommendation: Recommendation;
  confidence: number;
  targetPrice: number;
  summary: string;
  bullishFactors: string[];
  bearishFactors: string[];
  technicalSignals: { rsi: number; macd: string; movingAvg: string };
}

// Transform API response to local format
function transformAnalysis(apiAnalysis: ApiStockAnalysis): {
  stock: StockData;
  analysis: Analysis;
} {
  const formatVolume = (vol: number): string => {
    if (vol >= 1e9) return `${(vol / 1e9).toFixed(1)}B`;
    if (vol >= 1e6) return `${(vol / 1e6).toFixed(1)}M`;
    if (vol >= 1e3) return `${(vol / 1e3).toFixed(1)}K`;
    return vol.toString();
  };

  const formatMarketCap = (cap: number): string => {
    if (cap >= 1e12) return `${(cap / 1e12).toFixed(2)}T`;
    if (cap >= 1e9) return `${(cap / 1e9).toFixed(2)}B`;
    if (cap >= 1e6) return `${(cap / 1e6).toFixed(2)}M`;
    return cap.toString();
  };

  return {
    stock: {
      symbol: apiAnalysis.symbol,
      name: apiAnalysis.company_name,
      price: apiAnalysis.current_price,
      change: apiAnalysis.price_change,
      changePercent: apiAnalysis.price_change_percent,
      high52w: apiAnalysis.high_52_week,
      low52w: apiAnalysis.low_52_week,
      marketCap: formatMarketCap(apiAnalysis.market_cap),
      peRatio: apiAnalysis.pe_ratio || 0,
      dividend: apiAnalysis.dividend_yield || 0,
      volume: formatVolume(apiAnalysis.volume),
      avgVolume: formatVolume(apiAnalysis.avg_volume),
    },
    analysis: {
      recommendation: apiAnalysis.recommendation as Recommendation,
      confidence: apiAnalysis.confidence_score,
      targetPrice: apiAnalysis.target_price,
      summary: apiAnalysis.analysis_summary,
      bullishFactors: apiAnalysis.bullish_factors,
      bearishFactors: apiAnalysis.bearish_factors,
      technicalSignals: {
        rsi: apiAnalysis.technical_indicators.rsi,
        macd: apiAnalysis.technical_indicators.macd_signal,
        movingAvg: apiAnalysis.technical_indicators.moving_average_signal,
      },
    },
  };
}

export default function StockAnalysisScreen() {
  const { symbol } = useLocalSearchParams<{ symbol: string }>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stock, setStock] = useState<StockData | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);

  const fetchAnalysis = useCallback(async () => {
    const sym = symbol?.toUpperCase() || 'AAPL';
    try {
      setError(null);
      const response = await investmentsApi.analyzeStock(sym);
      if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'Failed to analyze stock');
      }
      const transformed = transformAnalysis(response.data.analysis);
      setStock(transformed.stock);
      setAnalysis(transformed.analysis);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to analyze stock';
      setError(errorMessage);
      console.error('Stock analysis error:', err);
    }
  }, [symbol]);

  useEffect(() => {
    fetchAnalysis().finally(() => setLoading(false));
  }, [fetchAnalysis]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAnalysis();
    setRefreshing(false);
  }, [fetchAnalysis]);

  const handleRetry = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchAnalysis().finally(() => setLoading(false));
  }, [fetchAnalysis]);

  const getRecommendationColor = (rec: Recommendation) => {
    const colors: Record<Recommendation, string> = {
      strong_buy: '#22C55E',
      buy: '#84CC16',
      hold: '#F59E0B',
      sell: '#F97316',
      strong_sell: '#EF4444',
    };
    return colors[rec];
  };
  const getRecommendationLabel = (rec: Recommendation) =>
    rec.replace('_', ' ').toUpperCase();
  const formatCurrency = (n: number) =>
    `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>
            Analyzing {symbol?.toUpperCase()}...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>{symbol?.toUpperCase()}</Text>
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color={theme.colors.error} />
          <Text style={styles.errorTitle}>Analysis Failed</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
            <Ionicons name="refresh" size={20} color="#fff" />
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!stock || !analysis) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Stock Not Found</Text>
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
            <Text style={styles.title}>{stock.symbol}</Text>
            <Text style={styles.subtitle}>{stock.name}</Text>
          </View>
          <TouchableOpacity style={styles.shareButton}>
            <Ionicons
              name="share-outline"
              size={22}
              color={theme.colors.text}
            />
          </TouchableOpacity>
        </View>

        {/* Price Card */}
        <Card style={styles.priceCard}>
          <Text style={styles.priceValue}>{formatCurrency(stock.price)}</Text>
          <View
            style={[
              styles.changeBadge,
              {
                backgroundColor:
                  stock.change >= 0
                    ? `${theme.colors.success}15`
                    : `${theme.colors.error}15`,
              },
            ]}
          >
            <Ionicons
              name={stock.change >= 0 ? 'arrow-up' : 'arrow-down'}
              size={14}
              color={
                stock.change >= 0 ? theme.colors.success : theme.colors.error
              }
            />
            <Text
              style={[
                styles.changeText,
                {
                  color:
                    stock.change >= 0
                      ? theme.colors.success
                      : theme.colors.error,
                },
              ]}
            >
              {stock.change >= 0 ? '+' : ''}
              {formatCurrency(stock.change)} (
              {stock.changePercent >= 0 ? '+' : ''}
              {stock.changePercent.toFixed(2)}%)
            </Text>
          </View>
        </Card>

        {/* AI Recommendation */}
        <Card style={styles.recommendationCard}>
          <View style={styles.recHeader}>
            <Ionicons name="sparkles" size={20} color={theme.colors.primary} />
            <Text style={styles.recTitle}> AI Recommendation</Text>
          </View>
          <View
            style={[
              styles.recBadge,
              {
                backgroundColor: `${getRecommendationColor(analysis.recommendation)}20`,
              },
            ]}
          >
            <Text
              style={[
                styles.recText,
                { color: getRecommendationColor(analysis.recommendation) },
              ]}
            >
              {getRecommendationLabel(analysis.recommendation)}
            </Text>
          </View>
          <View style={styles.confidenceRow}>
            <Text style={styles.confidenceLabel}>Confidence:</Text>
            <View style={styles.confidenceBar}>
              <View
                style={[
                  styles.confidenceFill,
                  {
                    width: `${analysis.confidence}%`,
                    backgroundColor: getRecommendationColor(
                      analysis.recommendation
                    ),
                  },
                ]}
              />
            </View>
            <Text style={styles.confidenceValue}>{analysis.confidence}%</Text>
          </View>
          <View style={styles.targetRow}>
            <Text style={styles.targetLabel}>Target Price:</Text>
            <Text style={styles.targetValue}>
              {formatCurrency(analysis.targetPrice)}
            </Text>
            <Text
              style={[
                styles.targetDiff,
                {
                  color:
                    analysis.targetPrice > stock.price
                      ? theme.colors.success
                      : theme.colors.error,
                },
              ]}
            >
              ({analysis.targetPrice > stock.price ? '+' : ''}
              {(
                ((analysis.targetPrice - stock.price) / stock.price) *
                100
              ).toFixed(1)}
              %)
            </Text>
          </View>
          <Text style={styles.summaryText}>{analysis.summary}</Text>
        </Card>

        {/* Key Stats */}
        <Card style={styles.statsCard}>
          <Text style={styles.sectionTitle}>Key Statistics</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Market Cap</Text>
              <Text style={styles.statValue}>{stock.marketCap}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>P/E Ratio</Text>
              <Text style={styles.statValue}>{stock.peRatio.toFixed(1)}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>52W High</Text>
              <Text style={styles.statValue}>
                {formatCurrency(stock.high52w)}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>52W Low</Text>
              <Text style={styles.statValue}>
                {formatCurrency(stock.low52w)}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Volume</Text>
              <Text style={styles.statValue}>{stock.volume}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Dividend</Text>
              <Text style={styles.statValue}>
                {stock.dividend > 0 ? formatCurrency(stock.dividend) : 'N/A'}
              </Text>
            </View>
          </View>
        </Card>

        {/* Technical Signals */}
        <Card style={styles.technicalCard}>
          <Text style={styles.sectionTitle}>Technical Signals</Text>
          <View style={styles.signalRow}>
            <Text style={styles.signalLabel}>RSI (14)</Text>
            <Text
              style={[
                styles.signalValue,
                {
                  color:
                    analysis.technicalSignals.rsi > 70
                      ? theme.colors.error
                      : analysis.technicalSignals.rsi < 30
                        ? theme.colors.success
                        : theme.colors.text,
                },
              ]}
            >
              {analysis.technicalSignals.rsi}
            </Text>
          </View>
          <View style={styles.signalRow}>
            <Text style={styles.signalLabel}>MACD</Text>
            <Text
              style={[
                styles.signalValue,
                {
                  color:
                    analysis.technicalSignals.macd === 'Bullish'
                      ? theme.colors.success
                      : analysis.technicalSignals.macd === 'Bearish'
                        ? theme.colors.error
                        : theme.colors.text,
                },
              ]}
            >
              {analysis.technicalSignals.macd}
            </Text>
          </View>
          <View style={styles.signalRow}>
            <Text style={styles.signalLabel}>Moving Avg</Text>
            <Text style={styles.signalValue}>
              {analysis.technicalSignals.movingAvg}
            </Text>
          </View>
        </Card>

        {/* Bullish/Bearish Factors */}
        <View style={styles.factorsRow}>
          <Card style={[styles.factorCard, { flex: 1, marginRight: 8 }]}>
            <View style={styles.factorHeader}>
              <Ionicons
                name="trending-up"
                size={16}
                color={theme.colors.success}
              />
              <Text
                style={[styles.factorTitle, { color: theme.colors.success }]}
              >
                {' '}
                Bullish
              </Text>
            </View>
            {analysis.bullishFactors.map((f, i) => (
              <Text key={i} style={styles.factorItem}>
                • {f}
              </Text>
            ))}
          </Card>
          <Card style={[styles.factorCard, { flex: 1, marginLeft: 8 }]}>
            <View style={styles.factorHeader}>
              <Ionicons
                name="trending-down"
                size={16}
                color={theme.colors.error}
              />
              <Text style={[styles.factorTitle, { color: theme.colors.error }]}>
                {' '}
                Bearish
              </Text>
            </View>
            {analysis.bearishFactors.map((f, i) => (
              <Text key={i} style={styles.factorItem}>
                • {f}
              </Text>
            ))}
          </Card>
        </View>

        {/* Disclaimer */}
        <View style={styles.disclaimer}>
          <Ionicons
            name="information-circle"
            size={16}
            color={theme.colors.textSecondary}
          />
          <Text style={styles.disclaimerText}>
            AI analysis is for informational purposes only. Not financial
            advice.
          </Text>
        </View>
      </ScrollView>
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
  shareButton: { padding: theme.spacing.sm },
  priceCard: {
    marginHorizontal: theme.spacing.lg,
    padding: theme.spacing.xl,
    alignItems: 'center',
  },
  priceValue: { fontSize: 40, fontWeight: '700', color: theme.colors.text },
  changeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 12,
  },
  changeText: { fontSize: 14, fontWeight: '600', marginLeft: 4 },
  recommendationCard: {
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.md,
    padding: theme.spacing.lg,
  },
  recHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  recTitle: { fontSize: 16, fontWeight: '600', color: theme.colors.text },
  recBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: theme.spacing.md,
  },
  recText: { fontSize: 16, fontWeight: '700' },
  confidenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  confidenceLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    width: 80,
  },
  confidenceBar: {
    flex: 1,
    height: 6,
    backgroundColor: theme.colors.border,
    borderRadius: 3,
    marginHorizontal: 8,
  },
  confidenceFill: { height: 6, borderRadius: 3 },
  confidenceValue: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.text,
    width: 40,
  },
  targetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  targetLabel: { fontSize: 12, color: theme.colors.textSecondary, width: 80 },
  targetValue: { fontSize: 14, fontWeight: '600', color: theme.colors.text },
  targetDiff: { fontSize: 12, marginLeft: 4 },
  summaryText: { fontSize: 13, color: theme.colors.text, lineHeight: 20 },
  statsCard: {
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.md,
    padding: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  statItem: { width: '50%', marginBottom: 12 },
  statLabel: { fontSize: 12, color: theme.colors.textSecondary },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    marginTop: 2,
  },
  technicalCard: {
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.md,
    padding: theme.spacing.lg,
  },
  signalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  signalLabel: { fontSize: 14, color: theme.colors.textSecondary },
  signalValue: { fontSize: 14, fontWeight: '600' },
  factorsRow: {
    flexDirection: 'row',
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.md,
  },
  factorCard: { padding: theme.spacing.md },
  factorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  factorTitle: { fontSize: 14, fontWeight: '600' },
  factorItem: { fontSize: 12, color: theme.colors.text, lineHeight: 20 },
  disclaimer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: theme.spacing.lg,
    marginVertical: theme.spacing.lg,
    padding: theme.spacing.md,
    backgroundColor: `${theme.colors.warning}10`,
    borderRadius: 8,
  },
  disclaimerText: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginLeft: 8,
    flex: 1,
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
