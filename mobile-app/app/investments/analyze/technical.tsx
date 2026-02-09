/**
 * Fynvita Technical Analysis Screen
 * Detailed technical indicators and chart patterns
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { lightTheme as theme } from '../../../src/constants/theme';
import { Card } from '../../../src/components/Card';
import { LineChart, AreaChart } from '../../../src/components/charts';

const { width: screenWidth } = Dimensions.get('window');

interface TechnicalIndicator {
  name: string;
  value: number | string;
  signal: 'bullish' | 'bearish' | 'neutral';
  description: string;
}

const PRICE_DATA = [
  { value: 172.50, label: 'Mon' },
  { value: 174.20, label: 'Tue' },
  { value: 173.80, label: 'Wed' },
  { value: 176.40, label: 'Thu' },
  { value: 178.90, label: 'Fri' },
  { value: 177.60, label: 'Sat' },
  { value: 180.25, label: 'Sun' },
];

const MOVING_AVERAGES: TechnicalIndicator[] = [
  { name: 'SMA 20', value: 175.40, signal: 'bullish', description: 'Price above 20-day average' },
  { name: 'SMA 50', value: 172.80, signal: 'bullish', description: 'Price above 50-day average' },
  { name: 'SMA 200', value: 165.20, signal: 'bullish', description: 'Long-term uptrend confirmed' },
  { name: 'EMA 12', value: 177.50, signal: 'bullish', description: 'Short-term momentum positive' },
  { name: 'EMA 26', value: 174.20, signal: 'bullish', description: 'Medium-term trend bullish' },
];

const OSCILLATORS: TechnicalIndicator[] = [
  { name: 'RSI (14)', value: 62.5, signal: 'neutral', description: 'Momentum neutral, not overbought' },
  { name: 'MACD', value: 2.34, signal: 'bullish', description: 'MACD line above signal line' },
  { name: 'Stochastic %K', value: 78.2, signal: 'neutral', description: 'Approaching overbought territory' },
  { name: 'CCI (20)', value: 125.6, signal: 'bullish', description: 'Strong upward momentum' },
  { name: 'Williams %R', value: -22.4, signal: 'neutral', description: 'Near overbought zone' },
  { name: 'ADX', value: 28.5, signal: 'bullish', description: 'Strong trend in progress' },
];

const SUPPORT_RESISTANCE = [
  { type: 'resistance', level: 185.00, strength: 'strong' },
  { type: 'resistance', level: 182.50, strength: 'moderate' },
  { type: 'current', level: 180.25, strength: 'current' },
  { type: 'support', level: 175.00, strength: 'moderate' },
  { type: 'support', level: 170.00, strength: 'strong' },
];

const CHART_PATTERNS = [
  { name: 'Bullish Flag', confidence: 78, timeframe: '4H', target: 188.50 },
  { name: 'Ascending Triangle', confidence: 65, timeframe: 'Daily', target: 192.00 },
  { name: 'Cup and Handle', confidence: 52, timeframe: 'Weekly', target: 200.00 },
];

export default function TechnicalAnalysisScreen() {
  const { symbol } = useLocalSearchParams<{ symbol: string }>();
  const [timeframe, setTimeframe] = useState('1D');

  const timeframes = ['1H', '4H', '1D', '1W', '1M'];

  const getSignalColor = (signal: string) => {
    switch (signal) {
      case 'bullish': return theme.colors.success;
      case 'bearish': return theme.colors.error;
      default: return theme.colors.warning;
    }
  };

  const getSignalIcon = (signal: string) => {
    switch (signal) {
      case 'bullish': return 'arrow-up-circle';
      case 'bearish': return 'arrow-down-circle';
      default: return 'remove-circle';
    }
  };

  const bullishCount = [...MOVING_AVERAGES, ...OSCILLATORS].filter(i => i.signal === 'bullish').length;
  const bearishCount = [...MOVING_AVERAGES, ...OSCILLATORS].filter(i => i.signal === 'bearish').length;
  const neutralCount = [...MOVING_AVERAGES, ...OSCILLATORS].filter(i => i.signal === 'neutral').length;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Technical Analysis</Text>
          <Text style={styles.symbol}>{symbol || 'AAPL'}</Text>
        </View>

        {/* Summary Card */}
        <Card style={styles.summaryCard}>
          <Text style={styles.sectionTitle}>Technical Summary</Text>
          <View style={styles.summaryGrid}>
            <View style={[styles.summaryItem, styles.bullishBg]}>
              <Ionicons name="arrow-up-circle" size={24} color={theme.colors.success} />
              <Text style={styles.summaryCount}>{bullishCount}</Text>
              <Text style={styles.summaryLabel}>Bullish</Text>
            </View>
            <View style={[styles.summaryItem, styles.neutralBg]}>
              <Ionicons name="remove-circle" size={24} color={theme.colors.warning} />
              <Text style={styles.summaryCount}>{neutralCount}</Text>
              <Text style={styles.summaryLabel}>Neutral</Text>
            </View>
            <View style={[styles.summaryItem, styles.bearishBg]}>
              <Ionicons name="arrow-down-circle" size={24} color={theme.colors.error} />
              <Text style={styles.summaryCount}>{bearishCount}</Text>
              <Text style={styles.summaryLabel}>Bearish</Text>
            </View>
          </View>
          <View style={styles.overallSignal}>
            <Text style={styles.overallLabel}>Overall Signal:</Text>
            <Text style={[styles.overallValue, { color: theme.colors.success }]}>BUY</Text>
          </View>
        </Card>

        {/* Timeframe Selector */}
        <View style={styles.timeframeContainer}>
          {timeframes.map((tf) => (
            <TouchableOpacity
              key={tf}
              style={[styles.timeframeButton, timeframe === tf && styles.timeframeActive]}
              onPress={() => setTimeframe(tf)}
            >
              <Text style={[styles.timeframeText, timeframe === tf && styles.timeframeTextActive]}>{tf}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Price Chart */}
        <Card style={styles.chartCard}>
          <Text style={styles.sectionTitle}>Price Action</Text>
          <AreaChart
            data={PRICE_DATA}
            height={180}
            color={theme.colors.primary}
            showLabels
            showDots
            gradientOpacity={0.2}
          />
        </Card>

        {/* Moving Averages */}
        <Card style={styles.indicatorCard}>
          <Text style={styles.sectionTitle}>Moving Averages</Text>
          {MOVING_AVERAGES.map((indicator, idx) => (
            <View key={idx} style={styles.indicatorRow}>
              <View style={styles.indicatorInfo}>
                <Text style={styles.indicatorName}>{indicator.name}</Text>
                <Text style={styles.indicatorDesc}>{indicator.description}</Text>
              </View>
              <View style={styles.indicatorRight}>
                <Text style={styles.indicatorValue}>
                  {typeof indicator.value === 'number' ? `$${indicator.value.toFixed(2)}` : indicator.value}
                </Text>
                <Ionicons
                  name={getSignalIcon(indicator.signal) as keyof typeof Ionicons.glyphMap}
                  size={20}
                  color={getSignalColor(indicator.signal)}
                />
              </View>
            </View>
          ))}
        </Card>

        {/* Oscillators */}
        <Card style={styles.indicatorCard}>
          <Text style={styles.sectionTitle}>Oscillators</Text>
          {OSCILLATORS.map((indicator, idx) => (
            <View key={idx} style={styles.indicatorRow}>
              <View style={styles.indicatorInfo}>
                <Text style={styles.indicatorName}>{indicator.name}</Text>
                <Text style={styles.indicatorDesc}>{indicator.description}</Text>
              </View>
              <View style={styles.indicatorRight}>
                <Text style={styles.indicatorValue}>
                  {typeof indicator.value === 'number' ? indicator.value.toFixed(2) : indicator.value}
                </Text>
                <Ionicons
                  name={getSignalIcon(indicator.signal) as keyof typeof Ionicons.glyphMap}
                  size={20}
                  color={getSignalColor(indicator.signal)}
                />
              </View>
            </View>
          ))}
        </Card>

        {/* Support & Resistance */}
        <Card style={styles.srCard}>
          <Text style={styles.sectionTitle}>Support & Resistance</Text>
          {SUPPORT_RESISTANCE.map((level, idx) => (
            <View key={idx} style={styles.srRow}>
              <View style={[
                styles.srBadge,
                level.type === 'resistance' && styles.resistanceBadge,
                level.type === 'support' && styles.supportBadge,
                level.type === 'current' && styles.currentBadge,
              ]}>
                <Text style={styles.srBadgeText}>
                  {level.type === 'current' ? 'Current Price' : level.type.charAt(0).toUpperCase() + level.type.slice(1)}
                </Text>
              </View>
              <View style={styles.srLevel}>
                <View style={[
                  styles.srLine,
                  level.type === 'current' && styles.currentLine,
                ]} />
                <Text style={[
                  styles.srPrice,
                  level.type === 'current' && styles.currentPrice,
                ]}>
                  ${level.level.toFixed(2)}
                </Text>
              </View>
              <Text style={styles.srStrength}>{level.strength}</Text>
            </View>
          ))}
        </Card>

        {/* Chart Patterns */}
        <Card style={styles.patternsCard}>
          <Text style={styles.sectionTitle}>Detected Patterns</Text>
          {CHART_PATTERNS.map((pattern, idx) => (
            <View key={idx} style={styles.patternRow}>
              <View style={styles.patternInfo}>
                <Text style={styles.patternName}>{pattern.name}</Text>
                <Text style={styles.patternTimeframe}>{pattern.timeframe} Chart</Text>
              </View>
              <View style={styles.patternRight}>
                <View style={styles.confidenceBar}>
                  <View style={[styles.confidenceFill, { width: `${pattern.confidence}%` }]} />
                </View>
                <Text style={styles.patternTarget}>Target: ${pattern.target.toFixed(2)}</Text>
              </View>
            </View>
          ))}
        </Card>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scrollView: { flex: 1, padding: theme.spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.lg },
  backButton: { padding: 4, marginRight: 12 },
  title: { flex: 1, fontSize: 20, fontWeight: '700', color: theme.colors.text },
  symbol: { fontSize: 16, fontWeight: '600', color: theme.colors.primary },
  summaryCard: { marginBottom: theme.spacing.md },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: theme.colors.text, marginBottom: theme.spacing.md },
  summaryGrid: { flexDirection: 'row', gap: 12 },
  summaryItem: { flex: 1, alignItems: 'center', padding: 12, borderRadius: 12 },
  bullishBg: { backgroundColor: '#22C55E15' },
  neutralBg: { backgroundColor: '#F59E0B15' },
  bearishBg: { backgroundColor: '#EF444415' },
  summaryCount: { fontSize: 24, fontWeight: '700', color: theme.colors.text, marginTop: 4 },
  summaryLabel: { fontSize: 12, color: theme.colors.textSecondary },
  overallSignal: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: theme.colors.border },
  overallLabel: { fontSize: 14, color: theme.colors.textSecondary },
  overallValue: { fontSize: 18, fontWeight: '700', marginLeft: 8 },
  timeframeContainer: { flexDirection: 'row', marginBottom: theme.spacing.md, gap: 8 },
  timeframeButton: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8, backgroundColor: theme.colors.surface },
  timeframeActive: { backgroundColor: theme.colors.primary },
  timeframeText: { fontSize: 13, fontWeight: '600', color: theme.colors.textSecondary },
  timeframeTextActive: { color: '#fff' },
  chartCard: { marginBottom: theme.spacing.md },
  indicatorCard: { marginBottom: theme.spacing.md },
  indicatorRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  indicatorInfo: { flex: 1 },
  indicatorName: { fontSize: 14, fontWeight: '600', color: theme.colors.text },
  indicatorDesc: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
  indicatorRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  indicatorValue: { fontSize: 14, fontWeight: '600', color: theme.colors.text },
  srCard: { marginBottom: theme.spacing.md },
  srRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  srBadge: { width: 90, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6, alignItems: 'center' },
  resistanceBadge: { backgroundColor: '#EF444420' },
  supportBadge: { backgroundColor: '#22C55E20' },
  currentBadge: { backgroundColor: theme.colors.primary + '20' },
  srBadgeText: { fontSize: 11, fontWeight: '600', color: theme.colors.text },
  srLevel: { flex: 1, flexDirection: 'row', alignItems: 'center', marginHorizontal: 12 },
  srLine: { flex: 1, height: 1, backgroundColor: theme.colors.border },
  currentLine: { backgroundColor: theme.colors.primary, height: 2 },
  srPrice: { fontSize: 14, fontWeight: '600', color: theme.colors.text, marginLeft: 8 },
  currentPrice: { color: theme.colors.primary },
  srStrength: { fontSize: 12, color: theme.colors.textSecondary, width: 60, textAlign: 'right' },
  patternsCard: { marginBottom: theme.spacing.md },
  patternRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  patternInfo: { flex: 1 },
  patternName: { fontSize: 14, fontWeight: '600', color: theme.colors.text },
  patternTimeframe: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
  patternRight: { alignItems: 'flex-end' },
  confidenceBar: { width: 80, height: 6, backgroundColor: theme.colors.border, borderRadius: 3, overflow: 'hidden' },
  confidenceFill: { height: '100%', backgroundColor: theme.colors.primary, borderRadius: 3 },
  patternTarget: { fontSize: 12, color: theme.colors.success, marginTop: 4 },
});
