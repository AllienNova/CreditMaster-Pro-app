/**
 * CPFI Credit Building Screen
 * Strategies to build credit
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { lightTheme as theme } from '../../src/constants/theme';
import { Card } from '../../src/components/Card';

interface Strategy { id: string; title: string; description: string; impact: 'high' | 'medium' | 'low'; timeframe: string; icon: string; }

const STRATEGIES: Strategy[] = [
  { id: '1', title: 'Pay Bills On Time', description: 'Payment history is 35% of your score. Set up autopay for all accounts.', impact: 'high', timeframe: '1-3 months', icon: 'calendar-outline' },
  { id: '2', title: 'Lower Credit Utilization', description: 'Keep balances below 30% of limits. Aim for under 10% for best results.', impact: 'high', timeframe: '1-2 months', icon: 'trending-down' },
  { id: '3', title: 'Become Authorized User', description: 'Get added to a family member\'s old account with good history.', impact: 'medium', timeframe: '1-2 months', icon: 'people' },
  { id: '4', title: 'Get a Secured Card', description: 'Build credit with a secured card that reports to all bureaus.', impact: 'medium', timeframe: '3-6 months', icon: 'card' },
  { id: '5', title: 'Credit Builder Loan', description: 'Small loan that builds credit while you save money.', impact: 'medium', timeframe: '6-12 months', icon: 'cash' },
  { id: '6', title: 'Diversify Credit Mix', description: 'Having different types of credit can boost your score.', impact: 'low', timeframe: '6-12 months', icon: 'layers' },
];

export default function BuildingScreen() {
  const [loading, setLoading] = useState(true);

  useEffect(() => { setTimeout(() => setLoading(false), 600); }, []);

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return theme.colors.success;
      case 'medium': return theme.colors.warning;
      case 'low': return theme.colors.textSecondary;
      default: return theme.colors.textSecondary;
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.title}>Credit Building</Text>
            <Text style={styles.subtitle}>Strategies to improve your score</Text>
          </View>
        </View>

        {/* Progress */}
        <Card style={styles.progressCard}>
          <Text style={styles.progressTitle}>Your Progress</Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: '65%' }]} />
          </View>
          <Text style={styles.progressText}>4 of 6 strategies in progress</Text>
        </Card>

        {/* Strategies */}
        <View style={styles.strategiesSection}>
          <Text style={styles.sectionTitle}>Recommended Strategies</Text>
          {STRATEGIES.map((strategy) => (
            <Card key={strategy.id} style={styles.strategyCard}>
              <View style={styles.strategyHeader}>
                <View style={[styles.strategyIcon, { backgroundColor: `${getImpactColor(strategy.impact)}15` }]}>
                  <Ionicons name={strategy.icon as keyof typeof Ionicons.glyphMap} size={22} color={getImpactColor(strategy.impact)} />
                </View>
                <View style={styles.strategyInfo}>
                  <Text style={styles.strategyTitle}>{strategy.title}</Text>
                  <View style={styles.strategyMeta}>
                    <View style={[styles.impactBadge, { backgroundColor: `${getImpactColor(strategy.impact)}15` }]}>
                      <Text style={[styles.impactText, { color: getImpactColor(strategy.impact) }]}>{strategy.impact} impact</Text>
                    </View>
                    <Text style={styles.timeframe}>{strategy.timeframe}</Text>
                  </View>
                </View>
              </View>
              <Text style={styles.strategyDesc}>{strategy.description}</Text>
              <TouchableOpacity style={styles.startButton}>
                <Text style={styles.startText}>Start Strategy</Text>
                <Ionicons name="chevron-forward" size={16} color={theme.colors.primary} />
              </TouchableOpacity>
            </Card>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scrollView: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', padding: theme.spacing.lg },
  backButton: { padding: theme.spacing.sm },
  headerContent: { flex: 1, marginLeft: theme.spacing.sm },
  title: { fontSize: 24, fontWeight: '700', color: theme.colors.text },
  subtitle: { fontSize: 14, color: theme.colors.textSecondary },
  progressCard: { marginHorizontal: theme.spacing.lg, marginBottom: theme.spacing.md, padding: theme.spacing.lg },
  progressTitle: { fontSize: 14, fontWeight: '600', color: theme.colors.text, marginBottom: 12 },
  progressBar: { height: 8, backgroundColor: theme.colors.border, borderRadius: 4, marginBottom: 8 },
  progressFill: { height: 8, backgroundColor: theme.colors.success, borderRadius: 4 },
  progressText: { fontSize: 12, color: theme.colors.textSecondary },
  strategiesSection: { paddingHorizontal: theme.spacing.lg, marginBottom: theme.spacing.xl },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: theme.colors.text, marginBottom: 12 },
  strategyCard: { marginBottom: theme.spacing.sm, padding: theme.spacing.md },
  strategyHeader: { flexDirection: 'row', marginBottom: 12 },
  strategyIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  strategyInfo: { flex: 1, marginLeft: 12 },
  strategyTitle: { fontSize: 15, fontWeight: '600', color: theme.colors.text },
  strategyMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  impactBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, marginRight: 8 },
  impactText: { fontSize: 10, fontWeight: '600', textTransform: 'capitalize' },
  timeframe: { fontSize: 11, color: theme.colors.textSecondary },
  strategyDesc: { fontSize: 13, color: theme.colors.textSecondary, lineHeight: 20, marginBottom: 12 },
  startButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderTopWidth: 1, borderTopColor: theme.colors.border },
  startText: { fontSize: 14, fontWeight: '600', color: theme.colors.primary },
});

