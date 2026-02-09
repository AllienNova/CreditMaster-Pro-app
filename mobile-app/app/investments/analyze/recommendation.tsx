/**
 * Fynvita AI Recommendation Screen
 * AI-powered investment recommendation with price targets and risk assessment
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { lightTheme as theme } from '../../../src/constants/theme';
import { Card } from '../../../src/components/Card';
import { AreaChart, BarChart } from '../../../src/components/charts';

interface RiskFactor {
  factor: string;
  impact: 'high' | 'medium' | 'low';
  description: string;
}

const RECOMMENDATION = {
  action: 'BUY',
  confidence: 78,
  timeframe: 'Medium-term (6-12 months)',
  updatedAt: 'Jan 8, 2026',
};

const PRICE_TARGETS = {
  current: 180.25,
  entry: 175.00,
  target: 210.00,
  stopLoss: 160.00,
  bull: 240.00,
  base: 210.00,
  bear: 165.00,
};

const RISK_ASSESSMENT = {
  level: 'Moderate',
  score: 45,
  volatility: 28.5,
  beta: 1.24,
  maxDrawdown: -18.5,
};

const RISK_FACTORS: RiskFactor[] = [
  { factor: 'Market Risk', impact: 'medium', description: 'Tech sector volatility and market corrections' },
  { factor: 'Competition', impact: 'medium', description: 'Increasing competition in smartphone market' },
  { factor: 'Regulatory', impact: 'high', description: 'Antitrust investigations in multiple jurisdictions' },
  { factor: 'Supply Chain', impact: 'low', description: 'Diversified manufacturing reducing concentration risk' },
  { factor: 'Currency', impact: 'low', description: 'Strong dollar may impact international revenue' },
];

const BULL_CASE = [
  'iPhone 16 supercycle drives 15%+ revenue growth',
  'Services segment continues 20%+ annual growth',
  'AI features create new monetization opportunities',
  'Vision Pro establishes new product category',
  'Share buybacks continue supporting EPS growth',
];

const BEAR_CASE = [
  'iPhone demand weakens in key markets',
  'Services growth decelerates significantly',
  'Regulatory actions impact App Store revenue',
  'Competition erodes market share',
  'Valuation compression as rates stay elevated',
];

const POSITION_SIZING = {
  suggested: '3-5%',
  maxPosition: '7%',
  riskReward: '2.8:1',
  expectedReturn: '+16.5%',
  maxLoss: '-8.5%',
};

const SCORE_BREAKDOWN = [
  { label: 'Technical', value: 82 },
  { label: 'Fundamental', value: 75 },
  { label: 'Sentiment', value: 72 },
  { label: 'Momentum', value: 85 },
  { label: 'Value', value: 58 },
];

const PRICE_PROJECTION = [
  { value: 180, label: 'Now' },
  { value: 185, label: 'Q1' },
  { value: 195, label: 'Q2' },
  { value: 205, label: 'Q3' },
  { value: 210, label: 'Q4' },
];

export default function RecommendationScreen() {
  const { symbol } = useLocalSearchParams<{ symbol: string }>();
  const [selectedTimeframe, setSelectedTimeframe] = useState('medium');
  const [selectedRisk, setSelectedRisk] = useState('moderate');

  const timeframes = [
    { id: 'short', label: 'Short', desc: '1-3 months' },
    { id: 'medium', label: 'Medium', desc: '6-12 months' },
    { id: 'long', label: 'Long', desc: '1-3 years' },
  ];

  const riskTolerances = [
    { id: 'conservative', label: 'Conservative' },
    { id: 'moderate', label: 'Moderate' },
    { id: 'aggressive', label: 'Aggressive' },
  ];

  const getActionColor = (action: string) => {
    switch (action) {
      case 'BUY': return theme.colors.success;
      case 'SELL': return theme.colors.error;
      case 'HOLD': return theme.colors.warning;
      default: return theme.colors.textSecondary;
    }
  };

  const getRiskColor = (impact: string) => {
    switch (impact) {
      case 'high': return theme.colors.error;
      case 'medium': return theme.colors.warning;
      default: return theme.colors.success;
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>AI Recommendation</Text>
          <Text style={styles.symbol}>{symbol || 'AAPL'}</Text>
        </View>

        {/* Main Recommendation Card */}
        <Card style={[styles.recommendationCard, { borderLeftColor: getActionColor(RECOMMENDATION.action) }]}>
          <View style={styles.recHeader}>
            <View style={[styles.actionBadge, { backgroundColor: getActionColor(RECOMMENDATION.action) }]}>
              <Ionicons
                name={RECOMMENDATION.action === 'BUY' ? 'trending-up' :
                      RECOMMENDATION.action === 'SELL' ? 'trending-down' : 'remove'}
                size={24}
                color="#fff"
              />
              <Text style={styles.actionText}>{RECOMMENDATION.action}</Text>
            </View>
            <View style={styles.confidenceContainer}>
              <Text style={styles.confidenceLabel}>AI Confidence</Text>
              <Text style={[styles.confidenceValue, { color: getActionColor(RECOMMENDATION.action) }]}>
                {RECOMMENDATION.confidence}%
              </Text>
            </View>
          </View>
          <View style={styles.recMeta}>
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={16} color={theme.colors.textSecondary} />
              <Text style={styles.metaText}>{RECOMMENDATION.timeframe}</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="refresh-outline" size={16} color={theme.colors.textSecondary} />
              <Text style={styles.metaText}>Updated {RECOMMENDATION.updatedAt}</Text>
            </View>
          </View>
        </Card>

        {/* Settings */}
        <Card style={styles.settingsCard}>
          <Text style={styles.sectionTitle}>Customize Analysis</Text>

          <Text style={styles.settingLabel}>Investment Timeframe</Text>
          <View style={styles.optionRow}>
            {timeframes.map((tf) => (
              <TouchableOpacity
                key={tf.id}
                style={[styles.optionButton, selectedTimeframe === tf.id && styles.optionActive]}
                onPress={() => setSelectedTimeframe(tf.id)}
              >
                <Text style={[styles.optionLabel, selectedTimeframe === tf.id && styles.optionLabelActive]}>
                  {tf.label}
                </Text>
                <Text style={[styles.optionDesc, selectedTimeframe === tf.id && styles.optionDescActive]}>
                  {tf.desc}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.settingLabel}>Risk Tolerance</Text>
          <View style={styles.optionRow}>
            {riskTolerances.map((risk) => (
              <TouchableOpacity
                key={risk.id}
                style={[styles.riskButton, selectedRisk === risk.id && styles.riskActive]}
                onPress={() => setSelectedRisk(risk.id)}
              >
                <Text style={[styles.riskLabel, selectedRisk === risk.id && styles.riskLabelActive]}>
                  {risk.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        {/* Price Targets */}
        <Card style={styles.targetCard}>
          <Text style={styles.sectionTitle}>Price Targets</Text>

          <View style={styles.priceRow}>
            <View style={styles.priceItem}>
              <Text style={styles.priceLabel}>Entry</Text>
              <Text style={styles.priceValue}>${PRICE_TARGETS.entry}</Text>
            </View>
            <View style={styles.priceItem}>
              <Text style={styles.priceLabel}>Target</Text>
              <Text style={[styles.priceValue, { color: theme.colors.success }]}>
                ${PRICE_TARGETS.target}
              </Text>
            </View>
            <View style={styles.priceItem}>
              <Text style={styles.priceLabel}>Stop Loss</Text>
              <Text style={[styles.priceValue, { color: theme.colors.error }]}>
                ${PRICE_TARGETS.stopLoss}
              </Text>
            </View>
          </View>

          <View style={styles.scenarioSection}>
            <Text style={styles.scenarioTitle}>Price Scenarios</Text>
            <View style={styles.scenarioRow}>
              <View style={[styles.scenarioBadge, styles.bullBadge]}>
                <Ionicons name="rocket" size={16} color={theme.colors.success} />
                <Text style={styles.scenarioLabel}>Bull</Text>
                <Text style={styles.scenarioPrice}>${PRICE_TARGETS.bull}</Text>
              </View>
              <View style={[styles.scenarioBadge, styles.baseBadge]}>
                <Ionicons name="analytics" size={16} color={theme.colors.primary} />
                <Text style={styles.scenarioLabel}>Base</Text>
                <Text style={styles.scenarioPrice}>${PRICE_TARGETS.base}</Text>
              </View>
              <View style={[styles.scenarioBadge, styles.bearBadge]}>
                <Ionicons name="trending-down" size={16} color={theme.colors.error} />
                <Text style={styles.scenarioLabel}>Bear</Text>
                <Text style={styles.scenarioPrice}>${PRICE_TARGETS.bear}</Text>
              </View>
            </View>
          </View>

          <AreaChart
            data={PRICE_PROJECTION}
            height={150}
            color={theme.colors.success}
            showLabels
            gradientOpacity={0.3}
          />
        </Card>

        {/* Analysis Breakdown */}
        <Card style={styles.breakdownCard}>
          <Text style={styles.sectionTitle}>Analysis Breakdown</Text>
          <BarChart
            data={SCORE_BREAKDOWN}
            height={180}
            barColor={theme.colors.primary}
            showLabels
            horizontal
          />
        </Card>

        {/* Risk Assessment */}
        <Card style={styles.riskCard}>
          <View style={styles.riskHeader}>
            <Text style={styles.sectionTitle}>Risk Assessment</Text>
            <View style={[styles.riskLevelBadge, { backgroundColor: theme.colors.warning + '20' }]}>
              <Text style={[styles.riskLevelText, { color: theme.colors.warning }]}>
                {RISK_ASSESSMENT.level}
              </Text>
            </View>
          </View>

          <View style={styles.riskMetrics}>
            <View style={styles.riskMetricItem}>
              <Text style={styles.riskMetricValue}>{RISK_ASSESSMENT.score}</Text>
              <Text style={styles.riskMetricLabel}>Risk Score</Text>
            </View>
            <View style={styles.riskMetricItem}>
              <Text style={styles.riskMetricValue}>{RISK_ASSESSMENT.volatility}%</Text>
              <Text style={styles.riskMetricLabel}>Volatility</Text>
            </View>
            <View style={styles.riskMetricItem}>
              <Text style={styles.riskMetricValue}>{RISK_ASSESSMENT.beta}</Text>
              <Text style={styles.riskMetricLabel}>Beta</Text>
            </View>
            <View style={styles.riskMetricItem}>
              <Text style={[styles.riskMetricValue, { color: theme.colors.error }]}>
                {RISK_ASSESSMENT.maxDrawdown}%
              </Text>
              <Text style={styles.riskMetricLabel}>Max DD</Text>
            </View>
          </View>

          <Text style={styles.riskFactorsTitle}>Key Risk Factors</Text>
          {RISK_FACTORS.map((risk, idx) => (
            <View key={idx} style={styles.riskFactorRow}>
              <View style={[styles.impactBadge, { backgroundColor: getRiskColor(risk.impact) + '20' }]}>
                <Text style={[styles.impactText, { color: getRiskColor(risk.impact) }]}>
                  {risk.impact.toUpperCase()}
                </Text>
              </View>
              <View style={styles.riskFactorInfo}>
                <Text style={styles.riskFactorName}>{risk.factor}</Text>
                <Text style={styles.riskFactorDesc}>{risk.description}</Text>
              </View>
            </View>
          ))}
        </Card>

        {/* Investment Thesis */}
        <Card style={styles.thesisCard}>
          <Text style={styles.sectionTitle}>Investment Thesis</Text>

          <View style={styles.caseSection}>
            <View style={styles.caseHeader}>
              <Ionicons name="trending-up" size={20} color={theme.colors.success} />
              <Text style={[styles.caseTitle, { color: theme.colors.success }]}>Bull Case</Text>
            </View>
            {BULL_CASE.map((point, idx) => (
              <View key={idx} style={styles.caseItem}>
                <View style={[styles.caseDot, { backgroundColor: theme.colors.success }]} />
                <Text style={styles.caseText}>{point}</Text>
              </View>
            ))}
          </View>

          <View style={[styles.caseSection, styles.bearSection]}>
            <View style={styles.caseHeader}>
              <Ionicons name="trending-down" size={20} color={theme.colors.error} />
              <Text style={[styles.caseTitle, { color: theme.colors.error }]}>Bear Case</Text>
            </View>
            {BEAR_CASE.map((point, idx) => (
              <View key={idx} style={styles.caseItem}>
                <View style={[styles.caseDot, { backgroundColor: theme.colors.error }]} />
                <Text style={styles.caseText}>{point}</Text>
              </View>
            ))}
          </View>
        </Card>

        {/* Position Sizing */}
        <Card style={styles.positionCard}>
          <Text style={styles.sectionTitle}>Position Sizing</Text>
          <View style={styles.positionGrid}>
            <View style={styles.positionItem}>
              <Text style={styles.positionValue}>{POSITION_SIZING.suggested}</Text>
              <Text style={styles.positionLabel}>Suggested</Text>
            </View>
            <View style={styles.positionItem}>
              <Text style={styles.positionValue}>{POSITION_SIZING.maxPosition}</Text>
              <Text style={styles.positionLabel}>Max Position</Text>
            </View>
            <View style={styles.positionItem}>
              <Text style={styles.positionValue}>{POSITION_SIZING.riskReward}</Text>
              <Text style={styles.positionLabel}>Risk/Reward</Text>
            </View>
          </View>
          <View style={styles.returnRow}>
            <View style={styles.returnItem}>
              <Text style={[styles.returnValue, { color: theme.colors.success }]}>
                {POSITION_SIZING.expectedReturn}
              </Text>
              <Text style={styles.returnLabel}>Expected Return</Text>
            </View>
            <View style={styles.returnItem}>
              <Text style={[styles.returnValue, { color: theme.colors.error }]}>
                {POSITION_SIZING.maxLoss}
              </Text>
              <Text style={styles.returnLabel}>Max Loss</Text>
            </View>
          </View>
        </Card>

        {/* Disclaimer */}
        <View style={styles.disclaimer}>
          <Ionicons name="information-circle" size={16} color={theme.colors.textSecondary} />
          <Text style={styles.disclaimerText}>
            AI recommendations are for informational purposes only. Not financial advice.
            Past performance does not guarantee future results.
          </Text>
        </View>

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

  recommendationCard: { marginBottom: theme.spacing.md, borderLeftWidth: 4, padding: theme.spacing.lg },
  recHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  actionBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, gap: 8 },
  actionText: { fontSize: 20, fontWeight: '700', color: '#fff' },
  confidenceContainer: { alignItems: 'flex-end' },
  confidenceLabel: { fontSize: 12, color: theme.colors.textSecondary },
  confidenceValue: { fontSize: 24, fontWeight: '700' },
  recMeta: { flexDirection: 'row', gap: 16 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 13, color: theme.colors.textSecondary },

  settingsCard: { marginBottom: theme.spacing.md },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: theme.colors.text, marginBottom: theme.spacing.md },
  settingLabel: { fontSize: 13, color: theme.colors.textSecondary, marginBottom: 8, marginTop: 8 },
  optionRow: { flexDirection: 'row', gap: 8 },
  optionButton: { flex: 1, padding: 12, borderRadius: 8, backgroundColor: theme.colors.surface, alignItems: 'center' },
  optionActive: { backgroundColor: theme.colors.primary },
  optionLabel: { fontSize: 14, fontWeight: '600', color: theme.colors.text },
  optionLabelActive: { color: '#fff' },
  optionDesc: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 2 },
  optionDescActive: { color: 'rgba(255,255,255,0.8)' },
  riskButton: { flex: 1, padding: 10, borderRadius: 8, backgroundColor: theme.colors.surface, alignItems: 'center' },
  riskActive: { backgroundColor: theme.colors.primary },
  riskLabel: { fontSize: 13, fontWeight: '600', color: theme.colors.text },
  riskLabelActive: { color: '#fff' },

  targetCard: { marginBottom: theme.spacing.md },
  priceRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 20 },
  priceItem: { alignItems: 'center' },
  priceLabel: { fontSize: 12, color: theme.colors.textSecondary },
  priceValue: { fontSize: 20, fontWeight: '700', color: theme.colors.text, marginTop: 4 },
  scenarioSection: { marginBottom: 16 },
  scenarioTitle: { fontSize: 13, color: theme.colors.textSecondary, marginBottom: 10 },
  scenarioRow: { flexDirection: 'row', gap: 10 },
  scenarioBadge: { flex: 1, padding: 12, borderRadius: 8, alignItems: 'center' },
  bullBadge: { backgroundColor: theme.colors.success + '15' },
  baseBadge: { backgroundColor: theme.colors.primary + '15' },
  bearBadge: { backgroundColor: theme.colors.error + '15' },
  scenarioLabel: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 4 },
  scenarioPrice: { fontSize: 16, fontWeight: '700', color: theme.colors.text, marginTop: 2 },

  breakdownCard: { marginBottom: theme.spacing.md },

  riskCard: { marginBottom: theme.spacing.md },
  riskHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  riskLevelBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  riskLevelText: { fontSize: 13, fontWeight: '600' },
  riskMetrics: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 20 },
  riskMetricItem: { alignItems: 'center' },
  riskMetricValue: { fontSize: 18, fontWeight: '700', color: theme.colors.text },
  riskMetricLabel: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 4 },
  riskFactorsTitle: { fontSize: 14, fontWeight: '600', color: theme.colors.text, marginBottom: 12 },
  riskFactorRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  impactBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginRight: 10 },
  impactText: { fontSize: 10, fontWeight: '700' },
  riskFactorInfo: { flex: 1 },
  riskFactorName: { fontSize: 14, fontWeight: '500', color: theme.colors.text },
  riskFactorDesc: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },

  thesisCard: { marginBottom: theme.spacing.md },
  caseSection: { marginBottom: 16 },
  bearSection: { marginBottom: 0, paddingTop: 16, borderTopWidth: 1, borderTopColor: theme.colors.border },
  caseHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  caseTitle: { fontSize: 15, fontWeight: '600' },
  caseItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  caseDot: { width: 6, height: 6, borderRadius: 3, marginTop: 6, marginRight: 10 },
  caseText: { flex: 1, fontSize: 13, color: theme.colors.text, lineHeight: 18 },

  positionCard: { marginBottom: theme.spacing.md },
  positionGrid: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 16 },
  positionItem: { alignItems: 'center' },
  positionValue: { fontSize: 20, fontWeight: '700', color: theme.colors.primary },
  positionLabel: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 4 },
  returnRow: { flexDirection: 'row', justifyContent: 'center', gap: 40, paddingTop: 16, borderTopWidth: 1, borderTopColor: theme.colors.border },
  returnItem: { alignItems: 'center' },
  returnValue: { fontSize: 22, fontWeight: '700' },
  returnLabel: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 4 },

  disclaimer: { flexDirection: 'row', alignItems: 'flex-start', padding: 12, backgroundColor: theme.colors.surface, borderRadius: 8, gap: 8 },
  disclaimerText: { flex: 1, fontSize: 11, color: theme.colors.textSecondary, lineHeight: 16 },
});
