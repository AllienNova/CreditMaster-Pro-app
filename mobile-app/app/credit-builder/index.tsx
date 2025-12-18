/**
 * CPFI Credit Builder Hub
 * Tool cards grid with 18 tools, progress indicators, recommendations
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { lightTheme as theme } from '../../src/constants/theme';
import { Card } from '../../src/components/Card';
import { useCreditStore } from '../../src/store/creditStore';

const TOOL_CATEGORIES = [
  {
    title: 'Score Factors',
    tools: [
      { id: 'simulator', icon: 'calculator', title: 'Score Simulator', subtitle: 'See how actions affect your score', route: '/credit-builder/simulator', color: '#3B82F6', priority: 'high' },
      { id: 'utilization', icon: 'pie-chart', title: 'Credit Utilization', subtitle: 'Optimize your utilization ratio', route: '/credit-builder/utilization', color: '#22C55E', priority: 'high' },
      { id: 'payments', icon: 'calendar', title: 'Payment History', subtitle: 'Track and improve payments', route: '/credit-builder/payments', color: '#F59E0B', priority: 'high' },
      { id: 'age', icon: 'time', title: 'Credit Age', subtitle: 'Manage account age', route: '/credit-builder/age', color: '#8B5CF6', priority: 'medium' },
      { id: 'mix', icon: 'layers', title: 'Credit Mix', subtitle: 'Diversify credit types', route: '/credit-builder/mix', color: '#EC4899', priority: 'medium' },
    ],
  },
  {
    title: 'Build Credit',
    tools: [
      { id: 'secured-card', icon: 'card', title: 'Secured Cards', subtitle: 'Build credit with secured cards', route: '/credit-builder/secured-card', color: '#06B6D4', priority: 'high' },
      { id: 'authorized-user', icon: 'people', title: 'Authorized User', subtitle: 'Piggyback on good credit', route: '/credit-builder/authorized-user', color: '#10B981', priority: 'medium' },
      { id: 'credit-builder-loan', icon: 'trending-up', title: 'Credit Builder Loan', subtitle: 'Build credit while saving', route: '/credit-builder/loan', color: '#F97316', priority: 'medium' },
    ],
  },
  {
    title: 'Debt Management',
    tools: [
      { id: 'debt-strategy', icon: 'trending-down', title: 'Debt Strategy', subtitle: 'Avalanche vs Snowball', route: '/credit-builder/debt-strategy', color: '#EF4444', priority: 'high' },
      { id: 'debt-calculator', icon: 'calculator', title: 'Payoff Calculator', subtitle: 'Plan your debt payoff', route: '/credit-builder/debt-calculator', color: '#6366F1', priority: 'medium' },
      { id: 'consolidation', icon: 'git-merge', title: 'Consolidation', subtitle: 'Combine debts into one', route: '/credit-builder/consolidation', color: '#14B8A6', priority: 'low' },
    ],
  },
  {
    title: 'Repair & Protect',
    tools: [
      { id: 'goodwill', icon: 'mail', title: 'Goodwill Letters', subtitle: 'Request late payment removal', route: '/credit-builder/goodwill', color: '#A855F7', priority: 'medium' },
      { id: 'pay-for-delete', icon: 'cash', title: 'Pay for Delete', subtitle: 'Negotiate collection removal', route: '/credit-builder/pay-for-delete', color: '#F43F5E', priority: 'medium' },
      { id: 'freeze', icon: 'lock-closed', title: 'Credit Freeze', subtitle: 'Protect your credit', route: '/credit-builder/freeze', color: '#0EA5E9', priority: 'low' },
      { id: 'dispute', icon: 'document-text', title: 'Dispute Center', subtitle: 'Challenge inaccurate items', route: '/disputes', color: '#84CC16', priority: 'high' },
    ],
  },
  {
    title: 'Education',
    tools: [
      { id: 'guides', icon: 'book', title: 'Credit Guides', subtitle: 'Learn credit basics', route: '/help/guides', color: '#64748B', priority: 'low' },
      { id: 'tips', icon: 'bulb', title: 'Daily Tips', subtitle: 'Personalized advice', route: '/credit-builder/tips', color: '#FBBF24', priority: 'low' },
    ],
  },
];

export default function CreditBuilderScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const { factors, fetchFactors } = useCreditStore();

  useEffect(() => {
    fetchFactors();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchFactors();
    setRefreshing(false);
  };

  // Get recommended tools based on credit factors
  const getRecommendedTools = () => {
    const recommended: typeof TOOL_CATEGORIES[0]['tools'] = [];
    factors.forEach(factor => {
      if (factor.status === 'poor' || factor.status === 'fair') {
        const category = TOOL_CATEGORIES.find(c => c.tools.some(t => t.id === factor.id.replace('_', '-')));
        if (category) {
          const tool = category.tools.find(t => t.id === factor.id.replace('_', '-'));
          if (tool) recommended.push(tool);
        }
      }
    });
    return recommended.slice(0, 3);
  };

  const recommendedTools = getRecommendedTools();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Credit Builder</Text>
          <TouchableOpacity onPress={() => router.push('/help/guides/credit-builder')}>
            <Ionicons name="help-circle-outline" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Progress Card */}
        <Card style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <Ionicons name="rocket" size={32} color={theme.colors.primary} />
            <View style={styles.progressInfo}>
              <Text style={styles.progressTitle}>Your Credit Journey</Text>
              <Text style={styles.progressSubtitle}>3 of 5 factors optimized</Text>
            </View>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: '60%' }]} />
          </View>
          <Text style={styles.progressHint}>Complete recommended actions to improve your score</Text>
        </Card>

        {/* Recommended Section */}
        {recommendedTools.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              <Ionicons name="star" size={16} color="#F59E0B" /> Recommended for You
            </Text>
            {recommendedTools.map((tool) => (
              <TouchableOpacity key={tool.id} style={styles.recommendedCard} onPress={() => router.push(tool.route as never)}>
                <View style={[styles.toolIcon, { backgroundColor: `${tool.color}20` }]}>
                  <Ionicons name={tool.icon as keyof typeof Ionicons.glyphMap} size={24} color={tool.color} />
                </View>
                <View style={styles.toolContent}>
                  <Text style={styles.toolTitle}>{tool.title}</Text>
                  <Text style={styles.toolSubtitle}>{tool.subtitle}</Text>
                </View>
                <View style={styles.priorityBadge}>
                  <Text style={styles.priorityText}>High Impact</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Tool Categories */}
        {TOOL_CATEGORIES.map((category, catIndex) => (
          <View key={catIndex} style={styles.section}>
            <Text style={styles.sectionTitle}>{category.title}</Text>
            <View style={styles.toolsGrid}>
              {category.tools.map((tool) => (
                <TouchableOpacity key={tool.id} style={styles.toolCard} onPress={() => router.push(tool.route as never)} activeOpacity={0.7}>
                  <View style={[styles.toolIconSmall, { backgroundColor: `${tool.color}20` }]}>
                    <Ionicons name={tool.icon as keyof typeof Ionicons.glyphMap} size={20} color={tool.color} />
                  </View>
                  <Text style={styles.toolTitleSmall} numberOfLines={1}>{tool.title}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
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
  progressCard: { marginBottom: theme.spacing.lg },
  progressHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.md },
  progressInfo: { marginLeft: theme.spacing.md },
  progressTitle: { fontSize: 18, fontWeight: '600', color: theme.colors.text },
  progressSubtitle: { fontSize: 14, color: theme.colors.textSecondary },
  progressBar: { height: 8, backgroundColor: theme.colors.border, borderRadius: 4, marginBottom: theme.spacing.sm },
  progressFill: { height: '100%', backgroundColor: theme.colors.primary, borderRadius: 4 },
  progressHint: { fontSize: 12, color: theme.colors.textSecondary },
  section: { marginBottom: theme.spacing.lg },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: theme.colors.text, marginBottom: theme.spacing.md },
  recommendedCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.lg, padding: theme.spacing.md, marginBottom: theme.spacing.sm },
  toolIcon: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginRight: theme.spacing.md },
  toolContent: { flex: 1 },
  toolTitle: { fontSize: 15, fontWeight: '600', color: theme.colors.text },
  toolSubtitle: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 2 },
  priorityBadge: { backgroundColor: '#FEF3C7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  priorityText: { fontSize: 11, fontWeight: '500', color: '#D97706' },
  toolsGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 },
  toolCard: { width: '31%', backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.md, padding: theme.spacing.sm, margin: '1%', alignItems: 'center' },
  toolIconSmall: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  toolTitleSmall: { fontSize: 12, fontWeight: '500', color: theme.colors.text, textAlign: 'center' },
});

