/**
 * CPFI Onboarding Goals Screen
 * Select credit improvement goals
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { lightTheme as theme } from '../../src/constants/theme';
import { useAuthStore } from '../../src/store/authStore';

const GOALS = [
  { id: 'improve_score', icon: 'trending-up', title: 'Improve My Credit Score', description: 'Get personalized tips to boost your score', color: '#22C55E' },
  { id: 'dispute_errors', icon: 'document-text', title: 'Dispute Errors', description: 'Challenge inaccurate items on my report', color: '#3B82F6' },
  { id: 'buy_home', icon: 'home', title: 'Buy a Home', description: 'Prepare for a mortgage application', color: '#F59E0B' },
  { id: 'buy_car', icon: 'car', title: 'Buy a Car', description: 'Get ready for auto financing', color: '#8B5CF6' },
  { id: 'get_credit_card', icon: 'card', title: 'Get a Credit Card', description: 'Find the best card for my needs', color: '#EC4899' },
  { id: 'reduce_debt', icon: 'wallet', title: 'Reduce Debt', description: 'Create a debt payoff strategy', color: '#EF4444' },
  { id: 'student_loans', icon: 'school', title: 'Manage Student Loans', description: 'Navigate repayment options', color: '#06B6D4' },
  { id: 'monitor_credit', icon: 'shield-checkmark', title: 'Monitor My Credit', description: 'Stay on top of changes', color: '#10B981' },
];

export default function OnboardingGoalsScreen() {
  const { updateProfile } = useAuthStore();
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const toggleGoal = (goalId: string) => {
    setSelectedGoals(prev =>
      prev.includes(goalId) ? prev.filter(id => id !== goalId) : [...prev, goalId]
    );
  };

  const handleContinue = async () => {
    setIsLoading(true);
    try {
      await updateProfile({ goals: selectedGoals });
      router.push('/onboarding/connect');
    } catch (error) {
      console.error('Failed to save goals:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    router.push('/onboarding/connect');
  };

  const progress = 2 / 4;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleSkip}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
          </View>
          <Text style={styles.progressText}>Step 2 of 4</Text>
        </View>

        {/* Content */}
        <View style={styles.content}>
          <Text style={styles.title}>What are your goals?</Text>
          <Text style={styles.subtitle}>Select all that apply. We'll customize your experience.</Text>

          <View style={styles.goalsGrid}>
            {GOALS.map((goal) => {
              const isSelected = selectedGoals.includes(goal.id);
              return (
                <TouchableOpacity
                  key={goal.id}
                  style={[styles.goalCard, isSelected && { borderColor: goal.color, borderWidth: 2 }]}
                  onPress={() => toggleGoal(goal.id)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.goalIcon, { backgroundColor: `${goal.color}20` }]}>
                    <Ionicons name={goal.icon as keyof typeof Ionicons.glyphMap} size={24} color={goal.color} />
                  </View>
                  <Text style={styles.goalTitle}>{goal.title}</Text>
                  <Text style={styles.goalDescription}>{goal.description}</Text>
                  {isSelected && (
                    <View style={[styles.checkmark, { backgroundColor: goal.color }]}>
                      <Ionicons name="checkmark" size={14} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.continueButton, selectedGoals.length === 0 && styles.continueButtonDisabled]}
          onPress={handleContinue}
          disabled={selectedGoals.length === 0 || isLoading}
        >
          <Text style={styles.continueButtonText}>{isLoading ? 'Saving...' : 'Continue'}</Text>
          <Ionicons name="arrow-forward" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.selectedCount}>{selectedGoals.length} goal{selectedGoals.length !== 1 ? 's' : ''} selected</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scrollView: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.md },
  backButton: { padding: 4 },
  skipText: { fontSize: 16, color: theme.colors.primary },
  progressContainer: { paddingHorizontal: theme.spacing.lg, marginBottom: theme.spacing.lg },
  progressBar: { height: 4, backgroundColor: theme.colors.border, borderRadius: 2 },
  progressFill: { height: '100%', backgroundColor: theme.colors.primary, borderRadius: 2 },
  progressText: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 8, textAlign: 'center' },
  content: { paddingHorizontal: theme.spacing.lg },
  title: { fontSize: 28, fontWeight: '700', color: theme.colors.text, marginBottom: 8 },
  subtitle: { fontSize: 16, color: theme.colors.textSecondary, marginBottom: theme.spacing.xl },
  goalsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  goalCard: { width: '48%', backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.lg, padding: theme.spacing.md, marginBottom: theme.spacing.md, borderWidth: 1, borderColor: theme.colors.border, position: 'relative' },
  goalIcon: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: theme.spacing.sm },
  goalTitle: { fontSize: 14, fontWeight: '600', color: theme.colors.text, marginBottom: 4 },
  goalDescription: { fontSize: 12, color: theme.colors.textSecondary, lineHeight: 16 },
  checkmark: { position: 'absolute', top: 8, right: 8, width: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
  footer: { padding: theme.spacing.lg, paddingBottom: theme.spacing.xl },
  continueButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.primary, paddingVertical: 16, borderRadius: theme.borderRadius.lg },
  continueButtonDisabled: { opacity: 0.5 },
  continueButtonText: { fontSize: 18, fontWeight: '600', color: '#fff', marginRight: 8 },
  selectedCount: { fontSize: 13, color: theme.colors.textSecondary, textAlign: 'center', marginTop: 12 },
});

