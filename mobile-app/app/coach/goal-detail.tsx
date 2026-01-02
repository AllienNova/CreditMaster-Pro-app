/**
 * AI Financial Coach - Goal Detail Screen
 */

import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/hooks/useTheme';
import { useCoachStore } from '../../src/store';

export default function GoalDetailScreen() {
  const { colors } = useTheme();
  const { selectedGoal, goalSimulation, updateGoalProgress, simulateGoal, goalsLoading } = useCoachStore();
  const [newAmount, setNewAmount] = useState('');
  const [showSimulator, setShowSimulator] = useState(false);
  const [simContribution, setSimContribution] = useState('');

  if (!selectedGoal) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.textSecondary }]}>No goal selected</Text>
      </View>
    );
  }

  const goal = selectedGoal;
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': case 'ahead': return '#22c55e';
      case 'on_track': return '#3b82f6';
      case 'behind': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const handleUpdateProgress = async () => {
    if (!newAmount) return;
    await updateGoalProgress(goal.id, parseFloat(newAmount));
    setNewAmount('');
  };

  const handleSimulate = async () => {
    if (!simContribution) return;
    await simulateGoal(goal.id, [
      { monthlyContribution: parseFloat(simContribution) },
      { monthlyContribution: parseFloat(simContribution) * 1.25 },
      { monthlyContribution: parseFloat(simContribution) * 1.5 },
    ]);
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <Text style={styles.goalName}>{goal.name}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(goal.status) }]}>
          <Text style={styles.statusText}>{goal.status.replace(/_/g, ' ')}</Text>
        </View>
      </View>

      {/* Progress Circle */}
      <View style={[styles.progressSection, { backgroundColor: colors.card }]}>
        <View style={[styles.progressCircle, { borderColor: getStatusColor(goal.status) }]}>
          <Text style={[styles.progressPercent, { color: getStatusColor(goal.status) }]}>{goal.progress.toFixed(0)}%</Text>
          <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>Complete</Text>
        </View>
        <View style={styles.amountDetails}>
          <View style={styles.amountRow}>
            <Text style={[styles.amountLabel, { color: colors.textSecondary }]}>Current</Text>
            <Text style={[styles.amountValue, { color: colors.text }]}>${goal.currentAmount.toLocaleString()}</Text>
          </View>
          <View style={styles.amountRow}>
            <Text style={[styles.amountLabel, { color: colors.textSecondary }]}>Target</Text>
            <Text style={[styles.amountValue, { color: colors.text }]}>${goal.targetAmount.toLocaleString()}</Text>
          </View>
          <View style={styles.amountRow}>
            <Text style={[styles.amountLabel, { color: colors.textSecondary }]}>Remaining</Text>
            <Text style={[styles.amountValue, { color: colors.text }]}>${(goal.targetAmount - goal.currentAmount).toLocaleString()}</Text>
          </View>
        </View>
      </View>

      {/* Update Progress */}
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>Update Progress</Text>
        <View style={styles.inputRow}>
          <TextInput
            style={[styles.input, { backgroundColor: colors.background, color: colors.text }]}
            placeholder="Enter new amount"
            placeholderTextColor={colors.textSecondary}
            keyboardType="numeric"
            value={newAmount}
            onChangeText={setNewAmount}
          />
          <TouchableOpacity style={[styles.updateButton, { backgroundColor: colors.primary }]} onPress={handleUpdateProgress}>
            <Text style={styles.updateButtonText}>Update</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Milestones */}
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>Milestones</Text>
        {goal.milestones.map((milestone, idx) => (
          <View key={milestone.id} style={styles.milestoneItem}>
            <View style={[styles.milestoneIcon, { backgroundColor: milestone.isAchieved ? '#22c55e' : 'rgba(0,0,0,0.1)' }]}>
              <Ionicons name={milestone.isAchieved ? 'checkmark' : 'flag'} size={16} color={milestone.isAchieved ? '#fff' : colors.textSecondary} />
            </View>
            <View style={styles.milestoneContent}>
              <Text style={[styles.milestoneName, { color: colors.text }]}>{milestone.name}</Text>
              <Text style={[styles.milestoneTarget, { color: colors.textSecondary }]}>${milestone.targetAmount.toLocaleString()} ({milestone.targetPercentage}%)</Text>
            </View>
            {milestone.isAchieved && milestone.achievedDate && (
              <Text style={[styles.achievedDate, { color: '#22c55e' }]}>✓ {new Date(milestone.achievedDate).toLocaleDateString()}</Text>
            )}
          </View>
        ))}
      </View>

      {/* AI Recommendations */}
      {goal.aiRecommendations.length > 0 && (
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <View style={styles.cardHeader}>
            <Ionicons name="sparkles" size={20} color={colors.primary} />
            <Text style={[styles.cardTitle, { color: colors.text, marginLeft: 8 }]}>AI Recommendations</Text>
          </View>
          {goal.aiRecommendations.map((rec, idx) => (
            <View key={idx} style={styles.recItem}>
              <Ionicons name="bulb-outline" size={16} color={colors.primary} />
              <Text style={[styles.recText, { color: colors.text }]}>{rec}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Simulator */}
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <TouchableOpacity style={styles.cardHeader} onPress={() => setShowSimulator(!showSimulator)}>
          <Ionicons name="calculator-outline" size={20} color={colors.primary} />
          <Text style={[styles.cardTitle, { color: colors.text, marginLeft: 8, flex: 1 }]}>Goal Simulator</Text>
          <Ionicons name={showSimulator ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textSecondary} />
        </TouchableOpacity>
        
        {showSimulator && (
          <View style={styles.simulatorContent}>
            <Text style={[styles.simLabel, { color: colors.textSecondary }]}>Monthly Contribution ($)</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, color: colors.text }]}
                placeholder="500"
                placeholderTextColor={colors.textSecondary}
                keyboardType="numeric"
                value={simContribution}
                onChangeText={setSimContribution}
              />
              <TouchableOpacity style={[styles.updateButton, { backgroundColor: colors.primary }]} onPress={handleSimulate}>
                <Text style={styles.updateButtonText}>Simulate</Text>
              </TouchableOpacity>
            </View>

            {goalsLoading && <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 16 }} />}

            {goalSimulation && goalSimulation.scenarios.map((scenario) => (
              <View key={scenario.id} style={[styles.scenarioCard, scenario.id === goalSimulation.recommendedScenario && { borderColor: colors.primary, borderWidth: 2 }]}>
                <Text style={[styles.scenarioName, { color: colors.text }]}>{scenario.name}</Text>
                <Text style={[styles.scenarioDetail, { color: colors.textSecondary }]}>
                  ${scenario.monthlyContribution}/mo → Complete by {new Date(scenario.projectedCompletionDate).toLocaleDateString()}
                </Text>
                <Text style={[styles.scenarioProb, { color: scenario.probabilityOfSuccess >= 80 ? '#22c55e' : '#eab308' }]}>
                  {scenario.probabilityOfSuccess}% success probability
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  errorText: { textAlign: 'center', marginTop: 40, fontSize: 16 },
  header: { padding: 24, paddingTop: 16 },
  goalName: { color: '#fff', fontSize: 24, fontWeight: '600' },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, marginTop: 8 },
  statusText: { color: '#fff', fontSize: 12, fontWeight: '600', textTransform: 'uppercase' },
  progressSection: { margin: 16, borderRadius: 12, padding: 20, flexDirection: 'row', alignItems: 'center' },
  progressCircle: { width: 100, height: 100, borderRadius: 50, borderWidth: 6, justifyContent: 'center', alignItems: 'center' },
  progressPercent: { fontSize: 24, fontWeight: 'bold' },
  progressLabel: { fontSize: 12 },
  amountDetails: { flex: 1, marginLeft: 20 },
  amountRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  amountLabel: { fontSize: 14 },
  amountValue: { fontSize: 14, fontWeight: '600' },
  card: { margin: 16, marginTop: 0, borderRadius: 12, padding: 16 },
  cardTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  inputRow: { flexDirection: 'row', alignItems: 'center' },
  input: { flex: 1, borderRadius: 8, padding: 12, fontSize: 16 },
  updateButton: { marginLeft: 12, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8 },
  updateButtonText: { color: '#fff', fontWeight: '600' },
  milestoneItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.1)' },
  milestoneIcon: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  milestoneContent: { flex: 1, marginLeft: 12 },
  milestoneName: { fontSize: 14, fontWeight: '500' },
  milestoneTarget: { fontSize: 12, marginTop: 2 },
  achievedDate: { fontSize: 12 },
  recItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  recText: { flex: 1, marginLeft: 8, fontSize: 14, lineHeight: 20 },
  simulatorContent: { marginTop: 16 },
  simLabel: { fontSize: 12, marginBottom: 8 },
  scenarioCard: { backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: 8, padding: 12, marginTop: 12 },
  scenarioName: { fontSize: 14, fontWeight: '600' },
  scenarioDetail: { fontSize: 12, marginTop: 4 },
  scenarioProb: { fontSize: 12, fontWeight: '600', marginTop: 4 },
});

