/**
 * Cryptocurrency Analysis Mobile Screen
 * 
 * Phase 5.5.3: Mobile-optimized crypto analysis with horizontal scrollable tabs,
 * interactive charts, and gesture controls
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { lightTheme as theme } from '../../src/constants/theme';
import { Card } from '../../src/components/Card';

const { width } = Dimensions.get('window');

// ============================================================================
// TYPES
// ============================================================================

interface OnChainMetrics {
  networkActivity: {
    activeAddresses24h: number;
    newAddresses24h: number;
    addressGrowthRate: number;
  };
  transactionMetrics: {
    transactionCount24h: number;
    transactionVolume24h: number;
    averageTransactionValue: number;
    averageFee: number;
  };
}

interface DeFiMetrics {
  totalValueLocked: number;
  tvlChange24h: number;
  protocolRevenue24h: number;
  yieldFarming: {
    averageAPY: number;
  };
}

interface TokenomicsAnalysis {
  supplyMetrics: {
    totalSupply: number;
    circulatingSupply: number;
    inflationRate: number;
    burnRate: number;
  };
  distribution: Array<{
    category: string;
    percentage: number;
  }>;
  vestingSchedule: Array<{
    unlockDate: Date;
    amount: number;
  }>;
}

interface CryptoSentiment {
  fearGreedIndex: number;
  socialMetrics: {
    twitterMentions24h: number;
    redditPosts24h: number;
    sentimentScore: number;
  };
  newsSentiment: {
    positiveCount: number;
    neutralCount: number;
    negativeCount: number;
  };
}

interface CryptoAnalysis {
  name: string;
  symbol: string;
  category: string;
  currentPrice: number;
  priceChange24h: number;
  marketCap: number;
  volume24h: number;
  circulatingSupply: number;
  overallScore: number;
  overallGrade: string;
  recommendation: string;
  confidence: number;
  onChainMetrics: OnChainMetrics;
  defiMetrics?: DeFiMetrics;
  tokenomics: TokenomicsAnalysis;
  aiInsights: string[];
  risks: string[];
}

type MetricTab = 'price' | 'onchain' | 'defi' | 'sentiment';

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function CryptoAnalysisScreen() {
  const params = useLocalSearchParams();
  const coinId = params.coinId as string || 'bitcoin';

  const [activeTab, setActiveTab] = useState<MetricTab>('price');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);

  // Data states
  const [analysis, setAnalysis] = useState<CryptoAnalysis | null>(null);
  const [sentiment, setSentiment] = useState<CryptoSentiment | null>(null);

  // Fetch crypto analysis
  const fetchAnalysis = useCallback(async () => {
    try {
      const [analysisRes, sentimentRes] = await Promise.all([
        fetch(`/api/investments/crypto/${coinId}`),
        fetch(`/api/investments/crypto/${coinId}/sentiment`),
      ]);

      if (analysisRes.ok && sentimentRes.ok) {
        const [analysisData, sentimentData] = await Promise.all([
          analysisRes.json(),
          sentimentRes.json(),
        ]);

        setAnalysis(analysisData.data);
        setSentiment(sentimentData.data);
      }
    } catch (error) {
      console.error('Error fetching crypto analysis:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [coinId]);

  useEffect(() => {
    fetchAnalysis();
  }, [fetchAnalysis]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAnalysis();
  }, [fetchAnalysis]);

  const handleShare = async () => {
    if (!analysis) return;
    try {
      await Share.share({
        message: `Check out ${analysis.name} (${analysis.symbol}) analysis on Fynvita Pro!`,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{analysis?.symbol.toUpperCase() || coinId}</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => setIsFavorite(!isFavorite)} style={styles.headerButton}>
            <Ionicons name={isFavorite ? 'star' : 'star-outline'} size={24} color={isFavorite ? '#F59E0B' : theme.colors.text} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleShare} style={styles.headerButton}>
            <Ionicons name="share-outline" size={24} color={theme.colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading analysis...</Text>
          </View>
        ) : analysis && sentiment ? (
          <>
            {/* Crypto Header */}
            <CryptoHeader analysis={analysis} />

            {/* Metric Tabs */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll}>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'price' && styles.tabActive]}
                onPress={() => setActiveTab('price')}
              >
                <Ionicons name="trending-up" size={20} color={activeTab === 'price' ? theme.colors.primary : theme.colors.textSecondary} />
                <Text style={[styles.tabText, activeTab === 'price' && styles.tabTextActive]}>Price</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'onchain' && styles.tabActive]}
                onPress={() => setActiveTab('onchain')}
              >
                <Ionicons name="link" size={20} color={activeTab === 'onchain' ? theme.colors.primary : theme.colors.textSecondary} />
                <Text style={[styles.tabText, activeTab === 'onchain' && styles.tabTextActive]}>On-Chain</Text>
              </TouchableOpacity>
              {analysis.defiMetrics && (
                <TouchableOpacity
                  style={[styles.tab, activeTab === 'defi' && styles.tabActive]}
                  onPress={() => setActiveTab('defi')}
                >
                  <Ionicons name="wallet" size={20} color={activeTab === 'defi' ? theme.colors.primary : theme.colors.textSecondary} />
                  <Text style={[styles.tabText, activeTab === 'defi' && styles.tabTextActive]}>DeFi</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.tab, activeTab === 'sentiment' && styles.tabActive]}
                onPress={() => setActiveTab('sentiment')}
              >
                <Ionicons name="happy" size={20} color={activeTab === 'sentiment' ? theme.colors.primary : theme.colors.textSecondary} />
                <Text style={[styles.tabText, activeTab === 'sentiment' && styles.tabTextActive]}>Sentiment</Text>
              </TouchableOpacity>
            </ScrollView>

            {/* Tab Content */}
            {activeTab === 'price' && <PriceMetrics analysis={analysis} />}
            {activeTab === 'onchain' && <OnChainMetricsCard metrics={analysis.onChainMetrics} />}
            {activeTab === 'defi' && analysis.defiMetrics && <DeFiMetricsCard metrics={analysis.defiMetrics} />}
            {activeTab === 'sentiment' && <SentimentBar sentiment={sentiment} />}

            {/* AI Insights */}
            <AIInsightsCard analysis={analysis} />
          </>
        ) : (
          <Card style={styles.errorCard}>
            <Ionicons name="alert-circle" size={48} color={theme.colors.error} />
            <Text style={styles.errorText}>Failed to load crypto analysis</Text>
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ============================================================================
// CRYPTO HEADER COMPONENT
// ============================================================================

interface CryptoHeaderProps {
  analysis: CryptoAnalysis;
}

function CryptoHeader({ analysis }: CryptoHeaderProps) {
  const isPositive = analysis.priceChange24h >= 0;

  const getGradeColor = (grade: string): string => {
    if (grade.startsWith('A')) return theme.colors.success;
    if (grade.startsWith('B')) return '#10B981';
    if (grade.startsWith('C')) return theme.colors.warning;
    if (grade.startsWith('D')) return '#F59E0B';
    return theme.colors.error;
  };

  return (
    <Card style={styles.headerCard}>
      <View style={styles.cryptoTitleRow}>
        <View style={styles.cryptoInfo}>
          <Text style={styles.cryptoName}>{analysis.name}</Text>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{analysis.category.replace('_', ' ')}</Text>
          </View>
        </View>
        <View style={[styles.gradeBadge, { backgroundColor: `${getGradeColor(analysis.overallGrade)}20` }]}>
          <Text style={[styles.gradeText, { color: getGradeColor(analysis.overallGrade) }]}>
            {analysis.overallGrade}
          </Text>
        </View>
      </View>

      <View style={styles.priceRow}>
        <Text style={styles.currentPrice}>
          ${analysis.currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </Text>
        <Text style={[styles.priceChange, { color: isPositive ? theme.colors.success : theme.colors.error }]}>
          {isPositive ? '+' : ''}{analysis.priceChange24h.toFixed(2)}%
        </Text>
      </View>

      <View style={styles.statsGrid}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Market Cap</Text>
          <Text style={styles.statValue}>${(analysis.marketCap / 1e9).toFixed(2)}B</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>24h Volume</Text>
          <Text style={styles.statValue}>${(analysis.volume24h / 1e9).toFixed(2)}B</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Circulating Supply</Text>
          <Text style={styles.statValue}>{(analysis.circulatingSupply / 1e6).toFixed(2)}M</Text>
        </View>
      </View>
    </Card>
  );
}

// ============================================================================
// PRICE METRICS COMPONENT
// ============================================================================

interface PriceMetricsProps {
  analysis: CryptoAnalysis;
}

function PriceMetrics({ analysis }: PriceMetricsProps) {
  return (
    <Card style={styles.card}>
      <Text style={styles.cardTitle}>Tokenomics</Text>

      {/* Supply Metrics */}
      <View style={styles.metricsSection}>
        <Text style={styles.sectionTitle}>Supply Metrics</Text>
        <View style={styles.metricsGrid}>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Total Supply</Text>
            <Text style={styles.metricValue}>
              {(analysis.tokenomics.supplyMetrics.totalSupply / 1e6).toFixed(2)}M
            </Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Circulating</Text>
            <Text style={styles.metricValue}>
              {(analysis.tokenomics.supplyMetrics.circulatingSupply / 1e6).toFixed(2)}M
            </Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Inflation Rate</Text>
            <Text style={[styles.metricValue, { color: analysis.tokenomics.supplyMetrics.inflationRate < 5 ? theme.colors.success : theme.colors.error }]}>
              {analysis.tokenomics.supplyMetrics.inflationRate.toFixed(2)}%
            </Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Burn Rate</Text>
            <Text style={[styles.metricValue, { color: theme.colors.success }]}>
              {analysis.tokenomics.supplyMetrics.burnRate.toFixed(2)}%
            </Text>
          </View>
        </View>
      </View>

      {/* Distribution */}
      <View style={styles.metricsSection}>
        <Text style={styles.sectionTitle}>Token Distribution</Text>
        {analysis.tokenomics.distribution.slice(0, 5).map((dist, idx) => (
          <View key={idx} style={styles.distributionItem}>
            <Text style={styles.distributionLabel}>{dist.category.replace('_', ' ')}</Text>
            <View style={styles.distributionBar}>
              <View style={[styles.distributionFill, { width: `${dist.percentage}%` }]} />
            </View>
            <Text style={styles.distributionValue}>{dist.percentage.toFixed(1)}%</Text>
          </View>
        ))}
      </View>
    </Card>
  );
}

// ============================================================================
// ON-CHAIN METRICS CARD COMPONENT
// ============================================================================

interface OnChainMetricsCardProps {
  metrics: OnChainMetrics;
}

function OnChainMetricsCard({ metrics }: OnChainMetricsCardProps) {
  return (
    <Card style={styles.card}>
      <Text style={styles.cardTitle}>On-Chain Metrics</Text>

      {/* Network Activity */}
      <View style={styles.metricsSection}>
        <Text style={styles.sectionTitle}>Network Activity</Text>
        <View style={styles.metricsGrid}>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Active Addresses (24h)</Text>
            <Text style={styles.metricValue}>
              {metrics.networkActivity.activeAddresses24h.toLocaleString()}
            </Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>New Addresses (24h)</Text>
            <Text style={styles.metricValue}>
              {metrics.networkActivity.newAddresses24h.toLocaleString()}
            </Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Address Growth</Text>
            <Text style={[styles.metricValue, { color: metrics.networkActivity.addressGrowthRate >= 0 ? theme.colors.success : theme.colors.error }]}>
              {metrics.networkActivity.addressGrowthRate >= 0 ? '+' : ''}{metrics.networkActivity.addressGrowthRate.toFixed(2)}%
            </Text>
          </View>
        </View>
      </View>

      {/* Transaction Metrics */}
      <View style={styles.metricsSection}>
        <Text style={styles.sectionTitle}>Transaction Metrics</Text>
        <View style={styles.metricsGrid}>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Transactions (24h)</Text>
            <Text style={styles.metricValue}>
              {metrics.transactionMetrics.transactionCount24h.toLocaleString()}
            </Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Volume (24h)</Text>
            <Text style={styles.metricValue}>
              ${(metrics.transactionMetrics.transactionVolume24h / 1e6).toFixed(2)}M
            </Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Avg Transaction</Text>
            <Text style={styles.metricValue}>
              ${metrics.transactionMetrics.averageTransactionValue.toFixed(2)}
            </Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Avg Fee</Text>
            <Text style={styles.metricValue}>
              ${metrics.transactionMetrics.averageFee.toFixed(4)}
            </Text>
          </View>
        </View>
      </View>
    </Card>
  );
}

// ============================================================================
// DEFI METRICS CARD COMPONENT
// ============================================================================

interface DeFiMetricsCardProps {
  metrics: DeFiMetrics;
}

function DeFiMetricsCard({ metrics }: DeFiMetricsCardProps) {
  return (
    <Card style={styles.card}>
      <Text style={styles.cardTitle}>DeFi Metrics</Text>

      <View style={styles.defiGrid}>
        <View style={styles.defiItem}>
          <Text style={styles.defiLabel}>Total Value Locked</Text>
          <Text style={styles.defiValue}>${(metrics.totalValueLocked / 1e9).toFixed(2)}B</Text>
          <Text style={[styles.defiChange, { color: metrics.tvlChange24h >= 0 ? theme.colors.success : theme.colors.error }]}>
            {metrics.tvlChange24h >= 0 ? '+' : ''}{metrics.tvlChange24h.toFixed(2)}% (24h)
          </Text>
        </View>
        <View style={styles.defiItem}>
          <Text style={styles.defiLabel}>Protocol Revenue (24h)</Text>
          <Text style={styles.defiValue}>${(metrics.protocolRevenue24h / 1e6).toFixed(2)}M</Text>
        </View>
        <View style={styles.defiItem}>
          <Text style={styles.defiLabel}>Average APY</Text>
          <Text style={[styles.defiValue, { color: theme.colors.success }]}>
            {metrics.yieldFarming.averageAPY.toFixed(2)}%
          </Text>
        </View>
      </View>
    </Card>
  );
}

// ============================================================================
// SENTIMENT BAR COMPONENT
// ============================================================================

interface SentimentBarProps {
  sentiment: CryptoSentiment;
}

function SentimentBar({ sentiment }: SentimentBarProps) {
  const getSentimentColor = (score: number): string => {
    if (score >= 70) return theme.colors.success;
    if (score >= 50) return '#10B981';
    if (score >= 30) return theme.colors.warning;
    return theme.colors.error;
  };

  const getSentimentLabel = (score: number): string => {
    if (score >= 70) return 'Extreme Greed';
    if (score >= 50) return 'Greed';
    if (score >= 30) return 'Fear';
    return 'Extreme Fear';
  };

  return (
    <>
      <Card style={styles.card}>
        <Text style={styles.cardTitle}>Market Sentiment</Text>

        {/* Fear & Greed Index */}
        <View style={styles.sentimentGauge}>
          <View style={[styles.sentimentCircle, { borderColor: getSentimentColor(sentiment.fearGreedIndex) }]}>
            <Text style={[styles.sentimentScore, { color: getSentimentColor(sentiment.fearGreedIndex) }]}>
              {sentiment.fearGreedIndex}
            </Text>
          </View>
          <Text style={styles.sentimentLabel}>{getSentimentLabel(sentiment.fearGreedIndex)}</Text>
        </View>

        {/* Social Metrics */}
        <View style={styles.metricsSection}>
          <Text style={styles.sectionTitle}>Social Metrics</Text>
          <View style={styles.socialMetrics}>
            <View style={styles.socialItem}>
              <Ionicons name="logo-twitter" size={20} color="#1DA1F2" />
              <Text style={styles.socialValue}>{sentiment.socialMetrics.twitterMentions24h.toLocaleString()}</Text>
              <Text style={styles.socialLabel}>mentions</Text>
            </View>
            <View style={styles.socialItem}>
              <Ionicons name="logo-reddit" size={20} color="#FF4500" />
              <Text style={styles.socialValue}>{sentiment.socialMetrics.redditPosts24h.toLocaleString()}</Text>
              <Text style={styles.socialLabel}>posts</Text>
            </View>
            <View style={styles.socialItem}>
              <Ionicons name="happy" size={20} color={getSentimentColor(sentiment.socialMetrics.sentimentScore * 100)} />
              <Text style={styles.socialValue}>{(sentiment.socialMetrics.sentimentScore * 100).toFixed(0)}</Text>
              <Text style={styles.socialLabel}>sentiment</Text>
            </View>
          </View>
        </View>

        {/* News Sentiment */}
        <View style={styles.metricsSection}>
          <Text style={styles.sectionTitle}>News Sentiment</Text>
          <View style={styles.newsMetrics}>
            <View style={styles.newsItem}>
              <View style={[styles.newsDot, { backgroundColor: theme.colors.success }]} />
              <Text style={styles.newsLabel}>Positive</Text>
              <Text style={styles.newsValue}>{sentiment.newsSentiment.positiveCount}</Text>
            </View>
            <View style={styles.newsItem}>
              <View style={[styles.newsDot, { backgroundColor: theme.colors.textSecondary }]} />
              <Text style={styles.newsLabel}>Neutral</Text>
              <Text style={styles.newsValue}>{sentiment.newsSentiment.neutralCount}</Text>
            </View>
            <View style={styles.newsItem}>
              <View style={[styles.newsDot, { backgroundColor: theme.colors.error }]} />
              <Text style={styles.newsLabel}>Negative</Text>
              <Text style={styles.newsValue}>{sentiment.newsSentiment.negativeCount}</Text>
            </View>
          </View>
        </View>
      </Card>
    </>
  );
}

// ============================================================================
// AI INSIGHTS CARD COMPONENT
// ============================================================================

interface AIInsightsCardProps {
  analysis: CryptoAnalysis;
}

function AIInsightsCard({ analysis }: AIInsightsCardProps) {
  const getRecommendationColor = (rec: string): string => {
    if (rec === 'strong_buy' || rec === 'buy') return theme.colors.success;
    if (rec === 'hold') return theme.colors.warning;
    return theme.colors.error;
  };

  return (
    <Card style={styles.card}>
      <Text style={styles.cardTitle}>AI Insights & Recommendations</Text>

      {/* Recommendation */}
      <View style={[styles.recommendationBadge, { backgroundColor: `${getRecommendationColor(analysis.recommendation)}20` }]}>
        <Text style={[styles.recommendationText, { color: getRecommendationColor(analysis.recommendation) }]}>
          {analysis.recommendation.replace('_', ' ').toUpperCase()}
        </Text>
        <Text style={styles.confidenceText}>
          Confidence: {(analysis.confidence * 100).toFixed(0)}%
        </Text>
      </View>

      {/* Key Insights */}
      <View style={styles.metricsSection}>
        <Text style={styles.sectionTitle}>Key Insights</Text>
        {analysis.aiInsights.slice(0, 5).map((insight, idx) => (
          <View key={idx} style={styles.insightItem}>
            <Ionicons name="checkmark-circle" size={16} color={theme.colors.primary} />
            <Text style={styles.insightText}>{insight}</Text>
          </View>
        ))}
      </View>

      {/* Risks */}
      {analysis.risks.length > 0 && (
        <View style={styles.metricsSection}>
          <Text style={styles.sectionTitle}>Risk Factors</Text>
          {analysis.risks.slice(0, 3).map((risk, idx) => (
            <View key={idx} style={styles.insightItem}>
              <Ionicons name="warning" size={16} color={theme.colors.error} />
              <Text style={styles.insightText}>{risk}</Text>
            </View>
          ))}
        </View>
      )}
    </Card>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerButton: {
    padding: theme.spacing.sm,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
  },
  headerActions: {
    flexDirection: 'row',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    padding: theme.spacing.xl,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  errorCard: {
    margin: theme.spacing.lg,
    padding: theme.spacing.xl,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 14,
    color: theme.colors.error,
    marginTop: theme.spacing.md,
  },
  tabsScroll: {
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    marginHorizontal: 4,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.primary,
  },
  tabText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginLeft: theme.spacing.xs,
    fontWeight: '500',
  },
  tabTextActive: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  headerCard: {
    margin: theme.spacing.lg,
    padding: theme.spacing.md,
  },
  cryptoTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  cryptoInfo: {
    flex: 1,
  },
  cryptoName: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  categoryBadge: {
    backgroundColor: `${theme.colors.primary}20`,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
    alignSelf: 'flex-start',
  },
  categoryText: {
    fontSize: 11,
    color: theme.colors.primary,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  gradeBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradeText: {
    fontSize: 20,
    fontWeight: '700',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: theme.spacing.md,
  },
  currentPrice: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.colors.text,
    marginRight: theme.spacing.sm,
  },
  priceChange: {
    fontSize: 16,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    flex: 1,
  },
  statLabel: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
  },
  card: {
    margin: theme.spacing.lg,
    padding: theme.spacing.md,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  metricsSection: {
    marginTop: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  metricItem: {
    width: '50%',
    marginBottom: theme.spacing.md,
  },
  metricLabel: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
  },
  distributionItem: {
    marginBottom: theme.spacing.md,
  },
  distributionLabel: {
    fontSize: 12,
    color: theme.colors.text,
    marginBottom: 4,
    textTransform: 'capitalize',
  },
  distributionBar: {
    height: 8,
    backgroundColor: theme.colors.border,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 4,
  },
  distributionFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: 4,
  },
  distributionValue: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    textAlign: 'right',
  },
  defiGrid: {
    marginTop: theme.spacing.sm,
  },
  defiItem: {
    marginBottom: theme.spacing.md,
  },
  defiLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  defiValue: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 4,
  },
  defiChange: {
    fontSize: 13,
    fontWeight: '600',
  },
  sentimentGauge: {
    alignItems: 'center',
    paddingVertical: theme.spacing.lg,
  },
  sentimentCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.md,
  },
  sentimentScore: {
    fontSize: 36,
    fontWeight: '700',
  },
  sentimentLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  socialMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  socialItem: {
    alignItems: 'center',
  },
  socialValue: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
    marginTop: theme.spacing.xs,
  },
  socialLabel: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  newsMetrics: {
    marginTop: theme.spacing.sm,
  },
  newsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
  },
  newsDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: theme.spacing.sm,
  },
  newsLabel: {
    fontSize: 13,
    color: theme.colors.text,
    flex: 1,
  },
  newsValue: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
  },
  recommendationBadge: {
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  recommendationText: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  confidenceText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  insightItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.sm,
  },
  insightText: {
    fontSize: 13,
    color: theme.colors.text,
    marginLeft: theme.spacing.sm,
    flex: 1,
    lineHeight: 20,
  },
});

