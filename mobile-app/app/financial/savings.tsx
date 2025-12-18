/**
 * CPFI Savings Tracker Screen
 * Track savings accounts and growth
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { lightTheme as theme } from '../../src/constants/theme';
import { Card } from '../../src/components/Card';

interface SavingsAccount { name: string; balance: number; apy: number; type: 'emergency' | 'vacation' | 'general' | 'retirement'; }
interface SavingsGoal { name: string; current: number; target: number; deadline: string; }

const ACCOUNTS: SavingsAccount[] = [
  { name: 'Emergency Fund', balance: 12500, apy: 4.5, type: 'emergency' },
  { name: 'Vacation Fund', balance: 3200, apy: 4.25, type: 'vacation' },
  { name: 'General Savings', balance: 8300, apy: 4.0, type: 'general' },
  { name: 'IRA Contributions', balance: 6500, apy: 0, type: 'retirement' },
];

const GOALS: SavingsGoal[] = [
  { name: 'Emergency Fund (6 months)', current: 12500, target: 18000, deadline: 'Dec 2024' },
  { name: 'Vacation to Europe', current: 3200, target: 5000, deadline: 'Jun 2025' },
  { name: 'New Car Down Payment', current: 8300, target: 15000, deadline: 'Dec 2025' },
];

export default function SavingsScreen() {
  const [loading, setLoading] = useState(true);

  useEffect(() => { setTimeout(() => setLoading(false), 800); }, []);

  const totalSavings = ACCOUNTS.reduce((sum, a) => sum + a.balance, 0);
  const monthlyInterest = ACCOUNTS.reduce((sum, a) => sum + (a.balance * a.apy / 100 / 12), 0);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'emergency': return 'shield-checkmark';
      case 'vacation': return 'airplane';
      case 'general': return 'wallet';
      case 'retirement': return 'trending-up';
      default: return 'cash';
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading savings...</Text>
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
            <Text style={styles.title}>Savings Tracker</Text>
            <Text style={styles.subtitle}>Watch your money grow</Text>
          </View>
        </View>

        {/* Summary */}
        <Card style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total Savings</Text>
          <Text style={styles.summaryValue}>${totalSavings.toLocaleString()}</Text>
          <View style={styles.interestRow}>
            <Ionicons name="trending-up" size={16} color={theme.colors.success} />
            <Text style={styles.interestText}>+${monthlyInterest.toFixed(2)}/month in interest</Text>
          </View>
        </Card>

        {/* Accounts */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Savings Accounts</Text>
          {ACCOUNTS.map((account, i) => (
            <Card key={i} style={styles.accountCard}>
              <View style={styles.accountRow}>
                <View style={[styles.typeIcon, { backgroundColor: `${theme.colors.primary}15` }]}>
                  <Ionicons name={getTypeIcon(account.type) as keyof typeof Ionicons.glyphMap} size={20} color={theme.colors.primary} />
                </View>
                <View style={styles.accountInfo}>
                  <Text style={styles.accountName}>{account.name}</Text>
                  {account.apy > 0 && <Text style={styles.accountApy}>{account.apy}% APY</Text>}
                </View>
                <Text style={styles.accountBalance}>${account.balance.toLocaleString()}</Text>
              </View>
            </Card>
          ))}
        </View>

        {/* Goals */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Savings Goals</Text>
          {GOALS.map((goal, i) => {
            const progress = (goal.current / goal.target) * 100;
            return (
              <Card key={i} style={styles.goalCard}>
                <View style={styles.goalHeader}>
                  <Text style={styles.goalName}>{goal.name}</Text>
                  <Text style={styles.goalDeadline}>{goal.deadline}</Text>
                </View>
                <View style={styles.goalProgress}>
                  <View style={styles.progressBarBg}>
                    <View style={[styles.progressBarFill, { width: `${Math.min(progress, 100)}%` }]} />
                  </View>
                  <Text style={styles.progressText}>{progress.toFixed(0)}%</Text>
                </View>
                <View style={styles.goalAmounts}>
                  <Text style={styles.currentAmount}>${goal.current.toLocaleString()}</Text>
                  <Text style={styles.targetAmount}>of ${goal.target.toLocaleString()}</Text>
                </View>
              </Card>
            );
          })}
        </View>

        {/* Tips */}
        <Card style={styles.tipsCard}>
          <View style={styles.tipsHeader}>
            <Ionicons name="bulb" size={20} color={theme.colors.warning} />
            <Text style={styles.sectionTitle}> Savings Tips</Text>
          </View>
          <Text style={styles.tipText}>• Automate your savings with recurring transfers</Text>
          <Text style={styles.tipText}>• Keep 3-6 months expenses in emergency fund</Text>
          <Text style={styles.tipText}>• Take advantage of high-yield savings accounts</Text>
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
  subtitle: { fontSize: 14, color: theme.colors.textSecondary },
  summaryCard: { marginHorizontal: theme.spacing.lg, padding: theme.spacing.xl, alignItems: 'center' },
  summaryLabel: { fontSize: 14, color: theme.colors.textSecondary },
  summaryValue: { fontSize: 36, fontWeight: '700', color: theme.colors.text, marginTop: 8 },
  interestRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  interestText: { fontSize: 14, color: theme.colors.success, marginLeft: 4 },
  section: { paddingHorizontal: theme.spacing.lg, marginTop: theme.spacing.lg },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: theme.colors.text, marginBottom: theme.spacing.md },
  accountCard: { marginBottom: theme.spacing.sm, padding: theme.spacing.md },
  accountRow: { flexDirection: 'row', alignItems: 'center' },
  typeIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  accountInfo: { flex: 1, marginLeft: 12 },
  accountName: { fontSize: 14, fontWeight: '600', color: theme.colors.text },
  accountApy: { fontSize: 12, color: theme.colors.success, marginTop: 2 },
  accountBalance: { fontSize: 16, fontWeight: '700', color: theme.colors.text },
  goalCard: { marginBottom: theme.spacing.md, padding: theme.spacing.md },
  goalHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  goalName: { fontSize: 14, fontWeight: '600', color: theme.colors.text },
  goalDeadline: { fontSize: 12, color: theme.colors.textSecondary },
  goalProgress: { flexDirection: 'row', alignItems: 'center' },
  progressBarBg: { flex: 1, height: 8, backgroundColor: theme.colors.border, borderRadius: 4 },
  progressBarFill: { height: 8, backgroundColor: theme.colors.primary, borderRadius: 4 },
  progressText: { fontSize: 12, fontWeight: '600', color: theme.colors.primary, marginLeft: 8, width: 40 },
  goalAmounts: { flexDirection: 'row', marginTop: 8 },
  currentAmount: { fontSize: 14, fontWeight: '600', color: theme.colors.text },
  targetAmount: { fontSize: 14, color: theme.colors.textSecondary, marginLeft: 4 },
  tipsCard: { marginHorizontal: theme.spacing.lg, marginVertical: theme.spacing.lg, padding: theme.spacing.lg },
  tipsHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.md },
  tipText: { fontSize: 13, color: theme.colors.text, lineHeight: 22 },
});

