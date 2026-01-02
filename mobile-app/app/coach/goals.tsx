/**
 * AI Financial Coach - Goals Screen
 */

import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl, Modal, TextInput, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/hooks/useTheme';
import { useCoachStore } from '../../src/store';
import { FinancialGoalPlan, GoalType } from '../../src/types/coach.types';

const GOAL_TYPES: { type: GoalType; label: string; icon: string }[] = [
  { type: 'emergency_fund', label: 'Emergency Fund', icon: 'shield-outline' },
  { type: 'debt_payoff', label: 'Debt Payoff', icon: 'trending-down-outline' },
  { type: 'savings', label: 'Savings', icon: 'wallet-outline' },
  { type: 'investment', label: 'Investment', icon: 'trending-up-outline' },
  { type: 'major_purchase', label: 'Major Purchase', icon: 'cart-outline' },
  { type: 'vacation', label: 'Vacation', icon: 'airplane-outline' },
  { type: 'home_down_payment', label: 'Home Down Payment', icon: 'home-outline' },
  { type: 'retirement', label: 'Retirement', icon: 'sunny-outline' },
  { type: 'education', label: 'Education', icon: 'school-outline' },
  { type: 'custom', label: 'Custom Goal', icon: 'flag-outline' },
];

export default function GoalsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { goals, goalsLoading, fetchGoals, createGoal, selectGoal } = useCoachStore();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newGoal, setNewGoal] = useState({ type: 'savings' as GoalType, name: '', targetAmount: '', targetDate: '' });

  useEffect(() => {
    fetchGoals();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#22c55e';
      case 'ahead': return '#22c55e';
      case 'on_track': return '#3b82f6';
      case 'behind': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const handleCreateGoal = async () => {
    if (!newGoal.name || !newGoal.targetAmount || !newGoal.targetDate) return;
    
    try {
      await createGoal({
        type: newGoal.type,
        name: newGoal.name,
        targetAmount: parseFloat(newGoal.targetAmount),
        targetDate: newGoal.targetDate,
      });
      setShowCreateModal(false);
      setNewGoal({ type: 'savings', name: '', targetAmount: '', targetDate: '' });
    } catch (error) {
      console.error('Failed to create goal:', error);
    }
  };

  const renderGoalCard = (goal: FinancialGoalPlan) => {
    const typeInfo = GOAL_TYPES.find(t => t.type === goal.type) || GOAL_TYPES[9];

    return (
      <TouchableOpacity
        key={goal.id}
        style={[styles.goalCard, { backgroundColor: colors.card }]}
        onPress={() => {
          selectGoal(goal);
          router.push('/coach/goal-detail');
        }}
      >
        <View style={styles.goalHeader}>
          <View style={[styles.iconContainer, { backgroundColor: `${colors.primary}20` }]}>
            <Ionicons name={typeInfo.icon as any} size={24} color={colors.primary} />
          </View>
          <View style={styles.goalHeaderContent}>
            <Text style={[styles.goalName, { color: colors.text }]}>{goal.name}</Text>
            <Text style={[styles.goalType, { color: colors.textSecondary }]}>{typeInfo.label}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(goal.status) }]}>
            <Text style={styles.statusText}>{goal.status.replace(/_/g, ' ')}</Text>
          </View>
        </View>

        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${Math.min(goal.progress, 100)}%`, backgroundColor: getStatusColor(goal.status) }]} />
          </View>
          <Text style={[styles.progressText, { color: colors.textSecondary }]}>{goal.progress.toFixed(0)}%</Text>
        </View>

        <View style={styles.goalDetails}>
          <View style={styles.detailItem}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Current</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>${goal.currentAmount.toLocaleString()}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Target</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>${goal.targetAmount.toLocaleString()}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Monthly</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>${goal.monthlyContribution.toFixed(0)}</Text>
          </View>
        </View>

        {goal.milestones.filter(m => !m.isAchieved).length > 0 && (
          <View style={styles.nextMilestone}>
            <Ionicons name="flag-outline" size={14} color={colors.textSecondary} />
            <Text style={[styles.milestoneText, { color: colors.textSecondary }]}>
              Next: {goal.milestones.find(m => !m.isAchieved)?.name}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={goalsLoading} onRefresh={fetchGoals} />}
      >
        {goalsLoading && goals.length === 0 ? (
          <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
        ) : goals.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="flag-outline" size={64} color={colors.textSecondary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Goals Yet</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Create your first financial goal to start tracking your progress
            </Text>
          </View>
        ) : (
          goals.map(renderGoalCard)
        )}
      </ScrollView>

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={() => setShowCreateModal(true)}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Create Goal Modal */}
      <Modal visible={showCreateModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Create New Goal</Text>
            
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Goal Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeSelector}>
              {GOAL_TYPES.map((t) => (
                <TouchableOpacity
                  key={t.type}
                  style={[styles.typeOption, newGoal.type === t.type && { backgroundColor: colors.primary }]}
                  onPress={() => setNewGoal({ ...newGoal, type: t.type })}
                >
                  <Ionicons name={t.icon as any} size={20} color={newGoal.type === t.type ? '#fff' : colors.text} />
                  <Text style={[styles.typeLabel, newGoal.type === t.type && { color: '#fff' }]}>{t.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Goal Name</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.text }]}
              placeholder="e.g., Emergency Fund"
              placeholderTextColor={colors.textSecondary}
              value={newGoal.name}
              onChangeText={(text) => setNewGoal({ ...newGoal, name: text })}
            />

            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Target Amount ($)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.text }]}
              placeholder="10000"
              placeholderTextColor={colors.textSecondary}
              keyboardType="numeric"
              value={newGoal.targetAmount}
              onChangeText={(text) => setNewGoal({ ...newGoal, targetAmount: text })}
            />

            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Target Date (YYYY-MM-DD)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.text }]}
              placeholder="2025-12-31"
              placeholderTextColor={colors.textSecondary}
              value={newGoal.targetDate}
              onChangeText={(text) => setNewGoal({ ...newGoal, targetDate: text })}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setShowCreateModal(false)}>
                <Text style={[styles.cancelText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.createButton, { backgroundColor: colors.primary }]} onPress={handleCreateGoal}>
                <Text style={styles.createText}>Create Goal</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, padding: 16 },
  loader: { marginTop: 40 },
  emptyState: { alignItems: 'center', marginTop: 60, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 20, fontWeight: '600', marginTop: 16 },
  emptyText: { fontSize: 14, textAlign: 'center', marginTop: 8 },
  goalCard: { borderRadius: 12, padding: 16, marginBottom: 12 },
  goalHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  iconContainer: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  goalHeaderContent: { flex: 1, marginLeft: 12 },
  goalName: { fontSize: 16, fontWeight: '600' },
  goalType: { fontSize: 12, marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  statusText: { color: '#fff', fontSize: 10, fontWeight: '600', textTransform: 'uppercase' },
  progressContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  progressBar: { flex: 1, height: 8, backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  progressText: { marginLeft: 12, fontSize: 14, fontWeight: '600', width: 40 },
  goalDetails: { flexDirection: 'row', justifyContent: 'space-between' },
  detailItem: { alignItems: 'center' },
  detailLabel: { fontSize: 10, textTransform: 'uppercase' },
  detailValue: { fontSize: 14, fontWeight: '600', marginTop: 2 },
  nextMilestone: { flexDirection: 'row', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.1)' },
  milestoneText: { fontSize: 12, marginLeft: 6 },
  fab: { position: 'absolute', bottom: 24, right: 24, width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '80%' },
  modalTitle: { fontSize: 20, fontWeight: '600', marginBottom: 20 },
  inputLabel: { fontSize: 12, textTransform: 'uppercase', marginBottom: 8, marginTop: 16 },
  input: { borderRadius: 8, padding: 12, fontSize: 16 },
  typeSelector: { maxHeight: 80 },
  typeOption: { alignItems: 'center', padding: 12, borderRadius: 12, marginRight: 8, backgroundColor: 'rgba(0,0,0,0.05)' },
  typeLabel: { fontSize: 10, marginTop: 4, textAlign: 'center' },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 24 },
  cancelButton: { flex: 1, padding: 16, alignItems: 'center' },
  cancelText: { fontSize: 16, fontWeight: '500' },
  createButton: { flex: 1, padding: 16, borderRadius: 12, alignItems: 'center' },
  createText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});

