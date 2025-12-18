/**
 * CPFI Financial Calculators Marketplace Screen
 * Various financial calculators
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { lightTheme as theme } from '../../src/constants/theme';
import { Card } from '../../src/components/Card';

interface Calculator {
  id: string;
  name: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
  popular: boolean;
}

const CALCULATORS: Calculator[] = [
  { id: '1', name: 'Debt Payoff Calculator', description: 'Compare snowball vs avalanche methods', icon: 'trending-down', route: '/financial/debt-payoff', popular: true },
  { id: '2', name: 'Credit Score Simulator', description: 'See how actions affect your score', icon: 'speedometer', route: '/credit-builder/simulator', popular: true },
  { id: '3', name: 'Loan Calculator', description: 'Calculate monthly payments and interest', icon: 'calculator', route: '/recommendations/loans', popular: false },
  { id: '4', name: 'Credit Utilization', description: 'Optimize your credit utilization ratio', icon: 'pie-chart', route: '/credit-builder/utilization', popular: true },
  { id: '5', name: 'Mortgage Affordability', description: 'How much house can you afford?', icon: 'home', route: '/recommendations/loans', popular: false },
  { id: '6', name: 'Savings Goal', description: 'Plan your savings timeline', icon: 'wallet', route: '/financial/savings', popular: false },
  { id: '7', name: 'Net Worth', description: 'Track your total net worth', icon: 'stats-chart', route: '/financial/net-worth', popular: false },
  { id: '8', name: 'Budget Planner', description: 'Create and manage your budget', icon: 'cash', route: '/financial/budget', popular: false },
];

export default function CalculatorsScreen() {
  const popularCalculators = CALCULATORS.filter(c => c.popular);
  const allCalculators = CALCULATORS.filter(c => !c.popular);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Calculators</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Popular Section */}
        <Text style={styles.sectionTitle}>Popular Calculators</Text>
        <View style={styles.popularGrid}>
          {popularCalculators.map((calc) => (
            <TouchableOpacity key={calc.id} style={styles.popularCard} onPress={() => router.push(calc.route as never)}>
              <View style={styles.popularIcon}>
                <Ionicons name={calc.icon} size={28} color={theme.colors.primary} />
              </View>
              <Text style={styles.popularName}>{calc.name}</Text>
              <Text style={styles.popularDescription} numberOfLines={2}>{calc.description}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* All Calculators */}
        <Text style={styles.sectionTitle}>All Calculators</Text>
        {allCalculators.map((calc) => (
          <TouchableOpacity key={calc.id} onPress={() => router.push(calc.route as never)}>
            <Card style={styles.calcCard}>
              <View style={styles.calcIcon}>
                <Ionicons name={calc.icon} size={22} color={theme.colors.primary} />
              </View>
              <View style={styles.calcInfo}>
                <Text style={styles.calcName}>{calc.name}</Text>
                <Text style={styles.calcDescription}>{calc.description}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
            </Card>
          </TouchableOpacity>
        ))}

        {/* Tip Card */}
        <Card style={styles.tipCard}>
          <Ionicons name="bulb" size={24} color="#F59E0B" />
          <View style={styles.tipContent}>
            <Text style={styles.tipTitle}>Pro Tip</Text>
            <Text style={styles.tipText}>Use the Credit Score Simulator before making financial decisions to see how they might affect your score.</Text>
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
  sectionTitle: { fontSize: 15, fontWeight: '600', color: theme.colors.text, marginBottom: theme.spacing.sm, marginTop: theme.spacing.md },
  popularGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 },
  popularCard: { width: '48%', backgroundColor: theme.colors.surface, borderRadius: 12, padding: theme.spacing.md, margin: '1%', alignItems: 'center' },
  popularIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: `${theme.colors.primary}15`, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  popularName: { fontSize: 14, fontWeight: '600', color: theme.colors.text, textAlign: 'center' },
  popularDescription: { fontSize: 11, color: theme.colors.textSecondary, textAlign: 'center', marginTop: 4 },
  calcCard: { flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.sm },
  calcIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: `${theme.colors.primary}15`, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  calcInfo: { flex: 1 },
  calcName: { fontSize: 15, fontWeight: '600', color: theme.colors.text },
  calcDescription: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
  tipCard: { flexDirection: 'row', alignItems: 'flex-start', marginTop: theme.spacing.lg, backgroundColor: '#FEF3C7' },
  tipContent: { flex: 1, marginLeft: 12 },
  tipTitle: { fontSize: 14, fontWeight: '600', color: '#92400E' },
  tipText: { fontSize: 12, color: '#92400E', marginTop: 4, lineHeight: 18 },
});

