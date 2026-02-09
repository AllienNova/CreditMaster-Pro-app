/**
 * Fynvita Advanced Score Simulator Screen
 * Simulate credit score changes based on various actions
 */

import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { lightTheme as theme, getScoreColor, getScoreLabel } from '../../src/constants/theme';
import { Card } from '../../src/components/Card';
import { AreaChart } from '../../src/components/charts';
import { ProgressRing } from '../../src/components/ProgressRing';

interface SimulationAction {
  id: string;
  category: 'positive' | 'negative';
  title: string;
  description: string;
  impact: { min: number; max: number };
  icon: string;
  selected: boolean;
}

const SIMULATION_ACTIONS: SimulationAction[] = [
  // Positive actions
  { id: 'pay_debt', category: 'positive', title: 'Pay down credit card debt', description: 'Reduce utilization by 50%', impact: { min: 20, max: 40 }, icon: 'trending-down', selected: false },
  { id: 'pay_ontime_6mo', category: 'positive', title: '6 months on-time payments', description: 'Perfect payment history', impact: { min: 15, max: 30 }, icon: 'calendar', selected: false },
  { id: 'remove_collection', category: 'positive', title: 'Remove collection account', description: 'Pay-for-delete or dispute', impact: { min: 30, max: 70 }, icon: 'trash', selected: false },
  { id: 'authorized_user', category: 'positive', title: 'Become authorized user', description: 'On account with good history', impact: { min: 10, max: 30 }, icon: 'person-add', selected: false },
  { id: 'credit_limit', category: 'positive', title: 'Increase credit limit', description: 'Request limit increase', impact: { min: 5, max: 15 }, icon: 'arrow-up', selected: false },
  { id: 'old_account', category: 'positive', title: 'Keep old accounts open', description: 'Maintain credit history length', impact: { min: 5, max: 10 }, icon: 'time', selected: false },
  // Negative actions
  { id: 'missed_payment', category: 'negative', title: 'Missed payment (30 days)', description: 'Single late payment', impact: { min: -60, max: -100 }, icon: 'alert-circle', selected: false },
  { id: 'max_cards', category: 'negative', title: 'Max out credit cards', description: '90%+ utilization', impact: { min: -30, max: -50 }, icon: 'card', selected: false },
  { id: 'hard_inquiry', category: 'negative', title: 'New hard inquiry', description: 'Applying for new credit', impact: { min: -5, max: -10 }, icon: 'search', selected: false },
  { id: 'close_oldest', category: 'negative', title: 'Close oldest account', description: 'Reduces credit age', impact: { min: -10, max: -25 }, icon: 'close-circle', selected: false },
  { id: 'new_collection', category: 'negative', title: 'New collection account', description: 'Unpaid debt sent to collections', impact: { min: -50, max: -110 }, icon: 'warning', selected: false },
];

export default function ScoreSimulatorScreen() {
  const [actions, setActions] = useState(SIMULATION_ACTIONS);
  const currentScore = 678;

  const toggleAction = (actionId: string) => {
    setActions(prev => prev.map(a => a.id === actionId ? { ...a, selected: !a.selected } : a));
  };

  const { projectedScore, totalImpact, projectionData } = useMemo(() => {
    const selectedActions = actions.filter(a => a.selected);
    let minImpact = 0;
    let maxImpact = 0;

    selectedActions.forEach(action => {
      minImpact += action.impact.min;
      maxImpact += action.impact.max;
    });

    const avgImpact = Math.round((minImpact + maxImpact) / 2);
    const projected = Math.max(300, Math.min(850, currentScore + avgImpact));

    // Generate projection data
    const data = [
      { value: currentScore, label: 'Now' },
      { value: currentScore + avgImpact * 0.2, label: '1 mo' },
      { value: currentScore + avgImpact * 0.4, label: '2 mo' },
      { value: currentScore + avgImpact * 0.6, label: '3 mo' },
      { value: currentScore + avgImpact * 0.8, label: '4 mo' },
      { value: projected, label: '6 mo' },
    ];

    return {
      projectedScore: projected,
      totalImpact: avgImpact,
      projectionData: data,
    };
  }, [actions]);

  const positiveActions = actions.filter(a => a.category === 'positive');
  const negativeActions = actions.filter(a => a.category === 'negative');

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Score Simulator</Text>
          <TouchableOpacity onPress={() => setActions(SIMULATION_ACTIONS)}>
            <Ionicons name="refresh" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Score Comparison */}
        <Card style={styles.scoreCard}>
          <View style={styles.scoreComparison}>
            <View style={styles.scoreColumn}>
              <Text style={styles.scoreLabel}>Current</Text>
              <ProgressRing
                progress={(currentScore - 300) / 550}
                size={100}
                strokeWidth={10}
                color={getScoreColor(currentScore)}
              >
                <Text style={[styles.scoreValue, { color: getScoreColor(currentScore) }]}>{currentScore}</Text>
              </ProgressRing>
              <Text style={styles.scoreCategory}>{getScoreLabel(currentScore)}</Text>
            </View>

            <View style={styles.arrowContainer}>
              <Ionicons
                name="arrow-forward"
                size={32}
                color={totalImpact >= 0 ? theme.colors.success : theme.colors.error}
              />
              <Text style={[styles.impactText, { color: totalImpact >= 0 ? theme.colors.success : theme.colors.error }]}>
                {totalImpact >= 0 ? '+' : ''}{totalImpact}
              </Text>
            </View>

            <View style={styles.scoreColumn}>
              <Text style={styles.scoreLabel}>Projected</Text>
              <ProgressRing
                progress={(projectedScore - 300) / 550}
                size={100}
                strokeWidth={10}
                color={getScoreColor(projectedScore)}
              >
                <Text style={[styles.scoreValue, { color: getScoreColor(projectedScore) }]}>{projectedScore}</Text>
              </ProgressRing>
              <Text style={styles.scoreCategory}>{getScoreLabel(projectedScore)}</Text>
            </View>
          </View>
        </Card>

        {/* Projection Chart */}
        <Card style={styles.chartCard}>
          <Text style={styles.sectionTitle}>Score Projection</Text>
          <AreaChart
            data={projectionData}
            height={160}
            color={totalImpact >= 0 ? theme.colors.success : theme.colors.error}
            showLabels
            minValue={Math.min(currentScore, projectedScore) - 30}
            maxValue={Math.max(currentScore, projectedScore) + 30}
          />
        </Card>

        {/* Positive Actions */}
        <View style={styles.actionSection}>
          <View style={styles.actionSectionHeader}>
            <Ionicons name="trending-up" size={20} color={theme.colors.success} />
            <Text style={styles.sectionTitle}>Positive Actions</Text>
          </View>
          <Text style={styles.sectionHint}>Select actions you plan to take</Text>

          {positiveActions.map((action) => (
            <TouchableOpacity
              key={action.id}
              onPress={() => toggleAction(action.id)}
              activeOpacity={0.7}
            >
              <Card style={[styles.actionCard, action.selected && styles.actionCardSelected]}>
                <View style={styles.actionRow}>
                  <View style={[styles.checkbox, action.selected && styles.checkboxSelected]}>
                    {action.selected && <Ionicons name="checkmark" size={16} color="#fff" />}
                  </View>
                  <View style={[styles.actionIcon, styles.positiveIcon]}>
                    <Ionicons name={action.icon as keyof typeof Ionicons.glyphMap} size={20} color={theme.colors.success} />
                  </View>
                  <View style={styles.actionContent}>
                    <Text style={styles.actionTitle}>{action.title}</Text>
                    <Text style={styles.actionDescription}>{action.description}</Text>
                  </View>
                  <Text style={styles.positiveImpact}>
                    +{action.impact.min} to +{action.impact.max}
                  </Text>
                </View>
              </Card>
            </TouchableOpacity>
          ))}
        </View>

        {/* Negative Actions */}
        <View style={styles.actionSection}>
          <View style={styles.actionSectionHeader}>
            <Ionicons name="trending-down" size={20} color={theme.colors.error} />
            <Text style={styles.sectionTitle}>Negative Actions</Text>
          </View>
          <Text style={styles.sectionHint}>See potential damage from these actions</Text>

          {negativeActions.map((action) => (
            <TouchableOpacity
              key={action.id}
              onPress={() => toggleAction(action.id)}
              activeOpacity={0.7}
            >
              <Card style={[styles.actionCard, action.selected && styles.actionCardSelectedNegative]}>
                <View style={styles.actionRow}>
                  <View style={[styles.checkbox, action.selected && styles.checkboxSelectedNegative]}>
                    {action.selected && <Ionicons name="checkmark" size={16} color="#fff" />}
                  </View>
                  <View style={[styles.actionIcon, styles.negativeIcon]}>
                    <Ionicons name={action.icon as keyof typeof Ionicons.glyphMap} size={20} color={theme.colors.error} />
                  </View>
                  <View style={styles.actionContent}>
                    <Text style={styles.actionTitle}>{action.title}</Text>
                    <Text style={styles.actionDescription}>{action.description}</Text>
                  </View>
                  <Text style={styles.negativeImpact}>
                    {action.impact.min} to {action.impact.max}
                  </Text>
                </View>
              </Card>
            </TouchableOpacity>
          ))}
        </View>

        {/* Disclaimer */}
        <Card style={styles.disclaimerCard}>
          <View style={styles.disclaimerRow}>
            <Ionicons name="information-circle" size={20} color={theme.colors.textSecondary} />
            <Text style={styles.disclaimerText}>
              Simulations are estimates based on typical credit scoring patterns. Actual results may vary based on your complete credit profile.
            </Text>
          </View>
        </Card>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scrollView: { flex: 1, padding: theme.spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: theme.spacing.lg },
  backButton: { padding: 4 },
  title: { fontSize: 20, fontWeight: '700', color: theme.colors.text },
  scoreCard: { marginBottom: theme.spacing.lg },
  scoreComparison: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  scoreColumn: { alignItems: 'center', flex: 1 },
  scoreLabel: { fontSize: 13, color: theme.colors.textSecondary, marginBottom: 8 },
  scoreValue: { fontSize: 28, fontWeight: '700' },
  scoreCategory: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 8 },
  arrowContainer: { alignItems: 'center', paddingHorizontal: 16 },
  impactText: { fontSize: 18, fontWeight: '700', marginTop: 4 },
  chartCard: { marginBottom: theme.spacing.lg },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: theme.colors.text, marginBottom: theme.spacing.sm },
  actionSection: { marginTop: theme.spacing.md },
  actionSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  sectionHint: { fontSize: 13, color: theme.colors.textSecondary, marginBottom: theme.spacing.md },
  actionCard: { marginBottom: theme.spacing.sm },
  actionCardSelected: { borderColor: theme.colors.success, borderWidth: 1.5, backgroundColor: '#22C55E08' },
  actionCardSelectedNegative: { borderColor: theme.colors.error, borderWidth: 1.5, backgroundColor: '#EF444408' },
  actionRow: { flexDirection: 'row', alignItems: 'center' },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: theme.colors.border, marginRight: 10, alignItems: 'center', justifyContent: 'center' },
  checkboxSelected: { backgroundColor: theme.colors.success, borderColor: theme.colors.success },
  checkboxSelectedNegative: { backgroundColor: theme.colors.error, borderColor: theme.colors.error },
  actionIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  positiveIcon: { backgroundColor: '#22C55E20' },
  negativeIcon: { backgroundColor: '#EF444420' },
  actionContent: { flex: 1 },
  actionTitle: { fontSize: 14, fontWeight: '600', color: theme.colors.text },
  actionDescription: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
  positiveImpact: { fontSize: 13, fontWeight: '600', color: theme.colors.success },
  negativeImpact: { fontSize: 13, fontWeight: '600', color: theme.colors.error },
  disclaimerCard: { marginTop: theme.spacing.lg },
  disclaimerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  disclaimerText: { flex: 1, fontSize: 12, color: theme.colors.textSecondary, lineHeight: 18 },
});
