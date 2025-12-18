/**
 * CPFI Budget Screen
 * Budget categories, spending vs budget bars, recommendations
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { lightTheme as theme } from '../../src/constants/theme';
import { Card } from '../../src/components/Card';

interface BudgetCategory {
  id: string;
  name: string;
  icon: string;
  spent: number;
  budget: number;
  color: string;
  transactions: number;
}

const BUDGET_CATEGORIES: BudgetCategory[] = [
  { id: '1', name: 'Food & Dining', icon: 'restaurant', spent: 620, budget: 800, color: '#22C55E', transactions: 24 },
  { id: '2', name: 'Shopping', icon: 'bag', spent: 450, budget: 400, color: '#EF4444', transactions: 12 },
  { id: '3', name: 'Transportation', icon: 'car', spent: 280, budget: 350, color: '#22C55E', transactions: 8 },
  { id: '4', name: 'Entertainment', icon: 'film', spent: 120, budget: 200, color: '#22C55E', transactions: 5 },
  { id: '5', name: 'Utilities', icon: 'flash', spent: 185, budget: 200, color: '#F59E0B', transactions: 4 },
  { id: '6', name: 'Healthcare', icon: 'medical', spent: 50, budget: 150, color: '#22C55E', transactions: 2 },
  { id: '7', name: 'Personal Care', icon: 'person', spent: 95, budget: 100, color: '#F59E0B', transactions: 6 },
];

const RECOMMENDATIONS = [
  { id: '1', title: 'Reduce Shopping', description: 'You\'re $50 over budget. Consider cutting back on non-essentials.', impact: 'Save $50/mo', type: 'warning' },
  { id: '2', title: 'Great job on Food!', description: 'You\'re on track to stay under budget this month.', impact: 'Save $180', type: 'success' },
  { id: '3', title: 'Set up Auto-Save', description: 'Transfer leftover budget to savings automatically.', impact: 'Save $200/mo', type: 'tip' },
];

export default function BudgetsScreen() {
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const periods = ['week', 'month', 'year'];
  
  const totalSpent = BUDGET_CATEGORIES.reduce((sum, cat) => sum + cat.spent, 0);
  const totalBudget = BUDGET_CATEGORIES.reduce((sum, cat) => sum + cat.budget, 0);
  const remaining = totalBudget - totalSpent;
  const percentUsed = Math.round((totalSpent / totalBudget) * 100);

  const getStatusColor = (spent: number, budget: number) => {
    const percent = (spent / budget) * 100;
    if (percent >= 100) return '#EF4444';
    if (percent >= 80) return '#F59E0B';
    return '#22C55E';
  };

  const getRecommendationIcon = (type: string) => {
    switch (type) {
      case 'warning': return { icon: 'warning', color: '#F59E0B', bg: '#FEF3C7' };
      case 'success': return { icon: 'checkmark-circle', color: '#22C55E', bg: '#DCFCE7' };
      case 'tip': return { icon: 'bulb', color: '#3B82F6', bg: '#DBEAFE' };
      default: return { icon: 'information-circle', color: theme.colors.primary, bg: '#EDE9FE' };
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
          <Text style={styles.title}>Budgets</Text>
          <TouchableOpacity>
            <Ionicons name="add-circle-outline" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Period Selector */}
        <View style={styles.periodSelector}>
          {periods.map((period) => (
            <TouchableOpacity key={period} style={[styles.periodChip, selectedPeriod === period && styles.periodChipActive]} onPress={() => setSelectedPeriod(period)}>
              <Text style={[styles.periodText, selectedPeriod === period && styles.periodTextActive]}>{period.charAt(0).toUpperCase() + period.slice(1)}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Overview Card */}
        <Card style={styles.overviewCard}>
          <View style={styles.overviewHeader}>
            <View>
              <Text style={styles.overviewLabel}>Total Budget</Text>
              <Text style={styles.overviewValue}>${totalBudget.toLocaleString()}</Text>
            </View>
            <View style={[styles.percentBadge, { backgroundColor: percentUsed >= 100 ? '#FEE2E2' : percentUsed >= 80 ? '#FEF3C7' : '#DCFCE7' }]}>
              <Text style={[styles.percentText, { color: percentUsed >= 100 ? '#EF4444' : percentUsed >= 80 ? '#F59E0B' : '#22C55E' }]}>{percentUsed}%</Text>
            </View>
          </View>
          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { width: `${Math.min(percentUsed, 100)}%`, backgroundColor: getStatusColor(totalSpent, totalBudget) }]} />
          </View>
          <View style={styles.overviewStats}>
            <View style={styles.overviewStat}>
              <Text style={styles.statLabel}>Spent</Text>
              <Text style={styles.statValue}>${totalSpent.toLocaleString()}</Text>
            </View>
            <View style={styles.overviewStat}>
              <Text style={styles.statLabel}>Remaining</Text>
              <Text style={[styles.statValue, { color: remaining >= 0 ? '#22C55E' : '#EF4444' }]}>${Math.abs(remaining).toLocaleString()}</Text>
            </View>
          </View>
        </Card>

        {/* Recommendations */}
        <Text style={styles.sectionTitle}>Recommendations</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.recommendationsScroll}>
          {RECOMMENDATIONS.map((rec) => {
            const iconStyle = getRecommendationIcon(rec.type);
            return (
              <Card key={rec.id} style={styles.recommendationCard}>
                <View style={[styles.recIcon, { backgroundColor: iconStyle.bg }]}>
                  <Ionicons name={iconStyle.icon as keyof typeof Ionicons.glyphMap} size={20} color={iconStyle.color} />
                </View>
                <Text style={styles.recTitle}>{rec.title}</Text>
                <Text style={styles.recDescription} numberOfLines={2}>{rec.description}</Text>
                <View style={styles.recImpact}>
                  <Ionicons name="trending-up" size={14} color="#22C55E" />
                  <Text style={styles.recImpactText}>{rec.impact}</Text>
                </View>
              </Card>
            );
          })}
        </ScrollView>

        {/* Budget Categories */}
        <Text style={styles.sectionTitle}>Categories</Text>
        {BUDGET_CATEGORIES.map((category) => (
          <TouchableOpacity key={category.id} onPress={() => router.push(`/financial/budget-detail?id=${category.id}`)}>
            <Card style={styles.categoryCard}>
              <View style={styles.categoryHeader}>
                <View style={[styles.categoryIcon, { backgroundColor: `${category.color}15` }]}>
                  <Ionicons name={category.icon as keyof typeof Ionicons.glyphMap} size={20} color={category.color} />
                </View>
                <View style={styles.categoryInfo}>
                  <Text style={styles.categoryName}>{category.name}</Text>
                  <Text style={styles.categoryTransactions}>{category.transactions} transactions</Text>
                </View>
                <View style={styles.categoryAmounts}>
                  <Text style={styles.categorySpent}>${category.spent}</Text>
                  <Text style={styles.categoryBudget}>/ ${category.budget}</Text>
                </View>
              </View>
              <View style={styles.categoryProgressContainer}>
                <View style={[styles.categoryProgress, { width: `${Math.min((category.spent / category.budget) * 100, 100)}%`, backgroundColor: getStatusColor(category.spent, category.budget) }]} />
              </View>
            </Card>
          </TouchableOpacity>
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
  periodSelector: { flexDirection: 'row', marginBottom: theme.spacing.lg },
  periodChip: { flex: 1, paddingVertical: 10, alignItems: 'center', backgroundColor: theme.colors.surface, marginHorizontal: 2, borderRadius: 8 },
  periodChipActive: { backgroundColor: theme.colors.primary },
  periodText: { fontSize: 13, color: theme.colors.textSecondary, fontWeight: '500' },
  periodTextActive: { color: '#fff' },
  overviewCard: { marginBottom: theme.spacing.lg },
  overviewHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  overviewLabel: { fontSize: 12, color: theme.colors.textSecondary },
  overviewValue: { fontSize: 28, fontWeight: '700', color: theme.colors.text, marginTop: 2 },
  percentBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  percentText: { fontSize: 14, fontWeight: '600' },
  progressContainer: { height: 8, backgroundColor: theme.colors.border, borderRadius: 4, marginTop: theme.spacing.md },
  progressBar: { height: '100%', borderRadius: 4 },
  overviewStats: { flexDirection: 'row', marginTop: theme.spacing.md, paddingTop: theme.spacing.md, borderTopWidth: 1, borderTopColor: theme.colors.border },
  overviewStat: { flex: 1, alignItems: 'center' },
  statLabel: { fontSize: 11, color: theme.colors.textSecondary },
  statValue: { fontSize: 18, fontWeight: '600', color: theme.colors.text, marginTop: 2 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: theme.colors.text, marginBottom: theme.spacing.md },
  recommendationsScroll: { marginBottom: theme.spacing.lg, marginHorizontal: -theme.spacing.lg, paddingHorizontal: theme.spacing.lg },
  recommendationCard: { width: 200, marginRight: theme.spacing.md },
  recIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  recTitle: { fontSize: 14, fontWeight: '600', color: theme.colors.text },
  recDescription: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 4, lineHeight: 16 },
  recImpact: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  recImpactText: { fontSize: 12, color: '#22C55E', fontWeight: '500', marginLeft: 4 },
  categoryCard: { marginBottom: theme.spacing.sm },
  categoryHeader: { flexDirection: 'row', alignItems: 'center' },
  categoryIcon: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  categoryInfo: { flex: 1 },
  categoryName: { fontSize: 14, fontWeight: '600', color: theme.colors.text },
  categoryTransactions: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 2 },
  categoryAmounts: { flexDirection: 'row', alignItems: 'baseline' },
  categorySpent: { fontSize: 16, fontWeight: '600', color: theme.colors.text },
  categoryBudget: { fontSize: 12, color: theme.colors.textSecondary, marginLeft: 2 },
  categoryProgressContainer: { height: 4, backgroundColor: theme.colors.border, borderRadius: 2, marginTop: theme.spacing.sm },
  categoryProgress: { height: '100%', borderRadius: 2 },
});

