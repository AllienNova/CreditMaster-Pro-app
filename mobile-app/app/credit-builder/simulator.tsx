/**
 * Fynvita Score Simulator Screen
 * Scenario selection, impact visualization, combined calculations
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { lightTheme as theme, getScoreColor, getScoreLabel } from '../../src/constants/theme';
import { Card } from '../../src/components/Card';
import { useCreditStore } from '../../src/store/creditStore';
import Slider from '@react-native-community/slider';

interface Scenario {
  id: string;
  title: string;
  description: string;
  icon: string;
  impact: number;
  enabled: boolean;
  hasSlider?: boolean;
  sliderValue?: number;
  sliderMin?: number;
  sliderMax?: number;
  sliderLabel?: string;
}

const INITIAL_SCENARIOS: Scenario[] = [
  { id: 'pay_balance', title: 'Pay Down Credit Card Balance', description: 'Reduce your credit utilization', icon: 'card', impact: 0, enabled: false, hasSlider: true, sliderValue: 0, sliderMin: 0, sliderMax: 100, sliderLabel: 'Pay off %' },
  { id: 'on_time', title: 'Make On-Time Payments', description: 'Pay all bills on time for 6 months', icon: 'calendar-outline', impact: 15, enabled: false },
  { id: 'new_card', title: 'Open New Credit Card', description: 'Apply for a new credit card', icon: 'add-circle', impact: -5, enabled: false },
  { id: 'close_card', title: 'Close Old Credit Card', description: 'Close your oldest credit card', icon: 'close-circle', impact: -20, enabled: false },
  { id: 'increase_limit', title: 'Request Credit Limit Increase', description: 'Increase limit on existing card', icon: 'trending-up', impact: 10, enabled: false },
  { id: 'authorized_user', title: 'Become Authorized User', description: 'Get added to someone\'s card', icon: 'people', impact: 25, enabled: false },
  { id: 'dispute_error', title: 'Remove Negative Item', description: 'Successfully dispute an error', icon: 'trash', impact: 30, enabled: false },
  { id: 'collection_paid', title: 'Pay Off Collection', description: 'Pay a collection account', icon: 'cash', impact: 5, enabled: false },
  { id: 'hard_inquiry', title: 'New Hard Inquiry', description: 'Apply for new credit', icon: 'search', impact: -3, enabled: false },
  { id: 'credit_builder', title: 'Open Credit Builder Loan', description: 'Start a credit builder loan', icon: 'build', impact: 15, enabled: false },
];

export default function ScoreSimulatorScreen() {
  const { currentScore } = useCreditStore();
  const [scenarios, setScenarios] = useState<Scenario[]>(INITIAL_SCENARIOS);
  const [simulatedScore, setSimulatedScore] = useState(currentScore ?? 680);
  const baseScore = currentScore ?? 680;

  useEffect(() => {
    calculateSimulatedScore();
  }, [scenarios]);

  const calculateSimulatedScore = () => {
    let totalImpact = 0;
    scenarios.forEach(scenario => {
      if (scenario.enabled) {
        if (scenario.hasSlider && scenario.sliderValue) {
          // Calculate impact based on slider value
          const maxImpact = scenario.id === 'pay_balance' ? 50 : 0;
          totalImpact += Math.round((scenario.sliderValue / 100) * maxImpact);
        } else {
          totalImpact += scenario.impact;
        }
      }
    });
    setSimulatedScore(Math.min(850, Math.max(300, baseScore + totalImpact)));
  };

  const toggleScenario = (id: string) => {
    setScenarios(prev => prev.map(s => s.id === id ? { ...s, enabled: !s.enabled } : s));
  };

  const updateSliderValue = (id: string, value: number) => {
    setScenarios(prev => prev.map(s => s.id === id ? { ...s, sliderValue: value } : s));
  };

  const scoreChange = simulatedScore - baseScore;
  const enabledCount = scenarios.filter(s => s.enabled).length;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Score Simulator</Text>
          <TouchableOpacity onPress={() => setScenarios(INITIAL_SCENARIOS)}>
            <Text style={styles.resetText}>Reset</Text>
          </TouchableOpacity>
        </View>

        {/* Score Comparison Card */}
        <Card style={styles.scoreCard}>
          <View style={styles.scoreComparison}>
            <View style={styles.scoreColumn}>
              <Text style={styles.scoreLabel}>Current</Text>
              <Text style={[styles.scoreValue, { color: getScoreColor(baseScore) }]}>{baseScore}</Text>
              <Text style={styles.scoreRating}>{getScoreLabel(baseScore)}</Text>
            </View>
            <View style={styles.arrowContainer}>
              <Ionicons name="arrow-forward" size={32} color={scoreChange >= 0 ? '#22C55E' : '#EF4444'} />
              <Text style={[styles.changeText, { color: scoreChange >= 0 ? '#22C55E' : '#EF4444' }]}>
                {scoreChange >= 0 ? '+' : ''}{scoreChange}
              </Text>
            </View>
            <View style={styles.scoreColumn}>
              <Text style={styles.scoreLabel}>Simulated</Text>
              <Text style={[styles.scoreValue, { color: getScoreColor(simulatedScore) }]}>{simulatedScore}</Text>
              <Text style={styles.scoreRating}>{getScoreLabel(simulatedScore)}</Text>
            </View>
          </View>
          <Text style={styles.scenarioCount}>{enabledCount} scenario{enabledCount !== 1 ? 's' : ''} selected</Text>
        </Card>

        {/* Scenarios */}
        <Text style={styles.sectionTitle}>What-If Scenarios</Text>
        <Text style={styles.sectionSubtitle}>Toggle scenarios to see how they might affect your score</Text>

        {scenarios.map((scenario) => (
          <Card key={scenario.id} style={[styles.scenarioCard, scenario.enabled && styles.scenarioCardActive]}>
            <View style={styles.scenarioRow}>
              <View style={[styles.scenarioIcon, { backgroundColor: scenario.enabled ? `${theme.colors.primary}20` : theme.colors.border }]}>
                <Ionicons name={scenario.icon as keyof typeof Ionicons.glyphMap} size={20} color={scenario.enabled ? theme.colors.primary : theme.colors.textSecondary} />
              </View>
              <View style={styles.scenarioContent}>
                <Text style={styles.scenarioTitle}>{scenario.title}</Text>
                <Text style={styles.scenarioDescription}>{scenario.description}</Text>
                {scenario.hasSlider && scenario.enabled && (
                  <View style={styles.sliderContainer}>
                    <Slider
                      style={styles.slider}
                      minimumValue={scenario.sliderMin || 0}
                      maximumValue={scenario.sliderMax || 100}
                      value={scenario.sliderValue || 0}
                      onValueChange={(value) => updateSliderValue(scenario.id, value)}
                      minimumTrackTintColor={theme.colors.primary}
                      maximumTrackTintColor={theme.colors.border}
                      thumbTintColor={theme.colors.primary}
                    />
                    <Text style={styles.sliderValue}>{Math.round(scenario.sliderValue || 0)}%</Text>
                  </View>
                )}
              </View>
              <View style={styles.scenarioRight}>
                <Text style={[styles.impactText, { color: scenario.impact >= 0 ? '#22C55E' : '#EF4444' }]}>
                  {scenario.hasSlider ? (scenario.sliderValue ? `+${Math.round((scenario.sliderValue / 100) * 50)}` : '0') : (scenario.impact >= 0 ? '+' : '')}{!scenario.hasSlider && scenario.impact}
                </Text>
                <Switch
                  value={scenario.enabled}
                  onValueChange={() => toggleScenario(scenario.id)}
                  trackColor={{ false: theme.colors.border, true: `${theme.colors.primary}50` }}
                  thumbColor={scenario.enabled ? theme.colors.primary : '#f4f3f4'}
                />
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
  container: { flex: 1, backgroundColor: theme.colors.background },
  scrollView: { flex: 1, padding: theme.spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: theme.spacing.lg },
  backButton: { padding: 4 },
  title: { fontSize: 20, fontWeight: '700', color: theme.colors.text },
  resetText: { fontSize: 14, color: theme.colors.primary, fontWeight: '500' },
  scoreCard: { marginBottom: theme.spacing.lg },
  scoreComparison: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  scoreColumn: { alignItems: 'center' },
  scoreLabel: { fontSize: 12, color: theme.colors.textSecondary, marginBottom: 4 },
  scoreValue: { fontSize: 48, fontWeight: '700' },
  scoreRating: { fontSize: 14, color: theme.colors.textSecondary, marginTop: 4 },
  arrowContainer: { alignItems: 'center' },
  changeText: { fontSize: 18, fontWeight: '600', marginTop: 4 },
  scenarioCount: { fontSize: 13, color: theme.colors.textSecondary, textAlign: 'center', marginTop: theme.spacing.md },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: theme.colors.text, marginBottom: 4 },
  sectionSubtitle: { fontSize: 14, color: theme.colors.textSecondary, marginBottom: theme.spacing.md },
  scenarioCard: { marginBottom: theme.spacing.sm },
  scenarioCardActive: { borderColor: theme.colors.primary, borderWidth: 1 },
  scenarioRow: { flexDirection: 'row', alignItems: 'flex-start' },
  scenarioIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: theme.spacing.md },
  scenarioContent: { flex: 1 },
  scenarioTitle: { fontSize: 15, fontWeight: '600', color: theme.colors.text },
  scenarioDescription: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 2 },
  sliderContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  slider: { flex: 1, height: 40 },
  sliderValue: { fontSize: 14, fontWeight: '500', color: theme.colors.primary, width: 40, textAlign: 'right' },
  scenarioRight: { alignItems: 'flex-end' },
  impactText: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
});

