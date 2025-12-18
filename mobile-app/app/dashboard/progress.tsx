/**
 * CPFI Dashboard Progress Screen
 * Milestones, achievements, and gamification
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { lightTheme as theme } from '../../src/constants/theme';
import { Card } from '../../src/components/Card';

interface Milestone { id: string; title: string; description: string; completed: boolean; date: string | null; points: number; }
interface Achievement { id: string; title: string; icon: string; unlocked: boolean; description: string; }

const MILESTONES: Milestone[] = [
  { id: '1', title: 'Upload First Credit Report', description: 'Get started by uploading your credit report', completed: true, date: '2024-10-01', points: 50 },
  { id: '2', title: 'Complete Credit Analysis', description: 'Let AI analyze your credit report', completed: true, date: '2024-10-02', points: 100 },
  { id: '3', title: 'Send First Dispute', description: 'Submit your first dispute letter', completed: true, date: '2024-10-15', points: 150 },
  { id: '4', title: 'First Successful Dispute', description: 'Get a negative item removed', completed: true, date: '2024-11-01', points: 300 },
  { id: '5', title: 'Reach 650 Credit Score', description: 'Improve your score to 650+', completed: true, date: '2024-11-15', points: 500 },
  { id: '6', title: 'Reach 700 Credit Score', description: 'Achieve a good credit score', completed: false, date: null, points: 750 },
  { id: '7', title: 'Remove 5 Negative Items', description: 'Successfully dispute 5 items', completed: false, date: null, points: 1000 },
];

const ACHIEVEMENTS: Achievement[] = [
  { id: '1', title: 'First Steps', icon: '🎯', unlocked: true, description: 'Started your credit repair journey' },
  { id: '2', title: 'Dispute Master', icon: '⚔️', unlocked: true, description: 'Sent 3+ dispute letters' },
  { id: '3', title: 'Score Climber', icon: '📈', unlocked: true, description: 'Increased score by 50+ points' },
  { id: '4', title: 'Consistency King', icon: '👑', unlocked: false, description: 'Logged in 30 days in a row' },
  { id: '5', title: 'Credit Expert', icon: '🎓', unlocked: false, description: 'Completed all education modules' },
  { id: '6', title: 'Perfect Score', icon: '💎', unlocked: false, description: 'Reach 800+ credit score' },
];

export default function DashboardProgressScreen() {
  const [loading, setLoading] = useState(true);
  const [milestones] = useState(MILESTONES);
  const [achievements] = useState(ACHIEVEMENTS);

  useEffect(() => { setTimeout(() => setLoading(false), 800); }, []);

  const completedCount = milestones.filter(m => m.completed).length;
  const totalPoints = milestones.filter(m => m.completed).reduce((sum, m) => sum + m.points, 0);
  const progressPercent = (completedCount / milestones.length) * 100;

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading progress...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.title}>🏆 My Progress</Text>
          </View>
          <View style={styles.pointsBadge}>
            <Text style={styles.pointsValue}>{totalPoints.toLocaleString()}</Text>
            <Text style={styles.pointsLabel}>pts</Text>
          </View>
        </View>

        {/* Progress Bar */}
        <Card style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressTitle}>Journey Progress</Text>
            <Text style={styles.progressCount}>{completedCount}/{milestones.length}</Text>
          </View>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
          </View>
        </Card>

        {/* Milestones */}
        <Card style={styles.milestonesCard}>
          <Text style={styles.sectionTitle}>Milestones</Text>
          {milestones.map((milestone, i) => (
            <View key={milestone.id} style={styles.milestoneItem}>
              <View style={[styles.milestoneIcon, milestone.completed && styles.milestoneIconCompleted]}>
                {milestone.completed ? (
                  <Ionicons name="checkmark" size={16} color="#fff" />
                ) : (
                  <Text style={styles.milestoneNumber}>{i + 1}</Text>
                )}
              </View>
              <View style={styles.milestoneContent}>
                <Text style={[styles.milestoneTitle, !milestone.completed && styles.milestoneIncomplete]}>{milestone.title}</Text>
                <Text style={styles.milestoneDesc}>{milestone.description}</Text>
                {milestone.completed && milestone.date && (
                  <Text style={styles.milestoneDate}>Completed {new Date(milestone.date).toLocaleDateString()}</Text>
                )}
              </View>
              <Text style={styles.milestonePoints}>+{milestone.points}</Text>
            </View>
          ))}
        </Card>

        {/* Achievements */}
        <Card style={styles.achievementsCard}>
          <Text style={styles.sectionTitle}>Achievements</Text>
          <View style={styles.achievementsGrid}>
            {achievements.map((achievement) => (
              <View key={achievement.id} style={[styles.achievementItem, !achievement.unlocked && styles.achievementLocked]}>
                <Text style={styles.achievementIcon}>{achievement.icon}</Text>
                <Text style={styles.achievementTitle}>{achievement.title}</Text>
                <Text style={styles.achievementDesc}>{achievement.description}</Text>
              </View>
            ))}
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scrollView: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: theme.spacing.md, color: theme.colors.textSecondary },
  header: { flexDirection: 'row', alignItems: 'center', padding: theme.spacing.lg },
  backButton: { padding: theme.spacing.sm },
  headerContent: { flex: 1, marginLeft: theme.spacing.sm },
  title: { fontSize: 24, fontWeight: '700', color: theme.colors.text },
  pointsBadge: { alignItems: 'center', backgroundColor: theme.colors.surface, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  pointsValue: { fontSize: 18, fontWeight: '700', color: theme.colors.secondary },
  pointsLabel: { fontSize: 10, color: theme.colors.textSecondary },
  progressCard: { marginHorizontal: theme.spacing.lg, marginBottom: theme.spacing.md, padding: theme.spacing.lg },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: theme.spacing.sm },
  progressTitle: { fontSize: 14, fontWeight: '600', color: theme.colors.text },
  progressCount: { fontSize: 14, color: theme.colors.textSecondary },
  progressBarBg: { height: 10, backgroundColor: theme.colors.border, borderRadius: 5 },
  progressBarFill: { height: 10, backgroundColor: theme.colors.primary, borderRadius: 5 },
  milestonesCard: { marginHorizontal: theme.spacing.lg, marginBottom: theme.spacing.md, padding: theme.spacing.lg },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: theme.colors.text, marginBottom: theme.spacing.md },
  milestoneItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: theme.spacing.md },
  milestoneIcon: { width: 28, height: 28, borderRadius: 14, backgroundColor: theme.colors.border, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  milestoneIconCompleted: { backgroundColor: theme.colors.success },
  milestoneNumber: { fontSize: 12, color: theme.colors.textSecondary, fontWeight: '600' },
  milestoneContent: { flex: 1 },
  milestoneTitle: { fontSize: 14, fontWeight: '600', color: theme.colors.text },
  milestoneIncomplete: { color: theme.colors.textSecondary },
  milestoneDesc: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
  milestoneDate: { fontSize: 11, color: theme.colors.success, marginTop: 4 },
  milestonePoints: { fontSize: 12, fontWeight: '600', color: theme.colors.secondary },
  achievementsCard: { marginHorizontal: theme.spacing.lg, marginBottom: theme.spacing.xl, padding: theme.spacing.lg },
  achievementsGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  achievementItem: { width: '48%', margin: '1%', padding: theme.spacing.md, backgroundColor: `${theme.colors.warning}10`, borderRadius: 12, alignItems: 'center' },
  achievementLocked: { opacity: 0.5, backgroundColor: theme.colors.border },
  achievementIcon: { fontSize: 32, marginBottom: 8 },
  achievementTitle: { fontSize: 13, fontWeight: '600', color: theme.colors.text, textAlign: 'center' },
  achievementDesc: { fontSize: 11, color: theme.colors.textSecondary, textAlign: 'center', marginTop: 4 },
});

